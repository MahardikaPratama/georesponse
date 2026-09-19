# Environment Management

## 1. Purpose

This document defines how environment-specific configuration is managed across GeoResponse's frontend, backend, and database, and how that configuration is kept separate from source code and version control (NFR-DEP-003).

---

## 2. Scope Boundary

This take-home currently defines exactly **one** real environment: **local development**, which is also what is used to evaluate the submission. There is no deployed staging or production environment.

This document therefore describes:

- The configuration variables that exist and differ per environment in principle (even though only one environment instance exists today).
- The `.env` / `.env.example` convention used to supply them.
- How a CI/test context is configured, since CI does run against a real (if ephemeral) database.

It deliberately does **not** invent staging or production environment definitions, credentials, or infrastructure that do not exist. If GeoResponse were extended beyond the take-home, additional environments would be added following the same pattern described here — new `.env` files with different values, not a different configuration mechanism.

---

## 3. Environments Defined

| Environment | Status | Purpose |
|---|---|---|
| Local development | Active | Developer machine, via `docker compose up` or running each app directly |
| CI / test | Active | Ephemeral environment used by the GitHub Actions pipeline (`CI_CD.md`) to run automated tests |
| Staging | Not defined | Would follow the same variable set with different values if introduced |
| Production | Not defined | Would follow the same variable set with different values if introduced |

---

## 4. Configuration Principle

**Environment-specific values are supplied at runtime via environment variables, never hardcoded in source and never baked into a Docker image at build time** (see `CONTAINERIZATION.md` section 7). This is what allows the same built frontend and backend images to run correctly whether started via `docker compose`, a script, or (in principle) a future deployment target.

```text
Source Code (environment-agnostic)
        │
        ▼
Environment Variables (.env, compose, or shell)
        │
        ▼
Running Container / Process (environment-specific behavior)
```

---

## 5. Variables That Differ Per Environment

### 5.1 Frontend (`georesponse-fe`)

| Variable | Purpose | Local Dev Example |
|---|---|---|
| `API_BASE_URL` | Base URL the frontend calls for the backend REST API | `http://localhost:8080/api/v1` |
| `MAP_TILE_URL` | Map tile source URL for MapLibre GL JS, if a non-default tile provider is used | provider-specific |
| `LOG_LEVEL` | Client-side logger verbosity, read by `src/utils/logger/logger.ts` | `debug` |

The frontend build tool is Rspack, not Vite, so these are **not** `VITE_`-prefixed (that convention is Vite-specific and does not apply here). Rspack's `DefinePlugin` injects them at build time as `process.env.API_BASE_URL` etc., per `georesponse-fe/rspack.config.js`. Because the frontend is served as static assets, values needed only at build time are fixed per build; values that need to differ without rebuilding (rare for a static SPA) would require a runtime-injected config file served alongside the assets, which is not currently needed at this scope.

### 5.2 Backend (`georesponse-be`)

| Variable | Purpose | Local Dev Example |
|---|---|---|
| `APP_ENV` | Declares which environment the process is running as | `development` |
| `HTTP_PORT` | Port the Go HTTP server listens on | `8080` |
| `DATABASE_URL` | PostgreSQL/PostGIS connection string | `postgres://georesponse:georesponse_dev_password@georesponse-db:5432/georesponse?sslmode=disable` |
| `LOG_LEVEL` | Structured logging verbosity (NFR-OBS-001) | `debug` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the API cross-origin (SECURITY.md section 8.1); never a wildcard | `http://localhost:5173` |

Additional variables (e.g. JWT signing secret) would be added here as those concerns are implemented; the convention — environment variable, never hardcoded — applies uniformly.

### 5.3 Database (`georesponse-db`)

| Variable | Purpose | Local Dev Example |
|---|---|---|
| `POSTGRES_USER` | Database role used by the backend | `georesponse` |
| `POSTGRES_PASSWORD` | Database role password | local-dev placeholder only |
| `POSTGRES_DB` | Database name | `georesponse` |

---

## 6. `.env` / `.env.example` Convention

Three `.env`/`.env.example` pairs are intended, one per place configuration is actually consumed:

```text
.env.example                (committed — compose-level variables: DB credentials,
                              ports, and the values docker-compose.yml substitutes
                              into each service; see DOCKER_COMPOSE.md section 6.4)
.env                        (gitignored — actual local values, created by run.sh/
                              run.ps1 or manually by the developer)

georesponse-fe/.env.example (committed — variables the frontend reads when run
                              directly with `npm run dev`, outside Docker)
georesponse-fe/.env          (gitignored)

georesponse-be/.env.example (committed — variables the backend reads when run
                              directly with `go run`, outside Docker)
georesponse-be/.env          (gitignored)
```

The root pair exists because `docker compose` only auto-loads a file literally
named `.env` in the same directory as `docker-compose.yml` (the repository
root); the per-app pairs exist so each application can also be run directly,
without Docker, during day-to-day development. The variable names and values
are the same concepts either way — only how they're delivered to the process
differs.

Rules:

1. Every `.env.example` file is committed to version control and lists every
   variable its context reads, with a safe placeholder or an obviously-fake
   local-dev default — never a real secret.
2. Every `.env` file (root and per-app) is excluded via `.gitignore` and is
   never committed. This is the concrete mechanism satisfying NFR-SEC-004 —
   verify `.gitignore` actually lists `.env` at the root and inside both
   `georesponse-fe/` and `georesponse-be/` before the first commit that adds
   a real `.env.example`.
3. A developer sets up their environment by copying each example file
   (`cp .env.example .env`, once per pair) and adjusting values only if
   their local setup deviates from the default (e.g. a non-standard port
   already in use). `run.sh`/`run.ps1` (see `DOCKER_COMPOSE.md` section 7.1)
   do this automatically for all three pairs, without overwriting a `.env`
   that already exists.
4. When running via `docker compose`, only the root `.env` is actually read
   by the containers (through `docker-compose.yml`'s `${VAR}` substitution,
   see `DOCKER_COMPOSE.md` section 6.4) — the per-app `.env` files matter
   when running that application directly, outside Docker.

This satisfies NFR-SEC-004 (credentials must not be hard-coded or committed) and NFR-DEP-003 (environment-specific configuration must be separated from source code).

---

## 7. CI / Test Environment

The CI pipeline (`CI_CD.md`) does not use `.env` files at all for the unit-test stages, since frontend and backend unit tests are designed to run without a live database dependency (NFR-TEST-002 — unit tests must not depend on external services). Any configuration values unit tests need are supplied directly as job-level environment variables in the GitHub Actions workflow, or as safe in-code test defaults.

If/when the integration test suite in `tests/integration/` is implemented, it would run against an ephemeral PostGIS service container provisioned within the CI job itself (a GitHub Actions `services:` block, or a docker-compose invocation scoped to CI), configured with its own throwaway `DATABASE_URL` — never pointing at a shared or persistent database.

---

## 8. Startup Validation

Per NFR-DEP-004, the backend must fail startup clearly when required configuration is missing or invalid (for example, an unset or malformed `DATABASE_URL`), rather than starting in a partially-configured state and failing unpredictably on the first request. This is an application-level responsibility (validating required environment variables at process start) rather than an environment-management infrastructure concern, but it depends on this document's convention: every required variable must be documented in `.env.example` so the validation logic and the documentation stay in sync.

---

## 9. Principle

> Configuration changes between environments; code does not.

Only one environment is defined today (local development, doubling as the take-home evaluation environment), but the variable-based mechanism described here is designed to extend to additional environments without changing how the application reads its configuration.
