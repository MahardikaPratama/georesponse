import { useCallback, type MutableRefObject } from 'react';
import { MAP_ZOOM, PAN_DISTANCE_PIXELS, ZOOM_STEP } from '../constants/benchmarkConfig.constants';
import type { MapBenchmark } from '../types/benchmark.types';

/**
 * Reusable manual pan/zoom controls bound to a live `MapBenchmark`
 * instance, for interactive previews outside the automated engine runs.
 */
export function useMapInteraction(benchmarkRef: MutableRefObject<MapBenchmark | null>) {
  const panRight = useCallback(async () => {
    await benchmarkRef.current?.panBy(PAN_DISTANCE_PIXELS, 0);
  }, [benchmarkRef]);

  const zoomIn = useCallback(async () => {
    await benchmarkRef.current?.zoomTo(MAP_ZOOM + ZOOM_STEP);
  }, [benchmarkRef]);

  const zoomOut = useCallback(async () => {
    await benchmarkRef.current?.zoomTo(MAP_ZOOM);
  }, [benchmarkRef]);

  return { panRight, zoomIn, zoomOut };
}
