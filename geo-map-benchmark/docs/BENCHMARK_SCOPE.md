# Benchmark Scope

## 1. Objective

Evaluate geospatial map libraries for the **Resource Readiness for Disaster
Response** application and provide evidence for selecting the most suitable
library.

## 2. In Scope

The benchmark evaluates:

- Map initialization
- Point/marker rendering
- Polygon rendering
- GeoJSON rendering
- Multiple map layers
- Feature interaction
- Pan and zoom responsiveness
- Rendering performance with increasing feature counts
- React + TypeScript integration
- Bundle size and browser resource usage
- Raster and vector tile support

## 3. Benchmark Candidates

Leaflet, OpenLayers, and MapLibre GL JS. Additional libraries require a
documented justification; see `TECHNOLOGY_CANDIDATES.md`.

## 4. Workload Scope

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
Scenario definitions: `BENCHMARK_SCENARIOS.md`.

## 5. Out of Scope

The benchmark does **not** evaluate:

- Go backend performance
- Database/PostGIS performance
- API performance
- Geocoding services
- Routing services
- Authentication and authorization
- Complete application business logic
- Production infrastructure
- 3D visualization as a primary workload

## 6. Comparison Rules

All candidates use the same environment, the same datasets, equivalent
workloads and measurement procedures, and documented library versions.
Performance results come from measured data, not assumptions, and
qualitative characteristics (API ergonomics, documentation, React
integration) are evaluated separately. Details: `BENCHMARK_METHODOLOGY.md`
sections 3 and 8.
