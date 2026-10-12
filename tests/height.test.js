import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HEIGHT } from '../src/config.js';
import { G, P } from '../src/state.js';
import { pressed } from '../src/input.js';
import { strike } from '../src/combat.js';
import { spawn } from '../src/enemies.js';
import { update } from '../src/world.js';
import { DRAGON, dragonZone, headHeight } from '../src/dragon.js';
import { bodyBand, meetsPlayer, playerBand, reaches } from '../src/height.js';
import { fireBolt } from '../src/foes/robot.js';
import '../src/foes/index.js';
import { DT, freshGame } from './helpers.js';

beforeEach(() => {
  freshGame();
  G.waveI = 99;
  G.wave = null;
  G.enemies = [];
  G.props = [];
  Object.assign(P, { x: 300, y: 450, face: 1, inv: 0 });
});
const step = (s, each) => {
  for (let i = 0; i < s / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.();
  }
};
/** An enemy `dx` in front of her that stands still. */
function foe(type, dx) {
  const e = spawn(type, 1, P.x + dx, P.y);
  Object.assign(e, { state: 'chase', t: 0, cd: 99, speed: 0 });
  e.T = { ...e.T, speed: 0 };
  return e;
}
/** A dark ball of level `lv` flying at height z from just in front of her. */
const ball = (lv, z) =>
  G.projs.push({ k: 'hado', lv, x: P.x + 60, y: P.y, z, vx: 660, life: 2.4, hit: new Set() });

test('everyone fills a band of heights: by its size, lower when lying, up with it in the air', () => {
  const g = foe('grunt', 200);
  assert.deepEqual(bodyBand(g), [0, HEIGHT.body * g.T.scale]);
  g.z = 100;
  assert.deepEqual(bodyBand(g), [100, 100 + HEIGHT.body * g.T.scale]);
  g.z = 0;
  g.state = 'down';
  assert.ok(bodyBand(g)[1] <= HEIGHT.down * g.T.scale);
  // never so short that a shot from the ground passes over it
  const m = foe('monkey', 300);
  assert.ok(bodyBand(m)[1] >= HEIGHT.min);
  // the heroine: her legs tucked up in a jump
  assert.deepEqual(playerBand(), [0, HEIGHT.player]);
  P.z = 100;
  assert.deepEqual(playerBand(), [100 + HEIGHT.tuck, 100 + HEIGHT.player]);
});

test('a dark ball cast at the top of a jump flies over a short enemy and hits a tall one', () => {
  const short = foe('grunt', 300),
    tall = foe('barrier', 520),
    hs = short.hp,
    ht = tall.hp;
  ball(1, 114 + 104);
  step(0.8);
  assert.equal(short.hp, hs, 'over the skeleton');
  assert.ok(tall.hp < ht, 'into the big robot');
});

test('a dark ball from the ground, and a level III one from the top of a jump, hit it', () => {
  const g = foe('grunt', 300),
    hp = g.hp;
  ball(1, 104);
  step(0.6);
  assert.ok(g.hp < hp, 'from the ground');
  freshGame();
  Object.assign(P, { x: 300, y: 450, face: 1 });
  G.enemies = [];
  const h = foe('grunt', 300),
    hp2 = h.hp;
  ball(3, 114 + 104);
  step(0.6);
  assert.ok(h.hp < hp2, 'a big ball reaches down to it');
});

test('a bone from the ground hits even the smallest enemy; a blow reaches by height too', () => {
  const m = foe('monkey', 250),
    hp = m.hp;
  G.projs.push({ k: 'bone', x: P.x + 62, y: P.y, z: 116, vx: 650, rot: 0, life: 1.05 });
  step(0.5);
  assert.ok(m.hp < hp);
  // a blow from the ground misses the drone up in the air; a flying kick reaches it
  const d = foe('drone', 60);
  d.z = 165;
  assert.equal(reaches(d, 40, 150), false);
  assert.equal(reaches(d, 100, 230), true);
  // a shot reaches it from the ground (aimed at it)
  assert.equal(reaches(d, 116 - 20, 116 + 20, true), true);
});

test('the heroine jumps over a bone thrown at her; standing, it hits her', () => {
  const throwAt = () =>
    G.projs.push({ k: 'ebone', x: P.x + 100, y: P.y, z: 108, vx: -340, rot: 0, life: 3 });
  let hp = P.hp;
  throwAt();
  step(0.5);
  assert.ok(P.hp < hp, 'standing: hit');
  freshGame();
  Object.assign(P, { x: 300, y: 450, face: 1, inv: 0 });
  hp = P.hp;
  pressed.jump = true;
  step(0.2);
  throwAt();
  step(0.6);
  assert.equal(P.hp, hp, 'over it');
});

test("the heroine jumps over a robot's bolt", () => {
  const e = foe('catguard', 200);
  e.face = -1;
  pressed.jump = true;
  step(0.15);
  fireBolt(e, P.x + 60, 92, 560, 11);
  const hp = P.hp;
  step(0.4);
  assert.equal(P.hp, hp, 'over it');
  // standing, a bolt at that height meets her
  P.z = 0;
  assert.ok(meetsPlayer(80, 104));
});

test("the dragon's weak spot: its head held up high, reached only from a jump, double damage", () => {
  G.cam = 0;
  const d = spawn('dragon', 0, 600, 450);
  Object.assign(d, { state: 'walk', t: 0, z: 0, face: -1, cd: 99, laserCd: 99, leapCd: 99 });
  const hz = headHeight(d);
  assert.ok(hz >= DRAGON.high, 'its head is up at rest');
  const hx = d.x + d.face * 165;
  // a blow from the ground at the head: nothing (the body is further back)
  assert.equal(dragonZone(d, hx - 20, hx + 20, d.y, 30, 40, 150), null);
  // from a jump: the weak spot
  assert.equal(dragonZone(d, hx - 20, hx + 20, d.y, 30, 114, 244), 'high');
  // a flying kick from the top of a jump does twice the harm of the same kick on the body
  Object.assign(P, { x: hx + 60, y: d.y, face: -1, z: 114, hit: new Set() });
  const hp = d.hp;
  strike({ x0: 0, x1: 122, dy: 28, dmg: 12, knock: true, rage: 0, src: 'air' });
  const high = hp - d.hp;
  assert.ok(high > 0, 'it lands');
  Object.assign(P, { x: d.x + 130, z: 114, hit: new Set() });
  d.flash = 0;
  const hp2 = d.hp;
  strike({ x0: 0, x1: 122, dy: 28, dmg: 12, knock: true, rage: 0, src: 'air' });
  const body = hp2 - d.hp;
  assert.ok(body > 0);
  assert.ok(Math.abs(high / body - DRAGON.highMult) < 0.01, 'double on the head');
});
