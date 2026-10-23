// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

package api

import (
	"bufio"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"unicode/utf8"

	madmin "github.com/minio/madmin-go/v3"
	mc "github.com/minio/mc/cmd"
	"github.com/minio/mc/pkg/probe"
	"github.com/minio/websocket"
)

// Substitute only backend data; exercise the real handlers, reader, WebSocket
// library, and counted connection. No shared package mocks are changed.
type wsCloseBackend struct {
	MinioAdmin
	MCClient
	started chan context.Context
	payload string
	err     error
	live    bool
	watcher *mc.WatchObject
}

func newWSCloseBackend() *wsCloseBackend {
	return &wsCloseBackend{started: make(chan context.Context, 1), payload: strings.Repeat("report-data-", 8192)}
}

func (b *wsCloseBackend) serverHealthInfo(ctx context.Context, _ time.Duration) (interface{}, string, error) {
	b.started <- ctx
	return map[string]string{"marker": b.payload}, madmin.HealthInfoVersion, b.err
}

func (b *wsCloseBackend) serviceTrace(ctx context.Context, _ int64, _, _, _, _, _ bool) <-chan madmin.ServiceTraceInfo {
	b.started <- ctx
	ch := make(chan madmin.ServiceTraceInfo)
	if !b.live {
		close(ch)
	}
	return ch
}

func (b *wsCloseBackend) getLogs(ctx context.Context, _ string, _ int, _ string) <-chan madmin.LogInfo {
	b.started <- ctx
	ch := make(chan madmin.LogInfo)
	if !b.live {
		close(ch)
	}
	return ch
}

func (b *wsCloseBackend) speedtest(ctx context.Context, _ madmin.SpeedtestOpts) (chan madmin.SpeedTestResult, error) {
	b.started <- ctx
	ch := make(chan madmin.SpeedTestResult)
	close(ch)
	return ch, b.err
}

func (b *wsCloseBackend) startProfiling(ctx context.Context, _ madmin.ProfilerType, _ time.Duration) (io.ReadCloser, error) {
	b.started <- ctx
	return io.NopCloser(strings.NewReader(b.payload)), b.err
}

func (b *wsCloseBackend) watch(ctx context.Context, _ mc.WatchOptions) (*mc.WatchObject, *probe.Error) {
	b.watcher = &mc.WatchObject{
		EventInfoChan: make(chan []mc.EventInfo),
		ErrorChan:     make(chan *probe.Error),
		DoneChan:      make(chan struct{}),
	}
	if !b.live {
		close(b.watcher.EventInfoChan)
	}
	b.started <- ctx
	return b.watcher, nil
}

func (b *wsCloseBackend) run(name string, ctx context.Context, conn wsConn) {
	admin := wsAdminClient{conn: conn, client: b}
	switch name {
	case "health":
		deadline := time.Hour
		admin.healthInfo(ctx, &deadline)
	case "trace":
		admin.trace(ctx, TraceRequest{})
	case "logs":
		admin.console(ctx, LogRequest{})
	case "watch":
		client := wsS3Client{conn: conn, client: b}
		client.watch(ctx, &watchOptions{})
	case "speedtest":
		admin.speedtest(ctx, &madmin.SpeedtestOpts{})
	case "profile":
		admin.profile(ctx, &profileOptions{})
	}
}

type wsCloseSession struct {
	client  *websocket.Conn
	done    <-chan struct{}
	limiter *wsConnectionLimiter
}

func openWSCloseSession(t *testing.T, useTLS bool, run func(context.Context, wsConn)) wsCloseSession {
	t.Helper()
	done := make(chan struct{})
	ready := make(chan *websocket.Conn, 1)
	limiter := newWSConnectionLimiter(defaultWSConnectionLimits)
	srv := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		release, err := limiter.acquire("test", false)
		if err != nil {
			t.Error(err)
			return
		}
		counted := &wsCountedWriter{ResponseWriter: w, release: release}
		u := websocket.Upgrader{}
		conn, err := u.Upgrade(counted, r, nil)
		if err != nil {
			release()
			t.Error(err)
			return
		}
		ready <- conn
		// Like serveWS, the HTTP handler returns while the tool owns the socket.
		go func() {
			defer close(done)
			run(r.Context(), wsConn{conn: conn})
		}()
	}))
	t.Cleanup(srv.Close)
	dialer := websocket.Dialer{HandshakeTimeout: 2 * time.Second}
	if useTLS {
		srv.StartTLS()
		roots := x509.NewCertPool()
		roots.AddCert(srv.Certificate())
		dialer.TLSClientConfig = &tls.Config{RootCAs: roots}
	} else {
		srv.Start()
	}
	client, _, err := dialer.Dial("ws"+strings.TrimPrefix(srv.URL, "http"), nil)
	if err != nil {
		t.Fatal(err)
	}
	server := <-ready
	client.SetReadDeadline(time.Now().Add(3 * wsCloseTimeout))
	t.Cleanup(func() {
		client.Close()
		server.Close() // Cleanup after failures; assertions precede this fallback.
		select {
		case <-done:
		case <-time.After(time.Second):
			t.Error("tool did not exit after closing its connection")
		}
	})
	return wsCloseSession{client: client, done: done, limiter: limiter}
}

func assertWSClosePending(t *testing.T, s wsCloseSession) {
	t.Helper()
	select {
	case <-s.done:
		t.Fatal("tool returned before the peer Close or closing deadline")
	case <-time.After(20 * time.Millisecond):
	}
	if total, _, _ := s.limiter.counts(); total != 1 {
		t.Fatalf("connection slot released before closing handshake: %d", total)
	}
}

func assertWSCloseFinished(t *testing.T, s wsCloseSession, reader context.Context) {
	t.Helper()
	select {
	case <-s.done:
	case <-time.After(time.Second):
		t.Fatal("tool did not exit promptly")
	}
	select {
	case <-reader.Done():
	case <-time.After(time.Second):
		t.Fatal("reader did not exit")
	}
	if total, anonymous, clients := s.limiter.counts(); total != 0 || anonymous != 0 || clients != 0 {
		t.Fatalf("connection slots leaked: %d/%d/%d", total, anonymous, clients)
	}
}

func readWSClose(t *testing.T, client *websocket.Conn, code int, reason string) {
	t.Helper()
	_, _, err := client.ReadMessage()
	var closeErr *websocket.CloseError
	if !errors.As(err, &closeErr) || closeErr.Code != code || closeErr.Text != reason {
		t.Fatalf("close = %v, want code=%d reason=%q", err, code, reason)
	}
	if !utf8.ValidString(closeErr.Text) || len(closeErr.Text) > 123 {
		t.Fatalf("invalid close reason: %q", closeErr.Text)
	}
}

func replyWSClose(t *testing.T, client *websocket.Conn) {
	t.Helper()
	if err := client.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""), time.Now().Add(time.Second)); err != nil {
		t.Fatal(err)
	}
}

func TestWSDiagnosticCloseHandshake(t *testing.T) {
	for _, transport := range []string{"TCP", "TLS"} {
		t.Run(transport, func(t *testing.T) {
			for _, name := range []string{"health", "trace", "logs", "watch", "speedtest", "profile"} {
				t.Run(name, func(t *testing.T) {
					backend := newWSCloseBackend()
					s := openWSCloseSession(t, transport == "TLS", func(ctx context.Context, conn wsConn) {
						backend.run(name, ctx, conn)
					})
					reader := <-backend.started
					// Delay the peer reply independently of receiving the server Close.
					s.client.SetCloseHandler(func(int, string) error { return nil })
					if err := s.client.WriteMessage(websocket.TextMessage, []byte("ok")); err != nil {
						t.Fatal(err)
					}
					if name == "health" || name == "profile" {
						kind, data, err := s.client.ReadMessage()
						if err != nil {
							t.Fatal(err)
						}
						if name == "profile" {
							if kind != websocket.BinaryMessage || string(data) != backend.payload {
								t.Fatal("profile payload changed or truncated")
							}
						} else {
							var report struct {
								ServerHealthInfo map[string]string `json:"serverHealthInfo"`
								ReportStatus     string            `json:"reportStatus"`
							}
							if err := json.Unmarshal(data, &report); err != nil || kind != websocket.TextMessage || report.ServerHealthInfo["marker"] != backend.payload || report.ReportStatus != "ok" {
								t.Fatalf("health report changed or truncated: %v", err)
							}
						}
					}
					readWSClose(t, s.client, websocket.CloseNormalClosure, "")
					assertWSClosePending(t, s)
					replyWSClose(t, s.client)
					assertWSCloseFinished(t, s, reader)
				})
			}
		})
	}
}

func TestWSHealthCloseErrors(t *testing.T) {
	for _, tc := range []struct {
		name   string
		err    error
		code   int
		reason string
	}{
		{"backend", errors.New("backend failed"), 1011, "backend failed"},
		{"timeout", context.DeadlineExceeded, 1008, ""},
		{"canceled", context.Canceled, 1011, "context canceled"},
		{"exact_limit", errors.New(strings.Repeat("x", 123)), 1011, strings.Repeat("x", 123)},
		{"over_limit", errors.New(strings.Repeat("x", 124)), 1011, strings.Repeat("x", 123)},
		{"multibyte", errors.New(strings.Repeat("x", 122) + "错误"), 1011, strings.Repeat("x", 122)},
		{"long_multibyte", errors.New(strings.Repeat("错", 100)), 1011, strings.Repeat("错", 41)},
		{"invalid_utf8", errors.New("x\xffy"), 1011, "x\uFFFDy"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			backend := newWSCloseBackend()
			backend.err = tc.err
			s := openWSCloseSession(t, false, func(ctx context.Context, conn wsConn) {
				backend.run("health", ctx, conn)
			})
			reader := <-backend.started
			readWSClose(t, s.client, tc.code, tc.reason) // Default handler replies.
			assertWSCloseFinished(t, s, reader)
		})
	}
}

func TestWSDiagnosticCloseTimeoutReleasesQuota(t *testing.T) {
	backend := newWSCloseBackend()
	s := openWSCloseSession(t, false, func(ctx context.Context, conn wsConn) {
		backend.run("trace", ctx, conn)
	})
	reader := <-backend.started
	s.client.SetCloseHandler(func(int, string) error { return nil })
	readWSClose(t, s.client, 1000, "")
	assertWSClosePending(t, s)
	select {
	case <-s.done:
	case <-time.After(wsCloseTimeout + time.Second):
		t.Fatal("unresponsive peer held the connection past the closing budget")
	}
	assertWSCloseFinished(t, s, reader)
}

func TestWSClosePeerTermination(t *testing.T) {
	for _, mode := range []string{"peer_first", "simultaneous", "already_sent", "transport_error", "write_failure"} {
		t.Run(mode, func(t *testing.T) {
			readers := make(chan context.Context, 1)
			start := make(chan struct{})
			s := openWSCloseSession(t, false, func(ctx context.Context, conn wsConn) {
				defer conn.close()
				reader := wsReadClientCtx(ctx, conn)
				readers <- reader
				<-start
				if mode == "peer_first" {
					<-reader.Done()
				}
				if mode == "already_sent" {
					if err := conn.conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(1000, ""), time.Now().Add(time.Second)); err != nil {
						t.Error(err)
						return
					}
				}
				if mode == "write_failure" {
					conn.close()
				}
				sendWsCloseMessage(reader, conn, nil)
			})
			reader := <-readers
			s.client.SetCloseHandler(func(int, string) error { return nil })
			close(start)
			switch mode {
			case "transport_error":
				s.client.Close()
			case "write_failure":
				// A lost connection must not leave the handler waiting for 5 s.
			case "already_sent":
				readWSClose(t, s.client, 1000, "")
				assertWSClosePending(t, s)
				replyWSClose(t, s.client)
			default:
				replyWSClose(t, s.client)
				readWSClose(t, s.client, 1000, "")
			}
			assertWSCloseFinished(t, s, reader)
		})
	}
}

func TestWSDiagnosticStreamsOutliveCloseTimeout(t *testing.T) {
	type stream struct {
		s       wsCloseSession
		reader  context.Context
		backend *wsCloseBackend
	}
	var streams []stream
	for _, name := range []string{"trace", "logs", "watch"} {
		backend := newWSCloseBackend()
		backend.live = true
		s := openWSCloseSession(t, false, func(ctx context.Context, conn wsConn) {
			backend.run(name, ctx, conn)
		})
		streams = append(streams, stream{s, <-backend.started, backend})
	}
	// The close budget starts after business completion, not at tool startup.
	time.Sleep(wsCloseTimeout + 50*time.Millisecond)
	for _, stream := range streams {
		assertWSClosePending(t, stream.s)
		select {
		case <-stream.reader.Done():
			t.Fatal("active stream canceled by the closing timeout or HTTP context")
		default:
		}
		replyWSClose(t, stream.s.client)
		readWSClose(t, stream.s.client, 1000, "")
		assertWSCloseFinished(t, stream.s, stream.reader)
		if stream.backend.watcher != nil {
			select {
			case <-stream.backend.watcher.DoneChan:
			default:
				t.Fatal("watch producer was not canceled")
			}
		}
	}
}

// A zero-buffer pipe makes control-write backpressure deterministic, without
// network privileges, TCP buffer assumptions, or production timeout overrides.
type wsClosePipeWriter struct {
	*httptest.ResponseRecorder
	conn net.Conn
	rw   *bufio.ReadWriter
}

func (w wsClosePipeWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	return w.conn, w.rw, nil
}

func TestWSCloseTotalDeadline(t *testing.T) {
	for _, mode := range []string{"blocked_control_write", "write_then_no_reply"} {
		t.Run(mode, func(t *testing.T) {
			serverNet, clientNet := net.Pipe()
			t.Cleanup(func() { serverNet.Close(); clientNet.Close() })
			done := make(chan struct{})
			started := make(chan time.Time, 1)
			readers := make(chan context.Context, 1)
			go func() {
				defer close(done)
				defer serverNet.Close()
				r := bufio.NewReader(serverNet)
				req, err := http.ReadRequest(r)
				if err != nil {
					t.Error(err)
					return
				}
				w := wsClosePipeWriter{httptest.NewRecorder(), serverNet, bufio.NewReadWriter(r, bufio.NewWriter(serverNet))}
				u := websocket.Upgrader{}
				c, err := u.Upgrade(w, req, nil)
				if err != nil {
					t.Error(err)
					return
				}
				defer c.Close()
				conn := wsConn{conn: c}
				ctx := wsReadClientCtx(context.Background(), conn)
				readers <- ctx
				started <- time.Now()
				sendWsCloseMessage(ctx, conn, nil)
			}()
			dialer := websocket.Dialer{
				HandshakeTimeout: time.Second,
				NetDial: func(_, _ string) (net.Conn, error) {
					return clientNet, nil
				},
			}
			client, _, err := dialer.Dial("ws://pipe.test/ws", nil)
			if err != nil {
				t.Fatal(err)
			}
			defer client.Close()
			client.SetCloseHandler(func(int, string) error { return nil })
			reader := <-readers
			begin := <-started
			if mode == "write_then_no_reply" {
				// Consume most of the shared budget in WriteControl. A fresh
				// 5-second ACK timer after this write would exceed the bound.
				time.Sleep(3 * time.Second)
				client.SetReadDeadline(begin.Add(wsCloseTimeout + time.Second))
				readWSClose(t, client, 1000, "")
				select {
				case <-done:
					t.Fatal("closed immediately after the control write")
				default:
				}
			}
			select {
			case <-done:
			case <-time.After(time.Until(begin.Add(wsCloseTimeout + time.Second))):
				t.Fatal("Close write and reply wait exceeded their shared budget")
			}
			if elapsed := time.Since(begin); elapsed < wsCloseTimeout-100*time.Millisecond {
				t.Fatalf("close returned before its deadline: %v", elapsed)
			}
			select {
			case <-reader.Done():
			case <-time.After(time.Second):
				t.Fatal("reader survived the final socket close")
			}
		})
	}
}
