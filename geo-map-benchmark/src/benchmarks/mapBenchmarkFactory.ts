import type { MapBenchmark, MapLibraryId } from '../types/benchmark.types';

/**
 * Creates a fresh adapter instance for the given library, loading each
 * library-specific module via a dynamic `import()`. This lets Rspack place
 * Leaflet, OpenLayers, and MapLibre GL JS in separate chunks so each
 * candidate's production bundle size can be measured independently
 * (BENCHMARK_CRITERIA.md - Bundle size).
 */
export async function createMapBenchmark(libraryId: MapLibraryId): Promise<MapBenchmark> {
  switch (libraryId) {
    case 'leaflet': {
      const { LeafletBenchmark } = await import('./leaflet/LeafletBenchmark');
      return new LeafletBenchmark();
    }
    case 'openlayers': {
      const { OpenLayersBenchmark } = await import('./openlayers/OpenLayersBenchmark');
      return new OpenLayersBenchmark();
    }
    case 'maplibre': {
      const { MapLibreBenchmark } = await import('./maplibre/MapLibreBenchmark');
      return new MapLibreBenchmark();
    }
    default: {
      const exhaustive: never = libraryId;
      throw new Error(`Unknown map library: ${String(exhaustive)}`);
    }
  }
}
