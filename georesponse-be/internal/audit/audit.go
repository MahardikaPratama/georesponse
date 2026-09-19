/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the AuditRecord domain type and its operation-type

	enum (BR-035 through BR-039).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package audit

import (
	"errors"
	"time"
)

// Operation identifies the kind of system operation an AuditRecord
// describes.
type Operation string

// Audit operation types (BR-035).
const (
	OperationResourceCreated       Operation = "RESOURCE_CREATED"
	OperationResourceUpdated       Operation = "RESOURCE_UPDATED"
	OperationResourceStatusChanged Operation = "RESOURCE_STATUS_CHANGED"
	OperationResourceRelocated     Operation = "RESOURCE_RELOCATED"
	OperationResourceDeleted       Operation = "RESOURCE_DELETED"
	OperationRoleChanged           Operation = "ROLE_CHANGED"
	OperationPermissionChanged     Operation = "PERMISSION_CHANGED"
)

// Valid reports whether o is one of the defined audit operation types.
func (o Operation) Valid() bool {
	switch o {
	case OperationResourceCreated, OperationResourceUpdated, OperationResourceStatusChanged,
		OperationResourceRelocated, OperationResourceDeleted, OperationRoleChanged, OperationPermissionChanged:
		return true
	default:
		return false
	}
}

// Domain validation errors for AuditRecord.
var (
	// ErrMissingID reports an audit record with no identifier.
	ErrMissingID = errors.New("audit: id must not be empty")
	// ErrInvalidOperation reports an operation outside the defined enum
	// (BR-036).
	ErrInvalidOperation = errors.New("audit: operation is not a recognized audit operation type")
	// ErrMissingOccurredAt reports an audit record with no timestamp
	// (BR-037).
	ErrMissingOccurredAt = errors.New("audit: occurredAt must not be zero")
)

// AuditRecord is one entry in the system's audit trail: a record that an
// operation affecting protected system state occurred (BR-035). UserID and
// ResourceID are nil when not applicable or not available — per BR-038,
// the actor "should" be identified, not "must".
type AuditRecord struct {
	ID         string
	Operation  Operation
	UserID     *string
	ResourceID *string
	OccurredAt time.Time
	Details    map[string]any
}

// Validate checks that r has an identifier, a recognized operation, and a
// non-zero timestamp (BR-036, BR-037).
func (r AuditRecord) Validate() error {
	if r.ID == "" {
		return ErrMissingID
	}
	if !r.Operation.Valid() {
		return ErrInvalidOperation
	}
	if r.OccurredAt.IsZero() {
		return ErrMissingOccurredAt
	}
	return nil
}
