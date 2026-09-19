/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : httptest-based tests for GET /api/v1/hotspots, mirroring

	resource_handler_test.go's fixture pattern (fake repo -> real
	service -> real handler -> chi router).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/hotspot"
	"github.com/mahardika-pratama/georesponse-be/internal/http/middleware"
)

type fakeHotspotRepository struct {
	hotspots []hotspot.Hotspot
	err      error
}

func (f *fakeHotspotRepository) List(ctx context.Context, filters hotspot.Filters) ([]hotspot.Hotspot, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.hotspots, nil
}

func newHotspotTestRouter(repo *fakeHotspotRepository) http.Handler {
	svc := hotspot.NewService(repo)
	handler := NewHotspotHandler(svc)

	userRepo := newFakeUserRepository()
	userRepo.users["user-001"] = auth.User{ID: "user-001", Name: "Test Operator", RoleNames: []string{"operator"}}

	r := chi.NewRouter()
	r.Use(middleware.RequireAuth(fakeTokenSigner{}, userRepo))
	r.Get("/hotspots", handler.List)
	return r
}

func doHotspotRequest(t *testing.T, router http.Handler) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/hotspots", nil)
	req.AddCookie(&http.Cookie{Name: middleware.AuthCookieName, Value: authCookieValue("user-001")})
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func TestHotspotHandler_List_Success(t *testing.T) {
	repo := &fakeHotspotRepository{
		hotspots: []hotspot.Hotspot{
			{ID: "1", Latitude: -6.9147, Longitude: 107.6098, Province: "JAWA BARAT"},
		},
	}
	router := newHotspotTestRouter(repo)

	rec := doHotspotRequest(t, router)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}

	var got struct {
		Data []hotspotResponse `json:"data"`
		Meta struct {
			Total int `json:"total"`
		} `json:"meta"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if len(got.Data) != 1 || got.Data[0].Province != "JAWA BARAT" {
		t.Fatalf("data = %+v, want one hotspot in JAWA BARAT", got.Data)
	}
	if got.Meta.Total != 1 {
		t.Fatalf("meta.total = %d, want 1", got.Meta.Total)
	}
}

func TestHotspotHandler_List_Empty(t *testing.T) {
	router := newHotspotTestRouter(&fakeHotspotRepository{hotspots: []hotspot.Hotspot{}})

	rec := doHotspotRequest(t, router)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}

	var got struct {
		Data []hotspotResponse `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if len(got.Data) != 0 {
		t.Fatalf("data = %+v, want empty", got.Data)
	}
}

func TestHotspotHandler_List_UpstreamUnavailable(t *testing.T) {
	router := newHotspotTestRouter(&fakeHotspotRepository{err: errors.New("boom")})

	rec := doHotspotRequest(t, router)
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status = %d, want 502; body: %s", rec.Code, rec.Body.String())
	}

	var got struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if got.Error.Code != "HOTSPOT_UPSTREAM_UNAVAILABLE" {
		t.Fatalf("error.code = %q, want HOTSPOT_UPSTREAM_UNAVAILABLE", got.Error.Code)
	}
}
