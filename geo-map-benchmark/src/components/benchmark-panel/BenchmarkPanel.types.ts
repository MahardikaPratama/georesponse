import type { DatasetSize, MapLibraryId, ScenarioId } from '../../types/benchmark.types';

export type BenchmarkStatus = 'idle' | 'running' | 'done' | 'error';

export interface BenchmarkPanelProps {
  libraryId: MapLibraryId;
  scenarioId: ScenarioId;
  datasetSize: DatasetSize;
  status: BenchmarkStatus;
  progressLabel: string | null;
  onLibraryChange: (libraryId: MapLibraryId) => void;
  onScenarioChange: (scenarioId: ScenarioId) => void;
  onDatasetSizeChange: (datasetSize: DatasetSize) => void;
  onRun: () => void;
}
