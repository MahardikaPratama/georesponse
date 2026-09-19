/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests IoTDeviceAttributeValidator (BR-004).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import (
	"errors"
	"testing"
)

func TestIoTDeviceAttributeValidator_Validate(t *testing.T) {
	v := NewIoTDeviceAttributeValidator()

	if got := v.ResourceType(); got != TypeIoTDevice {
		t.Fatalf("ResourceType() = %v, want %v", got, TypeIoTDevice)
	}

	tests := []struct {
		name       string
		attributes map[string]any
		wantErr    error
	}{
		{
			name:       "valid",
			attributes: map[string]any{"deviceType": "Flood Sensor"},
			wantErr:    nil,
		},
		{
			name:       "missing deviceType",
			attributes: map[string]any{},
			wantErr:    ErrMissingAttribute,
		},
		{
			name:       "deviceType wrong type",
			attributes: map[string]any{"deviceType": 42},
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
