# GeoResponse

A geospatial resource management application for disaster response.

## Implementation Status

This repository currently contains the full specification and documentation
set for GeoResponse — `docs/01_product/` through `docs/13_ai/`, plus this
README, `AGENTS.md`, and `CLAUDE.md` — covering product scope, requirements,
architecture, API/data contracts, engineering standards, and AI-assisted
workflow.

**Phase 0 (Repository & Tooling Setup, per `IMPLEMENTATION_CHECKLIST.md`
section 3) is done; the actual resource-management features are not yet
implemented:**

- `georesponse-be/` has a real `go.mod`, a minimal `net/http`/Chi server
  (`cmd/api/main.go`), config loading, structured logging, and a working
  `GET /health` endpoint — verified with `go build`/`go vet`/`gofmt` and a
  live smoke test. No feature packages (`resource`, `auth`, etc.) exist
  yet; the API only has `/health`, not the surface in `API_CONTRACT.md`.
- `georesponse-fe/` has a complete `package.json`, Rspack/TypeScript/
  ESLint/Prettier/Tailwind CSS v4/Vitest configuration wired to the
  existing `src/` files — **not yet verified**, since Node.js/npm are not
  available in the environment that built it. Run `npm install && npm run
  build` to confirm before trusting it.
- `database/migrations/` has 5 migration pairs and `database/seeds/` has a
  sample dataset, matching `DATABASE_SCHEMA.md` — **not yet applied**
  against a real database (none was available to test against).
- `scripts/database/`, `scripts/dev/`, and `scripts/quality/` (including
  real lint config and a working `sonar-project.properties` +
  `sonar.sh`/`.ps1`) have real content — **not yet run end-to-end**
  (requires Node.js, Go — available — a live PostgreSQL+PostGIS instance,
  and optionally the `migrate`/`sonar-scanner` CLIs).
- `docker/`, both applications' `Dockerfile`s, and `scripts/docker/`/
  `scripts/deployment/` remain placeholders — that's Phase 8, not started.

See `QUICK_START.md` for the short version of how to run what exists today,
and `IMPLEMENTATION_CHECKLIST.md` for the exact, checkbox-level state of
every phase. This status is disclosed here, consistent with the take-home
brief's requirement to document any incomplete feature, rather than left
implicit.

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
| Styling | CSS | Low dependency overhead, sufficient for the app's scope |
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
├── AGENTS.md              # Tool-agnostic operating rules for AI coding agents
├── CLAUDE.md              # Claude Code entry point (mirrors AGENTS.md)
└── README.md               # This file
```

## Running the System

Once implementation is complete, the intended way to run the whole stack
locally is a single command from the repository root:

```bash
./run.sh        # macOS/Linux
```

```powershell
.\run.ps1       # Windows
```

`run.sh`/`run.ps1` copy each `.env.example` to `.env` if one doesn't already
exist, then start the full stack (frontend, backend, PostGIS) via
`docker compose`, with the database schema migrated automatically before the
backend starts serving. No other setup step is required. See
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
has similar helpers for day-to-day setup. Container definitions for running
the full stack locally are under `docker/`.

End-to-end and cross-application integration tests live in `tests/e2e/` and
`tests/integration/`, separate from each application's own unit/component
tests.

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
