import { Map as MapLibreMap } from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LayerKind, MapBenchmark } from '../../types/benchmark.types';
import type {
  FeatureCollection,
  PointFeature,
  PointFeatureCollection,
  PolygonFeatureCollection,
} from '../../types/mapFeature.types';
import { OSM_TILE_ATTRIBUTION, OSM_TILE_URL_TEMPLATE } from '../../constants/benchmarkConfig.constants';
import type { MapLibreBenchmarkOptions } from './MapLibreBenchmark.types';

/**
 * Raster-only basemap style (same OSM tiles as the Leaflet/OpenLayers
 * adapters) so S01 measures initialization overhead rather than the
 * rendering advantage of a vector-tile style.
 */
function buildRasterStyle(tileUrlTemplate: string, attribution: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: [tileUrlTemplate],
        tileSize: 256,
        attribution,
      },
    },
    layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
  };
}

/**
 * MapLibre GL JS adapter. Encapsulates all MapLibre-specific initialization,
 * rendering, and cleanup behind the shared `MapBenchmark` interface.
 */
export class MapLibreBenchmark implements MapBenchmark {
  readonly libraryId = 'maplibre' as const;

  private map: MapLibreMap | null = null;
  private readonly layerIds = new Set<string>();
  private lastPointFeatures: PointFeature[] = [];
  private readonly tileUrlTemplate: string;
  private readonly attribution: string;

  constructor(options: MapLibreBenchmarkOptions = {}) {
    this.tileUrlTemplate = options.tileUrlTemplate ?? OSM_TILE_URL_TEMPLATE;
    this.attribution = options.attribution ?? OSM_TILE_ATTRIBUTION;
  }

  async initialize(container: HTMLElement, center: [number, number], zoom: number): Promise<void> {
    const map = new MapLibreMap({
      container,
      style: buildRasterStyle(this.tileUrlTemplate, this.attribution),
      center,
      zoom,
      fadeDuration: 0,
      attributionControl: false,
    });
    this.map = map;
    await new Promise<void>((resolve) => map.once('load', () => resolve()));
  }

  private requireMap(): MapLibreMap {
    if (!this.map) {
      throw new Error('MapLibreBenchmark: initialize() must be called first');
    }
    return this.map;
  }

  private addSourceAndLayer(layerId: string, geojson: FeatureCollection, kind: LayerKind): void {
    const map = this.requireMap();
    map.addSource(layerId, { type: 'geojson', data: geojson as unknown as GeoJSON.GeoJSON });
    if (kind === 'polygon') {
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: layerId,
        paint: { 'fill-color': '#dc3c1e', 'fill-opacity': 0.4 },
      });
    } else {
      map.addLayer({
        id: layerId,
        type: 'circle',
        source: layerId,
        paint: {
          'circle-radius': ['case', ['boolean', ['get', 'selected'], false], 8, 5],
          'circle-color': ['case', ['boolean', ['get', 'selected'], false], '#ff0000', '#1e64dc'],
        },
      });
    }
    this.layerIds.add(layerId);
  }

  async renderPoints(features: PointFeatureCollection): Promise<void> {
    this.addSourceAndLayer('points', features, 'point');
    this.lastPointFeatures = features.features;
  }

  async renderGeoJSON(geojson: PointFeatureCollection): Promise<void> {
    this.addSourceAndLayer('geojson', geojson, 'point');
  }

  async renderPolygons(features: PolygonFeatureCollection): Promise<void> {
    this.addSourceAndLayer('polygons', features, 'polygon');
  }

  async addLayer(layerId: string, features: FeatureCollection, kind: LayerKind): Promise<void> {
    this.addSourceAndLayer(layerId, features, kind);
  }

  setLayerVisible(layerId: string, visible: boolean): void {
    const map = this.requireMap();
    if (!this.layerIds.has(layerId)) return;
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }

  clearFeatures(): void {
    const map = this.requireMap();
    for (const layerId of this.layerIds) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(layerId)) map.removeSource(layerId);
    }
    this.layerIds.clear();
  }

  async panBy(dxPixels: number, dyPixels: number): Promise<void> {
    this.requireMap().panBy([dxPixels, dyPixels], { animate: false });
  }

  async zoomTo(level: number): Promise<void> {
    this.requireMap().jumpTo({ zoom: level });
  }

  async highlightNearestFeature(referencePoint: [number, number]): Promise<boolean> {
    if (this.lastPointFeatures.length === 0 || !this.layerIds.has('points')) return false;
    const map = this.requireMap();
    const [refLng, refLat] = referencePoint;

    let nearestIndex = -1;
    let nearestDistSq = Infinity;
    this.lastPointFeatures.forEach((feature, index) => {
      const [lng, lat] = feature.geometry.coordinates;
      const distSq = (lat - refLat) ** 2 + (lng - refLng) ** 2;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestIndex = index;
      }
    });
    if (nearestIndex === -1) return false;

    const updated = this.lastPointFeatures.map((feature, index) =>
      index === nearestIndex
        ? { ...feature, properties: { ...feature.properties, selected: true } }
        : feature,
    );
    this.lastPointFeatures = updated;

    const source = map.getSource('points');
    if (source && 'setData' in source) {
      (source as { setData: (data: GeoJSON.GeoJSON) => void }).setData({
        type: 'FeatureCollection',
        features: updated,
      } as unknown as GeoJSON.GeoJSON);
    }
    return true;
  }

  destroy(): void {
    this.layerIds.clear();
    this.lastPointFeatures = [];
    this.map?.remove();
    this.map = null;
  }
}
