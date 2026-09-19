/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests Service's GetResourceHistory use case and its

	Record* methods (which implement resource.HistoryRecorder) against
	hand-written fakes.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resourcehistory

import (
	"context"
	"errors"
	"testing"

	"github.com/mahardika-pratama/georesponse-be/internal/resource"
)

type fakeRepository struct {
	statusHistory []StatusHistory
	inserted      int
}

func (f *fakeRepository) InsertStatusHistory(ctx context.Context, h StatusHistory) error {
	f.inserted++
	f.statusHistory = append(f.statusHistory, h)
	return nil
}

func (f *fakeRepository) InsertLocationHistory(ctx context.Context, h LocationHistory) error {
	f.inserted++
	return nil
}

func (f *fakeRepository) InsertChangeHistory(ctx context.Context, h ResourceChangeHistory) error {
	f.inserted++
	return nil
}

func (f *fakeRepository) ListByResourceID(ctx context.Context, resourceID string, filterType *Type, page, pageSize int) (History, error) {
	return History{StatusHistory: f.statusHistory}, nil
}

type fakeResourceReader struct {
	exists map[string]bool
}

func (f *fakeResourceReader) GetByID(ctx context.Context, id string) (*resource.Resource, error) {
	if !f.exists[id] {
		return nil, resource.ErrNotFound
	}
	return &resource.Resource{ID: id}, nil
}

func TestService_GetResourceHistory_NotFound(t *testing.T) {
	svc := NewService(&fakeRepository{}, &fakeResourceReader{exists: map[string]bool{}})

	_, err := svc.GetResourceHistory(context.Background(), "does-not-exist", nil, 1, 20)
	if !errors.Is(err, resource.ErrNotFound) {
		t.Fatalf("GetResourceHistory() = %v, want resource.ErrNotFound", err)
	}
}

func TestService_GetResourceHistory_ReturnsHistory(t *testing.T) {
	repo := &fakeRepository{}
	svc := NewService(repo, &fakeResourceReader{exists: map[string]bool{"resource-001": true}})

	if err := svc.RecordStatusChange(context.Background(), "resource-001", resource.StatusAvailable, resource.StatusInUse, nil); err != nil {
		t.Fatalf("RecordStatusChange() = %v, want nil", err)
	}

	got, err := svc.GetResourceHistory(context.Background(), "resource-001", nil, 1, 20)
	if err != nil {
		t.Fatalf("GetResourceHistory() = %v, want nil", err)
	}
	if len(got.StatusHistory) != 1 {
		t.Fatalf("StatusHistory = %+v, want 1 entry", got.StatusHistory)
	}
}
