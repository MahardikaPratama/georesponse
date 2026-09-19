# Dependency Rules

## 1. Purpose

This document defines the basic dependency rules for the project.

The goal is to prevent unnecessary coupling between components and layers.

Keep these rules simple and consistent.

---

## 2. Backend Dependency Direction

Layer responsibilities (what each layer does) are described in `SYSTEM_ARCHITECTURE.md` section 4. This section defines only the allowed dependency direction between those layers:

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

### Rules

1. Handlers may depend on application/use-case code.
2. Application code may depend on domain code.
3. Application code may depend on repository interfaces.
4. Repository implementations may depend on database libraries.
5. Domain code must not depend on HTTP or database implementations.
6. Do not put business logic inside HTTP handlers.
7. Do not access the database directly from handlers.

---

## 3. Frontend Dependency Direction

Frontend layer responsibilities are described in `SYSTEM_ARCHITECTURE.md` section 3. This section defines only the allowed dependency direction:

```text
Page / Feature
      ↓
Components / Hooks
      ↓
API / Map Adapter
      ↓
External System
```

### Rules

1. Components should focus on presentation and user interaction.
2. Reusable application logic should be placed in hooks or utilities.
3. API communication should be isolated from UI components.
4. Map-library-specific logic should be isolated in the map adapter.
5. Components should not directly manipulate low-level MapLibre APIs unless the component is specifically responsible for map integration.
6. Do not duplicate API or map logic across multiple components.

---

## 4. External Dependency Rule

External libraries should be isolated when they represent an important infrastructure concern.

Examples:

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

The purpose is not to create an abstraction for every library.

Create an abstraction when it provides a clear boundary or prevents application code from becoming tightly coupled to an external technology.

---

## 5. Shared Code

Shared code should only be created when it is genuinely reused.

Do not create:

- Generic utility modules without a clear use case
- Large shared components for unrelated features
- Abstractions only because they might be useful in the future

Prefer small and explicit modules.

---

## 6. Dependency Rule of Thumb

When adding a dependency, ask:

1. Does this layer actually need it?
2. Can the code work without coupling another layer to it?
3. Does the dependency make the architecture easier to understand?
4. Is the dependency justified by the current requirements?

Avoid unnecessary dependencies and unnecessary abstraction.
