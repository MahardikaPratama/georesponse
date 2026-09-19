# Technology Selection

This selection is based on the measured evidence in `BENCHMARK_RESULTS.md`
and the project requirements in `PROJECT_CONTEXT.md` / `AGENT.md`, per the
decision-making principles in `AGENT.md` section 19. It does not introduce
new measurements or reinterpret the methodology.

## 1. Recommendation

**MapLibre GL JS**, for the primary map layer of the Resource Readiness for
Disaster Response application, on the strength of its scalability and
sustained-interaction performance - the two criteria most directly tied to
the application's stated requirement to handle "large numbers of geographic
features" (`PROJECT_CONTEXT.md` section 5-6) reliably, including under
growth. This is a **qualified** recommendation - see section 4 for where
Leaflet is measurably better and should factor into the final call, and
section 5 for what this pass did not evaluate.

## 2. How the measured evidence maps to each criterion

Criteria and relevance levels are from `BENCHMARK_CRITERIA.md` section 2 and 4.

### High relevance

| Criterion | Evidence | Reading |
| --- | --- | --- |
| Scalability (S06) | MapLibre: flat ~0.7-0.8 ms median from 100 to 10,000 points. Leaflet: 2.1 ms -> 109.7 ms median (~50x). OpenLayers: 1.8 ms -> 163.7 ms median, with a severe outlier (max 2,886 ms) at 10,000 features, **confirmed reproducible** across 3 additional repeat runs (max 271-775 ms each; see `BENCHMARK_RESULTS.md` section 5). | MapLibre scales essentially flat over this range; Leaflet degrades predictably; OpenLayers degrades and is measurably, repeatably unpredictable at 10,000 features on this hardware - not a one-off fluke. |
| Point rendering (S02) | Median: MapLibre 0.90 ms, OpenLayers 6.50 ms, Leaflet 14.40 ms. | MapLibre fastest to return, with the caveat in `BENCHMARK_RESULTS.md` section 5 about what "duration" measures for a WebGL renderer. |
| GeoJSON (S03) | Median: MapLibre 0.75 ms, OpenLayers 7.80 ms, Leaflet 14.90 ms. | Same pattern as S02. |
| Polygon rendering (S04) | Median: MapLibre 0.75 ms, OpenLayers 8.90 ms, Leaflet 20.35 ms. | Same pattern. |
| Layer management (S05) | Median: MapLibre 8.05 ms (std dev 0.55, tightest spread of the three), OpenLayers 8.40 ms, Leaflet 34.00 ms. | MapLibre and OpenLayers comparable and consistent; Leaflet notably slower to create/toggle 5 layers. |
| Feature interaction / responsiveness (S07) | All three sustain ~59-61 fps (display-limited) through pan + zoom in/out + feature selection + a filtering update, with 1,000 points loaded. | No candidate showed material dropped frames at this feature count on this hardware, including once feature selection and filtering were added to the workload - not a differentiator at this scale. |
| React + TypeScript integration | All three have official TypeScript types and integrate via the same adapter pattern with no React-specific friction found while building this benchmark. | Not differentiated by this benchmark; see `TECHNOLOGY_CANDIDATES.md` for the qualitative capability comparison. |

### Medium relevance

| Criterion | Evidence | Reading |
| --- | --- | --- |
| Tile support | All three rendered the same raster OSM tiles for S01; MapLibre additionally supports vector tiles/style-driven rendering natively (not exercised in this benchmark - see `BENCHMARK_RESULTS.md`/basemap fairness decision). | Leaflet/OpenLayers are raster/vector-layer oriented; MapLibre adds native vector-tile styling as a qualitative capability beyond what was measured. |
| Bundle size | Gzip: Leaflet 42.5 KB, OpenLayers 97.1 KB, MapLibre GL JS 269.2 KB. | Leaflet is the clear winner here - about 2.3x smaller than OpenLayers and 6.3x smaller than MapLibre (gzip). This matters for initial load on constrained connections, plausible in a disaster-response field context. |
| Memory usage | Medians cluster in the 5-38 MB range across scenarios for all three, with OpenLayers highest at large scale (S06 large: 159.3 MB vs. Leaflet 37.6 MB vs. MapLibre 16.9 MB). | At 10,000 features, MapLibre and Leaflet stayed far more memory-efficient than OpenLayers. |
| Initialization time (S01, tile-load-complete) | Leaflet 20.85 ms median - far faster than OpenLayers (300.60 ms) and MapLibre (280.65 ms, and highly variable: std dev 152.73 ms). | Leaflet's lighter DOM/img-tag tiling initializes noticeably faster than the canvas (OpenLayers) or WebGL (MapLibre) pipelines in this test. |

### Not evaluated quantitatively in this pass

Documentation quality, API complexity, and ecosystem size are qualitative
criteria per `BENCHMARK_CRITERIA.md` section 5 and are intentionally not
scored here from benchmark data; see `TECHNOLOGY_CANDIDATES.md` for the
existing qualitative comparison.

## 3. Why scalability was weighted most heavily

`PROJECT_CONTEXT.md` section 5 marks "large number of features" as **High**
relevance, and `AGENT.md` section 5 lists it among the application's core
workloads. A disaster-response resource map's feature count is
operationally unpredictable - it can grow sharply during an active
response (more units, more affected-area polygons, more status updates)
- so behavior *at the high end* (S06 "large", 10,000 features) is a more
decision-relevant signal than behavior at the "medium" (1,000-feature)
level most other scenarios were fixed at. On that specific evidence,
MapLibre is the only candidate that did not show measurable degradation
between 100 and 10,000 features.

## 4. Where Leaflet is measurably better

This is not a one-sided result, and the recommendation should not be read
as such:

* **Initialization time** (S01): Leaflet is ~13x faster to first fully-
  rendered basemap than either alternative.
* **Bundle size**: Leaflet ships ~2.3-6.3x less JavaScript (gzip) than the
  alternatives, which matters more the more constrained the deployment
  network is expected to be.
* **Simplicity**: qualitatively, Leaflet's adapter
  (`src/benchmarks/leaflet/LeafletBenchmark.ts`) required the least code
  and the fewest library-specific workarounds to implement all seven
  scenarios.

If the application's realistic feature counts stay well under ~1,000-2,000
features per view (e.g. filtered by region/status rather than showing a
whole country's resources at once), these Leaflet advantages could
reasonably outweigh MapLibre's scalability headroom, since the S06 "large"
degradation only becomes severe for OpenLayers and only becomes *visible
at all* (vs. flat) for Leaflet at the 10,000-feature level this benchmark
does not know the application will actually reach.

## 5. What this selection does not cover

* S07 now covers pan, zoom, feature selection, and a filtering-related
  update, but feature selection uses nearest-distance selection rather
  than each library's native screen-space hit-testing API, and filtering
  is a full re-render of the filtered subset rather than a native
  attribute-filter API where one exists - see `DECISION_RECORD.md` section 3.
* Real device/network conditions (mobile hardware, degraded connectivity)
  were not tested; all measurements are from one desktop-class machine on
  a wired/stable connection with unlimited local network access to the
  tile server.
* Vector-tile-specific workloads (MapLibre's most differentiated
  capability) were intentionally excluded from S01-S07 to keep the
  basemap identical and fair across candidates (`DECISION_RECORD.md`
  section 3) - so MapLibre's advantage in this report is understated
  relative to a benchmark that let it use vector tiles.

## 6. Recommendation for next steps

1. Confirm the application's realistic per-view feature-count ceiling with
   product stakeholders; if it is expected to regularly exceed ~2,000-
   5,000 features per view, MapLibre's scalability advantage should
   dominate the decision.
2. If bundle size / initial load on constrained connections is a hard
   requirement (e.g. field devices on cellular networks), weigh that
   explicitly against scalability - this is a genuine trade-off in the
   data, not a tie-breaker either candidate wins outright.
3. ~~Re-run S06 "large" for OpenLayers to confirm the outlier~~ - **done**:
   3 additional repeat runs confirm the instability is reproducible, not a
   one-off (`BENCHMARK_RESULTS.md` section 5).
4. ~~Extend S07 to cover feature-selection and filtering~~ - **done**: S07
   now measures pan, zoom, feature selection, and a filtering-related
   update for all three candidates, with no material FPS impact observed
   from the additions (`BENCHMARK_RESULTS.md` S07 section).
5. Before final commitment, consider adding native screen-space
   hit-testing for feature selection (`getFeaturesAtPixel` /
   `queryRenderedFeatures`) as a second S07 variant alongside the current
   nearest-distance selection, since the two approaches could show
   different relative performance.
