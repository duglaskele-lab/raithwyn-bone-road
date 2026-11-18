import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LUCYB, TYPES } from '../src/config.js';
import { APP, G, P } from '../src/state.js';
import { pressed } from '../src/input.js';
import { spawn } from '../src/enemies.js';
import { breakProp, hurtEnemy } from '../src/combat.js';
import { update } from '../src/world.js';
import { camTo, pathAt, pathPx, startLevel } from '../src/level.js';
import { WAVES2 } from '../src/level2.js';
import { waveSpawns } from '../src/waves.js';
import '../src/foes/index.js';
import { DT, freshGame } from './helpers.js';

const L = LUCYB,
  R = LUCYB.rig;
beforeEach(() => {
  freshGame();
  startLevel(2);
  G.banner = null;
  G.waveI = WAVES2.length - 1;
  const d = pathPx(WAVES2.at(-1).s);
  camTo(d);
  const c = pathAt(d);
  Object.assign(P, { x: G.cam + 200, y: c.y, inv: 0, face: 1 });
  G.props = [];
});
const step = (s, each) => {
  for (let i = 0; i < s / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.(i);
  }
};
/** Lucy, `dx` to her right, standing ready; the fight held on. */
function lucy(dx = 400, extra = {}) {
  const e = spawn('lucyboss', 1);
  Object.assign(e, { x: P.x + dx, y: P.y, state: 'lthink', t: 0 }, extra);
  if (!extra.barrels) G.props = [];
  G.wave = { sp: [['lucyboss', 1, 0]], t: 0 };
  G.wave.sp[0].done = true;
  return e;
}

test('Old Quarry ends with Lucy for anyone else, with the Prospector for Lucy herself', () => {
  P.who = 'raithwyn';
  assert.equal(waveSpawns(WAVES2.length - 1)[0][0], 'lucyboss');
  P.who = 'tiger';
  assert.equal(waveSpawns(WAVES2.length - 1)[0][0], 'lucyboss');
  P.who = 'lucy';
  assert.equal(waveSpawns(WAVES2.length - 1)[0][0], 'prospector');
});

test('she walks in and three whiskey barrels stand in the arena', () => {
  const e = spawn('lucyboss', 1);
  assert.equal(e.state, 'lenter');
  assert.equal(G.props.filter((u) => u.decor === 'whiskey').length, 3);
  assert.equal(hurtEnemy(e, 10, 1, false, 'punch'), false, 'untouchable as she walks in');
});

test('her pistol: she aims along the lane, fires; seven rounds, then she reloads, open', () => {
  P.inv = 99;
  const e = lucy(400, { shotCd: 0 });
  let shots = 0;
  step(12, () => {
    if (e.state === 'lfire' && e.t === 0) shots++;
    if (e.state === 'lreload') return;
    e.nadeCd = 99;
    P.inv = 99;
  });
  assert.ok(G.projs.some((q) => q.k === 'rbolt') || shots > 0);
  // empty: she reloads, standing still; a blow does more and does not stop her
  Object.assign(e, { state: 'lthink', rounds: 0, t: 0 });
  step(DT);
  assert.equal(e.state, 'lreload');
  const hp = e.hp;
  e.x = P.x + 60;
  hurtEnemy(e, 10, 1, false, 'punch');
  assert.equal(e.state, 'lreload', 'not stopped');
  assert.ok(Math.abs(hp - e.hp - 10 * L.open) < 0.01, 'more harm');
  step(L.gun.reload + 0.1);
  assert.equal(e.rounds, L.gun.rounds);
});

test('a blow coming up close: she flips back out of reach (not while reloading)', () => {
  const e = lucy(90, { shotCd: 9, nadeCd: 9, evadeCd: 0 });
  P.state = 'atk1';
  P.t = 0;
  step(DT * 2);
  assert.equal(e.state, 'levade');
  assert.equal(hurtEnemy(e, 10, 1, false, 'punch'), false, 'untouchable in the flip');
  step(L.evade.t + 0.1);
  assert.ok(Math.abs(e.x - P.x) > 150);
  // reloading, she stays put
  Object.assign(e, { state: 'lreload', t: 0, x: P.x + 90, evadeCd: 0 });
  P.state = 'atk1';
  P.t = 0;
  step(DT * 2);
  assert.equal(e.state, 'lreload');
});

test('at LUCYB.phase2 she calls up the rig and climbs in; its armour takes the blows, its back twice', () => {
  P.inv = 99;
  const e = lucy(300, { shotCd: 9, nadeCd: 9 });
  hurtEnemy(e, e.T.hp * (1 - L.phase2) + 1, 1, true, 'super');
  step(2.2, () => (P.inv = 99));
  assert.equal(e.phase, 2);
  assert.equal(e.state, 'lcall');
  assert.ok(e.rig && !e.rig.on);
  step(6, () => (P.inv = 99));
  assert.ok(e.rig.on, 'aboard');
  const hp = e.hp,
    arm = e.rig.hp;
  // from in front
  e.face = -1;
  P.x = e.x - 100;
  hurtEnemy(e, 20, 1, false, 'punch');
  assert.equal(e.hp, hp, 'her health untouched');
  assert.equal(e.rig.hp, arm - 20);
  // from behind: the boiler
  P.x = e.x + 100;
  hurtEnemy(e, 20, -1, false, 'punch');
  assert.equal(e.rig.hp, arm - 20 - 20 * R.back);
});

test('wrecked, the rig throws her out: the last stand, two barrels more', () => {
  P.inv = 99;
  const e = lucy(300, { phase: 2, w: 80, barrels: true });
  e.rig = { x: e.x, y: e.y, hp: 5, on: true };
  e.state = 'rthink';
  const hp = e.hp;
  hurtEnemy(e, 10, 1, false, 'punch');
  assert.equal(e.state, 'rwreck');
  step(1.3, () => (P.inv = 99));
  assert.equal(e.rig, null);
  assert.equal(e.phase, 3);
  assert.equal(e.hp, hp - R.eject);
  assert.equal(G.props.filter((u) => u.decor === 'whiskey' && !u.dead).length, 3 + 2);
});

test('in the last stand she fans the hammer: three shots in a row', () => {
  P.inv = 99;
  const e = lucy(400, { phase: 3, shotCd: 0, nadeCd: 99, buckCd: 99, kickCd: 99 });
  step(L.gun.aim3 + L.gun.fanGap * 3 + 0.1, () => (P.inv = 99));
  assert.equal(e.rounds, L.gun.rounds - L.gun.fan);
});

test('her luck, once: a blow that would finish her in the last stand leaves her some health', () => {
  const e = lucy(200, { phase: 3 });
  hurtEnemy(e, 9999, 1, true, 'punch');
  assert.ok(!e.dying);
  assert.equal(e.hp, Math.round(TYPES.lucyboss.hp * L.luck));
  step(0.3);
  hurtEnemy(Object.assign(e, { state: 'lthink' }), 9999, 1, true, 'punch');
  assert.ok(e.dying, 'not twice');
});

test('whiskey: a barrel broken by her makes her tipsy; so does a spill under her feet; open', () => {
  const e = lucy(300, { shotCd: 9, nadeCd: 9, barrels: true });
  const u = G.props.find((p) => p.decor === 'whiskey');
  e.x = u.x + 40;
  e.y = u.y;
  breakProp(u, 1);
  assert.equal(e.state, 'ltipsy');
  step(L.tipsy + 0.1);
  assert.notEqual(e.state, 'ltipsy');
  // a spill under her feet
  G.spills = [{ x: e.x, y: e.y, t: 0 }];
  Object.assign(e, { state: 'lthink', t: 0 });
  step(DT * 2);
  assert.equal(e.state, 'ltipsy');
  const hp = e.hp;
  hurtEnemy(e, 10, 1, true, 'punch');
  assert.equal(e.state, 'ltipsy', 'a blow does not stop her reeling');
  assert.ok(hp - e.hp > 10);
});

test('beaten, she falls, the arena is cleared and the stage is won', () => {
  const e = lucy(200, { phase: 3, lucked: true });
  hurtEnemy(e, 9999, 1, true, 'punch');
  assert.equal(e.state, 'ldie');
  step(0.3);
  assert.equal(APP.state, 'win');
  step(L.dieT + 2);
  assert.ok(e.dead);
});
