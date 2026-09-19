/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : httptest-based tests for GET /api/v1/resources/{id}/history.

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

	"github.com/go-chi/chi/v5"

	"github.com/mahardika-pratama/georesponse-be/internal/resource"
	"github.com/mahardika-pratama/georesponse-be/internal/resourcehistory"
)

// stubHistoryRepository is a minimal resourcehistory.Repository fake
// returning a fixed History for any resource id; these tests only need
// GetResourceHistory's read path, not the Insert* write paths.
type stubHistoryRepository struct {
	history resourcehistory.History
}

func (f *stubHistoryRepository) InsertStatusHistory(ctx context.Context, h resourcehistory.StatusHistory) error {
	return nil
}

func (f *stubHistoryRepository) InsertLocationHistory(ctx context.Context, h resourcehistory.LocationHistory) error {
	return nil
}

func (f *stubHistoryRepository) InsertChangeHistory(ctx context.Context, h resourcehistory.ResourceChangeHistory) error {
	return nil
}

func (f *stubHistoryRepository) ListByResourceID(ctx context.Context, resourceID string, filterType *resourcehistory.Type, page, pageSize int) (resourcehistory.History, error) {
	return f.history, nil
}

func TestResourceHistoryHandler_Get_Success(t *testing.T) {
	repo := newFakeResourceRepository()
	repo.resources["resource-001"] = resource.Resource{ID: "resource-001", Name: "X", Type: resource.TypeVehicle, Status: resource.StatusAvailable}

	historyRepo := &stubHistoryRepository{
		history: resourcehistory.History{
			StatusHistory: []resourcehistory.StatusHistory{
				{ID: "history-1", ResourceID: "resource-001", PreviousStatus: resource.StatusAvailable, NewStatus: resource.StatusInUse},
			},
		},
	}
	svc := resourcehistory.NewService(historyRepo, repo)
	handler := NewResourceHistoryHandler(svc)

	r := chi.NewRouter()
	r.Get("/resources/{id}/history", handler.Get)

	req := httptest.NewRequest(http.MethodGet, "/resources/resource-001/history", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var got struct {
		Data historyResponse `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if len(got.Data.StatusHistory) != 1 {
		t.Fatalf("StatusHistory = %+v, want 1 entry", got.Data.StatusHistory)
	}
}

func TestResourceHistoryHandler_Get_ResourceNotFound(t *testing.T) {
	repo := newFakeResourceRepository()
	historyRepo := &stubHistoryRepository{}
	svc := resourcehistory.NewService(historyRepo, repo)
	handler := NewResourceHistoryHandler(svc)

	r := chi.NewRouter()
	r.Get("/resources/{id}/history", handler.Get)

	req := httptest.NewRequest(http.MethodGet, "/resources/does-not-exist/history", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assertErrorResponse(t, rec, http.StatusNotFound, "RESOURCE_NOT_FOUND")
}
