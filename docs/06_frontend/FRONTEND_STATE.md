# Frontend State

## 1. Purpose

This document defines how state is organized in the GeoResponse frontend.

It expands the decision recorded in `TECHNOLOGY_SELECTION.md` section 11 (State Management) into concrete conventions: what qualifies as client state versus server state, when a global store is appropriate, query-key structure, and cache invalidation after mutations.

---

## 2. Two Categories of State

State in the frontend falls into exactly two categories:

```text
Client State                    Server State
(owned by the UI)               (owned by the backend, cached locally)
      │                               │
useState / useReducer          TanStack Query
      │                               │
  Local to a component          api/ layer → /api/v1/resources...
```

A value belongs to server state if it originates from the backend and can become stale relative to what the backend currently holds. Everything else is client state.

---

## 3. Client State

**Tooling: React `useState` / `useReducer`.**

Client state covers:

- the currently selected resource (before/independent of fetching its detail);
- active filter/search input values (the text a user is typing);
- modal and panel visibility (create/edit form open, confirmation dialog open);
- form field values and client-side validation errors while editing;
- temporary map interaction state (a marker being dragged, the current viewport);
- tab selection (see `common/tabs/Tabs.tsx`).

Client state stays inside the component or feature that owns it, using `useState` for independent fields and `useReducer` when several fields change together as one meaningful transition (for example, a multi-step create-resource form).

Do not fetch data inside a `useEffect` and store it in `useState`. That duplicates what TanStack Query already does and loses caching, retry, and invalidation behavior for free — see `CODING_STANDARDS.md` section 13.

---

## 4. Server State

**Tooling: TanStack Query.**

Server state covers all data that is read from or written to `/api/v1`:

- resource list and resource detail;
- resource history (`statusHistory`, `locationHistory`, `changeHistory`);
- the authenticated user (`/api/v1/auth/me`);
- roles, permissions, audit logs.

TanStack Query owns:

- fetching and caching;
- loading/error/success status (see `FRONTEND_UI_UX.md` section 8 for how these map to UI states);
- refetching (window refocus, manual invalidation);
- mutations (create, update, delete, status change, relocation);
- keeping the cache consistent after a mutation succeeds.

A component never copies server data into local `useState` "to make it easier to edit." A form seeds its local client state from the query result once, then submits the edited value through a mutation.

---

## 5. Query Key Conventions

Query keys are structured, hierarchical arrays, defined next to the API functions that use them (`api/resources/resourceKeys.ts`), not inlined in components:

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

- The first segment identifies the domain concept (`"resources"`), matching the domain model, not the HTTP path.
- Filters/pagination parameters are part of the key for list queries, so distinct filter combinations cache independently.
- Detail and history keys nest under the resource id so a broad invalidation (`resourceKeys.detail(id)`) also covers history if needed, while a narrow invalidation (`resourceKeys.lists()`) does not refetch unrelated detail queries.

---

## 6. Cache Invalidation After Mutations

Every mutation invalidates the query keys it affects once the backend confirms the change, using the keys from section 5:

| Mutation | Endpoint | Invalidates |
|---|---|---|
| Create resource | `POST /api/v1/resources` | `resourceKeys.lists()` |
| Update resource | `PUT /api/v1/resources/{id}` | `resourceKeys.detail(id)`, `resourceKeys.lists()` |
| Delete resource | `DELETE /api/v1/resources/{id}` | `resourceKeys.lists()` (remove `detail(id)` from cache) |
| Change status | `PATCH /api/v1/resources/{id}/status` | `resourceKeys.detail(id)`, `resourceKeys.lists()`, `resourceKeys.history(id)` |
| Relocate | `PATCH /api/v1/resources/{id}/location` | `resourceKeys.detail(id)`, `resourceKeys.lists()`, `resourceKeys.history(id)` |

`resourceKeys.lists()` is invalidated broadly (rather than one specific filter combination) because any mutation can change whether a resource matches a currently-viewed filter (for example, a status change can remove a resource from an "AVAILABLE" filtered list).

---

## 7. Optimistic Updates

Optimistic updates are only used where the UI benefit is clear and the operation is low-risk to roll back, primarily resource relocation on the map (dragging a marker should feel immediate).

When used:

1. On `onMutate`, cancel in-flight queries for the affected key, snapshot the previous cache value, and apply the optimistic change.
2. On error, roll back to the snapshot and surface the error (see `FRONTEND_UI_UX.md` section 8).
3. On success or error, invalidate the affected keys from section 6 so the cache converges with the backend's actual state.

Optimistic updates are not used for destructive operations (delete) or for operations with meaningful validation risk (create, status change), where waiting for the backend response and its `code` (per `API_CONTRACT.md` section 4) is preferred over guessing the outcome.

---

## 8. Cross-Cutting UI State: When to Use a Store

A small hook-based store under `store/` (see `FRONTEND_NAMING.md` section 7) would be introduced only for UI state that is:

- genuinely global (not owned by one feature or page); and
- needed by components with no direct parent/child relationship, so prop drilling would otherwise be required.

**No such store exists today** — `store/` is empty. The cross-cutting state the application has (selected resource, active filters, which modal is open) is owned by the single page component `components/app-shell/AppShell.tsx` with `useState`, and passed down as props; toast/alert feedback is rendered by `common/alert/Alert.tsx` from the owning component's local state. That has been sufficient because there is one page.

Do not introduce a store for state that is local to one feature (use `useState`/`useReducer` in that feature) or for anything that is server state (use TanStack Query). A dedicated global state library (Redux Toolkit, Zustand, or similar) is out of scope per `TECHNOLOGY_SELECTION.md` section 11.1 — the current client-side state does not justify it; if a store is ever needed it should be a plain React implementation (context + `useReducer`) first.

---

## 9. Scope Boundary

This document does not define:

- the API contract or error envelope shape (`API_CONTRACT.md`);
- the domain data model (`DATA_CONTRACT.md`, `DOMAIN_MODEL.md`);
- component/file naming (`FRONTEND_NAMING.md`);
- how loading/error/empty states are presented visually (`FRONTEND_UI_UX.md`);
- backend caching or persistence.

---

## 10. State Principle

Data that the backend owns lives in TanStack Query. Data the UI owns lives in `useState`/`useReducer`. Data that must cross unrelated features is lifted to the nearest common owner (today, the app shell) — or, if that ever becomes unwieldy, a small, purpose-built store.

> Never let two of these three mechanisms hold the same fact at the same time.
