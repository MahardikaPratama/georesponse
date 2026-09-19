import type { AggregatedMetric } from '../../types/benchmark.types';
import { DECIMAL_PLACES } from './MetricPanel.constants.ts';

export function formatMetric(metric: AggregatedMetric | undefined, unit: string): string {
  if (!metric) return '—';
  return `${metric.median.toFixed(DECIMAL_PLACES)} ${unit} (mean ${metric.mean.toFixed(DECIMAL_PLACES)})`;
}
