# Benchmark Scope

## 1. Objective

Evaluate geospatial map libraries for the **Resource Readiness for Disaster Response** application and provide evidence for selecting the most suitable library.

---

## 2. In Scope

The benchmark evaluates:

* Map initialization
* Point/marker rendering
* Polygon rendering
* GeoJSON rendering
* Multiple map layers
* Feature interaction
* Pan and zoom responsiveness
* Rendering performance with increasing feature counts
* React + TypeScript integration
* Bundle size and browser resource usage
* Raster and vector tile support

---

## 3. Benchmark Candidates

The initial benchmark compares:

* Leaflet
* OpenLayers
* MapLibre GL JS

Additional libraries require a documented justification before inclusion.

---

## 4. Workload Scope

The benchmark should use project-relevant workloads:

| Workload         | Purpose                                 |
| ---------------- | --------------------------------------- |
| Basic map        | Measure initialization                  |
| Point features   | Represent resources                     |
| Polygon features | Represent disaster/administrative areas |
| GeoJSON          | Represent API-provided geospatial data  |
| Multiple layers  | Represent different resource categories |
| Large datasets   | Evaluate scalability                    |
| Interaction      | Evaluate map responsiveness             |

Feature counts should include at least small, medium, and large datasets.

---

## 5. Out of Scope

The benchmark does **not** evaluate:

* Go backend performance
* Database/PostGIS performance
* API performance
* Geocoding services
* Routing services
* Authentication and authorization
* Complete application business logic
* Production infrastructure
* 3D visualization as a primary workload

---

## 6. Comparison Rules

All candidates should use:

* The same benchmark environment
* The same datasets
* Equivalent workloads
* Equivalent measurement procedures
* Documented library versions

Performance results must be based on measured data, not assumptions.

Qualitative characteristics such as API ergonomics, documentation, and React integration should be evaluated separately from performance measurements.
