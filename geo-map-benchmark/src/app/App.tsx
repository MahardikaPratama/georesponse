import { useCallback, useState } from 'react';
import { BenchmarkPanel } from '../components/benchmark-panel/BenchmarkPanel';
import { MapContainer } from '../components/map-container/MapContainer';
import { MetricPanel } from '../components/metric-panel/MetricPanel';
import { useBenchmark } from '../hooks/useBenchmark';
import type { DatasetSize, MapLibraryId, ScenarioId } from '../types/benchmark.types';
import { DEFAULT_DATASET_SIZE, DEFAULT_LIBRARY, DEFAULT_SCENARIO } from './App.constants';

/**
 * Top-level container. Owns selection + benchmark-run state and wires the
 * presentational components together (CLAUDE.md section 7 - React UI).
 */
export function App() {
  const [libraryId, setLibraryId] = useState<MapLibraryId>(DEFAULT_LIBRARY);
  const [scenarioId, setScenarioId] = useState<ScenarioId>(DEFAULT_SCENARIO);
  const [datasetSize, setDatasetSize] = useState<DatasetSize>(DEFAULT_DATASET_SIZE);

  const { status, progress, results, run } = useBenchmark();

  const handleRun = useCallback(() => {
    void run({ libraryId, scenarioId, datasetSize });
  }, [run, libraryId, scenarioId, datasetSize]);

  const progressLabel = progress
    ? `Running ${progress.phase} run ${progress.runIndex + 1} of ${progress.total}...`
    : null;

  return (
    <main className="app">
      <header className="app__header">
        <h1>Geo Map Benchmark</h1>
        <p>Leaflet vs OpenLayers vs MapLibre GL JS - Resource Readiness for Disaster Response</p>
      </header>

      <div className="app__layout">
        <BenchmarkPanel
          libraryId={libraryId}
          scenarioId={scenarioId}
          datasetSize={datasetSize}
          status={status}
          progressLabel={progressLabel}
          onLibraryChange={setLibraryId}
          onScenarioChange={setScenarioId}
          onDatasetSizeChange={setDatasetSize}
          onRun={handleRun}
        />

        <MapContainer libraryId={libraryId} />

        <MetricPanel results={results} />
      </div>
    </main>
  );
}
