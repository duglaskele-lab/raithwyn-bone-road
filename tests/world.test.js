import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CHAIN_GAP, HADO, RAGE, RL, TYPES, WAVES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { spawn } from '../src/enemies.js';
import { update } from '../src/world.js';
import { DT, allFinite, freshGame } from './helpers.js';

beforeEach(freshGame);

// Mirrors the real frame loop: one update, then the "just pressed" flags are cleared.
const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.(i);
  }
};

test('walking right reaches the first fight and locks the camera there', () => {
  keys.r = true;
  step(8, () => (P.inv = 1));
  assert.equal(G.cam, WAVES[0].x);
  assert.ok(G.wave, 'the first wave should be running');
  assert.ok(G.enemies.length > 0);
});

test('every enemy type can fight for 20 seconds without breaking the simulation', () => {
  for (const type of Object.keys(TYPES)) {
    freshGame();
    P.x = 480;
    spawn(type, 1, 700, 450);
    step(20, () => (P.hp = 100));
    assert.ok(allFinite(P, ['x', 'y', 'z', 'hp', 'rage']), `player state after ${type}`);
    for (const e of G.enemies) assert.ok(allFinite(e, ['x', 'y', 'z', 'hp']), type);
  }
});

test('jumping and punching in the air is allowed once per jump', () => {
  pressed.jump = true;
  step(0.2);
  assert.equal(P.state, 'jump');
  pressed.atk = true;
  step(0.05);
  assert.equal(P.airUsed, 1);
  assert.equal(P.an[0], 'punch2');
  step(1);
  assert.equal(P.state, 'idle');
  assert.equal(P.z, 0);
});

// One key pressed and let go: held for a frame, as fast as a quick hand.
const tapKey = (k) => {
  keys[k] = pressed[k] = true;
  step(DT);
  delete keys[k];
  step(0.05);
};

test('a tap of L always throws a level I dark ball', () => {
  for (const rage of [300, 150]) {
    freshGame();
    P.rage = rage;
    pressed.hado = true;
    keys.hado = true;
    step(DT);
    assert.equal(P.state, 'hado', 'straight into the throw, no charging');
    step(1); // held on: nothing more
    delete keys.hado;
    assert.equal(P.hl, 1);
    assert.equal(P.rage, rage - 100);
  }
});

test('S S D L / S S A L throws the strongest dark ball the rage pays for', () => {
  assert.equal(HADO.motion, 0.8);
  for (const [rage, dir, lv] of [
    [300, 'r', 3],
    [300, 'l', 3],
    [250, 'r', 2],
    [150, 'l', 1],
  ]) {
    freshGame();
    P.rage = rage;
    P.face = dir === 'r' ? -1 : 1; // facing away: the motion turns her
    for (const k of ['d', 'd', dir, 'hado']) tapKey(k);
    step(1);
    assert.equal(P.hl, lv, `${rage} rage, ${dir}`);
    assert.equal(P.rage, rage - RL[lv - 1]);
    assert.equal(P.face, dir === 'r' ? 1 : -1);
  }
  // a broken or a slow motion is a plain L
  for (const [ks, wait] of [
    [['d', 'r', 'd'], 0],
    [['d', 'd', 'u'], 0],
    [['d', 'd', 'r'], 1],
  ]) {
    freshGame();
    P.rage = 300;
    for (const k of ks) tapKey(k);
    step(wait);
    tapKey('hado');
    step(1);
    assert.equal(P.hl, 1, ks.join(' ') + (wait ? ' slowly' : ''));
    assert.equal(P.rage, 200);
  }
});

test('the level can be finished: clearing all ten fights ends in victory', () => {
  keys.r = true;
  step(400, () => {
    P.inv = 1;
    for (const e of G.enemies) if (e.state !== 'rise') e.dead = true;
  });
  assert.equal(G.waveI, WAVES.length);
  assert.equal(G.state, 'win');
});

test('a chained wave starts right where the last one ended, with no walk in between', () => {
  const i = WAVES.findIndex((w) => w.chain);
  assert.ok(i > 0);
  G.waveI = i - 1;
  G.cam = WAVES[i - 1].x;
  G.wave = { sp: [], t: 0 };
  G.enemies = [];
  step(DT);
  assert.equal(G.waveI, i);
  assert.ok(G.wave, 'the next wave is already running');
  assert.equal(G.cam, WAVES[i].x);
  step(CHAIN_GAP + 0.1);
  assert.ok(G.enemies.length > 0, 'and its first enemy is out');
});

test('a slide across the dark ball button (touch) throws the strongest ball that way', () => {
  for (const [k, face] of [
    ['hadoR', 1],
    ['hadoL', -1],
  ]) {
    freshGame();
    P.rage = 300;
    P.face = -face;
    pressed[k] = true;
    step(1);
    assert.equal(P.hl, 3);
    assert.equal(P.face, face);
    assert.equal(P.rage, 0);
  }
});

test('the idle loop: one atlas frame per held pose, the poses in order and round again', async () => {
  const { FR } = await import('../src/atlas-frames.js');
  const { IDLE_HOLD } = await import('../src/config.js');
  const { idlePose } = await import('../src/player.js');
  assert.equal(FR.idle.length, IDLE_HOLD.length);
  const total = IDLE_HOLD.reduce((n, h) => n + h, 0);
  let last = -1,
    seen = 0;
  for (let k = 0; k < total; k++) {
    const i = idlePose((k + 0.5) / 24);
    if (i !== last) {
      assert.equal(i, last + 1, 'poses in order');
      seen++;
    }
    last = i;
  }
  assert.equal(seen, IDLE_HOLD.length);
  assert.equal(idlePose(total / 24 + 0.01), 0, 'round again');
});
