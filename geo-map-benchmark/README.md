# geo-map-benchmark

A standalone benchmark that compares **Leaflet**, **OpenLayers**, and
**MapLibre GL JS** against the map workloads the main
[GeoResponse](../README.md) application needs, to select the library
`georesponse-fe` uses.

It is not part of the running GeoResponse application. It is the evidence
behind one of its technology decisions; the application consumes only the
result (MapLibre GL JS), isolated behind a Map Adapter.

## Why this exists

GeoResponse displays disaster-response resources (vehicles, facilities,
equipment, IoT devices, potentially in large numbers) on an interactive
map. Map rendering is a core workload where the library choice can
materially affect user experience, so instead of choosing by familiarity
or popularity, this project measured the candidates under identical
conditions across seven scenarios: basic map initialization, points,
GeoJSON, polygons, multiple layers, increasing feature counts (up to 10,000
features), and pan/zoom interaction, recording timing, FPS, memory, and
bundle size.

Scope and scenarios: [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md),
[`docs/BENCHMARK_SCOPE.md`](docs/BENCHMARK_SCOPE.md), and
[`docs/BENCHMARK_SCENARIOS.md`](docs/BENCHMARK_SCENARIOS.md).

## Running the benchmark

The benchmark is a React + TypeScript app built with Rspack.

```sh
npm install
npm run dev               # interactive benchmark app with hot reload
npm test                  # unit tests, then component tests
npm run test:unit         # node --test, plain unit tests
npm run test:components   # Vitest + React Testing Library
npm run typecheck
npm run build             # runs the type check first
```

In the app, select a scenario and a candidate library, run it, and view the
collected measurements. The automated, headless run that produced the
recorded results (`scripts/runBenchmarks.mjs`) is described in
[`docs/DECISION_RECORD.md`](docs/DECISION_RECORD.md) section 5.

## Project structure

```text
geo-map-benchmark/
├── src/
│   ├── app/            # App shell
│   ├── components/     # Benchmark controls, map container, metric panel
│   ├── engine/         # Benchmark Engine: timing, measurement, lifecycle
│   ├── benchmarks/     # One isolated adapter per candidate
│   │   ├── leaflet/
│   │   ├── openlayers/
│   │   └── maplibre/
│   ├── hooks/, utils/, types/, constants/, styles/
│   ├── harness.ts      # Headless entry used by the automated runner
│   └── main.tsx
├── scripts/            # Automated benchmark runners
├── benchmarks/results/ # Raw per-run measurements (JSON)
├── docs/               # Scope, methodology, results, decision record
├── AGENT.md            # AI-agent instructions for this sub-project
├── CLAUDE.md           # Claude Code entry point (imports AGENT.md)
└── package.json
```

The Benchmark Engine stays generic; all library-specific code lives in the
adapters under `src/benchmarks/`.

## Documentation

| Document | Covers |
| --- | --- |
| [`PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) | Target application and requirements |
| [`BENCHMARK_SCOPE.md`](docs/BENCHMARK_SCOPE.md) | What is and is not benchmarked |
| [`BENCHMARK_CRITERIA.md`](docs/BENCHMARK_CRITERIA.md) | Evaluation criteria and relevance |
| [`BENCHMARK_SCENARIOS.md`](docs/BENCHMARK_SCENARIOS.md) | Scenarios S01 to S07 |
| [`BENCHMARK_METHODOLOGY.md`](docs/BENCHMARK_METHODOLOGY.md) | Measurement procedure and statistics |
| [`BENCHMARK_ENVIRONMENT.md`](docs/BENCHMARK_ENVIRONMENT.md) | Hardware, software, and library versions |
| [`TECHNOLOGY_CANDIDATES.md`](docs/TECHNOLOGY_CANDIDATES.md) | The three candidate libraries |
| [`BENCHMARK_RESULTS.md`](docs/BENCHMARK_RESULTS.md) | Measured results |
| [`TECHNOLOGY_SELECTION.md`](docs/TECHNOLOGY_SELECTION.md) | Selection reasoning against the evidence |
| [`DECISION_RECORD.md`](docs/DECISION_RECORD.md) | Implementation and methodology decisions |

## Results and decision

**Outcome: MapLibre GL JS.** The deciding factor was rendering
scalability: in the large-feature-count scenario, MapLibre stayed
essentially flat from 100 to 10,000 features while Leaflet and OpenLayers
both degraded significantly (OpenLayers also showed a large, reproducible
outlier at 10,000 features). MapLibre also led point, GeoJSON, polygon, and
multi-layer rendering. The trade-offs are real: Leaflet initializes faster
and ships a far smaller bundle. Both are covered in
[`docs/TECHNOLOGY_SELECTION.md`](docs/TECHNOLOGY_SELECTION.md).

`georesponse-fe` builds on this result, integrating MapLibre GL JS through
a Map Adapter so the rest of the application is not coupled to its API. See
the main
[`docs/05_engineering/TECHNOLOGY_SELECTION.md`](../docs/05_engineering/TECHNOLOGY_SELECTION.md)
for how the decision is reflected in the application's technology choices.

## Working on this sub-project

Before modifying the benchmark itself, read [`AGENT.md`](AGENT.md).
Its most important rule is benchmark integrity: measurements must never be
fabricated, adjusted to favor a candidate, or compared under inconsistent
conditions.
