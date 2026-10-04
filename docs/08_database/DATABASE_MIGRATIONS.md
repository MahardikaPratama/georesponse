# Database Migrations

## 1. Purpose

This document defines how the GeoResponse schema changes over time: the
migration strategy, file layout, the three mechanisms that apply
migrations, the rules that keep the history trustworthy, and seed data.

The target schema is in [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md); backup,
restore, and other operations are in
[`DATABASE_OPERATIONS.md`](DATABASE_OPERATIONS.md). The scripts in
`scripts/database/` implement the behavior described in section 4.

---

## 2. Strategy

GeoResponse uses versioned, incremental, plain-SQL migrations. There is no
ORM-driven auto-migration and no runtime schema diffing.

- Plain SQL is reviewable by any contributor without learning an ORM's
  migration DSL.
- PostGIS DDL (`geography(Point, 4326)`, `GIST` indexes) is easiest to
  write directly in SQL.
- A numbered up/down SQL file pair per change is enough for the project's
  scope (`TECHNOLOGY_SELECTION.md` section 3.6, avoid premature
  infrastructure).

Each migration is a forward step (`up`) with a matching reverse step
(`down`), stored as a pair of files.

---

## 3. File Layout

Migrations live in `database/migrations/` (seven pairs, `0001` to `0007`).
Seed data is kept separate, in `database/seeds/` (section 7).

```text
database/migrations/
  0001_create_resources.up.sql
  0001_create_resources.down.sql
  0002_create_auth_tables.up.sql
  0002_create_auth_tables.down.sql
  0003_create_history_tables.up.sql
  0003_create_history_tables.down.sql
  0004_create_audit_records.up.sql
  0004_create_audit_records.down.sql
  0005_add_indexes.up.sql
  0005_add_indexes.down.sql
  0006_relax_history_resource_id_cascade.up.sql
  0006_relax_history_resource_id_cascade.down.sql
  0007_add_user_password_hash.up.sql
  0007_add_user_password_hash.down.sql
```

Filename rules:

- `NNNN` is a strictly increasing, zero-padded, four-digit sequence number
  assigned in commit order. Numbers are never reused or reordered.
- The suffix is short and describes the change (`create_resources`,
  `add_indexes`), not a ticket number or author.
- Every file starts with the standard SQL comment header from
  `CODING_STANDARDS.md` section 3.
- `.up.sql` applies the change; `.down.sql` reverses exactly that change.

Example pair for `0001` (headers omitted; the full columns, `CHECK`
constraints, and indexes are in `DATABASE_SCHEMA.md` section 5):

```sql
-- 0001_create_resources.up.sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS resources (
    -- columns and CHECK constraints: DATABASE_SCHEMA.md §5
);

CREATE INDEX IF NOT EXISTS idx_resources_type ON resources (type);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources (status);
CREATE INDEX IF NOT EXISTS idx_resources_location ON resources USING GIST (location);
```

```sql
-- 0001_create_resources.down.sql
DROP TABLE IF EXISTS resources;
-- The postgis extension is intentionally not dropped here: other
-- migrations/tables may depend on it, and dropping an extension is a
-- database-wide, not migration-scoped, decision.
```

---

## 4. Applying Migrations

Three mechanisms apply the same files and share one bookkeeping table
(section 4.4), so they can be mixed freely against one database. Nobody
runs `psql -f` against a migration file by hand.

| Mechanism | When it runs | Applies seeds |
|---|---|---|
| CLI scripts (`scripts/database/`) | On demand; the path for non-development environments | Separate `seed` script |
| Backend start-up runner | Every backend start with `APP_ENV=development` | No |
| Docker first-run init hook | Once, when the `georesponse-db` volume is brand new | Yes |

### 4.1 CLI Scripts

| Script | Platform | Purpose |
|---|---|---|
| `scripts/database/migrate.sh` | bash (Linux/macOS/CI) | Apply all pending `up` migrations in order |
| `scripts/database/migrate.ps1` | PowerShell (Windows) | Apply all pending `up` migrations in order |
| `scripts/database/rollback.sh [N]` | bash | Revert the `N` most recent migrations using their `down` files (`N` defaults to 1) |
| `scripts/database/rollback.ps1 [N]` | PowerShell | Revert the `N` most recent migrations using their `down` files (`N` defaults to 1) |
| `scripts/database/seed.sh` | bash | Load seed data after migrations have been applied |
| `scripts/database/seed.ps1` | PowerShell | Load seed data after migrations have been applied |

Every operation has a bash and a PowerShell variant, so the workflow does
not depend on WSL or Git Bash on Windows. Each script reads the target
database from `DATABASE_URL`
(`postgres://user:password@host:5432/dbname?sslmode=disable`) and exits
non-zero with a hint if `DATABASE_URL` is unset or if `migrate` (or `psql`,
for seeding) is not on `PATH`.

`migrate` and `rollback` delegate to the golang-migrate CLI
(`migrate -path database/migrations -database "$DATABASE_URL" up` /
`down N`), installed with
`go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest`.

- **migrate** applies pending `up` files in ascending order, updates the
  bookkeeping row after each one, and stops with a non-zero exit on the
  first failure. A failed file leaves the row marked `dirty`.
- **rollback** runs the `down` file of the current version, newest first,
  `N` times, and moves the bookkeeping row to the previous version (or
  removes it after rolling back `0001`).

`CREATE INDEX CONCURRENTLY` cannot run inside a transaction. No migration
uses it, and the project's data volume does not call for it.

### 4.2 Backend Start-Up Runner

When `APP_ENV=development`, `cmd/api/main.go` calls
`internal/platform/postgres.Migrate` after connecting to the database and
before binding the HTTP port. The runner:

1. reads every `NNNN_*.up.sql` file from `MIGRATIONS_DIR` (default
   `../database/migrations`, relative to `georesponse-be/` when run with
   `go run`; the compose file sets `/migrations` and bind-mounts
   `database/migrations` there read-only), sorted by version, and fails on
   two files with the same version;
2. creates `schema_migrations` if it does not exist;
3. refuses to start (`ErrDirtyDatabase`) if the bookkeeping row is
   `dirty`, so a failed earlier run is repaired by hand instead of guessed
   at;
4. applies each file newer than the recorded version in its own
   transaction, together with the version update, so a failure leaves
   neither a half-applied file nor a stale version;
5. logs each applied file, and exits the process if any step fails.

With `APP_ENV=development`, configuration loading also fails at start-up if
`MIGRATIONS_DIR` is not a readable directory. This runner is what lets
`./run.sh` or `docker compose up` bring up a migrated stack without a
separate migration step. It is limited to development: for other
environments, `DEPLOYMENT.md` keeps migration as an explicit step before
the new backend starts, since applying migrations on every process start is
not a safe default for a database with real data.

### 4.3 Docker First-Run Init Hook

`docker/postgres/init/01-init-schema-and-seeds.sh` is mounted into the
`postgis/postgis` image's `/docker-entrypoint-initdb.d`, which the image
runs only when the data volume is brand new. The compose file also mounts
`database/migrations` and `database/seeds` read-only at
`/georesponse/migrations` and `/georesponse/seeds`. The script:

1. applies every `*.up.sql` in ascending order with
   `psql -v ON_ERROR_STOP=1`;
2. writes the highest version to `schema_migrations` (`dirty = false`);
3. loads every `database/seeds/*.sql` in name order.

On later starts (an existing volume) the hook does not run, and the
backend start-up runner applies any newer migrations. The migration
directories are not mounted into `docker-entrypoint-initdb.d` directly,
because the entrypoint only runs top-level files there and would also try
to run the `.down.sql` files.

### 4.4 Bookkeeping Table

All three mechanisms use golang-migrate's table:

```sql
schema_migrations(version bigint NOT NULL PRIMARY KEY, dirty boolean NOT NULL)
```

It holds a single row: the current version and whether the last run failed
part-way. It is not application data.

---

## 5. Rules

### 5.1 One Logical Change Per Migration

A migration does one coherent thing: create one table and its indexes, add
one column, or introduce one constraint. Unrelated changes (for example
"create `audit_records`" and "add an index to `resources`") go in separate
files, even in the same pull request, so each migration is reviewable and
revertible on its own.

### 5.2 Merged Migrations Are Never Edited

Once a migration is merged to `main`, it is never edited, renamed, or
deleted. If it turns out to be wrong, a new migration (`000N+1_fix_...`)
corrects the schema going forward, because other environments may already
have applied the original. Migration `0006` is an example: it relaxes
foreign keys created by `0003` instead of editing `0003`.

The `down` files exist so a developer or CI job can roll back an unmerged,
locally applied change, not to rewrite shared history.

### 5.3 Migrations Are Reviewed Like Code

A migration is reviewed in the same pull request as the code that depends
on it: correct DDL, index coverage, naming consistent with
`DATABASE_SCHEMA.md`, and a working `down.sql`.

### 5.4 No Application Logic in Migrations

Migrations contain schema DDL and, where a schema change requires it, a
minimal one-time backfill (for example, populating a new `NOT NULL` column
before adding the constraint). Demo and test data belong in seeds
(section 7).

### 5.5 Idempotent Object Creation

Statements that may run against a database where the object already exists
use `IF NOT EXISTS` / `IF EXISTS` guards (section 3), so re-running against
a partially provisioned database does not fail on the first line.

---

## 6. Migration Order

```text
0001  enable postgis, create resources (+ type/status/GIST indexes)
0002  create users, roles, permissions, role_permissions, user_roles
      (+ join-table indexes)
0003  create resource_status_history, resource_location_history,
      resource_change_history (+ resource_id indexes)
0004  create audit_records (+ resource_id/user_id/occurred_at indexes)
0005  no-op: every index was already created inline with its table in
      0001-0004; the number is reserved rather than duplicated
0006  relax the three history tables' resource_id from NOT NULL /
      ON DELETE CASCADE to nullable / ON DELETE SET NULL
0007  add users.password_hash (text NOT NULL DEFAULT '')
```

New migrations append to this sequence and never renumber it.

---

## 7. Seed Data

Seed data (sample resources, demo users, roles, and permissions) lives in
`database/seeds/` and is loaded in name order:

- `0001_sample_resources.sql`
- `0002_sample_auth.sql`
- `0003_sample_auth_coordinator.sql`

`scripts/database/seed.sh` / `seed.ps1` load them with `psql` against
`DATABASE_URL`. On a brand-new Docker volume the init hook loads them
automatically after the migrations (section 4.3). The demo accounts are
listed in the root `README.md`.

Seeds are kept out of the migration files because seed data is
environment-specific (local development wants demo data; another
environment might not), while migrations must be identical everywhere, and
seeds may need to be re-run or reset independently of the schema version.

Every seed `INSERT` uses `ON CONFLICT ... DO NOTHING`, so running the seed
scripts again against an already-seeded database is safe and leaves
existing rows unchanged.
