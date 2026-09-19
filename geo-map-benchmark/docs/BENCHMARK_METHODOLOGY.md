# Benchmark Methodology

## 1. Objective

Measure and compare the performance and technical characteristics of candidate map libraries under standardized, project-relevant workloads.

The benchmark must be reproducible and use equivalent conditions for all candidates.

---

## 2. Candidates

The initial candidates are:

* Leaflet
* OpenLayers
* MapLibre GL JS

All candidates must implement the same benchmark scenarios defined in `BENCHMARK_SCENARIOS.md`.

---

## 3. Experimental Conditions

Keep the following conditions consistent across all candidates:

| Parameter             | Rule                     |
| --------------------- | ------------------------ |
| Hardware              | Same machine             |
| Operating system      | Same OS                  |
| Browser               | Same browser and version |
| Viewport              | Same dimensions          |
| Dataset               | Same dataset             |
| Feature count         | Same                     |
| Map center            | Same                     |
| Initial zoom          | Same                     |
| Test scenario         | Same                     |
| Measurement procedure | Same                     |

Library versions must be recorded for every benchmark run.

---

## 4. Benchmark Execution

Each scenario should follow this sequence:

```text
1. Start benchmark
2. Initialize application
3. Warm up the application
4. Execute the scenario
5. Record measurements
6. Repeat the test
7. Aggregate results
```

A warm-up phase should be performed before collecting measurements to reduce the effect of initial browser/runtime overhead.

---

## 5. Repetitions

Each benchmark scenario should be executed multiple times.

Recommended configuration:

* Warm-up runs: **3**
* Measured runs: **10**

The number of repetitions must remain identical across candidates.

If a different number is required, the reason must be documented.

---

## 6. Metrics

Collect the following metrics where applicable:

| Metric               | Unit     | Type         |
| -------------------- | -------- | ------------ |
| Initialization time  | ms       | Quantitative |
| Rendering time       | ms       | Quantitative |
| FPS                  | frames/s | Quantitative |
| Memory usage         | MB       | Quantitative |
| Bundle size          | KB       | Quantitative |
| Interaction response | ms       | Quantitative |

Qualitative criteria such as documentation, API complexity, and React integration should be evaluated separately.

---

## 7. Data Analysis

For repeated measurements, report:

* Mean
* Median
* Minimum
* Maximum
* Standard deviation

For performance metrics, the median should be used as the primary representative value when measurements contain noticeable variability.

Raw measurements must be retained so that aggregated results can be independently verified.

---

## 8. Fair Comparison Rules

The benchmark must:

1. Use identical datasets.
2. Use equivalent workloads.
3. Use equivalent visual complexity.
4. Avoid library-specific optimizations that give one candidate an unfair advantage.
5. Record any unavoidable implementation differences.
6. Never fabricate or manually adjust benchmark results.
7. Separate measured results from qualitative observations.

Library-specific optimizations may be tested only as a separate experiment and must not replace the standardized benchmark.

---

## 9. Reproducibility

Every benchmark result must be traceable to:

* Library name and version
* Browser and version
* Runtime version
* Operating system
* Hardware
* Dataset version
* Benchmark scenario
* Benchmark configuration
* Test date

The benchmark environment is documented in `BENCHMARK_ENVIRONMENT.md`.

---

## 10. Result Interpretation

Benchmark results should not be interpreted using a single metric.

The final technology selection should consider:

* Performance
* Scalability
* Geospatial capabilities
* React + TypeScript integration
* Resource usage
* Implementation complexity
* Project requirements

Measured results and qualitative evaluation must remain clearly separated.
