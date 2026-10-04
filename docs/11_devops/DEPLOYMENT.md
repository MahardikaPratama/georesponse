# Deployment

## 1. Purpose

This document describes how GeoResponse would be deployed to a single
container host: the deployment scripts, the order of migration and
deployment, the health check used to verify a deployment, and how to roll
back. It reuses the images from `CONTAINERIZATION.md` and the orchestration
from `DOCKER_COMPOSE.md`.

---

## 2. Status and Limits

- GeoResponse is not deployed anywhere. The scripts below have only been
  run against a local Docker host.
- The target is a single host with a single environment. There is no
  multi-region or high-availability setup, no auto-scaling, no blue/green
  or canary rollout, and no managed cloud target.
- Deployment is a manual, scripted operator action. CI does not deploy
  (`CI_CD.md` section 2).
- There is no load balancer, reverse proxy beyond the frontend's own nginx
  container, or TLS termination. NFR-SEC-005 (secure transport) would apply
  once the system is exposed beyond a trusted local environment.
- The database is a single PostgreSQL + PostGIS container.

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

The deployed containers are the same three defined for local development
in `DOCKER_COMPOSE.md`. Only the host and the environment variable values
change (`ENVIRONMENT_MANAGEMENT.md`). Because the frontend's configuration
is inlined at build time, a frontend image must be built with the target
host's `API_BASE_URL` (`CONTAINERIZATION.md` section 4.2).

---

## 4. Deployment Entry Points

Each script is a `.sh` / `.ps1` pair with the same behaviour.

| Script | Purpose |
| --- | --- |
| `scripts/deployment/deploy.sh` / `deploy.ps1` | Build or select image tags and (re)start the application containers |
| `scripts/deployment/health-check.sh` / `health-check.ps1` | Verify the deployed services are healthy |
| `scripts/database/migrate.sh` / `migrate.ps1` | Apply pending migrations before the new backend serves traffic |
| `scripts/database/rollback.sh` / `rollback.ps1` | Revert the most recent migration |
| `scripts/database/seed.sh` / `seed.ps1` | Load seed data (local and demo use) |

- `deploy`: by default builds both images for the current commit through
  `scripts/docker/build.sh` / `.ps1` (tagged with the git short SHA), then
  restarts only `georesponse-be` and `georesponse-fe` from
  `docker-compose.yml` with that `IMAGE_TAG`, leaving `georesponse-db`
  running. `--tag <tag>` (`-Tag`) skips the build and starts an existing
  tag, failing if it does not exist locally; this is the rollback path.
  `--no-build` (`-NoBuild`) does the same for the current commit's tag.
  `IMAGE_TAG` sets the default tag.
- `health-check`: polls backend `GET /health` until it returns `200` with
  `"database":"ok"`, then the frontend root until it returns `200`, and
  exits non-zero if either fails within the timeout (`--timeout` /
  `-TimeoutSeconds` or `HEALTH_TIMEOUT`, default 90 s). URLs default to the
  local compose ports and can be overridden with `--backend-url` /
  `--frontend-url` (`-BackendUrl` / `-FrontendUrl`, or `BACKEND_URL` /
  `FRONTEND_URL`).
- `migrate`, `rollback`, and `seed` are documented in
  `docs/08_database/DATABASE_MIGRATIONS.md` section 4.

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
      - replace georesponse-be and georesponse-fe with the new tag
      - georesponse-db keeps running (it is only redeployed when the
        Postgres/PostGIS version changes)

4. Verify health
      scripts/deployment/health-check.sh
      - exits non-zero if the backend or frontend is not healthy
        within the timeout

5. If the health check fails, roll back (section 7)
```

With `APP_ENV=development` the backend applies pending migrations itself
at start-up (`DATABASE_MIGRATIONS.md` section 4.2), so step 2 is only a separate
action for any other `APP_ENV`.

### 5.1 Why Migrate Before Deploy

Running migrations first means the new backend never starts against a
schema it does not expect, and it keeps the schema reproducible from
version-controlled migrations (NFR-REPRO-003).

Migrations are additive where practical (new nullable columns, new tables),
so a previous backend image can usually keep running against the migrated
schema if the application is rolled back. Destructive migrations (dropping
or renaming columns in use) remove that margin and need extra care (see
`docs/08_database/DATABASE_MIGRATIONS.md` section 5).

---

## 6. Health Check

The backend's `GET /health` endpoint (outside `/api/v1`) returns `200`
with `{"status": "ok", "database": "ok"}` when the process is up and a
short database ping succeeds, and `503` with both fields `"unavailable"`
otherwise (contract in `docs/04_contracts/API_CONTRACT.md` section 2). It
satisfies NFR-AVAIL-002 and NFR-DEP-005.

A non-2xx response, or `database` other than `"ok"`, means the deployment
is not ready for traffic. The same endpoint is the compose healthcheck
target (`DOCKER_COMPOSE.md` section 6.2), so the check is identical locally
and after a deploy.

The frontend is healthy when its root path returns `200`.

---

## 7. Rollback

1. **Application rollback.** Redeploy the previous known-good tag with
   `scripts/deployment/deploy.sh --tag <previous>`. Tags are immutable per
   build (`CONTAINERIZATION.md` section 6), so nothing is rebuilt.
2. **Database rollback, only if required.** If the release's migration
   must be reverted (for example, the previous application version cannot
   run against the new schema), run `scripts/database/rollback.sh`, then
   redeploy the previous tag.
3. **Verify.** Run `scripts/deployment/health-check.sh` again.

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

Rollback is never triggered automatically; an operator runs it.
