# Claude Code Instructions

This is Claude Code's entry point for the GeoResponse repository. It mirrors
[`AGENTS.md`](AGENTS.md) (the tool-agnostic instructions file) by design —
both are kept complete and self-sufficient because different agentic tools
read one or the other, not necessarily both.

## 1. Project Overview

**Project:** GeoResponse — a geospatial resource management application for
disaster response.

GeoResponse provides a centralized, structured representation of resources
involved in disaster response — vehicles, facilities, equipment, and IoT
devices — so operators and response coordinators can view, manage, search,
filter, and monitor them, with geographic location treated as a fundamental
part of every resource rather than an optional attribute.

This repository contains the whole system:

- `georesponse-fe/` — React + TypeScript frontend
- `georesponse-be/` — Go backend
- `database/` — PostgreSQL + PostGIS migrations and seed data
- `docker/`, `scripts/`, `tests/` — orchestration, automation, and
  cross-application tests
- `geo-map-benchmark/` — a standalone, self-contained sub-project (its own
  `AGENT.md` / `CLAUDE.md` apply inside it) that benchmarked map libraries
  and produced the MapLibre GL JS decision consumed by `georesponse-fe`
- `docs/` — the authoritative, spec-driven documentation for the project

How to run the system locally is documented in the root
[`README.md`](README.md) and in each application's own README
([`georesponse-fe/README.md`](georesponse-fe/README.md),
[`georesponse-be/README.md`](georesponse-be/README.md)) — including the
current implementation status and what is intentionally out of scope (see
[`README.md#implementation-status`](README.md#implementation-status)).

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

`Relocation` is a change to an existing resource's `Location`; it never
creates a new resource and never changes the resource's identity or type.
`Entity` may appear as a generic technical term or a reference to the
original take-home brief, but `Resource` is the term to use in code, docs,
and commit messages.

The full domain model, including invariants, lifecycle, and terminology, is
in [`docs/01_product/DOMAIN_MODEL.md`](docs/01_product/DOMAIN_MODEL.md).

## 3. Mandatory Technology Stack

These are fixed. Do not replace or work around them:

```text
Frontend → React + TypeScript, built with Rspack
Backend  → Go
Map      → MapLibre GL JS (behind a Map Adapter)
Database → PostgreSQL + PostGIS
API      → REST + JSON, versioned under /api/v1
```

Also fixed by prior technical evaluation (not to be silently swapped):

- HTTP routing: Chi + `net/http`
- Server state: TanStack Query
- Client state: React `useState` / `useReducer` (no Redux/Zustand)
- Styling: CSS via Tailwind CSS v4 (utility classes in JSX; no component library)
- Frontend tests: Vitest + React Testing Library
- Backend tests: Go `testing`

Rationale for each is in
[`docs/05_engineering/TECHNOLOGY_SELECTION.md`](docs/05_engineering/TECHNOLOGY_SELECTION.md).
The map library specifically was chosen via a controlled benchmark in
`geo-map-benchmark/`, not by assumption — do not second-guess it without new
benchmark evidence.

## 4. Architecture Boundaries

GeoResponse is a **Modular Monolith** — two applications, one clear direction
of dependency, no microservices or distributed infrastructure:

```text
React + TypeScript  →  REST/JSON  →  Go  →  PostgreSQL + PostGIS
```

- **Backend**, one-directional: `HTTP Handler → Application/Use Case → Domain
  → Repository Interface → Repository Implementation → DB`. No business logic
  in handlers, no direct DB access from a handler, domain code has no
  HTTP/DB-driver dependency.
- **Frontend**, one-directional: `Page/Feature → Components/Hooks → API
  client / Map Adapter → External system`. All MapLibre-specific code stays
  behind the **Map Adapter** — feature components never call MapLibre APIs
  directly.

Full detail: [`docs/03_architecture/SYSTEM_ARCHITECTURE.md`](docs/03_architecture/SYSTEM_ARCHITECTURE.md),
[`docs/03_architecture/DEPENDENCY_RULES.md`](docs/03_architecture/DEPENDENCY_RULES.md),
and [`docs/13_ai/AI_OPERATION_RULES.md`](docs/13_ai/AI_OPERATION_RULES.md)
section 4.

## 5. Source-of-Truth Precedence

When documentation, code, and your own assumptions disagree: `docs/01_product/`
and `docs/02_requirements/` (what the product must do) outrank
`docs/03_architecture/` and `docs/04_contracts/` (how it's shaped), which
outrank `docs/05_engineering/` onward (conventions), which outrank existing
code, which outranks your own judgment. When none of the above resolves the
question, make the smallest reasonable assumption and surface it rather than
silently guessing.

Never assume a requirement, contract, or architectural decision. Read the
relevant `docs/` file first — especially before touching anything under
`docs/01_product/` through `docs/04_contracts/`. Full precedence order:
[`docs/13_ai/AI_OPERATION_RULES.md`](docs/13_ai/AI_OPERATION_RULES.md)
section 2.

## 6. Coding Standards and Naming

- Coding standards (file headers, naming, documentation, error handling,
  formatting, review checklist): [`docs/05_engineering/CODING_STANDARDS.md`](docs/05_engineering/CODING_STANDARDS.md).
- Frontend naming conventions: [`docs/06_frontend/FRONTEND_NAMING.md`](docs/06_frontend/FRONTEND_NAMING.md).
- Backend naming conventions: [`docs/07_backend/BACKEND_NAMING.md`](docs/07_backend/BACKEND_NAMING.md).

Key points worth repeating here because they're easy to violate accidentally:

- TypeScript: components `PascalCase`, functions/variables `camelCase`,
  constants `SCREAMING_SNAKE_CASE`, hooks `useCamelCase`, colocated tests
  (`*.test.ts(x)`, no `__tests__` directories).
- Go: idiomatic Go, `gofmt`, GoDoc comments on exported identifiers, thin
  handlers, no business logic in the transport layer.
- Every source file needs a short file-level header describing its purpose
  (see `CODING_STANDARDS.md` §3 for the exact form per language).

## 7. Git and Commit Conventions

Follow [`docs/10_git/GIT_MANAGEMENT.md`](docs/10_git/GIT_MANAGEMENT.md) and,
for pull requests, [`docs/10_git/PULL_REQUEST_GUIDELINES.md`](docs/10_git/PULL_REQUEST_GUIDELINES.md).
Keep commits focused and scoped to one concern; do not mix unrelated
refactoring with feature work, and do not amend or force-push shared history
without being explicitly asked.

## 8. Validation Rules

Validation happens at both boundaries, but they are not equally
authoritative: **backend validation is authoritative** — it must
independently validate every incoming request, since API requests cannot be
trusted to originate only from the frontend — while **frontend validation is
supplementary**, for immediate user feedback only. See
[`docs/07_backend/BACKEND_VALIDATION.md`](docs/07_backend/BACKEND_VALIDATION.md).

## 9. Explicitly Out of Scope — Do Not Introduce

gRPC as the primary browser-facing API, microservices/microfrontends,
message brokers, Redis, Kubernetes, a dedicated global state management
library (Redux, Zustand, etc.), and additional abstraction layers without a
concrete requirement are intentionally excluded at the current scope — not
rejected forever, just unjustified by current requirements. Do not introduce
any of these without a documented, requirement-driven reason. Full list and
rationale: [`docs/05_engineering/TECHNOLOGY_SELECTION.md`](docs/05_engineering/TECHNOLOGY_SELECTION.md)
§17 and [`docs/13_ai/AI_OPERATION_RULES.md`](docs/13_ai/AI_OPERATION_RULES.md)
section 5.

## 10. Working Procedure

Before making a change: read the relevant `docs/` files → identify which
layer/boundary owns the change → make the smallest correct change → validate
(build, lint, tests — never claim a check passed without actually running
it) → update docs in the same change if a contract or documented behavior
changed → report what changed, why, and what was verified.

Full step-by-step procedure with a worked example: [`docs/13_ai/AI_WORKFLOW.md`](docs/13_ai/AI_WORKFLOW.md)
section 2.

## 11. Canonical AI Policy

This file is a summary. The full, long-form AI operating policy for this
repository lives in:

- [`docs/13_ai/AI_OPERATION_RULES.md`](docs/13_ai/AI_OPERATION_RULES.md) —
  durable rules for how an AI agent should behave in this codebase.
- [`docs/13_ai/AI_WORKFLOW.md`](docs/13_ai/AI_WORKFLOW.md) — the procedural,
  step-by-step AI-assisted working process for this project.

Where this file and those documents disagree, the documents in `docs/13_ai/`
win. This file exists so Claude Code has enough context to act correctly
without reading the entire `docs/` tree on every task — it is not a
replacement for it.

## 12. Relationship to geo-map-benchmark

`geo-map-benchmark/` is a separate, already-completed sub-project with its
own `CLAUDE.md` and `AGENT.md`. When working inside that directory, its own
instructions take precedence for benchmark-specific rules (benchmark
integrity, scenario definitions, measurement methodology); this file's
architecture and domain sections describe the main application, not the
benchmark harness.

## 13. AGENTS.md

[`AGENTS.md`](AGENTS.md) at the repository root covers the same ground as
this file, in a tool-agnostic form many other agentic coding tools read by
convention. The two are kept in sync intentionally — treat a change to one as
a reason to check whether the other needs the same update.
