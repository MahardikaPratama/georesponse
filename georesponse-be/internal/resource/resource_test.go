/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests the Resource domain type's validation rules

	(BR-001, BR-002, BR-003, BR-005, BR-006).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import (
	"errors"
	"testing"
)

func validResource() Resource {
	return Resource{
		ID:     "resource-001",
		Name:   "Ambulance Unit 1",
		Type:   TypeVehicle,
		Status: StatusAvailable,
		Location: Location{
			Latitude:  -6.9147,
			Longitude: 107.6098,
		},
	}
}

func TestResource_Validate(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(r Resource) Resource
		wantErr error
	}{
		{
			name:    "valid resource",
			mutate:  func(r Resource) Resource { return r },
			wantErr: nil,
		},
		{
			name:    "missing id",
			mutate:  func(r Resource) Resource { r.ID = ""; return r },
			wantErr: ErrMissingID,
		},
		{
			name:    "missing name",
			mutate:  func(r Resource) Resource { r.Name = ""; return r },
			wantErr: ErrMissingName,
		},
		{
			name:    "invalid type",
			mutate:  func(r Resource) Resource { r.Type = "SPACESHIP"; return r },
			wantErr: ErrInvalidType,
		},
		{
			name:    "empty type",
			mutate:  func(r Resource) Resource { r.Type = ""; return r },
			wantErr: ErrInvalidType,
		},
		{
			name:    "invalid status",
			mutate:  func(r Resource) Resource { r.Status = "BROKEN"; return r },
			wantErr: ErrInvalidStatus,
		},
		{
			name:    "empty status",
			mutate:  func(r Resource) Resource { r.Status = ""; return r },
			wantErr: ErrInvalidStatus,
		},
		{
			name:    "invalid location",
			mutate:  func(r Resource) Resource { r.Location.Latitude = 100; return r },
			wantErr: ErrInvalidLocation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.mutate(validResource()).Validate()
			if tt.wantErr == nil {
				if err != nil {
					t.Fatalf("Validate() = %v, want nil", err)
				}
				return
			}
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Validate() = %v, want error wrapping %v", err, tt.wantErr)
			}
		})
	}
}

func TestType_Valid(t *testing.T) {
	tests := []struct {
		name string
		typ  Type
		want bool
	}{
		{name: "vehicle", typ: TypeVehicle, want: true},
		{name: "facility", typ: TypeFacility, want: true},
		{name: "equipment", typ: TypeEquipment, want: true},
		{name: "iot device", typ: TypeIoTDevice, want: true},
		{name: "unrecognized", typ: Type("DRONE"), want: false},
		{name: "empty", typ: Type(""), want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.typ.Valid(); got != tt.want {
				t.Fatalf("Type(%q).Valid() = %v, want %v", tt.typ, got, tt.want)
			}
		})
	}
}

func TestStatus_Valid(t *testing.T) {
	tests := []struct {
		name   string
		status Status
		want   bool
	}{
		{name: "available", status: StatusAvailable, want: true},
		{name: "in use", status: StatusInUse, want: true},
		{name: "maintenance", status: StatusMaintenance, want: true},
		{name: "unavailable", status: StatusUnavailable, want: true},
		{name: "unrecognized", status: Status("BROKEN"), want: false},
		{name: "empty", status: Status(""), want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.status.Valid(); got != tt.want {
				t.Fatalf("Status(%q).Valid() = %v, want %v", tt.status, got, tt.want)
			}
		})
	}
}
