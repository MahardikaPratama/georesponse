# Database Architecture

## 1. Purpose

This document defines how the database fits into the GeoResponse system, the
principles used to design the schema, and the structural decisions that are
not already covered by the technology-selection or data-contract
documentation.

It answers "how is the database organized and accessed", not "why PostgreSQL"
(see [`TECHNOLOGY_SELECTION.md`](../05_engineering/TECHNOLOGY_SELECTION.md)
section 10) and not "what does the API expose" (see
[`DATA_CONTRACT.md`](../04_contracts/DATA_CONTRACT.md)).

---

## 2. Technology Basis

**Database: PostgreSQL + PostGIS**

The decision itself, including alternatives considered and trade-offs, is
recorded in `TECHNOLOGY_SELECTION.md` (section 10). This document does not
re-litigate that decision. In summary, the two relevant facts carried forward
from that decision are:

- GeoResponse manages structured entities (`Resource`, `User`, `Role`,
  `Permission`, history, audit records) that fit a relational model well.
- Resources have geographic coordinates, and PostGIS provides dedicated
  geospatial types, operators, and indexes for bounding-box filtering,
  distance queries, and spatial relationships, even though the MVP API only
  exposes plain `latitude` / `longitude` fields.

---

## 3. Position in the Layered Backend Architecture

`SYSTEM_ARCHITECTURE.md` defines the backend as a layered structure:

```text
HTTP Handler
     ↓
Application / Use Case
     ↓
Domain
     ↓
Repository
     ↓
Database
```

The database is only ever reached through the **Repository** layer.

```text
Application / Use Case
        │
        │  depends on repository interface (Go interface)
        ▼
   Repository Interface
        │
        │  implemented by
        ▼
 Postgres Repository (pgx-based)
        │
        ▼
  PostgreSQL + PostGIS
```

Rules that follow from this:

- HTTP handlers, use cases, and domain code must never import a database
  driver or hold a raw SQL connection.
- The application layer depends on a **repository interface** (e.g.
  `ResourceRepository`), not on a concrete Postgres implementation. This
  keeps the domain testable with in-memory fakes and keeps SQL details out of
  business logic, consistent with `SYSTEM_ARCHITECTURE.md` section 4.
- Any PostGIS-specific SQL (e.g. `ST_MakePoint`, `ST_DWithin`) is isolated
  inside the Postgres repository implementation. The domain and application
  layers work with plain `latitude` / `longitude` values or a simple
  `Location` value object, never with PostGIS geometry types directly.

---

## 4. Connection Management

The backend uses a single pooled connection to PostgreSQL per process,
managed through `pgxpool` (the connection-pooling package of the `pgx`
Go driver).

Principles:

- **One pool per process.** The pool is created once at application startup
  and passed into repository constructors; handlers and use cases never open
  ad hoc connections.
- **Bounded pool size.** Minimum and maximum pool size are set through
  configuration (environment variables) rather than hard-coded, so local
  development and any future deployment target can tune them independently.
- **Context propagation.** Every repository method accepts a `context.Context`
  so request cancellation and timeouts propagate down to the SQL execution,
  and so request-scoped tracing/logging can be attached later without
  changing repository signatures.
- **Fail fast on startup.** The application verifies connectivity (a ping)
  during startup rather than lazily discovering a misconfigured database on
  the first request.

This is intentionally the minimum needed for correctness. Read replicas,
multi-region pooling (e.g. PgBouncer as a separate process), and connection
multiplexing are out of scope for this take-home and are not introduced
speculatively, consistent with `TECHNOLOGY_SELECTION.md` section 3.6 (avoid
premature infrastructure).

---

## 5. PostGIS Extension

PostGIS is enabled per-database with:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

This statement lives in the first schema migration (see
`DATABASE_MIGRATIONS.md`) so that any environment created from a clean
database automatically has the extension available before the `resources`
table (which depends on the `geography` type) is created.

PostGIS is used narrowly:

- The `resources.location` column is stored as `geography(Point, 4326)`
  (SRID 4326 = WGS 84, the coordinate system used by `latitude` /
  `longitude` in `DATA_CONTRACT.md`).
- `geography` (not `geometry`) is chosen because it gives correct
  distance/area results in meters on a spherical model without manual
  projection handling, which matches disaster-response use cases such as
  "resources within 5 km" more naturally than the planar `geometry` type.
- No other PostGIS feature (raster, topology, routing) is used. The intent is
  to keep the extension surface minimal and predictable.

---

## 6. Schema Design Principles

### 6.1 Normalized Core, JSONB for Variability

The core entities (`resources`, `users`, `roles`, `permissions`, history,
audit) are modeled as normalized relational tables with explicit columns and
foreign keys, because their structure is stable and well understood.

Resource **attributes** are the one place where structure legitimately varies
by `type` (vehicle vs. facility vs. equipment vs. IoT device, per
`DOMAIN_MODEL.md` section 6). Rather than:

- one wide table with a column per possible attribute across all types, or
- a separate table per resource type,

`resources.attributes` is a single `JSONB` column. This directly supports the
domain requirement that "additional resource types may be introduced in the
future without changing the fundamental resource concept" (`DOMAIN_MODEL.md`
section 5) — a new resource type is a new value in a `CHECK` constraint plus
backend validation logic, not a schema migration that adds columns or tables.

Trade-off accepted: attribute-level filtering/validation is enforced in the
backend (Go), not through SQL column constraints. This is consistent with
`DATA_CONTRACT.md` section 3.4, which already assigns attribute validation to
the backend.

### 6.2 Identifiers

Resource, user, role, permission, and history identifiers are exposed to the
API as opaque strings (e.g. `"resource-001"`, per `DATA_CONTRACT.md` section
2). Internally, the schema uses `text` primary keys rather than surrogate
`bigint` or `uuid` keys generated independently of the API-visible id, so
that the database identifier and the API identifier are the same value with
no translation layer. New identifiers are generated by the backend (e.g.
ULID/UUID formatted as a prefixed string such as `resource-<uuid>`) before
insert; the database does not silently generate ids the application layer is
unaware of. This keeps `id` generation a single, testable concern in the
application layer rather than split between Go and SQL defaults.

### 6.3 Timestamps

All timestamp columns use `timestamptz` (`timestamp with time zone`), stored
and compared in UTC, matching the ISO 8601 / UTC convention in
`DATA_CONTRACT.md` section 2. The application never stores naive
(timezone-less) timestamps.

### 6.4 Soft Delete vs. Hard Delete

`DELETE /api/v1/resources/{id}` (per the take-home requirements) removes a
resource. Two options exist:

1. **Soft delete** — keep the row, flag it (`deleted_at timestamptz`), and
   filter it out of normal queries.
2. **Hard delete** — remove the row from `resources`, and rely on
   `resource_change_history` and `audit_records` (already required by
   `BR-021` and `DATA_CONTRACT.md` section 9) to preserve the historical
   trail.

**Decision: hard delete**, with a mandatory `audit_records` row written in
the same transaction as the delete.

Rationale: `BUSINESS_RULES.md` (BR-019 to BR-021) already requires deletion
to be auditable via the audit trail, not via a resurrectable soft-deleted
row. Introducing soft delete on top of that would duplicate the "is this
resource gone" concern in two places (`deleted_at` and the audit log) and
would force every read query to remember to filter `deleted_at IS NULL`.
Hard delete keeps `resources` as the single source of truth for "resources
that currently exist" (`BUSINESS_RULES.md` BR-034), while `audit_records` and
`resource_change_history` remain the source of truth for "what used to
exist and what happened to it." History and audit rows referencing a deleted
resource are retained (see `DATABASE_SCHEMA.md` section on foreign keys —
history/audit tables do not cascade-delete when a resource is removed).

This decision is explicit and documented here specifically because the data
contract and domain model leave it open; it should not be revisited silently
inside a single PR.

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

The full column-level definition of each table is in `DATABASE_SCHEMA.md`.

---

## 8. Scope Boundary

This document does not cover:

- the exact SQL DDL for each table (see `DATABASE_SCHEMA.md`);
- migration file naming, ordering, or rollback procedure (see
  `DATABASE_MIGRATIONS.md`);
- backup, restore, indexing details, or local environment setup (see
  `DATABASE_OPERATIONS.md`);
- ORM/query-builder choice or Go repository interface signatures (backend
  implementation detail, not a database architecture concern);
- the API/JSON shape of any resource (see `DATA_CONTRACT.md`).

---

## 9. Architecture Principle

> The database is an implementation detail behind the Repository layer, not
> a shape the rest of the system is designed around.

The schema should be free to evolve (new indexes, new history tables, a
future partitioning strategy) as long as the repository interfaces the
application layer depends on remain stable.
