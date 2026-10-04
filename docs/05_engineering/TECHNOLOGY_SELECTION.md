# Technology Selection

## 1. Purpose

This document records the technology decisions for GeoResponse, a
geospatial resource management application, and the basis for each one.
Users view resources on a map, inspect their details, and create, update,
relocate, and delete them; the backend owns persistence and validation.

Two selection methods are used:

1. **Performance benchmarking** for the map library, because map rendering
   and interaction are core workloads where implementation characteristics
   materially affect user experience.
2. **Technical evaluation and references** for everything else, based on
   requirement fit, architectural fit, ecosystem maturity, maintainability,
   integration, and implementation complexity.

Performance is measured only where it is a meaningful differentiator for
the application's workload.

---

## 2. Application Requirements

The technology stack must support:

- React and TypeScript for the frontend.
- Go for the backend.
- Displaying resources on a map.
- Creating, updating, and deleting resources.
- Viewing resource details.
- Storing and retrieving data through the backend.
- Input or data validation on both frontend and backend.
- A maintainable implementation sized to the application scope.

The original brief does not require microservices, high-throughput RPC,
event streaming, or other infrastructure that would add significant
complexity without a corresponding requirement.

---

## 3. Selection Principles

### 3.1 Requirement Fit

A technology must directly support the application's functional and
technical requirements.

### 3.2 Simplicity

When multiple technologies satisfy the requirements, unnecessary complexity
is avoided.

### 3.3 Maintainability

The selected stack should be understandable, testable, and maintainable by
other developers.

### 3.4 Maturity and Ecosystem

Established technologies with good documentation, ecosystem support, and
adoption are preferred.

### 3.5 Performance Where It Matters

Performance benchmarking is performed only for workloads where runtime
characteristics can materially affect the application.

### 3.6 Avoid Premature Infrastructure

Technologies are not introduced merely because they are capable.
Additional infrastructure must provide a concrete benefit to the
application.

---

## 4. Selection Method

| Decision Type | Method | Examples |
|---|---|---|
| Mandatory | Defined by the take-home requirements | React, TypeScript, Go |
| Performance-sensitive | Controlled benchmark | Map library |
| General engineering decision | Technical evaluation and references | HTTP router, database, API style, state management, styling |

The map library is the only component with a dedicated performance
benchmark. Benchmarking a Go HTTP router, a state-management library, or an
API style would add measurement work without producing information relevant
to the expected workload.

---

## 5. Technology Overview

Each decision below follows the same pattern: what GeoResponse needs, the
choice, the alternatives and why they fit the application less well, and
the trade-off that was accepted.

| Area | Choice | Alternatives | Main reason (section) |
|---|---|---|---|
| Frontend framework | React | Mandatory | Required by the brief (6.1) |
| Frontend language | TypeScript | Mandatory | Required by the brief (6.2) |
| Build tool | Rspack | Vite, webpack | webpack-compatible config with a fast Rust toolchain, one bundler for dev and production (6.3) |
| Map library | MapLibre GL JS | Leaflet, OpenLayers | Render time stays flat up to 10,000 features in the benchmark (7) |
| Backend language | Go | Mandatory | Required by the brief (8.1) |
| HTTP routing | Chi + `net/http` | Standard `ServeMux`, Gin / Echo | Route groups and per-group auth middleware on plain `net/http` handlers (8.2) |
| API style | REST + JSON | GraphQL, gRPC-Web | One browser client, fixed screens, per-endpoint permissions (9) |
| Database | PostgreSQL + PostGIS | PostgreSQL with lat/lng columns, MongoDB | Relational integrity plus a real geographic type and spatial index (10.1) |
| Database access | pgx with hand-written SQL | GORM, sqlc | PostGIS expressions are plain SQL; no ORM or code generation step (10.2) |
| Client state | `useState` / `useReducer` | Redux Toolkit, Zustand | UI state is local to the page (11.1) |
| Server state | TanStack Query | `useEffect` + `fetch`, SWR / RTK Query | Cache invalidation, optimistic relocation, polling (11.2) |
| Styling | Tailwind CSS v4 | Plain CSS / CSS Modules, MUI / Ant Design | Map-first custom layout, one shared palette, no extra component bundle (12) |
| Frontend tests | Vitest + React Testing Library | Jest, Cypress component tests | Native TypeScript and ESM, Jest-style API, fast jsdom runs (14.1) |
| Backend tests | Go `testing` | testify, Ginkgo | Table-driven tests and `httptest` cover the needs (14.2) |
| End-to-end tests | Playwright | Cypress, Selenium | Drives a real browser against the composed stack with little setup (14.3) |

---

## 6. Frontend

### 6.1 React

**Decision: React.** React is required by the brief. Its component model
fits the interactive parts of the application: the map, the synchronized
list, the detail card, forms, filters, and validation feedback.

### 6.2 TypeScript

**Decision: TypeScript.** TypeScript is required by the brief. It gives
explicit types for resource models, API requests and responses,
coordinates, map features, and component props, so a contract change in
the API shows up as a compile error instead of a runtime bug.

### 6.3 Build Tool

**Decision: Rspack.**

**What GeoResponse needs.** A bundler for a React + TypeScript single-page
app that inlines three build-time values (`API_BASE_URL`, `MAP_TILE_URL`,
`LOG_LEVEL`), compiles TypeScript and JSX, runs a dev server, and produces
a production bundle that nginx serves.

| Option | Fit for GeoResponse |
|---|---|
| **Rspack** (chosen) | Uses the webpack configuration model, so build-time values are injected with the standard `DefinePlugin` and the config reads like a familiar webpack config. TypeScript and JSX compile through the built-in SWC loader (`builtin:swc-loader`), so no Babel or `ts-loader` setup is needed. The same bundler runs in development and production. |
| webpack | Same configuration model and plugin ecosystem, but it is JavaScript-based and needs extra loaders for TypeScript. Rspack keeps the model and drops that overhead. |
| Vite | An excellent dev server, but development (native ES modules served on demand) and production (a Rollup bundle) run through different pipelines, so a problem can appear only in the production build. Its configuration model also differs from webpack's. |

**Trade-off accepted.** Rspack's ecosystem is younger than webpack's and
smaller than Vite's. That matters little here because the app uses only
core features: the SWC loader, `DefinePlugin`, PostCSS for Tailwind, and the
dev server. Build speed is a developer convenience rather than a runtime
requirement, so it was not benchmarked.

---

## 7. Map Library

**Decision: MapLibre GL JS.**

**What GeoResponse needs.** Every resource is drawn on one map, together
with the optional BMKG hotspot overlay. During an active response the
number of resources and hotspots can grow sharply, and the map must stay
responsive while users pan, zoom, click markers, and double-click to
create a resource.

Leaflet, OpenLayers, and MapLibre GL JS were compared in a controlled
benchmark: map initialization; point, GeoJSON, and polygon rendering;
layer management; scaling from 100 to 10,000 features; pan/zoom and
feature interaction; memory; frame rate; and bundle size.

| Option | Fit for GeoResponse |
|---|---|
| **MapLibre GL JS** (chosen) | WebGL rendering. Render time stayed essentially flat from 100 to 10,000 point features (about 0.7 to 0.8 ms median). It was also fastest on the point, GeoJSON, polygon, and multi-layer scenarios, which match the resource layer plus hotspot overlay. |
| Leaflet | The smallest bundle (42.5 KB gzip) and the fastest initialization (20.85 ms median), but render time grew roughly 50x from 100 to 10,000 points. That is the scaling problem GeoResponse is most likely to hit. |
| OpenLayers | A full GIS toolkit (projections, OGC services, editing) that GeoResponse does not need. Render time grew roughly 90x over the same range. |

**Trade-off accepted.** Compared with Leaflet, MapLibre GL JS ships a
much larger bundle (269.2 KB vs 42.5 KB gzip), initializes more slowly
(280.65 ms vs 20.85 ms median), and uses more memory at initialization and
at 100 features (12.0 and 11.4 MB vs 4.4 and 5.7 MB median). Memory does
not favor Leaflet overall: results are mixed at 1,000 features, and at
10,000 features MapLibre used less than half of Leaflet's memory (16.9 MB
vs 37.6 MB). A one-time start-up cost was judged acceptable in exchange for
a map that stays fast as the feature count grows. Leaflet remains the
better choice for a small, mostly static map. The benchmark itself calls
this a qualified recommendation.

The full methodology, raw measurements, and limitations are in the
`geo-map-benchmark/` sub-project:

- [`geo-map-benchmark/docs/TECHNOLOGY_SELECTION.md`](../../geo-map-benchmark/docs/TECHNOLOGY_SELECTION.md):
  the recommendation and how each criterion was weighed.
- [`geo-map-benchmark/docs/BENCHMARK_RESULTS.md`](../../geo-map-benchmark/docs/BENCHMARK_RESULTS.md):
  the measured results.

In the application, all MapLibre-specific code sits behind the Map
Adapter (`DEPENDENCY_RULES.md` section 3, ADR-005), so the library can be
replaced without touching feature components.

---

## 8. Backend

### 8.1 Go

**Decision: Go.** Go is required by the brief. The backend handles the
HTTP API, validation, business logic, persistence, and error handling in a
layered structure (`SYSTEM_ARCHITECTURE.md` section 4).

### 8.2 HTTP Routing

**Decision: Chi on top of `net/http`.**

**What GeoResponse needs.** Twenty-one routes under `/api/v1`, grouped
by area (`/auth`, `/resources`, `/roles`). A global middleware chain
(request ID, logging, panic recovery, CORS) applies to every route. Almost
every route also requires authentication, but login does not, so auth
middleware must be attachable per group and per route.
`internal/http/router.go` does exactly this with `r.Route(...)`,
`r.Use(requireAuth)`, and `r.With(requireAuth)`.

| Option | Fit for GeoResponse |
|---|---|
| **Chi** (chosen) | Route groups and group-level or route-level middleware, while handlers stay plain `http.HandlerFunc` values. Handlers and middleware are tested with the standard `httptest` package, and Chi's own dependency footprint is small. |
| Standard `ServeMux` (Go 1.22+) | Supports method and path patterns, so plain routing would work. It has no route groups or per-group middleware, so `requireAuth` would have to wrap each protected route by hand. Forgetting one wrapper would expose an endpoint without authentication. |
| Gin / Echo | Full frameworks with their own context type (`*gin.Context`, `echo.Context`) in place of `http.Handler`, so every handler and middleware becomes tied to the framework. Their built-in request binding and validation would also overlap with validation that must live in the use-case and domain layers (`BACKEND_VALIDATION.md`). |

**Trade-off accepted.** One small third-party dependency in exchange for
grouped routes and safer auth wiring. Routers are not benchmarked: the
request path is dominated by database access, not routing.

---

## 9. API Design

**Decision: REST + JSON**, versioned under `/api/v1`.

**What GeoResponse needs.** One browser client with a fixed set of
screens. Operations map directly onto the `Resource` concept: list with
search, filters, and pagination; read; create; update; change status;
relocate; delete; history. Authorization is a permission per operation
(for example `resource.update`), and failures must surface as clear 401,
403, 404, 409, and 422 responses. The session travels in an HttpOnly
cookie. The full contract is in `API_CONTRACT.md`.

| Option | Fit for GeoResponse |
|---|---|
| **REST + JSON** (chosen) | Each operation is one endpoint, so each endpoint maps to one permission and returns a meaningful HTTP status. The browser calls it with `fetch` and the cookie, and it is easy to inspect in dev tools and to test with `curl` or `httptest`. |
| GraphQL | Built for many clients that need different data shapes. GeoResponse has one client with fixed screens, so that flexibility would go unused. GraphQL adds a schema and resolver layer and usually returns 200 with errors in the body, which makes per-operation 403 and 422 handling and HTTP caching harder. |
| gRPC (via gRPC-Web) | Browsers cannot call gRPC directly. It needs a gRPC-Web proxy or wrapper and a protobuf code generation step in the frontend. GeoResponse has no streaming, high-frequency RPC, or service-to-service traffic to justify that. |

**Trade-off accepted.** Some endpoints return more fields than a given
screen uses, which is negligible at this payload size. gRPC can be
reconsidered for internal paths if the system later splits into services
that talk to each other (ADR-004).

---

## 10. Database

### 10.1 PostgreSQL + PostGIS

**Decision: PostgreSQL with the PostGIS extension.**

**What GeoResponse needs.** Two kinds of data in one store:

- Strongly relational records: users, roles, and permissions with
  many-to-many links, and status, location, change, and audit history that
  reference resources and users by foreign key. Deleting a resource must
  keep its history (`ON DELETE SET NULL`), and `CHECK` constraints guard the
  type, status, and audit operation values.
- Geographic data: every resource has a location that must be a valid
  WGS 84 point. The map and future features (resources near a hotspot,
  resources inside an area) depend on it.

| Option | Fit for GeoResponse |
|---|---|
| **PostgreSQL + PostGIS** (chosen) | Foreign keys, constraints, and joins enforce the relational rules in the database. PostGIS stores locations as `geography(Point, 4326)` with a GIST spatial index, all in one engine. |
| PostgreSQL with `latitude` / `longitude` number columns | Works for storage today, but the database would not know the values are a point: no geographic type, no spatial index, and any later proximity or area query would need application-side math or a schema migration. |
| MongoDB | Has geospatial indexes, but no foreign keys or relational integrity. The role, permission, history, and audit rules would move into Go code, where they are easier to break. |

**Trade-off accepted.** Today the application uses PostGIS for storing,
converting, and indexing locations (`ST_MakePoint`, `ST_X`, `ST_Y`, the GIST
index), not yet for spatial queries. The cost is one extension in the same
database image (`postgis/postgis`), and spatial queries can be added later
without changing database technology. How the schema uses PostGIS is in
`DATABASE_ARCHITECTURE.md`.

### 10.2 Database Access

**Decision: pgx (`pgxpool`) with hand-written SQL behind repository
interfaces.** Business logic depends on the interfaces, not on SQL (layer
direction in `DEPENDENCY_RULES.md` section 2).

**What GeoResponse needs.** A small set of queries, several of which use
PostGIS expressions such as `ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography`
on write and `ST_X` / `ST_Y` on read, plus a connection pool.

| Option | Fit for GeoResponse |
|---|---|
| **pgx with SQL** (chosen) | The actively maintained PostgreSQL driver for Go, with a built-in pool. PostGIS expressions are written as ordinary SQL, and every query is visible in the repository code. |
| GORM | Has no native `geography` type, so the PostGIS parts would fall back to raw SQL anyway. The rest would be generated by reflection, which hides the actual queries. |
| sqlc | Type-safe generated code is a good fit in principle, but it adds a generation step to the build and needs type mappings for PostGIS columns. For this number of queries, hand-written pgx code is simpler. |

**Trade-off accepted.** Row scanning is written by hand and covered by the
repository tests against a real PostGIS database. Database performance is
not benchmarked because the requirements define no high-volume workload.

---

## 11. State Management

State is split into client state (owned by the UI) and server state (data
that comes from the backend), so API data is never copied into a separate
client store. Concrete conventions are in `FRONTEND_STATE.md`.

### 11.1 Client State

**Decision: React `useState` / `useReducer`.**

**What GeoResponse needs.** The client-only state is the selected
resource, the active search and filters, which modal is open, form input,
and transient map interaction. The list and the map share it through
their common page component.

| Option | Fit for GeoResponse |
|---|---|
| **`useState` / `useReducer`** (chosen) | The state lives in the page that owns it and is passed down to the list, map, and detail card. There is no extra library or global store to keep in sync. |
| Redux Toolkit | Built for large shared state across distant parts of an app. Here it would add actions and a store for a handful of values, and it would invite putting API data into the store, duplicating TanStack Query's cache. |
| Zustand | Lighter than Redux, but it still introduces a global store the app does not need, with the same risk of duplicating server data. |

**Trade-off accepted.** If many unrelated screens later need the same
client state, a store can be reconsidered (section 16).

### 11.2 Server State

**Decision: TanStack Query.**

**What GeoResponse needs.**

- The resource list must refresh after every create, update, status
  change, relocation, and delete.
- Relocation is optimistic: the marker moves immediately and rolls back if
  the request fails.
- The hotspot overlay polls on an interval.
- The current user is cached for several minutes.

The hooks in `src/hooks/` implement this with `invalidateQueries`,
`onMutate` / `onError` / `onSettled`, `refetchInterval`, and `staleTime`.

| Option | Fit for GeoResponse |
|---|---|
| **TanStack Query** (chosen) | Caching, invalidation, optimistic updates with rollback, polling, and loading and error states are built in, across the eighteen query and mutation hooks. |
| `useEffect` + `fetch` | Every hook would need hand-written loading and error state, race handling, caching, and invalidation. That is the code most likely to contain subtle bugs. |
| SWR / RTK Query | SWR covers fetching and caching, but mutations and optimistic rollback need more manual work. RTK Query requires a Redux store, which section 11.1 avoids. |

**Trade-off accepted.** One dependency and its query-key conventions,
which `FRONTEND_STATE.md` documents.

---

## 12. Styling

**Decision: Tailwind CSS v4.**

**What GeoResponse needs.** A map-first layout: a fixed resource list
beside the map, a detail card floating over it, a legend, and modals.
These are mostly custom components in `src/components/common/`. Status and
type colors must match between the list, the markers, and the legend.

| Option | Fit for GeoResponse |
|---|---|
| **Tailwind CSS v4** (chosen) | Utility classes sit next to the markup they style. Colors come from one shared palette (`src/utils/colors.ts`, consumed by `tailwind.config.js`), so the list, markers, and legend stay consistent. Only the classes in use end up in the CSS bundle. |
| Plain CSS / CSS Modules | Workable, but each component needs its own stylesheet and class names, and keeping spacing and colors consistent depends on discipline rather than a shared config. |
| MUI / Ant Design | A large component bundle on top of MapLibre's already large one, and a design language built for dashboards and forms that has to be overridden for a map-first layout. |

**Trade-off accepted.** Long class lists in JSX. Wiring: Rspack's PostCSS
integration (`postcss.config.js` with `@tailwindcss/postcss`) compiles the
`@import "tailwindcss"` and `@config` directives in `src/index.css`. A
component library can be reconsidered if the UI outgrows what `common/`
provides (`FRONTEND_ARCHITECTURE.md`).

---

## 13. Validation

Validation runs at both the frontend and backend boundaries.

### 13.1 Frontend Validation

**Decision:** the frontend validates input (required fields, coordinate
ranges, valid type and status, field formats) to give immediate feedback
before submission. It improves user experience and is not authoritative.

### 13.2 Backend Validation

**Decision:** the backend validates every request independently before
anything is persisted, because API requests cannot be trusted to originate
only from the application's UI. Backend validation is authoritative.

The field rules are in `API_CONTRACT.md` section 12; where validation runs
in the backend layers is in `BACKEND_VALIDATION.md`.

---

## 14. Testing

### 14.1 Frontend

**Decision: Vitest + React Testing Library.**

**What GeoResponse needs.** Fast tests for components, hooks, and
validators in TypeScript, many of which import ES-module-only packages,
running in a simulated DOM (jsdom).

| Option | Fit for GeoResponse |
|---|---|
| **Vitest** (chosen) | Handles TypeScript and ES modules without extra transform setup, uses a Jest-compatible API (`describe`, `it`, `expect`, with globals enabled), and runs in jsdom. It runs separately from Rspack, which is fine because tests do not depend on the production bundle. |
| Jest | Same API, but TypeScript and ES-module packages need extra transform configuration (`ts-jest` or Babel, plus `transformIgnorePatterns`). |
| Cypress component testing | Runs components in a real browser, which is slower and heavier than needed for unit-level behavior. The real-browser path is covered by Playwright (section 14.3). |

React Testing Library keeps tests focused on what the user sees and does,
not on component internals. Conventions are in `FRONTEND_TESTING.md`.

### 14.2 Backend

**Decision: the standard Go `testing` package.**

**What GeoResponse needs.** Table-driven tests for domain validation,
service tests with in-memory fakes, handler tests, and repository tests
against a real PostGIS database.

| Option | Fit for GeoResponse |
|---|---|
| **Go `testing`** (chosen) | `t.Run` subtests cover table-driven cases, and `net/http/httptest` covers handlers and middleware. There is no extra dependency (`go.mod` has none for tests). |
| testify | Adds shorter assertions but no capability the tests need. |
| Ginkgo / Gomega | A BDD-style DSL with its own runner. It is a learning cost for anyone reading the tests, with no benefit at this size. |

Conventions are in `BACKEND_TESTING.md`.

### 14.3 End-to-End

**Decision: Playwright.**

**What GeoResponse needs.** One golden-path test that signs in and works
through the real UI, against the full stack started with Docker Compose
(frontend on `:5173`, API on `:8080` with a cookie session).

| Option | Fit for GeoResponse |
|---|---|
| **Playwright** (chosen) | Drives a real Chromium from outside the page, waits for elements automatically, and points at the running stack through `baseURL`. Setup is one package plus a browser install (`tests/e2e/`). |
| Cypress | Runs inside the browser, so flows that cross origins (the frontend on one port calling the API on another) need extra configuration. |
| Selenium | Needs WebDriver setup and explicit waits, which means more code for the same test. |

How to run it is in `tests/README.md`.

---

## 15. Final Architecture

```text
┌──────────────────────────────────────────────┐
│  Frontend: React + TypeScript (Rspack)       │
│  MapLibre GL JS, TanStack Query,             │
│  useState / useReducer, Tailwind CSS v4      │
└──────────────────────┬───────────────────────┘
                       │ REST + JSON (/api/v1)
                       ▼
┌──────────────────────────────────────────────┐
│  Backend: Go, net/http + Chi                 │
│  handlers, use cases, domain, repositories   │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│  Data: PostgreSQL + PostGIS                  │
└──────────────────────────────────────────────┘
```

The full stack, with the alternatives considered for each part, is the table in section 5.

---

## 16. Revisiting Decisions

Technology decisions may be revisited if requirements, workload
characteristics, or architectural constraints change. A change to the
selected stack, or the introduction of a technology from section 17, needs
an entry in `ARCHITECTURE_DECISION_RECORDS.md` and an update to this
document. The map library should not be changed without new benchmark
evidence.

---

## 17. Decision Boundaries

The following are not introduced at the current application scope:

- gRPC as the primary browser API
- microservices
- message brokers
- Redis
- Kubernetes
- event-driven infrastructure
- dedicated global state management unless required
- additional abstraction layers without a concrete requirement

They are not rejected in general. The current requirements do not justify
their added complexity.
