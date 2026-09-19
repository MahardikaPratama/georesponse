/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the User domain type. Authentication credentials

	(password hash, etc.) are deliberately not part of this type — they
	are not part of the general application data returned to clients,
	matching the users table schema (database/migrations/0002).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package auth

import "errors"

// Domain errors for authentication.
var (
	// ErrNotFound reports that no user exists with the given identifier.
	ErrNotFound = errors.New("auth: not found")
	// ErrInvalidCredentials reports that the submitted identifier/password
	// pair does not match any user (BR-024). It intentionally does not
	// distinguish "no such user" from "wrong password", so a caller
	// cannot use response differences to enumerate valid identifiers.
	ErrInvalidCredentials = errors.New("auth: invalid credentials")
)

// User is an account that can authenticate with GeoResponse and be
// assigned roles. RoleNames holds the names of the roles currently
// assigned to this user.
type User struct {
	ID        string
	Name      string
	RoleNames []string
}
