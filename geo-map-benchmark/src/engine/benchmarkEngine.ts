import type {
  AggregatedMetric,
  DatasetSize,
  MapBenchmark,
  MapLibraryId,
  RunMeasurement,
  ScenarioId,
  ScenarioResult,
} from '../types/benchmark.types';
import type { PointCategory } from '../types/mapFeature.types';
import {
  DATASET_FEATURE_COUNTS,
  DEFAULT_FEATURE_COUNT,
  FPS_SAMPLE_DURATION_MS,
  MAP_CENTER,
  MAP_ZOOM,
  MEASURED_RUNS,
  PAN_DISTANCE_PIXELS,
  S07_FILTER_CATEGORY,
  VIEWPORT,
  WARMUP_RUNS,
  ZOOM_STEP,
} from '../constants/benchmarkConfig.constants';
import { generatePointFeatures, generatePolygonFeatures } from '../utils/featureGenerator';
import { now } from '../utils/benchmarkTimer';
import { aggregate, sampleFps, snapshotMemory } from '../utils/performanceMetrics';

/**
 * Benchmark Engine. Owns scenario execution, timing, measurement collection,
 * and result normalization (CLAUDE.md section 7). It never contains
 * library-specific logic - all map operations go through the `MapBenchmark`
 * interface implemented by each adapter under `src/benchmarks/`.
 */

export type MapBenchmarkFactory = () => Promise<MapBenchmark>;

export interface ScenarioProgress {
  phase: 'warmup' | 'measured';
  runIndex: number;
  total: number;
}

export interface RunScenarioOptions {
  /** Only meaningful for S06 (Large Dataset). Defaults to 'medium'. */
  datasetSize?: DatasetSize;
  warmupRuns?: number;
  measuredRuns?: number;
  onProgress?: (progress: ScenarioProgress) => void;
}

interface WorkloadOutcome {
  durationMs: number;
  fps?: number;
  memoryUsedMb?: number | null;
}

const LAYER_CATEGORIES: readonly PointCategory[] = [
  'hospital',
  'shelter',
  'warehouse',
  'emergency-post',
  'response-unit',
];

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.style.width = `${VIEWPORT.width}px`;
  container.style.height = `${VIEWPORT.height}px`;
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.visibility = 'hidden';
  return container;
}

async function measurePostWorkload(): Promise<{ fps: number; memoryUsedMb: number | null }> {
  const [fpsResult, memory] = await Promise.all([
    sampleFps(FPS_SAMPLE_DURATION_MS),
    Promise.resolve(snapshotMemory()),
  ]);
  return { fps: fpsResult.fps, memoryUsedMb: memory.usedJsHeapSizeMb };
}

async function executeWorkload(
  benchmark: MapBenchmark,
  scenarioId: Exclude<ScenarioId, 'S01'>,
  featureCount: number,
): Promise<WorkloadOutcome> {
  switch (scenarioId) {
    case 'S02':
    case 'S06': {
      const points = generatePointFeatures(featureCount);
      const start = now();
      await benchmark.renderPoints(points);
      const durationMs = now() - start;
      const post = await measurePostWorkload();
      return { durationMs, ...post };
    }
    case 'S03': {
      const points = generatePointFeatures(featureCount);
      const start = now();
      await benchmark.renderGeoJSON(points);
      const durationMs = now() - start;
      const post = await measurePostWorkload();
      return { durationMs, ...post };
    }
    case 'S04': {
      const polygons = generatePolygonFeatures(featureCount);
      const start = now();
      await benchmark.renderPolygons(polygons);
      const durationMs = now() - start;
      const post = await measurePostWorkload();
      return { durationMs, ...post };
    }
    case 'S05': {
      const perLayerCount = Math.max(1, Math.floor(featureCount / LAYER_CATEGORIES.length));
      const start = now();
      for (const [index, category] of LAYER_CATEGORIES.entries()) {
        const layerData = generatePointFeatures(perLayerCount, index + 1);
        await benchmark.addLayer(category, layerData, 'point');
      }
      for (const category of LAYER_CATEGORIES) {
        benchmark.setLayerVisible(category, false);
      }
      for (const category of LAYER_CATEGORIES) {
        benchmark.setLayerVisible(category, true);
      }
      const durationMs = now() - start;
      const post = await measurePostWorkload();
      return { durationMs, ...post };
    }
    case 'S07': {
      const points = generatePointFeatures(featureCount);
      await benchmark.renderPoints(points);
      const start = now();
      const fpsPromise = sampleFps(FPS_SAMPLE_DURATION_MS);

      // Pan and zoom (BENCHMARK_SCENARIOS.md section 9, items 1-3).
      await benchmark.panBy(PAN_DISTANCE_PIXELS, 0);
      await benchmark.zoomTo(MAP_ZOOM + ZOOM_STEP);
      await benchmark.zoomTo(MAP_ZOOM);

      // Feature selection (item 4): highlight the point nearest the map
      // center. See DECISION_RECORD.md for why nearest-distance selection
      // is used instead of each library's native hit-testing API.
      await benchmark.highlightNearestFeature(MAP_CENTER);

      // Filtering-related map update (item 6): re-render with only one
      // category, reusing the existing clear/render contract rather than
      // adding a dedicated "filter" method to MapBenchmark.
      const filtered: typeof points = {
        type: 'FeatureCollection',
        features: points.features.filter((f) => f.properties.category === S07_FILTER_CATEGORY),
      };
      benchmark.clearFeatures();
      await benchmark.renderPoints(filtered);

      const { fps } = await fpsPromise;
      const durationMs = now() - start;
      const memoryUsedMb = snapshotMemory().usedJsHeapSizeMb;
      return { durationMs, fps, memoryUsedMb };
    }
    default: {
      const exhaustive: never = scenarioId;
      throw new Error(`Unhandled scenario: ${String(exhaustive)}`);
    }
  }
}

function buildAggregatedResult(
  scenarioId: ScenarioId,
  libraryId: MapBenchmark['libraryId'],
  datasetSize: DatasetSize | undefined,
  featureCount: number,
  warmupRuns: number,
  measuredRuns: number,
  raw: RunMeasurement[],
  startedAt: string,
  finishedAt: string,
): ScenarioResult {
  const durations = raw.map((r) => r.durationMs);
  const fpsValues = raw.map((r) => r.fps).filter((v): v is number => typeof v === 'number');
  const memoryValues = raw
    .map((r) => r.memoryUsedMb)
    .filter((v): v is number => typeof v === 'number');

  const result: ScenarioResult = {
    scenarioId,
    libraryId,
    featureCount,
    warmupRuns,
    measuredRuns,
    raw,
    duration: aggregate(durations),
    startedAt,
    finishedAt,
    failed: false,
  };
  if (datasetSize) result.datasetSize = datasetSize;
  if (fpsValues.length > 0) result.fps = aggregate(fpsValues);
  if (memoryValues.length > 0) result.memoryUsedMb = aggregate(memoryValues);
  return result;
}

/**
 * Runs a single scenario for a single library: `warmupRuns` untimed runs
 * followed by `measuredRuns` timed runs, per BENCHMARK_METHODOLOGY.md
 * section 5. Each run gets a fresh map instance and DOM container to avoid
 * cross-run state leaking between measurements.
 */
export async function runScenario(
  libraryId: MapLibraryId,
  factory: MapBenchmarkFactory,
  scenarioId: ScenarioId,
  options: RunScenarioOptions = {},
): Promise<ScenarioResult> {
  const warmupRuns = options.warmupRuns ?? WARMUP_RUNS;
  const measuredRuns = options.measuredRuns ?? MEASURED_RUNS;
  const datasetSize: DatasetSize | undefined =
    scenarioId === 'S06' ? options.datasetSize ?? 'medium' : options.datasetSize;
  const featureCount =
    scenarioId === 'S06' ? DATASET_FEATURE_COUNTS[datasetSize ?? 'medium'] : DEFAULT_FEATURE_COUNT;

  const startedAt = new Date().toISOString();
  const raw: RunMeasurement[] = [];
  const totalRuns = warmupRuns + measuredRuns;

  try {
    for (let i = 0; i < totalRuns; i += 1) {
      const isWarmup = i < warmupRuns;
      options.onProgress?.({
        phase: isWarmup ? 'warmup' : 'measured',
        runIndex: isWarmup ? i : i - warmupRuns,
        total: isWarmup ? warmupRuns : measuredRuns,
      });

      const container = createContainer();
      document.body.appendChild(container);
      const benchmark = await factory();

      let outcome: WorkloadOutcome;
      if (scenarioId === 'S01') {
        const start = now();
        await benchmark.initialize(container, MAP_CENTER, MAP_ZOOM);
        const durationMs = now() - start;
        const post = await measurePostWorkload();
        outcome = { durationMs, ...post };
      } else {
        await benchmark.initialize(container, MAP_CENTER, MAP_ZOOM);
        outcome = await executeWorkload(benchmark, scenarioId, featureCount);
      }

      benchmark.destroy();
      container.remove();

      if (!isWarmup) {
        raw.push({
          runIndex: i - warmupRuns,
          durationMs: outcome.durationMs,
          ...(outcome.fps !== undefined ? { fps: outcome.fps } : {}),
          memoryUsedMb: outcome.memoryUsedMb ?? null,
        });
      }
    }
  } catch (error) {
    const finishedAt = new Date().toISOString();
    return {
      scenarioId,
      libraryId,
      ...(datasetSize ? { datasetSize } : {}),
      featureCount,
      warmupRuns,
      measuredRuns,
      raw,
      duration: raw.length > 0 ? aggregate(raw.map((r) => r.durationMs)) : { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, sampleCount: 0 },
      startedAt,
      finishedAt,
      failed: true,
      failureReason: error instanceof Error ? error.message : String(error),
    };
  }

  const finishedAt = new Date().toISOString();
  return buildAggregatedResult(
    scenarioId,
    libraryId,
    datasetSize,
    featureCount,
    warmupRuns,
    measuredRuns,
    raw,
    startedAt,
    finishedAt,
  );
}

export type { AggregatedMetric };
