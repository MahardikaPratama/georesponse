import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import type BaseLayer from 'ol/layer/Base';
import 'ol/ol.css';
import type { LayerKind, MapBenchmark } from '../../types/benchmark.types';
import type { FeatureCollection, PointFeatureCollection, PolygonFeatureCollection } from '../../types/mapFeature.types';
import { OSM_TILE_ATTRIBUTION, OSM_TILE_URL_TEMPLATE } from '../../constants/benchmarkConfig.constants';
import type { OpenLayersBenchmarkOptions } from './OpenLayersBenchmark.types';

const POINT_STYLE = new Style({
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: 'rgba(30, 100, 220, 0.9)' }),
  }),
});

const POLYGON_STYLE = new Style({
  fill: new Fill({ color: 'rgba(220, 60, 30, 0.4)' }),
  stroke: new Stroke({ color: 'rgba(220, 60, 30, 1)', width: 1 }),
});

const HIGHLIGHT_STYLE = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: 'rgba(255, 0, 0, 1)' }),
  }),
});

/**
 * OpenLayers adapter. Encapsulates all OpenLayers-specific initialization,
 * rendering, and cleanup behind the shared `MapBenchmark` interface.
 */
export class OpenLayersBenchmark implements MapBenchmark {
  readonly libraryId = 'openlayers' as const;

  private map: OlMap | null = null;
  private readonly layers = new Map<string, BaseLayer>();
  private pointsSource: VectorSource | null = null;
  private readonly geoJsonFormat = new GeoJSON();
  private readonly tileUrlTemplate: string;
  private readonly attribution: string;

  constructor(options: OpenLayersBenchmarkOptions = {}) {
    this.tileUrlTemplate = options.tileUrlTemplate ?? OSM_TILE_URL_TEMPLATE;
    this.attribution = options.attribution ?? OSM_TILE_ATTRIBUTION;
  }

  async initialize(container: HTMLElement, center: [number, number], zoom: number): Promise<void> {
    const map = new OlMap({
      target: container,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: this.tileUrlTemplate,
            attributions: this.attribution,
            maxZoom: 19,
          }),
        }),
      ],
      view: new View({ center: fromLonLat(center), zoom }),
    });
    this.map = map;
    await new Promise<void>((resolve) => map.once('rendercomplete', () => resolve()));
  }

  private requireMap(): OlMap {
    if (!this.map) {
      throw new Error('OpenLayersBenchmark: initialize() must be called first');
    }
    return this.map;
  }

  private buildVectorSource(geojson: FeatureCollection): VectorSource {
    return new VectorSource({
      features: this.geoJsonFormat.readFeatures(geojson, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326',
      }),
    });
  }

  private buildVectorLayer(geojson: FeatureCollection, style: Style): VectorLayer {
    return new VectorLayer({ source: this.buildVectorSource(geojson), style });
  }

  async renderPoints(features: PointFeatureCollection): Promise<void> {
    const map = this.requireMap();
    const source = this.buildVectorSource(features);
    const layer = new VectorLayer({ source, style: POINT_STYLE });
    map.addLayer(layer);
    this.layers.set('points', layer);
    this.pointsSource = source;
  }

  async renderGeoJSON(geojson: PointFeatureCollection): Promise<void> {
    const map = this.requireMap();
    const layer = this.buildVectorLayer(geojson, POINT_STYLE);
    map.addLayer(layer);
    this.layers.set('geojson', layer);
  }

  async renderPolygons(features: PolygonFeatureCollection): Promise<void> {
    const map = this.requireMap();
    const layer = this.buildVectorLayer(features, POLYGON_STYLE);
    map.addLayer(layer);
    this.layers.set('polygons', layer);
  }

  async addLayer(layerId: string, features: FeatureCollection, kind: LayerKind): Promise<void> {
    const map = this.requireMap();
    const layer = this.buildVectorLayer(features, kind === 'polygon' ? POLYGON_STYLE : POINT_STYLE);
    map.addLayer(layer);
    this.layers.set(layerId, layer);
  }

  setLayerVisible(layerId: string, visible: boolean): void {
    this.layers.get(layerId)?.setVisible(visible);
  }

  clearFeatures(): void {
    const map = this.requireMap();
    for (const layer of this.layers.values()) {
      map.removeLayer(layer);
    }
    this.layers.clear();
  }

  async panBy(dxPixels: number, dyPixels: number): Promise<void> {
    const view = this.requireMap().getView();
    const resolution = view.getResolution() ?? 1;
    const center = view.getCenter();
    if (!center) return;
    view.setCenter([center[0]! + dxPixels * resolution, center[1]! - dyPixels * resolution]);
  }

  async zoomTo(level: number): Promise<void> {
    this.requireMap().getView().setZoom(level);
  }

  async highlightNearestFeature(referencePoint: [number, number]): Promise<boolean> {
    if (!this.pointsSource) return false;
    const nearest = this.pointsSource.getClosestFeatureToCoordinate(fromLonLat(referencePoint));
    nearest?.setStyle(HIGHLIGHT_STYLE);
    return nearest !== null;
  }

  destroy(): void {
    this.layers.clear();
    this.pointsSource = null;
    this.map?.setTarget(undefined);
    this.map = null;
  }
}
