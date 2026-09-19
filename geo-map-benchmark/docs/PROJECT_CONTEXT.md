# Project Context

## 1. Overview

`geo-map-benchmark` is a benchmarking project to evaluate geospatial map libraries for the **Resource Readiness for Disaster Response** application.

The goal is to select a map library based on **measured performance, technical capabilities, and relevance to the application requirements**.

---

## 2. Target Application

**Resource Readiness for Disaster Response**

The application uses an interactive map to visualize disaster-response resources, such as:

* Hospitals
* Shelters
* Warehouses
* Emergency posts
* Response units
* Disaster-affected areas

The map is a core part of the application because users need to understand the **location, distribution, and status of resources**.

---

## 3. Fixed Technology Requirements

| Component   | Technology         |
| ----------- | ------------------ |
| Frontend    | React + TypeScript |
| Backend     | Go                 |
| Map Library | To be determined   |

React + TypeScript and Go are fixed requirements and must not be changed during the benchmark.

---

## 4. Map Library Candidates

The initial candidates are:

| Library        | Primary Focus          | Project Relevance |
| -------------- | ---------------------- | ----------------- |
| Leaflet        | Lightweight 2D mapping | High              |
| OpenLayers     | Advanced 2D GIS        | High              |
| MapLibre GL JS | WebGL/vector maps      | High              |

Additional libraries should only be included if there is a clear technical reason relevant to the project.

---

## 5. Key Requirements

The selected map library should support:

| Requirement              | Relevance |
| ------------------------ | --------- |
| Point/marker rendering   | High      |
| GeoJSON                  | High      |
| Polygon rendering        | High      |
| Map pan & zoom           | High      |
| Layer management         | High      |
| Feature interaction      | High      |
| Filtering                | High      |
| Large number of features | High      |
| Raster tiles             | High      |
| Vector tiles             | Medium    |
| React integration        | High      |
| TypeScript support       | High      |
| Responsive interaction   | High      |
| 3D visualization         | Low       |

---

## 6. Benchmark Focus

The benchmark should focus on workloads that represent the target application:

* Map initialization
* Point rendering
* Polygon rendering
* GeoJSON rendering
* Multiple layers
* Feature interaction
* Increasing feature counts
* Map responsiveness

Performance results should be measured using the same dataset, workload, and environment across candidates.

---

## 7. Benchmark Principle

The benchmark must provide **objective and reproducible evidence**.

Do not select a library based solely on popularity, familiarity, or assumptions.

The final technology selection should consider both:

1. **Quantitative benchmark results**
2. **Project-specific technical requirements**
