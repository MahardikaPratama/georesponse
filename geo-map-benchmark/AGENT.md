# AI Agent Project Context

## 1. Project Identity

**Project:** Resource Readiness for Disaster Response

**Repository:** GeoResponse

**Current Module:** Geo Map Benchmark

**Purpose:** Evaluate web-based geospatial map libraries for the disaster-response resource visualization system.

The final application is intended to visualize and interact with geographic information such as:

* Hospitals
* Shelters
* Warehouses
* Emergency posts
* Response units
* Disaster-affected areas
* Other operational resources

The benchmark exists to support the technical selection of the map technology used by the final application.

---

## 2. Mandatory Technology Constraints

The final application must use:

```text
Frontend → React + TypeScript
Backend  → Go
```

These requirements are fixed.

The benchmark focuses on the frontend mapping layer.

Current benchmark stack:

```text
React
TypeScript
Rspack
npm
```

---

## 3. Benchmark Candidates

The benchmark evaluates three map libraries:

### Leaflet

Lightweight 2D web mapping library.

Relevant capabilities:

* Interactive maps
* Markers
* GeoJSON
* Polygons
* Layers
* Raster tiles
* Map interaction

### OpenLayers

Feature-rich web mapping library with extensive GIS capabilities.

Relevant capabilities:

* Vector layers
* Raster layers
* GeoJSON
* Polygons
* Feature interaction
* Vector tiles
* Projection handling
* Layer management

### MapLibre GL JS

WebGL-based web mapping library focused on vector-map rendering.

Relevant capabilities:

* WebGL rendering
* Vector tiles
* GeoJSON sources
* Symbols
* Polygons
* Style-based rendering
* Layer management
* Map interaction

The benchmark must not assume that one candidate is superior before measurement.

---

## 4. Benchmark Objective

The benchmark answers:

> How do Leaflet, OpenLayers, and MapLibre GL JS behave under the geographic workloads required by the Resource Readiness for Disaster Response application?

The benchmark should provide evidence for the technology-selection process.

The goal is not to determine which library is universally better.

The goal is to determine how each candidate behaves under the project's specific workload and constraints.

---

## 5. Core Workloads

The application requires support for:

* Point/marker rendering
* GeoJSON rendering
* Polygon rendering
* Multiple map layers
* Large numbers of geographic features
* Pan and zoom
* Feature interaction
* Filtering-related map updates
* Responsive map interaction

The benchmark should prioritize these workloads.

---

## 6. Benchmark Scenarios

The current scenario set is:

| ID  | Scenario         | Purpose                                        |
| --- | ---------------- | ---------------------------------------------- |
| S01 | Basic Map        | Measure baseline map initialization            |
| S02 | Point Features   | Evaluate point/marker rendering                |
| S03 | GeoJSON          | Evaluate GeoJSON source/feature rendering      |
| S04 | Polygon Features | Evaluate polygon rendering                     |
| S05 | Multiple Layers  | Evaluate multiple geographic layers            |
| S06 | Large Dataset    | Evaluate behavior at increasing feature counts |
| S07 | Map Interaction  | Evaluate pan and zoom responsiveness           |

Large-dataset measurements should use the documented feature-count levels.

Do not change scenario definitions without updating the benchmark documentation.

---

## 7. Benchmark Methodology

All candidates must be evaluated under identical conditions.

Keep constant:

* Hardware
* Operating system
* Browser
* Browser configuration
* Viewport
* Dataset
* Feature count
* Initial map center
* Initial zoom
* Scenario
* Measurement procedure

The benchmark methodology currently specifies:

```text
Warm-up runs: 3
Measured runs: 10
```

Where applicable, collect:

```text
Initialization time
Rendering time
FPS
Memory usage
Bundle size
Interaction responsiveness
```

Statistical reporting should include:

```text
Mean
Median
Minimum
Maximum
Standard deviation
```

Median should be treated as the primary summary statistic when measurement variability makes it more representative, according to the benchmark methodology.

---

## 8. Result Integrity

Benchmark data is experimental evidence.

The AI agent must never:

* Invent results.
* Estimate missing measurements and present them as measured values.
* Modify measurements to improve a candidate's result.
* Select favorable runs while silently discarding unfavorable runs.
* Change test conditions between candidates.
* Present subjective impressions as quantitative measurements.
* Claim a performance improvement without measurement evidence.

If a measurement fails:

```text
FAILED
```

is preferable to fabricated or inferred data.

Document the failure and its cause when known.

---

## 9. Architecture

The benchmark follows three major layers:

```text
┌─────────────────────────────────────────────┐
│                  React UI                   │
│                                             │
│  Benchmark Controls / Metrics / Status     │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│              Benchmark Engine               │
│                                             │
│  Scenario / Timer / Metrics / Lifecycle     │
└──────────────────────┬──────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      Leaflet      OpenLayers    MapLibre
      Adapter        Adapter      Adapter
```

### UI Layer

Responsible for:

* Rendering controls
* Selecting scenarios
* Selecting candidates
* Displaying measurements
* Displaying benchmark state

### Benchmark Engine

Responsible for:

* Scenario orchestration
* Timing
* Measurement
* Run management
* Result normalization

### Map Adapters

Responsible for:

* Map initialization
* Feature rendering
* Layer creation
* Map interaction
* Cleanup

The map adapters must not own the generic benchmark measurement system.

---

## 10. Recommended Source Structure

```text
src/
├── app/
│   ├── App.tsx
│   ├── App.types.ts
│   └── App.constants.ts
│
├── components/
│   ├── benchmark-panel/
│   ├── map-container/
│   └── metric-panel/
│
├── benchmarks/
│   ├── leaflet/
│   ├── openlayers/
│   └── maplibre/
│
├── hooks/
├── utils/
├── types/
├── constants/
├── styles/
└── main.tsx
```

This structure is intentional.

Do not collapse all benchmark implementations into one large component.

---

## 11. Frontend Naming Rules

### Folders

Use:

```text
kebab-case
```

Examples:

```text
benchmark-panel/
map-container/
metric-panel/
```

### Components

Use:

```text
PascalCase.tsx
```

Examples:

```text
BenchmarkPanel.tsx
MapContainer.tsx
MetricPanel.tsx
```

### Default TypeScript Files

Use:

```text
camelCase.ts
```

Examples:

```text
benchmarkTimer.ts
featureGenerator.ts
performanceMetrics.ts
```

### Types

Use:

```text
*.types.ts
```

Examples:

```text
benchmark.types.ts
mapFeature.types.ts
```

Interfaces and types inside the file use `PascalCase`.

### Constants

Use:

```text
*.constants.ts
```

File names use camelCase.

Exported constant values use:

```text
SCREAMING_SNAKE_CASE
```

### Hooks

Use:

```text
useCamelCase.ts
```

### Tests

Tests must be colocated:

```text
BenchmarkPanel.tsx
BenchmarkPanel.test.tsx
```

Do not create:

```text
__tests__/
```

---

## 12. Component Encapsulation

A component's root file is its public API.

For example:

```text
components/
└── benchmark-panel/
    ├── BenchmarkPanel.tsx
    ├── BenchmarkPanel.types.ts
    ├── BenchmarkPanel.constants.ts
    ├── BenchmarkPanel.utils.ts
    └── useBenchmarkPanel.ts
```

Other components should interact with:

```text
BenchmarkPanel.tsx
```

rather than directly importing:

```text
BenchmarkPanel.types.ts
BenchmarkPanel.constants.ts
BenchmarkPanel.utils.ts
useBenchmarkPanel.ts
```

If an internal module becomes genuinely reusable across components, promote it to an appropriate shared directory:

```text
types/
hooks/
utils/
constants/
```

Do not prematurely create shared abstractions.

---

## 13. React Design Pattern

Prefer:

```text
Container
    ↓
Hook / Logic
    ↓
Presentational Component
```

Use custom hooks for:

* Side effects
* State management
* Derived state
* Reusable component logic

Presentational components should primarily handle rendering.

Container/logic components should handle:

* Data fetching
* Benchmark state
* Store integration
* Hook consumption

Do not place complex business or benchmark logic directly into JSX.

---

## 14. Benchmark Implementation Pattern

Each library should have an isolated implementation.

Conceptually:

```text
benchmarks/
├── leaflet/
│   └── LeafletBenchmark.ts
│
├── openlayers/
│   └── OpenLayersBenchmark.ts
│
└── maplibre/
    └── MapLibreBenchmark.ts
```

Where operations are conceptually equivalent, expose a common abstraction.

The abstraction should be driven by actual benchmark requirements.

Do not introduce an abstraction merely because three classes exist.

---

## 15. Data Generation

Synthetic geographic data may be generated for controlled benchmark scenarios.

The generated data must be deterministic where reproducibility is required.

Feature generation should be independent from the map library being tested.

For example:

```text
featureGenerator
        │
        ├── Leaflet
        ├── OpenLayers
        └── MapLibre
```

The same logical dataset must be supplied to all candidates.

Do not generate different datasets for different libraries.

---

## 16. Performance Measurement

Measurement utilities should be independent from the map-library adapters.

For example:

```text
utils/
├── benchmarkTimer.ts
└── performanceMetrics.ts
```

The benchmark engine should coordinate measurement.

Avoid implementing separate FPS or timing logic inside:

```text
leaflet/
openlayers/
maplibre/
```

unless the library requires a specific instrumentation mechanism.

---

## 17. Dependencies

Keep the benchmark dependency footprint minimal.

Required categories:

```text
React
TypeScript
Rspack
Leaflet
OpenLayers
MapLibre GL JS
```

Avoid adding unrelated dependencies unless there is a concrete technical requirement.

Do not add:

* UI component libraries
* CSS frameworks
* State-management libraries
* Routing libraries
* Utility frameworks

without documenting why they are necessary.

---

## 18. Documentation Hierarchy

Use the documentation directory as the benchmark knowledge base:

```text
docs/
├── PROJECT_CONTEXT.md
├── BENCHMARK_SCOPE.md
├── BENCHMARK_CRITERIA.md
├── BENCHMARK_SCENARIOS.md
├── BENCHMARK_METHODOLOGY.md
├── BENCHMARK_ENVIRONMENT.md
├── TECHNOLOGY_CANDIDATES.md
├── BENCHMARK_RESULTS.md
├── TECHNOLOGY_SELECTION.md
└── DECISION_RECORD.md
```

Use the appropriate document for the appropriate decision.

Do not put experimental measurements into `TECHNOLOGY_SELECTION.md` without first recording them in `BENCHMARK_RESULTS.md`.

Do not modify methodology merely to accommodate an implementation result.

---

## 19. Decision-Making Principles

Technical decisions must be based on:

1. Project requirements
2. Benchmark evidence
3. Reproducibility
4. Maintainability
5. Technical constraints
6. Documented trade-offs

Do not base technology selection solely on:

* Popularity
* Personal familiarity
* GitHub stars
* Subjective preference
* Assumed performance
* Marketing claims

External information may provide context, but project-specific benchmark measurements should be clearly distinguished from external claims.

---

## 20. Agent Workflow

Before making a significant change:

### Step 1 — Understand

Read:

```text
PROJECT_CONTEXT.md
BENCHMARK_SCOPE.md
```

and the relevant specialized document.

### Step 2 — Plan

Identify:

* Affected files
* Architecture boundary
* Benchmark scenario
* Expected behavior
* Validation requirements

### Step 3 — Implement

Make the smallest change that satisfies the requirement.

### Step 4 — Validate

Run the appropriate:

```bash
npm run build
npm test
```

and execute the affected benchmark when applicable.

### Step 5 — Document

Update relevant documentation if the implementation changes:

* Scope
* Methodology
* Environment
* Results
* Architecture
* Technology selection
* Decisions

### Step 6 — Report

The agent should clearly state:

* What changed
* Why it changed
* Files affected
* Validation performed
* Any unresolved issue

---

## 21. Prohibited Agent Behavior

The agent must not:

* Rewrite unrelated code.
* Delete benchmark evidence.
* Fabricate benchmark results.
* Change benchmark conditions silently.
* Introduce unnecessary dependencies.
* Ignore documented project constraints.
* Override mandatory React + TypeScript requirements.
* Replace Rspack without documenting the architectural reason.
* Create hidden test directories against project conventions.
* Import another component's private derivative files directly.
* Treat an unverified assumption as a measured fact.

---

## 22. Definition of Done

A benchmark implementation is considered complete only when:

* The implementation follows the documented architecture.
* TypeScript compilation succeeds.
* Production build succeeds.
* Tests pass where applicable.
* The benchmark scenario executes successfully.
* Measurements follow the documented methodology.
* Results are recorded without modification or fabrication.
* Relevant documentation is updated.
* The implementation does not introduce unnecessary dependencies.
* Existing candidates remain independently executable.

---

## 23. Agent Priority

When instructions conflict, use this priority:

```text
1. Mandatory project requirements
2. Benchmark methodology
3. Benchmark scope and scenarios
4. Architecture and engineering conventions
5. AI-agent instructions
6. Implementation convenience
```

Do not sacrifice benchmark validity for implementation convenience.
