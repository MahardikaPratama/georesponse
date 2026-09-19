# georesponse-be

Backend service for **GeoResponse** — a geospatial resource management
application for disaster response. Go + Chi + PostgreSQL/PostGIS, serving a
REST/JSON API to the `georesponse-fe` React frontend.

For the full technology rationale, see
[`docs/05_engineering/TECHNOLOGY_SELECTION.md`](../docs/05_engineering/TECHNOLOGY_SELECTION.md).
For package layout and layering, see
[`docs/07_backend/BACKEND_ARCHITECTURE.md`](../docs/07_backend/BACKEND_ARCHITECTURE.md).
For the exact HTTP surface, see
[`docs/04_contracts/API_CONTRACT.md`](../docs/04_contracts/API_CONTRACT.md).

This README is practical, not a spec — it exists to get the service running
locally and to run its tests.

---

## 0. Implementation Status

This package is implemented: `go.mod` (module
`github.com/mahardika-pratama/georesponse-be`), `cmd/api` (entry point with
config validation, start-up migrations in development, graceful shutdown),
`internal/http` (Chi router, middleware, every `/api/v1` handler in
`API_CONTRACT.md`, `GET /health`), the feature packages (`resource`,
`resourcehistory`, `auth`, `authorization`, `audit`, `hotspot`),
`internal/platform` (config, logging, pgx pool, migration runner, BMKG
client), and `internal/repository/postgres`. The `Dockerfile` builds a
runnable image; `docker-compose.yml` at the repository root runs it with
PostGIS and the frontend. The commands below work as documented. See the
root [`README.md`](../README.md#implementation-status) for the overall
project status across all packages.

---

## 1. Prerequisites

- Go 1.26 or later (`go.mod` declares `go 1.26.0`; CI and the `Dockerfile` use 1.26)
- PostgreSQL 15+ with the **PostGIS** extension available
- Docker and Docker Compose (optional, for running PostgreSQL/PostGIS
  locally without a native install)

Check your Go version:

```bash
go version
```

---

## 2. Configuration

The service reads configuration from environment variables. A typical local
setup:

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required) | `postgres://georesponse:georesponse_dev_password@localhost:5432/georesponse?sslmode=disable` |
| `TOKEN_SECRET` | HMAC secret for authentication tokens (required, confidential) | local-dev placeholder only |
| `HTTP_PORT` | Port the HTTP server listens on | `8080` |
| `APP_ENV` | Runtime environment name; `development` also applies pending migrations at start-up | `development` |
| `LOG_LEVEL` | `debug`, `info`, `warn`, or `error` | `debug` |
| `MIGRATIONS_DIR` | Migration files applied at start-up in development | `../database/migrations` |
| `CORS_ALLOWED_ORIGINS`, `TOKEN_TTL`, `BMKG_BASE_URL`, `BMKG_TIMEOUT` | See `.env.example` | |

The process refuses to start, with an error naming the variable, when a
required variable is missing or malformed (`internal/platform/config`).
Copy `.env.example` to `.env` (gitignored) and load it into your shell
before `go run` — for example `set -a && source .env && set +a` in bash —
or export the variables directly. Do not commit real credentials. The full
variable reference is
[`docs/11_devops/ENVIRONMENT_MANAGEMENT.md`](../docs/11_devops/ENVIRONMENT_MANAGEMENT.md)
section 5.2.

---

## 3. Database Setup

The database schema lives under `database/migrations` at the repository
root, and is managed through the cross-platform scripts in
`scripts/database/`. All `scripts/` commands in this README are run from
the repository root, and the migration scripts need the golang-migrate
CLI on `PATH` (`go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest`)
plus `DATABASE_URL` set:

```bash
# Apply all pending migrations
./scripts/database/migrate.sh
# Windows: scripts\database\migrate.ps1

# Roll back the most recent migration, if needed
./scripts/database/rollback.sh
# Windows: scripts\database\rollback.ps1

# Load baseline/sample data (resources, roles, permissions) for local development
./scripts/database/seed.sh
# Windows: scripts\database\seed.ps1
```

Run migrations against a database that already has the PostGIS extension
enabled (`CREATE EXTENSION IF NOT EXISTS postgis;`) — the migrations assume
PostGIS types/functions are available.

If you prefer a disposable local database instead of a native PostgreSQL
install, start only the PostGIS service from the root compose file —
`docker compose up -d georesponse-db` — which exposes it on
`localhost:5432` with the credentials from the root `.env`; on a brand-new
volume it also applies every migration and seed file itself. Point
`DATABASE_URL` at it before running the scripts above or `go run`.

When `APP_ENV=development`, the server also applies any pending migration
from `MIGRATIONS_DIR` at start-up, so after the first setup `go run` alone
keeps the schema current.

---

## 4. Running the Server

```bash
go mod download
go run ./cmd/api
```

The API is then reachable at `http://localhost:${HTTP_PORT}/api/v1/...`,
matching the versioned base path defined in `API_CONTRACT.md` section 2,
and `GET http://localhost:${HTTP_PORT}/health` reports `{"status":"ok",
"database":"ok"}` once the database is reachable.

For a repeatable local environment setup (env file, dependency install,
database bootstrap), prefer the project scripts:

```bash
./scripts/dev/setup.sh
# Windows: scripts\dev\setup.ps1
```

---

## 5. Running Tests

```bash
go test ./...
```

or, using the project-standard entry point (runs the frontend and backend
unit tests, plus `tests/integration/` when `GEORESPONSE_API_URL` is set;
it does not provision a database):

```bash
./scripts/dev/test.sh
# Windows: scripts\dev\test.ps1
```

Domain and application-layer tests run without a database. Repository tests
that exercise real PostgreSQL/PostGIS queries need a migrated database and
self-skip unless `DATABASE_URL` points at one (the migration-runner test in
`internal/platform/postgres` reads `TEST_DATABASE_URL` instead). See
[`docs/07_backend/BACKEND_TESTING.md`](../docs/07_backend/BACKEND_TESTING.md)
for the full testing strategy.

---

## 6. Code Quality

```bash
gofmt -l .
go vet ./...
```

or via the project-standard entry point:

```bash
./scripts/quality/check.sh
# Windows: scripts\quality\check.ps1
```

See
[`docs/05_engineering/CODING_STANDARDS.md`](../docs/05_engineering/CODING_STANDARDS.md)
section 14 for Go-specific rules, and
[`docs/07_backend/BACKEND_NAMING.md`](../docs/07_backend/BACKEND_NAMING.md)
for naming conventions.

---

## 7. Tech Stack Summary

| Concern | Choice |
|---|---|
| Language | Go |
| HTTP Routing | Chi + `net/http` |
| API Style | REST + JSON, versioned at `/api/v1` |
| Database | PostgreSQL + PostGIS |
| Testing | Go standard `testing` package |

Full rationale for each decision is in
[`docs/05_engineering/TECHNOLOGY_SELECTION.md`](../docs/05_engineering/TECHNOLOGY_SELECTION.md).

---

## 8. Project Structure

See
[`docs/07_backend/BACKEND_ARCHITECTURE.md`](../docs/07_backend/BACKEND_ARCHITECTURE.md)
for the full package layout, routing setup, and middleware chain. In short:

```text
cmd/api           → process entry point, dependency wiring
internal/http     → router and handlers; middleware/ and httpresponse/ helpers
internal/platform → config/, logging/, postgres/ (pgx pool + migration
                    runner), transaction/, idgen/, bmkg/ (BMKG HTTP client)
internal/resource, internal/resourcehistory, internal/auth,
internal/authorization, internal/audit, internal/hotspot
                  → feature packages (domain + use case)
internal/repository/postgres
                  → PostgreSQL/PostGIS repository implementations
internal/repository/bmkg
                  → BMKG GeoHotspot repository implementation
scripts/hashpw    → helper to generate a bcrypt password hash for seed data
```

---

## 9. Containerized Build

The `Dockerfile` in this directory is a two-stage build: `golang:1.26-alpine`
compiles a static binary, and a minimal Alpine runtime image runs it as a
non-root user (see
[`docs/11_devops/CONTAINERIZATION.md`](../docs/11_devops/CONTAINERIZATION.md)).
Nothing environment-specific is baked in; every setting comes from the
environment at start-up, and `.dockerignore` keeps `.env` out of the build
context. Build it with:

```bash
./scripts/docker/build.sh --be-only
# Windows: scripts\docker\build.ps1 -BeOnly
```

or let the root `docker-compose.yml` build and run it together with PostGIS
and the frontend (`./run.sh` / `.\run.ps1` at the repository root). In the
compose stack, `database/migrations` is bind-mounted at `/migrations` and
`MIGRATIONS_DIR` points there.
