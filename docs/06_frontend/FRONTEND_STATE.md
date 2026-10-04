# Frontend State

## 1. Purpose

This document defines how state is organized in the GeoResponse frontend:
what counts as client state versus server state, query-key structure,
cache invalidation after mutations, optimistic updates, and when a shared
store would be appropriate. The underlying decision is recorded in
`TECHNOLOGY_SELECTION.md` section 11. The API and error envelope are in
`API_CONTRACT.md`, the data model in `DATA_CONTRACT.md` and
`DOMAIN_MODEL.md`, and the visual presentation of loading and error states
in `FRONTEND_UI_UX.md` section 8.

---

## 2. Two Categories of State

State in the frontend falls into two categories:

```text
Client State                    Server State
(owned by the UI)               (owned by the backend, cached locally)
      │                               │
useState / useReducer          TanStack Query
      │                               │
  Local to a component          api/ layer → /api/v1/resources...
```

A value is server state if it comes from the backend and can become stale
relative to what the backend holds. Everything else is client state.

---

## 3. Client State

**Tooling: React `useState` / `useReducer`.**

Client state covers:

- the currently selected resource id (independent of fetching its detail)
- filter and search input values (the text a user is typing)
- modal and panel visibility (create/edit form, delete confirmation, role
  management, audit trail)
- form field values and client-side validation errors while editing
- map interaction results, such as the double-clicked location used to
  pre-fill the create form, and the hotspot layer toggle
- tab selection (see `common/tabs/Tabs.tsx`)

The map viewport itself is held by the MapLibre instance inside the map
adapter, not in React state. Marker dragging is not implemented.

Client state stays in the component or feature that owns it. Use
`useState` for independent fields and `useReducer` when several fields
change together as one transition (for example, the create and update
resource forms).

Do not fetch data inside a `useEffect` and store it in `useState`. That
duplicates TanStack Query and loses its caching, retry, and invalidation
(see `CODING_STANDARDS.md` section 13).

---

## 4. Server State

**Tooling: TanStack Query.**

Server state covers all data read from or written to `/api/v1`:

- resource list and resource detail
- resource history (`statusHistory`, `locationHistory`, `changeHistory`)
- the authenticated user (`/api/v1/auth/me`)
- roles, permissions, audit logs
- the BMKG hotspot overlay (`/api/v1/hotspots`)

TanStack Query owns:

- fetching and caching
- loading, error, and success status (see `FRONTEND_UI_UX.md` section 8)
- refetching after invalidation or an explicit `refetch()` (such as the
  list's Retry button); refetch on window focus is turned off in
  `main.tsx`, and failed queries are retried once
- mutations (create, update, delete, status change, relocation)
- keeping the cache consistent after a mutation succeeds

A component never copies server data into local `useState` to make it
easier to edit. A form seeds its local state from the query result once,
then submits the edited value through a mutation.

---

## 5. Query Key Conventions

Query keys are structured, hierarchical arrays defined next to the API
functions that use them (`api/resources/resourceKeys.ts`), never inlined in
components:

```ts
export const resourceKeys = {
  all: ["resources"] as const,
  lists: () => [...resourceKeys.all, "list"] as const,
  list: (filters: ResourceFilters) =>
    [...resourceKeys.lists(), filters] as const,
  details: () => [...resourceKeys.all, "detail"] as const,
  detail: (id: string) => [...resourceKeys.details(), id] as const,
  history: (id: string) => [...resourceKeys.detail(id), "history"] as const,
};
```

Rules:

- The first segment names the domain concept (`"resources"`), matching the
  domain model rather than the HTTP path.
- Filter and pagination parameters are part of list keys, so each filter
  combination caches independently.
- Detail and history keys nest under the resource id, so a broad
  invalidation (`resourceKeys.detail(id)`) also covers history, while a
  narrow one (`resourceKeys.lists()`) does not refetch detail queries.

---

## 6. Cache Invalidation After Mutations

Each mutation invalidates the keys it affects once the backend confirms the
change:

| Mutation | Endpoint | Invalidates |
|---|---|---|
| Create resource | `POST /api/v1/resources` | `resourceKeys.lists()` |
| Update resource | `PUT /api/v1/resources/{id}` | `resourceKeys.detail(id)`, `resourceKeys.lists()` |
| Delete resource | `DELETE /api/v1/resources/{id}` | `resourceKeys.lists()` (and removes `detail(id)` from the cache) |
| Change status | `PATCH /api/v1/resources/{id}/status` | `resourceKeys.detail(id)`, `resourceKeys.lists()`, `resourceKeys.history(id)` |
| Relocate | `PATCH /api/v1/resources/{id}/location` | `resourceKeys.detail(id)`, `resourceKeys.lists()`, `resourceKeys.history(id)` |

`resourceKeys.lists()` is invalidated as a whole, not per filter
combination, because any mutation can change whether a resource matches a
filter (a status change can remove a resource from an "AVAILABLE" list).

---

## 7. Optimistic Updates

Optimistic updates are used only where the benefit is clear and rollback
is low-risk. Today that is resource relocation (`useRelocateResource`), so
the marker moves before the backend confirms:

1. On `onMutate`, cancel in-flight queries for the affected keys, snapshot
   the previous cache values, and apply the new location to the detail and
   every cached list.
2. On error, roll back to the snapshot and surface the error (see
   `FRONTEND_UI_UX.md` section 8).
3. On success or error (`onSettled`), invalidate the keys from section 6 so
   the cache converges with the backend.

Delete, create, and status change are not optimistic. They are destructive
or carry validation risk, so the UI waits for the backend response and its
`code` (`API_CONTRACT.md` section 4).

---

## 8. Cross-Cutting UI State: When to Use a Store

A small hook-based store under `store/` (see `FRONTEND_NAMING.md`
section 7) would be introduced only for UI state that is:

- global, not owned by one feature or page, and
- needed by components with no parent/child relationship, so prop drilling
  would otherwise be required.

No such store exists; `store/` is empty. The cross-cutting state the
application has (selected resource, active filters, which modal is open) is
owned by the single page component `components/app-shell/AppShell.tsx` with
`useState` and passed down as props. Error feedback is rendered by each
component from its own query or mutation state (message from
`utils/apiErrorMessage.ts`); the login form uses `common/alert/Alert.tsx`.
This is sufficient because there is one page.

Do not introduce a store for state local to one feature (use
`useState`/`useReducer` there) or for server state (use TanStack Query). A
dedicated global state library (Redux Toolkit, Zustand, or similar) is out
of scope (`TECHNOLOGY_SELECTION.md` section 11.1). If a store is ever
needed, start with plain React (context + `useReducer`).

The rule behind all of this: a single fact is held by only one of these
mechanisms at a time (TanStack Query, component state, or the nearest
common owner).
