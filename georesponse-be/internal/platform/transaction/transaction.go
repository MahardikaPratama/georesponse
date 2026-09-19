/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package transaction defines the Runner interface use cases

	depend on to make a sequence of repository writes atomic (e.g. a
	resource update plus its change-history and audit records), without
	the application/domain layers depending on any database driver
	type. The PostgreSQL implementation lives in
	internal/repository/postgres.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package transaction

import "context"

// Runner runs fn as a single atomic unit of work: every repository call
// made using the context passed to fn either all commit together, or all
// roll back if fn returns a non-nil error.
type Runner interface {
	WithinTx(ctx context.Context, fn func(ctx context.Context) error) error
}
