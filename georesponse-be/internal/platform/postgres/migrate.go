/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-20
Description  : Applies pending plain-SQL "up" migrations from a directory

	at process start-up, in ascending version order, using the same
	single-row bookkeeping table (schema_migrations(version bigint,
	dirty boolean)) the golang-migrate CLI behind
	scripts/database/migrate.sh maintains, so the two mechanisms can be
	used interchangeably against one database. Used by cmd/api/main.go
	when Config.AutoMigrate is set (APP_ENV=development).

Changelog:
  - 1.0.0 (2026-09-20): Initial creation.
*/
package postgres

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrDirtyDatabase reports that a previous migration run (by this package
// or the golang-migrate CLI) failed part-way and left the bookkeeping table
// flagged dirty. It must be repaired by hand
// before any further migration is applied automatically.
var ErrDirtyDatabase = errors.New("postgres: database is in a dirty migration state; repair it manually before starting")

// upMigrationPattern matches "NNNN_description.up.sql" file names as
// laid out in database/migrations.
var upMigrationPattern = regexp.MustCompile(`^(\d+)_.+\.up\.sql$`)

// Migration is one pending forward migration file.
type Migration struct {
	// Version is the numeric prefix of the file name (e.g. 7 for
	// 0007_add_user_password_hash.up.sql).
	Version int64

	// Name is the file's base name, used for logging.
	Name string

	// Path is the absolute or directory-relative path to the SQL file.
	Path string
}

// ListMigrations returns every "up" migration in dir, sorted by ascending
// version. It fails if the directory cannot be read or contains two files
// with the same version.
func ListMigrations(dir string) ([]Migration, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("postgres: read migrations directory %q: %w", dir, err)
	}

	seen := make(map[int64]string)
	migrations := make([]Migration, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		m := upMigrationPattern.FindStringSubmatch(entry.Name())
		if m == nil {
			continue
		}
		version, err := strconv.ParseInt(m[1], 10, 64)
		if err != nil {
			return nil, fmt.Errorf("postgres: migration %q has a non-numeric version: %w", entry.Name(), err)
		}
		if other, dup := seen[version]; dup {
			return nil, fmt.Errorf("postgres: migrations %q and %q share version %d", other, entry.Name(), version)
		}
		seen[version] = entry.Name()
		migrations = append(migrations, Migration{
			Version: version,
			Name:    entry.Name(),
			Path:    filepath.Join(dir, entry.Name()),
		})
	}

	sort.Slice(migrations, func(i, j int) bool { return migrations[i].Version < migrations[j].Version })
	return migrations, nil
}

// Migrate applies every migration in dir whose version is greater than the
// database's current schema version, each inside its own transaction, and
// records the new version after each one. It returns the number of
// migrations applied.
//
// The bookkeeping table is golang-migrate's: a single row holding the
// current version and a dirty flag. If the row is dirty, Migrate refuses
// to run (ErrDirtyDatabase) rather than guess at the schema's state.
func Migrate(ctx context.Context, pool *pgxpool.Pool, dir string, logger *slog.Logger) (int, error) {
	if logger == nil {
		logger = slog.Default()
	}

	migrations, err := ListMigrations(dir)
	if err != nil {
		return 0, err
	}

	if _, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (version bigint NOT NULL PRIMARY KEY, dirty boolean NOT NULL)`); err != nil {
		return 0, fmt.Errorf("postgres: ensure schema_migrations table: %w", err)
	}

	current, dirty, err := currentVersion(ctx, pool)
	if err != nil {
		return 0, err
	}
	if dirty {
		return 0, fmt.Errorf("%w (version %d)", ErrDirtyDatabase, current)
	}

	applied := 0
	for _, m := range migrations {
		if m.Version <= current {
			continue
		}
		if err := applyOne(ctx, pool, m); err != nil {
			return applied, err
		}
		logger.Info("applied migration", slog.String("file", m.Name), slog.Int64("version", m.Version))
		applied++
	}

	return applied, nil
}

// currentVersion reads the single bookkeeping row. A missing row means no
// migration has been applied yet (version 0).
func currentVersion(ctx context.Context, pool *pgxpool.Pool) (int64, bool, error) {
	var version int64
	var dirty bool
	err := pool.QueryRow(ctx, `SELECT version, dirty FROM schema_migrations LIMIT 1`).Scan(&version, &dirty)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, fmt.Errorf("postgres: read schema_migrations: %w", err)
	}
	return version, dirty, nil
}

// applyOne runs a single migration file and updates the bookkeeping row in
// the same transaction, so a failure leaves neither a half-applied schema
// nor a stale version marker.
func applyOne(ctx context.Context, pool *pgxpool.Pool, m Migration) error {
	sqlBytes, err := os.ReadFile(m.Path)
	if err != nil {
		return fmt.Errorf("postgres: read migration %q: %w", m.Name, err)
	}
	if strings.TrimSpace(string(sqlBytes)) == "" {
		return fmt.Errorf("postgres: migration %q is empty", m.Name)
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("postgres: begin migration %q: %w", m.Name, err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
		return fmt.Errorf("postgres: apply migration %q: %w", m.Name, err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM schema_migrations`); err != nil {
		return fmt.Errorf("postgres: clear schema_migrations after %q: %w", m.Name, err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version, dirty) VALUES ($1, false)`, m.Version); err != nil {
		return fmt.Errorf("postgres: record migration %q: %w", m.Name, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("postgres: commit migration %q: %w", m.Name, err)
	}
	return nil
}
