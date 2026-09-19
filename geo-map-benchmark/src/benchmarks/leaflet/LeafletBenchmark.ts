import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LayerKind, MapBenchmark } from '../../types/benchmark.types';
import type { FeatureCollection, PointFeatureCollection, PolygonFeatureCollection } from '../../types/mapFeature.types';
import { OSM_TILE_ATTRIBUTION, OSM_TILE_URL_TEMPLATE } from '../../constants/benchmarkConfig.constants';
import type { LeafletBenchmarkOptions } from './LeafletBenchmark.types';

/**
 * Leaflet adapter. Encapsulates all Leaflet-specific initialization,
 * rendering, and cleanup behind the shared `MapBenchmark` interface.
 */
export class LeafletBenchmark implements MapBenchmark {
  readonly libraryId = 'leaflet' as const;

  private map: L.Map | null = null;
  private readonly layers = new Map<string, L.Layer>();
  private lastPointMarkers: L.CircleMarker[] = [];
  private readonly tileUrlTemplate: string;
  private readonly attribution: string;

  constructor(options: LeafletBenchmarkOptions = {}) {
    this.tileUrlTemplate = options.tileUrlTemplate ?? OSM_TILE_URL_TEMPLATE;
    this.attribution = options.attribution ?? OSM_TILE_ATTRIBUTION;
  }

  async initialize(container: HTMLElement, center: [number, number], zoom: number): Promise<void> {
    const [lng, lat] = center;
    const map = L.map(container, {
      center: [lat, lng],
      zoom,
      zoomAnimation: false,
      fadeAnimation: false,
    });
    const tileLayer = L.tileLayer(this.tileUrlTemplate, { maxZoom: 19, attribution: this.attribution });
    this.map = map;

    // `map.whenReady()` resolves once the view is set, before tiles finish
    // loading - it would measure a fundamentally cheaper thing than
    // OpenLayers' `rendercomplete` or MapLibre's `load`, both of which wait
    // for the initial tile render to actually complete. Waiting for the
    // tile layer's own `load` event keeps S01 (Basic Map) comparable across
    // all three candidates (BENCHMARK_METHODOLOGY.md section 8, point 5).
    const tilesLoaded = new Promise<void>((resolve) => tileLayer.once('load', () => resolve()));
    tileLayer.addTo(map);
    await tilesLoaded;
  }

  private requireMap(): L.Map {
    if (!this.map) {
      throw new Error('LeafletBenchmark: initialize() must be called first');
    }
    return this.map;
  }

  async renderPoints(features: PointFeatureCollection): Promise<void> {
    const map = this.requireMap();
    const group = L.layerGroup();
    const markers: L.CircleMarker[] = [];
    for (const feature of features.features) {
      const [lng, lat] = feature.geometry.coordinates;
      const marker = L.circleMarker([lat, lng], { radius: 5, weight: 1 });
      marker.addTo(group);
      markers.push(marker);
    }
    group.addTo(map);
    this.layers.set('points', group);
    this.lastPointMarkers = markers;
  }

  async renderGeoJSON(geojson: PointFeatureCollection): Promise<void> {
    const map = this.requireMap();
    const layer = L.geoJSON(geojson as unknown as GeoJSON.GeoJsonObject, {
      pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: 5, weight: 1 }),
    });
    layer.addTo(map);
    this.layers.set('geojson', layer);
  }

  async renderPolygons(features: PolygonFeatureCollection): Promise<void> {
    const map = this.requireMap();
    const layer = L.geoJSON(features as unknown as GeoJSON.GeoJsonObject, {
      style: { weight: 1, fillOpacity: 0.4 },
    });
    layer.addTo(map);
    this.layers.set('polygons', layer);
  }

  async addLayer(layerId: string, features: FeatureCollection, kind: LayerKind): Promise<void> {
    const map = this.requireMap();
    const layer = L.geoJSON(features as unknown as GeoJSON.GeoJsonObject, {
      pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: 5, weight: 1 }),
      style: kind === 'polygon' ? { weight: 1, fillOpacity: 0.4 } : undefined,
    });
    layer.addTo(map);
    this.layers.set(layerId, layer);
  }

  setLayerVisible(layerId: string, visible: boolean): void {
    const map = this.requireMap();
    const layer = this.layers.get(layerId);
    if (!layer) return;
    if (visible) {
      layer.addTo(map);
    } else {
      map.removeLayer(layer);
    }
  }

  clearFeatures(): void {
    const map = this.requireMap();
    for (const layer of this.layers.values()) {
      map.removeLayer(layer);
    }
    this.layers.clear();
  }

  async panBy(dxPixels: number, dyPixels: number): Promise<void> {
    this.requireMap().panBy([dxPixels, dyPixels], { animate: false });
  }

  async zoomTo(level: number): Promise<void> {
    this.requireMap().setZoom(level, { animate: false });
  }

  async highlightNearestFeature(referencePoint: [number, number]): Promise<boolean> {
    if (this.lastPointMarkers.length === 0) return false;
    const [refLng, refLat] = referencePoint;
    let nearest: L.CircleMarker | null = null;
    let nearestDistSq = Infinity;
    for (const marker of this.lastPointMarkers) {
      const { lat, lng } = marker.getLatLng();
      const distSq = (lat - refLat) ** 2 + (lng - refLng) ** 2;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = marker;
      }
    }
    nearest?.setStyle({ color: '#ff0000', fillColor: '#ff0000', radius: 8 });
    return nearest !== null;
  }

  destroy(): void {
    this.layers.clear();
    this.lastPointMarkers = [];
    this.map?.remove();
    this.map = null;
  }
}
