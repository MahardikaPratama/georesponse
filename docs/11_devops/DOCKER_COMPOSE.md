# Docker Compose

## 1. Purpose

This document defines how GeoResponse's frontend, backend, and database are orchestrated together for local development using Docker Compose.

Because the application is a modular monolith with exactly three runtime components (frontend, backend, database), a single `docker compose` file is sufficient orchestration. No service mesh, orchestrator, or multi-cluster setup is needed.

---

## 2. Scope Boundary

In scope:

- A single root-level `docker-compose.yml` wiring together `georesponse-fe`, `georesponse-be`, and a `postgis/postgis` database service.
- Local development and take-home evaluation use only — not a production orchestration definition.
- Volume-based database persistence and a healthcheck for the database service.

Out of scope:

- Multiple compose override files for different environments (`docker-compose.prod.yml`, etc.) — only one environment (local/dev) currently exists, per `ENVIRONMENT_MANAGEMENT.md`.
- Compose Swarm mode or any multi-host orchestration.

---

## 3. Current State

The repository has an empty `docker/` directory (`docker/.gitkeep`) reserved for shared Docker configuration, and no `docker-compose.yml` exists yet at the repository root. This document defines the intended location and content of that file as an implementation artifact still to be created:

- `docker-compose.yml` — intended to live at the repository root (or inside `docker/`, referenced from the root via a short wrapper, if the team prefers to keep root-level clutter down). This document assumes the root-level location, since that is what `docker compose up` looks for by default without extra flags.
- `docker/` — intended to hold any shared configuration the compose file references, such as an `nginx.conf` for the frontend runtime image, or a `postgres/init/` directory for one-time database initialization scripts.

---

## 4. Service Topology

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

`georesponse-be` depends on `georesponse-db` being healthy before starting, and `georesponse-fe` depends on `georesponse-be` being available, so that the compose stack comes up in a working order without manual intervention.

---

## 5. Illustrative `docker-compose.yml`

```yaml
# docker-compose.yml (illustrative — intended root-level file, not yet created)
# Reads ./.env automatically (docker compose's default behavior for a file
# named ".env" next to the compose file) — see section 6.4 and
# ENVIRONMENT_MANAGEMENT.md section 6 for the root .env/.env.example pair
# this file depends on. No credential is hardcoded below; the ${VAR:-default}
# fallbacks exist only so the stack still starts with an obviously-fake value
# if a developer runs `docker compose up` without creating .env first —
# ./run.sh always creates it from .env.example, so this fallback path should
# not normally be exercised.
name: georesponse

services:
  georesponse-db:
    image: postgis/postgis:16-3.4
    container_name: georesponse-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-georesponse}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-georesponse_dev_password}
      POSTGRES_DB: ${POSTGRES_DB:-georesponse}
    ports:
      - "5432:5432"
    volumes:
      - georesponse-db-data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d/migrations:ro
      - ./database/seeds:/docker-entrypoint-initdb.d/seeds:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-georesponse} -d ${POSTGRES_DB:-georesponse}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  georesponse-be:
    build:
      context: ./georesponse-be
      dockerfile: Dockerfile
    container_name: georesponse-be
    restart: unless-stopped
    environment:
      APP_ENV: ${APP_ENV:-development}
      HTTP_PORT: ${HTTP_PORT:-8080}
      DATABASE_URL: postgres://${POSTGRES_USER:-georesponse}:${POSTGRES_PASSWORD:-georesponse_dev_password}@georesponse-db:5432/${POSTGRES_DB:-georesponse}?sslmode=disable
      LOG_LEVEL: ${LOG_LEVEL:-debug}
    ports:
      - "8080:8080"
    depends_on:
      georesponse-db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 5s

  georesponse-fe:
    build:
      context: ./georesponse-fe
      dockerfile: Dockerfile
    container_name: georesponse-fe
    restart: unless-stopped
    environment:
      API_BASE_URL: ${API_BASE_URL:-http://localhost:8080/api/v1}
    ports:
      - "5173:80"
    depends_on:
      georesponse-be:
        condition: service_started

volumes:
  georesponse-db-data:
```

---

## 6. Notes on the Sketch Above

### 6.1 Database Volume and Migrations

- `georesponse-db-data` is a named volume providing persistence across `docker compose down`/`up` cycles (data is only lost on an explicit `docker compose down -v`).
- `database/migrations` and `database/seeds` are mounted read-only into Postgres's `docker-entrypoint-initdb.d`, which the official Postgres/PostGIS image runs automatically **only on first container initialization** (an empty data volume) — this is a convenience for a brand-new volume, not the primary migration mechanism. On every subsequent `georesponse-be` startup, the backend itself applies any pending migrations before it starts serving requests (section 6.5), so the schema is always current without a manual step. `scripts/database/migrate.sh`/`.ps1` remain available for running migrations independently of starting the server (see `DATABASE_MIGRATIONS.md`).

### 6.2 Health Checks

- The database healthcheck uses `pg_isready`, the standard Postgres readiness probe, and gates `georesponse-be`'s startup via `depends_on: condition: service_healthy`.
- The backend healthcheck calls its own `/health` endpoint (see `DEPLOYMENT.md`), satisfying NFR-AVAIL-002 (the backend must expose sufficient health information) and NFR-OBS-003 (operational visibility) at the container level.

### 6.3 Ports

| Service | Container Port | Host Port | Notes |
|---|---|---|---|
| `georesponse-fe` | 80 (nginx) | 5173 | Chosen to match a typical local frontend dev port; adjustable |
| `georesponse-be` | 8080 | 8080 | REST API |
| `georesponse-db` | 5432 | 5432 | Standard Postgres port |

### 6.4 Environment Variables

The compose file no longer hardcodes any value — every variable is substituted from a root-level `.env` file (which `docker compose` loads automatically when it sits next to `docker-compose.yml`), with an obviously-fake `${VAR:-default}` fallback only so the stack still starts if `.env` is missing. `run.sh`/`run.ps1` create this file from `.env.example` on first run. The `${...:-default}` values shown in section 5 (`georesponse_dev_password`, etc.) are local-development-only placeholders, never a real secret, and are never committed in their real form. See `ENVIRONMENT_MANAGEMENT.md` section 6 for the full `.env`/`.env.example` convention, including the root-level pair this compose file reads.

### 6.5 Automatic Migration on Backend Startup

When `APP_ENV=development` (the value set for `georesponse-be` in section 5), the backend's entrypoint applies pending database migrations before it binds its HTTP port. This is what lets `./run.sh` / `docker compose up` bring up a fully migrated, ready-to-use stack with no separate migration step for local development.

This behavior is intentionally scoped to local/dev: `DEPLOYMENT.md` keeps migration as an explicit, separate step ahead of a real deployment, since auto-migrating on every process start is a reasonable local-development convenience but not a safe default for an environment with real data.

---

## 7. Running the Stack Locally

### 7.1 Recommended: `run.sh` / `run.ps1`

Once implemented, a single wrapper script at the repository root is the
recommended entry point:

```bash
./run.sh        # macOS/Linux
```

```powershell
.\run.ps1       # Windows
```

The script performs steps 1–3 and 5 below automatically (env setup, build,
start, and schema migration), so a developer only runs one command. Section
7.2 documents what it does under the hood — useful for debugging or for
running the stack without the wrapper.

### 7.2 Manual / Under-the-Hood Steps

```text
1. Copy environment defaults (run.sh/run.ps1 does this automatically,
   skipping any .env that already exists so local overrides are preserved):
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

5. Database migrations run automatically as part of georesponse-be's
   container startup (see section 6.5) when APP_ENV=development, so no
   separate migration step is needed for local development. To run
   migrations independently of starting the server — for example against a
   database not managed by this compose file — use
   scripts/database/migrate.sh (or migrate.ps1 on Windows); see
   DATABASE_MIGRATIONS.md.

6. Stop the stack:
     docker compose down
     (add -v to also remove the persisted database volume)
```

This gives a single-command local environment (`./run.sh` wrapping
`docker compose up`) that matches NFR-DEP-001 (reproducible environment) and
NFR-DEP-002 (frontend and backend must be executable using the project's
documented containerization approach).

---

## 8. Principle

> Local development should be reproducible with a single command, using the same container images and configuration shape that a real deployment would use.

The compose file is the local analogue of the deployment target described in `DEPLOYMENT.md` — it exercises the same images, the same environment-variable-driven configuration, and the same health-check expectations, just on a developer's machine instead of a deployment host.
