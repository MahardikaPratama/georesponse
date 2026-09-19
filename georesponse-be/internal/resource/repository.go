/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the Repository interface application code depends

	on to persist and retrieve Resources. The PostgreSQL implementation
	lives outside this package, in internal/repository/postgres, so that
	application code depends on the interface, never the implementation.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import "context"

// Filters narrows a List call's results. Nil fields are not applied;
// non-nil fields combine with AND (BR-045).
type Filters struct {
	// Search matches resource information (at minimum, name) as a
	// case-insensitive substring.
	Search *string
	// Type restricts results to one resource Type.
	Type *Type
	// Status restricts results to one resource Status.
	Status *Status
	// Page is the 1-indexed page to return. Values below 1 are treated
	// as 1.
	Page int
	// PageSize is the number of results per page. Values below 1 default
	// to 20; values above 100 are capped at 100.
	PageSize int
}

// Repository persists and retrieves Resources.
type Repository interface {
	// Create persists a new resource. It returns ErrIDConflict if a
	// resource with the same ID already exists (BR-001).
	Create(ctx context.Context, r Resource) error

	// GetByID returns the resource with the given id, or ErrNotFound if
	// none exists.
	GetByID(ctx context.Context, id string) (*Resource, error)

	// List returns the resources matching f, along with the total number
	// of matches across all pages (for API pagination metadata).
	List(ctx context.Context, f Filters) ([]Resource, int, error)

	// Update replaces the mutable fields of an existing resource. It
	// returns ErrNotFound if no resource exists with r.ID.
	Update(ctx context.Context, r Resource) error

	// UpdateStatus changes only the status of the resource identified by
	// id, leaving identity, type, and location unchanged (BR-007). It
	// returns ErrNotFound if no resource exists with that id.
	UpdateStatus(ctx context.Context, id string, status Status) error

	// UpdateLocation changes only the location of the resource identified
	// by id, leaving identity, type, and status unchanged (BR-012). It
	// returns ErrNotFound if no resource exists with that id.
	UpdateLocation(ctx context.Context, id string, location Location) error

	// Delete permanently removes the resource identified by id (a hard
	// delete, per the project's deletion-model decision). It returns
	// ErrNotFound if no resource exists with that id.
	Delete(ctx context.Context, id string) error
}
