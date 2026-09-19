import type { DatasetSize } from '../types/benchmark.types';
import type { PointCategory } from '../types/mapFeature.types';

/** Benchmark repetition configuration per BENCHMARK_METHODOLOGY.md section 5. */
export const WARMUP_RUNS = 3;
export const MEASURED_RUNS = 10;

/** Feature-count levels for S06 (Large Dataset) per BENCHMARK_SCENARIOS.md section 8. */
export const DATASET_FEATURE_COUNTS: Record<DatasetSize, number> = {
  small: 100,
  medium: 1000,
  large: 10000,
};

/**
 * Feature count used for scenarios that do not define explicit dataset
 * levels in the documentation (S02-S05). Fixed at the "medium" level so
 * every candidate renders an identical, moderately sized dataset.
 */
export const DEFAULT_FEATURE_COUNT = DATASET_FEATURE_COUNTS.medium;

/** Initial map state, identical across all candidates (Jakarta, Indonesia). */
export const MAP_CENTER: [number, number] = [106.8456, -6.2088];
export const MAP_ZOOM = 11;

export const VIEWPORT = { width: 1280, height: 800 } as const;

/** Duration used to sample FPS via requestAnimationFrame. */
export const FPS_SAMPLE_DURATION_MS = 1000;

/** Standardized interaction parameters for S07 (Map Interaction). */
export const PAN_DISTANCE_PIXELS = 200;
export const ZOOM_STEP = 2;
/** Category kept when S07 applies its filtering-related map update. */
export const S07_FILTER_CATEGORY: PointCategory = 'hospital';

/** Fixed seed so every candidate renders an identical synthetic dataset. */
export const RANDOM_SEED = 42;

/** Shared raster basemap so all three candidates render an equivalent basemap. */
export const OSM_TILE_URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_TILE_ATTRIBUTION = 'OpenStreetMap contributors';
