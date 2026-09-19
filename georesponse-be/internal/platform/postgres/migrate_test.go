/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-20
Description  : Tests for the start-up migration runner. ListMigrations is

	covered with a temporary directory (no database needed); Migrate is
	covered against a real PostgreSQL only when TEST_DATABASE_URL is set,
	and skipped otherwise, so the unit suite stays free of external
	services.

Changelog:
  - 1.0.0 (2026-09-20): Initial creation.
  - 1.0.1 (2026-09-20): Close the pool via t.Cleanup instead of defer, so
    the cleanup that restores schema_migrations still has a live pool;
    previously the test left its throwaway version row behind.
*/
package postgres

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func writeFile(t *testing.T, dir, name, content string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", name, err)
	}
}

func TestListMigrations_SortsUpFilesByVersionAndIgnoresOthers(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, dir, "0010_ten.up.sql", "select 10;")
	writeFile(t, dir, "0002_two.up.sql", "select 2;")
	writeFile(t, dir, "0002_two.down.sql", "select -2;")
	writeFile(t, dir, "README.md", "not a migration")
	writeFile(t, dir, "0001_one.up.sql", "select 1;")

	migrations, err := ListMigrations(dir)
	if err != nil {
		t.Fatalf("ListMigrations() error = %v", err)
	}

	gotVersions := make([]int64, 0, len(migrations))
	for _, m := range migrations {
		gotVersions = append(gotVersions, m.Version)
	}
	want := []int64{1, 2, 10}
	if len(gotVersions) != len(want) {
		t.Fatalf("versions = %v, want %v", gotVersions, want)
	}
	for i := range want {
		if gotVersions[i] != want[i] {
			t.Errorf("versions = %v, want %v", gotVersions, want)
			break
		}
	}
	if migrations[0].Name != "0001_one.up.sql" || migrations[0].Path != filepath.Join(dir, "0001_one.up.sql") {
		t.Errorf("first migration = %+v, want 0001_one.up.sql with its full path", migrations[0])
	}
}

func TestListMigrations_RejectsDuplicateVersions(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, dir, "0001_a.up.sql", "select 1;")
	writeFile(t, dir, "0001_b.up.sql", "select 1;")

	if _, err := ListMigrations(dir); err == nil {
		t.Fatalf("ListMigrations() error = nil, want duplicate-version error")
	}
}

func TestListMigrations_MissingDirectory(t *testing.T) {
	if _, err := ListMigrations(filepath.Join(t.TempDir(), "missing")); err == nil {
		t.Fatalf("ListMigrations() error = nil, want error for a missing directory")
	}
}

// TestMigrate_AppliesPendingAndIsIdempotent runs against a real database and
// needs TEST_DATABASE_URL. It creates and drops its own throwaway table and
// restores the schema_migrations row it found, so it can run against the
// local development database without leaving anything behind.
func TestMigrate_AppliesPendingAndIsIdempotent(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping database-backed migration test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := NewPool(ctx, databaseURL)
	if err != nil {
		t.Fatalf("NewPool() error = %v", err)
	}
	// Registered before the restore cleanup below so it runs after it
	// (cleanups run last-in, first-out); a defer would close the pool
	// before the cleanup could restore the bookkeeping row.
	t.Cleanup(pool.Close)

	// Remember the real bookkeeping row so we can put it back afterwards.
	var savedVersion int64
	var savedDirty bool
	hadRow := true
	if _, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (version bigint NOT NULL PRIMARY KEY, dirty boolean NOT NULL)`); err != nil {
		t.Fatalf("ensure schema_migrations: %v", err)
	}
	if err := pool.QueryRow(ctx, `SELECT version, dirty FROM schema_migrations LIMIT 1`).Scan(&savedVersion, &savedDirty); err != nil {
		hadRow = false
	}
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cleanupCancel()
		_, _ = pool.Exec(cleanupCtx, `DROP TABLE IF EXISTS migrate_test_probe`)
		_, _ = pool.Exec(cleanupCtx, `DELETE FROM schema_migrations`)
		if hadRow {
			_, _ = pool.Exec(cleanupCtx, `INSERT INTO schema_migrations (version, dirty) VALUES ($1, $2)`, savedVersion, savedDirty)
		}
	})

	// Pretend the database is at a very high version so the real
	// migrations in database/migrations are never re-applied here.
	base := savedVersion
	if base < 1_000_000 {
		base = 1_000_000
	}
	if _, err := pool.Exec(ctx, `DELETE FROM schema_migrations`); err != nil {
		t.Fatalf("reset schema_migrations: %v", err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO schema_migrations (version, dirty) VALUES ($1, false)`, base); err != nil {
		t.Fatalf("seed schema_migrations: %v", err)
	}

	dir := t.TempDir()
	writeFile(t, dir, fmt.Sprintf("%d_already_applied.up.sql", base), "SELECT 'must not run';")
	writeFile(t, dir, fmt.Sprintf("%d_create_probe.up.sql", base+1), "CREATE TABLE migrate_test_probe (id int PRIMARY KEY);")
	writeFile(t, dir, fmt.Sprintf("%d_insert_probe.up.sql", base+2), "INSERT INTO migrate_test_probe (id) VALUES (1);")

	applied, err := Migrate(ctx, pool, dir, nil)
	if err != nil {
		t.Fatalf("Migrate() error = %v", err)
	}
	if applied != 2 {
		t.Errorf("Migrate() applied = %d, want 2", applied)
	}

	var count int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM migrate_test_probe`).Scan(&count); err != nil {
		t.Fatalf("probe table not created: %v", err)
	}
	if count != 1 {
		t.Errorf("probe rows = %d, want 1", count)
	}

	var version int64
	if err := pool.QueryRow(ctx, `SELECT version FROM schema_migrations`).Scan(&version); err != nil {
		t.Fatalf("read version: %v", err)
	}
	if version != base+2 {
		t.Errorf("schema_migrations.version = %d, want %d", version, base+2)
	}

	// Second run: nothing pending.
	applied, err = Migrate(ctx, pool, dir, nil)
	if err != nil {
		t.Fatalf("second Migrate() error = %v", err)
	}
	if applied != 0 {
		t.Errorf("second Migrate() applied = %d, want 0", applied)
	}

	// A dirty row must stop the runner.
	if _, err := pool.Exec(ctx, `UPDATE schema_migrations SET dirty = true`); err != nil {
		t.Fatalf("mark dirty: %v", err)
	}
	if _, err := Migrate(ctx, pool, dir, nil); !errors.Is(err, ErrDirtyDatabase) {
		t.Errorf("Migrate() on dirty database error = %v, want ErrDirtyDatabase", err)
	}
}
