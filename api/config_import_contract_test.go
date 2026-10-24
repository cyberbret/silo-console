// Copyright (c) 2026 PGSTY
// SPDX-License-Identifier: AGPL-3.0-or-later

package api

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	apierrors "github.com/go-openapi/errors"
	"github.com/go-openapi/runtime"
	"github.com/minio/console/api/operations/configuration"
)

// These are the existing generated binder's boundaries, not a new upload policy.
// Regeneration must not silently introduce total-body or filename limits, or
// accept URL-encoded file fields that the configuration handler cannot consume.
func TestConfigImportBindingContract(t *testing.T) {
	for _, tc := range []struct {
		name, filename string
		size           int
		disk           bool
	}{
		{name: "ordinary multipart", filename: "config.txt", size: 16},
		{name: "large multipart spills to disk", filename: "config.txt", size: 33 << 20, disk: true},
		{name: "long filename", filename: strings.Repeat("x", 2048) + ".txt", size: 16},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var body bytes.Buffer
			writer := multipart.NewWriter(&body)
			part, err := writer.CreateFormFile("file", tc.filename)
			if err != nil {
				t.Fatal(err)
			}
			if _, err = io.Copy(part, strings.NewReader(strings.Repeat("x", tc.size))); err != nil {
				t.Fatal(err)
			}
			if err = writer.Close(); err != nil {
				t.Fatal(err)
			}
			request := httptest.NewRequest(http.MethodPost, "/api/v1/configs/import", &body)
			request.Header.Set("Content-Type", writer.FormDataContentType())
			defer func() {
				if request.MultipartForm != nil {
					_ = request.MultipartForm.RemoveAll()
				}
			}()
			params := configuration.NewPostConfigsImportParams()
			if err = params.BindRequest(request, nil); err != nil {
				t.Fatalf("previously accepted multipart request was rejected: %v", err)
			}
			defer params.File.Close()
			file, ok := params.File.(*runtime.File)
			if !ok || file.Header.Filename != tc.filename || file.Header.Size != int64(tc.size) {
				t.Fatalf("bound file = %#v", params.File)
			}
			if _, onDisk := file.Data.(*os.File); onDisk != tc.disk {
				t.Fatalf("file uses disk = %t, want %t", onDisk, tc.disk)
			}
			if n, err := io.Copy(io.Discard, file); err != nil || n != int64(tc.size) {
				t.Fatalf("read %d bytes, want %d: %v", n, tc.size, err)
			}
		})
	}

	t.Run("URL-encoded file field is rejected", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodPost, "/api/v1/configs/import", strings.NewReader("file=config"))
		request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		params := configuration.NewPostConfigsImportParams()
		err := params.BindRequest(request, nil)
		if err == nil {
			if params.File != nil {
				_ = params.File.Close()
			}
			t.Fatal("URL-encoded file field was unexpectedly accepted")
		}
		response := httptest.NewRecorder()
		apierrors.ServeError(response, request, err)
		if response.Code != http.StatusBadRequest || params.File != nil {
			t.Fatalf("status = %d, file = %#v, error = %v", response.Code, params.File, err)
		}
	})
}
