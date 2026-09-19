# Decision Record

This document records architectural and methodological decisions made while
building the benchmark frontend and executing the benchmark, per
`CLAUDE.md` section 15 and `AGENT.md` section 18. It is kept separate from
measured results (`BENCHMARK_RESULTS.md`) and the technology selection
(`TECHNOLOGY_SELECTION.md`).

---

## 1. Frontend foundation

* Stack: React 19 + TypeScript 7, bundled with Rspack 2, npm as the package
  manager. No UI framework, state-management library, router, or CSS
  framework was added (`AGENT.md` section 17).
* Source layout follows `AGENT.md` section 10 exactly: `app/`,
  `components/`, `benchmarks/`, `hooks/`, `utils/`, `types/`, `constants/`,
  `styles/`, plus `engine/` for the Benchmark Engine (an architectural layer
  explicitly required by section 9 but not covered by any existing folder).
* Component encapsulation, naming (`kebab-case` folders, `PascalCase`
  components, `*.types.ts` / `*.constants.ts` / `*.utils.ts`, colocated
  tests, no `__tests__`) follows `AGENT.md` section 11-12.

## 2. Benchmark Engine and adapter contract

* `src/types/benchmark.types.ts` defines a single `MapBenchmark` interface
  (`initialize`, `renderPoints`, `renderGeoJSON`, `renderPolygons`,
  `addLayer`, `setLayerVisible`, `clearFeatures`, `panBy`, `zoomTo`,
  `destroy`) implemented independently by `LeafletBenchmark`,
  `OpenLayersBenchmark`, and `MapLibreBenchmark`. This is the interface
  `AGENT.md` section 9 asks for, sized to what S01-S07 actually require -
  no scenario-specific methods were added speculatively.
* `src/engine/benchmarkEngine.ts` owns all timing, FPS sampling, memory
  snapshotting, aggregation, and warmup/measured repetition. It never
  branches on `libraryId`; all library-specific behavior stays inside the
  three adapters (`CLAUDE.md` section 7).
* Each of the 13 runs (3 warmup + 10 measured, per
  `BENCHMARK_METHODOLOGY.md` section 5) gets a **fresh map instance and a
  fresh, isolated off-screen DOM container**, then both are destroyed
  before the next run. This avoids one run's state (layers, DOM nodes, tile
  cache references) leaking into the next, so `Duration`/`FPS`/`Memory` for
  run *N* reflect only run *N*'s workload.
* Adapters are instantiated through `src/benchmarks/mapBenchmarkFactory.ts`
  via a dynamic `import()` per library. This was necessary for the bundle
  code-splitting decision below, and also means a scenario that never
  selects, say, MapLibre never pays MapLibre's module-evaluation cost.

## 3. Fairness of the workload across candidates

* **Shared basemap.** All three adapters render the *same* OSM raster tile
  source (`OSM_TILE_URL_TEMPLATE`). MapLibre GL JS is capable of much
  richer vector-tile styling, but using a vector style for MapLibre and
  raster tiles for Leaflet/OpenLayers would measure a *styling* difference,
  not an *initialization/rendering* difference, and would violate
  `BENCHMARK_METHODOLOGY.md` section 8 ("avoid library-specific
  optimizations that give one candidate an unfair advantage").
* **Shared, deterministic dataset.** `src/utils/featureGenerator.ts` uses a
  seeded PRNG (mulberry32, seed = 42) to generate point/polygon features.
  The same seed is used for every candidate, so all three render byte-for-
  byte identical coordinates or the run is not comparable.
* **Feature counts.** `BENCHMARK_SCENARIOS.md` only defines explicit
  feature-count levels (100 / 1,000 / 10,000) for S06. For S02-S05 and S07,
  which do not define a level, this implementation fixes the count at the
  "medium" level (1,000) for every candidate, documented in
  `benchmarkConfig.constants.ts`. This is an implementation decision, not a
  documented methodology change, and is applied identically to all three
  candidates.
* **S07 interaction scope.** The engine drives pan, zoom-in, zoom-out,
  feature selection, and a filtering-related update (all items in
  `BENCHMARK_SCENARIOS.md` section 9's interaction list except layer
  toggle, which is already exercised by S05). Layer toggle was not
  duplicated into S07 to avoid measuring the same operation twice.
  * **Feature selection** (`MapBenchmark.highlightNearestFeature`) is
    implemented as "find the point nearest a reference coordinate and
    apply a visible selected style," identically for all three candidates,
    **not** each library's native screen-space hit-testing API
    (`OpenLayers.getClosestFeatureToCoordinate` is in fact used for
    OpenLayers, since it is the idiomatic nearest-feature API there;
    Leaflet and MapLibre GL JS have no equivalent built-in, so both use a
    manual linear-scan nearest-distance calculation). A real screen-space
    hit test (`OpenLayers.getFeaturesAtPixel` /
    `MapLibre.queryRenderedFeatures`) was deliberately avoided as the
    *primary* measured operation because, with features scattered
    randomly, a fixed screen pixel would miss most of the time - making
    the result depend on hit-test radius/tolerance differences between
    libraries rather than on selection speed itself. This is a documented,
    deliberate implementation choice, not an oversight.
  * **Filtering** re-renders the point layer with only one category kept,
    reusing the existing `clearFeatures()` + `renderPoints()` methods
    rather than adding a dedicated filter API to `MapBenchmark` - no
    interface change was needed for this part.

## 4. Bundle size measurement

* **Rejected approach:** building each adapter as an isolated, single-file
  Rspack bundle (no code-splitting). This was attempted
  (`scripts/rspack.bundle-size.config.ts`, since removed) and produced an
  unreliable result: the MapLibre GL JS bundle came out at 0 bytes, almost
  certainly because Rspack's production tree-shaking, combined with
  `maplibre-gl`'s `sideEffects` field, eliminated code it could not prove
  was used from a bare adapter-only entry point. Rather than work around
  tree-shaking heuristics with per-package overrides that could bias the
  outcome, this approach was abandoned.
* **Approach used:** the real, production `npm run build` output. All
  three adapters are loaded via `mapBenchmarkFactory.ts`'s dynamic
  `import()`, so Rspack's default code-splitting places each library's
  code in its own chunk(s), which are only ever loaded when that library is
  selected. The gzip and raw size of each library's dominant chunk (the one
  containing that library's own identifying strings/version banner) is
  reported in `BENCHMARK_RESULTS.md`. This measures what a user's browser
  actually downloads for that candidate in the real build.

## 5. Automated, real-browser execution

* Real, automated execution is done with **Playwright driving the system's
  installed Chrome** (`channel: 'chrome'`), not Playwright's bundled
  Chromium, to match `BENCHMARK_ENVIRONMENT.md`'s "same browser" as closely
  as possible.
* Added as devDependencies: `playwright` (execution) and
  `@rspack/dev-server` (required peer dependency of `@rspack/cli`'s `dev`
  command; without it `rspack serve` fails). `@types/node` was added
  because `rspack.config.ts`, `scripts/runBenchmarks.mjs`, and the `*.test.ts`
  files run directly under Node and need Node's ambient types.
* `src/harness.ts` is a second Rspack entry (headless, no React) that runs
  exactly one scenario through the *same* `runScenario()` used by the
  interactive UI, driven by URL query params
  (`?library=&scenario=&datasetSize=`), and exposes the result on
  `window.__BENCHMARK_RESULT__`. `scripts/runBenchmarks.mjs` serves the
  production build over local HTTP, navigates to the harness once per
  (library, scenario, datasetSize) combination in a **fresh browser
  context**, and collects the result. Fresh contexts per combination avoid
  cross-library state (e.g. lingering WebGL contexts) contaminating later
  measurements.
* Headless Chrome needs an explicit software WebGL backend
  (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`)
  for MapLibre GL JS to obtain a WebGL context at all; without these flags
  MapLibre's `initialize()` would fail in headless mode on this machine.
  This flag set was validated with a smoke run (1 warmup, 1 measured run,
  S01, all three libraries) before committing to the full 27-combination,
  13-run-per-combination matrix.
* This machine's actual specs, captured automatically at run time, match
  `BENCHMARK_ENVIRONMENT.md` (Chrome 153.0.8010.48, Intel Core i7-6500U,
  ~8 GB RAM, Windows 10 Pro build 19045) - no environment deviation to
  document.

## 6. Testing

Two test runners are used, each for what it is actually good at:

* **`npm run test:unit`** runs Node's built-in test runner (`node --test
  --experimental-strip-types`) against pure-logic `*.test.ts` files
  (feature generation determinism, metric aggregation, `BenchmarkPanel`
  and `MetricPanel` pure helpers). No dependency was needed for this.
* **`npm run test:components`** runs Vitest + jsdom + `@testing-library/react`
  against the three component `*.test.tsx` files
  (`BenchmarkPanel.test.tsx`, `MapContainer.test.tsx`,
  `MetricPanel.test.tsx`). This dependency was deliberately *not* added
  during the initial foundation pass (kept as a documented gap, per
  `AGENT.md` section 17's "keep the dependency footprint minimal"), and was
  added once explicitly requested. `MapContainer`'s test mocks
  `mapBenchmarkFactory` rather than initializing real Leaflet/OpenLayers/
  MapLibre GL JS instances, since none of the three can meaningfully
  initialize in jsdom (no real Canvas/WebGL, no network tile loading) - the
  test verifies MapContainer's own contract (which library it requests,
  that it cleans up on unmount), not library rendering behavior, which is
  instead covered by the real-browser benchmark runs themselves.
* `npm test` runs both in sequence. Both suites were run and pass (14
  unit tests plus 12 component tests) as of this update.
* `vitest` was upgraded to v5 immediately after installation to clear a
  moderate-severity path-traversal advisory in `@vitest/mocker` present in
  the v3 release initially installed
  (GHSA-82fw-gwwq-j7x9); `npm audit` reports zero vulnerabilities after the
  upgrade.
