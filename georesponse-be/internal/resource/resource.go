/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package resource contains the Resource domain type and the

	fundamental invariants of resource identity, type, and status.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import (
	"errors"
	"time"
)

// Type is the category of a resource. The MVP supports exactly the four
// values enumerated below; no other string is a valid resource type.
type Type string

// Resource types supported by the MVP.
const (
	TypeVehicle   Type = "VEHICLE"
	TypeFacility  Type = "FACILITY"
	TypeEquipment Type = "EQUIPMENT"
	TypeIoTDevice Type = "IOT_DEVICE"
)

// Valid reports whether t is one of the defined resource types.
func (t Type) Valid() bool {
	switch t {
	case TypeVehicle, TypeFacility, TypeEquipment, TypeIoTDevice:
		return true
	default:
		return false
	}
}

// Status is the operational condition of a resource. The MVP supports
// exactly the four values enumerated below; no other string is a valid
// resource status.
type Status string

// Resource statuses supported by the MVP.
const (
	StatusAvailable   Status = "AVAILABLE"
	StatusInUse       Status = "IN_USE"
	StatusMaintenance Status = "MAINTENANCE"
	StatusUnavailable Status = "UNAVAILABLE"
)

// Valid reports whether s is one of the defined resource statuses.
func (s Status) Valid() bool {
	switch s {
	case StatusAvailable, StatusInUse, StatusMaintenance, StatusUnavailable:
		return true
	default:
		return false
	}
}

// Domain validation errors for Resource. Callers compare against these with
// errors.Is rather than matching on message text.
var (
	// ErrMissingID reports a resource with no identifier (BR-001).
	ErrMissingID = errors.New("resource: id must not be empty")
	// ErrMissingName reports a resource with no name (BR-002).
	ErrMissingName = errors.New("resource: name must not be empty")
	// ErrInvalidType reports a resource type outside the defined enum
	// (BR-003).
	ErrInvalidType = errors.New("resource: type is not a recognized resource type")
	// ErrInvalidStatus reports a resource status outside the defined enum
	// (BR-005, BR-006).
	ErrInvalidStatus = errors.New("resource: status is not a recognized resource status")
)

// Resource is a real-world object managed by GeoResponse in the context of
// disaster response: a vehicle, facility, piece of equipment, or IoT
// device. Identity, type, and status are checked by Validate; Attributes is
// checked separately by an AttributeValidatorRegistry, since its rules
// depend on Type and are supplied by the caller (see
// AttributeValidatorRegistry.Validate).
type Resource struct {
	// ID uniquely identifies the resource. Uniqueness across resources is
	// enforced by the repository, not by this type (BR-001).
	ID string

	// Name identifies the resource to a human reader (BR-002).
	Name string

	// Type is the resource's category and determines which attributes
	// apply to it (BR-003, BR-004).
	Type Type

	// Status is the resource's current operational condition (BR-005,
	// BR-006).
	Status Status

	// Attributes holds type-specific data (e.g. vehicleType, capacity).
	// Its required keys depend on Type; see AttributeValidatorRegistry.
	Attributes map[string]any

	// Location is the resource's current geographic position (BR-009
	// through BR-011).
	Location Location

	// UpdatedAt is when this resource's information was last changed.
	UpdatedAt time.Time
}

// Validate checks the fields whose rules do not depend on external state:
// identity, type, status, and location. It does not check Attributes
// (that depends on Type-specific rules; see AttributeValidatorRegistry) or
// ID uniqueness (that depends on the repository's existing records).
func (r Resource) Validate() error {
	if r.ID == "" {
		return ErrMissingID
	}
	if r.Name == "" {
		return ErrMissingName
	}
	if !r.Type.Valid() {
		return ErrInvalidType
	}
	if !r.Status.Valid() {
		return ErrInvalidStatus
	}
	if err := r.Location.Validate(); err != nil {
		return err
	}
	return nil
}
