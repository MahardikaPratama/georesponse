import type {
  PointCategory,
  PointFeature,
  PointFeatureCollection,
  PolygonCategory,
  PolygonFeature,
  PolygonFeatureCollection,
} from '../types/mapFeature.types';
import { MAP_CENTER, RANDOM_SEED } from '../constants/benchmarkConfig.constants.ts';

const POINT_CATEGORIES: readonly PointCategory[] = [
  'hospital',
  'shelter',
  'warehouse',
  'emergency-post',
  'response-unit',
];

const POLYGON_CATEGORIES: readonly PolygonCategory[] = [
  'disaster-area',
  'administrative-area',
  'operational-zone',
];

/** Approximate bounding box (in degrees) synthetic features are scattered within. */
const BBOX_DEGREES = 1.5;

/**
 * Deterministic PRNG (mulberry32) so the same seed always produces the same
 * dataset. Required so every candidate benchmarks against an identical
 * feature set (BENCHMARK_METHODOLOGY.md section 8).
 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function random(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generatePointFeatures(count: number, seed: number = RANDOM_SEED): PointFeatureCollection {
  const random = mulberry32(seed);
  const [centerLng, centerLat] = MAP_CENTER;
  const features: PointFeature[] = [];

  for (let i = 0; i < count; i += 1) {
    const lng = centerLng + (random() - 0.5) * BBOX_DEGREES;
    const lat = centerLat + (random() - 0.5) * BBOX_DEGREES;
    const category = POINT_CATEGORIES[i % POINT_CATEGORIES.length]!;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { id: `point-${i}`, category, name: `${category}-${i}` },
    });
  }

  return { type: 'FeatureCollection', features };
}

function buildSquareRing(centerLng: number, centerLat: number, sizeDegrees: number): [number, number][] {
  const half = sizeDegrees / 2;
  return [
    [centerLng - half, centerLat - half],
    [centerLng + half, centerLat - half],
    [centerLng + half, centerLat + half],
    [centerLng - half, centerLat + half],
    [centerLng - half, centerLat - half],
  ];
}

export function generatePolygonFeatures(count: number, seed: number = RANDOM_SEED): PolygonFeatureCollection {
  const random = mulberry32(seed + 1);
  const [centerLng, centerLat] = MAP_CENTER;
  const features: PolygonFeature[] = [];

  for (let i = 0; i < count; i += 1) {
    const lng = centerLng + (random() - 0.5) * BBOX_DEGREES;
    const lat = centerLat + (random() - 0.5) * BBOX_DEGREES;
    const size = 0.02 + random() * 0.03;
    const category = POLYGON_CATEGORIES[i % POLYGON_CATEGORIES.length]!;
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [buildSquareRing(lng, lat, size)] },
      properties: { id: `polygon-${i}`, category, name: `${category}-${i}` },
    });
  }

  return { type: 'FeatureCollection', features };
}
