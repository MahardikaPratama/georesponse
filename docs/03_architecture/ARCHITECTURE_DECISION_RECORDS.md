# Architecture Decision Records

## 1. Purpose

This document records significant architectural decisions that affect the
system structure, boundaries, or long-term implementation direction. Each
record explains why a decision was made; `SYSTEM_ARCHITECTURE.md` describes
the resulting architecture. Every record uses the same format: Status,
Context, Decision, Consequences.

---

## 2. Records

### ADR-001: Use Modular Monolith Architecture

**Status:** Accepted

**Context:** The take-home scope does not require independent service
deployment, distributed processing, or service-level scalability.

**Decision:** The application uses a **Modular Monolith** architecture. The
frontend and backend are separate applications, but the backend is not split
into microservices.

**Consequences:** The system stays simple while keeping clear module
boundaries. Microservices would add operational and integration complexity
without a requirement to justify it; they can be reconsidered if such a
requirement appears.

---

### ADR-002: Use React + TypeScript for Frontend

**Status:** Accepted

**Context:** React and TypeScript are mandatory requirements of the
original brief.

**Decision:** The frontend uses React and TypeScript with a component-driven
structure.

**Consequences:** UI responsibilities are split into reusable components.
The concrete structure is in `FRONTEND_ARCHITECTURE.md`.

---

### ADR-003: Use Go for Backend

**Status:** Accepted

**Context:** Go is a mandatory requirement of the original brief.

**Decision:** The backend uses Go with a simple layered structure: HTTP
Handler, Application / Use Case, Domain, and Repository.

**Consequences:** Each layer has one responsibility and dependencies point
in one direction (`DEPENDENCY_RULES.md` section 2). The concrete package
layout is in `BACKEND_ARCHITECTURE.md`.

---

### ADR-004: Use REST/JSON for Browser-facing API

**Status:** Accepted

**Context:** The application needs conventional CRUD operations between a
browser client and the Go backend. The full evaluation, including why gRPC
was not selected as the primary browser-facing API, is in
`TECHNOLOGY_SELECTION.md` section 9.

**Decision:** The React frontend and Go backend communicate through REST
APIs with JSON, versioned under `/api/v1`. The endpoint contract is
`API_CONTRACT.md`.

**Consequences:** The API is easy to inspect, debug, and test from the
browser and from standard tools. Breaking changes require a new API version.
Real-time delivery, if ever needed, is added alongside this contract without
changing it (ADR-007).

---

### ADR-005: Isolate Map Library Integration

**Status:** Accepted

**Context:** MapLibre GL JS was selected through a controlled performance
benchmark against Leaflet and OpenLayers (`TECHNOLOGY_SELECTION.md` section
7, which links the benchmark evidence in `geo-map-benchmark/docs/`).

**Decision:** Map-library-specific code is isolated behind a Map Adapter
(`SYSTEM_ARCHITECTURE.md` section 5). Only code inside the adapter may
import `maplibre-gl` (`DEPENDENCY_RULES.md` section 3).

**Consequences:** MapLibre-specific details do not spread through the
application, and feature components can be tested with the adapter mocked.

---

### ADR-006: Do Not Use Microfrontends

**Status:** Accepted

**Context:** The application has no organizational or technical need for
independently deployed frontend applications.

**Decision:** The frontend remains a single React application. Microfrontend
architecture is not introduced.

**Consequences:** A component-driven structure inside one application is
sufficient for the current scope, and the frontend builds and deploys as one
unit.

---

### ADR-007: Keep Real-time Communication Optional

**Status:** Accepted

**Context:** No current requirement calls for real-time resource or
disaster-status updates, and the architecture should solve current
requirements before adding infrastructure.

**Decision:** Real-time communication is not part of the architecture. The
frontend communicates with the backend only through the REST/JSON API
(ADR-004).

**Consequences:** There is no WebSocket or SSE infrastructure to build or
operate. If a future requirement needs real-time updates, WebSocket or SSE
can be added for that specific use case without changing the REST contract.
