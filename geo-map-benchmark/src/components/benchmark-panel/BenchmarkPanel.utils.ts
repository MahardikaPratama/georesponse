import type { BenchmarkStatus } from './BenchmarkPanel.types';
import type { ScenarioId } from '../../types/benchmark.types';

/** Only S06 (Large Dataset) defines multiple dataset-size levels. */
export function isDatasetSizeSelectable(scenarioId: ScenarioId): boolean {
  return scenarioId === 'S06';
}

export function isRunDisabled(status: BenchmarkStatus): boolean {
  return status === 'running';
}
