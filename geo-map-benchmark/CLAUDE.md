# Claude Code Instructions

## 1. Project Overview

This repository contains the **Geo Map Benchmark** for the **Resource Readiness for Disaster Response** application.

The benchmark evaluates geospatial map libraries that may be used in the final application.

The current map library candidates are:

* Leaflet
* OpenLayers
* MapLibre GL JS

The benchmark must compare these libraries using the same workload, dataset, environment, and measurement methodology.

The benchmark must remain evidence-driven. Do not select or describe a library as superior before benchmark results support the conclusion.

---

## 2. Project Requirements

The target application has mandatory technology requirements:

* Frontend: React + TypeScript
* Backend: Go

This repository focuses only on the frontend geospatial map benchmark.

The benchmark frontend uses:

* React
* TypeScript
* Rspack
* npm

The map libraries being evaluated are:

* Leaflet
* OpenLayers
* MapLibre GL JS

Do not replace React + TypeScript with another frontend framework.

Do not introduce unnecessary frontend frameworks or libraries.

---

## 3. Source of Truth

Before implementing or changing the benchmark, read the relevant documentation under `docs/`.

Important documents:

| Document                   | Purpose                               |
| -------------------------- | ------------------------------------- |
| `PROJECT_CONTEXT.md`       | Project background and requirements   |
| `BENCHMARK_SCOPE.md`       | Benchmark boundaries                  |
| `BENCHMARK_CRITERIA.md`    | Evaluation criteria                   |
| `BENCHMARK_SCENARIOS.md`   | Benchmark scenarios                   |
| `BENCHMARK_METHODOLOGY.md` | Measurement methodology               |
| `BENCHMARK_ENVIRONMENT.md` | Hardware and software environment     |
| `TECHNOLOGY_CANDIDATES.md` | Candidate libraries                   |
| `BENCHMARK_RESULTS.md`     | Recorded benchmark results            |
| `TECHNOLOGY_SELECTION.md`  | Technology selection                  |
| `DECISION_RECORD.md`       | Architectural and technical decisions |

When implementing benchmark behavior, the documentation takes precedence over assumptions.

If documentation is ambiguous, identify the ambiguity before making a significant architectural change.

---

## 4. Benchmark Integrity

Benchmark results must be reproducible and must not be fabricated.

Never:

* Invent benchmark measurements.
* Modify measurements to favor a candidate.
* Remove unfavorable measurements without documenting why.
* Change benchmark conditions between candidates.
* Present qualitative observations as quantitative measurements.
* Treat assumptions as measured results.
* Select a library before completing the required measurements.

All candidates must use the same:

* Hardware
* Operating system
* Browser
* Browser configuration
* Viewport
* Dataset
* Feature counts
* Initial map state
* Zoom level
* Benchmark scenario
* Measurement procedure

Any intentional deviation must be documented.

---

## 5. Benchmark Scenarios

Implement the scenarios defined in `BENCHMARK_SCENARIOS.md`.

Current scenarios:

* S01 — Basic Map
* S02 — Point Features
* S03 — GeoJSON
* S04 — Polygon Features
* S05 — Multiple Layers
* S06 — Large Dataset
* S07 — Map Interaction

Do not silently add or remove scenarios.

If a new scenario is technically necessary, update the benchmark documentation before implementing it.

---

## 6. Measurement Methodology

Follow `BENCHMARK_METHODOLOGY.md`.

The benchmark uses:

* Warm-up runs: 3
* Measured runs: 10

Where applicable, record:

* Initialization time
* Rendering time
* FPS
* Memory usage
* Bundle size
* Interaction responsiveness

Report appropriate statistical values such as:

* Mean
* Median
* Minimum
* Maximum
* Standard deviation

Use the documented methodology consistently across candidates.

Raw measurements must be retained whenever practical.

---

## 7. Architecture

Keep the benchmark separated into three concerns:

```text
React UI
    |
    v
Benchmark Engine
    |
    +-- Leaflet adapter
    +-- OpenLayers adapter
    +-- MapLibre adapter
```

### React UI

Responsible for:

* Benchmark controls
* Scenario selection
* Library selection
* Result visualization
* Status display

### Benchmark Engine

Responsible for:

* Benchmark lifecycle
* Timing
* Measurement collection
* Scenario execution
* Result normalization

### Library Implementations

Responsible for:

* Library-specific map initialization
* Feature creation
* Layer creation
* Map interaction
* Library-specific cleanup

Do not place generic measurement logic inside individual map-library implementations.

---

## 8. Frontend Architecture Rules

Follow the conventions defined in `AI-AGENT.md` and the frontend naming guide.

General rules:

* Folders use `kebab-case`.
* Default files use `camelCase`.
* Components use `PascalCase`.
* Component type files use `.types.ts`.
* Component constant files use `.constants.ts`.
* Component utility files use `.utils.ts`.
* Tests are colocated with the file they test.
* Do not create `__tests__` directories.

Example:

```text
components/
└── benchmark-panel/
    ├── BenchmarkPanel.tsx
    ├── BenchmarkPanel.test.tsx
    ├── BenchmarkPanel.types.ts
    ├── BenchmarkPanel.constants.ts
    ├── BenchmarkPanel.utils.ts
    └── useBenchmarkPanel.ts
```

---

## 9. Encapsulation

A component's root file is its public API.

Do not import another component's internal files directly.

Bad:

```ts
import { BenchmarkPanelProps } from
  "../benchmark-panel/BenchmarkPanel.types";
```

If the type is required outside the component boundary, determine whether it should be promoted to a shared type under:

```text
src/types/
```

The same principle applies to:

* `.types.ts`
* `.constants.ts`
* `.utils.ts`
* component hooks

Keep implementation details private to their owning component.

---

## 10. React Patterns

Prefer:

* Functional components
* Custom hooks
* Container/presentational separation
* Explicit TypeScript types
* Small, focused components

Keep rendering concerns separate from:

* Data fetching
* Benchmark orchestration
* State management
* Performance measurement
* Map-library implementation

Do not put complex benchmark logic directly inside JSX components.

---

## 11. Benchmark Adapter Rules

Each map library must have an isolated implementation.

Example:

```text
src/benchmarks/
├── leaflet/
├── openlayers/
└── maplibre/
```

Do not create library-specific conditional logic throughout unrelated components.

Prefer a common benchmark interface when the operations are conceptually shared.

For example:

```ts
interface MapBenchmark {
  initialize(): void;
  renderFeatures(): void;
  clear(): void;
  destroy(): void;
}
```

The exact interface should be determined by the benchmark requirements rather than introduced prematurely.

---

## 12. Dependency Rules

Before adding a dependency:

1. Determine whether it is actually required.
2. Check whether the functionality can be implemented using the existing stack.
3. Confirm that it does not introduce unnecessary benchmark overhead.
4. Document significant architectural dependencies.

Avoid adding:

* UI frameworks
* State-management libraries
* Routing libraries
* Utility libraries
* CSS frameworks

unless they are required by the benchmark.

The benchmark should remain intentionally minimal.

---

## 13. Code Quality

Generated or modified code must:

* Compile successfully.
* Pass the configured tests.
* Follow the project naming conventions.
* Avoid unnecessary duplication.
* Avoid dead code.
* Avoid unexplained magic numbers.
* Use explicit types where they improve correctness.
* Clean up map instances and event listeners.
* Avoid memory leaks.

Do not suppress TypeScript errors without understanding and documenting the reason.

Do not use `any` unless there is a documented technical reason.

---

## 14. Validation

After meaningful code changes, run the relevant checks.

At minimum, verify:

```bash
npm run build
```

If test scripts exist:

```bash
npm test
```

For benchmark changes, verify that all affected candidates still initialize and clean up correctly.

Do not claim that a benchmark passed unless it was actually executed.

---

## 15. Documentation Rules

Update documentation when implementation changes affect:

* Benchmark methodology
* Benchmark scenarios
* Environment
* Candidate technologies
* Measurement procedures
* Technology selection
* Architectural decisions

Do not overwrite measured results without preserving the original evidence.

Keep implementation documentation and measured results separate.

---

## 16. Git Rules

Use focused commits.

Prefer commits such as:

```text
feat: add benchmark engine
feat: add leaflet benchmark adapter
feat: add openlayers benchmark adapter
feat: add maplibre benchmark adapter
feat: add benchmark result visualization
docs: document benchmark methodology
fix: clean up map benchmark lifecycle
```

Do not mix unrelated refactoring with benchmark implementation.

Do not commit:

* `node_modules/`
* generated build artifacts
* local environment files
* secrets
* temporary benchmark output unless explicitly required

---

## 17. Working Procedure

Before implementing a feature:

1. Read the relevant documentation.
2. Identify the affected architecture boundary.
3. Check existing implementation.
4. Make the smallest appropriate change.
5. Run validation.
6. Update documentation if required.
7. Report what changed and what was validated.

Do not rewrite working code unnecessarily.

When uncertain, prefer the documented benchmark methodology over assumptions.
