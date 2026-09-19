# Technology Candidates

## 1. Purpose

Define the geospatial map libraries included in the benchmark for the **Resource Readiness for Disaster Response** application.

The initial candidates are selected based on their capabilities, technical relevance, and compatibility with the project requirements.

---

## 2. Candidate Overview

| Library        | Rendering Approach   | Primary Focus                              | Benchmark Status |
| -------------- | -------------------- | ------------------------------------------ | ---------------- |
| Leaflet        | DOM / SVG / Canvas   | Lightweight 2D mapping                     | Included         |
| OpenLayers     | DOM / Canvas / WebGL | Advanced 2D GIS                            | Included         |
| MapLibre GL JS | WebGL                | Vector maps and high-performance rendering | Included         |

---

## 3. Leaflet

**Leaflet** is a lightweight JavaScript library for interactive 2D maps.

### Relevant Capabilities

* Interactive maps
* Point and marker rendering
* GeoJSON
* Polygon rendering
* Layer management
* Raster tile layers
* Map interaction
* React integration
* TypeScript support

### Relevance to the Project

Leaflet represents a lightweight 2D mapping approach and provides a useful baseline for comparison against more feature-rich or GPU-oriented alternatives.

### Benchmark Focus

* Map initialization
* Point rendering
* GeoJSON rendering
* Polygon rendering
* Multiple layers
* Large feature counts
* Pan and zoom responsiveness

---

## 4. OpenLayers

**OpenLayers** is a feature-rich JavaScript mapping library designed for web-based geospatial applications.

### Relevant Capabilities

* Interactive 2D maps
* Vector and raster layers
* GeoJSON
* Point and polygon rendering
* Layer management
* Feature interaction
* Vector tiles
* Coordinate and projection handling
* TypeScript support
* React integration

### Relevance to the Project

OpenLayers represents a more comprehensive GIS-oriented approach and provides capabilities relevant to applications that require multiple geographic data sources and layers.

### Benchmark Focus

* Map initialization
* Vector feature rendering
* GeoJSON rendering
* Polygon rendering
* Multiple layers
* Large feature counts
* Pan and zoom responsiveness

---

## 5. MapLibre GL JS

**MapLibre GL JS** is a web mapping library based on WebGL rendering and designed primarily for vector-tile-based maps.

### Relevant Capabilities

* WebGL-based rendering
* Vector tiles
* GeoJSON sources
* Point and symbol rendering
* Polygon rendering
* Layer management
* Interactive maps
* Style-based rendering
* TypeScript support
* React integration

### Relevance to the Project

MapLibre GL JS represents a GPU-accelerated, vector-map approach and provides a useful comparison with the more traditional 2D mapping approaches represented by Leaflet and OpenLayers.

### Benchmark Focus

* Map initialization
* GeoJSON rendering
* Point and symbol rendering
* Polygon rendering
* Multiple layers
* Large feature counts
* Pan and zoom responsiveness

---

## 6. Candidate Selection Rationale

The three candidates provide different technical approaches:

| Candidate      | Representation             |
| -------------- | -------------------------- |
| Leaflet        | Lightweight 2D mapping     |
| OpenLayers     | Feature-rich GIS mapping   |
| MapLibre GL JS | WebGL/vector-based mapping |

Including these candidates allows the benchmark to compare different rendering and mapping approaches under the same project workload.

The benchmark does not assume that one approach is superior before measurement.

---

## 7. Inclusion Criteria

A map library is included in the benchmark if it:

1. Supports interactive web maps.
2. Supports project-relevant geographic features.
3. Can be integrated into a React + TypeScript frontend.
4. Supports the core benchmark scenarios.
5. Provides sufficient technical documentation for reproducible testing.

Additional candidates may be added only when a clear project-relevant technical justification exists.

---

## 8. Excluded Technologies

Technologies primarily focused on specialized use cases such as:

* 3D globe visualization
* Terrain visualization
* Routing
* Geocoding
* Full GIS desktop workflows

are outside the initial benchmark scope unless the application requirements change.

---

## 9. Evaluation Principle

Candidate libraries will be evaluated using the methodology defined in `BENCHMARK_METHODOLOGY.md`.

No candidate should be selected based solely on:

* Popularity
* Personal familiarity
* Assumed performance
* Community size
* Subjective preference

The final technology selection must be supported by benchmark results and project-specific technical requirements.
