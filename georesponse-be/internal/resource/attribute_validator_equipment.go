/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the AttributeValidator for EQUIPMENT resources.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import "fmt"

// EquipmentAttributeValidator validates the attributes map for EQUIPMENT
// resources: equipmentType (string) and quantity (non-negative number).
type EquipmentAttributeValidator struct{}

// NewEquipmentAttributeValidator constructs an EquipmentAttributeValidator.
func NewEquipmentAttributeValidator() *EquipmentAttributeValidator {
	return &EquipmentAttributeValidator{}
}

// ResourceType returns TypeEquipment.
func (EquipmentAttributeValidator) ResourceType() Type {
	return TypeEquipment
}

// Validate checks that attributes contains a string equipmentType and a
// non-negative numeric quantity.
func (EquipmentAttributeValidator) Validate(attributes map[string]any) error {
	equipmentType, ok := attributes["equipmentType"]
	if !ok {
		return fmt.Errorf("%w: equipmentType", ErrMissingAttribute)
	}
	if _, ok := equipmentType.(string); !ok {
		return fmt.Errorf("%w: equipmentType must be a string", ErrInvalidAttribute)
	}

	quantity, ok := attributes["quantity"]
	if !ok {
		return fmt.Errorf("%w: quantity", ErrMissingAttribute)
	}
	if !isNonNegativeNumber(quantity) {
		return fmt.Errorf("%w: quantity must be a non-negative number", ErrInvalidAttribute)
	}

	return nil
}
