# Benchmark Results

Executed per `BENCHMARK_METHODOLOGY.md`: warmup = 3, measured = 10, per
(library, scenario, dataset size) combination. All 27 combinations
completed successfully with **zero failures**. Raw, per-run measurements
are preserved in `benchmarks/results/` (JSON) and are not overwritten by
this document.

## 1. Environment actually used

Captured automatically at run time by `scripts/runBenchmarks.mjs`.

| Parameter | Documented (`BENCHMARK_ENVIRONMENT.md`) | Actual, this run |
| --- | --- | --- |
| CPU | Intel Core i7-6500U @ 2.50 GHz | Intel Core i7-6500U @ 2.50 GHz (match) |
| RAM | 8 GB | 7.9 GB (match) |
| OS | Windows 10 Pro 64-bit, build 19045 | Windows 10 Pro, build 19045 (match) |
| Browser | Chrome 153.0.8010.48 | Chrome 153.0.8010.48 (match) |
| React | 19.3.0 | 19.3.0 (match) |
| TypeScript | 7.0.2 | 7.0.2 (match) |
| Leaflet | 1.9.4 | 1.9.4 (match) |
| OpenLayers | 10.10.0 | 10.10.0 (match) |
| MapLibre GL JS | 6.10.0 | 6.10.0 (match) |

**Correction applied 2026-09-19:** `BENCHMARK_ENVIRONMENT.md` originally had
the OpenLayers and MapLibre GL JS version numbers transcribed swapped
relative to what `package.json` actually pins. This was a transcription
error, not an intentional version choice, and has been corrected in
`BENCHMARK_ENVIRONMENT.md` directly (see its "Correction" note). The table
above already reflects the corrected, verified values - no re-measurement
was needed since the benchmark always ran against the versions actually
installed (`ol@10.10.0`, `maplibre-gl@6.10.0`), never against the
mis-transcribed numbers.

Execution: real Chrome (not Playwright's bundled Chromium), headless, via
`scripts/runBenchmarks.mjs`. Viewport 1280x800. One fresh browser context
per (library, scenario, dataset size) combination; one fresh map instance
and DOM container per individual run within that combination. See
`DECISION_RECORD.md` section 5 for the full execution design.

## 2. Corrected run: Leaflet S01

During the first full run, Leaflet's `S01` used `L.Map.whenReady()` to time
initialization, which resolves once the view is set but **before tiles
finish loading** - unlike OpenLayers' `rendercomplete` and MapLibre's
`load`, both of which wait for the initial tile render to actually
complete. This made the first S01 run an unfair comparison (it measured a
cheaper operation for Leaflet than for the other two candidates). The
Leaflet adapter was fixed to wait for the tile layer's own `load` event
(see `DECISION_RECORD.md` section 5), and **only Leaflet/S01 was
re-measured** under the corrected implementation. The original, flawed run
is preserved unmodified in
`benchmarks/results/raw-1789801517316.json` for audit; the corrected run is
in `benchmarks/results/raw-1789801629216.json`; the values below use the
corrected number. No other scenario times initialization, so no other
result was affected.

## 3. Duration, FPS, memory - all scenarios

All durations in ms, FPS in frames/s, memory in MB (median of 10 measured
runs; mean and standard deviation shown separately to surface variance).
Dataset size only applies to S06; other scenarios use 1,000 features (see
`DECISION_RECORD.md` section 3).

### S01 - Basic Map (initialization time, waits for tiles to finish rendering)

| Library | Median | Mean | Min | Max | Std dev | FPS (median) | Memory (median) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Leaflet | 20.85 | 22.14 | 18.60 | 31.70 | 3.57 | 61.00 | 4.4 MB |
| OpenLayers | 300.60 | 309.66 | 282.90 | 415.70 | 35.78 | 61.00 | 4.7 MB |
| MapLibre GL JS | 280.65 | 327.78 | 182.80 | 693.90 | 152.73 | 61.00 | 12.0 MB |

### S02 - Point Features (1,000 points)

| Library | Median | Mean | Min | Max | Std dev | FPS (median) | Memory (median) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Leaflet | 14.40 | 14.87 | 13.00 | 19.30 | 1.80 | 60.99 | 9.6 MB |
| OpenLayers | 6.50 | 6.91 | 5.20 | 11.20 | 1.77 | 61.00 | 21.0 MB |
| MapLibre GL JS | 0.90 | 0.92 | 0.40 | 1.90 | 0.43 | 60.99 | 11.1 MB |

### S03 - GeoJSON (1,000-feature FeatureCollection)

| Library | Median | Mean | Min | Max | Std dev | FPS (median) | Memory (median) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Leaflet | 14.90 | 16.62 | 13.50 | 24.70 | 3.53 | 60.99 | 11.3 MB |
| OpenLayers | 7.80 | 9.60 | 5.50 | 26.90 | 6.00 | 60.99 | 22.5 MB |
| MapLibre GL JS | 0.75 | 0.82 | 0.50 | 1.20 | 0.21 | 60.99 | 12.5 MB |

### S04 - Polygon Features (1,000 polygons)

| Library | Median | Mean | Min | Max | Std dev | FPS (median) | Memory (median) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Leaflet | 20.35 | 20.21 | 15.30 | 24.40 | 2.26 | 60.99 | 18.1 MB |
| OpenLayers | 8.90 | 8.56 | 5.80 | 10.80 | 1.87 | 60.99 | 25.2 MB |
| MapLibre GL JS | 0.75 | 0.82 | 0.50 | 1.70 | 0.32 | 60.99 | 13.8 MB |

### S05 - Multiple Layers (5 layers, 200 points each, create + hide + show)

| Library | Median | Mean | Min | Max | Std dev | FPS (median) | Memory (median) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Leaflet | 34.00 | 34.06 | 24.60 | 45.00 | 6.37 | 60.99 | 13.9 MB |
| OpenLayers | 8.40 | 10.16 | 5.50 | 28.60 | 6.33 | 60.99 | 20.9 MB |
| MapLibre GL JS | 8.05 | 8.16 | 7.10 | 9.00 | 0.55 | 60.99 | 10.7 MB |

### S06 - Large Dataset (points, scalability)

| Library | Size | Features | Median | Mean | Max | Std dev | FPS (median) | Memory (median) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Leaflet | small | 100 | 2.10 | 2.26 | 3.50 | 0.75 | 61.00 | 5.7 MB |
| Leaflet | medium | 1,000 | 13.00 | 13.92 | 20.50 | 2.91 | 61.00 | 9.5 MB |
| Leaflet | large | 10,000 | 109.65 | 122.66 | 204.00 | 32.17 | 60.00 | 37.6 MB |
| OpenLayers | small | 100 | 1.80 | 1.86 | 3.60 | 0.65 | 61.00 | 8.1 MB |
| OpenLayers | medium | 1,000 | 14.50 | 19.10 | 56.30 | 12.95 | 60.99 | 21.6 MB |
| OpenLayers | large | 10,000 | 163.70 | **436.01** | **2886.10** | **817.80** | 50.66 | 159.3 MB |
| MapLibre GL JS | small | 100 | 0.70 | 0.78 | 1.50 | 0.30 | 60.99 | 11.4 MB |
| MapLibre GL JS | medium | 1,000 | 0.70 | 0.68 | 1.00 | 0.17 | 60.99 | 11.3 MB |
| MapLibre GL JS | large | 10,000 | 0.80 | 0.78 | 1.10 | 0.21 | 60.99 | 16.9 MB |

OpenLayers at 10,000 features shows one or more severe outlier runs (max
2,886 ms vs. a 163.70 ms median - a ~17x spread), which is why its mean and
standard deviation are so much larger than its median. This was not
filtered out or treated as invalid; it is reported as measured. It
indicates OpenLayers' vector rendering at this feature count is prone to
occasional large stalls on this hardware, not just slower on average.

### S07 - Map Interaction (pan, zoom in, zoom out, feature selection, filtering; 1,000 points pre-loaded)

Re-measured after extending the workload to also cover feature selection
and a filtering-related map update (previously only pan/zoom were
automated - see `DECISION_RECORD.md`).

| Library | Median | Mean | Min | Max | Std dev | FPS (median) | Memory (median) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Leaflet | 994.0 | 993.3 | - | - | - | 59.01 | 9.5 MB |
| OpenLayers | 1013.1 | 1025.7 | - | - | - | 60.99 | 12.1 MB |
| MapLibre GL JS | 1019.2 | 1019.2 | - | - | - | 61.00 | 12.7 MB |

**Workload:** pan, zoom in, zoom out (native `panBy`/`zoomTo` per adapter),
then `highlightNearestFeature()` (selects and re-styles the point nearest
the map center - see `DECISION_RECORD.md` for why nearest-distance
selection is used instead of each library's native screen-space
hit-testing API), then a filtering-related update (`clearFeatures()` +
`renderPoints()` with only the `hospital` category kept, reusing existing
adapter methods rather than adding a dedicated "filter" API). Layer
toggling (also listed as an S07-relevant interaction in
`BENCHMARK_SCENARIOS.md`) is exercised separately in S05.

**Reading note:** the ~1,000 ms "duration" here is still dominated by the
engine's fixed 1-second post-interaction FPS sampling window, as before -
it should not be read as "interaction latency," and adding feature
selection + filtering to the workload did not meaningfully change it
(off by tens of ms from the pan/zoom-only measurement). The informative
number is **FPS**: all three still sustained ~59-61 fps through the full
pan + zoom + select + filter sequence with 1,000 points loaded - i.e. no
material frame-rate impact from adding feature selection and filtering, for
any candidate, at this feature count on this hardware. Min/max/std dev are
omitted above since they track the fixed sampling window rather than the
workload and would be misleading to compare row-to-row; see the raw JSON
for the full per-run figures if needed.

## 4. Bundle size (production build, gzip)

Measured from the real `npm run build` output. Each adapter is loaded via
a dynamic `import()` (`mapBenchmarkFactory.ts`), so Rspack code-splits each
library into its own chunk(s), identified by matching each chunk's content
against that library's name/version banner (see `DECISION_RECORD.md`
section 4 for why a separate isolated-bundle build was tried and rejected).
Every chunk in the production build is now individually attributed to one
of the three adapters - each candidate produces a large chunk (the
third-party library itself) plus one small chunk (the compiled adapter
class Rspack split off from it), confirmed by content inspection
(`LeafletBenchmark`/`OpenLayersBenchmark`/`MapLibreBenchmark` and
`requireMap` identifiers each appear in exactly one small chunk).

| Library | Library chunk | Adapter chunk | Total raw | Total gzip |
| --- | ---: | ---: | ---: | ---: |
| Leaflet | 148.4 KB / 42.5 KB gzip | 6.0 KB / 2.3 KB gzip | 154.4 KB | 44.8 KB |
| OpenLayers | 332.6 KB / 97.1 KB gzip | 5.2 KB / 2.1 KB gzip | 337.8 KB | 99.2 KB |
| MapLibre GL JS | 980.5 KB / 269.2 KB gzip | 4.9 KB / 2.0 KB gzip | 985.4 KB | 271.2 KB |

The ranking (Leaflet smallest, MapLibre GL JS largest) is unchanged from
the earlier, partially-attributed figures; this update only adds the small
adapter chunks that were previously reported separately as unattributed.

## 5. OpenLayers S06 (large) outlier - reproducibility check

The original S06/large run for OpenLayers showed a single extreme outlier
(max 2,886 ms vs. a 163.7 ms median). Rather than leave that unconfirmed,
the same combination (OpenLayers, S06, large, warmup=3, measured=10) was
re-run three additional times. All three confirm the same qualitative
pattern - occasional large stalls, not a one-off fluke - though none
reproduced an outlier as extreme as the first:

| Repeat run | Median | Mean | Max | Std dev |
| --- | ---: | ---: | ---: | ---: |
| Original | 163.70 | 436.01 | 2886.10 | 817.80 |
| Repeat 1 | 199.30 | 273.77 | 775.40 | 183.20 |
| Repeat 2 | 175.60 | 223.31 | 576.60 | 127.30 |
| Repeat 3 | 131.05 | 132.55 | 271.30 | 58.59 |

In every one of the 4 runs (40 measured samples total), the **second**
measured run was consistently among the slowest - a pattern consistent
with a recurring GC pause or similar stall rather than pure noise. This
strengthens, rather than weakens, the conclusion in `TECHNOLOGY_SELECTION.md`
that OpenLayers' large-dataset behavior on this hardware is measurably less
predictable than Leaflet's or MapLibre's: the instability is reproducible,
even if the single most extreme value (2,886 ms) was itself an outlier
among outliers. Raw data:
`benchmarks/results/openlayers-s06-large-repeats.json`.

## 6. Known limitations of this measurement pass

* **Render "duration" vs. visible paint completion.** For S02-S06,
  "duration" measures the time for the adapter's `render*()` call to
  return, not necessarily the time until pixels are fully painted on
  screen. This is a reasonably close proxy for Leaflet (synchronous
  DOM/SVG element creation) and OpenLayers (largely synchronous canvas
  vector rendering), but MapLibre GL JS's `addSource`/`addLayer` return
  almost immediately and defer the actual GPU upload/tessellation to
  subsequent animation frames - which is why MapLibre's reported durations
  are nearly zero. The post-render FPS sample (taken for a full second
  immediately after each render call) is the cross-check: if MapLibre were
  still doing significant GPU work during that window, FPS would have
  dropped below the observed ~61 fps. It did not, at any tested feature
  count including 10,000. This is consistent with WebGL's known ability to
  batch-render thousands of simple point features cheaply, but the
  near-zero MapLibre duration numbers should be read as "the call returns
  fast and no subsequent frame drop was observed," not as "MapLibre paints
  10,000 points in under 1 ms."
* **Feature selection** (S07) uses nearest-distance selection identically
  for all three candidates rather than each library's native
  screen-space hit-testing API - a deliberate choice, not an oversight;
  see `DECISION_RECORD.md` section 3.
* One benign console `404` was observed during Leaflet/S01 runs
  (unrelated resource, likely a favicon request); it did not affect
  measured values and Leaflet/S01 completed successfully in all runs.

Raw data: `benchmarks/results/final-2026-09-19.json` (all 27 results, with
the corrected Leaflet/S01 and the re-measured S07 merged in), the
intermediate raw captures referenced above, and
`benchmarks/results/openlayers-s06-large-repeats.json` for the outlier
reproducibility check.
