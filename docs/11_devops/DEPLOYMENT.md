# Deployment

## 1. Purpose

This document defines the deployment model for GeoResponse: how the frontend, backend, and database are deployed together, how health is verified after deployment, how database migrations are sequenced relative to deployment, and how a deployment is rolled back if needed.

---

## 2. Scope Boundary

GeoResponse is a take-home test with no persistent hosted environment. This document intentionally describes a **single-environment, single-host, containerized deployment model** proportionate to that scope:

In scope:

- Deploying the three containerized components (frontend, backend, PostgreSQL+PostGIS) to a single container host, using the same images described in `CONTAINERIZATION.md` and the same orchestration shape described in `DOCKER_COMPOSE.md`.
- A basic backend health-check contract.
- Migration-before-deploy ordering.
- A rollback approach based on redeploying a previous image tag.

Out of scope — not claimed, not implemented:

- Multi-region or highly-available infrastructure.
- Auto-scaling.
- Blue/green or canary deployment strategies.
- A managed cloud deployment target (this document describes the deployment *approach*; it does not claim a specific cloud provider is provisioned).
- Automatic deployment from CI (see `CI_CD.md` section 7 — deployment remains a deliberate, manually-triggered action for this take-home).

---

## 3. Deployment Model

```text
┌─────────────────────────────────────────────────────────────┐
│                     Container Host                            │
│         (any Docker-capable host: VM, single server, etc.)    │
│                                                                 │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   │
│   │ georesponse-fe  │   │ georesponse-be  │   │ georesponse-db  │   │
│   │  (nginx:alpine) │   │  (Go binary)     │   │ (postgis/postgis)│   │
│   └───────────────┘   └───────────────┘   └───────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────┘
```

Because GeoResponse is a modular monolith (one frontend, one backend, one database — see `docs/03_architecture/SYSTEM_ARCHITECTURE.md`), the deployment unit is intentionally simple: the same three containers defined for local development in `DOCKER_COMPOSE.md` are the same three containers deployed to any target host. There is no separate "deployment architecture" distinct from the local compose topology — only the host and the environment variable values change (per `ENVIRONMENT_MANAGEMENT.md`).

---

## 4. Deployment Entry Points

Deployment and health verification are intended to be performed through dedicated scripts rather than ad hoc commands, so the process is repeatable:

| Script | Purpose |
|---|---|
| `scripts/deployment/deploy.sh` / `deploy.ps1` | Pull/build the target image tags and (re)start the stack on the target host |
| `scripts/deployment/health-check.sh` / `health-check.ps1` | Verify the deployed services are reachable and healthy after `deploy` runs |
| `scripts/database/migrate.sh` / `migrate.ps1` | Apply pending database migrations before the new backend version starts serving traffic |
| `scripts/database/rollback.sh` / `rollback.ps1` | Revert the most recent migration if a rollback requires it |
| `scripts/database/seed.sh` / `seed.ps1` | Populate reference/seed data (primarily for local/demo use) |

All of these scripts are implemented, each as a `.sh`/`.ps1` pair with the same behaviour:

- `deploy.sh`/`deploy.ps1` — by default builds both images for the current commit (via `scripts/docker/build.sh`/`.ps1`, tagged with the git short SHA), then (re)starts only `georesponse-be` and `georesponse-fe` from `docker-compose.yml` with that tag (`IMAGE_TAG`), leaving `georesponse-db` running. `--tag <tag>` / `-Tag <tag>` skips the build and starts an already-built tag — the rollback path in section 7 — and refuses if that tag does not exist locally; `--no-build` / `-NoBuild` does the same for the current commit's tag (`IMAGE_TAG` is honoured as the default tag).
- `health-check.sh`/`health-check.ps1` — polls `GET /health` on the backend until it returns `200` with `"database":"ok"`, then the frontend's root path until it returns `200`, and exits non-zero if either does not become healthy within the timeout (`--timeout`/`-TimeoutSeconds` or `HEALTH_TIMEOUT`, default 90 s). URLs default to the local compose ports and can be overridden with `--backend-url`/`--frontend-url` (`-BackendUrl`/`-FrontendUrl`, or `BACKEND_URL`/`FRONTEND_URL`).
- `migrate`, `rollback`, and `seed` are documented in `docs/08_database/DATABASE_MIGRATIONS.md` section 4.

Because the backend applies pending migrations itself when `APP_ENV=development` (`DOCKER_COMPOSE.md` section 6.5), step 2 of the sequence below is only a separate action for a non-development `APP_ENV`.

---

## 5. Deployment Sequence

```text
1. Build/tag images
      scripts/docker/build.sh  →  georesponse-fe:<tag>, georesponse-be:<tag>

2. Run database migrations against the target database
      scripts/database/migrate.sh
      (must complete successfully before step 3)

3. Deploy the new containers
      scripts/deployment/deploy.sh
      - stop/replace georesponse-be and georesponse-fe with the new tag
      - georesponse-db is left running (it is not redeployed per release
        unless the Postgres/PostGIS version itself changes)

4. Verify health
      scripts/deployment/health-check.sh
      - polls georesponse-be's /health endpoint
      - polls georesponse-fe's root path
      - fails loudly (non-zero exit) if either does not become healthy
        within a defined timeout

5. If health check fails → roll back (see section 7)
```

### 5.1 Why Migrate Before Deploy

Migrations run before the new backend container starts serving traffic so that the backend never runs against a schema it does not expect. This satisfies NFR-REPRO-003 (the schema must be reproducible from version-controlled migrations) and avoids the failure mode where a new backend version queries columns or tables that do not exist yet.

Migrations are additive-first where practical (new nullable columns, new tables) so that, if a rollback of the backend image is later needed, the previous backend version can generally keep running against the migrated schema without also requiring an immediate schema rollback. Destructive migrations (dropping/renaming columns in use) need explicit care, since they remove that safety margin (see the migration rules in `docs/08_database/DATABASE_MIGRATIONS.md` section 5).

---

## 6. Health Check Contract

Per NFR-AVAIL-002 and NFR-DEP-005, the backend exposes a health endpoint (`internal/http/router.go`, outside `/api/v1`):

```text
GET /health

200 OK
{
  "status": "ok",
  "database": "ok"
}
```

The endpoint checks that the process is running and that it can reach the configured PostgreSQL/PostGIS database (a connection-pool ping with a short timeout). If the ping fails it returns `503 Service Unavailable` with both fields set to `"unavailable"`. A non-2xx response, or a response where `database` is not `"ok"`, indicates the deployment is not ready to serve traffic.

`scripts/deployment/health-check.sh` / `.ps1` are the intended entry point for checking this endpoint after a deploy, and the same endpoint is used as the Docker Compose healthcheck target in local development (`DOCKER_COMPOSE.md` section 6.2), so the health contract is identical in both contexts.

The frontend, being a static asset server, is considered healthy if it responds to a basic HTTP GET on its root path with a 200 status.

---

## 7. Rollback Approach

Rollback is deliberately simple, matching the take-home scope:

1. **Application rollback** — redeploy the previous known-good image tag for `georesponse-fe` and/or `georesponse-be` using `scripts/deployment/deploy.sh` with that tag. Because images are tagged immutably per build (`CONTAINERIZATION.md` section 6), this is a matter of pointing the deploy script at the prior tag rather than rebuilding.

2. **Database rollback (only if required)** — if the release included a migration that must be reverted (for example, it caused a defect and the previous application version can no longer run against the new schema), run `scripts/database/rollback.sh` to revert the most recent migration, then redeploy the previous application image tag.

```text
Rollback decision:

  Was a migration applied in the release being rolled back?
        │
        ├── No  → redeploy previous image tag only
        │           scripts/deployment/deploy.sh --tag <previous>
        │
        └── Yes → is the previous app version compatible with the
                   current (migrated) schema?
                        │
                        ├── Yes → redeploy previous image tag only
                        │
                        └── No  → scripts/database/rollback.sh
                                  then redeploy previous image tag
```

3. **Verify** — run `scripts/deployment/health-check.sh` again after any rollback action to confirm the system has returned to a healthy state.

No automated rollback trigger exists (e.g. an automatic revert on failed health check); rollback is a deliberate operator action for this take-home's scope, consistent with `CI_CD.md`'s decision not to implement continuous deployment.

---

## 8. Explicitly Out of Scope

To avoid overstating the maturity of this deployment story:

- No claim is made that GeoResponse is currently deployed anywhere. This document describes the deployment approach and the scripts that carry it out; they have been exercised against a local Docker host only.
- No load balancer, reverse proxy beyond the frontend's own nginx container, or TLS termination layer is described, since none is provisioned for this take-home. NFR-SEC-005 (secure transport) would apply if the system were exposed beyond a trusted local environment, but that exposure does not currently exist.
- No multi-instance/HA database setup is described; a single PostgreSQL+PostGIS container is the documented target, consistent with `docs/05_engineering/TECHNOLOGY_SELECTION.md`'s decision boundaries (no premature infrastructure).

---

## 9. Principle

> Deployment should be a small, repeatable set of scripted steps — build, migrate, deploy, verify — proportionate to a single-host, single-environment target.

The deployment model deliberately mirrors the local `docker compose` topology so that what is verified locally is representative of what would run on a real host, without introducing orchestration complexity the project's scope does not need.
