import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { BREAKER, TYPES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { spawn } from '../src/enemies.js';
import { hurtEnemy } from '../src/combat.js';
import { update } from '../src/world.js';
import { camTo, pathAt, startLevel } from '../src/level.js';
import { WAVES3 } from '../src/level3.js';
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
const boss = (dx, extra = {}) => {
  const e = spawn('breaker', 1, P.x + dx, P.y);
  Object.assign(
    e,
    {
      state: 'chase',
      t: 0,
      face: -1,
      cd: 99,
      leapCd: 99,
      fisCd: 99,
      rushCd: 99,
      hopCd: 99,
      slamCd: 99,
    },
    extra,
  );
  return e;
};

test('the breaker android waits in the metro: a mini-boss, before the avenue', () => {
  const w = WAVES3.find((v) => v.sp?.[0]?.[0] === 'breaker');
  assert.ok(w && w.boss && !w.final);
  assert.ok(TYPES.breaker.bigBoss);
});

test('it leaps at her and lands where she stood, in a ring of shock', () => {
  const e = boss(400, { leapCd: 0 });
  const x0 = P.x;
  update(DT);
  assert.equal(e.state, 'bcrouch');
  assert.ok(Math.abs(e.tx - x0) < 1, 'the spot under her is marked');
  let thrown = false;
  step(BREAKER.leap.wind + BREAKER.leap.air + 0.2, () => (thrown = thrown || P.state === 'ko'));
  assert.ok(thrown, 'thrown by the shock');
  assert.ok(Math.abs(e.x - x0) < 5, 'it came down where she stood');
});

test('in the air nothing stops it (an unstoppable move)', () => {
  const e = boss(400, { leapCd: 0 });
  step(BREAKER.leap.wind + 0.2);
  assert.equal(e.state, 'bleap');
  hurtEnemy(e, 30, 1, true, 'punch');
  assert.equal(e.state, 'bleap');
});

test('the fissure runs along her lane: in it she is thrown; out of the lane, not', () => {
  const e = boss(380, { fisCd: 0 });
  update(DT);
  assert.equal(e.state, 'bpound');
  const hp = P.hp;
  step(BREAKER.fissure.wind + 1);
  assert.ok(P.hp < hp, 'thrown');
  // again, out of its lane
  P.inv = 0;
  P.state = 'idle';
  const e2 = boss(380, { fisCd: 0 });
  e.dead = true;
  update(DT);
  assert.equal(e2.state, 'bpound');
  P.y -= 60;
  const hp2 = P.hp;
  step(BREAKER.fissure.wind + 1);
  assert.equal(P.hp, hp2, 'out of the lane');
});

test('at half health: three fissures, and it gets quicker', () => {
  const e = boss(380, { fisCd: 0 });
  e.hp = TYPES.breaker.hp * 0.4;
  update(DT);
  assert.ok(e.phase2);
  assert.equal(e.state, 'bpound');
  P.y -= BREAKER.fissure.lanes; // into the side lane
  const hp = P.hp;
  step(BREAKER.fissure.wind / BREAKER.p2speed + 1);
  assert.ok(P.hp < hp, 'the side fissure reaches her');
});

test('the rocket fist charges straight through her', () => {
  const e = boss(400, { rushCd: 0 });
  update(DT);
  assert.equal(e.state, 'brwind');
  let thrown = false;
  step(BREAKER.rush.wind + 1, () => (thrown = thrown || P.state === 'ko'));
  assert.ok(thrown);
  assert.ok(e.x < P.x, 'past her');
});

test('close up: a hop back at once to the roomier side, a sumo stance, the fist driven at her', () => {
  // her on its left, the screen's left edge close behind her: it hops away to the right
  const e = boss(150, { hopCd: 0 });
  update(DT);
  assert.equal(e.state, 'bhop', 'no wind-up before the hop');
  assert.ok(e.hx > e.x0 + 200, 'back, away from her');
  step(BREAKER.hop.air + 0.05);
  assert.equal(e.state, 'bhprep', 'the stance after it');
  const wind = BREAKER.hop.wind / BREAKER.p1speed;
  step(wind - 0.12);
  assert.equal(e.state, 'bhprep', 'the stance lasts its time');
  let thrown = false,
    far = 0;
  step(1, () => {
    far = Math.max(far, e.x - P.x);
    thrown = thrown || P.state === 'ko';
  });
  assert.ok(far > 300, 'it got its distance');
  assert.ok(thrown, 'the fist lands');
});

test('its attacks are a tenth slower in the first phase, a fifth slower in the second', () => {
  const e = boss(400);
  update(DT);
  assert.ok(Math.abs(e.T.wind - TYPES.breaker.wind / 0.9) < 1e-9);
  e.hp = e.T.hp * 0.4;
  update(DT);
  assert.ok(Math.abs(e.speedK - 1.3 * 0.8) < 1e-9);
  assert.ok(Math.abs(e.T.wind - TYPES.breaker.wind / 1.04) < 1e-9);
  assert.equal(TYPES.breaker.hp, 720, 'a fifth less health than its 900');
});

test('with no room behind it, it hops over her to the other side', () => {
  const e = boss(-150, { hopCd: 0, face: 1 });
  e.x = G.cam + 120;
  P.x = G.cam + 270;
  update(DT);
  assert.equal(e.state, 'bhop');
  assert.ok(e.hx > P.x, 'over her: it lands on her far side');
});

test('its second phase: a leap out of sight, its mark following her, then a wide slam', () => {
  const e = boss(200, { slamCd: 0, phase2: true });
  e.hp = e.T.hp * 0.4;
  P.inv = 0;
  update(DT);
  assert.equal(e.state, 'bsprep');
  step(BREAKER.slam.wind + BREAKER.slam.up + 0.05);
  assert.equal(e.state, 'bsup');
  assert.ok(e.z > 500, 'high up');
  assert.equal(hurtEnemy(e, 10, 1, true, 'punch'), false, 'out of reach up there');
  // she moves; the mark follows her
  P.x += 150;
  let thrown = false,
    px = 0;
  step(BREAKER.slam.track + BREAKER.slam.fall + 0.1, () => {
    if (e.state === 'bsfall') px = P.x;
    thrown = thrown || P.state === 'ko';
  });
  assert.ok(Math.abs(e.x - px) < 40, 'it came down on her');
  assert.ok(thrown, 'the shock throws her');
});

test('the sky slam is a second-phase move only', () => {
  const e = boss(200, { slamCd: 0 });
  update(DT);
  assert.notEqual(e.state, 'bsprep');
});

test('beaten, it bursts and the fight is over (the others with it); food drops', () => {
  const e = boss(200);
  const g = spawn('guard', 1, P.x + 300, P.y);
  hurtEnemy(e, 9999, 1, true, 'punch');
  assert.ok(e.dead);
  assert.ok(g.dead, 'the others too');
  assert.ok(G.items.some((it) => it.kind === 'hp'));
});
