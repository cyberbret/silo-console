// Copyright (c) 2026 PGSTY
//
// This file is part of the Silo object storage console.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

package api

import (
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/go-openapi/runtime"
	"github.com/minio/console/api/operations"
	bucketAPI "github.com/minio/console/api/operations/bucket"
	"github.com/minio/console/models"
	"github.com/minio/minio-go/v7"
	"github.com/stretchr/testify/require"
)

func TestVersioningInvalidBucketStateStatus(t *testing.T) {
	for _, tc := range []struct {
		name           string
		message        string
		code           string
		upstreamStatus int
		consoleStatus  int
	}{
		{"site replication", "Cluster replication is enabled on this site, versioning cannot be suspended on bucket.", "InvalidBucketState", 400, 400},
		{"bucket replication", "A replication configuration is present on this bucket, bucket wide versioning cannot be suspended.", "InvalidBucketState", 400, 400},
		{"object lock", "An Object Lock configuration is present on this bucket, versioning cannot be suspended.", "InvalidBucketState", 400, 400},
		{"access denied", "Access Denied.", "AccessDenied", 403, 403},
		{"success", "", "", 200, 201},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var called atomic.Bool
			backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/xml")
				if r.Method == http.MethodGet && r.URL.Query().Has("location") {
					_, _ = fmt.Fprint(w, `<LocationConstraint xmlns="http://s3.amazonaws.com/doc/2006-03-01/">us-east-1</LocationConstraint>`)
					return
				}
				if r.Method != http.MethodPut || r.URL.Path != "/versioned-bucket/" && r.URL.Path != "/versioned-bucket" || !r.URL.Query().Has("versioning") {
					t.Errorf("unexpected S3 request: %s %s", r.Method, r.URL)
					w.WriteHeader(http.StatusBadRequest)
					return
				}
				var config minio.BucketVersioningConfiguration
				if err := xml.NewDecoder(r.Body).Decode(&config); err != nil || config.Status != "Suspended" {
					t.Errorf("versioning request: config=%+v err=%v", config, err)
				}
				called.Store(true)
				w.WriteHeader(tc.upstreamStatus)
				if tc.code != "" {
					_, _ = fmt.Fprintf(w, "<Error><Code>%s</Code><Message>%s</Message></Error>", tc.code, tc.message)
				}
			}))
			defer backend.Close()
			t.Setenv(ConsoleMinIOServer, backend.URL)
			api := &operations.ConsoleAPI{}
			registerBucketsHandlers(api)
			params := bucketAPI.SetBucketVersioningParams{
				HTTPRequest: httptest.NewRequest(http.MethodPut, "/api/v1/buckets/versioned-bucket/versioning", nil),
				BucketName:  "versioned-bucket",
				Body:        &models.SetBucketVersioning{Enabled: false},
			}
			response := api.BucketSetBucketVersioningHandler.Handle(params, &models.Principal{STSAccessKeyID: "test-access", STSSecretAccessKey: "test-secret"})
			rec := httptest.NewRecorder()
			response.WriteResponse(rec, runtime.JSONProducer())
			require.True(t, called.Load(), "must exercise the S3 client and versioning handler")
			require.Equal(t, tc.consoleStatus, rec.Code, rec.Body.String())
			if tc.code != "" {
				var apiErr models.APIError
				require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &apiErr))
				require.Contains(t, apiErr.DetailedMessage, tc.message)
			}
		})
	}
}

func TestInvalidBucketStateErrorMapping(t *testing.T) {
	stateErr := minio.ErrorResponse{Code: "InvalidBucketState", Message: "versioning cannot be suspended", StatusCode: 400}
	for _, tc := range []struct {
		name   string
		err    error
		status int
	}{
		{"direct", stateErr, 400},
		{"wrapped", fmt.Errorf("setting versioning: %w", stateErr), 400},
		{"text only", errors.New("InvalidBucketState: versioning cannot be suspended"), 500},
		{"unknown client error", minio.ErrorResponse{Code: "UnrecognizedError", Message: "unknown", StatusCode: 400}, 500},
		{"server error", minio.ErrorResponse{Code: "InternalError", Message: "backend error", StatusCode: 500}, 500},
		{"login error", ErrInvalidLogin, 401},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got := ErrorWithContext(t.Context(), tc.err)
			require.Equal(t, tc.status, got.Code)
		})
	}
}
