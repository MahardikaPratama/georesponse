/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Unit tests for Service against a hand-rolled fake

	Repository, matching resource/service_test.go's no-mocking-library
	convention.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package hotspot_test

import (
	"context"
	"errors"
	"testing"

	"github.com/mahardika-pratama/georesponse-be/internal/hotspot"
)

type fakeHotspotRepository struct {
	hotspots []hotspot.Hotspot
	err      error
	calls    int
}

func (f *fakeHotspotRepository) List(ctx context.Context, filters hotspot.Filters) ([]hotspot.Hotspot, error) {
	f.calls++
	if f.err != nil {
		return nil, f.err
	}
	return f.hotspots, nil
}

func TestService_ListHotspots_Success(t *testing.T) {
	repo := &fakeHotspotRepository{
		hotspots: []hotspot.Hotspot{{ID: "1", Province: "JAWA BARAT"}},
	}
	svc := hotspot.NewService(repo)

	got, err := svc.ListHotspots(context.Background(), hotspot.Filters{})
	if err != nil {
		t.Fatalf("ListHotspots() error = %v, want nil", err)
	}
	if len(got) != 1 || got[0].ID != "1" {
		t.Fatalf("ListHotspots() = %+v, want one hotspot with ID 1", got)
	}
	if repo.calls != 1 {
		t.Fatalf("repo.calls = %d, want 1", repo.calls)
	}
}

func TestService_ListHotspots_UpstreamErrorColdCache(t *testing.T) {
	repo := &fakeHotspotRepository{err: errors.New("boom")}
	svc := hotspot.NewService(repo)

	_, err := svc.ListHotspots(context.Background(), hotspot.Filters{})
	if !errors.Is(err, hotspot.ErrUpstreamUnavailable) {
		t.Fatalf("ListHotspots() error = %v, want ErrUpstreamUnavailable", err)
	}
}

func TestService_ListHotspots_UpstreamErrorWarmCacheServesStale(t *testing.T) {
	repo := &fakeHotspotRepository{
		hotspots: []hotspot.Hotspot{{ID: "1", Province: "JAWA BARAT"}},
	}
	svc := hotspot.NewService(repo)

	if _, err := svc.ListHotspots(context.Background(), hotspot.Filters{}); err != nil {
		t.Fatalf("first ListHotspots() error = %v, want nil", err)
	}

	repo.err = errors.New("boom")
	got, err := svc.ListHotspots(context.Background(), hotspot.Filters{})
	if err != nil {
		t.Fatalf("second ListHotspots() error = %v, want nil (should serve stale cache)", err)
	}
	if len(got) != 1 || got[0].ID != "1" {
		t.Fatalf("ListHotspots() = %+v, want the cached hotspot", got)
	}
}
