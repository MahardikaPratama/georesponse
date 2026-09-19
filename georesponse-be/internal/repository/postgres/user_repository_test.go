/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Integration tests for UserRepository against a real

	PostgreSQL instance.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"errors"
	"testing"

	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
)

func TestUserRepository_GetByID_NotFound(t *testing.T) {
	repo := NewUserRepository(testTx(t))

	_, err := repo.GetByID(context.Background(), "does-not-exist")
	if !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("GetByID() = %v, want ErrNotFound", err)
	}
}

func TestUserRepository_GetByIDAndSetRoles(t *testing.T) {
	tx := testTx(t)
	users := NewUserRepository(tx)
	roles := NewRoleRepository(tx)
	ctx := context.Background()

	userID := "test-user-1"
	if _, err := tx.Exec(ctx, "INSERT INTO users (id, name) VALUES ($1, $2)", userID, "Test Operator"); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	got, err := users.GetByID(ctx, userID)
	if err != nil {
		t.Fatalf("GetByID() = %v, want nil", err)
	}
	if got.Name != "Test Operator" || len(got.RoleNames) != 0 {
		t.Fatalf("GetByID() = %+v, want Name=Test Operator and no roles", got)
	}

	if err := roles.Create(ctx, authorization.Role{ID: "test-user-role", Name: "test-user-role-name"}); err != nil {
		t.Fatalf("seed role: %v", err)
	}

	if err := users.SetRoles(ctx, userID, []string{"test-user-role-name"}); err != nil {
		t.Fatalf("SetRoles() = %v, want nil", err)
	}

	got, err = users.GetByID(ctx, userID)
	if err != nil {
		t.Fatalf("GetByID() after SetRoles() = %v, want nil", err)
	}
	if len(got.RoleNames) != 1 || got.RoleNames[0] != "test-user-role-name" {
		t.Fatalf("RoleNames = %v, want [test-user-role-name]", got.RoleNames)
	}
}

func TestUserRepository_SetRoles_UnknownRole(t *testing.T) {
	tx := testTx(t)
	users := NewUserRepository(tx)
	ctx := context.Background()

	userID := "test-user-unknown-role"
	if _, err := tx.Exec(ctx, "INSERT INTO users (id, name) VALUES ($1, $2)", userID, "Test User"); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	err := users.SetRoles(ctx, userID, []string{"does-not-exist"})
	if !errors.Is(err, authorization.ErrNotFound) {
		t.Fatalf("SetRoles(unknown role) = %v, want ErrNotFound", err)
	}
}
