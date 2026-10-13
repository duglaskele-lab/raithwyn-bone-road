import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CRAB } from '../src/config.js';
import { APP, G, P } from '../src/state.js';
import { pressed } from '../src/input.js';
import { spawn } from '../src/enemies.js';
import { hurtEnemy, strike } from '../src/combat.js';
import { update } from '../src/world.js';
import { camTo, pathAt, pathPx, startLevel } from '../src/level.js';
import { PATH, WAVES3 } from '../src/level3.js';
import '../src/foes/index.js';
import { DT, freshGame } from './helpers.js';

beforeEach(() => {
  freshGame();
  startLevel(3);
  G.banner = null;
  G.waveI = 99;
  G.props = [];
  const d = pathPx(WAVES3.at(-1).s, PATH);
  camTo(d);
  const c = pathAt(d, PATH);
  Object.assign(P, { x: G.cam + 200, y: c.y, inv: 0, face: 1 });
});
const step = (s, each) => {
  for (let i = 0; i < s / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.();
  }
};
const CDS = { slamCd: 99, sweepCd: 99, bubCd: 99, stompCd: 99, scutCd: 99, droneCd: 99 };
/** The crab standing `dx` to her right, nothing on its mind. */
const crab = (dx, extra = {}) => {
  const e = spawn('crab', 1, P.x + dx, P.y);
  Object.assign(e, { state: 'crwalk', t: 1, z: 0 }, CDS, extra);
  return e;
};
/** Was she knocked down during `s` seconds? */
const thrownIn = (s) => {
  let k = false;
  step(s, () => (k = k || P.state === 'ko'));
  return k;
};

test('the cyber crab is the last fight, on the tower; it drops from the sky', () => {
  const w = WAVES3.at(-1);
  assert.ok(w.final && w.sp[0][0] === 'crab');
  const e = spawn('crab', 1);
  assert.equal(e.state, 'crdrop');
  assert.ok(e.z > 300);
  assert.equal(e.legs.length, 6);
  step(1.5);
  assert.equal(e.z, 0);
});

test('its body is solid: she is pushed out of it, never through it; round it, along the depth, she can go', () => {
  const e = crab(400);
  P.x = e.x - 40;
  P.y = e.y;
  step(DT);
  assert.ok(Math.abs(P.x - e.x) >= CRAB.bw, 'out of its body');
  assert.ok(P.x < e.x, 'on her own side');
  // walking right into it, she gets no further
  for (let i = 0; i < 60; i++) {
    P.x += 4;
    step(DT);
  }
  assert.ok(P.x <= e.x - CRAB.bw, 'stopped at its side');
  // far enough along the road's depth, she passes
  P.y = e.y + CRAB.depth + 30;
  P.x = e.x;
  step(DT);
  assert.ok(Math.abs(P.x - e.x) < CRAB.bw, 'in front of it, not pushed out');
});

test('its legs break: blows on a leg wear it down; broken, the crab slumps and is slower', () => {
  const e = crab(330);
  e.x = P.x + CRAB.bw + 120; // her right at its left legs
  const hp = e.hp;
  let n = 0;
  while (!e.legs.some((l) => l.broken) && n++ < 40) {
    Object.assign(P, { hit: new Set(), face: 1 });
    strike({ x0: 0, x1: 122, dy: 28, dmg: 16, knock: false, rage: 0 });
    e.flash = 0;
  }
  const l = e.legs.find((q) => q.broken);
  assert.ok(l, 'a leg broke');
  assert.equal(l.s, -1, 'on her side');
  assert.equal(e.state, 'crslump');
  assert.ok(e.hp < hp - CRAB.breakDmg, 'it hurt the crab too');
  // slumped, its body takes more harm
  P.x = e.x - CRAB.bw - 40;
  Object.assign(P, { hit: new Set() });
  const legs = e.legs.filter((q) => q.s === -1 && !q.broken);
  for (const q of legs) q.broken = true; // (its other legs on her side gone too)
  const h0 = e.hp;
  strike({ x0: 0, x1: 122, dy: 28, dmg: 10, knock: false, rage: 0 });
  assert.ok(Math.abs(h0 - e.hp - 10 * CRAB.slumpMult) < 0.01, 'more harm on its slumped body');
});

test('with fewer than two legs on a side it can no longer scuttle', () => {
  const e = crab(500, { scutCd: 0 });
  e.legs[0].broken = e.legs[1].broken = true;
  step(0.1);
  assert.notEqual(e.state, 'crscutw');
  const f = crab(700, { scutCd: 0 });
  f.legs[3].broken = true;
  step(0.1);
  assert.equal(f.state, 'crscutw', 'one lost leg on a side still lets it');
});

test('the claw slam: raised over her a while, then down on the spot; out of it, she is spared', () => {
  const e = crab(CRAB.bw + 200, { slamCd: 0 });
  step(DT * 2);
  assert.equal(e.state, 'crslamw');
  step(CRAB.slam.track + 0.1);
  P.x -= 0; // she stays: hit
  assert.ok(thrownIn(CRAB.slam.wind + 0.3), 'standing under it');
  // a second time she steps away after it fixed its aim
  freshGame();
  startLevel(3);
  G.banner = null;
  G.waveI = 99;
  const d = pathPx(WAVES3.at(-1).s, PATH);
  camTo(d);
  Object.assign(P, { x: G.cam + 200, y: pathAt(d, PATH).y, inv: 0 });
  const f = crab(CRAB.bw + 200, { slamCd: 0 });
  step(CRAB.slam.track + 0.15);
  assert.equal(f.state, 'crslamw');
  P.x -= 200;
  assert.ok(!thrownIn(CRAB.slam.wind), 'out of it');
});

test('the claw sweep runs low along the ground: standing she is hit, jumping it she is not', () => {
  const e = crab(CRAB.bw + 160, { sweepCd: 0 });
  step(DT * 2);
  assert.equal(e.state, 'crsweepw');
  assert.ok(thrownIn(CRAB.sweep.wind + CRAB.sweep.strike + 0.3), 'standing');
  freshGame();
  startLevel(3);
  G.banner = null;
  G.waveI = 99;
  const d = pathPx(WAVES3.at(-1).s, PATH);
  camTo(d);
  Object.assign(P, { x: G.cam + 200, y: pathAt(d, PATH).y, inv: 0 });
  const f = crab(CRAB.bw + 160, { sweepCd: 0 });
  step(CRAB.sweep.wind - 0.15);
  assert.equal(f.state, 'crsweepw');
  pressed.jump = true;
  const hp = P.hp;
  step(CRAB.sweep.strike + 0.35);
  assert.equal(P.hp, hp, 'over it');
});

test('the stomp: close to it she is thrown by the ring of shock unless she jumps it', () => {
  const e = crab(CRAB.bw + 80, { stompCd: 0 });
  step(DT * 2);
  assert.equal(e.state, 'crstompw');
  assert.ok(e.lift > 0, 'up on its legs');
  assert.ok(thrownIn(CRAB.stomp.wind + 0.4));
});

test('the bubbles arc out onto her and burst', () => {
  const e = crab(CRAB.bw + 300, { bubCd: 0 });
  step(DT * 2);
  assert.equal(e.state, 'crbubw');
  step(CRAB.bubble.wind + 0.05);
  const q = G.projs.filter((p) => p.k === 'cbub');
  assert.equal(q.length, CRAB.bubble.n);
  const hp = P.hp;
  step(CRAB.bubble.flight + 0.3);
  assert.ok(P.hp < hp, 'one burst on her');
  assert.equal(G.projs.filter((p) => p.k === 'cbub').length, 0);
});

test('its two drones fly by its eyes and fire: two shots, four in its second phase', () => {
  const e = crab(400, { droneCd: 0 });
  step(DT * 2);
  assert.equal(e.dr.length, 2);
  assert.equal(e.shots.length, CRAB.drone.n1);
  assert.deepEqual(
    G.enemies.map((q) => q.type),
    ['crab'],
    'they are not foes to hit',
  );
  const f = crab(600, { droneCd: 0, p2: true });
  step(DT * 2);
  assert.equal(f.shots.length, CRAB.drone.n2);
});

test('at half health its second phase: a roar, then it is quicker and the slam comes twice', () => {
  const e = crab(CRAB.bw + 200);
  e.hp = e.T.hp * CRAB.p2 - 1;
  step(DT * 2);
  assert.ok(e.p2);
  assert.equal(e.state, 'crroar');
  step(1.1);
  e.slamCd = 0;
  e.t = 1;
  step(DT * 2);
  assert.equal(e.state, 'crslamw');
  P.inv = 99;
  step(CRAB.slam.wind / CRAB.p2speed + CRAB.slam.strike + CRAB.slam.hold / CRAB.p2speed + 0.05);
  assert.equal(e.state, 'crslamw', 'a second slam');
  assert.ok(e.second);
});

test('beaten, it sinks, then bursts; the stage is won, and with it the game', () => {
  startLevel(3);
  G.banner = null;
  G.waveI = WAVES3.length - 1;
  G.wave = { sp: [['crab', 1, 0, 1]], t: 9 };
  G.wave.sp[0].done = true;
  const e = crab(400);
  e.wave0 = true;
  hurtEnemy(e, 99999, 1, true, 'punch');
  assert.equal(e.state, 'crdie');
  step(0.2);
  assert.equal(APP.state, 'win');
  step(CRAB.dieT + 1.5);
  assert.ok(e.dead, 'burst');
});
