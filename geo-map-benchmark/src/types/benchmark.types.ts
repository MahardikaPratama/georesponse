import type {
  FeatureCollection,
  PointFeatureCollection,
  PolygonFeatureCollection,
} from './mapFeature.types';

export type MapLibraryId = 'leaflet' | 'openlayers' | 'maplibre';

export type ScenarioId = 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06' | 'S07';

export type DatasetSize = 'small' | 'medium' | 'large';

export type LayerKind = 'point' | 'polygon';

/**
 * Common contract implemented by every library-specific adapter under
 * `src/benchmarks/`. The Benchmark Engine drives scenarios exclusively
 * through this interface so it never contains library-specific logic.
 */
export interface MapBenchmark {
  readonly libraryId: MapLibraryId;

  initialize(container: HTMLElement, center: [number, number], zoom: number): Promise<void>;

  renderPoints(features: PointFeatureCollection): Promise<void>;
  renderGeoJSON(geojson: PointFeatureCollection): Promise<void>;
  renderPolygons(features: PolygonFeatureCollection): Promise<void>;

  addLayer(layerId: string, features: FeatureCollection, kind: LayerKind): Promise<void>;
  setLayerVisible(layerId: string, visible: boolean): void;
  clearFeatures(): void;

  panBy(dxPixels: number, dyPixels: number): Promise<void>;
  zoomTo(level: number): Promise<void>;

  /**
   * Finds the rendered point feature nearest to `referencePoint`
   * ([lng, lat]) among the most recently rendered point dataset, and
   * applies a visible "selected" style to it. Returns whether a feature
   * was found (false if no points have been rendered). Used by S07
   * (Map Interaction) to exercise feature selection - see
   * `DECISION_RECORD.md` for why nearest-distance selection was used
   * instead of each library's native screen-space hit-testing API.
   */
  highlightNearestFeature(referencePoint: [number, number]): Promise<boolean>;

  destroy(): void;
}

export interface RunMeasurement {
  runIndex: number;
  durationMs: number;
  fps?: number;
  memoryUsedMb?: number | null;
}

export interface AggregatedMetric {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  sampleCount: number;
}

export interface ScenarioResult {
  scenarioId: ScenarioId;
  libraryId: MapLibraryId;
  datasetSize?: DatasetSize;
  featureCount?: number;
  warmupRuns: number;
  measuredRuns: number;
  raw: RunMeasurement[];
  duration: AggregatedMetric;
  fps?: AggregatedMetric;
  memoryUsedMb?: AggregatedMetric;
  startedAt: string;
  finishedAt: string;
  failed: boolean;
  failureReason?: string;
}
