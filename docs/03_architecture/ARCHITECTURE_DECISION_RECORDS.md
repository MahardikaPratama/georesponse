# Architecture Decision Records

## 1. Purpose

This document records significant architectural decisions that affect the system structure, boundaries, or long-term implementation direction.

An ADR explains **why** a decision was made, while `SYSTEM_ARCHITECTURE.md` describes the resulting architecture.

---

## ADR-001: Use Modular Monolith Architecture

### Status

Accepted

### Decision

The application will use a **Modular Monolith** architecture.

The frontend and backend remain separate applications, but the backend will not be divided into multiple microservices.

### Reason

The current take-home test does not require independent service deployment, distributed processing, or service-level scalability.

Using microservices would introduce additional complexity without a clear requirement.

### Result

The system remains simple while still having clear module boundaries.

---

## ADR-002: Use React + TypeScript for Frontend

### Status

Accepted

### Decision

The frontend will use:

- React
- TypeScript

### Reason

These technologies are mandatory requirements of the take-home test.

The frontend will use a component-driven structure to keep UI responsibilities separated and reusable.

---

## ADR-003: Use Go for Backend

### Status

Accepted

### Decision

The backend will use Go.

### Reason

Go is a mandatory requirement of the take-home test.

The backend will use a simple layered structure consisting of:

- HTTP Handler
- Application / Use Case
- Domain
- Repository

---

## ADR-004: Use REST/JSON for Browser-facing API

### Status

Accepted

### Decision

The primary communication between the React frontend and Go backend will use REST APIs with JSON, versioned under `/api/v1`. The full endpoint contract is defined in `API_CONTRACT.md`.

### Reason

See `TECHNOLOGY_SELECTION.md` section 9 for the full evaluation, including why gRPC was not selected as the primary browser-facing API.

### Consequence

If the application later requires real-time updates, WebSocket or SSE may be introduced for that specific use case without changing the primary REST contract.

---

## ADR-005: Isolate Map Library Integration

### Status

Accepted

### Decision

Map-library-specific code will be isolated behind a map integration layer (see `SYSTEM_ARCHITECTURE.md` section 5). The selected map technology is **MapLibre GL JS**.

### Reason

MapLibre GL JS was selected through a controlled performance benchmark against Leaflet and OpenLayers. The full methodology, results, and trade-offs are documented in `TECHNOLOGY_SELECTION.md` section 7 and the map benchmark documentation.

### Consequence

MapLibre-specific implementation details stay isolated in the map adapter instead of spreading throughout the application.

---

## ADR-006: Do Not Use Microfrontend

### Status

Accepted

### Decision

The frontend will remain a single React application.

Microfrontend architecture will not be introduced.

### Reason

The application does not currently have the organizational or technical requirements that justify independently deployed frontend applications.

A component-driven structure is sufficient for the current scope.

---

## ADR-007: Keep Real-time Communication Optional

### Status

Accepted

### Decision

Real-time communication is not part of the initial architecture.

The initial communication model is:

```text
React
  ↓
REST / JSON
  ↓
Go
```

WebSocket or SSE may be added if a future requirement requires real-time resource or disaster-status updates.

### Reason

The architecture should solve the current requirements first instead of introducing infrastructure that is not currently required.
