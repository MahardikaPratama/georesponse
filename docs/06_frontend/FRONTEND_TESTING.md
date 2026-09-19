# Frontend Testing

## 1. Purpose

This document defines how the GeoResponse frontend is tested.

It expands `TECHNOLOGY_SELECTION.md` section 14.1 and `CODING_STANDARDS.md` sections 15 and 17 into concrete frontend testing conventions: what to test, what not to test, file placement, and how the map adapter is handled.

---

## 2. Tooling

**Vitest + React Testing Library**, per `TECHNOLOGY_SELECTION.md` section 14.1.

React Testing Library encourages testing components through their rendered output and user interaction rather than internal implementation details, which is why the conventions below are phrased in terms of observable behavior rather than component internals.

---

## 3. Test File Placement

Tests are colocated with the source file they cover, never placed in a separate `__tests__` directory, matching `CODING_STANDARDS.md` section 4 and the existing `utils/logger/logger.test.ts` example.

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

Naming pattern: `<SourceFileName>.test.ts` or `.test.tsx`, matching the case of the file under test (`ResourceList.test.tsx` for a component, `httpClient.test.ts` for a module-level file). Vitest is configured with `globals: true` (`vitest.config.ts`), so `describe`/`it`/`expect`/`vi` may be used without importing them; importing them explicitly is also fine.

---

## 4. What to Test

### 4.1 Rendering

- The component renders expected content given a set of props (resource name, type, status, location).
- Conditional rendering branches (loading, error, empty, populated) render the correct output.

### 4.2 User Interaction

- Clicking, typing, and selecting produce the expected callback calls or visible state changes (for example, selecting a resource card calls `onSelect(resource.id)`).
- Keyboard interaction for interactive elements where relevant (form submission, dismissing a dialog).

### 4.3 Form Validation

- Required-field, coordinate-range, and status-enum validation (see `DATA_CONTRACT.md` section 11 and `API_CONTRACT.md` section 12) surface the correct inline feedback before submission.
- A submit attempt with invalid data does not call the mutation.

### 4.4 State Transitions

- A status-change action moves the UI from the current status to the requested one after a successful mutation.
- An optimistic relocation (`FRONTEND_STATE.md` section 7) rolls back correctly on a failed mutation.

### 4.5 API-Boundary Mocking

- Hooks and components that call `api/resources/resourceApi.ts` are tested with that module mocked (or with a mocked `httpClient`), asserting:
  - the correct endpoint/method/payload is used for a given action;
  - a success response updates the UI as expected;
  - an error response with a given `code` (`VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, ...) produces the corresponding user-facing message, not a raw/unhandled error.
- The envelope handling lives in `httpClient.ts` and is tested there (`api/httpClient.test.ts`) against a mocked `fetch`, asserting it builds the correct request and correctly unwraps the `{ data, meta }` / `{ error }` envelopes from `API_CONTRACT.md` section 4; the per-domain `*Api.ts` modules are thin and are exercised through the hook tests (`hooks/use*.test.ts`) with `httpClient` mocked.

---

## 5. What Not to Test

- MapLibre GL JS internals (tile loading, WebGL rendering, its own event system). MapLibre is a third-party library; its correctness is not GeoResponse's responsibility to verify.
- Exact pixel positions, CSS computed styles, or animation timing.
- Implementation details that do not affect observable behavior (internal variable names, non-exported helper functions in isolation when they have no independent contract).
- TanStack Query's own caching/retry mechanics — trust the library; test how the application uses it (query keys, invalidation, derived UI state).

---

## 6. Testing the Map Adapter

The map adapter (`components/resource-map/map-adapter/MapAdapter.ts`) is the one place `maplibre-gl` is imported, per `FRONTEND_ARCHITECTURE.md` section 8. It is tested at its boundary rather than through a real MapLibre instance:

- `maplibre-gl` is mocked in the adapter's test file (`MapAdapter.test.ts`, `vi.mock("maplibre-gl", ...)`), exposing the small surface the adapter uses (`Map`, `addSource`, `addLayer`, `on`, `remove`, ...).
- Tests assert the adapter's own contract: given the markers derived from `Resource[]`, it builds the expected GeoJSON feature collection (correct `[longitude, latitude]` order per `DATA_CONTRACT.md` section 2); given a MapLibre click event on the marker layer, it calls the adapter's `onMarkerClick` callback with the correct resource id (which `ResourceMap.tsx` surfaces to its parent as `onResourceSelect`).
- Tests do not assert anything about MapLibre's actual rendering output.

A test for a feature component that uses the map adapter (`ResourceMap.tsx`) mocks the adapter module itself, the same way hook tests mock the API modules, so component tests stay independent of both the network and the map engine.

---

## 7. Example Test File

```ts
// ResourceCard.test.tsx
/**
 * Tests for the ResourceCard component.
 *
 * Covers rendering by resource status and the select interaction.
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

- No arbitrary `setTimeout`/sleep-based waits; use React Testing Library's `findBy*`/`waitFor` utilities, which poll rather than guess a fixed delay.
- Mock the system clock explicitly when a test depends on `updatedAt`/`changedAt` timestamps.
- Tests must not depend on execution order or shared mutable module state between test files.

---

## 9. Scope Boundary

This document does not define:

- backend testing conventions (`CODING_STANDARDS.md` section 15, "Backend");
- end-to-end/browser-automation testing (the Playwright golden-path suite in `tests/e2e/` is covered by `TESTING_STRATEGY.md` section 5 and `tests/README.md`);
- performance/load testing (covered separately by the map benchmark methodology for MapLibre itself, not the application);
- visual regression testing.

---

## 10. Testing Principle

Tests describe what a user or another module can observe: rendered content, interaction outcomes, and the result of calling a hook or API function — never MapLibre's internals and never a component's private implementation details.

> If a refactor that preserves behavior breaks a test, the test was testing the wrong thing.
