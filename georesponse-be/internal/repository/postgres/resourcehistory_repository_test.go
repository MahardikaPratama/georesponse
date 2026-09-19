/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Integration tests for ResourceHistoryRepository against a

	real PostgreSQL+PostGIS instance, including that history survives
	the resource it references being hard-deleted (migration 0006).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/mahardika-pratama/georesponse-be/internal/resource"
	"github.com/mahardika-pratama/georesponse-be/internal/resourcehistory"
)

func TestResourceHistoryRepository_InsertAndListByResourceID(t *testing.T) {
	tx := testTx(t)
	resources := NewResourceRepository(tx)
	histories := NewResourceHistoryRepository(tx)
	ctx := context.Background()

	res := resource.Resource{
		ID: "test-history-resource", Name: "R", Type: resource.TypeVehicle, Status: resource.StatusAvailable,
		Attributes: map[string]any{"vehicleType": "Truck", "capacity": 2.0}, Location: resource.Location{},
	}
	if err := resources.Create(ctx, res); err != nil {
		t.Fatalf("seed Create() = %v, want nil", err)
	}

	changedBy := "test-history-user"
	// changed_by references users(id); seed a user row so the inserts
	// below satisfy that foreign key.
	if _, err := tx.Exec(ctx, "INSERT INTO users (id, name) VALUES ($1, $2)", changedBy, "Test User"); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	now := time.Now().UTC().Truncate(time.Second)

	if err := histories.InsertStatusHistory(ctx, resourcehistory.StatusHistory{
		ID: "test-status-history-1", ResourceID: res.ID,
		PreviousStatus: resource.StatusAvailable, NewStatus: resource.StatusInUse,
		ChangedAt: now, ChangedBy: &changedBy,
	}); err != nil {
		t.Fatalf("InsertStatusHistory() = %v, want nil", err)
	}

	if err := histories.InsertLocationHistory(ctx, resourcehistory.LocationHistory{
		ID: "test-location-history-1", ResourceID: res.ID,
		PreviousLocation: resource.Location{Latitude: 0, Longitude: 0},
		NewLocation:      resource.Location{Latitude: -6.2, Longitude: 106.8},
		ChangedAt:        now, ChangedBy: &changedBy,
	}); err != nil {
		t.Fatalf("InsertLocationHistory() = %v, want nil", err)
	}

	if err := histories.InsertChangeHistory(ctx, resourcehistory.ResourceChangeHistory{
		ID: "test-change-history-1", ResourceID: res.ID,
		Changes:   []resourcehistory.ResourceChange{{Field: "name", Before: "R", After: "R2"}},
		ChangedAt: now, ChangedBy: &changedBy,
	}); err != nil {
		t.Fatalf("InsertChangeHistory() = %v, want nil", err)
	}

	got, err := histories.ListByResourceID(ctx, res.ID, nil, 1, 20)
	if err != nil {
		t.Fatalf("ListByResourceID() = %v, want nil", err)
	}
	if len(got.StatusHistory) != 1 || got.StatusHistory[0].NewStatus != resource.StatusInUse {
		t.Fatalf("StatusHistory = %+v, want one entry with NewStatus=IN_USE", got.StatusHistory)
	}
	if len(got.LocationHistory) != 1 || got.LocationHistory[0].NewLocation.Latitude != -6.2 {
		t.Fatalf("LocationHistory = %+v, want one entry at latitude -6.2", got.LocationHistory)
	}
	if len(got.ChangeHistory) != 1 || len(got.ChangeHistory[0].Changes) != 1 || got.ChangeHistory[0].Changes[0].Field != "name" {
		t.Fatalf("ChangeHistory = %+v, want one entry changing field \"name\"", got.ChangeHistory)
	}

	// Filtering by type returns only that category.
	statusType := resourcehistory.TypeStatus
	filtered, err := histories.ListByResourceID(ctx, res.ID, &statusType, 1, 20)
	if err != nil {
		t.Fatalf("ListByResourceID(type=status) = %v, want nil", err)
	}
	if len(filtered.StatusHistory) != 1 || filtered.LocationHistory != nil || filtered.ChangeHistory != nil {
		t.Fatalf("ListByResourceID(type=status) = %+v, want only StatusHistory populated", filtered)
	}
}

// TestResourceHistoryRepository_SurvivesResourceDeletion proves migration
// 0006's fix: deleting a resource must not delete its history, since
// DATABASE_ARCHITECTURE.md and API_CONTRACT.md both require history to
// remain available after a hard delete.
func TestResourceHistoryRepository_SurvivesResourceDeletion(t *testing.T) {
	tx := testTx(t)
	resources := NewResourceRepository(tx)
	histories := NewResourceHistoryRepository(tx)
	ctx := context.Background()

	res := resource.Resource{
		ID: "test-history-survives-delete", Name: "R", Type: resource.TypeVehicle, Status: resource.StatusAvailable,
		Attributes: map[string]any{"vehicleType": "Truck", "capacity": 2.0}, Location: resource.Location{},
	}
	if err := resources.Create(ctx, res); err != nil {
		t.Fatalf("seed Create() = %v, want nil", err)
	}

	if err := histories.InsertStatusHistory(ctx, resourcehistory.StatusHistory{
		ID: "test-status-history-survives", ResourceID: res.ID,
		PreviousStatus: resource.StatusAvailable, NewStatus: resource.StatusInUse,
		ChangedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("InsertStatusHistory() = %v, want nil", err)
	}

	if err := resources.Delete(ctx, res.ID); err != nil {
		t.Fatalf("Delete() = %v, want nil", err)
	}

	// The history row itself must still exist, queryable directly by its
	// own id even though it can no longer be reached via
	// ListByResourceID(res.ID) (its resource_id was set to NULL, not
	// cascaded away).
	var count int
	err := tx.QueryRow(ctx, "SELECT count(*) FROM resource_status_history WHERE id = $1", "test-status-history-survives").Scan(&count)
	if err != nil {
		t.Fatalf("count history row: %v", err)
	}
	if count != 1 {
		t.Fatalf("resource_status_history row count = %d after resource deletion, want 1 (history must survive)", count)
	}
}
