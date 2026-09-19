/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests FacilityAttributeValidator (BR-004).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import (
	"errors"
	"testing"
)

func TestFacilityAttributeValidator_Validate(t *testing.T) {
	v := NewFacilityAttributeValidator()

	if got := v.ResourceType(); got != TypeFacility {
		t.Fatalf("ResourceType() = %v, want %v", got, TypeFacility)
	}

	tests := []struct {
		name       string
		attributes map[string]any
		wantErr    error
	}{
		{
			name:       "valid",
			attributes: map[string]any{"facilityType": "Field Hospital", "capacity": 50.0},
			wantErr:    nil,
		},
		{
			name:       "missing facilityType",
			attributes: map[string]any{"capacity": 50.0},
			wantErr:    ErrMissingAttribute,
		},
		{
			name:       "facilityType wrong type",
			attributes: map[string]any{"facilityType": true, "capacity": 50.0},
			wantErr:    ErrInvalidAttribute,
		},
		{
			name:       "missing capacity",
			attributes: map[string]any{"facilityType": "Field Hospital"},
			wantErr:    ErrMissingAttribute,
		},
		{
			name:       "negative capacity",
			attributes: map[string]any{"facilityType": "Field Hospital", "capacity": -5.0},
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
