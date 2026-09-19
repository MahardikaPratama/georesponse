/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements the "full replace" pattern shared by

	role-permission and user-role assignment: clear the join table for
	one owner, then re-insert one row per given value, all inside a
	single transaction so a partial assignment is never left visible.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"fmt"
)

// joinTableSpec describes one many-to-many join table to fully replace the
// rows for a single owner in.
type joinTableSpec struct {
	// JoinTable is the join table's name (e.g. "role_permissions").
	JoinTable string
	// OwnerColumn is the join table's column referencing the owner (e.g.
	// "role_id").
	OwnerColumn string
	// OwnerID is the owner's identifier whose rows are being replaced.
	OwnerID string
	// TargetColumn is the join table's column referencing the target
	// (e.g. "permission_id").
	TargetColumn string
	// TargetTable is the table holding the target rows (e.g.
	// "permissions").
	TargetTable string
	// TargetLookup is the column on TargetTable that Values are matched
	// against (e.g. "code" for permissions, "name" for roles) rather than
	// TargetTable's own id, since callers pass human-readable identifiers.
	TargetLookup string
	// Values are the target identifiers (matched via TargetLookup) that
	// should be associated with OwnerID after this call.
	Values []string
	// NotFoundErr builds the error returned when one of Values does not
	// match any row in TargetTable.
	NotFoundErr func(missing string) error
}

// replaceJoinTable deletes every existing row for spec.OwnerID in
// spec.JoinTable, then inserts one row per spec.Values, resolved against
// spec.TargetTable via spec.TargetLookup. The whole operation runs in one
// transaction, so a value that fails to resolve leaves the owner's
// previous assignments intact rather than partially replaced.
func replaceJoinTable(ctx context.Context, conn db, spec joinTableSpec) error {
	tx, err := conn.Begin(ctx)
	if err != nil {
		return fmt.Errorf("replace %s for %q: begin: %w", spec.JoinTable, spec.OwnerID, err)
	}
	defer tx.Rollback(ctx)

	deleteQuery := fmt.Sprintf("DELETE FROM %s WHERE %s = $1", spec.JoinTable, spec.OwnerColumn)
	if _, err := tx.Exec(ctx, deleteQuery, spec.OwnerID); err != nil {
		return fmt.Errorf("replace %s for %q: clear existing: %w", spec.JoinTable, spec.OwnerID, err)
	}

	insertQuery := fmt.Sprintf(
		"INSERT INTO %s (%s, %s) SELECT $1, id FROM %s WHERE %s = $2",
		spec.JoinTable, spec.OwnerColumn, spec.TargetColumn, spec.TargetTable, spec.TargetLookup,
	)
	for _, value := range spec.Values {
		tag, err := tx.Exec(ctx, insertQuery, spec.OwnerID, value)
		if err != nil {
			return fmt.Errorf("replace %s for %q: assign %q: %w", spec.JoinTable, spec.OwnerID, value, err)
		}
		if tag.RowsAffected() == 0 {
			return spec.NotFoundErr(value)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("replace %s for %q: commit: %w", spec.JoinTable, spec.OwnerID, err)
	}
	return nil
}
