/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the AttributeValidator for IOT_DEVICE resources.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import "fmt"

// IoTDeviceAttributeValidator validates the attributes map for IOT_DEVICE
// resources: deviceType (string).
type IoTDeviceAttributeValidator struct{}

// NewIoTDeviceAttributeValidator constructs an IoTDeviceAttributeValidator.
func NewIoTDeviceAttributeValidator() *IoTDeviceAttributeValidator {
	return &IoTDeviceAttributeValidator{}
}

// ResourceType returns TypeIoTDevice.
func (IoTDeviceAttributeValidator) ResourceType() Type {
	return TypeIoTDevice
}

// Validate checks that attributes contains a string deviceType.
func (IoTDeviceAttributeValidator) Validate(attributes map[string]any) error {
	deviceType, ok := attributes["deviceType"]
	if !ok {
		return fmt.Errorf("%w: deviceType", ErrMissingAttribute)
	}
	if _, ok := deviceType.(string); !ok {
		return fmt.Errorf("%w: deviceType must be a string", ErrInvalidAttribute)
	}

	return nil
}
