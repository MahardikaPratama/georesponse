# Frontend Architecture

## 1. Purpose

This document describes how the GeoResponse frontend (`georesponse-fe/src`)
is organized: its folder structure, layers, component pattern, data-access
layer, map adapter, and data flow. It turns the frontend view in
`SYSTEM_ARCHITECTURE.md` sections 3 and 5 and `DEPENDENCY_RULES.md`
section 3 into concrete structure.

It does not define the API contract (`API_CONTRACT.md`), the data contract
(`DATA_CONTRACT.md`), naming (`FRONTEND_NAMING.md`), state conventions
(`FRONTEND_STATE.md`), testing (`FRONTEND_TESTING.md`), UI/UX
(`FRONTEND_UI_UX.md`), or build and deployment configuration.

---

## 2. Scope

The frontend is a React + TypeScript single-page application responsible
for:

- rendering resources on a map
- listing, searching, and filtering resources
- displaying resource details and history
- creating, updating, and deleting resources
- changing resource status and location
- authenticating users, role/permission management, and the audit trail
  view

The frontend consumes the backend API. It does not own persistent data and
does not implement business rules that the backend enforces.

---

## 3. Folder Structure

Directories plus representative files (not every file is listed):

```text
src/
├── App.tsx, main.tsx, index.css
│
├── common/                  # Shared, presentation-only building blocks
│   ├── alert/               # Alert.tsx, utils/CardAlert.tsx
│   ├── button/              # Button.tsx
│   ├── card/                # Card.tsx
│   ├── dotloading/          # DotLoading.tsx
│   ├── dropdowns/           # dropdown/Dropdown.tsx, searchable-dropdown/SearchableDropdown.tsx
│   ├── inputs/              # input-validation/InputValidation.tsx
│   ├── modals/              # modal/Modal.tsx, moveable-modal/MoveableModal.tsx (+ hooks/useMoveableWindow.ts)
│   ├── status-indicator/    # StatusIndicator.tsx
│   ├── tabs/                # Tabs.tsx
│   └── tooltip/             # Tooltip.tsx
│
├── components/              # Feature components
│   ├── app-shell/
│   │   └── AppShell.tsx     # The single authenticated page: composes list, map, detail, modals
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
│   └── login-form/, role-management/, audit-log/, hotspot-toggle/, map-legend/
│
├── hooks/                   # Shared hooks: one per query/mutation, plus utilities
│   ├── useResources.ts, useResource.ts, useResourceHistory.ts
│   ├── useCreateResource.ts, useUpdateResource.ts, useDeleteResource.ts
│   ├── useChangeResourceStatus.ts, useRelocateResource.ts
│   ├── useCurrentUser.ts, useLogin.ts, useLogout.ts, usePermissions.ts
│   ├── useRoles.ts, useSetRolePermissions.ts, useSetUserRoles.ts
│   ├── useAuditLogs.ts, useHotspots.ts
│   └── useDebouncedValue.ts
│
├── store/                   # Reserved for cross-cutting client UI state; empty (.gitkeep)
│
├── api/                     # Data-access layer (used through TanStack Query hooks)
│   ├── httpClient.ts, httpClient.types.ts, httpClient.test.ts
│   ├── resources/           # resourceApi.ts, resourceApi.types.ts, resourceKeys.ts
│   └── auth/, authorization/, audit/, hotspots/   # same <domain>Api / .types / <domain>Keys triple
│
├── types/                   # resource.types.ts, hotspot.types.ts
│
├── constants/               # resourceStatus, resourceAttributeSchema, fieldNames,
│                            # auditOperation, hotspot, map (*.constants.ts)
│
├── utils/                   # Shared, framework-agnostic utilities
│   ├── apiErrorMessage.ts   # error code -> user-facing message
│   ├── mapValidationError.ts, validateLocation.ts, validateResourceAttributes.ts
│   ├── cn.ts, colors.ts, formatNumber.ts, withTimeOut.ts
│   ├── inputValidation.ts + inputValidation/   # validators, message and helper-text generators
│   └── logger/              # logger.ts, logger.types.ts, logger.test.ts
│
└── assets/                  # fonts/ (Montserrat)
```

Each top-level directory has a matching `@<dir>` path alias in
`tsconfig.json`, `rspack.config.js`, and `vitest.config.ts`. `api/` is the
data-access layer from `SYSTEM_ARCHITECTURE.md` section 3, and
`map-adapter/` is the map boundary from section 5 of the same file. Naming
and file-suffix conventions are in `FRONTEND_NAMING.md`.

---

## 4. Layered View

The frontend follows the dependency direction in `DEPENDENCY_RULES.md`
section 3:

```text
Page / Feature
      ↓
Components / Hooks
      ↓
API / Map Adapter
      ↓
External System (Backend API / MapLibre GL JS)
```

Mapped onto GeoResponse:

```text
App
 │
 ├── Page / Features             (components/app-shell, components/resource-list, ...)
 │     │
 │     ├── Presentational components   (common/*, feature-local components)
 │     │
 │     └── Hooks                       (hooks/*, feature-local useX hooks)
 │           │
 │           ├── API layer             (api/*, via TanStack Query)
 │           │
 │           └── Map Adapter           (components/resource-map/map-adapter)
 │
 └── Store                       (store/*, reserved; empty today)
```

A feature component does not call `fetch`, build HTTP requests, or call
MapLibre GL JS. It renders UI, delegates data access to a hook, and
delegates map rendering to the map adapter.

---

## 5. Component Pattern

Components follow a container/presentational split, expressed through
hooks:

- **Presentational components** (`common/*`, and the presentation half of
  a feature component) receive data and callbacks through props, render
  markup, and hold only local, ephemeral UI state (for example, whether a
  tooltip is open).
- **Container behavior** lives in a hook: a shared query/mutation hook
  under `hooks/` (`useResources`, `useResource`, `useRelocateResource`, ...)
  or a feature-local hook (`useResourceCreateForm`). The hook owns data
  fetching, mutation calls, and derived state.

The create form as implemented:

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

The presentational component renders what the hook returns. The hook is
the only place in the feature that reaches the API layer, through the
shared TanStack Query hooks under `hooks/`.

At the top, `components/app-shell/AppShell.tsx` is the single authenticated
page. It calls the shared query hooks (`useResources`, `useCurrentUser`,
`useHotspots`), owns the selection, filter, and modal client state, and
composes the feature components (`ResourceList`, `ResourceMap`,
`ResourceDetail`, `ResourceFilterBar`, the create/update/delete modals,
`RoleManagementModal`, `AuditLogModal`).

---

## 6. Component Encapsulation

Each component directory has one public entry point: the file matching the
component's `PascalCase` name. The layout, the promotion rule, and an
example are in `FRONTEND_NAMING.md` section 5. Architecturally, keeping a
component's helpers private lets them change without affecting other
features and keeps the dependency graph between features shallow
(section 10).

---

## 7. API / Data-Access Layer

All HTTP communication with the Go backend is isolated in `api/`, per
`DEPENDENCY_RULES.md` section 3 ("API communication should be isolated
from UI components").

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

`httpClient.ts`:

- attaches the `/api/v1` base URL
- serializes and deserializes JSON
- unwraps the `{ "data": ..., "meta": ... }` success envelope
  (`API_CONTRACT.md` section 4)
- surfaces the `{ "error": { "code", "message", "details" } }` envelope as
  a typed `ApiError`, so hooks branch on `code`, never on `message`

Hooks call the `*Api.ts` functions through TanStack Query (`useQuery` /
`useMutation`). Components never import `httpClient.ts` or an `*Api.ts`
module directly. Importing a type from `*.types.ts` (such as
`ResourceFilters`) is fine.

---

## 8. Map Adapter

MapLibre GL JS is treated as infrastructure (`SYSTEM_ARCHITECTURE.md`
section 5, `DEPENDENCY_RULES.md` section 3):

```text
Feature Component (ResourceMap.tsx)
       ↓
Map Adapter (map-adapter/MapAdapter.ts)
       ↓
MapLibre GL JS
```

The map adapter:

- initializes and tears down the MapLibre map instance
- converts markers derived from `Resource[]` (`{ latitude, longitude }`)
  into GeoJSON features (`[longitude, latitude]`), following the
  coordinate-order rule in `DATA_CONTRACT.md` sections 2 and 10
- keeps a GeoJSON source/layer pair for resource markers, a selection
  highlight layer, and a second pair for the BMKG hotspot overlay up to
  date as resources are created, relocated, or deleted
- translates MapLibre events into plain callbacks: `onMarkerClick(resourceId)`
  (surfaced by `ResourceMap.tsx` as `onResourceSelect`) and
  `onMapDoubleClick({ latitude, longitude })` (used to create a resource at
  that location)

Only code inside `map-adapter/` imports `maplibre-gl`. `ResourceMap.tsx`
never imports it and never calls `map.addLayer` or other MapLibre APIs.

---

## 9. Data Flow Example

A user relocating a resource, from interaction to re-render. Relocation is
entered as coordinates in the detail panel's `RelocateResourceControl`;
marker dragging is not implemented.

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
AppShell passes the updated markers to ResourceMap.tsx
        ↓
Map Adapter updates the marker's GeoJSON feature
```

`useRelocateResource` also applies the new location optimistically before
the response arrives (`FRONTEND_STATE.md` section 7). Cache invalidation
rules are in `FRONTEND_STATE.md` section 6.

---

## 10. Pages / Features

Following `SYSTEM_ARCHITECTURE.md` section 3, the application is organized
into these feature areas, all rendered on one map-first page
(`components/app-shell/AppShell.tsx`) rather than separate routes:

| Feature | Responsibility | Directories |
|---|---|---|
| Resource management | List, search, filter, create, update, delete resources; change status; view history | `resource-list/`, `resource-filter-bar/`, `resource-detail/`, `resource-create-form/`, `resource-update-form/`, `resource-delete-confirmation/`, `resource-history/` |
| Map | Show resources on the map; select from the map; create at a double-clicked location; relocate; hotspot overlay | `resource-map/`, `resource-relocate-form/`, `hotspot-toggle/`, `map-legend/` |
| Access | Login, role/permission management, audit log | `login-form/`, `role-management/`, `audit-log/` |

There is no separate dashboard; the app shell's list, filters, and map
provide the overview. Features may use `common/` primitives and shared
`hooks/`, but do not import from another feature's directory. The app
shell, as the page, is the one place that composes them. Shared behavior
is promoted to `hooks/`, `utils/`, or `api/`.

Each layer depends only on the one directly below it: a component renders,
a hook fetches and derives, the API layer talks to the backend, and the map
adapter talks to MapLibre.
