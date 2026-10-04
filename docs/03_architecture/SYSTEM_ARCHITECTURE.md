# System Architecture

## 1. Purpose

This document describes the high-level architecture of GeoResponse: the
overall style, the responsibilities of each frontend and backend layer, and
how the map library and API fit in. The allowed dependency direction
between layers is defined in `DEPENDENCY_RULES.md`, and the reasons behind
each architectural decision are in `ARCHITECTURE_DECISION_RECORDS.md`.

The architecture is kept simple so the system stays easy to understand,
develop, test, and maintain, while still being able to evolve if the
requirements grow.

---

## 2. Architecture Style

The application is a **Modular Monolith** (ADR-001, ADR-006) made of two
applications and a database:

```text
Frontend
React + TypeScript

        │
        │ REST / JSON
        ▼

Backend
Go

        │
        ▼

Database
PostgreSQL + PostGIS
```

It should remain a modular monolith unless the requirements give a clear
reason to introduce distributed services.

---

## 3. Frontend Architecture

The frontend uses React + TypeScript with a component-driven structure.

Main responsibilities:

- Render the user interface
- Manage UI state
- Fetch and display backend data
- Display geographic data through the Map Adapter
- Handle user interactions

Conceptually:

```text
App
 │
 ├── Pages / Features   (one map-first page composing the feature areas)
 │    ├── Resource Management
 │    ├── Map
 │    └── Access (login, roles, audit)
 │
 ├── Components
 │
 ├── Hooks
 │
 ├── API
 │
 └── Map Adapter
```

UI code should not depend on backend implementation details or on
map-library-specific logic. The concrete folder structure is in
`FRONTEND_ARCHITECTURE.md`.

---

## 4. Backend Architecture

The backend uses Go with a simple layered structure:

```text
HTTP Handler
     ↓
Application / Use Case
     ↓
Domain
     ↓
Repository
     ↓
Database
```

The concrete package layout is in `BACKEND_ARCHITECTURE.md`.

### Handler

Responsible for:

- Receiving HTTP requests and reading path and query parameters
- Decoding the request body strictly (well-formed JSON, no unknown fields,
  correct JSON types); field and business-rule validation is not done here
  (see `BACKEND_VALIDATION.md` section 2)
- Calling the appropriate use case
- Translating the result or error into the HTTP response

Handlers are mounted on a Chi router (`internal/http/router.go`) whose
middleware chain handles request IDs, request logging, panic recovery,
CORS, and authentication.

### Application / Use Case

Responsible for:

- Application business flow, including authorization checks and calling
  domain validation before any write
- Coordinating domain operations
- Calling repositories

### Domain

Contains the core types (such as `Resource` and `Location`) and business
rules. The domain does not depend on HTTP, database drivers, or frontend
concerns.

### Repository

Provides an interface for data access. The application layer depends on
the repository interface, not on a specific database implementation.

---

## 5. Map Integration

The map library is treated as an infrastructure concern. MapLibre-specific
code stays behind the Map Adapter instead of spreading through React
components:

```text
React Components
       ↓
Map Adapter
       ↓
MapLibre GL JS
```

This keeps the map integration isolated and easier to change or test. The
exact import rule is `DEPENDENCY_RULES.md` section 3; the decision and its
benchmark basis are ADR-005 and `TECHNOLOGY_SELECTION.md` section 7.

---

## 6. API Communication

The browser-facing API is REST + JSON under `/api/v1` (ADR-004). Real-time
delivery is not part of the architecture (ADR-007). The endpoint contract
is `API_CONTRACT.md`.
