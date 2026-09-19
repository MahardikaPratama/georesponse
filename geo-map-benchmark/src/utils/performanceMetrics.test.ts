import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregate } from './performanceMetrics.ts';

test('aggregate computes mean, min, and max correctly', () => {
  const stats = aggregate([10, 20, 30, 40, 50]);
  assert.equal(stats.mean, 30);
  assert.equal(stats.min, 10);
  assert.equal(stats.max, 50);
  assert.equal(stats.sampleCount, 5);
});

test('aggregate computes median for an odd-length sample', () => {
  const stats = aggregate([5, 1, 3]);
  assert.equal(stats.median, 3);
});

test('aggregate computes median for an even-length sample', () => {
  const stats = aggregate([1, 2, 3, 4]);
  assert.equal(stats.median, 2.5);
});

test('aggregate computes standard deviation correctly', () => {
  const stats = aggregate([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.ok(Math.abs(stats.stdDev - 2) < 1e-9);
});

test('aggregate throws on an empty sample set rather than fabricating a result', () => {
  assert.throws(() => aggregate([]));
});
