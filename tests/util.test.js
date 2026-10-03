import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, ease, lerp, mulberry, tl } from '../src/util.js';

test('clamp keeps a value inside its range', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
});

test('lerp and ease hit their end points', () => {
  assert.equal(lerp(10, 20, 0), 10);
  assert.equal(lerp(10, 20, 1), 20);
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.equal(ease(0.5), 0.5);
});

test('tl maps elapsed time to a frame index and reports the end with -1', () => {
  const durations = [0.1, 0.2, 0.1];
  assert.equal(tl(durations, 0), 0);
  assert.equal(tl(durations, 0.15), 1);
  assert.equal(tl(durations, 0.35), 2);
  assert.equal(tl(durations, 0.5), -1);
});

test('mulberry is deterministic for a given seed', () => {
  const a = mulberry(42);
  const b = mulberry(42);
  for (let i = 0; i < 5; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});
