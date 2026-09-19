/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the Repository interface for retrieving users and

	assigning their roles (PUT /api/v1/users/{id}/roles).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package auth

import "context"

// Repository retrieves Users, their credentials, and manages their role
// assignments.
type Repository interface {
	// GetByID returns the user with the given id, along with the names
	// of their currently assigned roles, or ErrNotFound if no user
	// exists with that id.
	GetByID(ctx context.Context, id string) (*User, error)

	// FindCredentialsByIdentifier returns the credentials for the user
	// identified by identifier (their id), or ErrNotFound if no such
	// user exists.
	FindCredentialsByIdentifier(ctx context.Context, identifier string) (*Credentials, error)

	// SetRoles replaces the full set of roles held by the user
	// identified by userID with roleNames (a full replace, not a merge,
	// per API_CONTRACT.md section 5.1). It returns ErrNotFound if the
	// user, or any of the given role names, do not exist.
	SetRoles(ctx context.Context, userID string, roleNames []string) error
}
