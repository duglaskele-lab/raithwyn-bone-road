import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ARMOR, BLAST, PROS, TYPES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { spawn } from '../src/enemies.js';
import { hurtEnemy } from '../src/combat.js';
import { update } from '../src/world.js';
import { FOES } from '../src/foes/index.js';
import { camTo, pathAt } from '../src/level.js';
import { startLevel } from '../src/level.js';
import { inFlame } from '../src/foes/prospector.js';
import { DT, freshGame } from './helpers.js';

beforeEach(freshGame);

const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    each?.(i);
  }
};
/** Old Quarry with no fight on, the player at (300, 450) and the boss at `x` facing her. */
function arena(x = 600) {
  startLevel(2);
  G.banner = null;
  G.waveI = 99;
  G.props = [];
  camTo(0);
  const c = pathAt(0);
  Object.assign(P, { x: c.x, y: c.y, inv: 0 });
  const e = spawn('prospector', 1, P.x + x - 300, P.y);
  Object.assign(e, { state: 'chase', face: -1, flameCd: 99, mortCd: 99, jumpCd: 99, cd: 99 });
  return e;
}

test('the Prospector: 1300 health, 1.3 times the power armour, heavy, a big boss', () => {
  const T = TYPES.prospector;
  assert.equal(T.hp, 1300);
  assert.ok(Math.abs(T.scale / TYPES.armor.scale - 1.3) < 0.01);
  assert.equal(T.weight, 'heavy');
  assert.equal(T.bigBoss, 1);
  assert.ok(FOES.prospector.walksIn);
});

test('only crushing blows move it, and not in its flame, mortars or jump', () => {
  const e = arena();
  hurtEnemy(e, 5, 1, true, 'punch');
  assert.equal(e.state, 'chase', 'a heavy punch does not move it');
  for (const st of ['fwind', 'flame', 'mwind', 'mortar', 'jcrouch']) {
    Object.assign(e, { state: st, t: 0.05, shots: [], shotT: 1, tick: 1, fdy: 0 });
    assert.ok(FOES.prospector.unstoppable(e), st);
    const hp = e.hp;
    hurtEnemy(e, 5, 1, true, 'hado3');
    assert.equal(e.state, st, `nothing stops its ${st}`);
    assert.equal(e.hp, hp - 5, 'though it is hurt');
  }
  Object.assign(e, { state: 'chase', t: 0 });
  assert.ok(!FOES.prospector.unstoppable(e));
  hurtEnemy(e, 5, 1, true, 'hado2');
  assert.equal(e.state, 'air', 'a crushing blow throws it while it walks');
});

test('the flame: the pilot light flares, then it burns the road in front, without a stagger', () => {
  const e = arena(560);
  Object.assign(e, { state: 'fwind', t: 0 });
  step(PROS.flame.wind + 0.05, () => (e.flameCd = 99));
  assert.equal(e.state, 'flame');
  assert.ok(inFlame(e), 'she is in it');
  const hp = P.hp;
  step(0.5);
  assert.ok(P.hp < hp, 'it burns');
  assert.ok(!['ko', 'down'].includes(P.state), 'without knocking her down');
  // behind it she is safe
  P.x = e.x + 120;
  assert.ok(!inFlame(e));
  step(PROS.flame.time);
  assert.notEqual(e.state, 'flame', 'it stops');
});

test('the mortars: a volley of shells onto marked spots round the player; they spare the boss', () => {
  const e = arena(800);
  P.inv = 99;
  Object.assign(e, { state: 'mwind', t: 0 });
  step(PROS.mortar.wind + 0.05);
  assert.equal(e.state, 'mortar');
  step(PROS.mortar.gap * (PROS.mortar.shots - 1) + 0.1);
  const shells = G.projs.filter((q) => q.k === 'shell');
  assert.equal(shells.length, PROS.mortar.shots);
  for (const q of shells) assert.ok(Math.abs(q.tx - P.x) < PROS.mortar.spread + 2);
  // one comes down on the boss himself: he takes nothing from it
  shells[0].tx = e.x;
  shells[0].ty = e.y;
  const hp = e.hp;
  step(PROS.mortar.flight + 0.1, () => (P.inv = 99));
  assert.equal(G.projs.filter((q) => q.k === 'shell').length, 0, 'all down');
  assert.equal(e.hp, hp);
  assert.ok(G.parts.some((p) => p.k === 'boom'));
  // and on the player: it knocks her down
  freshGame();
  const f = arena(800);
  Object.assign(f, { state: 'mortar', t: 0, shots: [[0, 0]], shotT: 0 });
  step(PROS.mortar.flight + 0.2);
  assert.ok(P.hp <= 100 - BLAST.mortar.dmgP * 0.99);
  assert.ok(['ko', 'down', 'getup'].includes(P.state));
});

test('the jump comes down on the player, with its own numbers', () => {
  const e = arena(700);
  P.inv = 99;
  e.jumpCd = 0;
  step(DT * 2);
  assert.equal(e.state, 'jcrouch');
  assert.ok(Math.abs(e.jx - P.x) < 2);
  step(PROS.jump.crouch + PROS.jump.air + 0.1, () => (P.inv = 99));
  assert.equal(e.state, 'jland');
  assert.notEqual(PROS.jump.rx, ARMOR.jump.rx);
});

test('at half health its helmet flies off: a zombie in goggles, faster and fiercer', () => {
  const e = arena(700);
  P.inv = 99;
  const speed = e.T.speed;
  e.hp = e.T.hp * 0.49;
  step(DT * 2);
  assert.equal(e.state, 'unmask');
  assert.ok(FOES.prospector.unstoppable(e));
  const hp = e.hp;
  hurtEnemy(e, 10, 1, true, 'punch');
  assert.equal(e.hp, hp, 'untouchable while it tears it off');
  step(0.5, () => (P.inv = 99));
  assert.ok(e.helmetOff);
  assert.ok(
    G.debris.some((d) => d.k === 'helmet'),
    'the helmet flies',
  );
  step(PROS.unmask, () => (P.inv = 99));
  assert.notEqual(e.state, 'unmask');
  assert.ok(e.T.speed > speed);
  assert.equal(TYPES.prospector.speed, speed, 'only this one is changed');
  // a fork of five shells
  Object.assign(e, { state: 'mwind', t: 0, jumpCd: 99, flameCd: 99, cd: 99 });
  step(PROS.mortar.wind + 0.02, () => (P.inv = 99));
  assert.equal(e.state, 'mortar');
  assert.equal(e.shots.length + G.projs.filter((q) => q.k === 'shell').length, PROS.mortar.shots2);
  // its flame sweeps across the road
  G.projs = [];
  Object.assign(e, { state: 'fwind', t: 0, mortCd: 99 });
  step(PROS.flame.wind + 0.05, () => (P.inv = 99));
  const d0 = e.fdy;
  assert.ok(Math.abs(d0) > 100);
  step(PROS.flame.time2 * 0.5, () => (P.inv = 99));
  assert.ok(Math.abs(e.fdy) < Math.abs(d0) * 0.3, 'over to the other side');
});

test('killed, it falls and the fight is over', () => {
  const e = arena(500);
  e.helmetOff = true;
  e.phase2 = true;
  e.hp = 3;
  hurtEnemy(e, 10, 1, true, 'punch');
  assert.ok(e.dying);
  assert.equal(e.state, 'fall');
  assert.ok(G.slow > 0, 'the boss finale');
});
