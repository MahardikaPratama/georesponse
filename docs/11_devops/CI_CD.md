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

The pipeline runs frontend and backend jobs independently and in parallel, since the two applications have separate toolchains and no build-time dependency on one another.

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
│ 2. Lint (ESLint)        │                 │ 2. go vet / lint       │
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
| Type-check | `npm run type-check` (`tsc --noEmit`) | Catch type errors before build |
| Build | `npm run build` | Verify Rspack production build succeeds |
| Test | `npm run test` (Vitest + React Testing Library) | Verify component and behavior tests pass |

### 4.2 Backend Stages

| Stage | Command (illustrative) | Purpose |
|---|---|---|
| Format check | `gofmt -l .` | Enforce formatting (NFR-QUAL-001) |
| Vet / Lint | `go vet ./...` (optionally `golangci-lint run`) | Static analysis (NFR-QUAL-003) |
| Build | `go build ./...` | Verify the backend compiles to a binary |
| Test | `go test ./... -cover` | Run unit/integration tests with coverage (NFR-TEST-005) |

### 4.3 Test Suite Placement

Suite-specific automated tests are organized as:

- `georesponse-fe/` — frontend unit/component tests colocated with source, run via Vitest.
- `georesponse-be/` — backend unit tests colocated with source, run via `go test`.
- `tests/integration/` — cross-boundary integration tests (currently a placeholder directory).
- `tests/e2e/` — end-to-end tests exercising the running stack (currently a placeholder directory).

The integration and e2e suites are scaffolded but not yet populated. As they are implemented, they should be added as additional pipeline stages — an integration stage that runs against a docker-compose-provisioned PostgreSQL/PostGIS instance, and an e2e stage that runs against the composed frontend + backend + database stack described in `DOCKER_COMPOSE.md`.

### 4.4 Docker Build Verification

After lint/build/test succeed, the pipeline builds both Docker images (`georesponse-fe/Dockerfile`, `georesponse-be/Dockerfile`) to confirm they build cleanly from the current source tree. Images built during CI are used only for verification; they are not pushed to a registry as part of this take-home's scope.

---

## 5. Illustrative Pipeline Definition

The following is a representative GitHub Actions workflow. It illustrates the intended pipeline shape; the actual `.github/workflows/ci.yml` file is an implementation artifact still to be created alongside this documentation.

```yaml
# .github/workflows/ci.yml  (illustrative — not yet present in the repository)
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
      - run: npm run type-check
      - run: npm run build
      - run: npm run test -- --run

  backend:
    name: Backend (vet, build, test)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: georesponse-be
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.22"
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
        uses: docker/build-push-action@v5
        with:
          context: ./georesponse-fe
          push: false
          tags: georesponse-fe:ci
      - name: Build backend image
        uses: docker/build-push-action@v5
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
