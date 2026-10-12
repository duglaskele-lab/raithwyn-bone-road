import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MECHA, TYPES } from '../src/config.js';
import { APP, G, P } from '../src/state.js';
import { pressed } from '../src/input.js';
import { spawn } from '../src/enemies.js';
import { hurtEnemy } from '../src/combat.js';
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
  Object.assign(P, { x: c.x, y: c.y, inv: 0, face: 1 });
});
const step = (s, each) => {
  for (let i = 0; i < s / DT; i++) {
    update(DT);
    each?.();
  }
};
const CDS = { cd: 99, iaiCd: 99, guardCd: 99, misCd: 99, leapCd: 99, droneCd: 99 };
const boss = (dx, extra = {}) => {
  const e = spawn('mecha', 1, P.x + dx, P.y);
  Object.assign(e, { state: 'chase', t: 0, face: -1, z: 0 }, CDS, extra);
  return e;
};

test('the mech samurai is the last fight, on the tower; it drops from the sky', () => {
  const w = WAVES3.at(-1);
  assert.ok(w.final && w.sp[0][0] === 'mecha');
  const e = spawn('mecha', 1);
  assert.equal(e.state, 'mkdrop');
  assert.ok(e.z > 300);
  let thrown = false;
  Object.assign(P, { x: e.x - 60, y: e.y });
  step(1.2, () => (thrown = thrown || P.state === 'ko'));
  assert.equal(e.z, 0);
  assert.ok(thrown, 'its landing throws her');
});

test('its iai cuts through whoever is on the line; off the line, nothing', () => {
  const e = boss(420, { iaiCd: 0 });
  update(DT);
  assert.equal(e.state, 'mkiaiw');
  let cut = false;
  step(MECHA.iai.wind + 0.8, () => (cut = cut || P.state === 'ko'));
  assert.ok(cut);
  assert.ok(e.x < P.x, 'across, past her');
  // again, she steps off the line in time
  Object.assign(P, { state: 'idle', inv: 0 });
  const e2 = boss(420, { iaiCd: 0 });
  e.dead = true;
  update(DT);
  assert.equal(e2.state, 'mkiaiw');
  P.y -= 70;
  const hp = P.hp;
  step(MECHA.iai.wind + 0.8);
  assert.equal(P.hp, hp);
});

test('its counter stance: a blow from the front rings off and it cuts back', () => {
  const e = boss(150, { state: 'mkguard', t: 0 });
  const hp = e.hp;
  assert.equal(hurtEnemy(e, 10, 1, false, 'punch'), true);
  assert.equal(e.hp, hp, 'no harm');
  assert.equal(e.state, 'mkcounter');
  let cut = false;
  step(0.6, () => (cut = cut || P.state === 'ko'));
  assert.ok(cut, 'cut back');
});

test('it never flinches; at half health missiles fall on marks round her', () => {
  const e = boss(300);
  hurtEnemy(e, 10, 1, true, 'punch');
  assert.equal(e.state, 'chase', 'no flinch');
  e.hp = TYPES.mecha.hp * 0.45;
  step(1.2);
  assert.ok(e.p2, 'the second phase');
  Object.assign(e, { state: 'chase', misCd: 0 });
  P.inv = 0;
  update(DT);
  assert.equal(e.state, 'mkmis');
  assert.equal(e.marks.length, MECHA.mis.n);
  assert.ok(
    e.marks.some((m) => Math.hypot(m.x - P.x, m.y - P.y) < 1),
    'one under her',
  );
  const hp = P.hp;
  step(MECHA.mis.fall + MECHA.mis.n * MECHA.mis.gap + 0.2);
  assert.ok(P.hp < hp, 'hit');
  assert.equal(e.hp, TYPES.mecha.hp * 0.45, 'its own missiles spare it');
});

test('at a quarter it overheats: the open core takes double harm, and iai cuts come in a run', () => {
  const e = boss(400);
  e.hp = TYPES.mecha.hp * 0.2;
  step(1.2);
  assert.ok(e.p3);
  const hp = e.hp;
  hurtEnemy(e, 10, 1, false, 'punch');
  assert.ok(Math.abs(hp - e.hp - 10 * MECHA.core) < 1e-6);
  Object.assign(e, { state: 'chase', iaiCd: 0, x: P.x + 300, y: P.y }, CDS, { iaiCd: 0 });
  Object.assign(P, { state: 'idle', z: 0, inv: 99 }); // she just watches
  G.freeze = 0; // (past the hit-stop of the blow)
  update(DT);
  assert.equal(e.state, 'mkiaiw');
  assert.ok(e.iaiLeft >= 2 && e.iaiLeft <= 4, 'three to five in a row');
  let dashes = 0,
    was = '';
  step(6, () => {
    if (e.state === 'mkiai' && was !== 'mkiai') dashes++;
    was = e.state;
  });
  assert.ok(dashes >= 3, `${dashes} cuts`);
});

test('its two drones fly beside it, part of it: they are not foes to be hit', () => {
  const e = boss(400);
  step(0.5);
  assert.equal(e.dr.length, 2);
  assert.deepEqual(
    G.enemies.map((q) => q.type),
    ['mecha'],
  );
  assert.ok(
    e.dr.every((d) => d.z > 150 && Math.abs(d.x - e.x) < 220),
    'up, beside it',
  );
});

test('the drones sweep two lanes with their beams from either side', () => {
  const e = boss(500, { droneCd: 0 });
  let hit = false;
  update(DT);
  assert.notEqual(e.dm ?? 'home', 'home', 'they attack');
  // the sweep, whichever came up
  {
    Object.assign(e, {
      dm: 'sweep',
      dmT: 0,
      dHit: [false, false],
      spots: [
        { x: P.x - 340, y: P.y, dir: 1 },
        { x: P.x + 340, y: P.y + MECHA.drone.sweep.off, dir: -1 },
      ],
    });
  }
  const hp = P.hp;
  step(MECHA.drone.sweep.aim + MECHA.drone.sweep.t, () => (hit = hit || P.hp < hp));
  assert.ok(hit, 'the beam along her lane finds her');
  step(0.2);
  assert.equal(e.dm, 'home', 'back beside it');
});

test("the drones' tripwire: along her lane; stepped out of it, she is spared", () => {
  const T = MECHA.drone.trip;
  const e = boss(500);
  Object.assign(e, { dm: 'trip', dmT: 0, dHit: [false, false], tripN: 1, ty: P.y });
  step(T.aim * T.follow + 0.05);
  P.y += 60;
  const hp = P.hp;
  step(T.aim * (1 - T.follow) + T.t);
  assert.equal(P.hp, hp, 'out of the lane');
  // and in it
  Object.assign(e, { dm: 'trip', dmT: 0, dHit: [false, false], tripN: 1, ty: P.y });
  step(T.aim + T.t);
  assert.ok(P.hp < hp, 'in the lane');
});

test('at rest it holds the sword drawn back, the blade pointing down', async () => {
  const { armPoint, skelPose } = await import('../src/skeleton.js');
  const e = boss(400);
  update(DT);
  const o = skelPose(e);
  assert.ok(o.aF[0] < 0, 'the arm back');
  const hand = armPoint(e, false, 0),
    tip = armPoint(e, false, 120);
  assert.ok(tip[1] < hand[1] - 50, 'the blade goes down');
  assert.ok((tip[0] - hand[0]) * e.face < 0, 'and back, behind it');
});

test('beaten, it kneels, then bursts; the stage is won, and with it the game', () => {
  startLevel(3);
  G.banner = null;
  G.waveI = WAVES3.length - 1;
  G.wave = { sp: [['mecha', 1, 0, 1]], t: 9 };
  G.wave.sp[0].done = true;
  const e = boss(200);
  e.wave0 = true;
  hurtEnemy(e, 99999, 1, true, 'punch');
  assert.equal(e.state, 'mkdie');
  assert.ok(e.dying && !e.dead);
  step(0.2);
  assert.equal(APP.state, 'win');
  step(MECHA.dieT + 1.5); // (the world is in slow motion a moment after the last blow)
  assert.ok(e.dead, 'burst');
  // the last stage: no next one
  pressed.atk = true;
  G.endT = 8;
  update(DT);
  assert.equal(G.level, 3);
  assert.equal(APP.state, 'win');
});

test('winning Old Quarry leads on to Midnight City, keeping score and lives', () => {
  freshGame();
  startLevel(2);
  G.waveI = WAVES3.length;
  APP.state = 'win';
  G.endT = 3;
  P.score = 4321;
  P.lives = 2;
  pressed.atk = true;
  update(DT);
  assert.equal(G.level, 3);
  assert.equal(APP.state, 'play');
  assert.equal(P.score, 4321);
  assert.equal(P.lives, 2);
});
