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

This package does not yet have a `go.mod` or any Go source under
`cmd/`/`internal/`; the `database/`, `docker/`, and `scripts/` assets this
README references are also placeholders (see the root
[`README.md`](../README.md#implementation-status) for the full list). The
sections below describe the intended setup once implementation is complete;
they will not run against the repository in its current state.

---

## 1. Prerequisites

- Go 1.22 or later
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
| `DATABASE_URL` | PostgreSQL connection string | `postgres://georesponse:georesponse@localhost:5432/georesponse?sslmode=disable` |
| `APP_PORT` | Port the HTTP server listens on | `8080` |
| `APP_ENV` | Runtime environment name | `development` |

Copy a `.env.example` into `.env` if one is present in this directory once
the project is initialized, or export the variables directly in your shell.
Do not commit real credentials.

---

## 3. Database Setup

The database schema lives under `database/migrations` at the repository
root, and is managed through the cross-platform scripts in
`scripts/database/`:

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
install, use the Docker setup under `docker/` (see
`scripts/docker/build.sh` / `build.ps1`) to start a PostgreSQL + PostGIS
container, then point `DATABASE_URL` at it before running the scripts above.

---

## 4. Running the Server

Once `go.mod` is initialized and dependencies are fetched:

```bash
go mod download
go run ./cmd/api
```

The API is then reachable at `http://localhost:${APP_PORT}/api/v1/...`,
matching the versioned base path defined in `API_CONTRACT.md` section 2.

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

or, using the project-standard entry point (also provisions a test
database where needed):

```bash
./scripts/dev/test.sh
# Windows: scripts\dev\test.ps1
```

Domain and application-layer tests run without a database. Repository tests
that exercise real PostgreSQL/PostGIS queries require a migrated test
database (`scripts/database/migrate.sh`) and self-skip otherwise. See
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
cmd/api          → process entry point, dependency wiring
internal/http     → router, middleware, response helpers
internal/platform → config, DB connection, logging
internal/resource, internal/auth, internal/authorization,
internal/audit, internal/resourcehistory
                  → feature packages (domain + use case + handler)
internal/repository/postgres
                  → PostgreSQL/PostGIS repository implementations
```

---

## 9. Containerized Build

A `Dockerfile` is provided in this directory for building a production
container image. Build it with:

```bash
./scripts/docker/build.sh
# Windows: scripts\docker\build.ps1
```

The module path (`module ...` in `go.mod`) is set when the module is
initialized (`go mod init github.com/<org>/georesponse-be`) and should match
wherever this repository is hosted; adjust the placeholder above if it
differs from what is actually declared in `go.mod`.
