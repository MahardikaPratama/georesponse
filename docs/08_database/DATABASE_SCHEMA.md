# Database Schema

## 1. Purpose

This document defines the PostgreSQL + PostGIS schema for GeoResponse:
tables, columns, keys, and indexes, as created by the migrations in
`database/migrations/` (`0001` to `0007`). The listings show the resulting
objects; the migration files themselves wrap every `CREATE` in an
`IF NOT EXISTS` guard (`DATABASE_MIGRATIONS.md` section 5.5).

It is the physical counterpart of `DATA_CONTRACT.md` (the application data
model, which excludes tables, keys, and indexes in its section 14) and
`DOMAIN_MODEL.md` (the conceptual model). Migration mechanics are in
`DATABASE_MIGRATIONS.md`; connection pooling and operations are in
`DATABASE_ARCHITECTURE.md` and `DATABASE_OPERATIONS.md`. How
`users.password_hash` is produced and verified is a security concern (see
`docs/05_engineering/SECURITY.md`).

---

## 2. Naming Convention: JSON (camelCase) vs. SQL (snake_case)

The API uses `camelCase` field names (`DATA_CONTRACT.md` section 2). SQL
columns use `snake_case`. Every API field maps to the column of the same
name with underscores in place of camel humps:

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
| `previousLocation` / `newLocation` | derived from `previous_location` / `new_location` (both `geography(Point,4326)`) |
| `changedAt` | `changed_at` |
| `changedBy` | `changed_by` |
| `occurredAt` | `occurred_at` |
| `userId` | `user_id` |
| `roles` (array on User) | derived via `user_roles` join table |
| `permissions` (array on Role) | derived via `role_permissions` join table |

The repository layer applies this mapping (`DATABASE_ARCHITECTURE.md`
section 3). No column uses `camelCase` or mixed case.

---

## 3. Entity-to-Table Mapping

| `DATA_CONTRACT.md` object | Table(s) |
|---|---|
| `Resource` (section 3) | `resources` |
| `User` (section 5) | `users`, `user_roles` |
| `Role` (section 6) | `roles`, `role_permissions` |
| `Permission` (section 7) | `permissions` |
| Status History (section 8.1) | `resource_status_history` |
| Location History (section 8.2) | `resource_location_history` |
| Resource Change History (section 8.3) | `resource_change_history` |
| `AuditRecord` (section 9) | `audit_records` |

---

## 4. Extension

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

## 5. `resources`

Backs `Resource` (`DATA_CONTRACT.md` section 3, `DOMAIN_MODEL.md`
section 3).

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

- `id` is an opaque string (e.g. `resource-001`) supplied by the caller
  when the resource is created; there is no `serial` or `uuid` default.
  A duplicate id is rejected by the primary key and reported as a
  conflict (`DATABASE_ARCHITECTURE.md` section 6.2).
- `type` and `status` are `CHECK` constraints over the enumerations in
  `DOMAIN_MODEL.md` sections 5 and 7. Adding a resource type is a
  migration that alters this constraint, not a table restructure
  (`DOMAIN_MODEL.md` section 3.3, BR-004).
- `attributes` holds the type-specific fields (`vehicleType`/`capacity`,
  `facilityType`/`capacity`, `equipmentType`/`quantity`, `deviceType`) as
  JSONB (`DOMAIN_MODEL.md` section 6.2), so new attribute sets need no
  schema change.
- `location` is `geography(Point, 4326)`. It is read back with
  `ST_Y(location::geometry)` (latitude) and `ST_X(location::geometry)`
  (longitude), and written with
  `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography`. Note
  the `(longitude, latitude)` argument order of `ST_MakePoint`, the same
  order as GeoJSON (`DATA_CONTRACT.md` section 2).
- There is no `deleted_at` column: deletion is a hard delete
  (`DATABASE_ARCHITECTURE.md` section 6.4). History and audit tables keep
  the trail after the row is removed.

---

## 6. Authentication and Authorization Tables

Backs `User`, `Role`, and `Permission` (`DATA_CONTRACT.md` sections 5 to
7).

Role and permission membership uses the `role_permissions` and
`user_roles` join tables instead of array columns, so it can be queried,
indexed, and constrained relationally. The API still returns flat
`roles: ["operator"]` / `permissions: [...]` arrays; the repository and
application layers build them when assembling the response.

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
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    -- bcrypt hash verified by POST /api/v1/auth/login (added by migration
    -- 0007; the login `identifier` is the user's own id, since no separate
    -- username/email column exists). Never returned by the API
    -- (DATA_CONTRACT.md section 5).
    password_hash text NOT NULL DEFAULT ''
);

CREATE TABLE user_roles (
    user_id  text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id  text NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_role_permissions_permission_id ON role_permissions (permission_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);
```

`ON DELETE CASCADE` applies only to the join tables: removing a role removes
its permission and user associations. Role and permission changes are still
recorded in `audit_records` (section 8), whose foreign keys are
`ON DELETE SET NULL`.

---

## 7. Resource History Tables

Backs Resource History (`DATA_CONTRACT.md` section 8). There is one table
per history category instead of a single table with a discriminator,
because each category has a different before/after shape (status pair,
location pair, list of field changes), and `DATA_CONTRACT.md` section 8
models them as three JSON shapes. A unified table would need nullable
columns or a JSONB catch-all and would lose the typed `previous_status` /
`new_status` columns. The split also mirrors BR-031, BR-032, and BR-033,
which each constrain one history type.

```sql
CREATE TABLE resource_status_history (
    id               text PRIMARY KEY,
    resource_id      text REFERENCES resources (id) ON DELETE SET NULL,
    previous_status  text NOT NULL,
    new_status       text NOT NULL,
    changed_at       timestamptz NOT NULL DEFAULT now(),
    changed_by       text REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE resource_location_history (
    id                  text PRIMARY KEY,
    resource_id         text REFERENCES resources (id) ON DELETE SET NULL,
    previous_location   geography(Point, 4326) NOT NULL,
    new_location        geography(Point, 4326) NOT NULL,
    changed_at          timestamptz NOT NULL DEFAULT now(),
    changed_by          text REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE resource_change_history (
    id            text PRIMARY KEY,
    resource_id   text REFERENCES resources (id) ON DELETE SET NULL,
    changes       jsonb NOT NULL,  -- [{ "field": "name", "before": "...", "after": "..." }]
    changed_at    timestamptz NOT NULL DEFAULT now(),
    changed_by    text REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_resource_status_history_resource_id ON resource_status_history (resource_id);
CREATE INDEX idx_resource_location_history_resource_id ON resource_location_history (resource_id);
CREATE INDEX idx_resource_change_history_resource_id ON resource_change_history (resource_id);
```

Foreign keys:

- `resource_id` is nullable and `ON DELETE SET NULL`, matching
  `audit_records`. Migration `0003` created these columns as
  `NOT NULL ... ON DELETE CASCADE`; migration `0006` relaxed them, because
  resource deletion is a hard delete and cascading destroyed the history
  that must remain available afterwards.
- `changed_by` is also `ON DELETE SET NULL`: removing a user keeps the
  record that a change happened and only loses who made it, consistent
  with `DATA_CONTRACT.md` section 8 treating `changedBy` as present "when
  user identity is available."

---

## 8. `audit_records`

Backs `AuditRecord` (`DATA_CONTRACT.md` section 9, BR-035 to BR-039).

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

`resource_id` and `user_id` are `ON DELETE SET NULL`. `audit_records` is
the durable system-wide trail, separate from resource history
(`DATA_CONTRACT.md` section 9), and includes `ROLE_CHANGED` /
`PERMISSION_CHANGED` entries with no `resource_id` at all. An audit record
must outlive the resource or user it refers to, including the resource
whose hard delete produced a `RESOURCE_DELETED` entry.

---

## 9. Full Schema Overview

```text
resources
  ├── resource_status_history   (resource_id → resources.id, SET NULL)
  ├── resource_location_history (resource_id → resources.id, SET NULL)
  ├── resource_change_history   (resource_id → resources.id, SET NULL)
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

schema_migrations   migration bookkeeping only (see DATABASE_MIGRATIONS.md §4.4);
                    not application data
```
