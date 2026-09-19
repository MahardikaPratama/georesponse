/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests EquipmentAttributeValidator (BR-004).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import (
	"errors"
	"testing"
)

func TestEquipmentAttributeValidator_Validate(t *testing.T) {
	v := NewEquipmentAttributeValidator()

	if got := v.ResourceType(); got != TypeEquipment {
		t.Fatalf("ResourceType() = %v, want %v", got, TypeEquipment)
	}

	tests := []struct {
		name       string
		attributes map[string]any
		wantErr    error
	}{
		{
			name:       "valid",
			attributes: map[string]any{"equipmentType": "Water Pump", "quantity": 3.0},
			wantErr:    nil,
		},
		{
			name:       "missing equipmentType",
			attributes: map[string]any{"quantity": 3.0},
			wantErr:    ErrMissingAttribute,
		},
		{
			name:       "equipmentType wrong type",
			attributes: map[string]any{"equipmentType": 3.0, "quantity": 3.0},
			wantErr:    ErrInvalidAttribute,
		},
		{
			name:       "missing quantity",
			attributes: map[string]any{"equipmentType": "Water Pump"},
			wantErr:    ErrMissingAttribute,
		},
		{
			name:       "negative quantity",
			attributes: map[string]any{"equipmentType": "Water Pump", "quantity": -1.0},
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
