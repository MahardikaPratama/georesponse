/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests coordinate range validation (BR-009, BR-010),

	covering valid, boundary, and out-of-range values.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import (
	"errors"
	"testing"
)

func TestValidateLocation(t *testing.T) {
	tests := []struct {
		name    string
		lat     float64
		lng     float64
		wantErr bool
	}{
		{name: "valid coordinates", lat: -6.9147, lng: 107.6098, wantErr: false},
		{name: "latitude at lower boundary", lat: -90, lng: 0, wantErr: false},
		{name: "latitude at upper boundary", lat: 90, lng: 0, wantErr: false},
		{name: "longitude at lower boundary", lat: 0, lng: -180, wantErr: false},
		{name: "longitude at upper boundary", lat: 0, lng: 180, wantErr: false},
		{name: "origin", lat: 0, lng: 0, wantErr: false},
		{name: "latitude above 90", lat: 90.1, lng: 0, wantErr: true},
		{name: "latitude below -90", lat: -90.1, lng: 0, wantErr: true},
		{name: "longitude above 180", lat: 0, lng: 180.1, wantErr: true},
		{name: "longitude below -180", lat: 0, lng: -180.1, wantErr: true},
		{name: "both out of range", lat: 1000, lng: -1000, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateLocation(tt.lat, tt.lng)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ValidateLocation(%v, %v) error = %v, wantErr %v", tt.lat, tt.lng, err, tt.wantErr)
			}
			if err != nil && !errors.Is(err, ErrInvalidLocation) {
				t.Fatalf("ValidateLocation(%v, %v) error = %v, want it to wrap ErrInvalidLocation", tt.lat, tt.lng, err)
			}
		})
	}
}

func TestLocation_Validate(t *testing.T) {
	loc := Location{Latitude: -6.9147, Longitude: 107.6098}
	if err := loc.Validate(); err != nil {
		t.Fatalf("Validate() = %v, want nil", err)
	}

	loc.Latitude = 91
	if err := loc.Validate(); !errors.Is(err, ErrInvalidLocation) {
		t.Fatalf("Validate() = %v, want it to wrap ErrInvalidLocation", err)
	}
}
