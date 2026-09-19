import { DATASET_SIZE_OPTIONS, LIBRARY_OPTIONS, SCENARIO_OPTIONS } from './BenchmarkPanel.constants';
import { useBenchmarkPanel } from './useBenchmarkPanel';
import type { BenchmarkPanelProps } from './BenchmarkPanel.types';
import type { DatasetSize, MapLibraryId, ScenarioId } from '../../types/benchmark.types';

/**
 * Presentational benchmark controls: library selection, scenario selection,
 * dataset-size selection (S06 only), run trigger, and status display
 * (CLAUDE.md section 8 - React UI responsibilities).
 */
export function BenchmarkPanel(props: BenchmarkPanelProps) {
  const {
    libraryId,
    scenarioId,
    datasetSize,
    status,
    progressLabel,
    onLibraryChange,
    onScenarioChange,
    onDatasetSizeChange,
    onRun,
  } = props;

  const { showDatasetSize, runDisabled } = useBenchmarkPanel(scenarioId, status);

  return (
    <section className="benchmark-panel" aria-label="Benchmark controls">
      <div className="benchmark-panel__field">
        <label htmlFor="library-select">Library</label>
        <select
          id="library-select"
          value={libraryId}
          onChange={(event) => onLibraryChange(event.target.value as MapLibraryId)}
          disabled={runDisabled}
        >
          {LIBRARY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="benchmark-panel__field">
        <label htmlFor="scenario-select">Scenario</label>
        <select
          id="scenario-select"
          value={scenarioId}
          onChange={(event) => onScenarioChange(event.target.value as ScenarioId)}
          disabled={runDisabled}
        >
          {SCENARIO_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {showDatasetSize ? (
        <div className="benchmark-panel__field">
          <label htmlFor="dataset-size-select">Dataset size</label>
          <select
            id="dataset-size-select"
            value={datasetSize}
            onChange={(event) => onDatasetSizeChange(event.target.value as DatasetSize)}
            disabled={runDisabled}
          >
            {DATASET_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <button type="button" onClick={onRun} disabled={runDisabled}>
        {status === 'running' ? 'Running...' : 'Run scenario'}
      </button>

      <p className="benchmark-panel__status" role="status">
        {status === 'running' && progressLabel ? progressLabel : `Status: ${status}`}
      </p>
    </section>
  );
}
