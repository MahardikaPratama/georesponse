/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the RoleRepository and PermissionRepository

	interfaces backing the /api/v1/roles and /api/v1/permissions
	endpoints (API_CONTRACT.md section 10).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package authorization

import "context"

// RoleRepository persists and retrieves Roles.
type RoleRepository interface {
	// List returns every role, each with its assigned permission codes.
	List(ctx context.Context) ([]Role, error)

	// GetByID returns the role with the given id, or ErrNotFound if none
	// exists.
	GetByID(ctx context.Context, id string) (*Role, error)

	// Create persists a new role. It returns ErrNameConflict if a role
	// with the same name already exists.
	Create(ctx context.Context, r Role) error

	// Update replaces the mutable fields of an existing role. It returns
	// ErrNotFound if no role exists with r.ID, or ErrNameConflict if the
	// new name collides with a different role.
	Update(ctx context.Context, r Role) error

	// Delete permanently removes the role identified by id. It returns
	// ErrNotFound if no role exists with that id.
	Delete(ctx context.Context, id string) error

	// SetPermissions replaces the full set of permissions granted by the
	// role identified by roleID with permissionCodes (a full replace, not
	// a merge). It returns ErrNotFound if the role, or any of the given
	// permission codes, do not exist.
	SetPermissions(ctx context.Context, roleID string, permissionCodes []string) error
}

// PermissionRepository retrieves Permissions. Permissions are seeded data,
// not user-manageable, so no write methods are defined.
type PermissionRepository interface {
	// List returns every defined permission.
	List(ctx context.Context) ([]Permission, error)
}
