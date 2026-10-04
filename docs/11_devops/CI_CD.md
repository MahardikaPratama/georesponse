# CI/CD

## 1. Purpose

This document describes the GeoResponse CI pipeline in
`.github/workflows/ci.yml`: when it runs, its jobs and stages, and the
merge gate it enforces. The pipeline covers continuous integration only
(lint, type-check, build, test, and Docker build verification for both
applications). There is no deployment stage, because no staging or
production environment exists for this take-home project.

---

## 2. Continuous Delivery (Not Implemented)

The following are not implemented:

- Automatic deployment on merge, to any environment.
- A multi-environment promotion pipeline (dev, staging, prod).
- Deployment approval gates, canary releases, or blue/green rollouts.
- Pushing images to a registry.
- Secrets management integration with a cloud provider.

Deployment is a manual, script-driven action (`DEPLOYMENT.md`). A natural
next step would be a `deploy` job on `push` to `main` that builds, tags,
and pushes images to a registry and then runs the same deployment script
against a target host.

---

## 3. Trigger Events

| Event | Branches | Purpose |
| --- | --- | --- |
| `push` | `main` | Keep the integration branch green |
| `pull_request` | targeting `main` | Gate merges behind a passing pipeline |

`main` is the only long-lived branch (Feature Branching, see
`docs/10_git/GIT_MANAGEMENT.md` section 3). Other branches are validated
through their pull requests, not on every push.

---

## 4. Pipeline Stages

`frontend` and `backend` run in parallel, since the two applications have
separate toolchains and no build-time dependency on each other.
`integration` runs after `backend` (section 4.3), and `docker-build` runs
after both `frontend` and `backend` (section 4.4).

```text
                ┌─────────────────────────┐
                │        Trigger          │
                │  push / pull_request    │
                └────────────┬─────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                             ▼
┌───────────────────────┐                 ┌───────────────────────┐
│  frontend              │                 │  backend               │
│  (georesponse-fe)      │                 │  (georesponse-be)      │
├───────────────────────┤                 ├───────────────────────┤
│ 1. npm ci              │                 │ 1. Set up Go 1.26      │
│ 2. Lint (ESLint)       │                 │ 2. gofmt -l / go vet   │
│ 3. Type-check (tsc)    │                 │ 3. go build            │
│ 4. Build (Rspack)      │                 │ 4. go test -cover      │
│ 5. Test (Vitest + RTL) │                 │                        │
└───────────┬───────────┘                 └─────┬───────────┬─────┘
            │                                     │           │
            │                                     │           ▼
            │                                     │  ┌──────────────────┐
            │                                     │  │  integration      │
            │                                     │  │  (API + PostGIS)  │
            │                                     │  └──────────────────┘
            └───────────────────┬─────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  docker-build            │
                    │  (fe image + be image)   │
                    └─────────────────────────┘

All jobs must pass for a pull request to merge (section 6).
```

### 4.1 Frontend Job

Runs in `georesponse-fe/` on Node 20 with the npm cache.

| Stage | Command | Purpose |
| --- | --- | --- |
| Install | `npm ci` | Reproducible install from the lockfile |
| Lint | `npm run lint` | Coding standards (NFR-MAIN-003, NFR-QUAL-002) |
| Type-check | `npm run typecheck` (`tsc --noEmit`) | Type errors before build |
| Build | `npm run build` | Rspack production build succeeds |
| Test | `npm run test` | Vitest + React Testing Library tests pass |

### 4.2 Backend Job

Runs in `georesponse-be/` on Go 1.26.

| Stage | Command | Purpose |
| --- | --- | --- |
| Format check | `gofmt -l .` (fails if any file is listed) | Formatting (NFR-QUAL-001) |
| Vet | `go vet ./...` | Static analysis (NFR-QUAL-003) |
| Build | `go build ./...` | The backend compiles |
| Test | `go test ./... -cover` | Backend unit tests with coverage (NFR-TEST-005) |

`golangci-lint` (configured in `georesponse-be/.golangci.yml`) is not run
in CI. `scripts/quality/check.sh` runs it locally when it is installed.

### 4.3 Integration Job and Test Placement

Test suites and where they run:

- `georesponse-fe/`: colocated unit and component tests (Vitest), in the
  `frontend` job.
- `georesponse-be/`: colocated unit tests (`go test`), in the `backend`
  job.
- `tests/integration/`: black-box API tests (a separate Go module), in the
  `integration` job.
- `tests/e2e/`: the Playwright golden-path test. Not run in CI, because it
  needs the full composed stack and a browser; it runs locally against
  `./run.sh`.

The `integration` job starts a `postgis/postgis:16-3.4` service container,
builds and starts the backend with `APP_ENV=development` (so it applies
migrations at start-up) and waits for `/health` to report
`"database":"ok"`, loads `database/seeds/*.sql` with `psql`, then runs
`go test ./... -count=1 -v` in `tests/integration/` with
`GEORESPONSE_API_URL=http://localhost:8080`. The backend log is printed on
failure. Run commands and variables for both suites are in
`tests/README.md`.

### 4.4 Docker Build Verification

The `docker-build` job builds both images (`georesponse-fe/Dockerfile`,
`georesponse-be/Dockerfile`) with Buildx, tagged `georesponse-fe:ci` and
`georesponse-be:ci`, to confirm they build from the current source tree.
The images are not pushed. The frontend image is built with its Dockerfile
default build arguments.

---

## 5. Workflow File

`.github/workflows/ci.yml` is the source of truth for the jobs above. Job
names and dependencies:

| Job | Name in GitHub | `needs` |
| --- | --- | --- |
| `frontend` | Frontend (lint, type-check, build, test) | none |
| `backend` | Backend (fmt, vet, build, test) | none |
| `integration` | Integration (API + PostGIS) | `backend` |
| `docker-build` | Docker image build verification | `frontend`, `backend` |

All jobs run on `ubuntu-latest`. The integration job's credentials
(`ci-only-password`, `ci-only-token-secret`) are throwaway values defined
in the workflow file.

---

## 6. Gate Policy

All jobs must pass before a pull request can merge into `main`. This
implements the merge gate in `docs/09_quality/QUALITY_GATES.md` (NFR-QUAL-004)
and regression protection (NFR-TEST-004).

| Condition | Merge allowed? |
| --- | --- |
| All jobs pass | Yes |
| Lint, format, vet, or type-check fails | No |
| Build fails | No |
| Any unit or integration test fails | No |
| Docker image fails to build | No |

The CI steps are the same checks `scripts/quality/check.sh` / `check.ps1`
run locally (`docs/09_quality/QUALITY_GATES.md` section 2), split into
separate steps so a failure is reported per stage.

Enforcing this through branch protection (required status checks) is a
GitHub repository setting and is not defined in this repository.
