import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TYPES } from '../src/config.js';
import { spawn } from '../src/enemies.js';
import { skelPose } from '../src/skeleton.js';
import { freshGame } from './helpers.js';

beforeEach(freshGame);

const STATES = [
  'chase',
  'rise',
  'windup',
  'attack',
  'recover',
  'hurt',
  'air',
  'down',
  'getup',
  'swind',
  'lwind',
  'leap',
  'ride',
  'chwind',
  'chain',
  'pull',
  'cwind',
  'charge',
  'summon',
  'staff',
];

test('every enemy type gets a valid pose in every state', () => {
  for (const type of Object.keys(TYPES)) {
    for (const state of STATES) {
      for (const moving of [false, true]) {
        const e = spawn(type, 1, 500, 450);
        Object.assign(e, { state, moving, t: 0.2, slammed: state === 'recover' });
        const pose = skelPose(e);
        const numbers = [
          pose.lean,
          pose.head,
          pose.rot,
          pose.jaw,
          ...pose.aF,
          ...pose.aB,
          ...pose.lF,
          ...pose.lB,
        ];
        assert.ok(numbers.every(Number.isFinite), `${type} / ${state} / moving=${moving}`);
        assert.ok(pose.hipH === null || Number.isFinite(pose.hipH));
      }
    }
  }
});
