/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines Credentials, the authentication material looked up

	by Authenticate. It is deliberately separate from User (see
	user.go): credentials are never part of the general application
	data returned to API clients, only used internally to verify a
	login attempt.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package auth

// Credentials holds one user's password hash, keyed by the identifier
// used to look them up (their user id; the users table has no separate
// username/email column). It exists only for Authenticate's internal use.
type Credentials struct {
	UserID       string
	PasswordHash string
}
