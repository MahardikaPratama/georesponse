/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements audit.Repository against PostgreSQL.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mahardika-pratama/georesponse-be/internal/audit"
)

// AuditRepository is the PostgreSQL implementation of audit.Repository.
type AuditRepository struct {
	db db
}

// NewAuditRepository constructs an AuditRepository backed by conn (a
// *pgxpool.Pool in production, or a pgx.Tx in tests).
func NewAuditRepository(conn db) *AuditRepository {
	return &AuditRepository{db: conn}
}

// Insert appends rec to the audit trail.
func (r *AuditRepository) Insert(ctx context.Context, rec audit.AuditRecord) error {
	details, err := json.Marshal(rec.Details)
	if err != nil {
		return fmt.Errorf("insert audit record %q: marshal details: %w", rec.ID, err)
	}

	const query = `
		INSERT INTO audit_records (id, operation, user_id, resource_id, occurred_at, details)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	if _, err := r.db.Exec(ctx, query, rec.ID, string(rec.Operation), rec.UserID, rec.ResourceID, rec.OccurredAt, details); err != nil {
		return fmt.Errorf("insert audit record %q: %w", rec.ID, err)
	}
	return nil
}

// List returns the audit records matching f, most recent first, and the
// total count of matches.
func (r *AuditRepository) List(ctx context.Context, f audit.Filters) ([]audit.AuditRecord, int, error) {
	page, pageSize := normalizePage(f.Page, f.PageSize)

	var (
		conditions []string
		args       []any
	)

	if f.UserID != nil {
		args = append(args, *f.UserID)
		conditions = append(conditions, fmt.Sprintf("user_id = $%d", len(args)))
	}
	if f.ResourceID != nil {
		args = append(args, *f.ResourceID)
		conditions = append(conditions, fmt.Sprintf("resource_id = $%d", len(args)))
	}
	if f.Operation != nil {
		args = append(args, string(*f.Operation))
		conditions = append(conditions, fmt.Sprintf("operation = $%d", len(args)))
	}
	if f.StartTime != nil {
		args = append(args, *f.StartTime)
		conditions = append(conditions, fmt.Sprintf("occurred_at >= $%d", len(args)))
	}
	if f.EndTime != nil {
		args = append(args, *f.EndTime)
		conditions = append(conditions, fmt.Sprintf("occurred_at <= $%d", len(args)))
	}

	where := whereClause(conditions)

	var total int
	countQuery := fmt.Sprintf("SELECT count(*) FROM audit_records %s", where)
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("list audit records: count: %w", err)
	}

	limitArgs := append(append([]any{}, args...), pageSize, (page-1)*pageSize)
	listQuery := fmt.Sprintf(`
		SELECT id, operation, user_id, resource_id, occurred_at, details
		FROM audit_records
		%s
		ORDER BY occurred_at DESC
		LIMIT $%d OFFSET $%d
	`, where, len(limitArgs)-1, len(limitArgs))

	rows, err := r.db.Query(ctx, listQuery, limitArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("list audit records: %w", err)
	}
	defer rows.Close()

	var results []audit.AuditRecord
	for rows.Next() {
		var rec audit.AuditRecord
		var op string
		var details []byte
		if err := rows.Scan(&rec.ID, &op, &rec.UserID, &rec.ResourceID, &rec.OccurredAt, &details); err != nil {
			return nil, 0, fmt.Errorf("list audit records: scan: %w", err)
		}
		rec.Operation = audit.Operation(op)
		if len(details) > 0 {
			if err := json.Unmarshal(details, &rec.Details); err != nil {
				return nil, 0, fmt.Errorf("list audit records: unmarshal details: %w", err)
			}
		}
		results = append(results, rec)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("list audit records: %w", err)
	}

	return results, total, nil
}
