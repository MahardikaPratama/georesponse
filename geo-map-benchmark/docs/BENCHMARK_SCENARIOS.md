# Benchmark Scenarios

## 1. Purpose

Define standardized workloads and test cases for benchmarking geospatial map libraries used by the **Resource Readiness for Disaster Response** application.

All candidate libraries must run equivalent scenarios using the same dataset and environment.

---

## 2. Scenario Overview

| ID  | Scenario         | Main Purpose                        |
| --- | ---------------- | ----------------------------------- |
| S01 | Basic Map        | Measure map initialization          |
| S02 | Point Features   | Measure resource marker rendering   |
| S03 | GeoJSON          | Measure geographic data rendering   |
| S04 | Polygon Features | Measure area rendering              |
| S05 | Multiple Layers  | Measure layer management            |
| S06 | Large Dataset    | Evaluate scalability                |
| S07 | Map Interaction  | Evaluate interaction responsiveness |

---

## 3. S01 — Basic Map

### Workload

Render a map with:

* Basemap
* Initial center
* Initial zoom
* No application features

### Measure

* Map initialization time
* Time to first render
* Bundle size

### Purpose

Establish the baseline overhead of each map library.

---

## 4. S02 — Point Features

### Workload

Render geographic points representing disaster-response resources.

Example:

* Hospitals
* Shelters
* Warehouses
* Emergency posts

Test with multiple feature counts.

### Measure

* Rendering time
* FPS during pan/zoom
* Memory usage
* Interaction responsiveness

### Purpose

Evaluate the primary visualization workload of the target application.

---

## 5. S03 — GeoJSON

### Workload

Load and render equivalent GeoJSON data containing project-relevant geographic features.

### Measure

* GeoJSON loading time
* Rendering time
* Memory usage
* Interaction performance

### Purpose

Evaluate how efficiently each library handles geospatial data commonly consumed from an API.

---

## 6. S04 — Polygon Features

### Workload

Render polygons representing:

* Disaster-affected areas
* Administrative areas
* Operational zones

### Measure

* Rendering time
* FPS during pan/zoom
* Memory usage

### Purpose

Evaluate polygon rendering performance and interaction.

---

## 7. S05 — Multiple Layers

### Workload

Render multiple resource categories simultaneously.

Example:

```text
Hospitals
Shelters
Warehouses
Emergency Posts
Disaster Areas
```

Test:

* Layer creation
* Layer visibility toggle
* Layer updates

### Measure

* Layer operation time
* Rendering performance
* FPS
* Memory usage

### Purpose

Evaluate suitability for a map containing multiple operational datasets.

---

## 8. S06 — Large Dataset

### Workload

Render increasing numbers of geographic features.

Minimum test levels:

| Dataset | Features |
| ------- | -------: |
| Small   |      100 |
| Medium  |    1,000 |
| Large   |   10,000 |

The same geographic distribution and feature structure should be used across all candidates.

### Measure

* Rendering time
* FPS
* Memory usage
* Interaction responsiveness

### Purpose

Identify how performance changes as the number of map features increases.

---

## 9. S07 — Map Interaction

### Workload

Perform standardized interactions:

* Pan
* Zoom in
* Zoom out
* Feature selection
* Layer toggle
* Filtering

### Measure

* Interaction FPS
* Response time
* Visual lag or stuttering
* Memory changes

### Purpose

Evaluate whether the map remains responsive during typical user operations.

---

## 10. Test Consistency

For every scenario:

* Use the same dataset.
* Use equivalent feature styles.
* Use the same browser.
* Use the same hardware.
* Use the same viewport size.
* Use the same number of test repetitions.
* Record library versions.
* Record benchmark configuration.

Any scenario that cannot be implemented equivalently across candidates must be documented before comparing its results.
