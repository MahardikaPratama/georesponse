# Quick Start

A one-page answer to the three things this take-home test explicitly asks
the documentation to cover: how to run the program, why these libraries
were chosen, and how Agentic AI was used. For full detail, follow the links
in each section — this file is deliberately short.

See `README.md` section **Implementation Status** before anything below:
Phase 0 (repository scaffolding) is done and verified where this
environment's tooling allowed; the resource-management features
themselves are not yet implemented.

---

## 1. How to Run the Program

### Backend — works today

```bash
cd georesponse-be
set -a && source .env && set +a   # load .env into the shell (copy from .env.example first)
go run ./cmd/api
```

Env vars (all optional in `APP_ENV=development`, defaults shown):
`HTTP_PORT=8080`, `APP_ENV=development`, `LOG_LEVEL=info`, `DATABASE_URL`
(unused until Phase 2 wires a repository). Verify it's up:

```bash
curl http://localhost:8080/health   # → 200 OK
```

Full detail: `georesponse-be/README.md`.

### Frontend — configured, not yet verified

```bash
cd georesponse-fe
npm install
npm run dev      # or: npm run build
```

Node.js/npm were not available in the environment this was built in, so
this has not been run end to end yet — treat it as untested until you run
it. Full detail: `georesponse-fe/README.md`.

### Database — scripted, not yet applied

```bash
# once a local PostgreSQL + PostGIS instance is running (see DOCKER_COMPOSE.md):
scripts/database/migrate.sh    # or migrate.ps1 on Windows
scripts/database/seed.sh       # or seed.ps1
```

### The intended single command (once Phase 8 lands)

```bash
./run.sh        # or run.ps1 — not implemented yet
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
Pratama, in two stages so far:

1. **The entire `docs/` specification** (`docs/01_product` through
   `docs/13_ai`, plus this repository's root `README.md`, `AGENTS.md`,
   `CLAUDE.md`) was AI-drafted from the operator's product/scope decisions,
   then reviewed, corrected, and iterated with the operator — including
   several rounds of cross-document consistency audits to remove
   redundancy and fix contradictions between documents.
2. **Phase 0 repository scaffolding** — the backend's minimal Go server,
   the frontend's build/lint/format configuration, the database migrations
   and seed data, and the dev/quality tooling scripts — was likewise
   AI-drafted against the specs above, with the operator making the
   concrete decisions (module path, migration tool, dependency choices)
   and reviewing the output. Verification that the environment allowed
   (`go build`/`go vet`/`gofmt`, a live health-check smoke test) was
   actually run and reported; verification that required unavailable
   tooling (Node.js/npm, a live database, `sonar-scanner`) was explicitly
   left unrun rather than assumed.

Application feature code (the resource CRUD/map behavior itself) has not
been built yet; when it is, it's expected to follow the same
read-first, smallest-correct-change, verify-and-report discipline.

The durable rules an AI agent must follow on this repository, and the
step-by-step working procedure behind the summary above, are the canonical
policy documents this section summarizes: `docs/13_ai/AI_OPERATION_RULES.md`
and `docs/13_ai/AI_WORKFLOW.md`. The root `AGENTS.md`/`CLAUDE.md` are the
operational entry points an AI tool reads first when opening this
repository.
