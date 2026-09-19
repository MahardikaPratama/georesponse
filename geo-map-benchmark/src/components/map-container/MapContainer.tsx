import { useEffect, useRef } from 'react';
import { createMapBenchmark } from '../../benchmarks/mapBenchmarkFactory';
import { generatePointFeatures } from '../../utils/featureGenerator';
import { MAP_CENTER, MAP_ZOOM } from '../../constants/benchmarkConfig.constants';
import type { MapBenchmark } from '../../types/benchmark.types';
import type { MapContainerProps } from './MapContainer.types';
import { PREVIEW_FEATURE_COUNT } from './MapContainer.constants';

/**
 * Presentational, visual-only preview of the currently selected library.
 * This is separate from the Benchmark Engine's headless, isolated runs -
 * it exists purely for "Result Visualization" / "Status display"
 * (CLAUDE.md section 8) so a user can see the candidate rendering.
 */
export function MapContainer({ libraryId, className }: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let instance: MapBenchmark | null = null;

    async function mount(): Promise<void> {
      const container = containerRef.current;
      if (!container) return;

      const created = await createMapBenchmark(libraryId);
      if (cancelled) {
        created.destroy();
        return;
      }
      instance = created;

      await instance.initialize(container, MAP_CENTER, MAP_ZOOM);
      if (cancelled) {
        instance.destroy();
        return;
      }

      await instance.renderPoints(generatePointFeatures(PREVIEW_FEATURE_COUNT));
    }

    void mount();

    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, [libraryId]);

  const classes = className ? `map-container ${className}` : 'map-container';
  return <div ref={containerRef} className={classes} data-library={libraryId} />;
}
