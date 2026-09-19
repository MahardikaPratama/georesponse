# System Architecture

## 1. Purpose

This document defines the high-level architecture of the application.

The architecture is intentionally kept simple because this project is a take-home test. The main goal is to keep the system:

- Easy to understand
- Easy to develop
- Easy to test
- Easy to maintain
- Ready to evolve if the requirements grow

---

## 2. Architecture Style

The application uses a **Modular Monolith** architecture.

The system is divided into two main applications:

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
```

Microservices and microfrontends are not used because they would add unnecessary complexity for the current project scope.

---

## 3. Frontend Architecture

The frontend uses React + TypeScript with a component-driven structure.

Main responsibilities:

- Render the user interface
- Manage UI state
- Fetch and display backend data
- Display geographic data using the selected map library
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

The UI should not directly depend on backend implementation details or map-library-specific logic whenever it can be avoided.

---

## 4. Backend Architecture

The backend uses Go and follows a simple layered structure.

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

### Handler

Responsible for:

- Receiving HTTP requests
- Validating request input
- Calling the appropriate use case
- Returning HTTP responses

### Application / Use Case

Responsible for:

- Application business flow
- Coordinating domain operations
- Calling repositories

### Domain

Contains the core entities and business rules.

The domain should not depend on HTTP, database drivers, or frontend concerns.

### Repository

Provides an interface for data access.

The application layer should depend on the repository interface rather than directly depending on a specific database implementation.

---

## 5. Map Integration

The map library is treated as an infrastructure concern.

The application should not spread MapLibre-specific code throughout React components.

Instead:

```text
React Components
       ↓
Map Adapter
       ↓
MapLibre GL JS
```

This keeps the map integration isolated and makes it easier to modify or test.

The map technology was selected through a separate benchmark process documented in the benchmark documentation.

---

## 6. API Communication

The browser-facing API uses:

**REST + JSON**

```text
React
  │
  │ HTTP / JSON
  ▼
Go API
```

REST is selected because it is simple and directly supported by browsers, React, and Go. The full endpoint surface is defined in `API_CONTRACT.md`; the rationale for REST over gRPC is documented in `TECHNOLOGY_SELECTION.md` section 9.

If future requirements introduce real-time data delivery, WebSocket or SSE can be introduced separately.

---

## 7. Architecture Principle

The architecture follows one main principle:

> Keep responsibilities separated, but do not introduce complexity before it is needed.

The project should remain a modular monolith unless the requirements provide a clear reason to introduce distributed services.
