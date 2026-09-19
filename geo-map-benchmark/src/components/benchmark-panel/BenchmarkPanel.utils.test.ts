import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDatasetSizeSelectable, isRunDisabled } from './BenchmarkPanel.utils.ts';

test('isDatasetSizeSelectable is true only for S06', () => {
  assert.equal(isDatasetSizeSelectable('S06'), true);
  assert.equal(isDatasetSizeSelectable('S02'), false);
  assert.equal(isDatasetSizeSelectable('S07'), false);
});

test('isRunDisabled is true only while running', () => {
  assert.equal(isRunDisabled('running'), true);
  assert.equal(isRunDisabled('idle'), false);
  assert.equal(isRunDisabled('done'), false);
  assert.equal(isRunDisabled('error'), false);
});
