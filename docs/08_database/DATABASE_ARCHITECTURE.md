# Database Architecture

## 1. Purpose

This document describes how the PostgreSQL + PostGIS database fits into
GeoResponse: how it is reached, how connections are managed, how PostGIS is
used, and the design decisions behind the schema (including the hard-delete
decision in section 6.4).

It does not cover why PostgreSQL was chosen (see
[`TECHNOLOGY_SELECTION.md`](../05_engineering/TECHNOLOGY_SELECTION.md)
section 10), the table DDL ([`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md)),
migrations ([`DATABASE_MIGRATIONS.md`](DATABASE_MIGRATIONS.md)), operations
such as backup and indexing ([`DATABASE_OPERATIONS.md`](DATABASE_OPERATIONS.md)),
or the API shape ([`DATA_CONTRACT.md`](../04_contracts/DATA_CONTRACT.md)).

---

## 2. Technology Basis

The database is PostgreSQL with the PostGIS extension. The relational model
fits the structured data (`Resource`, `User`, `Role`, `Permission`, history,
audit records), and PostGIS adds geospatial types and indexes for resource
locations. The decision and its alternatives are recorded in
`TECHNOLOGY_SELECTION.md` section 10.

---

## 3. Position in the Backend

The database is reached only through the repository layer. The allowed
dependency direction is defined in
[`DEPENDENCY_RULES.md`](../03_architecture/DEPENDENCY_RULES.md) section 2:
use cases depend on repository interfaces (e.g. `ResourceRepository`), and
the pgx-based Postgres implementations in `internal/repository/postgres`
satisfy them.

Database-specific consequences:

- Handlers, use cases, and domain code never import a database driver or
  hold a raw connection, so the domain can be tested with in-memory fakes.
- PostGIS SQL (`ST_MakePoint`, `ST_X`, `ST_Y`) stays inside the Postgres
  repository implementation. The domain and application layers work with
  plain `latitude` / `longitude` values in a `Location` value object, never
  with PostGIS types.
- The schema can evolve (new indexes, new history tables) without touching
  the rest of the backend as long as the repository interfaces stay stable.

---

## 4. Connection Management

The backend uses one `pgxpool` pool (the connection-pooling package of the
`pgx` driver) per process.

- **One pool per process.** `internal/platform/postgres.NewPool` creates it
  once at start-up, and it is passed into repository constructors. Handlers
  and use cases never open their own connections.
- **Default sizing.** The pool is created from `DATABASE_URL` alone
  (`pgxpool.New`), so it uses `pgxpool`'s defaults (max connections is the
  greater of 4 and the CPU count). If tuning is ever needed, `pgxpool` reads
  `pool_max_conns` / `pool_min_conns` as query parameters on that URL; there
  is no separate configuration variable.
- **Context propagation.** Every repository method takes a
  `context.Context`, so request cancellation and timeouts reach the SQL
  call.
- **Fail fast on start-up.** `NewPool` pings the database and the process
  exits if the ping fails, instead of discovering a bad configuration on the
  first request.

Read replicas and external poolers such as PgBouncer are not used. A single
backend process against a single database does not need them
(`TECHNOLOGY_SELECTION.md` section 3.6, avoid premature infrastructure).

---

## 5. PostGIS Extension

PostGIS is enabled by the first migration, before the `resources` table
that depends on the `geography` type:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

PostGIS is used narrowly:

- `resources.location`, and `previous_location` / `new_location` on
  `resource_location_history`, are `geography(Point, 4326)`. SRID 4326 is
  WGS 84, the coordinate system of `latitude` / `longitude` in
  `DATA_CONTRACT.md`.
- `geography` is used instead of `geometry` because it gives distances and
  areas in meters on a spherical model without manual projection, which
  suits queries such as "resources within 5 km".
- No other PostGIS feature (raster, topology, routing) is used. The API
  exposes plain `latitude` / `longitude` fields.

---

## 6. Schema Design Principles

### 6.1 Normalized Core, JSONB for Variability

The core data (`resources`, `users`, `roles`, `permissions`, history,
audit) is modeled as normalized tables with explicit columns and foreign
keys, because its structure is stable.

Resource attributes are the one place where structure varies by `type`
(`DOMAIN_MODEL.md` section 6). Instead of a wide table with a column per
attribute, or a table per resource type, `resources.attributes` is a single
`JSONB` column. A new resource type is then a new value in a `CHECK`
constraint plus backend validation, not new columns or tables. This
supports the domain rule that new resource types can be added without
changing the resource concept (`DOMAIN_MODEL.md` section 5).

Trade-off: attribute validation is enforced in the Go backend, not by SQL
column constraints, which matches `DATA_CONTRACT.md` section 3.4.

### 6.2 Identifiers

All primary keys are `text` and hold the same opaque string the API exposes
(e.g. `"resource-001"`, `DATA_CONTRACT.md` section 2). There is no separate
surrogate `bigint` or `uuid` key and no translation layer, and the database
never generates ids through column defaults.

- **Resource ids are supplied by the caller** in the
  `POST /api/v1/resources` body. The backend requires a non-empty id and
  returns `409 RESOURCE_ID_CONFLICT` when the id already exists (the
  repository maps the primary-key violation to `resource.ErrIDConflict`).
- **History, audit, and role ids are generated by the backend** with
  `internal/platform/idgen` (a random version-4 UUID string) before
  insert. A role id is generated only when the caller leaves it empty.
- Seed data uses readable ids such as `resource-001` and `user-001`.

### 6.3 Timestamps

All timestamp columns are `timestamptz`, stored and compared in UTC, which
matches the ISO 8601 / UTC convention in `DATA_CONTRACT.md` section 2.
Naive (timezone-less) timestamps are never stored.

### 6.4 Hard Delete

`DELETE /api/v1/resources/{id}` removes the row from `resources`. A soft
delete (a `deleted_at` flag filtered out of normal queries) was considered
and rejected.

**Decision: hard delete**, with an `audit_records` row written in the same
transaction as the delete.

Reasons:

- BR-019 to BR-021 require deletion to be auditable through the audit
  trail, not through a soft-deleted row that could be restored.
- Soft delete would record "this resource is gone" in two places
  (`deleted_at` and the audit log) and force every read query to filter
  `deleted_at IS NULL`.
- `resources` stays the single source of truth for resources that
  currently exist (BR-034), while `audit_records` and the history tables
  record what existed and what happened to it.

History and audit rows that reference a deleted resource are kept: their
`resource_id` foreign keys are `ON DELETE SET NULL`, not cascading
(`DATABASE_SCHEMA.md` sections 7 and 8; migration `0006` corrected the
history tables to this). Changing this decision requires updating this
section and the documents that link to it.

---

## 7. What Lives Where

```text
resources                     current state of a Resource (DOMAIN_MODEL.md §3)
resource_status_history       BR-008 status-change trail
resource_location_history     BR-014 location-change trail
resource_change_history       BR-017 general attribute-change trail
audit_records                 BR-035..BR-039 system-wide audit trail
users, roles, permissions,
role_permissions, user_roles  BR-022..BR-028 authN/authZ data
```

The column-level definition of each table is in `DATABASE_SCHEMA.md`.
