# Frontend UI/UX

## 1. Purpose

This document defines the UI/UX principles for the GeoResponse frontend: how the map, resource list, resource detail, and resource forms are laid out and how they communicate state to the user.

It builds on `PRODUCT_CONTEXT.md` (product users and goals) and `DOMAIN_MODEL.md` (the `Resource` concept), and on the styling decision in `TECHNOLOGY_SELECTION.md` section 12 (CSS via Tailwind CSS v4, no separate component/design-system library).

---

## 2. Design Principles

1. **Map-first.** Location is a fundamental part of a resource (`DOMAIN_MODEL.md` section 8), not a secondary attribute. The map is a primary, persistent surface, not a tab buried behind other views.
2. **Status is always visible.** A resource's operational status (`AVAILABLE` / `IN_USE` / `MAINTENANCE` / `UNAVAILABLE`) is legible at a glance, on the map, in the list, and in the detail panel, using consistent color coding.
3. **Immediate feedback.** Every state-changing action (create, update, delete, status change, relocation) gives the user clear feedback on success or failure, tied to the underlying request state (`FRONTEND_STATE.md` section 4).
4. **Two users, two emphases.** Operators need efficient management controls (forms, bulk actions, edit affordances). Response Coordinators need a fast, low-friction overview (filters, status distribution, map). The same views serve both; controls that only Operators need are gated by permission, not hidden behind a separate UI.
5. **No fabricated precision.** The application never implies capabilities it does not have — no route lines, no live GPS trails, no dispatch suggestions — consistent with the product boundaries in `PRODUCT_CONTEXT.md` section 10.

---

## 3. Layout

```text
┌───────────────────────────────────────────────────────────┐
│ Top bar: app name, authenticated user, global alert banel  │
├───────────────┬───────────────────────────────────────────┤
│               │                                            │
│ Resource List │                Map                         │
│ (search +     │        (MapLibre-rendered resources,       │
│  filters)     │         selection highlights selected      │
│               │         list row and vice versa)            │
│               │                                            │
├───────────────┴───────────────────────────────────────────┤
│ Resource Detail Panel (opens when a resource is selected)  │
└───────────────────────────────────────────────────────────┘
```

The list and the map share selection state: selecting a resource in the list highlights it on the map and centers/pans to it; selecting a marker on the map highlights the corresponding list row. Selection itself is client state (`FRONTEND_STATE.md` section 3), not server state.

The detail panel opens as a side panel or bottom sheet depending on viewport width (section 7), rather than a full navigation away from the map.

---

## 4. Resource List

- Search input filters by name (`GET /api/v1/resources?search=...`), debounced before triggering a query, so the backend is not queried on every keystroke.
- Type and status filters use explicit controls (dropdown/checkboxes) populated from the fixed enums in `DOMAIN_MODEL.md` sections 5 and 7 (`VEHICLE`, `FACILITY`, `EQUIPMENT`, `IOT_DEVICE`; `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `UNAVAILABLE`), not free text.
- Each row shows: name, type, status indicator, and a short location cue (for example, coordinates or a derived area label).
- Filters are reflected in the query key (`FRONTEND_STATE.md` section 5) so distinct filter combinations are independently cached and shareable within a session.
- Pagination follows the `meta.page` / `meta.pageSize` / `meta.total` contract from `API_CONTRACT.md` section 4.

---

## 5. Resource Detail Panel

Shows the full `Resource` (`DATA_CONTRACT.md` section 3): identity, type, attributes, status, location, and `updatedAt`.

Includes, where the user's permissions allow:

- a status-change control (constrained to the four valid statuses);
- an edit action opening the update form (section 6);
- a delete action requiring explicit confirmation before calling `DELETE /api/v1/resources/{id}`, per `API_CONTRACT.md` section 6.5;
- a history section showing status history, location history, and change history (`GET /api/v1/resources/{id}/history`), each entry showing what changed, when, and by whom when available.

The panel is read from server state directly; it does not maintain its own copy of the resource beyond what is being actively edited in a form.

---

## 6. Create / Update Forms

- Fields mirror the resource shape: name, type, status, attributes (type-specific, per `DOMAIN_MODEL.md` section 6.2), and location (latitude/longitude, or picked directly on the map).
- Client-side validation gives immediate feedback (required fields, latitude in `[-90, 90]`, longitude in `[-180, 180]`, valid type/status) before submission, per `TECHNOLOGY_SELECTION.md` section 13.1. This is a UX convenience — the backend remains authoritative (`API_CONTRACT.md` section 12).
- On submission, the form is disabled and shows a pending indicator until the mutation resolves.
- On a `VALIDATION_ERROR` response, field-level errors are mapped from `error.details` back onto the corresponding form fields when the shape allows it; otherwise the message is shown as a form-level error.
- On success, the form closes and the detail/list view reflects the change once the relevant query keys are invalidated (`FRONTEND_STATE.md` section 6).
- Placing a resource by clicking the map (instead of typing coordinates) is supported for both create and relocate, going through the map adapter's click callback (`FRONTEND_ARCHITECTURE.md` section 8).

---

## 7. Status Indicators

Status is communicated with a consistent color + label pairing, reusing the pattern already established by `common/status-indicator/StatusIndicator.tsx` (a colored indicator box next to a text label), extended to the four `Resource` statuses instead of that component's original generic states:

| Status | Suggested color role |
|---|---|
| `AVAILABLE` | Positive / green |
| `IN_USE` | Informational / blue |
| `MAINTENANCE` | Warning / amber |
| `UNAVAILABLE` | Negative / red |

The same color mapping is used in three places: the list row, the map marker, and the detail panel, so a status never means one color in one view and a different color elsewhere. Color is paired with a text label, not used alone, so status remains legible without relying on color perception.

---

## 8. Loading, Error, and Empty States

These states are driven directly by TanStack Query's status, per `FRONTEND_STATE.md` section 4, not by ad hoc component flags:

| Query state | UI |
|---|---|
| `pending` (first load) | Skeleton/placeholder in the list, map, or detail panel — not a blank screen |
| `error` | A message derived from the error `code` (`API_CONTRACT.md` section 13), with a retry action where retrying is meaningful |
| `success`, empty result | An explicit empty state ("No resources match the current filters") rather than an empty list with no explanation |
| `success`, populated | Normal rendering |
| Mutation `pending` | Submitting controls disabled, pending indicator shown |
| Mutation `error` | Inline or toast feedback (via `store/useAlertStore.ts`) keyed off `error.code`, not the raw `message` string |

The frontend never presents a raw, unmapped `error.message` from the backend as the primary user-facing text for a known `code`; unknown codes fall back to a generic message rather than exposing internal details.

---

## 9. Responsive Layout

- The map and list share the viewport side-by-side on wide screens (desktop/tablet landscape) and stack (list/detail as collapsible panels over a full-width map, or a bottom sheet) on narrow screens, per the layout in section 3.
- Touch targets (list rows, status controls, map markers) remain usable at typical tablet/mobile sizes, since field use during a disaster response is a realistic usage context even though the MVP does not require a dedicated mobile app.
- Tailwind CSS v4 (per `TECHNOLOGY_SELECTION.md` section 12) uses its standard responsive utility variants (`sm:`/`md:`/`lg:` etc., backed by flexbox/grid) rather than a component framework's breakpoint system.

---

## 10. Accessibility Basics

- Status is never conveyed by color alone (section 7).
- Interactive elements (list rows, filter controls, form fields, map markers acting as buttons) are reachable and operable via keyboard, with visible focus states.
- Form fields have associated labels; validation errors are associated with their field (for example, via `aria-describedby`) so they are announced by assistive technology.
- Color choices maintain sufficient contrast against both the map background and the application's light/dark surfaces.
- The map is a supplementary, not the sole, way to reach a resource — every resource reachable on the map is also reachable through the list and its keyboard-operable controls.

---

## 11. Scope Boundary

This document does not define:

- the component/file structure implementing these views (`FRONTEND_ARCHITECTURE.md`);
- naming conventions (`FRONTEND_NAMING.md`);
- state management mechanics (`FRONTEND_STATE.md`);
- testing conventions (`FRONTEND_TESTING.md`);
- a visual design system, color palette values, or a component library choice;
- native mobile app UX.

---

## 12. UI/UX Principle

Every view answers the same three questions about a resource at a glance: what is it, where is it, and is it available.

> If a screen cannot answer those three questions without extra clicks, it is not done.
