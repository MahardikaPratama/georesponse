import { formatMetric } from './MetricPanel.utils';
import type { MetricPanelProps } from './MetricPanel.types';

/** Presentational table of aggregated scenario results (CLAUDE.md section 8). */
export function MetricPanel({ results }: MetricPanelProps) {
  if (results.length === 0) {
    return (
      <section className="metric-panel" aria-label="Benchmark results">
        <p>No results yet. Run a scenario to see measurements here.</p>
      </section>
    );
  }

  return (
    <section className="metric-panel" aria-label="Benchmark results">
      <table>
        <thead>
          <tr>
            <th>Library</th>
            <th>Scenario</th>
            <th>Dataset</th>
            <th>Duration</th>
            <th>FPS</th>
            <th>Memory</th>
            <th>Runs</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr key={`${result.libraryId}-${result.scenarioId}-${result.datasetSize ?? 'default'}-${index}`}>
              <td>{result.libraryId}</td>
              <td>{result.scenarioId}</td>
              <td>
                {result.datasetSize ?? '—'} ({result.featureCount} features)
              </td>
              <td>{formatMetric(result.duration, 'ms')}</td>
              <td>{formatMetric(result.fps, 'fps')}</td>
              <td>{formatMetric(result.memoryUsedMb, 'MB')}</td>
              <td>
                {result.warmupRuns}+{result.measuredRuns}
              </td>
              <td>{result.failed ? `FAILED: ${result.failureReason ?? 'unknown'}` : 'ok'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
