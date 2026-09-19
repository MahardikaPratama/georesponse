# Technology Selection

## 1. Purpose

This document records the technology decisions for the application and the rationale behind each selection.

The application is a geographic entity management system. Users can view entities on a map, inspect entity details, and create, update, and delete entities. The backend is responsible for data persistence and validation.

Technology selection follows two approaches:

1. **Performance benchmarking** for the map library, because map rendering and interaction are core workloads where implementation characteristics can materially affect user experience.
2. **Technical evaluation and references** for the remaining technologies, based on requirements, architectural fit, ecosystem maturity, maintainability, integration, and implementation complexity.

This deliberately avoids benchmarking every technology in the stack. Performance measurement is used only where empirical performance is a meaningful differentiator for the application's workload.

---

## 2. Application Requirements

The technology stack must support:

- React and TypeScript for the frontend.
- Go for the backend.
- Displaying geographic entities on a map.
- Adding, updating, and deleting entities.
- Viewing entity details.
- Storing and retrieving data through the backend.
- Input or data validation on both frontend and backend.
- A maintainable implementation proportionate to the application scope.

The brief does not require microservices, high-throughput RPC, event streaming, or other infrastructure that would introduce significant complexity without a corresponding requirement.

---

## 3. Selection Principles

Technology decisions follow these principles:

### 3.1 Requirement Fit

A technology must directly support the application's functional and technical requirements.

### 3.2 Simplicity

When multiple technologies satisfy the requirements, unnecessary complexity is avoided.

### 3.3 Maintainability

The selected stack should be understandable, testable, and maintainable by other developers.

### 3.4 Maturity and Ecosystem

Established technologies with appropriate documentation, ecosystem support, and adoption are preferred.

### 3.5 Performance Where It Matters

Performance benchmarking is performed only for workloads where runtime characteristics can materially affect the application.

### 3.6 Avoid Premature Infrastructure

Technologies are not introduced merely because they are technically capable. Additional infrastructure must provide a concrete benefit to the application.

---

## 4. Selection Method

| Decision Type | Method | Examples |
|---|---|---|
| Mandatory | Defined by the take-home requirements | React, TypeScript, Go |
| Performance-sensitive | Controlled benchmark | Map library |
| General engineering decision | Technical evaluation and references | HTTP router, database, API style, state management, styling |

The map library is the only component subjected to a dedicated performance benchmark. Benchmarking a Go HTTP router, state-management library, or API style would add measurement complexity without providing information that is materially relevant to the application's expected workload.

---

## 5. Technology Overview

| Area | Selected Technology | Selection Basis |
|---|---|---|
| Frontend Framework | React | Mandatory requirement |
| Frontend Language | TypeScript | Mandatory requirement |
| Build Tool | Rspack | Technical fit and project setup |
| Map Library | MapLibre GL JS | Controlled performance benchmark + technical fit |
| Backend Language | Go | Mandatory requirement |
| HTTP Routing | Chi + `net/http` | Lightweight routing and compatibility with Go standard library |
| API Style | REST + JSON | Resource-oriented CRUD requirements and browser compatibility |
| Database | PostgreSQL + PostGIS | Structured data model and geospatial requirements |
| Client State | React `useState` / `useReducer` | Sufficient for local UI state |
| Server State | TanStack Query | Appropriate management of API-derived state |
| Styling | CSS (Tailwind CSS v4) | Low dependency overhead and sufficient for scope |
| Frontend Testing | Vitest + React Testing Library | Component and behavior testing |
| Backend Testing | Go `testing` | Native Go testing support |

---

# 6. Frontend

## 6.1 React

**Decision: React**

React is mandatory under the take-home requirements. Its component model is appropriate for the application's interactive concerns, including map rendering, entity selection, detail views, forms, filtering, CRUD interactions, and validation feedback.

**Selection basis:** Mandatory requirement.

## 6.2 TypeScript

**Decision: TypeScript**

TypeScript is mandatory under the take-home requirements. It provides explicit contracts for entity models, API requests and responses, geographic coordinates, map features, component properties, and validation states.

**Selection basis:** Mandatory requirement.

## 6.3 Build Tool

**Decision: Rspack**

Rspack is selected for TypeScript and React integration, development-server support, production bundling, code splitting, and dynamic imports.

Build-tool performance is not separately benchmarked because build performance is not a primary runtime requirement of the application. The decision is therefore based on workflow, compatibility, and production build capabilities.

---

# 7. Map Library

## 7.1 Candidates

The evaluated candidates are:

- Leaflet
- OpenLayers
- MapLibre GL JS

The map library receives dedicated benchmarking because geographic rendering is a core application workload and feature count can directly affect user experience.

## 7.2 Benchmark Scope

The benchmark covers workloads representative of the application:

- map initialization;
- point rendering;
- GeoJSON rendering;
- polygon rendering;
- multiple layers;
- increasing feature counts;
- pan and zoom interaction;
- feature interaction;
- memory usage;
- frame rate;
- bundle size.

The same workload and controlled conditions are used across candidates. Detailed methodology, raw measurements, and limitations are documented in the map benchmark documentation.

## 7.3 Decision

**Selected: MapLibre GL JS**

MapLibre GL JS is selected based on benchmark evidence and the application's geographic visualization requirements.

The most significant differentiator was scalability under increasing feature counts. In the benchmark, MapLibre maintained relatively stable rendering measurements as the workload increased from hundreds to 10,000 features, while the other candidates showed greater increases in rendering cost.

MapLibre also performed strongly across point, GeoJSON, polygon, and multi-layer workloads.

The decision is primarily driven by:

1. rendering scalability;
2. geographic visualization capability;
3. layer-based rendering;
4. GeoJSON support;
5. suitability for the expected feature workload.

The decision is workload-specific and does not claim that MapLibre GL JS is universally superior to Leaflet or OpenLayers.

## 7.4 Trade-offs

The benchmark identified several trade-offs. MapLibre GL JS has a larger JavaScript bundle and higher initialization cost than Leaflet, and a larger runtime footprint than Leaflet in the measured scenarios.

These costs are accepted because rendering scalability is considered more relevant to the application's geographic entity workload.

Leaflet remains a viable alternative when minimum bundle size, simplicity, and low initialization overhead are prioritized over large feature-count scalability.

---

# 8. Backend

## 8.1 Go

**Decision: Go**

Go is mandatory under the take-home requirements.

The backend is responsible for HTTP API handling, request validation, business logic, database access, persistence, and error handling.

The backend architecture will remain layered or feature-oriented without introducing unnecessary abstractions.

## 8.2 HTTP Routing

**Decision: Chi with Go `net/http`**

Chi is selected as the HTTP router while retaining Go's standard `net/http` abstractions.

The decision is based on:

- lightweight routing;
- middleware support;
- compatibility with `net/http`;
- straightforward handler and service integration;
- low conceptual overhead;
- maintainable routing structure.

The application primarily requires conventional HTTP CRUD operations, so a lightweight routing layer is preferred over a larger framework.

A formal performance benchmark between Go HTTP routers is not performed. Framework-level requests-per-second measurements are not considered a meaningful selection criterion for this workload; database access, network communication, and application behavior are more relevant to the actual request path.

---

# 9. API Design

## 9.1 REST + JSON

**Decision: REST + JSON**

The application follows a resource-oriented CRUD model centered on the `Resource` domain concept (see `DOMAIN_MODEL.md` section 13 for the entity-to-resource naming decision). The full endpoint contract is defined in `API_CONTRACT.md`; representative endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/resources` | Retrieve resources |
| `GET` | `/api/v1/resources/:id` | Retrieve a resource |
| `POST` | `/api/v1/resources` | Create a resource |
| `PUT` | `/api/v1/resources/:id` | Update a resource |
| `DELETE` | `/api/v1/resources/:id` | Delete a resource |

REST + JSON provides a direct communication model between the React browser application and the Go backend. It is easy to inspect, debug, test, and consume without additional browser-specific RPC infrastructure.

## 9.2 Why Not gRPC?

gRPC was considered but is not selected as the primary browser-facing API.

The application requires conventional CRUD operations rather than bidirectional streaming, high-frequency RPC, or service-to-service communication. Using gRPC would introduce additional browser integration considerations without addressing a current requirement.

REST + JSON therefore provides sufficient capability with lower architectural complexity. If the system later evolves into multiple backend services with substantial service-to-service communication or streaming requirements, gRPC can be reconsidered for those internal paths.

---

# 10. Database

## 10.1 PostgreSQL + PostGIS

**Decision: PostgreSQL + PostGIS**

The application manages structured entities containing identity, attributes, status, and geographic coordinates.

PostgreSQL provides a relational model for these entities, while PostGIS provides dedicated support for geographic data and spatial operations.

PostGIS is relevant to potential operations such as:

- bounding-box filtering;
- distance-based queries;
- spatial containment;
- spatial relationships;
- geographic filtering.

The combination also provides room for future geographic capabilities without requiring a separate database technology.

## 10.2 Database Access

The database access layer should preserve a clear separation:

```text
HTTP Handler
      ↓
Application Service
      ↓
Repository
      ↓
PostgreSQL + PostGIS
```

Business logic should not be coupled directly to SQL execution details.

Database performance is not separately benchmarked because the take-home requirements do not define a high-volume database workload or throughput target. Database selection is therefore based on data-model fit, geospatial capability, reliability, ecosystem, and implementation complexity.

---

# 11. State Management

State is divided into two categories:

1. **Client state** — state owned by the user interface.
2. **Server state** — data and request state originating from the backend API.

This distinction avoids unnecessarily duplicating API data into a global client store.

## 11.1 Client State

**Decision: React `useState` / `useReducer`**

Local React state is sufficient for concerns such as:

- selected entity;
- active filters;
- modal visibility;
- form state;
- UI interaction state;
- temporary map interaction state.

A dedicated global state library such as Redux Toolkit or Zustand is not introduced because the current client-side state does not justify the additional abstraction.

## 11.2 Server State

**Decision: TanStack Query**

Entity data originates from the backend and therefore represents server state.

TanStack Query is selected for:

- data fetching;
- loading and error states;
- caching;
- refetching;
- mutations;
- synchronization after create, update, and delete operations.

This avoids implementing server-state lifecycle management manually with `useEffect` and local state.

---

# 12. Styling

**Decision: CSS via Tailwind CSS v4**

A lightweight, utility-first CSS approach is selected rather than a component/design-system library (e.g. MUI, Ant Design). The application does not require a large component framework to satisfy its functional requirements.

Tailwind CSS v4 is the concrete implementation: utility classes applied directly in JSX, a shared color palette (`src/utils/colors.ts`) consumed by `tailwind.config.js`, and Rspack's PostCSS integration (`postcss.config.js` + `@tailwindcss/postcss`) compiling `src/index.css`'s `@import "tailwindcss"`/`@config` directives. This keeps styling co-located with components (no separate stylesheet-per-component to keep in sync) while still centralizing the color palette and font choices in one place.

The approach prioritizes predictable styling, low dependency overhead, component maintainability, responsive layout, and clear separation between presentation and application logic. A component/design-system library remains an option to reconsider if the UI surface grows enough to need a shared component library beyond what `common/` already provides (`FRONTEND_ARCHITECTURE.md`).

---

# 13. Validation

Validation is implemented at both frontend and backend boundaries.

## 13.1 Frontend Validation

Frontend validation provides immediate feedback before data is submitted.

Examples include required fields, valid geographic coordinates, valid entity status, and valid field formats.

Frontend validation improves user experience but is not authoritative.

## 13.2 Backend Validation

Backend validation is mandatory before data is persisted. The backend validates incoming data independently of the frontend because API requests cannot be trusted to originate exclusively from the application's UI.

```text
User Input
    ↓
Frontend Validation
    ↓
HTTP Request
    ↓
Backend Validation
    ↓
Business Logic
    ↓
Database
```

---

# 14. Testing

## 14.1 Frontend

**Selected: Vitest + React Testing Library**

Testing focuses on observable application behavior, including component rendering, user interaction, form validation, state transitions, and API interaction boundaries.

## 14.2 Backend

**Selected: Go `testing`**

Go's standard testing package is sufficient for the backend scope. Tests focus on validation, service logic, HTTP handlers, repository behavior, and error handling.

Additional testing libraries should only be introduced when they provide a concrete benefit over the standard tooling.

---

# 15. Final Architecture

```text
┌──────────────────────────────────────────────┐
│                  Frontend                    │
│                                              │
│  React + TypeScript                          │
│  ├── MapLibre GL JS                          │
│  ├── TanStack Query                          │
│  ├── React useState / useReducer             │
│  └── CSS (Tailwind CSS v4)                   │
│                                              │
└──────────────────────┬───────────────────────┘
                       │
                 REST + JSON
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                  Backend                     │
│                                              │
│  Go                                          │
│  ├── net/http                                │
│  ├── Chi                                     │
│  ├── Validation                              │
│  └── Application Services                    │
│                                              │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                    Data                      │
│                                              │
│  PostgreSQL + PostGIS                        │
│                                              │
└──────────────────────────────────────────────┘
```

---

# 16. Decision Summary

| Area | Selected | Decision Basis |
|---|---|---|
| Frontend | React | Mandatory |
| Language | TypeScript | Mandatory |
| Build Tool | Rspack | Technical fit |
| Map | MapLibre GL JS | Benchmark + technical fit |
| Backend | Go | Mandatory |
| HTTP Routing | Chi + `net/http` | Lightweight and maintainable |
| API | REST + JSON | Simple resource-oriented CRUD |
| Database | PostgreSQL + PostGIS | Relational + geospatial requirements |
| Client State | React `useState` / `useReducer` | Sufficient for UI state |
| Server State | TanStack Query | Appropriate for API-derived state |
| Styling | CSS (Tailwind CSS v4) | Low complexity |
| Frontend Testing | Vitest + React Testing Library | Suitable component testing |
| Backend Testing | Go `testing` | Native Go testing |

---

# 17. Decision Boundaries

The following technologies are intentionally not introduced at the current application scope:

- gRPC as the primary browser API;
- microservices;
- message brokers;
- Redis;
- Kubernetes;
- event-driven infrastructure;
- dedicated global state management unless required;
- additional abstraction layers without a concrete requirement.

These technologies are not rejected in general. They are excluded because the current application requirements do not establish a sufficient need for their additional complexity.

Technology decisions may be revisited if application requirements, workload characteristics, or architectural constraints change.
