import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePointFeatures, generatePolygonFeatures } from './featureGenerator.ts';

test('generatePointFeatures returns the requested feature count', () => {
  const collection = generatePointFeatures(250);
  assert.equal(collection.features.length, 250);
  assert.equal(collection.type, 'FeatureCollection');
});

test('generatePointFeatures is deterministic for a fixed seed', () => {
  const a = generatePointFeatures(50, 7);
  const b = generatePointFeatures(50, 7);
  assert.deepEqual(a, b);
});

test('generatePointFeatures produces different datasets for different seeds', () => {
  const a = generatePointFeatures(50, 1);
  const b = generatePointFeatures(50, 2);
  assert.notDeepEqual(a, b);
});

test('generatePolygonFeatures returns closed rings with the requested count', () => {
  const collection = generatePolygonFeatures(30);
  assert.equal(collection.features.length, 30);
  for (const feature of collection.features) {
    const ring = feature.geometry.coordinates[0]!;
    assert.deepEqual(ring[0], ring[ring.length - 1], 'ring must be closed');
    assert.equal(ring.length, 5);
  }
});

test('generatePolygonFeatures is deterministic for a fixed seed', () => {
  const a = generatePolygonFeatures(20, 3);
  const b = generatePolygonFeatures(20, 3);
  assert.deepEqual(a, b);
});
