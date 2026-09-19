/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements resourcehistory.Repository against PostgreSQL

	+PostGIS.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mahardika-pratama/georesponse-be/internal/resource"
	"github.com/mahardika-pratama/georesponse-be/internal/resourcehistory"
)

// ResourceHistoryRepository is the PostgreSQL/PostGIS implementation of
// resourcehistory.Repository.
type ResourceHistoryRepository struct {
	db db
}

// NewResourceHistoryRepository constructs a ResourceHistoryRepository
// backed by conn (a *pgxpool.Pool in production, or a pgx.Tx in tests).
func NewResourceHistoryRepository(conn db) *ResourceHistoryRepository {
	return &ResourceHistoryRepository{db: conn}
}

// InsertStatusHistory records one status change.
func (r *ResourceHistoryRepository) InsertStatusHistory(ctx context.Context, h resourcehistory.StatusHistory) error {
	const query = `
		INSERT INTO resource_status_history (id, resource_id, previous_status, new_status, changed_at, changed_by)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.Exec(ctx, query, h.ID, h.ResourceID, string(h.PreviousStatus), string(h.NewStatus), h.ChangedAt, h.ChangedBy)
	if err != nil {
		return fmt.Errorf("insert status history for resource %q: %w", h.ResourceID, err)
	}
	return nil
}

// InsertLocationHistory records one relocation.
func (r *ResourceHistoryRepository) InsertLocationHistory(ctx context.Context, h resourcehistory.LocationHistory) error {
	const query = `
		INSERT INTO resource_location_history (id, resource_id, previous_location, new_location, changed_at, changed_by)
		VALUES (
			$1, $2,
			ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
			ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
			$7, $8
		)
	`
	_, err := r.db.Exec(ctx, query,
		h.ID, h.ResourceID,
		h.PreviousLocation.Longitude, h.PreviousLocation.Latitude,
		h.NewLocation.Longitude, h.NewLocation.Latitude,
		h.ChangedAt, h.ChangedBy,
	)
	if err != nil {
		return fmt.Errorf("insert location history for resource %q: %w", h.ResourceID, err)
	}
	return nil
}

// InsertChangeHistory records one set of field-level changes.
func (r *ResourceHistoryRepository) InsertChangeHistory(ctx context.Context, h resourcehistory.ResourceChangeHistory) error {
	changes, err := json.Marshal(h.Changes)
	if err != nil {
		return fmt.Errorf("insert change history for resource %q: marshal changes: %w", h.ResourceID, err)
	}

	const query = `
		INSERT INTO resource_change_history (id, resource_id, changes, changed_at, changed_by)
		VALUES ($1, $2, $3, $4, $5)
	`
	if _, err := r.db.Exec(ctx, query, h.ID, h.ResourceID, changes, h.ChangedAt, h.ChangedBy); err != nil {
		return fmt.Errorf("insert change history for resource %q: %w", h.ResourceID, err)
	}
	return nil
}

// ListByResourceID returns the history for resourceID, split by category.
func (r *ResourceHistoryRepository) ListByResourceID(
	ctx context.Context,
	resourceID string,
	filterType *resourcehistory.Type,
	page, pageSize int,
) (resourcehistory.History, error) {
	page, pageSize = normalizePage(page, pageSize)
	limit, offset := pageSize, (page-1)*pageSize

	var result resourcehistory.History

	wantStatus := filterType == nil || *filterType == resourcehistory.TypeStatus
	wantLocation := filterType == nil || *filterType == resourcehistory.TypeLocation
	wantChange := filterType == nil || *filterType == resourcehistory.TypeChange

	if wantStatus {
		statusHistory, err := r.listStatusHistory(ctx, resourceID, limit, offset)
		if err != nil {
			return resourcehistory.History{}, err
		}
		result.StatusHistory = statusHistory
	}

	if wantLocation {
		locationHistory, err := r.listLocationHistory(ctx, resourceID, limit, offset)
		if err != nil {
			return resourcehistory.History{}, err
		}
		result.LocationHistory = locationHistory
	}

	if wantChange {
		changeHistory, err := r.listChangeHistory(ctx, resourceID, limit, offset)
		if err != nil {
			return resourcehistory.History{}, err
		}
		result.ChangeHistory = changeHistory
	}

	return result, nil
}

func (r *ResourceHistoryRepository) listStatusHistory(ctx context.Context, resourceID string, limit, offset int) ([]resourcehistory.StatusHistory, error) {
	const query = `
		SELECT id, resource_id, previous_status, new_status, changed_at, changed_by
		FROM resource_status_history
		WHERE resource_id = $1
		ORDER BY changed_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, resourceID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list status history for resource %q: %w", resourceID, err)
	}
	defer rows.Close()

	var results []resourcehistory.StatusHistory
	for rows.Next() {
		var h resourcehistory.StatusHistory
		var prev, next string
		if err := rows.Scan(&h.ID, &h.ResourceID, &prev, &next, &h.ChangedAt, &h.ChangedBy); err != nil {
			return nil, fmt.Errorf("list status history for resource %q: scan: %w", resourceID, err)
		}
		h.PreviousStatus, h.NewStatus = resource.Status(prev), resource.Status(next)
		results = append(results, h)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list status history for resource %q: %w", resourceID, err)
	}
	return results, nil
}

func (r *ResourceHistoryRepository) listLocationHistory(ctx context.Context, resourceID string, limit, offset int) ([]resourcehistory.LocationHistory, error) {
	const query = `
		SELECT id, resource_id,
			ST_Y(previous_location::geometry), ST_X(previous_location::geometry),
			ST_Y(new_location::geometry), ST_X(new_location::geometry),
			changed_at, changed_by
		FROM resource_location_history
		WHERE resource_id = $1
		ORDER BY changed_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, resourceID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list location history for resource %q: %w", resourceID, err)
	}
	defer rows.Close()

	var results []resourcehistory.LocationHistory
	for rows.Next() {
		var h resourcehistory.LocationHistory
		if err := rows.Scan(
			&h.ID, &h.ResourceID,
			&h.PreviousLocation.Latitude, &h.PreviousLocation.Longitude,
			&h.NewLocation.Latitude, &h.NewLocation.Longitude,
			&h.ChangedAt, &h.ChangedBy,
		); err != nil {
			return nil, fmt.Errorf("list location history for resource %q: scan: %w", resourceID, err)
		}
		results = append(results, h)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list location history for resource %q: %w", resourceID, err)
	}
	return results, nil
}

func (r *ResourceHistoryRepository) listChangeHistory(ctx context.Context, resourceID string, limit, offset int) ([]resourcehistory.ResourceChangeHistory, error) {
	const query = `
		SELECT id, resource_id, changes, changed_at, changed_by
		FROM resource_change_history
		WHERE resource_id = $1
		ORDER BY changed_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, resourceID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list change history for resource %q: %w", resourceID, err)
	}
	defer rows.Close()

	var results []resourcehistory.ResourceChangeHistory
	for rows.Next() {
		var h resourcehistory.ResourceChangeHistory
		var changes []byte
		if err := rows.Scan(&h.ID, &h.ResourceID, &changes, &h.ChangedAt, &h.ChangedBy); err != nil {
			return nil, fmt.Errorf("list change history for resource %q: scan: %w", resourceID, err)
		}
		if len(changes) > 0 {
			if err := json.Unmarshal(changes, &h.Changes); err != nil {
				return nil, fmt.Errorf("list change history for resource %q: unmarshal changes: %w", resourceID, err)
			}
		}
		results = append(results, h)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list change history for resource %q: %w", resourceID, err)
	}
	return results, nil
}
