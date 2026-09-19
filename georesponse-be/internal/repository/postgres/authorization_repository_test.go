/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Integration tests for RoleRepository and

	PermissionRepository against a real PostgreSQL instance.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"errors"
	"testing"

	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
)

func seedPermission(t *testing.T, tx db, id, code, name string) {
	t.Helper()
	if _, err := tx.Exec(context.Background(),
		"INSERT INTO permissions (id, code, name) VALUES ($1, $2, $3)", id, code, name); err != nil {
		t.Fatalf("seed permission %q: %v", code, err)
	}
}

func TestRoleRepository_CreateGetUpdateDelete(t *testing.T) {
	tx := testTx(t)
	repo := NewRoleRepository(tx)
	ctx := context.Background()

	role := authorization.Role{ID: "test-role-1", Name: "test-operator"}
	if err := repo.Create(ctx, role); err != nil {
		t.Fatalf("Create() = %v, want nil", err)
	}

	got, err := repo.GetByID(ctx, role.ID)
	if err != nil {
		t.Fatalf("GetByID() = %v, want nil", err)
	}
	if got.Name != role.Name || len(got.Permissions) != 0 {
		t.Fatalf("GetByID() = %+v, want Name=%q and no permissions", got, role.Name)
	}

	role.Name = "test-operator-renamed"
	if err := repo.Update(ctx, role); err != nil {
		t.Fatalf("Update() = %v, want nil", err)
	}
	got, err = repo.GetByID(ctx, role.ID)
	if err != nil {
		t.Fatalf("GetByID() after Update() = %v, want nil", err)
	}
	if got.Name != "test-operator-renamed" {
		t.Fatalf("Name = %q, want test-operator-renamed", got.Name)
	}

	if err := repo.Delete(ctx, role.ID); err != nil {
		t.Fatalf("Delete() = %v, want nil", err)
	}
	if _, err := repo.GetByID(ctx, role.ID); !errors.Is(err, authorization.ErrNotFound) {
		t.Fatalf("GetByID() after Delete() = %v, want ErrNotFound", err)
	}
}

func TestRoleRepository_Create_NameConflict(t *testing.T) {
	tx := testTx(t)
	repo := NewRoleRepository(tx)
	ctx := context.Background()

	if err := repo.Create(ctx, authorization.Role{ID: "test-role-a", Name: "test-duplicate-name"}); err != nil {
		t.Fatalf("first Create() = %v, want nil", err)
	}
	err := repo.Create(ctx, authorization.Role{ID: "test-role-b", Name: "test-duplicate-name"})
	if !errors.Is(err, authorization.ErrNameConflict) {
		t.Fatalf("second Create() = %v, want ErrNameConflict", err)
	}
}

func TestRoleRepository_SetPermissions(t *testing.T) {
	tx := testTx(t)
	roles := NewRoleRepository(tx)
	perms := NewPermissionRepository(tx)
	ctx := context.Background()

	seedPermission(t, tx, "test-perm-1", "test.resource.read", "Test Read")
	seedPermission(t, tx, "test-perm-2", "test.resource.write", "Test Write")

	list, err := perms.List(ctx)
	if err != nil {
		t.Fatalf("List() = %v, want nil", err)
	}
	if len(list) < 2 {
		t.Fatalf("List() = %+v, want at least the 2 seeded permissions", list)
	}

	role := authorization.Role{ID: "test-role-perms", Name: "test-role-with-perms"}
	if err := roles.Create(ctx, role); err != nil {
		t.Fatalf("Create() = %v, want nil", err)
	}

	if err := roles.SetPermissions(ctx, role.ID, []string{"test.resource.read", "test.resource.write"}); err != nil {
		t.Fatalf("SetPermissions() = %v, want nil", err)
	}

	got, err := roles.GetByID(ctx, role.ID)
	if err != nil {
		t.Fatalf("GetByID() = %v, want nil", err)
	}
	if len(got.Permissions) != 2 {
		t.Fatalf("Permissions = %v, want 2 entries", got.Permissions)
	}

	// A second call fully replaces, rather than merging with, the first.
	if err := roles.SetPermissions(ctx, role.ID, []string{"test.resource.read"}); err != nil {
		t.Fatalf("SetPermissions() (replace) = %v, want nil", err)
	}
	got, err = roles.GetByID(ctx, role.ID)
	if err != nil {
		t.Fatalf("GetByID() = %v, want nil", err)
	}
	if len(got.Permissions) != 1 || got.Permissions[0] != "test.resource.read" {
		t.Fatalf("Permissions after replace = %v, want only test.resource.read", got.Permissions)
	}
}

func TestRoleRepository_SetPermissions_UnknownCodeLeavesExistingIntact(t *testing.T) {
	tx := testTx(t)
	roles := NewRoleRepository(tx)
	ctx := context.Background()

	seedPermission(t, tx, "test-perm-3", "test.resource.delete", "Test Delete")

	role := authorization.Role{ID: "test-role-atomic", Name: "test-role-atomic"}
	if err := roles.Create(ctx, role); err != nil {
		t.Fatalf("Create() = %v, want nil", err)
	}
	if err := roles.SetPermissions(ctx, role.ID, []string{"test.resource.delete"}); err != nil {
		t.Fatalf("SetPermissions() = %v, want nil", err)
	}

	err := roles.SetPermissions(ctx, role.ID, []string{"test.does.not.exist"})
	if !errors.Is(err, authorization.ErrNotFound) {
		t.Fatalf("SetPermissions(unknown code) = %v, want ErrNotFound", err)
	}

	// The failed replace must not have partially applied (transactional).
	got, err := roles.GetByID(ctx, role.ID)
	if err != nil {
		t.Fatalf("GetByID() = %v, want nil", err)
	}
	if len(got.Permissions) != 1 || got.Permissions[0] != "test.resource.delete" {
		t.Fatalf("Permissions = %v, want unchanged [test.resource.delete]", got.Permissions)
	}
}
