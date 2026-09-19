/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements resource.Repository against PostgreSQL+PostGIS.

	PostGIS-specific SQL (ST_MakePoint, ST_X, ST_Y) is isolated to this
	file; every other layer works with resource.Location's plain
	latitude/longitude.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/mahardika-pratama/georesponse-be/internal/resource"
)

// ResourceRepository is the PostgreSQL/PostGIS implementation of
// resource.Repository.
type ResourceRepository struct {
	db db
}

// NewResourceRepository constructs a ResourceRepository backed by conn (a
// *pgxpool.Pool in production, or a pgx.Tx in tests).
func NewResourceRepository(conn db) *ResourceRepository {
	return &ResourceRepository{db: conn}
}

// selectResourceColumns projects a resources row into the columns
// scanResource expects, reconstructing plain latitude/longitude from the
// PostGIS geography column.
const selectResourceColumns = `
	id, name, type, status, attributes,
	ST_Y(location::geometry) AS latitude,
	ST_X(location::geometry) AS longitude
`

// scanResource reads one row produced by selectResourceColumns. It accepts
// pgx.Row so it works with both QueryRow's single-row result and each row
// of a Query's result set.
func scanResource(row pgx.Row) (*resource.Resource, error) {
	var (
		res         resource.Resource
		typ, status string
		attrs       []byte
	)

	if err := row.Scan(&res.ID, &res.Name, &typ, &status, &attrs, &res.Location.Latitude, &res.Location.Longitude); err != nil {
		return nil, err
	}

	res.Type = resource.Type(typ)
	res.Status = resource.Status(status)

	if len(attrs) > 0 {
		if err := json.Unmarshal(attrs, &res.Attributes); err != nil {
			return nil, fmt.Errorf("unmarshal attributes: %w", err)
		}
	}

	return &res, nil
}

// Create persists a new resource.
func (r *ResourceRepository) Create(ctx context.Context, res resource.Resource) error {
	attrs, err := json.Marshal(res.Attributes)
	if err != nil {
		return fmt.Errorf("create resource %q: marshal attributes: %w", res.ID, err)
	}

	const query = `
		INSERT INTO resources (id, name, type, status, attributes, location)
		VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography)
	`
	_, err = r.db.Exec(ctx, query,
		res.ID, res.Name, string(res.Type), string(res.Status), attrs,
		res.Location.Longitude, res.Location.Latitude,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == uniqueViolationCode {
			return fmt.Errorf("create resource %q: %w", res.ID, resource.ErrIDConflict)
		}
		return fmt.Errorf("create resource %q: %w", res.ID, err)
	}

	return nil
}

// GetByID returns the resource with the given id.
func (r *ResourceRepository) GetByID(ctx context.Context, id string) (*resource.Resource, error) {
	query := fmt.Sprintf("SELECT %s FROM resources WHERE id = $1", selectResourceColumns)

	res, err := scanResource(r.db.QueryRow(ctx, query, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("get resource %q: %w", id, resource.ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get resource %q: %w", id, err)
	}

	return res, nil
}

// List returns the resources matching f and the total count of matches.
func (r *ResourceRepository) List(ctx context.Context, f resource.Filters) ([]resource.Resource, int, error) {
	page, pageSize := normalizePage(f.Page, f.PageSize)

	var (
		conditions []string
		args       []any
	)

	if f.Search != nil && *f.Search != "" {
		args = append(args, "%"+*f.Search+"%")
		conditions = append(conditions, fmt.Sprintf("name ILIKE $%d", len(args)))
	}
	if f.Type != nil {
		args = append(args, string(*f.Type))
		conditions = append(conditions, fmt.Sprintf("type = $%d", len(args)))
	}
	if f.Status != nil {
		args = append(args, string(*f.Status))
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)))
	}

	where := whereClause(conditions)

	var total int
	countQuery := fmt.Sprintf("SELECT count(*) FROM resources %s", where)
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("list resources: count: %w", err)
	}

	limitArgs := append(append([]any{}, args...), pageSize, (page-1)*pageSize)
	listQuery := fmt.Sprintf(
		"SELECT %s FROM resources %s ORDER BY id LIMIT $%d OFFSET $%d",
		selectResourceColumns, where, len(limitArgs)-1, len(limitArgs),
	)

	rows, err := r.db.Query(ctx, listQuery, limitArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("list resources: %w", err)
	}
	defer rows.Close()

	var results []resource.Resource
	for rows.Next() {
		res, err := scanResource(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("list resources: scan: %w", err)
		}
		results = append(results, *res)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("list resources: %w", err)
	}

	return results, total, nil
}

// Update replaces the mutable fields of an existing resource.
func (r *ResourceRepository) Update(ctx context.Context, res resource.Resource) error {
	attrs, err := json.Marshal(res.Attributes)
	if err != nil {
		return fmt.Errorf("update resource %q: marshal attributes: %w", res.ID, err)
	}

	const query = `
		UPDATE resources
		SET name = $2, type = $3, status = $4, attributes = $5,
			location = ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography,
			updated_at = now()
		WHERE id = $1
	`
	tag, err := r.db.Exec(ctx, query,
		res.ID, res.Name, string(res.Type), string(res.Status), attrs,
		res.Location.Longitude, res.Location.Latitude,
	)
	if err != nil {
		return fmt.Errorf("update resource %q: %w", res.ID, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("update resource %q: %w", res.ID, resource.ErrNotFound)
	}

	return nil
}

// UpdateStatus changes only the status of the resource identified by id.
func (r *ResourceRepository) UpdateStatus(ctx context.Context, id string, status resource.Status) error {
	const query = `UPDATE resources SET status = $2, updated_at = now() WHERE id = $1`

	tag, err := r.db.Exec(ctx, query, id, string(status))
	if err != nil {
		return fmt.Errorf("update status of resource %q: %w", id, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("update status of resource %q: %w", id, resource.ErrNotFound)
	}

	return nil
}

// UpdateLocation changes only the location of the resource identified by
// id.
func (r *ResourceRepository) UpdateLocation(ctx context.Context, id string, location resource.Location) error {
	const query = `
		UPDATE resources
		SET location = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, updated_at = now()
		WHERE id = $1
	`

	tag, err := r.db.Exec(ctx, query, id, location.Longitude, location.Latitude)
	if err != nil {
		return fmt.Errorf("update location of resource %q: %w", id, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("update location of resource %q: %w", id, resource.ErrNotFound)
	}

	return nil
}

// Delete permanently removes the resource identified by id. Its status,
// location, and change history rows are retained: their resource_id
// foreign key is set to NULL rather than cascading (see migration 0006),
// matching audit_records' existing behavior and the "history remains
// available after deletion" requirement.
func (r *ResourceRepository) Delete(ctx context.Context, id string) error {
	const query = `DELETE FROM resources WHERE id = $1`

	tag, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete resource %q: %w", id, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("delete resource %q: %w", id, resource.ErrNotFound)
	}

	return nil
}

// normalizePage clamps page to at least 1 and pageSize to [1, 100],
// defaulting pageSize to 20 when unset (API_CONTRACT.md section 3).
func normalizePage(page, pageSize int) (int, int) {
	if page < 1 {
		page = 1
	}
	switch {
	case pageSize < 1:
		pageSize = 20
	case pageSize > 100:
		pageSize = 100
	}
	return page, pageSize
}

// whereClause joins conditions with AND into a SQL WHERE clause, or
// returns an empty string when there are no conditions.
func whereClause(conditions []string) string {
	if len(conditions) == 0 {
		return ""
	}
	return "WHERE " + strings.Join(conditions, " AND ")
}
