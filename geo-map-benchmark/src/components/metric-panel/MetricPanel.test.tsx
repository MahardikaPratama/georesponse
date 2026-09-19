import { afterEach, describe, expect, test } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MetricPanel } from './MetricPanel';
import type { ScenarioResult } from '../../types/benchmark.types';

// See BenchmarkPanel.test.tsx for why cleanup is called explicitly.
afterEach(cleanup);

function buildResult(overrides: Partial<ScenarioResult> = {}): ScenarioResult {
  return {
    scenarioId: 'S02',
    libraryId: 'leaflet',
    featureCount: 1000,
    warmupRuns: 3,
    measuredRuns: 10,
    raw: [],
    duration: { mean: 15, median: 14, min: 10, max: 20, stdDev: 2, sampleCount: 10 },
    fps: { mean: 60, median: 60, min: 58, max: 61, stdDev: 1, sampleCount: 10 },
    memoryUsedMb: { mean: 9, median: 9, min: 8, max: 10, stdDev: 0.5, sampleCount: 10 },
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    failed: false,
    ...overrides,
  };
}

describe('MetricPanel', () => {
  test('shows an empty-state message when there are no results', () => {
    render(<MetricPanel results={[]} />);
    expect(screen.getByText(/no results yet/i)).toBeInTheDocument();
  });

  test('renders one row per result with library, scenario, and duration', () => {
    render(<MetricPanel results={[buildResult()]} />);
    expect(screen.getByText('leaflet')).toBeInTheDocument();
    expect(screen.getByText('S02')).toBeInTheDocument();
    expect(screen.getByText(/14\.00 ms/)).toBeInTheDocument();
  });

  test('marks a failed result as FAILED with its reason instead of hiding it', () => {
    render(
      <MetricPanel
        results={[buildResult({ failed: true, failureReason: 'WebGL context lost' })]}
      />,
    );
    expect(screen.getByText(/FAILED: WebGL context lost/)).toBeInTheDocument();
  });

  test('renders multiple results as multiple rows', () => {
    render(
      <MetricPanel
        results={[
          buildResult({ libraryId: 'leaflet' }),
          buildResult({ libraryId: 'openlayers' }),
          buildResult({ libraryId: 'maplibre' }),
        ]}
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 data rows
  });
});
