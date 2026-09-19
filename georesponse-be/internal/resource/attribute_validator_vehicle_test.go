/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests VehicleAttributeValidator (BR-004).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import (
	"errors"
	"testing"
)

func TestVehicleAttributeValidator_Validate(t *testing.T) {
	v := NewVehicleAttributeValidator()

	if got := v.ResourceType(); got != TypeVehicle {
		t.Fatalf("ResourceType() = %v, want %v", got, TypeVehicle)
	}

	tests := []struct {
		name       string
		attributes map[string]any
		wantErr    error
	}{
		{
			name:       "valid",
			attributes: map[string]any{"vehicleType": "Ambulance", "capacity": 4.0},
			wantErr:    nil,
		},
		{
			name:       "missing vehicleType",
			attributes: map[string]any{"capacity": 4.0},
			wantErr:    ErrMissingAttribute,
		},
		{
			name:       "vehicleType wrong type",
			attributes: map[string]any{"vehicleType": 123, "capacity": 4.0},
			wantErr:    ErrInvalidAttribute,
		},
		{
			name:       "missing capacity",
			attributes: map[string]any{"vehicleType": "Ambulance"},
			wantErr:    ErrMissingAttribute,
		},
		{
			name:       "negative capacity",
			attributes: map[string]any{"vehicleType": "Ambulance", "capacity": -1.0},
			wantErr:    ErrInvalidAttribute,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.Validate(tt.attributes)
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
