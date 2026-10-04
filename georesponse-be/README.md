# GeoResponse Backend

GeoResponse is a geospatial resource management application for disaster
response. This package is the Go backend: Go + Chi + PostgreSQL/PostGIS,
serving the REST/JSON API used by the `georesponse-fe` React frontend.

This README covers how to run, test, and build the backend. For background,
see [`TECHNOLOGY_SELECTION.md`](../docs/05_engineering/TECHNOLOGY_SELECTION.md)
(technology choices),
[`BACKEND_ARCHITECTURE.md`](../docs/07_backend/BACKEND_ARCHITECTURE.md)
(package layout and layering), and
[`API_CONTRACT.md`](../docs/04_contracts/API_CONTRACT.md) (the HTTP
surface).

## Implementation Status

The backend is fully runnable and implements every `/api/v1` endpoint in
`API_CONTRACT.md` plus `GET /health`. What is partial or not demonstrated
is listed in
[`docs/01_product/SCOPE.md` section 11](../docs/01_product/SCOPE.md#11-implementation-status-at-submission).

## Prerequisites

- Go 1.26 or later (`go.mod` declares `go 1.26.0`; CI and the `Dockerfile`
  use 1.26)
- PostgreSQL 15+ with the **PostGIS** extension available
- Docker and Docker Compose (optional, for running PostgreSQL/PostGIS
  locally without a native install)

## Configuration

The service reads configuration from environment variables. Two are
required:

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://georesponse:georesponse_dev_password@localhost:5432/georesponse?sslmode=disable` |
| `TOKEN_SECRET` | HMAC secret for authentication tokens (confidential) | local-dev placeholder only |

Everything else (`HTTP_PORT`, `APP_ENV`, `LOG_LEVEL`, `MIGRATIONS_DIR`,
`CORS_ALLOWED_ORIGINS`, `TOKEN_TTL`, `BMKG_BASE_URL`, `BMKG_TIMEOUT`) has a
default. `APP_ENV=development`, the default, also applies pending
migrations at start-up. The full reference with defaults is in
[`ENVIRONMENT_MANAGEMENT.md` section 5](../docs/11_devops/ENVIRONMENT_MANAGEMENT.md#5-variables-that-differ-per-environment).

The process refuses to start, with an error naming the variable, when a
required variable is missing or malformed (`internal/platform/config`).
Copy `.env.example` to `.env` (gitignored) and load it into your shell
before `go run` (see [Running the Server](#running-the-server)). Do not
commit real credentials.

## Database Setup

The schema lives under `database/migrations` at the repository root and is
managed through the scripts in `scripts/database/`. Run all `scripts/`
commands from the repository root. The migration scripts need the
golang-migrate CLI on `PATH`
(`go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest`) and
`DATABASE_URL` set:

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

The migrations assume the PostGIS extension is available
(`CREATE EXTENSION IF NOT EXISTS postgis;`).

For a disposable local database instead of a native install, start only the
PostGIS service from the root compose file with
`docker compose up -d georesponse-db`. It listens on `localhost:5432` with
the credentials from the root `.env`, and on a brand-new volume it applies
every migration and seed file itself. Point `DATABASE_URL` at it before
running the scripts above or `go run`.

With `APP_ENV=development`, the server also applies any pending migration
from `MIGRATIONS_DIR` at start-up, so after the first setup `go run` alone
keeps the schema current.

## Running the Server

```bash
go mod download
go run ./cmd/api
```

The API is then reachable at `http://localhost:${HTTP_PORT}/api/v1/...`,
and `GET http://localhost:${HTTP_PORT}/health` returns
`{"status":"ok","database":"ok"}` once the database is reachable.

Two things to know when running the binary directly:

- The process reads real environment variables only; it does not load
  `.env` by itself. Export the file first (Git Bash: `set -a; source .env;
  set +a`, PowerShell: `Get-Content .env | ForEach-Object { if ($_ -match
  '^([^#=]+)=(.*)$') { Set-Item "env:$($matches[1])" $matches[2] } }`),
  otherwise start-up fails with `config: DATABASE_URL is required`.
- If the Docker stack from `./run.sh` / `.\run.ps1` is up, its backend
  container already publishes port 8080 and `go run` fails with `bind:
  Only one usage of each socket address`. Either stop the stack first
  (`./run.sh --down` / `.\run.ps1 -Down`) or run the local binary on
  another port with `HTTP_PORT=8081 go run ./cmd/api` (both can share the
  compose database on `localhost:5432`). Point the frontend at it with
  `API_BASE_URL=http://localhost:8081/api/v1`.

For a repeatable local setup (env file, dependency install, database
bootstrap), use the project script:

```bash
./scripts/dev/setup.sh
# Windows: scripts\dev\setup.ps1
```

## Running Tests

```bash
go test ./...
```

or, through the project-wide entry point (frontend and backend unit tests,
plus `tests/integration/` when `GEORESPONSE_API_URL` is set; it does not
provision a database):

```bash
./scripts/dev/test.sh
# Windows: scripts\dev\test.ps1
```

Domain, application, and handler tests run without a database. Repository
tests need a migrated PostGIS database and skip unless `DATABASE_URL`
points at one (the migration-runner test in `internal/platform/postgres`
reads `TEST_DATABASE_URL` instead). See
[`BACKEND_TESTING.md`](../docs/07_backend/BACKEND_TESTING.md) for the
testing approach.

## Code Quality

```bash
gofmt -l .
go vet ./...
```

or through the project-wide entry point:

```bash
./scripts/quality/check.sh
# Windows: scripts\quality\check.ps1
```

Go rules are in
[`CODING_STANDARDS.md`](../docs/05_engineering/CODING_STANDARDS.md)
section 14 and naming conventions in
[`BACKEND_NAMING.md`](../docs/07_backend/BACKEND_NAMING.md).

## Tech Stack

| Area | Technology |
|---|---|
| Language | Go |
| HTTP routing | Chi + `net/http` |
| API style | REST + JSON, versioned at `/api/v1` |
| Database | PostgreSQL + PostGIS (via `pgx`) |
| Testing | Go standard `testing` package |

## Project Structure

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

The full package layout, routing, and middleware chain are in
[`BACKEND_ARCHITECTURE.md`](../docs/07_backend/BACKEND_ARCHITECTURE.md).

## Docker

Build the backend image:

```bash
./scripts/docker/build.sh --be-only
# Windows: scripts\docker\build.ps1 -BeOnly
```

or let the root `docker-compose.yml` build and run it together with PostGIS
and the frontend (`./run.sh` / `.\run.ps1` at the repository root). Image
design and runtime configuration are described in
[`CONTAINERIZATION.md`](../docs/11_devops/CONTAINERIZATION.md).
