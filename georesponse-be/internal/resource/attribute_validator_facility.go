/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the AttributeValidator for FACILITY resources.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import "fmt"

// FacilityAttributeValidator validates the attributes map for FACILITY
// resources: facilityType (string) and capacity (non-negative number).
type FacilityAttributeValidator struct{}

// NewFacilityAttributeValidator constructs a FacilityAttributeValidator.
func NewFacilityAttributeValidator() *FacilityAttributeValidator {
	return &FacilityAttributeValidator{}
}

// ResourceType returns TypeFacility.
func (FacilityAttributeValidator) ResourceType() Type {
	return TypeFacility
}

// Validate checks that attributes contains a string facilityType and a
// non-negative numeric capacity.
func (FacilityAttributeValidator) Validate(attributes map[string]any) error {
	facilityType, ok := attributes["facilityType"]
	if !ok {
		return fmt.Errorf("%w: facilityType", ErrMissingAttribute)
	}
	if _, ok := facilityType.(string); !ok {
		return fmt.Errorf("%w: facilityType must be a string", ErrInvalidAttribute)
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
