# geo-map-benchmark

A standalone benchmark that compares **Leaflet**, **OpenLayers**, and
**MapLibre GL JS** against the specific map workloads the main
[GeoResponse](../README.md) application needs, in order to select which
library `georesponse-fe` should use.

This is not part of the running GeoResponse application — it's the evidence
that informed one of its technology decisions. The application only consumes
the *result* (MapLibre GL JS), isolated behind a Map Adapter.

## Why this exists

GeoResponse displays disaster-response resources (vehicles, facilities,
equipment, IoT devices — potentially large numbers of them) on an interactive
map. Map rendering is a core workload where implementation choice can
materially affect user experience, so instead of picking a map library by
familiarity or popularity, this project measures point/marker rendering,
GeoJSON rendering, polygon rendering, multiple layers, increasing feature
counts (up to 10,000 features), pan/zoom interaction, memory usage, frame
rate, and bundle size — under identical conditions for all three candidates.

See [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) and
[`docs/BENCHMARK_SCENARIOS.md`](docs/BENCHMARK_SCENARIOS.md) for the full
scope and scenario definitions.

## Running the benchmark

This is a React + TypeScript app built with Rspack, using its standard npm
scripts:

```sh
npm install
```

Start the interactive benchmark app (dev server with hot reload):

```sh
npm run dev
```

Run the full test suite (unit tests, then component tests):

```sh
npm test
```

Or individually:

```sh
npm run test:unit         # node --test, plain unit tests
npm run test:components   # Vitest + React Testing Library, component tests
```

Type-check and build for production (build also runs the type check first):

```sh
npm run typecheck
npm run build
```

The app itself lets you select a scenario and a candidate library, run it,
and view the collected measurements.

## Project structure

```text
geo-map-benchmark/
├── src/
│   ├── app/            # App shell
│   ├── components/     # Benchmark controls, map container, metric panel
│   ├── benchmarks/      # One isolated implementation per candidate
│   │   ├── leaflet/
│   │   ├── openlayers/
│   │   └── maplibre/
│   ├── hooks/, utils/, types/, constants/
│   └── main.tsx
├── docs/                # Benchmark methodology, scope, results, decision record
├── AGENT.md / CLAUDE.md  # AI-agent instructions scoped to this sub-project
└── package.json
```

Each map library has its own isolated adapter under `src/benchmarks/`; the
benchmark engine (timing, measurement collection, scenario orchestration)
stays generic and independent of any single library.

## Results and decision

- Methodology and raw/aggregated measurements:
  [`docs/BENCHMARK_RESULTS.md`](docs/BENCHMARK_RESULTS.md)
- Technology selection reasoning, evaluated against the measured evidence:
  [`docs/TECHNOLOGY_SELECTION.md`](docs/TECHNOLOGY_SELECTION.md)
- Architectural and technical decisions made along the way (e.g. what the
  benchmark deliberately did and didn't cover):
  [`docs/DECISION_RECORD.md`](docs/DECISION_RECORD.md)

**Outcome: MapLibre GL JS.** The deciding factor was rendering scalability —
in the large-feature-count scenario, MapLibre stayed essentially flat from
100 to 10,000 features while Leaflet and OpenLayers both degraded
significantly (OpenLayers also showed a large, reproducible outlier at
10,000 features). MapLibre also led point, GeoJSON, polygon, and
multi-layer rendering. This came with real trade-offs — Leaflet initializes
faster and ships a far smaller bundle — documented in full in
`docs/TECHNOLOGY_SELECTION.md`.

This result is what `georesponse-fe` builds on: MapLibre GL JS, integrated
through a Map Adapter so the rest of the application isn't coupled to its
specific API. See the main
[`docs/05_engineering/TECHNOLOGY_SELECTION.md`](../docs/05_engineering/TECHNOLOGY_SELECTION.md)
for how that decision is reflected in the application's own technology
choices.

## Working on this sub-project

If you're modifying the benchmark itself (not just reading its results), see
[`AGENT.md`](AGENT.md) and [`CLAUDE.md`](CLAUDE.md) for the rules that apply
here specifically — most importantly, benchmark integrity: measurements must
never be fabricated, adjusted to favor a candidate, or compared under
inconsistent conditions.
