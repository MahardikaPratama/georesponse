# Environment Management

## 1. Purpose

This document describes how GeoResponse's frontend, backend, and database
receive environment-specific configuration, and how that configuration and
its secrets are kept out of source code and version control (NFR-DEP-003,
NFR-SEC-004). It owns the environment-variable tables (section 5) and the
`.env` / secrets convention (section 6). It does not define staging or
production environments, credentials, or infrastructure, because none
exist.

---

## 2. Environments

Only local development exists as a real environment, and it is also the
environment used to evaluate the submission.

| Environment | Status | Purpose |
| --- | --- | --- |
| Local development | Active | Developer machine, via `docker compose up` or running each app directly |
| CI / test | Active | Ephemeral environment in the GitHub Actions pipeline (section 7) |
| Staging | Not defined | Would use the same variables with different values |
| Production | Not defined | Would use the same variables with different values |

A new environment would add new `.env` values, not a different
configuration mechanism.

---

## 3. Configuration Principle

Environment-specific values come from environment variables and are never
hardcoded in source:

```text
Source Code (environment-agnostic)
        │
        ▼
Environment Variables (.env, compose, or shell)
        │
        ▼
Running Container / Process (environment-specific behavior)
```

The backend and database read their variables at process start, so one
backend image runs in any environment. The frontend is the exception: its
values are fixed at build time (section 4).

---

## 4. Frontend Build-Time Configuration

The frontend is served as static assets, so Rspack's `DefinePlugin`
inlines its variables into the bundle as `process.env.API_BASE_URL` and so
on (`georesponse-fe/rspack.config.js`). They are not `VITE_`-prefixed,
because the build tool is Rspack, not Vite.

- Outside Docker, `rspack.config.js` loads `georesponse-fe/.env` with
  `dotenv` before reading them.
- In Docker, `georesponse-fe/Dockerfile` takes them as build `ARG`s.
  `docker-compose.yml` feeds them from the root `.env` through
  `build.args`, and `scripts/docker/build.sh` / `.ps1` pass them as
  `--build-arg`, reading the environment or the root `.env`.

A frontend image is therefore tied to the values it was built with.
Changing them without a rebuild would need a config file injected at
runtime next to the assets, which the current scope does not need. These
values are public (they ship to the browser), so none of them is a secret.

---

## 5. Variables That Differ Per Environment

### 5.1 Frontend (`georesponse-fe`)

| Variable | Purpose | Default if unset (`rspack.config.js`) | Local dev example |
| --- | --- | --- | --- |
| `API_BASE_URL` | Base URL of the backend REST API | `http://localhost:8080/api/v1` | `http://localhost:8080/api/v1` |
| `MAP_TILE_URL` | Raster tile URL template for the MapLibre base map | the provider URL from `georesponse-fe/.env.example` (unset or empty never means "no base map") | same |
| `LOG_LEVEL` | Client-side logger verbosity (`src/utils/logger/logger.ts`) | `debug` (the Dockerfile `ARG` default is `info`; compose passes `debug`) | `debug` |

### 5.2 Backend (`georesponse-be`)

| Variable | Purpose | Required / default (`internal/platform/config`) | Local dev example |
| --- | --- | --- | --- |
| `APP_ENV` | Which environment the process runs as. Only `development` auto-migrates at start-up (`DATABASE_MIGRATIONS.md` section 4.2); `production` marks the auth cookie `Secure` | default `development` | `development` |
| `HTTP_PORT` | Port the HTTP server listens on | default `8080` | `8080` |
| `DATABASE_URL` | PostgreSQL/PostGIS connection string | **required** | `postgres://georesponse:georesponse_dev_password@georesponse-db:5432/georesponse?sslmode=disable` |
| `LOG_LEVEL` | Structured logging verbosity (NFR-OBS-001): `debug`, `info`, `warn`, `error` | default `info` | `debug` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the API cross-origin (`docs/05_engineering/SECURITY.md` section 8.1); never a wildcard | default `http://localhost:5173` | `http://localhost:5173` |
| `BMKG_BASE_URL` | BMKG's public GeoHotspot ArcGIS REST layer, queried by `GET /api/v1/hotspots` | default `https://datacuaca.bmkg.go.id/arcgis/rest/services/production/geohotspot/MapServer/0` | same |
| `BMKG_TIMEOUT` | Timeout for a single BMKG request | default `10s` | `10s` |
| `TOKEN_SECRET` | HMAC-SHA256 key that signs and verifies authentication tokens (`auth.HMACTokenSigner`); confidential | **required** | local-dev placeholder only |
| `TOKEN_TTL` | How long a signed token remains valid | default `24h` | `24h` |
| `MIGRATIONS_DIR` | Directory of `NNNN_*.up.sql` files applied at start-up when `APP_ENV=development` | default `../database/migrations` (relative to `georesponse-be/`); must exist when `APP_ENV=development` | `../database/migrations` with `go run`; `/migrations` in the container |

New variables follow the same convention: read from the environment, never
hardcoded, and documented here and in `georesponse-be/.env.example`.

### 5.3 Database (`georesponse-db`)

| Variable | Purpose | Local dev example |
| --- | --- | --- |
| `POSTGRES_USER` | Database role used by the backend | `georesponse` |
| `POSTGRES_PASSWORD` | Database role password | local-dev placeholder only |
| `POSTGRES_DB` | Database name | `georesponse` |

The root `.env.example` also sets `IMAGE_TAG` (the image tag compose builds
and starts, see `CONTAINERIZATION.md` section 6).

---

## 6. `.env` Files and Secrets

There are three `.env` / `.env.example` pairs, one per place configuration
is consumed:

```text
.env.example                (committed: compose-level variables substituted
                              into docker-compose.yml, including DB
                              credentials, ports, IMAGE_TAG, and the
                              frontend build arguments)
.env                        (gitignored: actual local values)

georesponse-fe/.env.example (committed: read by `npm run dev` / `npm run
                              build` outside Docker)
georesponse-fe/.env          (gitignored)

georesponse-be/.env.example (committed: read when running the backend with
                              `go run` outside Docker)
georesponse-be/.env          (gitignored)
```

The root pair exists because `docker compose` only auto-loads a file named
`.env` next to `docker-compose.yml`. The per-app pairs let each application
run directly without Docker. The variables are the same either way; only
the delivery differs.

Rules:

1. Every `.env.example` is committed and lists every variable its context
   reads, with a safe placeholder or an obviously fake local-dev value,
   never a real secret.
2. Every `.env` is gitignored and never committed. The root `.gitignore`
   lists `.env` (covering every directory, including `georesponse-be/`,
   which has no `.gitignore` of its own), and `georesponse-fe/.gitignore`
   lists it again.
3. To set up, copy each example (`cp .env.example .env`, once per pair) and
   change values only if your setup differs, for example a port already in
   use. `run.sh` / `run.ps1` do this for all three pairs and never
   overwrite an existing `.env` (`DOCKER_COMPOSE.md` section 7.1).
4. Under `docker compose`, only the root `.env` reaches the containers,
   through `${VAR}` substitution in `docker-compose.yml`
   (`DOCKER_COMPOSE.md` section 6.4). The per-app `.env` files matter only
   when running an application directly.
5. Secrets (`POSTGRES_PASSWORD`, `TOKEN_SECRET`) reach the backend and
   database only as environment variables at container start. They are
   never copied into an image; both `.dockerignore` files exclude `.env`
   and `.env.*` (`CONTAINERIZATION.md` section 7).

---

## 7. CI / Test Environment

CI does not use `.env` files. Frontend and backend unit tests run without
a live database (NFR-TEST-002), using job-level environment variables or
in-code test defaults where needed.

The `integration` job (`CI_CD.md` section 4.3) runs `tests/integration/`
against an ephemeral PostGIS service container defined in the job, with
throwaway `DATABASE_URL`, `TOKEN_SECRET`, and `APP_ENV=development` values
set in the workflow. It never points at a shared or persistent database.
The suite itself only needs `GEORESPONSE_API_URL` (see `tests/README.md`).

---

## 8. Start-Up Validation

Per NFR-DEP-004, the backend fails at start-up with a clear error rather
than running partially configured. `config.Load()` in
`georesponse-be/internal/platform/config` runs first in `cmd/api/main.go`
and exits with an error naming the offending variable when:

- `DATABASE_URL` is unset or not a `postgres://host/database` URL
- `TOKEN_SECRET` is unset
- `HTTP_PORT` is not a TCP port
- `LOG_LEVEL` is not one of `debug`, `info`, `warn`, `error`
- `TOKEN_TTL` or `BMKG_TIMEOUT` is not a positive duration
- `BMKG_BASE_URL` is not an absolute http(s) URL
- `MIGRATIONS_DIR` is not a readable directory (only when
  `APP_ENV=development`)

Every required variable must therefore also be documented in
`georesponse-be/.env.example`.
