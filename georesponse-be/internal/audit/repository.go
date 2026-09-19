/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the Repository interface for recording and querying

	the audit trail and its filter set.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package audit

import (
	"context"
	"time"
)

// Filters narrows a List call's results. Nil fields are not applied;
// non-nil fields combine with AND.
type Filters struct {
	UserID     *string
	ResourceID *string
	Operation  *Operation
	// StartTime, when set, excludes records that occurred before it.
	StartTime *time.Time
	// EndTime, when set, excludes records that occurred after it.
	EndTime *time.Time
	// Page is the 1-indexed page to return. Values below 1 are treated
	// as 1.
	Page int
	// PageSize is the number of results per page. Values below 1 default
	// to 20; values above 100 are capped at 100.
	PageSize int
}

// Repository records and retrieves audit trail entries.
type Repository interface {
	// Insert appends r to the audit trail.
	Insert(ctx context.Context, r AuditRecord) error

	// List returns the audit records matching f, most recent first, along
	// with the total number of matches across all pages.
	List(ctx context.Context, f Filters) ([]AuditRecord, int, error)
}
