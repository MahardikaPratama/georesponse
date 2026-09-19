/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the Repository interface for recording and

	retrieving resource history, and the Type/History types used by
	GET /api/v1/resources/{id}/history's category filter and combined
	response shape.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resourcehistory

import "context"

// Type identifies one category of resource history.
type Type string

// History categories, matching the API's `type` query parameter values.
const (
	TypeStatus   Type = "status"
	TypeLocation Type = "location"
	TypeChange   Type = "change"
)

// History is the combined set of history records for one resource, split
// by category, as returned by GET /api/v1/resources/{id}/history.
type History struct {
	StatusHistory   []StatusHistory
	LocationHistory []LocationHistory
	ChangeHistory   []ResourceChangeHistory
}

// Repository records and retrieves resource history.
type Repository interface {
	// InsertStatusHistory records one status change (BR-008).
	InsertStatusHistory(ctx context.Context, h StatusHistory) error

	// InsertLocationHistory records one relocation (BR-014).
	InsertLocationHistory(ctx context.Context, h LocationHistory) error

	// InsertChangeHistory records one set of field-level changes.
	InsertChangeHistory(ctx context.Context, h ResourceChangeHistory) error

	// ListByResourceID returns the history for resourceID. When
	// filterType is nil, all three categories are returned, each
	// paginated independently by page/pageSize; when non-nil, only the
	// matching category is populated.
	ListByResourceID(ctx context.Context, resourceID string, filterType *Type, page, pageSize int) (History, error)
}
