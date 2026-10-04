# Technology Candidates

## 1. Purpose

Define the map libraries included in the benchmark for the **Resource
Readiness for Disaster Response*- application. Candidates were selected for
their capabilities, technical relevance, and compatibility with the project
requirements.

## 2. Candidate Overview

| Library        | Rendering Approach   | Primary Focus                              | Benchmark Status |
| -------------- | -------------------- | ------------------------------------------ | ---------------- |
| Leaflet        | DOM / SVG / Canvas   | Lightweight 2D mapping                     | Included         |
| OpenLayers     | DOM / Canvas / WebGL | Advanced 2D GIS                            | Included         |
| MapLibre GL JS | WebGL                | Vector maps and high-performance rendering | Included         |

## 3. Leaflet

**Leaflet*- is a lightweight JavaScript library for interactive 2D maps.

### Relevant Capabilities

- Interactive maps
- Point and marker rendering
- GeoJSON
- Polygon rendering
- Layer management
- Raster tile layers
- Map interaction
- React integration
- TypeScript support

### Relevance to the Project

Leaflet represents a lightweight 2D mapping approach and is a useful
baseline against more feature-rich or GPU-oriented alternatives.

### Benchmark Focus

- Map initialization
- Point rendering
- GeoJSON rendering
- Polygon rendering
- Multiple layers
- Large feature counts
- Pan and zoom responsiveness

## 4. OpenLayers

**OpenLayers*- is a feature-rich JavaScript mapping library designed for
web-based geospatial applications.

### Relevant Capabilities

- Interactive 2D maps
- Vector and raster layers
- GeoJSON
- Point and polygon rendering
- Layer management
- Feature interaction
- Vector tiles
- Coordinate and projection handling
- TypeScript support
- React integration

### Relevance to the Project

OpenLayers represents a more comprehensive GIS-oriented approach, with
capabilities suited to applications that combine multiple geographic data
sources and layers.

### Benchmark Focus

- Map initialization
- Vector feature rendering
- GeoJSON rendering
- Polygon rendering
- Multiple layers
- Large feature counts
- Pan and zoom responsiveness

## 5. MapLibre GL JS

**MapLibre GL JS*- is a web mapping library based on WebGL rendering and
designed primarily for vector-tile-based maps.

### Relevant Capabilities

- WebGL-based rendering
- Vector tiles
- GeoJSON sources
- Point and symbol rendering
- Polygon rendering
- Layer management
- Interactive maps
- Style-based rendering
- TypeScript support
- React integration

### Relevance to the Project

MapLibre GL JS represents a GPU-accelerated, vector-map approach, in
contrast to the more traditional 2D mapping of Leaflet and OpenLayers.

### Benchmark Focus

- Map initialization
- GeoJSON rendering
- Point and symbol rendering
- Polygon rendering
- Multiple layers
- Large feature counts
- Pan and zoom responsiveness

## 6. Candidate Selection Rationale

The three candidates represent different technical approaches:
lightweight 2D mapping (Leaflet), feature-rich GIS mapping (OpenLayers), and
WebGL/vector-based mapping (MapLibre GL JS). Together they let the benchmark
compare rendering and mapping approaches under the same project workload,
without assuming that one approach is superior before measurement.

## 7. Inclusion Criteria

A map library is included in the benchmark if it:

1. Supports interactive web maps.
2. Supports project-relevant geographic features.
3. Can be integrated into a React + TypeScript frontend.
4. Supports the core benchmark scenarios.
5. Provides sufficient technical documentation for reproducible testing.

Additional candidates may be added only with a clear, project-relevant
technical justification.

## 8. Excluded Technologies

Technologies focused primarily on specialized use cases are outside the
initial benchmark scope unless the application requirements change:

- 3D globe visualization
- Terrain visualization
- Routing
- Geocoding
- Full GIS desktop workflows

## 9. Evaluation Principle

Candidates are evaluated with the methodology in `BENCHMARK_METHODOLOGY.md`.
No candidate should be selected based solely on:

- Popularity
- Personal familiarity
- Assumed performance
- Community size
- Subjective preference

The final technology selection must be supported by benchmark results and
project-specific technical requirements.
