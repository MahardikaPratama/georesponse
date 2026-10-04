# AI Agent Instructions: Geo Map Benchmark

Instructions for AI agents working in `geo-map-benchmark/`. `CLAUDE.md`
imports this file, so this is the single full version for every tool.
Section numbers are stable because source comments and docs cite them.

## 1. Project Identity

- **Project:** Resource Readiness for Disaster Response
- **Repository:** GeoResponse
- **Module:** Geo Map Benchmark
- **Purpose:** evaluate web map libraries for the disaster-response resource
  visualization system and support the selection of its map technology.

The final application visualizes and interacts with geographic information
such as hospitals, shelters, warehouses, emergency posts, response units,
disaster-affected areas, and other operational resources.

## 2. Mandatory Technology Constraints

The final application must use:

```text
Frontend → React + TypeScript
Backend  → Go
```

These are fixed. Do not replace React + TypeScript with another frontend
framework. The benchmark covers only the frontend mapping layer and is built
with:

```text
React
TypeScript
Rspack
npm
```

## 3. Benchmark Candidates

| Library        | Approach                                               |
| -------------- | ------------------------------------------------------ |
| Leaflet        | Lightweight 2D mapping (markers, GeoJSON, raster)      |
| OpenLayers     | Feature-rich GIS (vector/raster layers, projections)   |
| MapLibre GL JS | WebGL vector-map rendering (style-based, vector tiles) |

Capabilities in detail: `docs/TECHNOLOGY_CANDIDATES.md`. Do not assume or
describe any candidate as superior before measurements support it.

## 4. Benchmark Objective

> How do Leaflet, OpenLayers, and MapLibre GL JS behave under the geographic
> workloads required by the Resource Readiness for Disaster Response
> application?

The goal is evidence for this project's workload and constraints, not a
verdict on which library is universally better.

## 5. Core Workloads

The application requires:

- Point/marker rendering
- GeoJSON rendering
- Polygon rendering
- Multiple map layers
- Large numbers of geographic features
- Pan and zoom
- Feature interaction
- Filtering-related map updates
- Responsive map interaction

The benchmark prioritizes these workloads.

## 6. Benchmark Scenarios

| ID  | Scenario         | Purpose                                        |
| --- | ---------------- | ---------------------------------------------- |
| S01 | Basic Map        | Measure baseline map initialization            |
| S02 | Point Features   | Evaluate point/marker rendering                |
| S03 | GeoJSON          | Evaluate GeoJSON source/feature rendering      |
| S04 | Polygon Features | Evaluate polygon rendering                     |
| S05 | Multiple Layers  | Evaluate multiple geographic layers            |
| S06 | Large Dataset    | Evaluate behavior at increasing feature counts |
| S07 | Map Interaction  | Evaluate pan and zoom responsiveness           |

Full definitions, including the S06 feature-count levels, are in
`docs/BENCHMARK_SCENARIOS.md`. Do not add, remove, or change a scenario
without updating that document first.

## 7. Benchmark Methodology

Evaluate every candidate under identical conditions. Keep constant:
hardware, operating system, browser, browser configuration, viewport,
dataset, feature count, initial map center, initial zoom, scenario, and
measurement procedure.

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

Report:

```text
Mean
Median
Minimum
Maximum
Standard deviation
```

Treat the median as the primary summary statistic when variability makes it
more representative. Retain raw measurements so aggregates can be verified.
Full procedure: `docs/BENCHMARK_METHODOLOGY.md`.

## 8. Result Integrity

Benchmark data is experimental evidence. Never:

- Invent results.
- Estimate missing measurements and present them as measured values.
- Modify measurements to improve a candidate's result.
- Select favorable runs or remove unfavorable ones without documenting why.
- Change test conditions between candidates.
- Present subjective impressions as quantitative measurements.
- Claim a performance improvement without measurement evidence.
- Select a library before completing the required measurements.

If a measurement fails, record:

```text
FAILED
```

rather than fabricated or inferred data, and document the cause when known.
Document any intentional deviation from the standard conditions.

## 9. Architecture

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

| Layer            | Responsible for                                                      |
| ---------------- | -------------------------------------------------------------------- |
| React UI         | Controls, scenario/candidate selection, measurements, run state      |
| Benchmark Engine | Scenario orchestration, timing, measurement, runs, normalization     |
| Map adapters     | Map initialization, features, layers, interaction, cleanup           |

Map adapters must not own the generic measurement system.

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

Keep this structure. Do not collapse the benchmark implementations into one
large component.

## 11. Frontend Naming Rules

| Item                   | Convention                        | Example                        |
| ---------------------- | --------------------------------- | ------------------------------ |
| Folders                | `kebab-case`                      | `benchmark-panel/`             |
| Components             | `PascalCase.tsx`                  | `BenchmarkPanel.tsx`           |
| Other TypeScript files | `camelCase.ts`                    | `featureGenerator.ts`          |
| Types                  | `*.types.ts`                      | `benchmark.types.ts`           |
| Constants              | `*.constants.ts` (camelCase name) | `benchmarkConfig.constants.ts` |
| Component utilities    | `*.utils.ts`                      | `BenchmarkPanel.utils.ts`      |
| Hooks                  | `useCamelCase.ts`                 | `useBenchmark.ts`              |

Interfaces and types use `PascalCase`. Exported constant values use
`SCREAMING_SNAKE_CASE`.

Tests are colocated with the file they test (`BenchmarkPanel.tsx` next to
`BenchmarkPanel.test.tsx`). Do not create `__tests__/` directories.

## 12. Component Encapsulation

A component's root file is its public API:

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

Other components interact with `BenchmarkPanel.tsx` only. Do not import
another component's `.types.ts`, `.constants.ts`, `.utils.ts`, or hook
directly:

```ts
// Bad
import { BenchmarkPanelProps } from
  "../benchmark-panel/BenchmarkPanel.types";
```

If an internal module becomes genuinely reusable, promote it to the shared
`types/`, `hooks/`, `utils/`, or `constants/` directory. Do not create
shared abstractions prematurely.

## 13. React Design Pattern

Prefer functional components, explicit TypeScript types, and small, focused
components arranged as:

```text
Container
    ↓
Hook / Logic
    ↓
Presentational Component
```

- Custom hooks handle side effects, state, derived state, and reusable logic.
- Presentational components handle rendering.
- Container/logic components handle data fetching, benchmark state, and hook
  consumption.

Keep benchmark orchestration, performance measurement, and map-library code
out of JSX.

## 14. Benchmark Implementation Pattern

Each library has an isolated implementation:

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

Where operations are conceptually equivalent, expose a common interface
(the implemented one is `MapBenchmark` in `src/types/benchmark.types.ts`).
Illustrative shape:

```ts
interface MapBenchmark {
  initialize(): void;
  renderFeatures(): void;
  clear(): void;
  destroy(): void;
}
```

Size the interface to actual benchmark requirements, not to the fact that
three classes exist. Do not spread library-specific conditional logic
through unrelated components.

## 15. Data Generation

Synthetic geographic data may be generated for controlled scenarios. It must
be deterministic where reproducibility requires it, and generated
independently of the library under test:

```text
featureGenerator
        │
        ├── Leaflet
        ├── OpenLayers
        └── MapLibre
```

Supply the same logical dataset to all candidates. Never generate different
datasets per library.

## 16. Performance Measurement

Measurement utilities (for example `utils/benchmarkTimer.ts`,
`utils/performanceMetrics.ts`) are independent of the map adapters, and the
benchmark engine coordinates measurement. Do not implement separate FPS or
timing logic inside `leaflet/`, `openlayers/`, or `maplibre/` unless a
library requires a specific instrumentation mechanism.

## 17. Dependencies

Keep the dependency footprint minimal. Required:

```text
React
TypeScript
Rspack
Leaflet
OpenLayers
MapLibre GL JS
```

Before adding a dependency, confirm that it is required, that the existing
stack cannot cover it, and that it adds no benchmark overhead. Do not add UI
component libraries, CSS frameworks, state-management libraries, routing
libraries, or utility frameworks without documenting why they are necessary.

## 18. Documentation Hierarchy

The `docs/` directory is the benchmark knowledge base and takes precedence
over assumptions:

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

- Record measurements in `BENCHMARK_RESULTS.md` before using them in
  `TECHNOLOGY_SELECTION.md`.
- Keep implementation documentation and measured results separate.
- Never overwrite measured results without preserving the original evidence.
- Never modify the methodology to accommodate an implementation result.
- If the documentation is ambiguous, raise the ambiguity before making a
  significant architectural change.

## 19. Decision-Making Principles

Base technical decisions on:

1. Project requirements
2. Benchmark evidence
3. Reproducibility
4. Maintainability
5. Technical constraints
6. Documented trade-offs

Not on popularity, personal familiarity, GitHub stars, subjective
preference, assumed performance, or marketing claims. External information
may give context, but keep it clearly separate from project-specific
measurements.

## 20. Agent Workflow

1. **Understand.** Read `PROJECT_CONTEXT.md`, `BENCHMARK_SCOPE.md`, the
   relevant specialized document, and the existing implementation.
2. **Plan.** Identify the affected files, architecture boundary, benchmark
   scenario, expected behavior, and validation needed.
3. **Implement.** Make the smallest change that satisfies the requirement.
   Do not rewrite working code unnecessarily.
4. **Validate.** Run:

   ```bash
   npm run build
   npm test
   ```

   For benchmark changes, run the affected benchmark and confirm that every
   affected candidate still initializes and cleans up correctly. Never claim
   a benchmark passed unless it was executed.
5. **Document.** Update the relevant docs if the change affects scope,
   methodology, scenarios, environment, candidates, measurement procedures,
   results, architecture, technology selection, or decisions.
6. **Report.** State what changed, why, which files, what validation ran,
   and any unresolved issue.

When uncertain, prefer the documented methodology over assumptions.

## 21. Prohibited Agent Behavior

Do not:

- Rewrite unrelated code.
- Delete benchmark evidence.
- Fabricate benchmark results.
- Change benchmark conditions silently.
- Introduce unnecessary dependencies.
- Ignore documented project constraints.
- Override the mandatory React + TypeScript requirement.
- Replace Rspack without documenting the architectural reason.
- Create hidden test directories against project conventions.
- Import another component's private files directly.
- Treat an unverified assumption as a measured fact.

## 22. Definition of Done

A benchmark implementation is complete only when:

- It follows the documented architecture.
- TypeScript compilation and the production build succeed.
- Tests pass where applicable.
- The benchmark scenario executes successfully.
- Measurements follow the documented methodology.
- Results are recorded without modification or fabrication.
- Relevant documentation is updated.
- No unnecessary dependencies are introduced.
- Existing candidates remain independently executable.

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

Never sacrifice benchmark validity for implementation convenience.

## 24. Code Quality

Generated or modified code must:

- Compile and pass the configured tests.
- Follow the naming conventions in section 11.
- Avoid unnecessary duplication, dead code, and unexplained magic numbers.
- Use explicit types where they improve correctness.
- Clean up map instances and event listeners, and avoid memory leaks.

Do not suppress TypeScript errors, or use `any`, without understanding and
documenting the reason.

## 25. Git Conventions

Use focused commits, for example:

```text
feat: add benchmark engine
feat: add leaflet benchmark adapter
feat: add openlayers benchmark adapter
feat: add maplibre benchmark adapter
feat: add benchmark result visualization
docs: document benchmark methodology
fix: clean up map benchmark lifecycle
```

Do not mix unrelated refactoring with benchmark implementation. Do not
commit `node_modules/`, generated build artifacts, local environment files,
secrets, or temporary benchmark output unless explicitly required.
