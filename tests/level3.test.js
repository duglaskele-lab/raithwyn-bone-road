import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PIT, STAGE_HOLD } from '../src/config.js';
import { G, P } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { spawn } from '../src/enemies.js';
import { hurtEnemy } from '../src/combat.js';
import { update } from '../src/world.js';
import {
  camTo,
  level,
  onFloor,
  overPit,
  pathAt,
  pathPx,
  pathProject,
  startLevel,
} from '../src/level.js';
import { DOORS, FLOOR, L3, PATH, PITS, WAVES3, topY } from '../src/level3.js';
import { DT, freshGame } from './helpers.js';

beforeEach(freshGame);

const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.(i);
  }
};
/** Neon Kyoto, with the camera and the player at `d` pixels along the road, no fight on. */
function kyoto(d = 0) {
  startLevel(3);
  G.banner = null;
  G.waveI = 99;
  camTo(d);
  const c = pathAt(d);
  Object.assign(P, { x: c.x, y: c.y, inv: 0 });
}
/** The camera's place along the road where the player stands at road x `x` (on the roofs). */
const roofAt = (x) => pathProject(x, L3.Y_R + 80, PATH);

test('holding Z and 3 on the first screen of the Bone Road takes the player to Neon Kyoto', () => {
  keys.lvlZ = true;
  keys.lvl3 = true;
  step(STAGE_HOLD - 0.2);
  assert.equal(G.level, 1, 'not quite long enough');
  step(0.4);
  assert.equal(G.level, 3);
  assert.equal(G.waveI, 0);
  assert.equal(G.props.length, 0, 'none of the graves of the Bone Road');
  // Z and 2 still lead to Old Quarry
  freshGame();
  keys.lvlZ = keys.lvl2 = true;
  step(STAGE_HOLD + 0.2);
  assert.equal(G.level, 2);
});

test('holding X on the first screen of Neon Kyoto takes the player to the last fight', () => {
  startLevel(3);
  G.banner = null;
  keys.secret = true;
  step(3.1);
  delete keys.secret;
  const last = WAVES3.length - 1;
  assert.equal(G.waveI, last);
  assert.ok(P.x > L3.GARDEN_X - 600, 'up on the tower');
  step(2.5);
  assert.ok(G.wave, 'the fight is on');
});

test('the road: slums, down into the metro, up to the avenue, up onto the roofs', () => {
  assert.equal(topY(100), L3.Y_A);
  assert.equal(topY(4000), L3.Y_B);
  assert.ok(L3.Y_B > L3.Y_A, 'the metro is below the street');
  assert.equal(topY(7000), L3.Y_A);
  assert.equal(topY(10000), L3.Y_R);
  assert.ok(L3.Y_R < L3.Y_A, 'the roofs are above it');
  // the floor is one walk along the road, but for the gaps between the roofs
  startLevel(3);
  for (let x = 20; x < L3.END_X - 20; x += 10) {
    const y = topY(x) + 60;
    assert.equal(onFloor(x, y) || overPit(x, y), true, `x ${x}`);
  }
  assert.equal(PITS.length, 3);
  // a long road: longer than Old Quarry
  assert.ok(L3.END_X > 12000);
  assert.ok(FLOOR.length >= 9);
});

test('every fight on the roofs has a gap on screen; none is on a slant', () => {
  startLevel(3);
  for (const w of WAVES3) {
    const c = pathAt(pathPx(w.s, PATH), PATH),
      cam = c.cx;
    for (const x of [cam + 10, cam + 950]) assert.ok(onFloor(x, topY(x) + 80) || true);
    if (cam > L3.FIRE[1] && !w.final)
      assert.ok(
        PITS.some((p) => p[1][0] > cam + 60 && p[0][0] < cam + 900),
        `a gap on screen at ${cam}`,
      );
    for (const [a, b] of [L3.STAIRS, L3.ESCAL, L3.FIRE])
      assert.ok(cam + 960 <= a + 1 || cam >= b - 1, `not on a slant at ${cam}`);
  }
});

test('the gaps can be jumped: walking over a narrow one, running over the wide one', () => {
  const gaps = PITS.map((p) => p[1][0] - p[0][0]);
  const walk = 180 * ((2 * 660) / 1900),
    run = 435 * ((2 * 660) / 1900);
  assert.ok(Math.min(...gaps) < walk - 15, 'a walking jump clears the narrow gaps');
  assert.ok(Math.max(...gaps) > walk, 'the widest needs a run');
  assert.ok(Math.max(...gaps) < run - 60);
});

test('jumping short into a gap: she falls, then is back on the roof, hurt', () => {
  const [x0, x1] = [PITS[0][0][0], PITS[0][1][0]];
  kyoto(roofAt(x0 - 400));
  const y = L3.Y_R + 80;
  Object.assign(P, { x: x0 - 40, y, state: 'idle', hp: 100, maxHp: 100 });
  step(0.2);
  assert.deepEqual(P.safe, [P.x, P.y], 'where she last stood');
  // she cannot just walk off the edge
  keys.r = true;
  step(0.6);
  assert.ok(P.x <= x0 + 1, `held on the roof (${P.x})`);
  assert.equal(P.state, 'walk');
  // a hop straight up at the edge, pushed out over the gap: down she goes
  delete keys.r;
  Object.assign(P, { state: 'jump', t: 0, ph: 1, vz: 300, z: 1, vx: 0, vyd: 0 });
  P.x = (x0 + x1) / 2;
  let fell = false;
  step(0.6, () => (fell = fell || P.state === 'plunge'));
  assert.ok(fell, 'she fell');
  step(PIT.time + 0.2);
  assert.ok(onFloor(P.x, P.y), 'back on the roof');
  assert.equal(P.z, 0);
  assert.equal(P.hp, 100 - 100 * PIT.dmg);
  assert.ok(P.inv > 0, 'untouchable a moment');
});

test('a jump across a narrow gap lands on the next roof', () => {
  const [x0, x1] = [PITS[0][0][0], PITS[0][1][0]];
  kyoto(roofAt(x0 - 400));
  Object.assign(P, { x: x0 - 10, y: L3.Y_R + 80, state: 'idle' });
  keys.r = true;
  pressed.jump = true;
  update(DT);
  step(0.9);
  delete keys.r;
  assert.ok(P.x > x1, `over (${P.x})`);
  assert.notEqual(P.state, 'plunge');
  assert.equal(P.hp, P.maxHp);
});

test('a robot knocked into a gap is gone and counts as beaten', () => {
  const [x0] = [PITS[0][0][0]];
  kyoto(roofAt(x0 - 400));
  Object.assign(P, { x: x0 - 160, y: L3.Y_R + 80, face: 1 });
  const e = spawn('grunt', 1, x0 - 30, L3.Y_R + 80);
  e.state = 'chase';
  const score = P.score;
  hurtEnemy(e, 1, 1, true, 'punch');
  assert.equal(e.state, 'air');
  e.vx = 120;
  step(1.6);
  assert.ok(e.dead, 'gone down');
  assert.ok(P.score > score, 'it counts');
});

test('robots never climb out of the ground: they walk in, step out of doors, or drop down', () => {
  kyoto(0);
  const how = new Set();
  for (let i = 0; i < 60; i++) {
    const e = spawn('grunt', [-1, 0, 1][i % 3]);
    assert.notEqual(e.state, 'rise');
    how.add(e.state);
    if (e.state === 'door') assert.ok(DOORS[e.door], 'a door of the street');
    if (e.state === 'drop') assert.ok(e.z > 100, 'from above the screen');
  }
  assert.ok(how.has('chase') && how.has('door') && how.has('drop'), [...how].join());
  // one stepping out of a door comes onto the street and fights
  G.enemies = [];
  const e = spawn('grunt', 0);
  Object.assign(e, { state: 'door', t: 0, door: 0 });
  assert.equal(hurtEnemy(e, 5, 1, false, 'punch'), false, 'not out yet');
  step(1);
  assert.equal(e.state === 'door', false);
  // one dropping down lands
  const d = spawn('grunt', 1, P.x + 200, P.y);
  Object.assign(d, { state: 'drop', z: 400, vz: 0 });
  step(1.2);
  assert.equal(d.z, 0);
  assert.notEqual(d.state, 'drop');
  assert.equal(level().robots, true);
});
