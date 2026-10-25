// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

package api

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	madmin "github.com/minio/madmin-go/v3"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/stretchr/testify/require"
)

type healthResponseBody struct {
	io.Reader
	closed bool
}

func (b *healthResponseBody) Close() error {
	b.closed = true
	return nil
}

func healthAdminClient(t *testing.T, status int, reader io.Reader) (AdminClient, *healthResponseBody) {
	t.Helper()
	body := &healthResponseBody{Reader: reader}
	client, err := madmin.NewWithOptions("localhost:9000", &madmin.Options{
		Creds: credentials.NewStaticV4("health-access", "health-secret", "health-session"),
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			require.Equal(t, http.MethodGet, req.Method)
			require.Equal(t, "/minio/admin/v3/healthinfo", req.URL.Path)
			require.Equal(t, "2s", req.URL.Query().Get("deadline"))
			require.True(t, req.URL.Query().Has("anonymize"))
			require.Empty(t, req.URL.Query().Get("anonymize"))
			for _, typ := range madmin.HealthDataTypesList {
				require.Equal(t, "true", req.URL.Query().Get(string(typ)))
			}
			require.Contains(t, req.Header.Get("Authorization"), "Credential=health-access/")
			require.Equal(t, "health-session", req.Header.Get("X-Amz-Security-Token"))
			return &http.Response{
				StatusCode: status,
				Status:     fmt.Sprintf("%d %s", status, http.StatusText(status)),
				Header:     make(http.Header),
				Body:       body,
				Request:    req,
			}, nil
		}),
	})
	require.NoError(t, err)
	return AdminClient{Client: client}, body
}

func TestAdminHealthInfoPreservesStream(t *testing.T) {
	for _, version := range []string{"2", "3"} {
		for _, fragmented := range []bool{false, true} {
			t.Run(fmt.Sprintf("v%s/fragmented=%v", version, fragmented), func(t *testing.T) {
				// A single read must be allowed to contain the version and all reports.
				stream := fmt.Sprintf(`{"version":%q} {"version":%q,"timestamp":"2026-10-25T00:00:00Z"} {"version":%q,"timestamp":"2026-10-25T00:00:01Z","minio":{"info":{"deploymentID":"complete-report"}}} `, version, version, version)
				var reader io.Reader = strings.NewReader(stream)
				if fragmented {
					var chunks []io.Reader
					for _, c := range stream {
						chunks = append(chunks, strings.NewReader(string(c)))
					}
					reader = io.MultiReader(chunks...)
				}
				client, body := healthAdminClient(t, http.StatusOK, reader)
				report, gotVersion, err := client.serverHealthInfo(context.Background(), 2500*time.Millisecond)
				require.NoError(t, err)
				require.Equal(t, version, gotVersion)
				info := report.(madmin.HealthInfo)
				require.Equal(t, version, info.Version)
				require.Equal(t, time.Date(2026, 10, 25, 0, 0, 1, 0, time.UTC), info.TimeStamp)
				require.Equal(t, "complete-report", info.Minio.Info.DeploymentID)
				require.True(t, body.closed, "health response body was not closed")
			})
		}
	}
}

func TestAdminHealthInfoRejectsFailedStreams(t *testing.T) {
	const complete = `{"version":"3","timestamp":"2026-10-25T00:00:01Z"}`
	for _, tt := range []struct {
		name   string
		status int
		stream string
	}{
		{"empty", http.StatusOK, ""},
		{"version-only", http.StatusOK, `{"version":"3"}`},
		{"unsupported-version", http.StatusOK, `{"version":"99"}` + complete},
		{"version-error", http.StatusOK, `{"version":"3","error":"health lock timeout"}`},
		{"report-error", http.StatusOK, `{"version":"3"}` + complete + `{"version":"3","error":"report failed"}`},
		{"missing-report-version", http.StatusOK, `{"version":"3"}{"timestamp":"2026-10-25T00:00:01Z"}`},
		{"truncated-after-progress", http.StatusOK, `{"version":"3"}` + complete + `{"version":"3","timestamp":`},
		{"malformed-after-progress", http.StatusOK, `{"version":"3"}` + complete + `broken`},
		{"json-access-denied", http.StatusForbidden, `{"Code":"AccessDenied","Message":"Access Denied"}`},
		{"xml-access-denied", http.StatusForbidden, `<Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>`},
		{"non-json-error", http.StatusNotFound, "not found"},
		{"unexpected-success-status", http.StatusNoContent, ""},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var reader io.Reader = strings.NewReader(tt.stream)
			const versionFrame = `{"version":"3"}`
			if strings.HasPrefix(tt.stream, versionFrame) {
				// Separate the version read to exercise failures after real progress,
				// independently of the initial decoder's read-ahead regression.
				reader = io.MultiReader(strings.NewReader(versionFrame), strings.NewReader(strings.TrimPrefix(tt.stream, versionFrame)))
			}
			client, body := healthAdminClient(t, tt.status, reader)
			report, _, err := client.serverHealthInfo(context.Background(), 2500*time.Millisecond)
			require.Error(t, err)
			require.Nil(t, report, "failed streams must not produce partial reports")
			require.True(t, body.closed, "health response body was not closed")
			if tt.status == http.StatusForbidden {
				require.Equal(t, "AccessDenied", madmin.ToErrorResponse(err).Code)
			}
		})
	}
}

type canceledHealthReader struct {
	ctx    context.Context
	cancel context.CancelFunc
}

func (r canceledHealthReader) Read([]byte) (int, error) {
	r.cancel()
	return 0, r.ctx.Err()
}

func TestAdminHealthInfoRejectsCanceledReport(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	reader := io.MultiReader(strings.NewReader(`{"version":"3"}`), strings.NewReader(`{"version":"3","timestamp":"2026-10-25T00:00:01Z"}`), canceledHealthReader{ctx: ctx, cancel: cancel})
	client, body := healthAdminClient(t, http.StatusOK, reader)
	report, _, err := client.serverHealthInfo(ctx, 2500*time.Millisecond)
	require.ErrorIs(t, err, context.Canceled)
	require.Nil(t, report)
	require.True(t, body.closed)
}
