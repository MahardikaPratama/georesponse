/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements resource.HistoryRecorder (used by

	resource.Service to record status/location/change history) and the
	GetResourceHistory use case (FR-034 through FR-037, UC-13).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resourcehistory

import (
	"context"
	"fmt"
	"time"

	"github.com/mahardika-pratama/georesponse-be/internal/platform/idgen"
	"github.com/mahardika-pratama/georesponse-be/internal/resource"
)

// ResourceReader checks that a resource exists, so GetResourceHistory can
// return resource.ErrNotFound for a resource that was never created (as
// opposed to one that exists but has no history yet). Implemented by
// resource.Service/Repository; declared narrowly here to avoid this
// package depending on the whole of resource.Service.
type ResourceReader interface {
	GetByID(ctx context.Context, id string) (*resource.Resource, error)
}

// Service implements resource.HistoryRecorder and the GetResourceHistory
// use case.
type Service struct {
	repo      Repository
	resources ResourceReader
}

// NewService constructs a Service.
func NewService(repo Repository, resources ResourceReader) *Service {
	return &Service{repo: repo, resources: resources}
}

// RecordStatusChange records one status change (BR-008). It implements
// resource.HistoryRecorder.
func (s *Service) RecordStatusChange(ctx context.Context, resourceID string, previous, newStatus resource.Status, changedBy *string) error {
	h := StatusHistory{
		ID:             idgen.New(),
		ResourceID:     resourceID,
		PreviousStatus: previous,
		NewStatus:      newStatus,
		ChangedAt:      time.Now().UTC(),
		ChangedBy:      changedBy,
	}
	if err := s.repo.InsertStatusHistory(ctx, h); err != nil {
		return fmt.Errorf("record status change for resource %q: %w", resourceID, err)
	}
	return nil
}

// RecordLocationChange records one relocation (BR-014). It implements
// resource.HistoryRecorder.
func (s *Service) RecordLocationChange(ctx context.Context, resourceID string, previous, newLocation resource.Location, changedBy *string) error {
	h := LocationHistory{
		ID:               idgen.New(),
		ResourceID:       resourceID,
		PreviousLocation: previous,
		NewLocation:      newLocation,
		ChangedAt:        time.Now().UTC(),
		ChangedBy:        changedBy,
	}
	if err := s.repo.InsertLocationHistory(ctx, h); err != nil {
		return fmt.Errorf("record location change for resource %q: %w", resourceID, err)
	}
	return nil
}

// RecordChange records one set of field-level changes. It implements
// resource.HistoryRecorder.
func (s *Service) RecordChange(ctx context.Context, resourceID string, changes []resource.FieldChange, changedBy *string) error {
	recorded := make([]ResourceChange, 0, len(changes))
	for _, c := range changes {
		recorded = append(recorded, ResourceChange{Field: c.Field, Before: c.Before, After: c.After})
	}

	h := ResourceChangeHistory{
		ID:         idgen.New(),
		ResourceID: resourceID,
		Changes:    recorded,
		ChangedAt:  time.Now().UTC(),
		ChangedBy:  changedBy,
	}
	if err := s.repo.InsertChangeHistory(ctx, h); err != nil {
		return fmt.Errorf("record change for resource %q: %w", resourceID, err)
	}
	return nil
}

// GetResourceHistory returns resourceID's history, split by category and
// optionally filtered to one category, or resource.ErrNotFound if the
// resource does not exist (FR-034 through FR-037, UC-13).
func (s *Service) GetResourceHistory(ctx context.Context, resourceID string, filterType *Type, page, pageSize int) (History, error) {
	if _, err := s.resources.GetByID(ctx, resourceID); err != nil {
		return History{}, fmt.Errorf("get history for resource %q: %w", resourceID, err)
	}
	return s.repo.ListByResourceID(ctx, resourceID, filterType, page, pageSize)
}
