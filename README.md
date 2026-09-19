# GeoResponse

A geospatial resource management application for disaster response.

## Implementation Status

GeoResponse is implemented end to end and runs with one command
(`./run.sh` / `.\run.ps1`, see [Running the System](#running-the-system)):

- **Backend** (`georesponse-be/`) — the full `/api/v1` surface in
  `docs/04_contracts/API_CONTRACT.md`: resource CRUD, status change,
  relocation, history, search/filter/pagination, cookie-based
  authentication, role/permission management, audit trail, the BMKG
  GeoHotspot overlay endpoint, and `GET /health`. Configuration is
  validated at start-up (the process refuses to start on a missing or
  malformed variable), and in `APP_ENV=development` pending migrations are
  applied automatically before the port is bound.
- **Frontend** (`georesponse-fe/`) — login, resource list + MapLibre map
  (behind the Map Adapter), search/filter, detail card, create (form or
  double-click on the map), update, status change, relocate, delete,
  history view, role management, audit trail view, and the hotspot overlay.
- **Database** (`database/`) — seven migration pairs and three seed files
  (sample resources plus two demo accounts, see `AKUN.md`).
- **Containerization** — real multi-stage `Dockerfile`s for both apps, a
  root `docker-compose.yml` (PostGIS with first-run migration + seeding,
  backend with healthcheck, nginx-served frontend), `run.sh`/`run.ps1`, and
  the `scripts/docker/` and `scripts/deployment/` script pairs.
- **Tests** — unit tests colocated with the code (Go `testing`; Vitest +
  React Testing Library), an API integration suite under
  `tests/integration/` (runs in CI against a PostGIS service container),
  and a Playwright golden-path e2e test under `tests/e2e/` (run locally
  against the composed stack; see `tests/README.md`).
- **CI** — `.github/workflows/ci.yml`: frontend lint/type-check/build/test,
  backend fmt/vet/build/test, the integration job, and Docker image build
  verification for both images.

Intentionally not implemented at this scope, per
`docs/01_product/SCOPE.md` and `docs/05_engineering/TECHNOLOGY_SELECTION.md`
section 17: any deployment to a hosted environment, continuous deployment,
TLS termination, a container registry, and the e2e suite as a CI stage. The
exact, checkbox-level state of every phase — including which verification
steps were run in which environment — is tracked in
`IMPLEMENTATION_CHECKLIST.md`. This status is disclosed here, consistent
with the take-home brief's requirement to document any incomplete feature,
rather than left implicit.

## Overview

During disaster response operations, having accurate and structured information
about available resources — vehicles, facilities, equipment, IoT devices — is
critical to understanding operational conditions. Without a centralized,
structured system, it's hard to know what's available, where it is, and what
condition it's in.

GeoResponse addresses this by providing a single system for managing
`Resource` records — each with an identity, type, attributes, operational
status, and geographic location — and by treating geographic location as a
first-class part of the data model rather than an afterthought. Operators can
create, update, and relocate resources; response coordinators can search,
filter, and view the distribution of resources on a map to understand the
current state of the response.

The full product rationale, users, and scope live in
[`docs/01_product/PRODUCT_CONTEXT.md`](docs/01_product/PRODUCT_CONTEXT.md).

## Key Features

- **Resource management** — create, view, update, and delete resources
  (vehicles, facilities, equipment, IoT devices), each with type-specific
  attributes.
- **Status tracking** — every resource carries an operational status
  (`AVAILABLE`, `IN_USE`, `MAINTENANCE`, `UNAVAILABLE`) so its condition is
  visible at a glance.
- **Geospatial visualization** — resources are rendered on an interactive map
  based on their geographic coordinates.
- **Search and filtering** — find resources by name, type, status, and other
  relevant criteria.
- **Resource relocation** — update a resource's location while preserving its
  identity, type, and history.

See [`docs/01_product/DOMAIN_MODEL.md`](docs/01_product/DOMAIN_MODEL.md) for
the precise definition of `Resource` and its lifecycle, and
[`docs/01_product/USE_CASES.md`](docs/01_product/USE_CASES.md) for the
concrete user-facing flows.

## Tech Stack

| Area | Technology | Why |
|---|---|---|
| Frontend | React + TypeScript | Mandatory requirement |
| Build Tool | Rspack | Fast dev server and production bundling |
| Map | MapLibre GL JS | Selected via a controlled benchmark against Leaflet and OpenLayers — see `geo-map-benchmark/` |
| Server State | TanStack Query | Caching, refetching, and mutation lifecycle for API data |
| Client State | React `useState` / `useReducer` | Sufficient for local UI state; no global store needed |
| Styling | CSS (Tailwind CSS v4) | Low dependency overhead, sufficient for the app's scope |
| Frontend Testing | Vitest + React Testing Library | Component and behavior testing |
| Backend | Go | Mandatory requirement |
| HTTP Routing | Chi + `net/http` | Lightweight routing on top of the Go standard library |
| API | REST + JSON at `/api/v1` | Resource-oriented CRUD, directly consumable by the browser |
| Database | PostgreSQL + PostGIS | Relational storage with dedicated geospatial query support |
| Backend Testing | Go `testing` | Native, no extra dependency |

Full rationale, alternatives considered, and explicit non-goals (no gRPC as
the primary API, no microservices, no Kubernetes, no Redis, no message
brokers) are documented in
[`docs/05_engineering/TECHNOLOGY_SELECTION.md`](docs/05_engineering/TECHNOLOGY_SELECTION.md).

## Repository Structure

```text
georesponse/
├── georesponse-fe/       # React + TypeScript frontend application
├── georesponse-be/       # Go backend application (REST API)
├── database/             # SQL migrations and seed data
│   ├── migrations/
│   └── seeds/
├── docker/                # Container and local-orchestration assets
│   └── postgres/init/     # First-run migration + seed hook for the compose database
├── scripts/               # Dev, database, deployment, docker, and quality scripts (.sh + .ps1 pairs)
│   ├── dev/
│   ├── database/
│   ├── deployment/
│   ├── docker/
│   └── quality/
├── tests/                 # Cross-application tests
│   ├── e2e/
│   └── integration/
├── geo-map-benchmark/     # Standalone sub-project: benchmarks Leaflet, OpenLayers,
│                          # and MapLibre GL JS; its result is consumed by georesponse-fe
├── docs/                  # Authoritative, spec-driven project documentation (01_product … 13_ai)
├── .github/workflows/     # CI pipeline (ci.yml)
├── docker-compose.yml     # Local orchestration: PostGIS + backend + nginx-served frontend
├── run.sh, run.ps1        # One-command build-and-start of the whole stack
├── .env.example           # Compose-level variables (copied to .env by run.sh/run.ps1)
├── AKUN.md                # Seeded demo accounts (local development only)
├── QUICK_START.md         # One-page: how to run, why these libraries, how AI was used
├── IMPLEMENTATION_CHECKLIST.md  # Checkbox-level implementation status per phase
├── AGENTS.md              # Tool-agnostic operating rules for AI coding agents
├── CLAUDE.md              # Claude Code entry point (mirrors AGENTS.md)
└── README.md              # This file
```

## Running the System

The whole stack runs locally with a single command from the repository
root (Docker Desktop or Docker Engine + Compose v2 is the only
prerequisite):

```bash
./run.sh        # macOS/Linux
```

```powershell
.\run.ps1       # Windows
```

`run.sh`/`run.ps1` copy each `.env.example` to `.env` if one doesn't already
exist, then build and start the full stack (frontend, backend, PostGIS) via
`docker compose`, waiting until every service is healthy; on a brand-new
database volume the schema is migrated and seeded automatically, and the
backend applies any newer migration itself on every start. The frontend is
then at `http://localhost:5173` (demo login `user-001` / `ChangeMe123!`,
see `AKUN.md`), the API at `http://localhost:8080/api/v1`, and the health
check at `http://localhost:8080/health`. No other setup step is required.
See
[`docs/11_devops/DOCKER_COMPOSE.md`](docs/11_devops/DOCKER_COMPOSE.md) for
exactly what that script does under the hood, and
[`docs/11_devops/ENVIRONMENT_MANAGEMENT.md`](docs/11_devops/ENVIRONMENT_MANAGEMENT.md)
for the `.env` / `.env.example` convention used to keep configuration and
secrets out of version control.

Each application is also self-contained and has its own README with
prerequisites, install, and run instructions for running it directly
(without Docker), useful during day-to-day development:

- **Frontend** — see [`georesponse-fe/README.md`](georesponse-fe/README.md)
  (npm install, Rspack dev server, build, and the API base URL configuration
  it needs to reach the backend).
- **Backend** — see [`georesponse-be/README.md`](georesponse-be/README.md)
  (Go module setup, running the API server, and its database connection
  configuration).

The database schema and seed data live in `database/migrations/` and
`database/seeds/`; the `scripts/database/` folder has paired `.sh`/`.ps1`
helpers to run migrations, rollbacks, and seeding. The `scripts/dev/` folder
has similar helpers for day-to-day setup. The compose file's first-run
database initialization hook lives under `docker/postgres/init/`.

End-to-end and cross-application integration tests live in `tests/e2e/` and
`tests/integration/`, separate from each application's own unit/component
tests; both need a running stack, and `tests/README.md` explains how to run
them.

### geo-map-benchmark

`geo-map-benchmark/` is a standalone sub-project, not part of the running
application. It's the controlled benchmark that compared Leaflet, OpenLayers,
and MapLibre GL JS against the map workloads GeoResponse actually needs
(point/GeoJSON/polygon rendering, multiple layers, large feature counts, pan
and zoom). Its conclusion — MapLibre GL JS — is what `georesponse-fe` uses in
production, isolated behind a Map Adapter. See
[`geo-map-benchmark/README.md`](geo-map-benchmark/README.md) for how to run
the benchmark itself and where its results are recorded.

## Documentation

The `docs/` tree is the authoritative, spec-driven documentation for the
whole project — it precedes and takes priority over any assumption made
during implementation. It's organized as a numbered sequence, roughly in the
order you'd want to read it:

| Range | Covers |
|---|---|
| `01_product/` | Product context, domain model, scope, use cases, business rules |
| `02_requirements/` | Functional and non-functional requirements |
| `03_architecture/` | System architecture, dependency rules, architecture decision records |
| `04_contracts/` | API contract and data contract between frontend and backend |
| `05_engineering/` | Technology selection, coding standards, testing strategy, security, observability |
| `06_frontend/` | Frontend architecture, naming, state, testing, UI/UX |
| `07_backend/` | Backend architecture, naming, validation, dependencies, error handling, testing |
| `08_database/` | Database architecture, schema, migrations, operations |
| `09_quality/` | Code quality rules and quality gates |
| `10_git/` | Git management and pull request guidelines |
| `11_devops/` | Docker Compose, containerization, deployment, environments, release management, CI/CD |
| `12_workflow/` | Development workflow and definition of done |
| `13_ai/` | Long-form AI operation rules and AI-assisted workflow |

When in doubt about how something should behave, look here first — `01`
through `04` for what the product needs to do and how the system is shaped,
`05` onward for how to build it correctly.

## AI-Assisted Development

Most of this repository's `docs/` tree, including this README's neighboring
`AGENTS.md` and `CLAUDE.md`, was produced with agentic AI assistance (Claude
Code) under human direction — a spec-driven, AI-assisted workflow is a
deliberate and documented part of how this project was built, not an
incidental detail. `AGENTS.md` (tool-agnostic) and `CLAUDE.md` (Claude Code's
specific entry point) define the operating rules any AI agent working in this
repository should follow — architecture boundaries, source-of-truth
precedence, coding standards, and validation expectations. The canonical,
long-form policy they summarize lives in
[`docs/13_ai/AI_OPERATION_RULES.md`](docs/13_ai/AI_OPERATION_RULES.md) and
[`docs/13_ai/AI_WORKFLOW.md`](docs/13_ai/AI_WORKFLOW.md).
