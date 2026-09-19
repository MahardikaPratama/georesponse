# Quick Start

A one-page answer to the three things this take-home test explicitly asks
the documentation to cover: how to run the program, why these libraries
were chosen, and how Agentic AI was used. For full detail, follow the links
in each section — this file is deliberately short.

See `README.md` section **Implementation Status** for what is and is not
implemented; in short, the application is complete and runnable, and this
page tells you how.

---

## 1. How to Run the Program

### The single command (Docker)

The only prerequisite is Docker (Docker Desktop, or Docker Engine with the
Compose v2 plugin), running.

```bash
./run.sh        # macOS/Linux
```

```powershell
.\run.ps1       # Windows
```

This creates the three `.env` files from their `.env.example` (only if
missing), builds both images, starts PostgreSQL + PostGIS, the Go backend,
and the nginx-served frontend, waits until all three are healthy, and prints
the URLs:

| What | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080/api/v1 |
| Health check | http://localhost:8080/health |

On a brand-new database volume the schema is migrated and the demo data
seeded automatically. Log in with `user-001` / `ChangeMe123!` (administrator)
or `user-002` / `ChangeMe123!` (coordinator, read-only) — local-development placeholders,
see `AKUN.md`. Stop with `./run.sh --down` (`.\run.ps1 -Down`); reset the
database with `docker compose down -v`.

### Running each application directly (day-to-day development)

```bash
# database only, from the repository root
docker compose up -d georesponse-db

# backend
cd georesponse-be
cp .env.example .env                  # first time only
set -a && source .env && set +a       # load .env into the shell
go run ./cmd/api                      # applies pending migrations, then serves on :8080

# frontend (separate terminal)
cd georesponse-fe
cp .env.example .env                  # first time only
npm install
npm run dev                           # http://localhost:5173
```

Full detail: `georesponse-be/README.md`, `georesponse-fe/README.md`.

### Tests

```bash
scripts/dev/test.sh                   # frontend + backend unit tests (test.ps1 on Windows)
GEORESPONSE_API_URL=http://localhost:8080 scripts/dev/test.sh   # …plus tests/integration/
cd tests/e2e && npm install && npm run install-browsers && npm test   # browser golden path
```

Full checkbox-level status of what's done vs. pending:
`IMPLEMENTATION_CHECKLIST.md`.

---

## 2. Why These Libraries

| Area | Choice | Why (one line) |
|---|---|---|
| Frontend | React + TypeScript | Mandatory per the take-home brief |
| Build tool | Rspack | Fast Rust-based bundler with first-class TS/React support |
| Map | MapLibre GL JS | Won a controlled benchmark against Leaflet/OpenLayers on rendering scalability at 10,000+ features — see `geo-map-benchmark/` |
| Server state | TanStack Query | Handles fetch/cache/mutation lifecycle for API-derived data without hand-rolled `useEffect` plumbing |
| Client state | React `useState`/`useReducer` | Local UI state doesn't justify a global store at this scope |
| Styling | Tailwind CSS v4 | Utility-first, co-located with components, no separate design-system dependency |
| Backend | Go | Mandatory per the take-home brief |
| Router | Chi + `net/http` | Lightweight, stays close to the standard library, sufficient for a resource-oriented REST API |
| API | REST + JSON | Simple, browser-native, no gRPC-Web complexity for a CRUD-shaped brief |
| Database | PostgreSQL + PostGIS | Relational model fits the domain; PostGIS gives real geospatial querying for location data |
| Frontend tests | Vitest + React Testing Library | Behavior-focused component testing, fast, Rspack-friendly |
| Backend tests | Go `testing` | Standard library is sufficient at this scope; no added test framework |

Full rationale, alternatives considered, and trade-offs:
`docs/05_engineering/TECHNOLOGY_SELECTION.md`. The map-library benchmark
methodology and raw results: `geo-map-benchmark/docs/`.

---

## 3. Agentic AI Workflow — How Far It Was Used

Claude Code (an Agentic AI coding tool) was used extensively on this
project, under the direction and review of the human operator, Mahardika
Pratama, across every stage:

1. **The entire `docs/` specification** (`docs/01_product` through
   `docs/13_ai`, plus this repository's root `README.md`, `AGENTS.md`,
   `CLAUDE.md`) was AI-drafted from the operator's product/scope decisions,
   then reviewed, corrected, and iterated with the operator — including
   several rounds of cross-document consistency audits to remove
   redundancy and fix contradictions between documents.
2. **The implementation**, phase by phase per `IMPLEMENTATION_CHECKLIST.md`
   — backend domain/repository/use-case/HTTP layers, frontend foundation and
   features, the map-library benchmark harness, database migrations and
   seeds, containerization, CI, and the integration/e2e suites — was
   AI-drafted against the specs above, with the operator making the
   concrete decisions (module path, migration tool, dependency choices,
   UI behaviour, what to defer) and reviewing every change. Each phase was
   verified with whatever the environment allowed (`go build`/`vet`/
   `gofmt`/`go test`, `npm run lint`/`typecheck`/`build`/`test`, live
   database runs, `docker compose up --build`, the integration suite
   against the running stack, CI on `main`); where a check could not be
   run locally, the checklist says so explicitly rather than assuming it
   passed.

The durable rules an AI agent must follow on this repository, and the
step-by-step working procedure behind the summary above, are the canonical
policy documents this section summarizes: `docs/13_ai/AI_OPERATION_RULES.md`
and `docs/13_ai/AI_WORKFLOW.md`. The root `AGENTS.md`/`CLAUDE.md` are the
operational entry points an AI tool reads first when opening this
repository.
