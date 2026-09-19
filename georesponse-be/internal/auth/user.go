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

// User is an account that can authenticate with GeoResponse and be
// assigned roles. RoleNames holds the names of the roles currently
// assigned to this user.
type User struct {
	ID        string
	Name      string
	RoleNames []string
}
