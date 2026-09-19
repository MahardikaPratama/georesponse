/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : httptest-based test for GET /health.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// TestHealthHandler_DatabaseUnavailable exercises the failure path
// without a live database: a pool pointed at an address nothing listens
// on fails to ping quickly, and the handler must report 503 rather than
// hanging or panicking. The success path (a real database reachable) is
// exercised by a manual curl walkthrough, since it needs a live
// PostgreSQL instance this unit test intentionally does not depend on.
func TestHealthHandler_DatabaseUnavailable(t *testing.T) {
	pool, err := pgxpool.New(context.Background(), "postgres://nouser:nopass@127.0.0.1:1/nodb?connect_timeout=1")
	if err != nil {
		t.Fatalf("pgxpool.New() = %v, want nil (pool creation itself should not fail)", err)
	}
	defer pool.Close()

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)

	healthHandler(pool)(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503; body: %s", rec.Code, rec.Body.String())
	}

	var got healthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if got.Status != "unavailable" || got.Database != "unavailable" {
		t.Fatalf("response = %+v, want status/database = unavailable", got)
	}
}
