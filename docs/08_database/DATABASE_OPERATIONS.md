# Database Operations

## 1. Purpose

This document defines how the GeoResponse PostgreSQL + PostGIS database is
run, indexed, backed up, and monitored, at a level of effort proportionate to
a take-home test. It does not describe production-grade infrastructure that
this project does not have.

---

## 2. Environment Scope

GeoResponse, as a take-home submission, runs in a **single environment
tier: local development**. There is no staging or production deployment.

This document therefore intentionally does not define:

- multi-environment promotion pipelines;
- managed cloud database configuration (RDS, Cloud SQL, etc.);
- high-availability / failover topology;
- disaster-recovery runbooks beyond a basic local backup/restore.

If the project were extended beyond take-home scope, those concerns would be
added here rather than assumed in advance, consistent with
`TECHNOLOGY_SELECTION.md` section 3.6 (avoid premature infrastructure).

---

## 3. Local Development Setup

PostgreSQL with PostGIS runs locally via Docker, using the PostGIS-enabled
image `postgis/postgis:16-3.4` rather than requiring a native
PostgreSQL + PostGIS install on each contributor's machine.

Conceptually (the actual compose definition is the root
`docker-compose.yml`, service `georesponse-db`; `docker/postgres/init/`
holds its first-run initialization hook):

```text
docker compose up -d georesponse-db
        │
        ▼
PostgreSQL 16 + PostGIS 3.4 container
  - exposed on localhost:5432
  - named volume (georesponse-db-data) for persistence across restarts
  - POSTGIS extension available, enabled by migration 0001
  - on a brand-new volume, docker/postgres/init applies every migration
    and seed file once (DATABASE_MIGRATIONS.md section 4)
```

Typical local workflow against a natively installed database, or against
the container when adding a migration after its volume already exists:

```text
1. docker compose up -d georesponse-db   # start the database container
2. scripts/database/migrate.sh           # apply schema migrations
   (or migrate.ps1 on Windows)
3. scripts/database/seed.sh              # load local sample data
   (or seed.ps1 on Windows)
4. run the Go backend against the local database
```

With `APP_ENV=development` the backend also applies any pending migration
itself at start-up, so step 2 is only needed when running the migration
scripts or seeds by hand.

The backend and every script read the connection string from the
`DATABASE_URL` environment variable (required; format
`postgres://user:password@host:5432/dbname?sslmode=disable`, e.g.
`postgres://georesponse:georesponse_dev_password@localhost:5432/georesponse?sslmode=disable`
for the compose defaults in `.env.example`), so the same binary can point
at a locally Dockerized database or, if a contributor prefers, a natively
installed PostgreSQL + PostGIS instance, without code changes.

---

## 4. Connection Pooling

As described in `DATABASE_ARCHITECTURE.md` section 4, the backend maintains
one `pgxpool` connection pool per process.

Operationally, for the scale of a take-home application:

- Pool size is left at `pgxpool`'s defaults (max connections = the greater
  of 4 and the CPU count) — there is no expectation of concurrent load
  that would require tuning. If it ever does, `pgxpool` reads
  `pool_max_conns` / `pool_min_conns` as query parameters on
  `DATABASE_URL`; no separate configuration variable exists.
- The pool is created once at startup and reused for the life of the
  process; it is not recreated per request.
- No external pooler (PgBouncer) is introduced. A single backend process
  talking to a single local database does not exhaust Postgres's own
  connection limit, so an additional pooling layer would be infrastructure
  without a corresponding need (`TECHNOLOGY_SELECTION.md` section 3.6).

---

## 5. Indexing Strategy

Indexes are added to support the query patterns implied by
`BUSINESS_RULES.md` (BR-043 to BR-045, resource discovery and filtering) and
the map view (`BUSINESS_RULES.md` BR-046).

| Column(s) | Index type | Supports |
|---|---|---|
| `resources.type` | B-tree | Filtering by resource type (BR-044) |
| `resources.status` | B-tree | Filtering by resource status (BR-044) |
| `resources.location` | GIST (spatial) | Bounding-box / map-viewport queries, distance queries (`ST_DWithin`), consistent with the PostGIS rationale in `TECHNOLOGY_SELECTION.md` §10.1 |
| `resource_status_history.resource_id` | B-tree | Looking up a resource's status history (BR-008) |
| `resource_location_history.resource_id` | B-tree | Looking up a resource's location history (BR-014) |
| `resource_change_history.resource_id` | B-tree | Looking up a resource's change history (BR-017) |
| `audit_records.resource_id` | B-tree | Looking up audit entries for a resource |
| `audit_records.user_id` | B-tree | Looking up audit entries for a user |
| `audit_records.occurred_at` | B-tree | Chronological audit queries |

Example spatial index, used for bounding-box map queries:

```sql
CREATE INDEX idx_resources_location
    ON resources
    USING GIST (location);
```

Example combined-filter query this supports (type + status + viewport,
matching BR-045's requirement that combined filters narrow the result set).
The viewport predicate is illustrative of what the GIST index enables; the
current `GET /api/v1/resources` filters on `type`, `status`, and a
case-insensitive name `search` only, and the map view renders the full
result set client-side:

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

No additional indexes (e.g. on `attributes` JSONB paths) are introduced
speculatively. If a specific attribute-based filter becomes a real
requirement, a targeted `GIN` index on `attributes` (or a generated column
for that one field) can be added as its own migration at that time.

---

## 6. Backup and Restore

Given the take-home scope (a local database with no production deployment),
backup/restore relies on PostgreSQL's standard tooling rather than a custom
backup service:

```bash
# Backup (custom format, compressed, suitable for pg_restore)
pg_dump -Fc -h localhost -U georesponse -d georesponse -f georesponse.dump

# Restore into a fresh database
pg_restore -h localhost -U georesponse -d georesponse --clean --if-exists georesponse.dump
```

This is sufficient to let a contributor snapshot their local database before
a risky migration test, or share a reproducible dataset. Point-in-time
recovery, continuous archiving (WAL shipping), and automated backup
scheduling are not implemented, as they address availability requirements
this take-home project does not have.

---

## 7. Health Checks and Monitoring

At take-home scope, "monitoring" means the backend can answer whether the
database is reachable, not a metrics/alerting stack.

- The backend exposes a basic health endpoint (`GET /health`) that pings
  the pool (`pgxpool.Pool.Ping`) and reports database connectivity as part
  of overall service health; the compose file uses it as the backend's
  health check.
- Startup fails fast (see `DATABASE_ARCHITECTURE.md` section 4) rather than
  serving traffic against a database it cannot reach.
- Slow-query logging is left to PostgreSQL's own configuration
  (`log_min_duration_statement`) when a contributor needs to debug locally;
  no dedicated APM/tracing integration is added, consistent with avoiding
  infrastructure the project's non-functional requirements do not call for.

---

## 8. Environment Separation

| Concern | Local Development | Staging / Production |
|---|---|---|
| Exists for this project? | Yes | No — out of scope |
| Database | Dockerized PostgreSQL + PostGIS | N/A |
| Migrations | `scripts/database/migrate.sh` / `.ps1` | N/A |
| Seeding | `scripts/database/seed.sh` / `.ps1` | N/A |
| Backup | Manual `pg_dump` as needed | N/A |

Only the "Local Development" column is real for this submission. The table
is included to make explicit that the absence of staging/production is a
deliberate scope boundary, not an oversight.

---

## 9. Scope Boundary

This document does not cover:

- the migration workflow itself (see `DATABASE_MIGRATIONS.md`);
- table/column definitions (see `DATABASE_SCHEMA.md`);
- the layered-architecture rationale for using PostgreSQL + PostGIS at all
  (see `DATABASE_ARCHITECTURE.md` and `TECHNOLOGY_SELECTION.md` §10);
- production infrastructure, since none exists for this take-home.

---

## 10. Operations Principle

> Operational tooling should match the project's actual deployment reality —
> a single local database — rather than simulate infrastructure that does
> not exist.
