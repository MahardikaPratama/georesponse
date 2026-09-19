/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the Role and Permission domain types backing

	role-based authorization (FR-030 through FR-033).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package authorization

import "errors"

// Domain errors for Role and Permission lookups.
var (
	// ErrNotFound reports that no role or permission exists with the
	// given identifier.
	ErrNotFound = errors.New("authorization: not found")
	// ErrNameConflict reports that a role already exists with the given
	// name (roles.name is unique).
	ErrNameConflict = errors.New("authorization: role name already in use")
)

// Permission is a single grantable capability, identified by a dotted
// code such as "resource.update".
type Permission struct {
	ID   string
	Code string
	Name string
}

// Role groups a named set of permission codes that can be assigned to
// users.
type Role struct {
	ID          string
	Name        string
	Permissions []string
}
