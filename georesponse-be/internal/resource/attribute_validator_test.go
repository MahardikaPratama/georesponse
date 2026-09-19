/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests AttributeValidatorRegistry, including that

	registering a new resource type requires no change to the registry
	itself or to any existing validator (BR-004's Open/Closed
	requirement).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import (
	"errors"
	"testing"
)

func newTestRegistry() *AttributeValidatorRegistry {
	return NewAttributeValidatorRegistry(
		NewVehicleAttributeValidator(),
		NewFacilityAttributeValidator(),
		NewEquipmentAttributeValidator(),
		NewIoTDeviceAttributeValidator(),
	)
}

func TestAttributeValidatorRegistry_Validate(t *testing.T) {
	r := newTestRegistry()

	tests := []struct {
		name       string
		typ        Type
		attributes map[string]any
		wantErr    bool
	}{
		{name: "vehicle valid", typ: TypeVehicle, attributes: map[string]any{"vehicleType": "Ambulance", "capacity": 4.0}, wantErr: false},
		{name: "facility valid", typ: TypeFacility, attributes: map[string]any{"facilityType": "Field Hospital", "capacity": 50.0}, wantErr: false},
		{name: "equipment valid", typ: TypeEquipment, attributes: map[string]any{"equipmentType": "Water Pump", "quantity": 3.0}, wantErr: false},
		{name: "iot device valid", typ: TypeIoTDevice, attributes: map[string]any{"deviceType": "Flood Sensor"}, wantErr: false},
		{name: "vehicle invalid", typ: TypeVehicle, attributes: map[string]any{}, wantErr: true},
		{name: "unregistered type", typ: Type("DRONE"), attributes: map[string]any{}, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := r.Validate(tt.typ, tt.attributes)
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate(%v, ...) error = %v, wantErr %v", tt.typ, err, tt.wantErr)
			}
		})
	}
}

// hypotheticalDroneAttributeValidator stands in for a fifth resource type
// added after the fact, to prove the registry and the four existing
// validators need no changes to accommodate it (Open/Closed).
type hypotheticalDroneAttributeValidator struct{}

const typeDrone Type = "DRONE"

func (hypotheticalDroneAttributeValidator) ResourceType() Type { return typeDrone }

func (hypotheticalDroneAttributeValidator) Validate(attributes map[string]any) error {
	if _, ok := attributes["flightRangeKm"]; !ok {
		return errors.New("resource: flightRangeKm is required")
	}
	return nil
}

func TestAttributeValidatorRegistry_OpenClosed(t *testing.T) {
	// Registering a fifth validator alongside the existing four requires
	// no change to AttributeValidatorRegistry or to any of the four
	// existing validator implementations above — only this additional
	// constructor argument.
	r := NewAttributeValidatorRegistry(
		NewVehicleAttributeValidator(),
		NewFacilityAttributeValidator(),
		NewEquipmentAttributeValidator(),
		NewIoTDeviceAttributeValidator(),
		hypotheticalDroneAttributeValidator{},
	)

	if err := r.Validate(typeDrone, map[string]any{"flightRangeKm": 10.0}); err != nil {
		t.Fatalf("Validate(typeDrone, ...) = %v, want nil", err)
	}
	if err := r.Validate(typeDrone, map[string]any{}); err == nil {
		t.Fatal("Validate(typeDrone, {}) = nil, want an error")
	}
	// The four pre-existing types still resolve correctly.
	if err := r.Validate(TypeVehicle, map[string]any{"vehicleType": "Ambulance", "capacity": 4.0}); err != nil {
		t.Fatalf("Validate(TypeVehicle, ...) = %v, want nil", err)
	}
}
