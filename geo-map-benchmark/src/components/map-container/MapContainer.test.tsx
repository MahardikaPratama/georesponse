import { describe, expect, test, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { MapContainer } from './MapContainer';
import type { MapBenchmark, MapLibraryId } from '../../types/benchmark.types';

// MapContainer talks to real map libraries (Leaflet/OpenLayers/MapLibre GL
// JS) through mapBenchmarkFactory, none of which can meaningfully
// initialize in jsdom (no real Canvas/WebGL, no network tile loading).
// The factory is mocked so this test verifies MapContainer's own contract
// - which library it asks for, and that it cleans up on unmount - without
// depending on any library's real runtime behavior.
const destroy = vi.fn();
const initialize = vi.fn().mockResolvedValue(undefined);
const renderPoints = vi.fn().mockResolvedValue(undefined);

function makeFakeBenchmark(libraryId: MapLibraryId): MapBenchmark {
  return {
    libraryId,
    initialize,
    renderPoints,
    renderGeoJSON: vi.fn().mockResolvedValue(undefined),
    renderPolygons: vi.fn().mockResolvedValue(undefined),
    addLayer: vi.fn().mockResolvedValue(undefined),
    setLayerVisible: vi.fn(),
    clearFeatures: vi.fn(),
    panBy: vi.fn().mockResolvedValue(undefined),
    zoomTo: vi.fn().mockResolvedValue(undefined),
    highlightNearestFeature: vi.fn().mockResolvedValue(false),
    destroy,
  };
}

const createMapBenchmark = vi.fn((libraryId: MapLibraryId) =>
  Promise.resolve(makeFakeBenchmark(libraryId)),
);

vi.mock('../../benchmarks/mapBenchmarkFactory', () => ({
  createMapBenchmark: (libraryId: MapLibraryId) => createMapBenchmark(libraryId),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MapContainer', () => {
  test('requests an adapter for the given library and initializes it', async () => {
    render(<MapContainer libraryId="openlayers" />);
    await vi.waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
    expect(createMapBenchmark).toHaveBeenCalledWith('openlayers');
    expect(renderPoints).toHaveBeenCalledTimes(1);
  });

  test('renders a container div tagged with the current library', () => {
    const { container } = render(<MapContainer libraryId="maplibre" />);
    const div = container.querySelector('.map-container');
    expect(div).not.toBeNull();
    expect(div).toHaveAttribute('data-library', 'maplibre');
  });

  test('destroys the map instance on unmount', async () => {
    const { unmount } = render(<MapContainer libraryId="leaflet" />);
    await vi.waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
    unmount();
    await vi.waitFor(() => expect(destroy).toHaveBeenCalledTimes(1));
  });
});
