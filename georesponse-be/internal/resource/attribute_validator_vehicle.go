/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the AttributeValidator for VEHICLE resources.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import "fmt"

// VehicleAttributeValidator validates the attributes map for VEHICLE
// resources: vehicleType (string) and capacity (non-negative number).
type VehicleAttributeValidator struct{}

// NewVehicleAttributeValidator constructs a VehicleAttributeValidator.
func NewVehicleAttributeValidator() *VehicleAttributeValidator {
	return &VehicleAttributeValidator{}
}

// ResourceType returns TypeVehicle.
func (VehicleAttributeValidator) ResourceType() Type {
	return TypeVehicle
}

// Validate checks that attributes contains a string vehicleType and a
// non-negative numeric capacity.
func (VehicleAttributeValidator) Validate(attributes map[string]any) error {
	vehicleType, ok := attributes["vehicleType"]
	if !ok {
		return fmt.Errorf("%w: vehicleType", ErrMissingAttribute)
	}
	if _, ok := vehicleType.(string); !ok {
		return fmt.Errorf("%w: vehicleType must be a string", ErrInvalidAttribute)
	}

	capacity, ok := attributes["capacity"]
	if !ok {
		return fmt.Errorf("%w: capacity", ErrMissingAttribute)
	}
	if !isNonNegativeNumber(capacity) {
		return fmt.Errorf("%w: capacity must be a non-negative number", ErrInvalidAttribute)
	}

	return nil
}
