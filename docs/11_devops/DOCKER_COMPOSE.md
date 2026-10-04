# Docker Compose

## 1. Purpose

This document describes how GeoResponse's frontend, backend, and database
run together locally with Docker Compose, and owns the local ports and run
commands. A single root-level `docker-compose.yml` is enough for a modular
monolith with three runtime components. It is a local development
definition only: there are no per-environment override files (only one
environment exists, see `ENVIRONMENT_MANAGEMENT.md`) and no Swarm or
multi-host orchestration. Image design is in `CONTAINERIZATION.md`.

---

## 2. Files

- `docker-compose.yml` (repository root): defines `georesponse-db`,
  `georesponse-be`, and `georesponse-fe`. The file and its header comments
  are the source of truth for the service definitions summarized in
  section 5.
- `docker/postgres/init/01-init-schema-and-seeds.sh`: the one-time database
  initialization script mounted into the PostGIS container (section 6.1).
- `georesponse-fe/nginx.conf`: the frontend runtime image's nginx server
  block, kept next to its Dockerfile because the build context is
  `georesponse-fe/`.
- `run.sh` / `run.ps1`: the one-command wrapper (section 7.1).

---

## 3. Service Topology

```text
┌───────────────────────────────────────────────────────────┐
│                     docker compose up                       │
└───────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌────────────────────┐
│  georesponse-fe │    │  georesponse-be │    │   georesponse-db     │
│  (nginx:alpine) │    │  (Go binary)     │    │   (postgis/postgis)  │
│  port 5173→80   │───▶│  port 8080       │───▶│   port 5432           │
└───────────────┘    └───────────────┘    └────────────────────┘
                              depends_on:              volumes:
                              db (healthy)              - db data
                                                          - migrations
```

The browser loads the frontend from nginx and calls the backend directly at
`API_BASE_URL`; nginx does not proxy the API.

---

## 4. Start-Up Order

Both dependencies use `depends_on` with `condition: service_healthy`:

1. `georesponse-db` must pass its `pg_isready` healthcheck before
   `georesponse-be` starts.
2. `georesponse-be` must pass its `GET /health` healthcheck (which pings the
   database) before `georesponse-fe` starts.

The stack therefore comes up in a working order without manual
intervention.

---

## 5. Service Definitions

| Service | Image | Key settings |
| --- | --- | --- |
| `georesponse-db` | `postgis/postgis:16-3.4` | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from `.env`; named volume `georesponse-db-data`; init mounts (section 6.1); TCP `pg_isready` healthcheck |
| `georesponse-be` | built from `georesponse-be/`, tagged `georesponse-be:${IMAGE_TAG:-latest}` | `APP_ENV`, `HTTP_PORT`, `DATABASE_URL` (built from the `POSTGRES_*` values, host `georesponse-db`), `LOG_LEVEL`, `TOKEN_SECRET`, `TOKEN_TTL`, `CORS_ALLOWED_ORIGINS`, `MIGRATIONS_DIR=/migrations`; `database/migrations` mounted read-only at `/migrations`; `wget` healthcheck on `/health` |
| `georesponse-fe` | built from `georesponse-fe/`, tagged `georesponse-fe:${IMAGE_TAG:-latest}` | `build.args` `API_BASE_URL`, `MAP_TILE_URL`, `LOG_LEVEL` (inlined into the bundle at build time, see `CONTAINERIZATION.md` section 4) |

All services use `restart: unless-stopped`. The `IMAGE_TAG` substitution
lets `scripts/deployment/deploy.sh --tag` start a specific image tag (see
`DEPLOYMENT.md` section 4). Variable meanings and defaults are in
`ENVIRONMENT_MANAGEMENT.md` section 5.

---

## 6. Configuration Details

### 6.1 Database Volume and First-Run Initialization

- `georesponse-db-data` is a named volume, so data survives
  `docker compose down` / `up`. Only `docker compose down -v` removes it.
- On first initialization of an empty volume, the PostGIS image runs the
  scripts in `docker-entrypoint-initdb.d`. The compose file mounts
  `docker/postgres/init/` there, plus `database/migrations` and
  `database/seeds` read-only at `/georesponse/migrations` and
  `/georesponse/seeds`. The init script applies every `*.up.sql`, records
  the version in `schema_migrations`, and loads every seed file, so a new
  stack starts with demo resources and the demo login accounts.
- The migration directories are not mounted directly into
  `docker-entrypoint-initdb.d` because the entrypoint only runs top-level
  files there and would also run the `.down.sql` files.
- This hook only covers a brand-new volume. Schema updates on an existing
  volume come from the backend start-up runner (section 6.5) or
  `scripts/database/migrate.sh` / `.ps1`. See
  `docs/08_database/DATABASE_MIGRATIONS.md` section 4.

### 6.2 Health Checks

- Database: `pg_isready -h 127.0.0.1`. It runs over TCP because during
  first-run initialization the image starts a temporary server that only
  listens on the unix socket; a socket check would report healthy before
  migrations and seeds finish.
- Backend: `wget -qO- http://localhost:${HTTP_PORT}/health` inside the
  container. The endpoint contract is in `DEPLOYMENT.md` section 6.
- Frontend: no compose healthcheck; the image defines its own `HEALTHCHECK`
  (`CONTAINERIZATION.md` section 4).

### 6.3 Ports

| Service | Container port | Host port | Notes |
| --- | --- | --- | --- |
| `georesponse-fe` | 80 (nginx) | 5173 | Matches the usual local frontend dev port |
| `georesponse-be` | `HTTP_PORT` (default 8080) | same as container port | REST API; both sides follow `HTTP_PORT` from the root `.env` |
| `georesponse-db` | 5432 | 5432 | Standard Postgres port |

### 6.4 Environment Variables

Every value is substituted from the root `.env`, which `docker compose`
loads automatically from the directory of `docker-compose.yml`. Each
variable has an obviously fake `${VAR:-default}` fallback so the stack still
starts if `.env` is missing; `run.sh` / `run.ps1` create `.env` from
`.env.example` on first run. The `.env` convention is in
`ENVIRONMENT_MANAGEMENT.md` section 6.

### 6.5 Automatic Migration on Backend Start-Up

With `APP_ENV=development` (the compose default), `cmd/api/main.go` calls
`internal/platform/postgres.Migrate` before binding the HTTP port. It reads
`NNNN_*.up.sql` files from `MIGRATIONS_DIR` (`/migrations`, bind-mounted
read-only from `database/migrations`), applies each one newer than the
recorded version in `schema_migrations`, and refuses to start if that row is
`dirty`. This is why `./run.sh` and `docker compose up` produce a migrated
stack with no separate migration step. Full behaviour, including how it
coexists with the CLI scripts, is in
`docs/08_database/DATABASE_MIGRATIONS.md` section 4.

Auto-migration is limited to development. For any other `APP_ENV`,
migration is a separate step before deployment (`DEPLOYMENT.md` section 5).

---

## 7. Running the Stack Locally

### 7.1 Recommended: `run.sh` / `run.ps1`

```bash
./run.sh        # macOS/Linux
```

```powershell
.\run.ps1       # Windows
```

The script checks that Docker and the Compose v2 plugin are installed and
the daemon is running, creates the three `.env` files from their examples
(never overwriting an existing one), runs
`docker compose up --build --detach --wait`, and prints the access URLs and
the demo login. Options:

- `./run.sh --foreground` (`.\run.ps1 -Foreground`): stay attached to the
  compose logs.
- `./run.sh --down` (`.\run.ps1 -Down`): stop the stack and keep the
  database volume.

### 7.2 Manual Steps

```text
1. Copy environment defaults (run.sh/run.ps1 does this automatically,
   skipping any .env that already exists):
     cp georesponse-fe/.env.example georesponse-fe/.env
     cp georesponse-be/.env.example georesponse-be/.env
     cp .env.example .env

2. Build and start the full stack:
     docker compose up --build

3. Wait for georesponse-db to report healthy, then georesponse-be starts,
   then georesponse-fe starts.

4. Access the application:
     Frontend  → http://localhost:5173
     Backend   → http://localhost:8080/api/v1
     Health    → http://localhost:8080/health

5. Migrations run automatically at backend start-up (section 6.5). To run
   them separately, for example against a database outside this compose
   file, use scripts/database/migrate.sh (or migrate.ps1).

6. Stop the stack:
     docker compose down
     (add -v to also remove the database volume)
```

This single-command setup meets NFR-DEP-001 (reproducible environment) and
NFR-DEP-002 (frontend and backend run through the documented
containerization approach).
