import { useMemo } from 'react';
import type { BenchmarkStatus } from './BenchmarkPanel.types';
import { isDatasetSizeSelectable, isRunDisabled } from './BenchmarkPanel.utils';
import type { ScenarioId } from '../../types/benchmark.types';

export function useBenchmarkPanel(scenarioId: ScenarioId, status: BenchmarkStatus) {
  const showDatasetSize = useMemo(() => isDatasetSizeSelectable(scenarioId), [scenarioId]);
  const runDisabled = useMemo(() => isRunDisabled(status), [status]);
  return { showDatasetSize, runDisabled };
}
