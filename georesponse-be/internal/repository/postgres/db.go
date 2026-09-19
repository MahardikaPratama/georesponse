/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the minimal pgx surface every repository in this

	package needs. Both *pgxpool.Pool and pgx.Tx satisfy it, so a
	repository runs against a pooled connection in production and
	against a single transaction in tests (rolled back afterward,
	leaving seed data untouched).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// db is the subset of *pgxpool.Pool's (and pgx.Tx's) methods every
// repository in this package needs to execute queries and, where a
// multi-statement operation must be atomic, run it inside a transaction.
type db interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Begin(ctx context.Context) (pgx.Tx, error)
}

// uniqueViolationCode is the PostgreSQL SQLSTATE for a unique constraint
// violation (e.g. a duplicate primary key or UNIQUE column).
const uniqueViolationCode = "23505"
