import { createMapBenchmark } from './benchmarks/mapBenchmarkFactory';
import { runScenario } from './engine/benchmarkEngine';
import type { DatasetSize, MapLibraryId, ScenarioId } from './types/benchmark.types';

/**
 * Headless automation entry point (built as a separate bundle, see
 * rspack.config.ts). Loaded by scripts/runBenchmarks.mjs (Playwright) with
 * `?library=<id>&scenario=<id>&datasetSize=<size>` query params. Runs a
 * single scenario through the same Benchmark Engine used by the React UI
 * and exposes the raw result on `window.__BENCHMARK_RESULT__` so the
 * automation script can read it without any UI interaction.
 *
 * Executing real scenarios through the same engine as the interactive app
 * (rather than a separate simulation) is what makes automated results
 * trustworthy evidence rather than an estimate (AGENT.md section 8).
 */
declare global {
  interface Window {
    __BENCHMARK_RESULT__?: unknown;
    __BENCHMARK_ERROR__?: string;
  }
}

function readParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

async function main(): Promise<void> {
  const libraryId = readParam('library') as MapLibraryId | null;
  const scenarioId = readParam('scenario') as ScenarioId | null;
  const datasetSize = readParam('datasetSize') as DatasetSize | null;
  const warmupRunsParam = readParam('warmupRuns');
  const measuredRunsParam = readParam('measuredRuns');

  if (!libraryId || !scenarioId) {
    window.__BENCHMARK_ERROR__ = 'Missing required query params: library, scenario';
    return;
  }

  try {
    const result = await runScenario(
      libraryId,
      () => createMapBenchmark(libraryId),
      scenarioId,
      {
        ...(datasetSize ? { datasetSize } : {}),
        ...(warmupRunsParam ? { warmupRuns: Number(warmupRunsParam) } : {}),
        ...(measuredRunsParam ? { measuredRuns: Number(measuredRunsParam) } : {}),
      },
    );
    window.__BENCHMARK_RESULT__ = result;
  } catch (error) {
    window.__BENCHMARK_ERROR__ = error instanceof Error ? error.message : String(error);
  }
}

void main();
