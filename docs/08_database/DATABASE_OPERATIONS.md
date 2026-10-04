# Database Operations

## 1. Purpose

This document covers how the GeoResponse PostgreSQL + PostGIS database is
run locally, indexed, backed up, and health-checked.

Migrations and seeding are in [`DATABASE_MIGRATIONS.md`](DATABASE_MIGRATIONS.md),
table definitions in [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md), and
connection pooling in [`DATABASE_ARCHITECTURE.md`](DATABASE_ARCHITECTURE.md)
section 4.

---

## 2. Environment Scope

The database runs only in local development and in the ephemeral CI test
job. There is no staging or production database, so this document does
not define managed cloud databases, high availability, failover, or
disaster-recovery runbooks beyond a basic local backup and restore. The
environment list is in
[`ENVIRONMENT_MANAGEMENT.md`](../11_devops/ENVIRONMENT_MANAGEMENT.md)
section 3.

---

## 3. Local Development Setup

PostgreSQL with PostGIS runs in Docker, so contributors do not need a
native install. The compose service `georesponse-db` in the root
`docker-compose.yml`:

- uses the image `postgis/postgis:16-3.4` (PostgreSQL 16, PostGIS 3.4);
- is exposed on `localhost:5432`;
- persists data in the named volume `georesponse-db-data` (removed only by
  `docker compose down -v`);
- on a brand-new volume, runs the first-run hook in `docker/postgres/init/`,
  which applies every migration and seed file once
  (`DATABASE_MIGRATIONS.md` section 4.3).

The commands for starting the stack (`./run.sh` / `.\run.ps1` or
`docker compose up --build`) are in
[`DOCKER_COMPOSE.md`](../11_devops/DOCKER_COMPOSE.md) section 7. With
`APP_ENV=development` the backend applies any pending migration itself at
start-up, so the `scripts/database/` scripts are only needed against a
natively installed database or to run migrations or seeds by hand.

The backend and every script read the connection string from
`DATABASE_URL` (format
`postgres://user:password@host:5432/dbname?sslmode=disable`; the default
in `georesponse-be/.env.example`, matching the compose credentials, is
`postgres://georesponse:georesponse_dev_password@localhost:5432/georesponse?sslmode=disable`).
The same binary can therefore point at the Docker database or a native
PostgreSQL + PostGIS instance without code changes.

---

## 4. Indexing Strategy

The index definitions are in `DATABASE_SCHEMA.md` (sections 5 to 8). They
support these query patterns:

- **`resources.type` and `resources.status` (B-tree):** filtering by type
  and status (BR-043 to BR-045, resource discovery and filtering).
- **`resources.location` (GIST):** bounding-box and distance queries
  (`ST_DWithin`) for the map view (BR-046), per the PostGIS rationale in
  `TECHNOLOGY_SELECTION.md` section 10.1.
- **`resource_id` on the three history tables (B-tree):** loading a
  resource's status, location, and change history (BR-008, BR-014,
  BR-017).
- **`audit_records.resource_id`, `user_id`, `occurred_at` (B-tree):** audit
  lookups by resource, by user, and in chronological order.

The current `GET /api/v1/resources` filters on `type`, `status`, and a
case-insensitive name `search` only, and the map view renders the full
result set client-side. The following query shows what the GIST index
makes possible when combined with the type and status filters (BR-045,
combined filters narrow the result set):

```sql
SELECT id, name, type, status, attributes,
       ST_Y(location::geometry) AS latitude,
       ST_X(location::geometry) AS longitude,
       updated_at
FROM resources
WHERE type = 'VEHICLE'
  AND status = 'AVAILABLE'
  AND ST_Intersects(
        location,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
      );
```

There is no index on `attributes` JSONB paths. If an attribute-based filter
becomes a requirement, a targeted `GIN` index on `attributes` (or a
generated column for that field) can be added as its own migration.

---

## 5. Backup and Restore

Backup and restore use PostgreSQL's standard tools:

```bash
# Backup (custom format, compressed, suitable for pg_restore)
pg_dump -Fc -h localhost -U georesponse -d georesponse -f georesponse.dump

# Restore into a fresh database
pg_restore -h localhost -U georesponse -d georesponse --clean --if-exists georesponse.dump
```

This lets a contributor snapshot the local database before testing a risky
migration, or share a reproducible dataset. Point-in-time recovery, WAL
archiving, and scheduled backups are not implemented, since there is no
deployed database that needs them.

---

## 6. Health Checks and Monitoring

Monitoring is limited to knowing whether the database is reachable:

- `GET /health` pings the pool (`pgxpool.Pool.Ping`) and reports database
  connectivity as part of service health. The compose file uses it as the
  backend's health check. The endpoint shape is in `API_CONTRACT.md`
  section 2.
- Start-up fails fast if the database cannot be reached
  (`DATABASE_ARCHITECTURE.md` section 4).
- Slow-query logging, when needed for local debugging, uses PostgreSQL's
  own `log_min_duration_statement` setting. No APM or tracing integration
  is added.
