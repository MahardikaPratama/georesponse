# Dependency Rules

## 1. Purpose

This document defines the allowed dependency direction between layers in
the backend and frontend, and when to isolate an external library or
create shared code. Layer responsibilities are described in
`SYSTEM_ARCHITECTURE.md`; concrete folder and package layouts are in
`FRONTEND_ARCHITECTURE.md` and `BACKEND_ARCHITECTURE.md`.

---

## 2. Backend Dependency Direction

Layer responsibilities are described in `SYSTEM_ARCHITECTURE.md` section 4.
This section defines only the allowed dependency direction:

```text
HTTP Handler
     ↓
Use Case
     ↓
Domain
     ↓
Repository Interface
     ↑
Repository Implementation
     ↓
Database
```

### 2.1 Rules

1. Handlers may depend on application/use-case code.
2. Application code may depend on domain code.
3. Application code may depend on repository interfaces.
4. Repository implementations may depend on database libraries.
5. Domain code must not depend on HTTP or database implementations.
6. Do not put business logic inside HTTP handlers.
7. Do not access the database directly from handlers.

---

## 3. Frontend Dependency Direction

Frontend layer responsibilities are described in `SYSTEM_ARCHITECTURE.md`
section 3. This section defines only the allowed dependency direction:

```text
Page / Feature
      ↓
Components / Hooks
      ↓
API / Map Adapter
      ↓
External System
```

### 3.1 Rules

1. Components focus on presentation and user interaction.
2. Reusable application logic goes in hooks or utilities.
3. API communication is isolated from UI components (in `api/`).
4. Map-library-specific logic is isolated in the map adapter
   (`components/resource-map/map-adapter/`). Only code inside that
   directory may import `maplibre-gl`.
5. No other component calls MapLibre APIs directly, including the
   component that hosts the map (`ResourceMap.tsx`); it uses the adapter's
   interface and callbacks.
6. Do not duplicate API or map logic across multiple components.

---

## 4. External Dependency Rule

External libraries are isolated when they represent an important
infrastructure concern:

```text
MapLibre
   ↓
Map Adapter

Database Driver
   ↓
Repository Implementation

HTTP Framework
   ↓
HTTP Handler
```

The goal is not an abstraction for every library. Create one when it
provides a clear boundary or prevents application code from becoming
tightly coupled to an external technology.

---

## 5. Shared Code

Create shared code only when it is genuinely reused. Do not create:

- Generic utility modules without a clear use case
- Large shared components for unrelated features
- Abstractions only because they might be useful in the future

Prefer small, explicit modules.

---

## 6. Dependency Rule of Thumb

When adding a dependency, ask:

1. Does this layer actually need it?
2. Can the code work without coupling another layer to it?
3. Does the dependency make the architecture easier to understand?
4. Is the dependency justified by the current requirements?
