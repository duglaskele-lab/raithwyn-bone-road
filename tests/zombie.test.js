import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TYPES, WAVES, ZOMBIE } from '../src/config.js';
import { G, P } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { hurtEnemy } from '../src/combat.js';
import { spawn, updEnemy } from '../src/enemies.js';
import { update } from '../src/world.js';
import { STYLE_GRACE } from '../src/style.js';
import { DT, freshGame } from './helpers.js';

beforeEach(freshGame);

const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.(i);
  }
};
// A zombie right next to the player, mid-attack.
function grabbingZombie() {
  P.x = 400;
  P.y = 450;
  const e = spawn('zombie', 1, 440, 450);
  Object.assign(e, { state: 'attack', t: 0, hitDone: false, face: -1 });
  updEnemy(e, DT, { n: 0 });
  return e;
}

test('zombies are slow, weak and come in crowds', () => {
  const z = TYPES.zombie;
  for (const [id, t] of Object.entries(TYPES))
    if (!['zombie', 'fat', 'brute', 'dragon'].includes(id)) assert.ok(z.speed < t.speed, id);
  assert.ok(z.hp <= 24);
  const n = WAVES.flatMap((w) => w.sp).filter((s) => s[0] === 'zombie').length;
  assert.ok(n >= 20, `${n} zombies on the level`);
});

test('a zombie grabs the player and holds her still for a moment', () => {
  const e = grabbingZombie();
  assert.equal(P.state, 'grabbed');
  assert.equal(e.state, 'grab');
  assert.equal(P.hp, 100 - TYPES.zombie.dmg);
  const x = P.x;
  keys.r = true;
  step(ZOMBIE.hold * 0.8);
  assert.equal(P.state, 'grabbed', 'still held');
  assert.equal(P.x, x, 'cannot walk away');
  step(ZOMBIE.hold * 0.3);
  assert.notEqual(P.state, 'grabbed', 'released');
  assert.ok(P.inv > 0, 'a moment of safety after breaking free');
});

test('mashing buttons breaks free sooner', () => {
  grabbingZombie();
  step(0.4, (i) => i % 4 === 0 && (pressed.atk = true));
  assert.notEqual(P.state, 'grabbed');
});

test('hitting a zombie can knock its head off, and it keeps fighting', () => {
  const e = spawn('zombie', 1, 500, 450);
  hurtEnemy(e, 5, 1, true, 'punch');
  assert.ok(e.headless);
  assert.ok(!e.dead);
  assert.ok(G.debris.some((d) => d.k === 'skull'));
  e.state = 'chase';
  e.cd = 0;
  P.x = 400;
  step(2, () => (P.inv = 1));
  assert.ok(!e.dead);
});

test('a zombie can throw its own head', () => {
  P.x = 300;
  P.y = 450;
  const e = spawn('zombie', 1, 600, 450);
  e.state = 'hwind';
  e.t = 0.6;
  updEnemy(e, DT, { n: 0 });
  assert.ok(e.headless);
  const head = G.projs.find((q) => q.k === 'zhead');
  assert.ok(head);
  G.enemies = [];
  step(ZOMBIE.headFlight + 0.2);
  assert.ok(!G.projs.includes(head), 'the head lands');
  assert.ok(P.hp < 100, 'and it hits the player it was aimed at');
});

test('zombies count as half an enemy against the on-screen limit', () => {
  P.inv = 99;
  G.waveI = 0;
  G.cam = WAVES[0].x;
  G.wave = {
    sp: Array.from({ length: 10 }, () => ['zombie', 1, 0]),
    t: 0,
  };
  step(DT * 2);
  assert.ok(G.enemies.length > 6, `${G.enemies.length} zombies at once`);
  assert.ok(STYLE_GRACE === 3.5);
});
