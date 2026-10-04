import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CHAIN_GAP, HADO, RAGE, RL, TYPES, WAVES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { spawn } from '../src/enemies.js';
import { hitPlayer } from '../src/combat.js';
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

test('a tap of L throws a level I dark ball; holding it charges it up', () => {
  // a tap: level I, 100 rage, whatever the bar holds
  P.rage = 300;
  pressed.hado = true;
  step(1);
  assert.equal(P.hl, 1);
  assert.equal(P.rage, 200);
  // held: level II after one step, level III after two, as far as the rage reaches
  for (const [rage, hold, lv] of [
    [300, HADO.step * 2 + 0.1, 3],
    [300, HADO.step + 0.1, 2],
    [250, HADO.step * 2 + 0.3, 2],
  ]) {
    freshGame();
    P.rage = rage;
    pressed.hado = true;
    keys.hado = true;
    step(hold);
    assert.equal(P.state, 'hcharge');
    assert.equal(P.rage, rage, 'nothing spent while charging');
    delete keys.hado;
    step(1);
    assert.equal(P.hl, lv, `${rage} rage held ${hold} s`);
    assert.equal(P.rage, rage - RL[lv - 1]);
    assert.ok(G.projs.some((q) => q.k === 'hado' && q.lv === lv) || P.state !== 'hado');
  }
});

test('a hit while charging costs no rage', () => {
  P.rage = 300;
  pressed.hado = true;
  keys.hado = true;
  step(0.3);
  hitPlayer(5, 1, false);
  delete keys.hado;
  step(0.5);
  assert.equal(P.rage, 300, 'nothing spent (the bar was already full)');
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
