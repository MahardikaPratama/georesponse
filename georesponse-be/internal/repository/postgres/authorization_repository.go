/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements authorization.RoleRepository and

	authorization.PermissionRepository against PostgreSQL.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
)

// selectRoleColumns aggregates each role's granted permission codes into a
// single array column, so one row is returned per role regardless of how
// many permissions it has.
const selectRoleColumns = `
	r.id, r.name, COALESCE(array_agg(p.code) FILTER (WHERE p.code IS NOT NULL), '{}')
	FROM roles r
	LEFT JOIN role_permissions rp ON rp.role_id = r.id
	LEFT JOIN permissions p ON p.id = rp.permission_id
`

// RoleRepository is the PostgreSQL implementation of
// authorization.RoleRepository.
type RoleRepository struct {
	db db
}

// NewRoleRepository constructs a RoleRepository backed by conn (a
// *pgxpool.Pool in production, or a pgx.Tx in tests).
func NewRoleRepository(conn db) *RoleRepository {
	return &RoleRepository{db: conn}
}

// List returns every role, each with its assigned permission codes.
func (r *RoleRepository) List(ctx context.Context) ([]authorization.Role, error) {
	query := fmt.Sprintf("SELECT %s GROUP BY r.id, r.name ORDER BY r.id", selectRoleColumns)

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	defer rows.Close()

	var roles []authorization.Role
	for rows.Next() {
		var role authorization.Role
		if err := rows.Scan(&role.ID, &role.Name, &role.Permissions); err != nil {
			return nil, fmt.Errorf("list roles: scan: %w", err)
		}
		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	return roles, nil
}

// GetByID returns the role with the given id.
func (r *RoleRepository) GetByID(ctx context.Context, id string) (*authorization.Role, error) {
	query := fmt.Sprintf("SELECT %s WHERE r.id = $1 GROUP BY r.id, r.name", selectRoleColumns)

	var role authorization.Role
	err := r.db.QueryRow(ctx, query, id).Scan(&role.ID, &role.Name, &role.Permissions)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("get role %q: %w", id, authorization.ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get role %q: %w", id, err)
	}
	return &role, nil
}

// Create persists a new role (with no permissions assigned yet).
func (r *RoleRepository) Create(ctx context.Context, role authorization.Role) error {
	const query = `INSERT INTO roles (id, name) VALUES ($1, $2)`

	_, err := r.db.Exec(ctx, query, role.ID, role.Name)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == uniqueViolationCode {
			return fmt.Errorf("create role %q: %w", role.ID, authorization.ErrNameConflict)
		}
		return fmt.Errorf("create role %q: %w", role.ID, err)
	}
	return nil
}

// Update replaces the mutable fields (name) of an existing role.
func (r *RoleRepository) Update(ctx context.Context, role authorization.Role) error {
	const query = `UPDATE roles SET name = $2 WHERE id = $1`

	tag, err := r.db.Exec(ctx, query, role.ID, role.Name)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == uniqueViolationCode {
			return fmt.Errorf("update role %q: %w", role.ID, authorization.ErrNameConflict)
		}
		return fmt.Errorf("update role %q: %w", role.ID, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("update role %q: %w", role.ID, authorization.ErrNotFound)
	}
	return nil
}

// Delete permanently removes the role identified by id.
func (r *RoleRepository) Delete(ctx context.Context, id string) error {
	const query = `DELETE FROM roles WHERE id = $1`

	tag, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete role %q: %w", id, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("delete role %q: %w", id, authorization.ErrNotFound)
	}
	return nil
}

// SetPermissions replaces the full set of permissions granted by the role
// identified by roleID with permissionCodes.
func (r *RoleRepository) SetPermissions(ctx context.Context, roleID string, permissionCodes []string) error {
	return replaceJoinTable(ctx, r.db, joinTableSpec{
		JoinTable:    "role_permissions",
		OwnerColumn:  "role_id",
		OwnerID:      roleID,
		TargetColumn: "permission_id",
		TargetTable:  "permissions",
		TargetLookup: "code",
		Values:       permissionCodes,
		NotFoundErr: func(missing string) error {
			return fmt.Errorf("set permissions for role %q: permission %q: %w", roleID, missing, authorization.ErrNotFound)
		},
	})
}

// PermissionRepository is the PostgreSQL implementation of
// authorization.PermissionRepository.
type PermissionRepository struct {
	db db
}

// NewPermissionRepository constructs a PermissionRepository backed by conn
// (a *pgxpool.Pool in production, or a pgx.Tx in tests).
func NewPermissionRepository(conn db) *PermissionRepository {
	return &PermissionRepository{db: conn}
}

// List returns every defined permission.
func (r *PermissionRepository) List(ctx context.Context) ([]authorization.Permission, error) {
	const query = `SELECT id, code, name FROM permissions ORDER BY id`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list permissions: %w", err)
	}
	defer rows.Close()

	var perms []authorization.Permission
	for rows.Next() {
		var p authorization.Permission
		if err := rows.Scan(&p.ID, &p.Code, &p.Name); err != nil {
			return nil, fmt.Errorf("list permissions: scan: %w", err)
		}
		perms = append(perms, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list permissions: %w", err)
	}
	return perms, nil
}
