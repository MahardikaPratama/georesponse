# Frontend Architecture

## 1. Purpose

This document defines the internal architecture of the GeoResponse frontend application.

It expands the frontend-level view already defined in `SYSTEM_ARCHITECTURE.md` (sections 3 and 5) and `DEPENDENCY_RULES.md` (section 3) into a concrete folder structure, component pattern, and data flow.

This document does not redefine the API contract, the data contract, or the domain model. It describes how the frontend is organized to consume them.

---

## 2. Scope

GeoResponse's frontend is a React + TypeScript single-page application responsible for:

- rendering resources on a map;
- listing, searching, and filtering resources;
- displaying resource details and history;
- creating, updating, and deleting resources;
- changing resource status and location;
- authenticating users and reflecting their permissions in the UI.

The frontend is a consumer of the backend API. It does not own persistent application data and does not implement business rules that the backend is responsible for enforcing.

---

## 3. Folder Structure

```text
src/
├── App.tsx
├── main.tsx
├── index.css
│
├── common/          # Shared, presentation-only building blocks
│   ├── card/
│   │   └── Card.tsx
│   ├── status-indicator/
│   │   └── StatusIndicator.tsx
│   └── tabs/
│       └── Tabs.tsx
│
├── components/       # Feature components (pages/features live here)
│   └── resource-map/
│       ├── ResourceMap.tsx
│       ├── ResourceMap.types.ts
│       └── map-adapter/
│           └── MapAdapter.ts
│
├── hooks/            # Shared, reusable hooks
│   └── useResourceFilters.ts
│
├── store/            # Cross-cutting client UI state (Zustand-style)
│   └── useAlertStore.ts
│
├── api/              # Data-access layer (TanStack Query)
│   ├── resources/
│   │   ├── resourceApi.ts
│   │   ├── resourceApi.types.ts
│   │   └── resourceKeys.ts
│   └── httpClient.ts
│
├── types/            # Shared domain/application types
│   └── resource.types.ts
│
├── constants/         # Shared application constants
│   └── resource.constants.ts
│
├── utils/            # Shared, framework-agnostic utilities
│   ├── cn.ts
│   └── logger/
│       ├── logger.ts
│       ├── logger.types.ts
│       └── logger.test.ts
│
└── assets/
```

This mirrors the structure already established in `georesponse-fe/src` (`common/`, `components/`, `hooks/`, `store/`, `types/`, `constants/`, `utils/`, `assets/`). `api/` is the concrete home for the data-access layer described in `SYSTEM_ARCHITECTURE.md` section 3, and `map-adapter/` is the concrete home for the map boundary described in section 5.

Naming and file-suffix conventions for everything under `src/` are defined in `FRONTEND_NAMING.md`.

---

## 4. Layered View

The frontend follows the dependency direction defined in `DEPENDENCY_RULES.md` section 3:

```text
Page / Feature
      ↓
Components / Hooks
      ↓
API / Map Adapter
      ↓
External System (Backend API / MapLibre GL JS)
```

Concretely, within GeoResponse:

```text
App
 │
 ├── Pages / Features            (components/resource-map, components/resource-list, ...)
 │     │
 │     ├── Presentational components   (common/*, feature-local components)
 │     │
 │     └── Hooks                       (hooks/*, feature-local useX hooks)
 │           │
 │           ├── API layer             (api/*  — TanStack Query)
 │           │
 │           └── Map Adapter           (components/resource-map/map-adapter)
 │
 └── Store                        (store/*  — cross-cutting client UI state)
```

A feature component does not call `fetch`, does not construct HTTP requests, and does not call MapLibre GL JS directly. It renders UI and delegates data access to a hook, and delegates map rendering to the map adapter.

---

## 5. Component Pattern

GeoResponse follows a container/presentational split, expressed through hooks rather than a strict class-based separation:

- **Presentational components** (`common/*`, and the presentation half of a feature component) receive data and callbacks through props, render markup, and hold only local, ephemeral UI state (for example, whether a tooltip is open).
- **Container behavior** is expressed as a hook (`useResource`, `useResourceFilters`, `useResourceMap`) that owns data fetching, mutation calls, and derived state, and is consumed by the feature component.

Example shape for a feature such as the resource list:

```text
components/resource-list/
├── ResourceList.tsx          # Presentation: renders rows, calls hook, calls callbacks
├── ResourceList.types.ts     # Props and local types
├── useResourceList.ts        # Container behavior: query, filters, pagination
└── ResourceList.test.tsx
```

`ResourceList.tsx` renders what `useResourceList.ts` returns. `useResourceList.ts` is the only place in the feature that talks to `api/resources/resourceApi.ts` through TanStack Query.

This mirrors the existing pattern in `georesponse-fe/src/components/status-command/StatusCommand.tsx`, which composes a subordinate feature component (`track-data/TrackData.tsx`) rather than embedding unrelated concerns directly.

---

## 6. Component Encapsulation

Each component directory has exactly one public entry point: the file matching the component's `PascalCase` name. The directory layout, the promotion rule for moving a file out of a component, and the worked example are defined in `FRONTEND_NAMING.md` section 5 — this document only states the architectural consequence: encapsulating a component's internal helpers keeps them free to change without affecting other features, and keeps the dependency graph between features shallow (section 10).

---

## 7. API / Data-Access Layer

All HTTP communication with the Go backend is isolated in `api/`, per `DEPENDENCY_RULES.md` rule 3.3 ("API communication should be isolated from UI components").

```text
api/
├── httpClient.ts              # Base fetch wrapper: base URL, headers, error envelope parsing
└── resources/
    ├── resourceApi.ts         # getResources, getResource, createResource, updateResource,
    │                          # deleteResource, changeResourceStatus, relocateResource, getResourceHistory
    ├── resourceApi.types.ts   # Request/response shapes matching API_CONTRACT.md
    └── resourceKeys.ts        # TanStack Query key factory (see FRONTEND_STATE.md)
```

Responsibilities of `httpClient.ts`:

- attach the `/api/v1` base URL;
- serialize/deserialize JSON;
- unwrap the `{ "data": ..., "meta": ... }` success envelope defined in `API_CONTRACT.md` section 4;
- surface the `{ "error": { "code", "message", "details" } }` envelope as a typed error so calling hooks can branch on `code`, not on `message`.

Feature hooks call functions from `resourceApi.ts` through TanStack Query (`useQuery` / `useMutation`). No component imports `httpClient.ts` or `resourceApi.ts` directly; it goes through a hook.

---

## 8. Map Adapter

MapLibre GL JS is treated as infrastructure, per `SYSTEM_ARCHITECTURE.md` section 5 and `DEPENDENCY_RULES.md` rule 3.4:

```text
Feature Component (e.g. ResourceMap.tsx)
       ↓
Map Adapter (map-adapter/MapAdapter.ts)
       ↓
MapLibre GL JS
```

The map adapter is responsible for:

- initializing and tearing down the MapLibre map instance;
- converting `Resource[]` (domain shape, `{ latitude, longitude }`) into GeoJSON features (`[longitude, latitude]`), per the coordinate-order rule in `DATA_CONTRACT.md` section 2 and section 10;
- adding/updating/removing point layers as resources are created, relocated, or deleted;
- translating MapLibre interaction events (feature click, viewport change) into plain callbacks the feature component understands (for example, `onResourceSelect(resourceId: string)`).

The feature component (`ResourceMap.tsx`) never imports `maplibre-gl` directly and never calls `map.addLayer` or similar MapLibre APIs itself. Only code inside `map-adapter/` is allowed to import `maplibre-gl`.

---

## 9. Data Flow Example

The following trace follows a user relocating a resource on the map, from interaction to re-render:

```text
User drags a resource marker
        ↓
Map Adapter emits onResourceMove(resourceId, { latitude, longitude })
        ↓
ResourceMap.tsx calls useRelocateResource().mutate(...)
        ↓
TanStack Query mutation calls api/resources/resourceApi.ts → relocateResource()
        ↓
httpClient sends PATCH /api/v1/resources/{id}/location
        ↓
Go backend validates, persists, records history + audit
        ↓
Response { data: Resource } returned
        ↓
TanStack Query invalidates the resource / resource-list query keys
        ↓
useResourceList / useResource refetch
        ↓
ResourceMap.tsx receives updated Resource[]
        ↓
Map Adapter updates the marker's GeoJSON feature
```

Cache invalidation conventions are defined in `FRONTEND_STATE.md`.

---

## 10. Pages / Features

Per `SYSTEM_ARCHITECTURE.md` section 3, the application is organized around three feature areas:

| Feature | Responsibility |
|---|---|
| Dashboard | Overview of resource counts, status distribution, and entry point into the other features |
| Resource Management | List, search, filter, create, update, delete resources; change status |
| Map | Geospatial visualization of resources; select a resource from the map; relocate a resource |

Each feature area is a directory under `components/` (for example, `components/resource-map/`, `components/resource-list/`, `components/dashboard/`). Features may compose `common/` primitives and call shared `hooks/`, but should not import from another feature's directory directly; shared behavior is promoted to `hooks/`, `utils/`, or `api/` instead.

---

## 11. Scope Boundary

This document does not define:

- the API contract (`API_CONTRACT.md`);
- the data contract (`DATA_CONTRACT.md`);
- naming conventions in detail (`FRONTEND_NAMING.md`);
- state-management conventions in detail (`FRONTEND_STATE.md`);
- testing conventions (`FRONTEND_TESTING.md`);
- UI/UX conventions (`FRONTEND_UI_UX.md`);
- backend architecture (`SYSTEM_ARCHITECTURE.md` section 4);
- deployment or build configuration.

---

## 12. Architecture Principle

The frontend keeps presentation, container behavior, data access, and map integration in separate, shallow layers.

> A component renders. A hook fetches and derives. The API layer talks to the backend. The map adapter talks to MapLibre.

No layer reaches past the one directly below it.
