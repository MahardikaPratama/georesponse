import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BenchmarkPanel } from './BenchmarkPanel';
import type { BenchmarkPanelProps } from './BenchmarkPanel.types';

// @testing-library/react's automatic afterEach cleanup relies on the test
// framework's global `afterEach`; this project runs Vitest with
// `globals: false` (to keep test globals explicit), so cleanup is called
// manually instead.
afterEach(cleanup);

function baseProps(overrides: Partial<BenchmarkPanelProps> = {}): BenchmarkPanelProps {
  return {
    libraryId: 'leaflet',
    scenarioId: 'S01',
    datasetSize: 'medium',
    status: 'idle',
    progressLabel: null,
    onLibraryChange: vi.fn(),
    onScenarioChange: vi.fn(),
    onDatasetSizeChange: vi.fn(),
    onRun: vi.fn(),
    ...overrides,
  };
}

describe('BenchmarkPanel', () => {
  test('renders library and scenario selects with the current values', () => {
    render(<BenchmarkPanel {...baseProps()} />);
    expect(screen.getByLabelText('Library')).toHaveValue('leaflet');
    expect(screen.getByLabelText('Scenario')).toHaveValue('S01');
  });

  test('hides the dataset-size select unless the scenario is S06', () => {
    const { rerender } = render(<BenchmarkPanel {...baseProps({ scenarioId: 'S02' })} />);
    expect(screen.queryByLabelText('Dataset size')).not.toBeInTheDocument();

    rerender(<BenchmarkPanel {...baseProps({ scenarioId: 'S06' })} />);
    expect(screen.getByLabelText('Dataset size')).toBeInTheDocument();
  });

  test('calls onRun when the run button is clicked', () => {
    const onRun = vi.fn();
    render(<BenchmarkPanel {...baseProps({ onRun })} />);
    fireEvent.click(screen.getByRole('button', { name: /run scenario/i }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  test('disables controls and shows the progress label while running', () => {
    render(
      <BenchmarkPanel
        {...baseProps({ status: 'running', progressLabel: 'Running measured run 2 of 10...' })}
      />,
    );
    expect(screen.getByRole('button', { name: /running/i })).toBeDisabled();
    expect(screen.getByLabelText('Library')).toBeDisabled();
    expect(screen.getByText('Running measured run 2 of 10...')).toBeInTheDocument();
  });

  test('calls onLibraryChange when a different library is selected', () => {
    const onLibraryChange = vi.fn();
    render(<BenchmarkPanel {...baseProps({ onLibraryChange })} />);
    fireEvent.change(screen.getByLabelText('Library'), { target: { value: 'maplibre' } });
    expect(onLibraryChange).toHaveBeenCalledWith('maplibre');
  });
});
