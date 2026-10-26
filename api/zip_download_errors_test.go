// Copyright (c) 2026 PGSTY
// SPDX-License-Identifier: AGPL-3.0-or-later

package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/klauspost/compress/zip"
	"github.com/minio/minio-go/v7"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestZipDownloadPreservesErrorStatusBeforeBody(t *testing.T) {
	for _, tc := range []struct {
		name   string
		err    error
		status int
	}{
		{"access denied", minio.ErrorResponse{Code: "AccessDenied", Message: "private backend detail", StatusCode: 403}, 403},
		{"missing object", minio.ErrorResponse{Code: "NoSuchKey", Message: "private backend detail", StatusCode: 404}, 404},
		{"missing bucket", minio.ErrorResponse{Code: "NoSuchBucket", Message: "private backend detail", StatusCode: 404}, 404},
		{"server failure", minio.ErrorResponse{Code: "InternalError", Message: "private backend detail", StatusCode: 500}, 500},
		{"unavailable", minio.ErrorResponse{Code: "SlowDown", Message: "private backend detail", StatusCode: 503}, 503},
		{"network failure", errors.New("private transport detail"), 500},
		{"invalid success status", minio.ErrorResponse{StatusCode: 200}, 500},
		{"invalid redirect status", minio.ErrorResponse{StatusCode: 307}, 500},
		{"invalid status", minio.ErrorResponse{StatusCode: 600}, 500},
	} {
		t.Run(tc.name, func(t *testing.T) {
			// Exercise the same wrapper and Close-error join as object fetches.
			stream := newZipStream(func(*zip.Writer) error {
				return errors.Join(fmt.Errorf("stat object %q: %w", "private-object", tc.err), errors.New("private close detail"))
			})
			out := httptest.NewRecorder()
			zipDownloadResponder(context.Background(), stream, "archive.zip").WriteResponse(out, nil)
			assert.Equal(t, tc.status, out.Code)
			assert.Equal(t, http.StatusText(tc.status)+"\n", out.Body.String())
			assert.Empty(t, out.Header().Get("Content-Disposition"))
			assert.Equal(t, "text/plain; charset=utf-8", out.Header().Get("Content-Type"))
		})
	}
}

func TestZipDownloadLateS3FailureAbortsHTTPResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		stream := newZipStream(func(zipw *zip.Writer) error {
			entry, err := zipw.CreateHeader(&zip.FileHeader{Name: "allowed.bin", Method: zip.Store})
			if err != nil {
				return err
			}
			if _, err := entry.Write(bytes.Repeat([]byte("allowed"), 32*1024)); err != nil {
				return err
			}
			return fmt.Errorf("read next object: %w", minio.ErrorResponse{Code: "AccessDenied", Message: "private backend detail", StatusCode: 403})
		})
		zipDownloadResponder(r.Context(), stream, "archive.zip").WriteResponse(w, nil)
	}))
	defer server.Close()
	client := server.Client()
	client.Timeout = 5 * time.Second
	response, err := client.Get(server.URL)
	require.NoError(t, err)
	defer response.Body.Close()
	assert.Equal(t, http.StatusOK, response.StatusCode) // Already on the wire.
	body, err := io.ReadAll(response.Body)
	require.Error(t, err, "a failed archive must not finish as a successful download")
	assert.NotContains(t, string(body), "private backend detail")
	assert.NotContains(t, string(body), "Forbidden")
	_, err = zip.NewReader(bytes.NewReader(body), int64(len(body)))
	require.Error(t, err, "a partial archive must not have a successful ZIP footer")
}

func TestZipDownloadClientCancellationStopsProducer(t *testing.T) {
	done := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		stream := newZipStream(func(zipw *zip.Writer) error {
			defer close(done)
			entry, err := zipw.CreateHeader(&zip.FileHeader{Name: "large.bin", Method: zip.Store})
			if err != nil {
				return err
			}
			chunk := make([]byte, 64*1024)
			for {
				if err := r.Context().Err(); err != nil {
					return err
				}
				if _, err := entry.Write(chunk); err != nil {
					return err
				}
			}
		})
		zipDownloadResponder(r.Context(), stream, "archive.zip").WriteResponse(w, nil)
	}))
	defer server.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, server.URL, nil)
	require.NoError(t, err)
	client := server.Client()
	client.Timeout = 5 * time.Second
	response, err := client.Do(request)
	require.NoError(t, err)
	_, err = io.ReadFull(response.Body, make([]byte, 1024))
	require.NoError(t, err)
	cancel()
	require.NoError(t, response.Body.Close())
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("ZIP producer is still running after the client canceled")
	}
}
