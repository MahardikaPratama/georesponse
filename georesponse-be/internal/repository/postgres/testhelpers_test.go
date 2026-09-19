/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Shared test helper for this package's integration tests:

	connects to the database named by DATABASE_URL, assumed already
	migrated (see scripts/database/migrate.sh/.ps1), and hands each
	test a transaction that is rolled back when the test ends, so
	these tests never modify the shared seed data.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// testTx returns a db bound to a fresh transaction, rolled back when the
// test ends. It skips the test when DATABASE_URL is not set, so `go test
// ./...` stays runnable without a live PostgreSQL+PostGIS instance.
func testTx(t *testing.T) db {
	t.Helper()

	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		t.Skip("DATABASE_URL not set; skipping PostgreSQL integration test")
	}

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, connString)
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	t.Cleanup(pool.Close)

	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("begin test transaction: %v", err)
	}
	t.Cleanup(func() {
		_ = tx.Rollback(context.Background())
	})

	return tx
}
