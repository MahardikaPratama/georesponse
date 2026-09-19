/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements transaction.Runner against PostgreSQL, so a use

	case can make a sequence of repository writes atomic without the
	application layer depending on pgx directly.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Transactor is the PostgreSQL implementation of transaction.Runner.
type Transactor struct {
	pool *pgxpool.Pool
}

// NewTransactor constructs a Transactor backed by pool.
func NewTransactor(pool *pgxpool.Pool) *Transactor {
	return &Transactor{pool: pool}
}

// WithinTx begins a transaction, runs fn with a context carrying it (so
// every repository call made through that context joins the same
// transaction), and commits if fn returns nil or rolls back otherwise.
func (t *Transactor) WithinTx(ctx context.Context, fn func(ctx context.Context) error) error {
	tx, err := t.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := fn(WithTx(ctx, tx)); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}
