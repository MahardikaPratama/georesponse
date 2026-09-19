/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Integration tests for ResourceRepository against a real

	PostgreSQL+PostGIS instance.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"errors"
	"testing"

	"github.com/mahardika-pratama/georesponse-be/internal/resource"
)

func TestResourceRepository_CreateAndGetByID(t *testing.T) {
	repo := NewResourceRepository(testTx(t))
	ctx := context.Background()

	res := resource.Resource{
		ID:         "test-resource-create",
		Name:       "Test Ambulance",
		Type:       resource.TypeVehicle,
		Status:     resource.StatusAvailable,
		Attributes: map[string]any{"vehicleType": "Ambulance", "capacity": 4.0},
		Location:   resource.Location{Latitude: -6.9147, Longitude: 107.6098},
	}

	if err := repo.Create(ctx, res); err != nil {
		t.Fatalf("Create() = %v, want nil", err)
	}

	got, err := repo.GetByID(ctx, res.ID)
	if err != nil {
		t.Fatalf("GetByID() = %v, want nil", err)
	}
	if got.ID != res.ID || got.Name != res.Name || got.Type != res.Type || got.Status != res.Status {
		t.Fatalf("GetByID() = %+v, want fields matching %+v", got, res)
	}
	if got.Location.Latitude != res.Location.Latitude || got.Location.Longitude != res.Location.Longitude {
		t.Fatalf("GetByID() location = %+v, want %+v", got.Location, res.Location)
	}
	if got.Attributes["vehicleType"] != "Ambulance" {
		t.Fatalf("GetByID() attributes = %+v, want vehicleType=Ambulance", got.Attributes)
	}
}

func TestResourceRepository_Create_DuplicateID(t *testing.T) {
	repo := NewResourceRepository(testTx(t))
	ctx := context.Background()

	res := resource.Resource{
		ID: "test-resource-dup", Name: "A", Type: resource.TypeVehicle, Status: resource.StatusAvailable,
		Attributes: map[string]any{"vehicleType": "Ambulance", "capacity": 1.0},
		Location:   resource.Location{Latitude: 0, Longitude: 0},
	}
	if err := repo.Create(ctx, res); err != nil {
		t.Fatalf("first Create() = %v, want nil", err)
	}

	err := repo.Create(ctx, res)
	if !errors.Is(err, resource.ErrIDConflict) {
		t.Fatalf("second Create() = %v, want ErrIDConflict (BR-001)", err)
	}
}

func TestResourceRepository_GetByID_NotFound(t *testing.T) {
	repo := NewResourceRepository(testTx(t))

	_, err := repo.GetByID(context.Background(), "does-not-exist")
	if !errors.Is(err, resource.ErrNotFound) {
		t.Fatalf("GetByID() = %v, want ErrNotFound", err)
	}
}

func TestResourceRepository_List_Filters(t *testing.T) {
	repo := NewResourceRepository(testTx(t))
	ctx := context.Background()

	// Names carry a distinctive "zztest" marker, and every assertion below
	// filters by it, so pre-existing seed data (database/seeds) sharing a
	// type or status with these rows can never satisfy an assertion meant
	// to isolate exactly one of them.
	seed := []resource.Resource{
		{ID: "test-list-1", Name: "zztest Ambulance One", Type: resource.TypeVehicle, Status: resource.StatusAvailable,
			Attributes: map[string]any{"vehicleType": "Ambulance", "capacity": 4.0}, Location: resource.Location{}},
		{ID: "test-list-2", Name: "zztest Field Hospital", Type: resource.TypeFacility, Status: resource.StatusAvailable,
			Attributes: map[string]any{"facilityType": "Hospital", "capacity": 50.0}, Location: resource.Location{}},
		{ID: "test-list-3", Name: "zztest Generator", Type: resource.TypeEquipment, Status: resource.StatusMaintenance,
			Attributes: map[string]any{"equipmentType": "Generator", "quantity": 1.0}, Location: resource.Location{}},
	}
	for _, r := range seed {
		if err := repo.Create(ctx, r); err != nil {
			t.Fatalf("seed Create(%s) = %v, want nil", r.ID, err)
		}
	}

	marker := "zztest"

	vehicleType := resource.TypeVehicle
	got, total, err := repo.List(ctx, resource.Filters{Search: &marker, Type: &vehicleType, Page: 1, PageSize: 20})
	if err != nil {
		t.Fatalf("List(search=zztest, type=Vehicle) = %v, want nil", err)
	}
	if total != 1 || len(got) != 1 || got[0].ID != "test-list-1" {
		t.Fatalf("List(search=zztest, type=Vehicle) = %+v (total %d), want only test-list-1", got, total)
	}

	search := "zztest field hospital"
	got, total, err = repo.List(ctx, resource.Filters{Search: &search, Page: 1, PageSize: 20})
	if err != nil {
		t.Fatalf("List(search=%q) = %v, want nil", search, err)
	}
	if total != 1 || len(got) != 1 || got[0].ID != "test-list-2" {
		t.Fatalf("List(search=%q) = %+v (total %d), want only test-list-2", search, got, total)
	}

	maintenance := resource.StatusMaintenance
	got, total, err = repo.List(ctx, resource.Filters{Search: &marker, Status: &maintenance, Page: 1, PageSize: 20})
	if err != nil {
		t.Fatalf("List(search=zztest, status=Maintenance) = %v, want nil", err)
	}
	if total != 1 || len(got) != 1 || got[0].ID != "test-list-3" {
		t.Fatalf("List(search=zztest, status=Maintenance) = %+v (total %d), want only test-list-3", got, total)
	}

	// Combined filters apply as AND (BR-045): a type/status combination
	// that matches none of the seeded rows returns nothing, even though
	// each filter alone would match a row.
	facilityType := resource.TypeFacility
	got, total, err = repo.List(ctx, resource.Filters{Search: &marker, Type: &facilityType, Status: &maintenance, Page: 1, PageSize: 20})
	if err != nil {
		t.Fatalf("List(search=zztest, type=Facility, status=Maintenance) = %v, want nil", err)
	}
	if total != 0 || len(got) != 0 {
		t.Fatalf("List(search=zztest, type=Facility, status=Maintenance) = %+v (total %d), want no matches", got, total)
	}
}

func TestResourceRepository_Update(t *testing.T) {
	repo := NewResourceRepository(testTx(t))
	ctx := context.Background()

	res := resource.Resource{ID: "test-update", Name: "Before", Type: resource.TypeVehicle, Status: resource.StatusAvailable,
		Attributes: map[string]any{"vehicleType": "Truck", "capacity": 2.0}, Location: resource.Location{Latitude: 1, Longitude: 1}}
	if err := repo.Create(ctx, res); err != nil {
		t.Fatalf("Create() = %v, want nil", err)
	}

	res.Name = "After"
	res.Status = resource.StatusInUse
	if err := repo.Update(ctx, res); err != nil {
		t.Fatalf("Update() = %v, want nil", err)
	}

	got, err := repo.GetByID(ctx, res.ID)
	if err != nil {
		t.Fatalf("GetByID() = %v, want nil", err)
	}
	if got.Name != "After" || got.Status != resource.StatusInUse {
		t.Fatalf("GetByID() after Update() = %+v, want Name=After Status=IN_USE", got)
	}
}

func TestResourceRepository_Update_NotFound(t *testing.T) {
	repo := NewResourceRepository(testTx(t))

	err := repo.Update(context.Background(), resource.Resource{
		ID: "does-not-exist", Name: "X", Type: resource.TypeVehicle, Status: resource.StatusAvailable,
		Location: resource.Location{},
	})
	if !errors.Is(err, resource.ErrNotFound) {
		t.Fatalf("Update() = %v, want ErrNotFound", err)
	}
}

func TestResourceRepository_UpdateStatus(t *testing.T) {
	repo := NewResourceRepository(testTx(t))
	ctx := context.Background()

	res := resource.Resource{ID: "test-status", Name: "R", Type: resource.TypeIoTDevice, Status: resource.StatusAvailable,
		Attributes: map[string]any{"deviceType": "Sensor"}, Location: resource.Location{}}
	if err := repo.Create(ctx, res); err != nil {
		t.Fatalf("Create() = %v, want nil", err)
	}

	if err := repo.UpdateStatus(ctx, res.ID, resource.StatusUnavailable); err != nil {
		t.Fatalf("UpdateStatus() = %v, want nil", err)
	}

	got, err := repo.GetByID(ctx, res.ID)
	if err != nil {
		t.Fatalf("GetByID() = %v, want nil", err)
	}
	if got.Status != resource.StatusUnavailable {
		t.Fatalf("Status = %v, want UNAVAILABLE", got.Status)
	}
	// Identity and type must be unaffected (BR-007).
	if got.ID != res.ID || got.Type != res.Type {
		t.Fatalf("UpdateStatus() must not change identity/type, got %+v", got)
	}
}

func TestResourceRepository_UpdateLocation(t *testing.T) {
	repo := NewResourceRepository(testTx(t))
	ctx := context.Background()

	res := resource.Resource{ID: "test-location", Name: "R", Type: resource.TypeIoTDevice, Status: resource.StatusAvailable,
		Attributes: map[string]any{"deviceType": "Sensor"}, Location: resource.Location{Latitude: 0, Longitude: 0}}
	if err := repo.Create(ctx, res); err != nil {
		t.Fatalf("Create() = %v, want nil", err)
	}

	newLoc := resource.Location{Latitude: -6.2, Longitude: 106.8}
	if err := repo.UpdateLocation(ctx, res.ID, newLoc); err != nil {
		t.Fatalf("UpdateLocation() = %v, want nil", err)
	}

	got, err := repo.GetByID(ctx, res.ID)
	if err != nil {
		t.Fatalf("GetByID() = %v, want nil", err)
	}
	if got.Location.Latitude != newLoc.Latitude || got.Location.Longitude != newLoc.Longitude {
		t.Fatalf("Location = %+v, want %+v", got.Location, newLoc)
	}
	// Identity, type, and status must be unaffected (BR-012).
	if got.ID != res.ID || got.Type != res.Type || got.Status != res.Status {
		t.Fatalf("UpdateLocation() must not change identity/type/status, got %+v", got)
	}
}

func TestResourceRepository_Delete(t *testing.T) {
	repo := NewResourceRepository(testTx(t))
	ctx := context.Background()

	res := resource.Resource{ID: "test-delete", Name: "R", Type: resource.TypeIoTDevice, Status: resource.StatusAvailable,
		Attributes: map[string]any{"deviceType": "Sensor"}, Location: resource.Location{}}
	if err := repo.Create(ctx, res); err != nil {
		t.Fatalf("Create() = %v, want nil", err)
	}

	if err := repo.Delete(ctx, res.ID); err != nil {
		t.Fatalf("Delete() = %v, want nil", err)
	}

	_, err := repo.GetByID(ctx, res.ID)
	if !errors.Is(err, resource.ErrNotFound) {
		t.Fatalf("GetByID() after Delete() = %v, want ErrNotFound", err)
	}
}

func TestResourceRepository_Delete_NotFound(t *testing.T) {
	repo := NewResourceRepository(testTx(t))

	err := repo.Delete(context.Background(), "does-not-exist")
	if !errors.Is(err, resource.ErrNotFound) {
		t.Fatalf("Delete() = %v, want ErrNotFound", err)
	}
}
