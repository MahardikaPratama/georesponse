# Frontend UI/UX

## 1. Purpose

This document defines the UI/UX principles for the GeoResponse frontend:
how the map, resource list, resource detail, and resource forms are laid
out and how they communicate state to the user. It builds on
`PRODUCT_CONTEXT.md` (users and goals), `DOMAIN_MODEL.md` (the `Resource`
concept), and the styling decision in `TECHNOLOGY_SELECTION.md` section 12
(Tailwind CSS v4, no component library). Component structure is in
`FRONTEND_ARCHITECTURE.md` and state mechanics in `FRONTEND_STATE.md`.
Where the current implementation falls short of a principle below, the gap
is noted briefly and recorded in `docs/01_product/SCOPE.md` section 11.

---

## 2. Design Principles

1. **Map-first.** Location is a fundamental part of a resource
   (`DOMAIN_MODEL.md` section 8). The map is a primary, persistent surface,
   not a tab behind other views.
2. **Status is always visible.** A resource's status (`AVAILABLE` /
   `IN_USE` / `MAINTENANCE` / `UNAVAILABLE`) is legible at a glance on the
   map, in the list, and in the detail panel, with consistent colors.
3. **Immediate feedback.** Every state-changing action (create, update,
   delete, status change, relocation) shows success or failure, tied to the
   request state (`FRONTEND_STATE.md` section 4).
4. **Two users, one UI.** Operators need management controls (forms, edit
   and delete actions). Response Coordinators need a fast overview
   (filters, status colors, map). The same views serve both. Today all
   controls are shown to every signed-in user; the backend enforces
   permissions, and a denied action shows a permission error.
5. **No fabricated precision.** The application never implies
   capabilities it does not have: no route lines, no live GPS trails, no
   dispatch suggestions (see `SCOPE.md` section 4).

Every view should answer three questions about a resource at a glance:
what is it, where is it, and is it available.

---

## 3. Layout

```text
┌───────────────────────────────────────────────────────────┐
│ Top bar: app name, hotspot toggle, user name,              │
│          Manage Roles, Audit Trail, Log out                │
├───────────────┬───────────────────────────────────────────┤
│ + New Resource│                Map                         │
│ Filter bar    │   (MapLibre-rendered resources, legend)    │
│ (search,      │                          ┌──────────────┐  │
│  type, status)│                          │ Resource     │  │
│               │                          │ Detail panel │  │
│ Resource List │                          │ (floating,   │  │
│               │                          │  on select)  │  │
│               │                          └──────────────┘  │
└───────────────┴───────────────────────────────────────────┘
```

The list is a fixed-width column beside the map. The detail panel opens as
a floating card anchored to the map's top-right corner when a resource is
selected, so the user never navigates away from the map. Create, update,
delete confirmation, role management, and the audit trail open as modals.

The list and the map share selection state: selecting a resource in the
list highlights its marker, and clicking a marker highlights the list row
and opens the detail panel. The map does not pan or zoom to the selected
resource. Selection is client state (`FRONTEND_STATE.md` section 3).

---

## 4. Resource List

- The search input filters by name (`GET /api/v1/resources?search=...`)
  and is debounced, so the backend is not queried on every keystroke.
- Type and status filters are dropdowns populated from the fixed enums
  (`DOMAIN_MODEL.md` sections 5 and 7), not free text.
- Each row shows name, status (color box plus label), type, and
  coordinates.
- Filters are part of the query key (`FRONTEND_STATE.md` section 5), so
  each filter combination is cached independently.
- There is no pagination control. The list and map show the first page
  (default 20) of matching resources; search and filters apply on the
  server, so any resource can still be found (`SCOPE.md` section 11.2).

---

## 5. Resource Detail Panel

Shows the `Resource` (`DATA_CONTRACT.md` section 3): name, id, type,
attributes, status, and location. `updatedAt` is not shown because the
backend does not return it yet (`API_CONTRACT.md` section 19).

It includes:

- a status-change control (a dropdown limited to the four statuses)
- the relocate control, where new coordinates are entered
- an edit action opening the update form (section 6)
- a delete action that requires confirmation before calling
  `DELETE /api/v1/resources/{id}` (`API_CONTRACT.md` section 6.5)
- a history section with status, location, and change history
  (`GET /api/v1/resources/{id}/history`), each entry showing what changed,
  when, and by whom when available

The panel reads server state directly; it keeps no copy of the resource
beyond what is being edited in a form.

---

## 6. Create / Update Forms

- Fields mirror the resource shape: name, type, status, type-specific
  attributes (`DOMAIN_MODEL.md` section 6.2), and location. The create
  form also takes the resource id.
- A new resource can be placed by double-clicking the map, which opens
  the create form with latitude and longitude pre-filled (through the map
  adapter's `onMapDoubleClick`, `FRONTEND_ARCHITECTURE.md` section 8).
  Relocation is entered as coordinates in the detail panel; marker
  dragging is not implemented.
- Client-side validation gives immediate feedback on required fields,
  coordinates, and type/status before submission. The rules are defined in
  `DATA_CONTRACT.md` section 2 and `API_CONTRACT.md` section 12; the
  backend remains authoritative.
- While submitting, the form fields are disabled and a pending indicator
  is shown until the mutation resolves.
- On a `VALIDATION_ERROR`, field-level errors from `error.details` are
  mapped onto the matching fields when possible; otherwise the message is
  shown as a form-level error.
- On success, the form closes and the list, map, and detail reflect the
  change once the affected query keys are invalidated
  (`FRONTEND_STATE.md` section 6).

---

## 7. Status Indicators

Status uses a consistent color plus a text label. The mapping is defined
once in `constants/resourceStatus.constants.ts` (`RESOURCE_STATUS_CONFIG`):

| Status | Color role |
|---|---|
| `AVAILABLE` | Positive / green |
| `IN_USE` | Informational / blue |
| `MAINTENANCE` | Warning / amber |
| `UNAVAILABLE` | Negative / red |

The same mapping is used by the list row, the map marker, the map legend,
the detail panel, and the history view, so a status never has different
colors in different views. Color is always paired with a label so status
is legible without relying on color perception.

---

## 8. Loading, Error, and Empty States

These states come from TanStack Query's status (`FRONTEND_STATE.md`
section 4), not ad hoc component flags:

| Query state | UI |
|---|---|
| `pending` (first load) | Skeleton or placeholder in the list, detail panel, or history, not a blank screen |
| `error` | A message derived from the error `code` (`API_CONTRACT.md` section 13), with a Retry action where retrying is meaningful (the resource list has one) |
| `success`, empty result | An explicit empty state ("No resources match the current filters." or "No resources exist yet.") |
| `success`, populated | Normal rendering |
| Mutation `pending` | Submitting controls disabled, pending indicator shown |
| Mutation `error` | Inline feedback in the owning component, with the message derived by `utils/apiErrorMessage.ts` from `error.code` (the login form uses `common/alert/Alert.tsx`) |

The frontend never shows a raw `error.message` from the backend as the
main text for a known `code`; unknown codes fall back to a generic message.
When no resources match, the map shows no markers and has no empty-state
overlay of its own; the list carries the message (`SCOPE.md`
section 11.2).

---

## 9. Responsive Layout

The current layout is a fixed-width list beside the map, sized for desktop
viewports. Narrow-viewport behavior is not implemented (`SCOPE.md`
section 11.3). The intended behavior is:

- On narrow screens, the list and detail stack as collapsible panels (or a
  bottom sheet) over a full-width map.
- Touch targets (list rows, status controls, map markers) stay usable at
  tablet and phone sizes, since field use during disaster response is
  realistic even though the MVP does not include a mobile app.
- Responsiveness uses Tailwind's standard variants (`sm:`/`md:`/`lg:`,
  backed by flexbox and grid), not a component framework's breakpoints.

---

## 10. Accessibility Basics

- Status is never conveyed by color alone (section 7).
- Interactive elements (list rows, filter controls, form fields, buttons)
  are native buttons and inputs, so they are keyboard-operable.
- Form fields have associated labels, and validation errors are announced
  to assistive technology (the create form renders them with
  `role="alert"`; `aria-describedby` is also acceptable).
- Colors keep sufficient contrast against the map and the application's
  dark surfaces.
- Map markers are not keyboard-focusable, so every resource on the map is
  also reachable through the list and its keyboard-operable controls.
