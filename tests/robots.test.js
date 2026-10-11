import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DRONE, NINJA, ROBOT, TYPES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { spawn, updEnemy } from '../src/enemies.js';
import { hurtEnemy, strike } from '../src/combat.js';
import { update } from '../src/world.js';
import { camTo, pathAt, startLevel } from '../src/level.js';
import { WAVEGEN3 } from '../src/level3.js';
import '../src/foes/index.js';
import { DT, freshGame } from './helpers.js';

beforeEach(() => {
  freshGame();
  startLevel(3);
  G.banner = null;
  G.waveI = 99;
  G.props = [];
  camTo(300);
  const c = pathAt(300);
  Object.assign(P, { x: c.x, y: c.y, inv: 0, face: 1 });
});
const step = (s, each) => {
  for (let i = 0; i < s / DT; i++) {
    update(DT);
    each?.();
  }
};
/** A robot of `type` `dx` in front of the player, facing her. */
function foe(type, dx = 160, extra = {}) {
  const e = spawn(type, 1, P.x + dx, P.y);
  Object.assign(e, { state: 'chase', t: 0, face: dx > 0 ? -1 : 1, cd: 99 }, extra);
  return e;
}

test("the robots come in Neon Kyoto's fights", () => {
  const all = Object.values(WAVEGEN3.pools).flatMap((p) => Object.keys(p));
  for (const k of ['guard', 'catguard', 'drone', 'ninja']) assert.ok(all.includes(k), k);
  assert.ok(WAVEGEN3.pools.mid.catguard < WAVEGEN3.pools.mid.ninja, 'the guardess is rarer');
});

test("the guard's baton stuns her for a moment", () => {
  const e = foe('guard', 60);
  e.state = 'attack';
  e.t = 0;
  e.hitDone = false;
  const hp = P.hp;
  updEnemy(e, DT, { n: 0 });
  assert.equal(P.state, 'dazed');
  assert.equal(P.dazeT, ROBOT.stun);
  assert.equal(P.hp, hp - TYPES.guard.dmg);
});

test('the guardess keeps her distance and fires a plasma bolt along the road', () => {
  const e = foe('catguard', 300);
  e.state = 'windup';
  e.t = 0;
  step(TYPES.catguard.wind + 0.05);
  const q = G.projs.find((p) => p.k === 'rbolt');
  assert.ok(q, 'a bolt');
  assert.ok(q.vx < 0, 'at her');
  const hp = P.hp;
  step(1);
  assert.ok(P.hp < hp, 'it hits');
});

test('the drone: out of reach of a blow from the ground; a jump attack or a shot reaches it', () => {
  const e = foe('drone', 60);
  assert.ok(e.z >= DRONE.z - 1, 'up in the air');
  assert.equal(e.state, 'chase');
  e.state = 'dhover';
  P.hit = new Set();
  strike({ x0: 0, x1: 100, dy: 27, dmg: 8, knock: false, rage: 0 });
  assert.equal(e.hp, TYPES.drone.hp, 'a punch from the ground misses');
  P.z = 60;
  P.hit = new Set();
  strike({ x0: 0, x1: 100, dy: 27, dmg: 8, knock: true, rage: 0, src: 'air' });
  assert.ok(e.hp < TYPES.drone.hp, 'a jump attack hits');
  assert.ok(e.z > 100, 'it only wobbles: still up');
  P.z = 0;
  // destroyed, it spins down and bursts on the ground
  hurtEnemy(e, 99, 1, false, 'bone');
  assert.equal(e.state, 'dcrash');
  step(1);
  assert.ok(e.dead);
  assert.ok(!G.debris.some((d) => d.k === 'bone' || d.k === 'skull'), 'parts, no bones');
});

test("the drone's laser hits the marked spot, so stepping off it is enough", () => {
  const e = foe('drone', 250);
  Object.assign(e, { state: 'daim', t: 0, tx: P.x, ty: P.y });
  const hp = P.hp;
  step(DRONE.aim + DRONE.lock + 0.1);
  assert.ok(P.hp < hp, 'standing on the mark');
  // the mark has locked; she steps up the road, off it, before the laser
  Object.assign(e, { state: 'daim', t: DRONE.aim, tx: P.x, ty: P.y });
  P.inv = 0;
  P.state = 'idle';
  P.y -= 70;
  const hp2 = P.hp;
  step(DRONE.lock + 0.2);
  assert.equal(P.hp, hp2, 'off the mark');
});

test('the ninja crouches, then dashes straight through her and cuts her down', () => {
  const e = foe('ninja', 330, { dashCd: 0, guardCd: 99 });
  e.cd = 0;
  update(DT);
  assert.equal(e.state, 'ntele');
  let cut = false;
  step(NINJA.tele + 0.6, () => (cut = cut || P.state === 'ko'));
  assert.ok(cut, 'knocked down');
  assert.ok(e.x < P.x + 10, 'it went through, past her');
});

test("the ninja's stance turns her shots back; a blow up close breaks it", () => {
  const e = foe('ninja', 250, { dashCd: 99, guardCd: 0 });
  G.projs.push({ k: 'bone', x: P.x + 40, y: P.y, z: 100, vx: 700, rot: 0, life: 2 });
  update(DT);
  assert.equal(e.state, 'nguard');
  const hp = e.hp;
  assert.equal(hurtEnemy(e, 7, 1, false, 'bone'), true);
  assert.equal(e.hp, hp, 'no harm');
  const back = G.projs.find((p) => p.k === 'rbolt');
  assert.ok(back && back.vx < 0, 'turned back at her');
  hurtEnemy(e, 8, 1, false, 'punch');
  assert.ok(e.hp < hp);
  assert.notEqual(e.state, 'nguard', 'the stance broken');
});

test('a robot destroyed bursts into parts, not bones', () => {
  for (const t of ['guard', 'catguard', 'ninja']) {
    G.debris = [];
    const e = foe(t, 80);
    hurtEnemy(e, 999, 1, true, 'punch');
    assert.ok(e.dead, t);
    assert.ok(G.debris.length > 8);
    assert.ok(!G.debris.some((d) => d.k === 'bone' || d.k === 'skull'), t);
  }
});
