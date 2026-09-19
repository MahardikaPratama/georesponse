/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Adds password_hash to users, resolving the credential

	storage gap that was deferred to "an implementation decision"
	without ever landing one: POST /api/v1/auth/login cannot verify
	credentials against a table with none. The `identifier` in the
	login request body is treated as the user's own id, since no
	separate username/email column exists.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/

ALTER TABLE users ADD COLUMN password_hash text NOT NULL DEFAULT '';
