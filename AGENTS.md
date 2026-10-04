# AI Agent Instructions

## 1. Project Overview

**Project:** GeoResponse, a geospatial resource management application for
disaster response.

GeoResponse gives operators and response coordinators one structured view
of the resources involved in disaster response (vehicles, facilities,
equipment, and IoT devices) so they can view, manage, search, filter, and
monitor them. Geographic location is a fundamental part of every resource,
not an optional attribute.

This repository contains the whole system:

- `georesponse-fe/`: React + TypeScript frontend
- `georesponse-be/`: Go backend
- `database/`: PostgreSQL + PostGIS migrations and seed data
- `docker/`, `scripts/`, `tests/`: orchestration, automation, and
  cross-application tests
- `geo-map-benchmark/`: a self-contained sub-project that benchmarked map
  libraries and produced the MapLibre GL JS decision used by
  `georesponse-fe` (see section 12)
- `docs/`: the authoritative, spec-driven project documentation

How to run the system, the current implementation status, and what is out
of scope are in the root [`README.md`](README.md) (see
[`README.md#implementation-status`](README.md#implementation-status)) and
in each application's README
([`georesponse-fe/README.md`](georesponse-fe/README.md),
[`georesponse-be/README.md`](georesponse-be/README.md)).

## 2. Domain

The primary domain concept is `Resource`, **not** a generic "entity". A
resource has:

```text
Resource
├── Identity     (id, name)
├── Type         (VEHICLE | FACILITY | EQUIPMENT | IOT_DEVICE)
├── Attributes   (type-specific, e.g. capacity, quantity)
├── Status       (AVAILABLE | IN_USE | MAINTENANCE | UNAVAILABLE)
└── Location     (latitude, longitude)
```

`Relocation` is a change to an existing resource's `Location`. It never
creates a new resource and never changes the resource's identity or type.
"Entity" may appear as a generic technical term or when quoting the
original take-home brief, but code, docs, and commit messages use
`Resource`.

The full domain model (invariants, lifecycle, terminology) is in
[`docs/01_product/DOMAIN_MODEL.md`](docs/01_product/DOMAIN_MODEL.md).

## 3. Mandatory Technology Stack

These are fixed. Do not replace or work around them:

```text
Frontend → React + TypeScript, built with Rspack
Backend  → Go
Map      → MapLibre GL JS (behind a Map Adapter)
Database → PostgreSQL + PostGIS
API      → REST + JSON, versioned under /api/v1
```

Also fixed by prior technical evaluation, and not to be swapped silently:

- HTTP routing: Chi + `net/http`
- Server state: TanStack Query
- Client state: React `useState` / `useReducer` (no Redux/Zustand)
- Styling: Tailwind CSS v4 utility classes in JSX (no component library)
- Frontend tests: Vitest + React Testing Library
- Backend tests: Go `testing`

The rationale for each is in
[`docs/05_engineering/TECHNOLOGY_SELECTION.md`](docs/05_engineering/TECHNOLOGY_SELECTION.md).
The map library was chosen through a controlled benchmark in
`geo-map-benchmark/`; do not second-guess it without new benchmark
evidence.

## 4. Architecture Boundaries

GeoResponse is a **Modular Monolith**: two applications, one direction of
dependency, no microservices or distributed infrastructure.

```text
React + TypeScript  →  REST/JSON  →  Go  →  PostgreSQL + PostGIS
```

- **Backend**, one-directional: `HTTP Handler → Application/Use Case →
  Domain → Repository Interface → Repository Implementation → DB`. No
  business logic in handlers, no direct DB access from a handler, and no
  HTTP or DB-driver dependency in domain code.
- **Frontend**, one-directional: `Page/Feature → Components/Hooks → API
  client / Map Adapter → External system`. All MapLibre-specific code stays
  behind the **Map Adapter**; feature components never call MapLibre APIs
  directly.

Full detail:
[`docs/03_architecture/SYSTEM_ARCHITECTURE.md`](docs/03_architecture/SYSTEM_ARCHITECTURE.md)
and
[`docs/03_architecture/DEPENDENCY_RULES.md`](docs/03_architecture/DEPENDENCY_RULES.md).

## 5. Source-of-Truth Precedence

When docs, code, and your own assumptions disagree, `docs/01_product/` and
`docs/02_requirements/` (what the product must do) outrank
`docs/03_architecture/` and `docs/04_contracts/` (how it is shaped), which
outrank `docs/05_engineering/` through `docs/13_ai/` (conventions), which
outrank existing code, which outranks your own judgment. If nothing
resolves the question, make the smallest reasonable assumption and surface
it.

Never assume a requirement, contract, or architectural decision. Read the
relevant `docs/` file first, especially before touching anything under
`docs/01_product/` to `docs/04_contracts/`. The full order, including where
operator instructions and the mandatory stack sit, is in
[`docs/13_ai/AI_OPERATION_RULES.md`](docs/13_ai/AI_OPERATION_RULES.md)
section 2.

## 6. Coding Standards and Naming

- Coding standards (file headers, naming, documentation, error handling,
  formatting, review checklist):
  [`docs/05_engineering/CODING_STANDARDS.md`](docs/05_engineering/CODING_STANDARDS.md).
- Frontend naming:
  [`docs/06_frontend/FRONTEND_NAMING.md`](docs/06_frontend/FRONTEND_NAMING.md).
- Backend naming:
  [`docs/07_backend/BACKEND_NAMING.md`](docs/07_backend/BACKEND_NAMING.md).

Easy to violate by accident:

- TypeScript: components `PascalCase`, functions and variables `camelCase`,
  constants `SCREAMING_SNAKE_CASE`, hooks `useCamelCase`, colocated tests
  (`*.test.ts(x)`, no `__tests__` directories).
- Go: idiomatic Go, `gofmt`, GoDoc comments on exported identifiers, thin
  handlers, no business logic in the transport layer.
- Every source file needs a short file-level header describing its purpose
  (see `CODING_STANDARDS.md` section 3 for the form per language).

## 7. Git and Commit Conventions

Follow [`docs/10_git/GIT_MANAGEMENT.md`](docs/10_git/GIT_MANAGEMENT.md)
and, for pull requests,
[`docs/10_git/PULL_REQUEST_GUIDELINES.md`](docs/10_git/PULL_REQUEST_GUIDELINES.md).
Keep each commit to one concern, do not mix unrelated refactoring with
feature work, and do not amend or force-push shared history unless asked.

## 8. Validation Rules

Validation runs at both boundaries, but **backend validation is
authoritative**: it independently validates every request, because API
requests cannot be trusted to come only from the frontend. **Frontend
validation is supplementary**, for immediate user feedback. See
[`docs/07_backend/BACKEND_VALIDATION.md`](docs/07_backend/BACKEND_VALIDATION.md).

## 9. Out of Scope: Do Not Introduce

gRPC as the primary browser-facing API, microservices or microfrontends,
message brokers, Redis, Kubernetes, a global state management library
(Redux, Zustand, etc.), and abstraction layers without a concrete
requirement are excluded at the current scope because no requirement
justifies them. Do not introduce any of these without a documented,
requirement-driven reason. Full list and rationale:
[`docs/05_engineering/TECHNOLOGY_SELECTION.md`](docs/05_engineering/TECHNOLOGY_SELECTION.md)
section 17 and
[`docs/13_ai/AI_OPERATION_RULES.md`](docs/13_ai/AI_OPERATION_RULES.md)
section 5.

## 10. Working Procedure

Read the relevant `docs/` files, identify which layer owns the change, make
the smallest correct change, and validate it (build, lint, tests; never
claim a check passed without running it). Update docs in the same change if
a contract or documented behavior changed, then report what changed, why,
and what was verified.

The general sequence is in
[`docs/12_workflow/DEVELOPMENT_WORKFLOW.md`](docs/12_workflow/DEVELOPMENT_WORKFLOW.md);
the AI-specific steps, report format, and a worked example are in
[`docs/13_ai/AI_WORKFLOW.md`](docs/13_ai/AI_WORKFLOW.md) section 2.

## 11. Canonical AI Policy

This file is a summary. The full AI policy is in:

- [`docs/13_ai/AI_OPERATION_RULES.md`](docs/13_ai/AI_OPERATION_RULES.md):
  the rules an AI agent follows in this codebase.
- [`docs/13_ai/AI_WORKFLOW.md`](docs/13_ai/AI_WORKFLOW.md): the AI-assisted
  working procedure and the disclosure of how AI was used.

Where this file and those documents disagree, `docs/13_ai/` wins. This file
gives an agent enough context to act correctly without reading the whole
`docs/` tree first; it does not replace it. [`CLAUDE.md`](CLAUDE.md)
imports this file, so Claude Code and other agentic tools read the same
rules.

## 12. Relationship to geo-map-benchmark

`geo-map-benchmark/` is a separate, completed sub-project with its own
`CLAUDE.md` and `AGENT.md`. Inside that directory, its instructions take
precedence for benchmark-specific rules (benchmark integrity, scenario
definitions, measurement methodology). This file's architecture and domain
sections describe the main application, not the benchmark harness.
