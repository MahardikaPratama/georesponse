import { useCallback, useState } from 'react';
import { createMapBenchmark } from '../benchmarks/mapBenchmarkFactory';
import { runScenario, type ScenarioProgress } from '../engine/benchmarkEngine';
import type { DatasetSize, MapLibraryId, ScenarioId, ScenarioResult } from '../types/benchmark.types';

export type BenchmarkStatus = 'idle' | 'running' | 'done' | 'error';

export interface BenchmarkRunRequest {
  libraryId: MapLibraryId;
  scenarioId: ScenarioId;
  datasetSize?: DatasetSize;
}

/**
 * Orchestrates running a single scenario through the Benchmark Engine and
 * tracks status/progress/results for the React UI. Contains no
 * library-specific logic (CLAUDE.md section 10).
 */
export function useBenchmark() {
  const [status, setStatus] = useState<BenchmarkStatus>('idle');
  const [progress, setProgress] = useState<ScenarioProgress | null>(null);
  const [results, setResults] = useState<ScenarioResult[]>([]);

  const run = useCallback(async (request: BenchmarkRunRequest): Promise<ScenarioResult> => {
    setStatus('running');
    setProgress(null);

    const result = await runScenario(
      request.libraryId,
      () => createMapBenchmark(request.libraryId),
      request.scenarioId,
      {
        ...(request.datasetSize ? { datasetSize: request.datasetSize } : {}),
        onProgress: setProgress,
      },
    );

    setResults((previous) => [...previous, result]);
    setStatus(result.failed ? 'error' : 'done');
    setProgress(null);
    return result;
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setStatus('idle');
    setProgress(null);
  }, []);

  return { status, progress, results, run, reset };
}
