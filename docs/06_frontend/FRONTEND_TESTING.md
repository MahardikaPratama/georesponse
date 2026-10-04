# Frontend Testing

## 1. Purpose

This document defines how the GeoResponse frontend is tested: tooling,
file placement, what to test and what not to, and how the map adapter is
handled. The overall strategy and the end-to-end suite are in
`TESTING_STRATEGY.md` (section 5) and `tests/README.md`; the backend
counterpart is `docs/07_backend/BACKEND_TESTING.md`. Performance testing
(covered by the map benchmark for MapLibre itself) and visual regression
testing are not part of this document.

---

## 2. Tooling

**Vitest + React Testing Library** (`TECHNOLOGY_SELECTION.md`
section 14.1).

React Testing Library tests components through rendered output and user
interaction, so the conventions below are phrased in terms of observable
behavior rather than component internals.

---

## 3. Test File Placement

Tests are colocated with the source file they cover, never in a separate
`__tests__` directory.

```text
components/resource-list/
├── ResourceList.tsx
├── ResourceList.types.ts
└── ResourceList.test.tsx

api/
├── httpClient.ts
└── httpClient.test.ts

hooks/
├── useResources.ts
└── useResources.test.ts

utils/logger/
├── logger.ts
├── logger.types.ts
└── logger.test.ts
```

Naming pattern: `<SourceFileName>.test.ts` or `.test.tsx`, matching the
case of the file under test (`ResourceList.test.tsx` for a component,
`httpClient.test.ts` for a module). Vitest runs with `globals: true`
(`vitest.config.ts`), so `describe`/`it`/`expect`/`vi` can be used without
importing them; importing them explicitly is also fine.

---

## 4. What to Test

### 4.1 Rendering

- The component renders expected content for a set of props (resource
  name, type, status, location).
- Conditional branches (loading, error, empty, populated) render the
  correct output.

### 4.2 User Interaction

- Clicking, typing, and selecting produce the expected callback calls or
  visible state changes (for example, selecting a resource calls
  `onSelect(resource.id)`).
- Keyboard interaction where relevant (form submission, dismissing a
  dialog).

### 4.3 Form Validation

- Required-field, coordinate-range, and enum validation surface the
  correct inline feedback before submission. The rules themselves are in
  `API_CONTRACT.md` section 12 and `DATA_CONTRACT.md` section 2.
- A submit attempt with invalid data does not call the mutation.

### 4.4 State Transitions

- A status change moves the UI to the requested status after a successful
  mutation.
- An optimistic relocation (`FRONTEND_STATE.md` section 7) rolls back on a
  failed mutation.

### 4.5 API-Boundary Mocking

- Hooks and components are tested with the per-domain API module mocked
  (for example `vi.mock("@api/resources/resourceApi", ...)` in
  `hooks/useResources.test.ts`), asserting:
  - the correct API function and payload are used for a given action
  - a success response updates the UI or cache as expected
  - an error with a given `code` (`VALIDATION_ERROR`,
    `RESOURCE_NOT_FOUND`, ...) produces the matching user-facing message,
    not a raw or unhandled error
- Envelope handling lives in `httpClient.ts` and is tested in
  `api/httpClient.test.ts` against a stubbed global `fetch`, asserting the
  request is built correctly and the `{ data, meta }` / `{ error }`
  envelopes (`API_CONTRACT.md` section 4) are unwrapped correctly. The
  per-domain `*Api.ts` modules are thin wrappers over `httpClient` and have
  no tests of their own.

---

## 5. What Not to Test

- MapLibre GL JS internals (tile loading, WebGL rendering, its event
  system). It is a third-party library.
- Exact pixel positions, computed CSS styles, or animation timing.
- Implementation details that do not affect observable behavior (internal
  variable names, non-exported helpers with no independent contract).
- TanStack Query's own caching and retry mechanics. Test how the
  application uses it (query keys, invalidation, derived UI state).

---

## 6. Testing the Map Adapter

The map adapter (`components/resource-map/map-adapter/MapAdapter.ts`) is
the only place `maplibre-gl` is imported (`FRONTEND_ARCHITECTURE.md`
section 8). It is tested at its boundary, not through a real MapLibre
instance:

- `MapAdapter.test.ts` mocks `maplibre-gl` with `vi.mock("maplibre-gl",
  ...)`, exposing the small surface the adapter uses (`Map`, `addSource`,
  `addLayer`, `on`, `remove`, ...).
- Tests assert the adapter's own contract: input data becomes the
  expected GeoJSON feature collection in `[longitude, latitude]` order
  (`DATA_CONTRACT.md` section 2), and MapLibre events become the right
  callbacks (`onMarkerClick`, which `ResourceMap.tsx` surfaces as
  `onResourceSelect`, and `onMapDoubleClick`). The current tests cover the
  hotspot feature collection, layer visibility, click routing, and
  double-click handling; resource-marker conversion has no direct test
  yet.
- Tests assert nothing about MapLibre's rendering output.

`ResourceMap.tsx` has no test of its own today. A test for it, or for any
component that uses the adapter, should mock the adapter module, the same
way hook tests mock the API modules, so component tests stay independent
of both the network and the map engine.

---

## 7. Example Test File

Every test file carries the standard file header from
`CODING_STANDARDS.md` section 3.

```tsx
/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests for the ResourceCard component: rendering by
 *                resource status and the select interaction.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ResourceCard from "./ResourceCard";

describe("ResourceCard", () => {
  it("renders the resource name and status", () => {
    render(
      <ResourceCard
        resource={{
          id: "resource-001",
          name: "Vehicle A",
          type: "VEHICLE",
          status: "AVAILABLE",
          location: { latitude: -6.9147, longitude: 107.6098 },
          attributes: {},
        }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("Vehicle A")).toBeInTheDocument();
    expect(screen.getByText("AVAILABLE")).toBeInTheDocument();
  });

  it("calls onSelect with the resource id when clicked", () => {
    const onSelect = vi.fn();
    render(
      <ResourceCard
        resource={{
          id: "resource-001",
          name: "Vehicle A",
          type: "VEHICLE",
          status: "AVAILABLE",
          location: { latitude: -6.9147, longitude: 107.6098 },
          attributes: {},
        }}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onSelect).toHaveBeenCalledWith("resource-001");
  });
});
```

---

## 8. Determinism

- No `setTimeout`/sleep-based waits; use React Testing Library's
  `findBy*`/`waitFor`, which poll instead of guessing a delay.
- Mock the system clock when a test depends on timestamps such as
  `changedAt`.
- Tests must not depend on execution order or on shared mutable module
  state between test files.

A test should break only when observable behavior changes. If a
behavior-preserving refactor breaks a test, the test was checking
implementation details.
