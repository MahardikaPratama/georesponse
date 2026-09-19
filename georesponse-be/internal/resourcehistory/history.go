/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the resource history domain types: StatusHistory,

	LocationHistory, and ResourceChangeHistory (BR-008, BR-014).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resourcehistory

import (
	"time"

	"github.com/mahardika-pratama/georesponse-be/internal/resource"
)

// StatusHistory records one resource status change (BR-008). ChangedBy is
// nil when the responsible user is not available, per BR-008's "when user
// identity is available".
type StatusHistory struct {
	ID             string
	ResourceID     string
	PreviousStatus resource.Status
	NewStatus      resource.Status
	ChangedAt      time.Time
	ChangedBy      *string
}

// LocationHistory records one resource relocation (BR-014). ChangedBy is
// nil when the responsible user is not available, per BR-014's "when user
// identity is available".
type LocationHistory struct {
	ID               string
	ResourceID       string
	PreviousLocation resource.Location
	NewLocation      resource.Location
	ChangedAt        time.Time
	ChangedBy        *string
}

// ResourceChange describes one field's change within a
// ResourceChangeHistory entry. Before and After hold the field's value
// before and after the change, in whatever type that field naturally has.
type ResourceChange struct {
	Field  string
	Before any
	After  any
}

// ResourceChangeHistory records the set of field-level changes made to a
// resource by a single update operation.
type ResourceChangeHistory struct {
	ID         string
	ResourceID string
	Changes    []ResourceChange
	ChangedAt  time.Time
	ChangedBy  *string
}
