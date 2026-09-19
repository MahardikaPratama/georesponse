import type { DatasetSize, MapLibraryId, ScenarioId } from '../../types/benchmark.types';

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export const LIBRARY_OPTIONS: ReadonlyArray<SelectOption<MapLibraryId>> = [
  { value: 'leaflet', label: 'Leaflet' },
  { value: 'openlayers', label: 'OpenLayers' },
  { value: 'maplibre', label: 'MapLibre GL JS' },
];

export const SCENARIO_OPTIONS: ReadonlyArray<SelectOption<ScenarioId>> = [
  { value: 'S01', label: 'S01 — Basic Map' },
  { value: 'S02', label: 'S02 — Point Features' },
  { value: 'S03', label: 'S03 — GeoJSON' },
  { value: 'S04', label: 'S04 — Polygon Features' },
  { value: 'S05', label: 'S05 — Multiple Layers' },
  { value: 'S06', label: 'S06 — Large Dataset' },
  { value: 'S07', label: 'S07 — Map Interaction' },
];

export const DATASET_SIZE_OPTIONS: ReadonlyArray<SelectOption<DatasetSize>> = [
  { value: 'small', label: 'Small (100)' },
  { value: 'medium', label: 'Medium (1,000)' },
  { value: 'large', label: 'Large (10,000)' },
];
