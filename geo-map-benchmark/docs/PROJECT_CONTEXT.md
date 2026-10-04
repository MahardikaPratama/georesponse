# Project Context

## 1. Overview

`geo-map-benchmark` evaluates geospatial map libraries for the **Resource
Readiness for Disaster Response** application (now GeoResponse). The goal
is to select a map library based on **measured performance, technical
capabilities, and relevance to the application requirements**, with
objective and reproducible evidence rather than popularity, familiarity, or
assumptions. The final selection weighs both quantitative benchmark results
and project-specific technical requirements.

## 2. Target Application

The application uses an interactive map to visualize disaster-response
resources, such as:

- Hospitals
- Shelters
- Warehouses
- Emergency posts
- Response units
- Disaster-affected areas

The map is a core part of the application because users need to understand
the **location, distribution, and status of resources**.

## 3. Fixed Technology Requirements

| Component   | Technology         |
| ----------- | ------------------ |
| Frontend    | React + TypeScript |
| Backend     | Go                 |
| Map Library | To be determined   |

React + TypeScript and Go are fixed requirements and must not change during
the benchmark.

## 4. Map Library Candidates

| Library        | Primary Focus          | Project Relevance |
| -------------- | ---------------------- | ----------------- |
| Leaflet        | Lightweight 2D mapping | High              |
| OpenLayers     | Advanced 2D GIS        | High              |
| MapLibre GL JS | WebGL/vector maps      | High              |

Candidate details and inclusion criteria: `TECHNOLOGY_CANDIDATES.md`.

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

The workloads benchmarked against these requirements are listed in
`BENCHMARK_SCOPE.md`.
