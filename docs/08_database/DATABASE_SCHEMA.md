# Database Schema

## 1. Purpose

This document defines the proposed relational schema for GeoResponse's
PostgreSQL + PostGIS database: tables, columns, keys, and indexes.

It is the physical counterpart of `DATA_CONTRACT.md` (the application-level
data model) and `DOMAIN_MODEL.md` (the conceptual model). `DATA_CONTRACT.md`
section 14 explicitly excludes database tables, columns, foreign keys,
indexes, and migration structure from its scope — this document is where
those concerns are defined.

---

## 2. Naming Convention: JSON (camelCase) vs. SQL (snake_case)

The API contract uses `camelCase` field names (`DATA_CONTRACT.md` section 2).
SQL columns in this schema use standard PostgreSQL `snake_case`. The mapping
between the two is mechanical and consistent — every API field maps to a
column of the same name with underscores in place of camel humps:

| JSON field (API) | SQL column (database) |
|---|---|
| `id` | `id` |
| `resourceId` | `resource_id` |
| `name` | `name` |
| `type` | `type` |
| `status` | `status` |
| `attributes` | `attributes` |
| `location.latitude` / `location.longitude` | derived from `location geography(Point,4326)` |
| `updatedAt` | `updated_at` |
| `createdAt` | `created_at` |
| `previousStatus` / `newStatus` | `previous_status` / `new_status` |
| `previousLocation` / `newLocation` | `previous_latitude`/`previous_longitude` / `new_latitude`/`new_longitude` |
| `changedAt` | `changed_at` |
| `changedBy` | `changed_by` |
| `occurredAt` | `occurred_at` |
| `userId` | `user_id` |
| `roles` (array on User) | derived via `user_roles` join table |
| `permissions` (array on Role) | derived via `role_permissions` join table |

This translation is applied consistently by the repository layer
(`DATABASE_ARCHITECTURE.md` section 3); no column uses `camelCase` or mixed
case.

---

## 3. Entity-to-Table Mapping

| `DATA_CONTRACT.md` object | Table(s) |
|---|---|
| `Resource` (§3) | `resources` |
| `User` (§5) | `users`, `user_roles` |
| `Role` (§6) | `roles`, `role_permissions` |
| `Permission` (§7) | `permissions` |
| Status History (§8.1) | `resource_status_history` |
| Location History (§8.2) | `resource_location_history` |
| Resource Change History (§8.3) | `resource_change_history` |
| `AuditRecord` (§9) | `audit_records` |

---

## 4. Extension

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

## 5. `resources`

Backs `Resource` (`DATA_CONTRACT.md` §3, `DOMAIN_MODEL.md` §3).

```sql
CREATE TABLE resources (
    id          text PRIMARY KEY,
    name        text NOT NULL,
    type        text NOT NULL
        CHECK (type IN ('VEHICLE', 'FACILITY', 'EQUIPMENT', 'IOT_DEVICE')),
    status      text NOT NULL
        CHECK (status IN ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'UNAVAILABLE')),
    attributes  jsonb NOT NULL DEFAULT '{}'::jsonb,
    location    geography(Point, 4326) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_type ON resources (type);
CREATE INDEX idx_resources_status ON resources (status);
CREATE INDEX idx_resources_location ON resources USING GIST (location);
```

Notes:

- `id` is a backend-generated opaque string (e.g. `resource-001`), matching
  `DATA_CONTRACT.md` §2's identifier convention (`DATABASE_ARCHITECTURE.md`
  §6.2). It is not a database-generated `serial`/`uuid` default, so the
  application controls id format consistently across environments.
- `type` and `status` use `CHECK` constraints against the MVP enumerations
  defined in `DOMAIN_MODEL.md` §5 and §7. Adding a new resource type is a new
  migration that alters this constraint — it does not require restructuring
  the table (`DOMAIN_MODEL.md` §3.3 / `BR-004`).
  `attributes` holds the type-specific fields (`vehicleType`/`capacity`,
  `facilityType`/`capacity`, `equipmentType`/`quantity`, `deviceType`) as
  JSONB rather than typed columns, per `DOMAIN_MODEL.md` §6.2, so new
  attribute sets never require a schema change.
- `location` is `geography(Point, 4326)`, storing what the API represents as
  `location.latitude` / `location.longitude`. Reading it back as separate
  values uses `ST_Y(location::geometry)` (latitude) and
  `ST_X(location::geometry)` (longitude); writing it uses
  `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography` — note
  the `(longitude, latitude)` argument order required by `ST_MakePoint`,
  matching the GeoJSON coordinate order convention noted in
  `DATA_CONTRACT.md` §2 and §10.
- No `deleted_at` column: deletion is hard-delete, per the decision recorded
  in `DATABASE_ARCHITECTURE.md` §6.4. History and audit tables retain the
  trail after a resource row is removed (see foreign-key notes below).

---

## 6. Authentication / Authorization Tables

Backs `User`, `Role`, `Permission` (`DATA_CONTRACT.md` §5–§7).

A normalized many-to-many design is used — `role_permissions` and
`user_roles` join tables — rather than array columns, so permission and role
membership can be queried, indexed, and constrained relationally. The API
still exposes the flattened `roles: ["operator"]` / `permissions: [...]`
arrays shown in `DATA_CONTRACT.md`; that flattening happens in the
repository/application layer when assembling the API response, not in the
table structure.

```sql
CREATE TABLE roles (
    id    text PRIMARY KEY,
    name  text NOT NULL UNIQUE
);

CREATE TABLE permissions (
    id    text PRIMARY KEY,
    code  text NOT NULL UNIQUE,   -- e.g. 'resource.update'
    name  text NOT NULL           -- e.g. 'Update Resource'
);

CREATE TABLE role_permissions (
    role_id        text NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id  text NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id            text PRIMARY KEY,
    name          text NOT NULL,
    -- Authentication credentials (password hash, etc.) are deliberately
    -- excluded from this document's scope; DATA_CONTRACT.md §5 states
    -- credentials are not part of general application data, and their
    -- storage is a security-documentation concern, not a schema concern
    -- covered here.
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
    user_id  text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id  text NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_role_permissions_permission_id ON role_permissions (permission_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);
```

`ON DELETE CASCADE` is used only for the join tables themselves (removing a
role removes its permission/user associations, not the role's audit trail —
role and permission changes are still captured in `audit_records`, see
section 8, whose foreign keys are `ON DELETE SET NULL`, not cascading).

---

## 7. Resource History Tables

Backs Resource History (`DATA_CONTRACT.md` §8). Three separate tables are
used — one per history category — rather than a single table with a
discriminator column, because each category has a genuinely different
before/after shape (status pair, location pair, list of field changes), and
`DATA_CONTRACT.md` §8 itself models them as three distinct JSON shapes. A
unified table would need nullable columns for whichever category doesn't
apply, or a JSONB catch-all that loses the explicit `previous_status` /
`new_status` typing this data benefits from. Keeping them separate mirrors
`BUSINESS_RULES.md` BR-031/BR-032/BR-033, each of which independently
constrains what that specific history type may represent.

```sql
CREATE TABLE resource_status_history (
    id               text PRIMARY KEY,
    resource_id      text NOT NULL REFERENCES resources (id) ON DELETE CASCADE,
    previous_status  text NOT NULL,
    new_status       text NOT NULL,
    changed_at       timestamptz NOT NULL DEFAULT now(),
    changed_by       text REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE resource_location_history (
    id                  text PRIMARY KEY,
    resource_id         text NOT NULL REFERENCES resources (id) ON DELETE CASCADE,
    previous_location   geography(Point, 4326) NOT NULL,
    new_location        geography(Point, 4326) NOT NULL,
    changed_at          timestamptz NOT NULL DEFAULT now(),
    changed_by          text REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE resource_change_history (
    id            text PRIMARY KEY,
    resource_id   text NOT NULL REFERENCES resources (id) ON DELETE CASCADE,
    changes       jsonb NOT NULL,  -- [{ "field": "name", "before": "...", "after": "..." }]
    changed_at    timestamptz NOT NULL DEFAULT now(),
    changed_by    text REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_resource_status_history_resource_id ON resource_status_history (resource_id);
CREATE INDEX idx_resource_location_history_resource_id ON resource_location_history (resource_id);
CREATE INDEX idx_resource_change_history_resource_id ON resource_change_history (resource_id);
```

Note on `resources` deletion: `resource_id` foreign keys here use
`ON DELETE CASCADE`. This intentionally differs from the hard-delete
rationale in `DATABASE_ARCHITECTURE.md` §6.4 for the *current-state*
`resources` row, but resource-scoped history rows have no independent
meaning once the resource itself is permanently gone and the deletion is
already captured, with full identifying detail, in `audit_records` (section
8), which is the durable trail for deletion per `BR-021`. `changed_by` uses
`ON DELETE SET NULL` rather than cascading, since removing a user account
should not erase the historical record that a change happened — only who
specifically made it becomes unknown, consistent with `DATA_CONTRACT.md` §8
treating `changedBy` as available "when user identity is available."

---

## 8. `audit_records`

Backs `AuditRecord` (`DATA_CONTRACT.md` §9, `BUSINESS_RULES.md` BR-035 to
BR-039).

```sql
CREATE TABLE audit_records (
    id            text PRIMARY KEY,
    operation     text NOT NULL
        CHECK (operation IN (
            'RESOURCE_CREATED',
            'RESOURCE_UPDATED',
            'RESOURCE_STATUS_CHANGED',
            'RESOURCE_RELOCATED',
            'RESOURCE_DELETED',
            'ROLE_CHANGED',
            'PERMISSION_CHANGED'
        )),
    user_id       text REFERENCES users (id) ON DELETE SET NULL,
    resource_id   text REFERENCES resources (id) ON DELETE SET NULL,
    occurred_at   timestamptz NOT NULL DEFAULT now(),
    details       jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_audit_records_resource_id ON audit_records (resource_id);
CREATE INDEX idx_audit_records_user_id ON audit_records (user_id);
CREATE INDEX idx_audit_records_occurred_at ON audit_records (occurred_at);
```

`resource_id` and `user_id` use `ON DELETE SET NULL` rather than `CASCADE`:
`audit_records` is the system's durable trail (`DATA_CONTRACT.md` §9 states
it is deliberately separate from resource history because it covers system
operations broadly, including `ROLE_CHANGED` / `PERMISSION_CHANGED` entries
that have no `resource_id` at all). An audit record must outlive the
resource or user it refers to — including surviving the hard-delete of the
resource that triggered a `RESOURCE_DELETED` entry — so it is never removed
as a side effect of deleting the thing it describes.

---

## 9. Full Schema Overview

```text
resources
  ├── resource_status_history   (resource_id → resources.id, CASCADE)
  ├── resource_location_history (resource_id → resources.id, CASCADE)
  ├── resource_change_history   (resource_id → resources.id, CASCADE)
  └── audit_records             (resource_id → resources.id, SET NULL)

users
  ├── user_roles        (user_id → users.id, CASCADE)
  ├── *_history.changed_by     (→ users.id, SET NULL)
  └── audit_records.user_id    (→ users.id, SET NULL)

roles
  ├── role_permissions  (role_id → roles.id, CASCADE)
  └── user_roles        (role_id → roles.id, CASCADE)

permissions
  └── role_permissions  (permission_id → permissions.id, CASCADE)
```

---

## 10. Scope Boundary

This document does not cover:

- the Go repository interfaces or ORM/query-builder used to execute this
  schema's SQL (backend implementation detail, not a schema concern);
- the JSON shape returned by the API (see `DATA_CONTRACT.md`);
- migration file structure, ordering, or rollback mechanics (see
  `DATABASE_MIGRATIONS.md`);
- connection pooling, backup/restore, or index-tuning operations (see
  `DATABASE_ARCHITECTURE.md` and `DATABASE_OPERATIONS.md`);
- authentication credential storage (a security-documentation concern).

---

## 11. Schema Principle

> The schema is normalized where structure is stable and JSONB where
> structure legitimately varies by type — never the reverse.
