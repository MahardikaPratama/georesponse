import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMetric } from './MetricPanel.utils.ts';

test('formatMetric renders median and mean with the configured precision', () => {
  const text = formatMetric(
    { mean: 12.3456, median: 11.1, min: 10, max: 14, stdDev: 1, sampleCount: 10 },
    'ms',
  );
  assert.equal(text, '11.10 ms (mean 12.35)');
});

test('formatMetric renders an em dash when the metric is absent', () => {
  assert.equal(formatMetric(undefined, 'ms'), '—');
});
