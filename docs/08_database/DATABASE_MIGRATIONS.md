# Database Migrations

## 1. Purpose

This document defines how the GeoResponse database schema is changed over
time: the migration strategy, file layout, execution tooling, and the rules
that keep the migration history trustworthy.

It does not define the target schema itself (see `DATABASE_SCHEMA.md`) or
operational concerns such as backup and restore (see
`DATABASE_OPERATIONS.md`).

---

## 2. Strategy

GeoResponse uses **versioned, incremental, plain-SQL migrations** — no
ORM-driven auto-migration and no "diff the schema at runtime" tooling.

Reasoning, consistent with `TECHNOLOGY_SELECTION.md` section 3.6 (avoid
premature infrastructure) and section 3.3 (maintainability):

- Plain SQL is reviewable by any contributor without needing to understand an
  ORM's migration DSL.
- PostGIS-specific DDL (`geography(Point, 4326)`, `GIST` indexes) is easiest
  to express directly in SQL.
- The take-home scope does not justify a heavier migration framework; a
  numbered up/down SQL file pair per change is sufficient and unambiguous.

Each migration is a **forward step (`up`)** with a corresponding **reverse
step (`down`)**, stored as a pair of files.

---

## 3. File Layout

Migrations live in `database/migrations/` (seven pairs at the time of
writing, `0001`–`0007`). Seed data is deliberately kept **separate** from
schema migrations, in `database/seeds/` (see section 7).

Naming convention:

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

Rules for the filename:

- `NNNN` is a strictly increasing, zero-padded, four-digit sequence number,
  assigned in commit order. Sequence numbers are never reused or reordered.
- The descriptive suffix is short and states the change (`create_resources`,
  `add_indexes`), not the ticket number or author.
- Every file starts with the standard SQL comment header (author, version,
  created date, description, changelog) required by `CODING_STANDARDS.md`.
- `.up.sql` applies the change; `.down.sql` reverses exactly that change and
  nothing else.

Example pair for migration `0001` (file headers omitted; the full column,
`CHECK`, and index definitions are in `DATABASE_SCHEMA.md` section 5 and
are not repeated here):

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

## 4. Execution Tooling

Migrations are run through the scripts in `scripts/database/`, which are the
single entry point for both local development and CI — nobody runs
`psql -f` against a migration file by hand.

| Script | Platform | Purpose |
|---|---|---|
| `scripts/database/migrate.sh` | bash (Linux/macOS/CI) | Apply all pending `up` migrations in order |
| `scripts/database/migrate.ps1` | PowerShell (Windows) | Apply all pending `up` migrations in order |
| `scripts/database/rollback.sh [N]` | bash | Revert the most recently applied migration(s) using their `down` files (`N` defaults to 1) |
| `scripts/database/rollback.ps1 [N]` | PowerShell | Revert the most recently applied migration(s) using their `down` files (`N` defaults to 1) |
| `scripts/database/seed.sh` | bash | Load seed data after migrations have been applied |
| `scripts/database/seed.ps1` | PowerShell | Load seed data after migrations have been applied |

Both a bash and a PowerShell variant are provided for every operation so
the same workflow works whether a contributor develops on Windows or a
Unix-like shell, without relying on WSL or Git Bash being present. Every
script reads the target database from the `DATABASE_URL` environment
variable (`postgres://user:password@host:5432/dbname?sslmode=disable`)
and exits non-zero with an install hint if `migrate` (or `psql`, for
seeding) is not on `PATH`.

The scripts delegate to the golang-migrate CLI (`migrate`, installed with
`go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest`), so
the bookkeeping table is golang-migrate's: a single row
`schema_migrations(version bigint primary key, dirty boolean)` holding the
**current** version and whether the last run failed part-way. Two other
mechanisms write the same table and are therefore interchangeable with the
scripts against one database:

- the backend's start-up runner (`georesponse-be/internal/platform/postgres`
  `Migrate`), which applies pending `up` files from `MIGRATIONS_DIR`
  (default `../database/migrations`, relative to `georesponse-be/`; the
  compose file mounts the directory at `/migrations`) automatically when
  `APP_ENV=development` (`docs/11_devops/DOCKER_COMPOSE.md` section 6.5),
  applying each file and its version bump in one transaction, and
  refusing to start on a `dirty` row;
- the first-run initialization hook
  `docker/postgres/init/01-init-schema-and-seeds.sh`, which the
  `postgis/postgis` image runs once on a brand-new Docker volume: it
  applies every `up` file with `psql`, writes the highest version to
  `schema_migrations`, then loads every `database/seeds/*.sql`.

Expected behavior of `migrate.sh` / `migrate.ps1`:

1. Read the database connection string from environment configuration (not
   hard-coded).
2. Track applied migrations in the bookkeeping table above, so the script
   can determine which `NNNN_*.up.sql` files have not yet run.
3. Apply pending `up` migrations in ascending numeric order, each inside its
   own transaction where the statement supports it (note: `CREATE INDEX
   CONCURRENTLY` cannot run inside a transaction — such migrations are
   written and applied accordingly, and are not expected in this take-home's
   scope given its data volume).
4. After each successfully applied migration, set the single
   `schema_migrations` row to that migration's version.
5. Stop and exit non-zero on the first failure, leaving the database at the
   last successfully applied migration.

Expected behavior of `rollback.sh` / `rollback.ps1`:

1. Determine the current version from `schema_migrations`.
2. Run that migration's `.down.sql` file (repeated `N` times for `N` steps,
   newest first).
3. Set the `schema_migrations` row to the previous version (or delete it
   when rolling back `0001`).

The scripts implement this contract; this document remains the
specification they must satisfy.

---

## 5. Rules

### 5.1 One Logical Change Per Migration

A migration does one coherent thing — create one table and its immediate
indexes, add one column, introduce one constraint. Unrelated changes (e.g.
"create `audit_records`" and "add an index to `resources`") belong in
separate migration files, even if they land in the same pull request. This
keeps each migration reviewable and independently revertible.

### 5.2 Migrations Are Forward-Only in Version-Control History

Once a migration has been merged to `main`, it is never edited, renamed, or
deleted, even though a `.down.sql` file exists for runtime rollback. If a
merged migration turns out to be wrong, the fix is a **new** migration
(`000N+1_fix_...`) that corrects the schema going forward. This is the same
principle as never `git commit --amend`-ing a pushed commit: history that
other environments may have already applied must stay append-only.

The `down` migration exists to let a developer or CI job roll back an
**unmerged / locally-applied** change during development, not to rewrite
already-shared history.

### 5.3 Migrations Are Reviewed Like Code

A migration is reviewed in the same pull request as the application code
that depends on it, with the same scrutiny as any other code change:
correctness of the DDL, index coverage, naming consistency with
`DATABASE_SCHEMA.md`, and a working `down.sql`.

### 5.4 No Application Logic in Migrations

Migrations contain schema DDL (and, where unavoidable, minimal one-time data
backfills required by a schema change, e.g. populating a new `NOT NULL`
column before the constraint is added). They do not contain demo or test
data — that belongs to seeding (section 7).

### 5.5 Idempotent Extension/Object Creation

Statements that may legitimately run against an environment where the object
already exists use `IF NOT EXISTS` / `IF EXISTS` guards (as shown in section
3) so re-running the migration runner against a partially-provisioned
database fails safely rather than erroring on the first line.

---

## 6. Migration Order

The migrations applied so far, reflecting the entities defined in
`DATA_CONTRACT.md` and `DOMAIN_MODEL.md`:

```text
0001  enable postgis, create resources (+ type/status/GIST indexes)
0002  create users, roles, permissions, role_permissions, user_roles
      (+ join-table indexes)
0003  create resource_status_history, resource_location_history,
      resource_change_history (+ resource_id indexes)
0004  create audit_records (+ resource_id/user_id/occurred_at indexes)
0005  intentional no-op: every index was already created inline with its
      table in 0001-0004; the number is reserved rather than duplicated
0006  relax the three history tables' resource_id from NOT NULL /
      ON DELETE CASCADE to nullable / ON DELETE SET NULL
0007  add users.password_hash (text NOT NULL DEFAULT '')
```

Later migrations append to this sequence; they never renumber it.

---

## 7. Seed Data

Seed data (sample resources, a default admin user/role, reference
permissions) is loaded via `scripts/database/seed.sh` / `seed.ps1`, which
read SQL files from `database/seeds/` in name order
(`0001_sample_resources.sql`, `0002_sample_auth.sql`,
`0003_sample_auth_coordinator.sql`). On a brand-new Docker volume the
compose stack loads them automatically after the migrations
(`docs/11_devops/DOCKER_COMPOSE.md` section 6.1).

Seeding is deliberately kept out of the migration files because:

- seed data is environment-specific (local development wants demo resources;
  a shared environment might not), while schema migrations must be identical
  across every environment;
- seeds may need to be re-run or reset independently of the schema version.

Only `0001_sample_resources.sql` is idempotent (`ON CONFLICT (id) DO
NOTHING`); `0002` and `0003` use plain `INSERT`s, so re-running the seed
scripts against an already-seeded database fails on a duplicate primary
key. Reset the data (or the Docker volume) before seeding again.

---

## 8. Scope Boundary

This document does not cover:

- the target schema's column definitions (see `DATABASE_SCHEMA.md`);
- how to back up or restore a database, or how to size a connection pool
  (see `DATABASE_OPERATIONS.md`);
- the internal implementation of `migrate.sh` / `migrate.ps1` /
  `rollback.sh` / `rollback.ps1` / `seed.sh` / `seed.ps1` beyond the
  contract described in section 4 — these scripts are implementation, this
  document is the specification they must satisfy.

---

## 9. Migration Principle

> The migration history is the schema's audit trail. It is append-only,
> reviewed like code, and never rewritten once shared.
