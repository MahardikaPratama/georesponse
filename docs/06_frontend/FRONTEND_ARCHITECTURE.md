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
│   ├── app-shell/
│   │   └── AppShell.tsx            # The single authenticated page: composes list, map, detail, modals
│   ├── resource-map/
│   │   ├── ResourceMap.tsx
│   │   ├── ResourceMap.types.ts
│   │   └── map-adapter/
│   │       ├── MapAdapter.ts
│   │       ├── MapAdapter.types.ts
│   │       └── MapAdapter.test.ts
│   ├── resource-list/, resource-detail/, resource-filter-bar/,
│   ├── resource-create-form/, resource-update-form/, resource-relocate-form/,
│   ├── resource-delete-confirmation/, resource-history/,
│   └── login-form/, role-management/, audit-log/, hotspot-toggle/
│
├── hooks/            # Shared, reusable hooks (one per query/mutation, plus utilities)
│   ├── useResources.ts, useResource.ts, useResourceHistory.ts
│   ├── useCreateResource.ts, useUpdateResource.ts, useDeleteResource.ts
│   ├── useChangeResourceStatus.ts, useRelocateResource.ts
│   ├── useCurrentUser.ts, useLogin.ts, useLogout.ts, usePermissions.ts
│   ├── useRoles.ts, useSetRolePermissions.ts, useSetUserRoles.ts
│   ├── useAuditLogs.ts, useHotspots.ts
│   └── useDebouncedValue.ts
│
├── store/            # Reserved for cross-cutting client UI state; currently empty (.gitkeep)
│
├── api/              # Data-access layer (TanStack Query)
│   ├── httpClient.ts
│   ├── httpClient.types.ts
│   ├── resources/
│   │   ├── resourceApi.ts
│   │   ├── resourceApi.types.ts
│   │   └── resourceKeys.ts
│   └── auth/, authorization/, audit/, hotspots/   # same <domain>Api / .types / <domain>Keys triple
│
├── types/            # Shared domain/application types
│   ├── resource.types.ts
│   └── hotspot.types.ts
│
├── constants/         # Shared application constants
│   ├── resourceStatus.constants.ts
│   ├── resourceAttributeSchema.constants.ts
│   ├── fieldNames.constants.ts, auditOperation.constants.ts, hotspot.constants.ts
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

This is the structure of `georesponse-fe/src` (`common/`, `components/`, `hooks/`, `store/`, `api/`, `types/`, `constants/`, `utils/`, `assets/`; each top-level directory has a matching `@<dir>` path alias in `tsconfig.json`, `rspack.config.js`, and `vitest.config.ts`). `api/` is the concrete home for the data-access layer described in `SYSTEM_ARCHITECTURE.md` section 3, and `map-adapter/` is the concrete home for the map boundary described in section 5.

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
 └── Store                        (store/*  — reserved for cross-cutting client UI state; empty today)
```

A feature component does not call `fetch`, does not construct HTTP requests, and does not call MapLibre GL JS directly. It renders UI and delegates data access to a hook, and delegates map rendering to the map adapter.

---

## 5. Component Pattern

GeoResponse follows a container/presentational split, expressed through hooks rather than a strict class-based separation:

- **Presentational components** (`common/*`, and the presentation half of a feature component) receive data and callbacks through props, render markup, and hold only local, ephemeral UI state (for example, whether a tooltip is open).
- **Container behavior** is expressed as a hook — a shared query/mutation hook under `hooks/` (`useResources`, `useResource`, `useRelocateResource`, ...) or a feature-local hook (`useResourceCreateForm`) — that owns data fetching, mutation calls, and derived state, and is consumed by the feature component.

Example shape, as implemented for the create form:

```text
components/resource-create-form/
├── CreateResourceModal.tsx        # Composes the form in a modal; calls useCreateResource
├── ResourceCreateForm.tsx         # Presentation: renders fields, calls callbacks
├── ResourceCreateForm.types.ts    # Props and local types
├── useResourceCreateForm.ts       # Container behavior: form state + validation
├── resourceFormReducer.ts         # useReducer transitions for the form
├── validateResourceForm.ts        # Client-side validation rules
└── *.test.ts(x)                   # Colocated tests
```

The presentational component renders what the hook returns; the hook is the only place in the feature that talks to the API layer (through the shared TanStack Query hooks under `hooks/`).

At the top, `components/app-shell/AppShell.tsx` is the single authenticated page: it calls the shared query hooks (`useResources`, `useCurrentUser`, `useHotspots`), owns the selection/filter/modal client state, and composes the feature components (`ResourceList`, `ResourceMap`, `ResourceDetail`, `ResourceFilterBar`, the create/update/delete modals, `RoleManagementModal`, `AuditLogModal`) rather than embedding their concerns directly.

---

## 6. Component Encapsulation

Each component directory has exactly one public entry point: the file matching the component's `PascalCase` name. The directory layout, the promotion rule for moving a file out of a component, and the worked example are defined in `FRONTEND_NAMING.md` section 5 — this document only states the architectural consequence: encapsulating a component's internal helpers keeps them free to change without affecting other features, and keeps the dependency graph between features shallow (section 10).

---

## 7. API / Data-Access Layer

All HTTP communication with the Go backend is isolated in `api/`, per `DEPENDENCY_RULES.md` rule 3.3 ("API communication should be isolated from UI components").

```text
api/
├── httpClient.ts              # Base fetch wrapper: base URL, headers, error envelope parsing
├── httpClient.types.ts        # Envelope / ApiError types
├── resources/
│   ├── resourceApi.ts         # getResources, getResource, createResource, updateResource,
│   │                          # deleteResource, changeResourceStatus, relocateResource, getResourceHistory
│   ├── resourceApi.types.ts   # Request/response shapes matching API_CONTRACT.md
│   └── resourceKeys.ts        # TanStack Query key factory (see FRONTEND_STATE.md)
├── auth/                      # authApi / authApi.types / authKeys
├── authorization/             # roles, permissions, user-role assignment
├── audit/                     # audit log queries
└── hotspots/                  # BMKG hotspot overlay (GET /api/v1/hotspots)
```

Responsibilities of `httpClient.ts`:

- attach the `/api/v1` base URL;
- serialize/deserialize JSON;
- unwrap the `{ "data": ..., "meta": ... }` success envelope defined in `API_CONTRACT.md` section 4;
- surface the `{ "error": { "code", "message", "details" } }` envelope as a typed error so calling hooks can branch on `code`, not on `message`.

Feature hooks call functions from `resourceApi.ts` through TanStack Query (`useQuery` / `useMutation`). No component imports `httpClient.ts` or `resourceApi.ts` directly; it goes through a hook. (Importing a *type* from `*.types.ts`, such as `ResourceFilters`, is fine.)

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
- keeping a GeoJSON source/layer pair for resource markers (and a second pair for the BMKG hotspot overlay) up to date as resources are created, relocated, or deleted;
- translating MapLibre interaction events into plain callbacks the feature component understands: `onMarkerClick(resourceId)` (surfaced by `ResourceMap.tsx` as `onResourceSelect`) and `onMapDoubleClick({ latitude, longitude })` (used to create a resource at that location).

The feature component (`ResourceMap.tsx`) never imports `maplibre-gl` directly and never calls `map.addLayer` or similar MapLibre APIs itself. Only code inside `map-adapter/` is allowed to import `maplibre-gl`.

---

## 9. Data Flow Example

The following trace follows a user relocating a resource, from interaction to re-render (relocation is entered as coordinates in the detail card's `RelocateResourceControl`; marker dragging is not implemented):

```text
User submits new coordinates in RelocateResourceControl
        ↓
RelocateResourceControl calls useRelocateResource(id).mutate(...)
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
useResources / useResource refetch
        ↓
AppShell passes the updated Resource[] to ResourceMap.tsx
        ↓
Map Adapter updates the marker's GeoJSON feature
```

(`useRelocateResource` also applies the new location optimistically before the response arrives — see `FRONTEND_STATE.md` section 7.)

Cache invalidation conventions are defined in `FRONTEND_STATE.md`.

---

## 10. Pages / Features

Per `SYSTEM_ARCHITECTURE.md` section 3, the application is organized around these feature areas, all rendered on one map-first page (`components/app-shell/AppShell.tsx`) rather than as separate routes:

| Feature | Responsibility | Directories |
|---|---|---|
| Resource Management | List, search, filter, create, update, delete resources; change status; view history | `resource-list/`, `resource-filter-bar/`, `resource-detail/`, `resource-create-form/`, `resource-update-form/`, `resource-delete-confirmation/`, `resource-history/` |
| Map | Geospatial visualization of resources; select a resource from the map; create at a double-clicked location; relocate a resource | `resource-map/`, `resource-relocate-form/`, `hotspot-toggle/` |
| Access | Login, role/permission management, audit log | `login-form/`, `role-management/`, `audit-log/` |

There is no separate dashboard feature; the app shell's list, filters, and map together provide the overview. Each feature area is a directory under `components/`. Features may compose `common/` primitives and call shared `hooks/`, but should not import from another feature's directory directly (the app shell, as the page, is the one place that composes them); shared behavior is promoted to `hooks/`, `utils/`, or `api/` instead.

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
