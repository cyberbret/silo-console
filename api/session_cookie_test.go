// Copyright (c) 2026 Ruohang Feng
// SPDX-License-Identifier: AGPL-3.0-or-later

package api

import (
	"crypto/tls"
	"crypto/x509"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-openapi/runtime"
	"github.com/minio/console/api/operations"
	authApi "github.com/minio/console/api/operations/auth"
	"github.com/minio/console/models"
	"github.com/stretchr/testify/require"
)

func TestSessionCookieExternalHTTPS(t *testing.T) {
	previous := GlobalPublicCerts
	GlobalPublicCerts = nil
	t.Cleanup(func() { GlobalPublicCerts = previous })
	for _, tt := range []struct {
		url    string
		secure bool
	}{
		{"https://console.example/console/", true},
		{"http://console.example/console/", false},
		{"", false},
		{"https:///missing-host", false},
	} {
		t.Run(tt.url, func(t *testing.T) {
			t.Setenv(ConsoleBrowserRedirectURL, tt.url)
			require.Equal(t, tt.secure, NewSessionCookieForConsole("test-token").Secure)
			require.Equal(t, tt.secure, ExpireSessionCookie().Secure)
		})
	}
	GlobalPublicCerts = []*x509.Certificate{{}}
	require.True(t, NewSessionCookieForConsole("test-token").Secure)
	require.True(t, ExpireSessionCookie().Secure)
}

func TestSessionCookieRequestSecurity(t *testing.T) {
	preserveSourceIPTrustState(t)
	previous := GlobalPublicCerts
	GlobalPublicCerts = nil
	t.Cleanup(func() { GlobalPublicCerts = previous })
	t.Setenv(ConsoleBrowserRedirectURL, "")
	require.NoError(t, setSourceIPTrustForTest(t, "192.0.2.10"))
	for _, tt := range []struct {
		name   string
		peer   string
		proto  []string
		tls    bool
		secure bool
	}{
		{"HTTP local", "127.0.0.1:5000", nil, false, false},
		{"direct TLS", "198.51.100.1:5000", nil, true, true},
		{"TLS cannot be downgraded by header", "192.0.2.10:5000", []string{"http"}, true, true},
		{"trusted HTTPS", "192.0.2.10:5000", []string{"https"}, false, true},
		{"trusted HTTP", "192.0.2.10:5000", []string{"http"}, false, false},
		{"untrusted spoof", "198.51.100.1:5000", []string{"https"}, false, false},
		{"loopback is not implicitly trusted standalone", "127.0.0.1:5000", []string{"https"}, false, false},
		{"malformed peer", "not-an-ip", []string{"https"}, false, false},
		{"missing protocol", "192.0.2.10:5000", nil, false, false},
		{"unknown protocol", "192.0.2.10:5000", []string{"wss"}, false, false},
		{"empty protocol", "192.0.2.10:5000", []string{""}, false, false},
		{"comma chain", "192.0.2.10:5000", []string{"https, http"}, false, false},
		{"repeated header", "192.0.2.10:5000", []string{"https", "https"}, false, false},
		{"protocol case", "192.0.2.10:5000", []string{" HTTPS "}, false, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodPost, "http://console.example/console/api/v1/login", nil)
			r.RemoteAddr = tt.peer
			r.Header["X-Forwarded-Proto"] = tt.proto
			// Neither a spoofed forwarding address nor RFC Forwarded grants trust.
			r.Header.Set("X-Forwarded-For", "192.0.2.10")
			r.Header.Set("Forwarded", "for=192.0.2.10;proto=https")
			if tt.tls {
				r.TLS = &tls.ConnectionState{}
			}
			login := newSessionCookieForRequest("test-token", r)
			logout := expireSessionCookieForRequest(r)
			for _, cookie := range []http.Cookie{login, logout} {
				w := httptest.NewRecorder()
				http.SetCookie(w, &cookie)
				parsed := w.Result().Cookies()[0]
				require.Equal(t, tt.secure, parsed.Secure)
				require.True(t, parsed.HttpOnly)
				require.Equal(t, http.SameSiteLaxMode, parsed.SameSite)
				require.Equal(t, "/", parsed.Path)
				require.Empty(t, parsed.Domain)
			}
			require.Positive(t, login.MaxAge)
			require.Equal(t, -1, logout.MaxAge)
			require.Empty(t, logout.Value)
		})
	}
}

func TestSessionCookieEmbeddedTrust(t *testing.T) {
	preserveSourceIPTrustState(t)
	t.Setenv(ConsoleBrowserRedirectURL, "")
	t.Setenv(EnvConsoleTrustedProxies, "")
	r := httptest.NewRequest(http.MethodPost, "http://console.example/api/v1/login", nil)
	r.RemoteAddr = "127.0.0.1:5000"
	r.Header.Set("X-Forwarded-Proto", "https")
	previous := GlobalPublicCerts
	GlobalPublicCerts = nil
	t.Cleanup(func() { GlobalPublicCerts = previous })
	for _, setting := range []string{"", "none", "off"} {
		t.Setenv(EnvMinIOTrustedProxies, setting)
		require.NoError(t, ConfigureEmbeddedSourceIPTrust())
		require.Equal(t, setting == "", secureSessionCookie(r))
	}
}

func TestLogoutExpiresBothCookiesWithRequestSecurity(t *testing.T) {
	preserveSourceIPTrustState(t)
	require.NoError(t, setSourceIPTrustForTest(t, "192.0.2.10"))
	t.Setenv(ConsoleBrowserRedirectURL, "")
	api := &operations.ConsoleAPI{}
	registerLogoutHandlers(api)
	r := httptest.NewRequest(http.MethodPost, "http://console.example/api/v1/logout", nil)
	r.RemoteAddr = "192.0.2.10:5000"
	r.Header.Set("X-Forwarded-Proto", "https")
	w := httptest.NewRecorder()
	api.AuthLogoutHandler.Handle(authApi.LogoutParams{HTTPRequest: r, Body: &models.LogoutRequest{}}, &models.Principal{}).WriteResponse(w, runtime.JSONProducer())
	require.Equal(t, http.StatusOK, w.Code)
	cookies := w.Result().Cookies()
	require.Len(t, cookies, 2)
	for _, cookie := range cookies {
		require.True(t, cookie.Secure)
		require.True(t, cookie.HttpOnly)
		require.Equal(t, http.SameSiteLaxMode, cookie.SameSite)
		require.Equal(t, -1, cookie.MaxAge)
		require.Empty(t, cookie.Value)
	}
}
