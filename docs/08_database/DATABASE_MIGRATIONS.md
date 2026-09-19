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

Migrations live in `database/migrations/` (currently empty, ready for the
first migration). Seed data is deliberately kept **separate** from schema
migrations, in `database/seeds/` (see section 7).

Naming convention:

```text
database/migrations/
  0001_enable_postgis_and_create_resources.up.sql
  0001_enable_postgis_and_create_resources.down.sql
  0002_create_users_roles_permissions.up.sql
  0002_create_users_roles_permissions.down.sql
  0003_create_resource_history_tables.up.sql
  0003_create_resource_history_tables.down.sql
  0004_create_audit_records.up.sql
  0004_create_audit_records.down.sql
  0005_add_resource_indexes.up.sql
  0005_add_resource_indexes.down.sql
```

Rules for the filename:

- `NNNN` is a strictly increasing, zero-padded, four-digit sequence number,
  assigned in commit order. Sequence numbers are never reused or reordered.
- The descriptive suffix is short and states the change (`create_resources`,
  `add_resource_indexes`), not the ticket number or author.
- `.up.sql` applies the change; `.down.sql` reverses exactly that change and
  nothing else.

Example pair for migration `0001`:

```sql
-- 0001_enable_postgis_and_create_resources.up.sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE resources (
    id          text PRIMARY KEY,
    name        text NOT NULL,
    type        text NOT NULL,
    status      text NOT NULL,
    attributes  jsonb NOT NULL DEFAULT '{}'::jsonb,
    location    geography(Point, 4326) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
```

```sql
-- 0001_enable_postgis_and_create_resources.down.sql
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
| `scripts/database/rollback.sh` | bash | Revert the most recently applied migration using its `down` file |
| `scripts/database/rollback.ps1` | PowerShell | Revert the most recently applied migration using its `down` file |
| `scripts/database/seed.sh` | bash | Load seed data after migrations have been applied |
| `scripts/database/seed.ps1` | PowerShell | Load seed data after migrations have been applied |

Both a bash and a PowerShell variant are provided for every operation so
the same workflow works whether a contributor develops on Windows or a
Unix-like shell, without relying on WSL or Git Bash being present.

Expected behavior of `migrate.sh` / `migrate.ps1`:

1. Read the database connection string from environment configuration (not
   hard-coded).
2. Track applied migrations in a dedicated bookkeeping table (e.g.
   `schema_migrations(version text primary key, applied_at timestamptz)`),
   so the script can determine which `NNNN_*.up.sql` files have not yet run.
3. Apply pending `up` migrations in ascending numeric order, each inside its
   own transaction where the statement supports it (note: `CREATE INDEX
   CONCURRENTLY` cannot run inside a transaction — such migrations are
   written and applied accordingly, and are not expected in this take-home's
   scope given its data volume).
4. Record each successfully applied migration in `schema_migrations`.
5. Stop and exit non-zero on the first failure, leaving the database at the
   last successfully applied migration.

Expected behavior of `rollback.sh` / `rollback.ps1`:

1. Determine the most recently applied migration from `schema_migrations`.
2. Run its `.down.sql` file.
3. Remove the corresponding row from `schema_migrations`.

The scripts themselves are placeholders at the time of writing this document
(intended entry points, not yet implemented); this document defines the
contract they are expected to fulfill.

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

## 6. Migration Order (Planned)

The intended first batch of migrations, reflecting the entities defined in
`DATA_CONTRACT.md` and `DOMAIN_MODEL.md`:

```text
0001  enable postgis, create resources
0002  create users, roles, permissions, role_permissions, user_roles
0003  create resource_status_history, resource_location_history,
      resource_change_history
0004  create audit_records
0005  add remaining indexes (type/status/spatial GIST) not already
      created inline with their table
```

Later migrations append to this sequence; they never renumber it.

---

## 7. Seed Data

Seed data (sample resources, a default admin user/role, reference
permissions) is loaded via `scripts/database/seed.sh` / `seed.ps1`, which
read SQL or data files from `database/seeds/` (currently empty, ready for
seed files such as `001_default_roles_permissions.sql`,
`002_sample_resources.sql`).

Seeding is deliberately kept out of the migration files because:

- seed data is environment-specific (local development wants demo resources;
  a shared environment might not), while schema migrations must be identical
  across every environment;
- seeds may need to be re-run or reset independently of the schema version.

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
