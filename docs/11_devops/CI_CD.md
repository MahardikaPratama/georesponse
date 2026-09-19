# CI/CD

## 1. Purpose

This document defines the continuous integration and continuous delivery approach for GeoResponse.

As a take-home test with a fixed submission deadline, the pipeline is scoped to what materially protects code quality before merge: linting, type-checking, building, and testing both applications. It is not scoped to a multi-environment release pipeline, since no staging or production infrastructure exists for this project.

---

## 2. Scope Boundary

The pipeline described here covers **continuous integration** (verifying every change) rather than **continuous deployment** (automatically shipping every change to a live environment).

In scope:

- Linting and formatting checks for frontend and backend.
- Type-checking (TypeScript) and compilation (Go).
- Automated test execution for frontend and backend.
- Docker image build verification for both applications.

Explicitly out of scope for this take-home:

- Automatic deployment to a production environment.
- A multi-environment promotion pipeline (dev → staging → prod).
- Deployment approval gates, canary releases, or blue/green rollout automation.
- Secrets management integration with a cloud provider.

If GeoResponse were operated beyond the take-home submission, these would be natural next steps, but they are not implemented or claimed here.

---

## 3. Trigger Events

| Event | Branches | Purpose |
|---|---|---|
| `push` | `main` (the project's single long-lived branch, per the Feature Branching strategy in `docs/10_git/GIT_MANAGEMENT.md` §3) | Verify the integration branch stays green |
| `pull_request` | targeting `main` | Gate merges behind a passing pipeline |

Feature, fix, and release branches are validated through their pull requests rather than on every intermediate push, to keep feedback focused on the point of integration.

---

## 4. Pipeline Stages

The pipeline runs frontend and backend jobs independently and in parallel, since the two applications have separate toolchains and no build-time dependency on one another. Two further jobs follow them: `integration` (after `backend`, section 4.3) and `docker-build` (after both, section 4.4).

```text
                ┌─────────────────────────┐
                │        Trigger          │
                │  push / pull_request    │
                └────────────┬─────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                             ▼
┌───────────────────────┐                 ┌───────────────────────┐
│   Frontend Pipeline    │                 │   Backend Pipeline     │
│  (georesponse-fe)      │                 │  (georesponse-be)      │
├───────────────────────┤                 ├───────────────────────┤
│ 1. Install deps        │                 │ 1. Set up Go toolchain │
│ 2. Lint (ESLint)        │                 │ 2. gofmt / go vet      │
│ 3. Type-check (tsc)     │                 │ 3. go build            │
│ 4. Build (Rspack)       │                 │ 4. go test ./...       │
│ 5. Test (Vitest + RTL)  │                 │                        │
└───────────┬───────────┘                 └───────────┬───────────┘
            │                                           │
            └───────────────────┬───────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  Docker Build Verify     │
                    │  (fe image + be image)   │
                    └────────────┬─────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  Quality Gate Result     │
                    │  (pass required to merge)│
                    └─────────────────────────┘
```

### 4.1 Frontend Stages

| Stage | Command (illustrative) | Purpose |
|---|---|---|
| Install | `npm ci` | Reproducible dependency install from lockfile |
| Lint | `npm run lint` | Enforce coding standards (NFR-MAIN-003, NFR-QUAL-002) |
| Type-check | `npm run typecheck` (`tsc --noEmit`) | Catch type errors before build |
| Build | `npm run build` | Verify Rspack production build succeeds |
| Test | `npm run test` (Vitest + React Testing Library) | Verify component and behavior tests pass |

### 4.2 Backend Stages

| Stage | Command (illustrative) | Purpose |
|---|---|---|
| Format check | `gofmt -l .` | Enforce formatting (NFR-QUAL-001) |
| Vet / Lint | `go vet ./...` (`golangci-lint run`, configured in `georesponse-be/.golangci.yml`, is run locally by `scripts/quality/check.sh` when installed, not in CI) | Static analysis (NFR-QUAL-003) |
| Build | `go build ./...` | Verify the backend compiles to a binary |
| Test | `go test ./... -cover` | Run unit/integration tests with coverage (NFR-TEST-005) |

### 4.3 Test Suite Placement

Suite-specific automated tests are organized as:

- `georesponse-fe/` — frontend unit/component tests colocated with source, run via Vitest.
- `georesponse-be/` — backend unit tests colocated with source, run via `go test`.
- `tests/integration/` — black-box API integration tests (Go, its own module) that need a running backend + database; skipped unless `GEORESPONSE_API_URL` is set.
- `tests/e2e/` — the Playwright golden-path test exercising the running stack through the browser (see `tests/README.md`).

The integration suite runs in CI as its own `integration` job: a PostGIS service container, the backend built and started with `APP_ENV=development` (so it applies the migrations itself at start-up), the seed files loaded with `psql`, then `go test` in `tests/integration/` against `http://localhost:8080`. The e2e suite is **not** run in CI: it needs the full composed stack plus a browser, and its runtime and flakiness risk are disproportionate for this take-home's pipeline — it is run locally against `./run.sh` (`tests/README.md`).

### 4.4 Docker Build Verification

After lint/build/test succeed, the pipeline builds both Docker images (`georesponse-fe/Dockerfile`, `georesponse-be/Dockerfile`) to confirm they build cleanly from the current source tree. Images built during CI are used only for verification; they are not pushed to a registry as part of this take-home's scope.

---

## 5. Illustrative Pipeline Definition

The following is the shape of the real `.github/workflows/ci.yml`, which is the source of truth. The sketch omits only the `integration` job described in section 4.3 (a PostGIS `services:` container, the backend started with `APP_ENV=development`, seeds loaded with `psql`, then `go test` in `tests/integration/`).

```yaml
# .github/workflows/ci.yml  (illustrative sketch of the real file)
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  frontend:
    name: Frontend (lint, type-check, build, test)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: georesponse-fe
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: georesponse-fe/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
      - run: npm run test

  backend:
    name: Backend (fmt, vet, build, test)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: georesponse-be
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.26"
          cache-dependency-path: georesponse-be/go.sum
      - run: gofmt -l . | tee /tmp/fmt.out && test ! -s /tmp/fmt.out
      - run: go vet ./...
      - run: go build ./...
      - run: go test ./... -cover

  docker-build:
    name: Docker image build verification
    runs-on: ubuntu-latest
    needs: [frontend, backend]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Build frontend image
        uses: docker/build-push-action@v6
        with:
          context: ./georesponse-fe
          push: false
          tags: georesponse-fe:ci
      - name: Build backend image
        uses: docker/build-push-action@v6
        with:
          context: ./georesponse-be
          push: false
          tags: georesponse-be:ci
```

---

## 6. Gate Policy

All stages MUST pass before a pull request can be merged into `main`. This mirrors the quality gate defined in `docs/09_quality/QUALITY_GATES.md` (automated tests, formatting/linting, and relevant static analysis, per NFR-QUAL-004) and the regression-protection requirement NFR-TEST-004.

The individual lint/build/test commands run as discrete CI steps in §4.1–4.2 (rather than through the aggregate `scripts/quality/check.sh` script) so that failures are reported per stage; they are the same checks `check.sh`/`check.ps1` run locally before a commit (`docs/09_quality/QUALITY_GATES.md` §2), just split out for CI visibility rather than being a separate or conflicting set of checks.

| Condition | Merge Allowed? |
|---|---|
| All stages pass | Yes |
| Lint or type-check fails | No |
| Build fails | No |
| Any test fails | No |
| Docker image fails to build | No |

Branch protection rules (required status checks) enforcing this policy are configured at the GitHub repository level and are outside the scope of this Markdown documentation, but the pipeline is designed to be attachable to such a rule directly.

---

## 7. Continuous Delivery (Not Implemented)

No continuous deployment stage is implemented in this take-home. `DEPLOYMENT.md` describes a manual, script-driven deployment path (`scripts/deployment/deploy.sh` / `deploy.ps1`) that an operator runs deliberately, rather than a pipeline stage that deploys automatically on merge.

If this project were extended past the take-home submission, the natural next step would be an optional `deploy` job gated on `push` to `main` that builds, tags, and pushes images to a registry, then invokes the same deployment script against a target host. That job does not exist today and is not represented in the pipeline diagram above.

---

## 8. Principle

> CI should catch problems as early and as cheaply as possible, without pretending the project has more deployment infrastructure than it does.

The pipeline is scoped to protect code quality on every change. It intentionally stops short of deployment automation because no persistent target environment exists for this take-home submission.
