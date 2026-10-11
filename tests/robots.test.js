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
  for (const k of ['guard', 'catguard', 'drone', 'ninja', 'monk', 'turret', 'barrier', 'chef'])
    assert.ok(all.includes(k), k);
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

test('the omnic monk puts a shield of light on a robot: blows barely hurt it, a crushing one ends it', async () => {
  const { MONK } = await import('../src/config.js');
  const m = foe('monk', 400, { state: 'mfloat', castCd: 0 }),
    g = foe('guard', 150);
  g.cd = 99;
  update(DT);
  assert.equal(m.state, 'mcast');
  assert.equal(m.ward, g);
  step(MONK.cast + 0.05);
  assert.ok(g.orbUntil > G.time, 'shielded');
  const hp = g.hp;
  hurtEnemy(g, 10, 1, false, 'punch');
  assert.ok(Math.abs(hp - g.hp - 10 * MONK.soak) < 1e-6, 'a third of the harm');
  hurtEnemy(g, 10, 1, true, 'super');
  assert.equal(g.orbUntil, 0, 'a crushing blow ends it');
});

test('the turret transforms and fires down its lane from both guns; out of the lane, she is safe', async () => {
  const { TURRET } = await import('../src/config.js');
  const { armPoint } = await import('../src/skeleton.js');
  const e = foe('turret', 420, { modeCd: 0, burstCd: 99 });
  update(DT);
  assert.equal(e.state, 'tdeploy');
  step(TURRET.deploy + 0.6);
  assert.equal(e.state, 'tfire');
  assert.ok(e.tm > 0.9, 'in turret form');
  const bolts = G.projs.filter((p) => p.k === 'rbolt');
  assert.ok(bolts.length >= 2, 'a stream of bullets');
  // they fly from the muzzles of its two guns
  const muzzles = [armPoint(e, false, 60), armPoint(e, true, 60)];
  for (const q of bolts.slice(-2)) {
    const back = q.x - q.vx * (q.life < 3 ? 3 - q.life : 0);
    assert.ok(
      muzzles.some(([x, z]) => Math.abs(back - x) < 20 && Math.abs(q.z - z) < 20),
      `from a muzzle (${back | 0},${q.z | 0} vs ${muzzles.map((m) => m.map(Math.round)).join(' ')})`,
    );
  }
  // its armour takes half a blow, and a light blow does not stop it
  const hp0 = e.hp;
  hurtEnemy(e, 10, -1, false, 'punch');
  assert.equal(e.hp, hp0 - 10 * TURRET.soak);
  assert.equal(e.state, 'tfire');
  const hp = P.hp;
  step(1.2);
  assert.ok(P.hp < hp, 'in the lane: hit');
  Object.assign(e, { state: 'tfire', t: 0, held: 0, burstLeft: TURRET.burst });
  G.projs = [];
  P.y -= 70;
  P.inv = 0;
  const hp2 = P.hp;
  step(1);
  assert.equal(P.hp, hp2, 'out of the lane');
  // after a while it packs up and walks as a robot again
  step(TURRET.hold + TURRET.deploy + 0.5);
  assert.ok(!['tfire', 'tpack', 'tdeploy'].includes(e.state), e.state);
  assert.ok(e.tm < 0.1, 'a robot again');
});

test('as a robot the turret raises its gun and fires a short burst from its muzzle', async () => {
  const { TURRET } = await import('../src/config.js');
  const e = foe('turret', 300, { modeCd: 99, burstCd: 0 });
  P.inv = 99; // (the bullets fly on past her)
  update(DT);
  assert.equal(e.state, 'taim');
  step(TURRET.aim + TURRET.rate * TURRET.rburst + 0.12);
  const bolts = G.projs.filter((p) => p.k === 'rbolt');
  assert.equal(bolts.length, TURRET.rburst);
  assert.ok(
    bolts.every((q) => Math.abs(q.x - q.vx * (3 - q.life) - e.x) < 200 && q.z > 60),
    'from the gun, up at arm height',
  );
});

test("the barrier heavy's wall stops shots and blows from the front; it cracks, and goes", async () => {
  const { BARRIER } = await import('../src/config.js');
  const e = foe('barrier', 300, { barCd: 0 });
  e.cd = 99;
  step(0.5);
  assert.ok(e.wallUntil > G.time, 'the wall is up');
  // a bone at it stops on the wall, and so would one at a robot behind it
  G.projs.push({ k: 'bone', x: P.x + 40, y: P.y, z: 100, vx: 700, rot: 0, life: 2 });
  const hp = e.hp;
  step(0.4);
  assert.equal(e.hp, hp, 'no harm through the wall');
  assert.ok(!G.projs.some((p) => p.k === 'bone' && p.life > 0));
  // blows from the front ring off; heavy ones crack it, the third shatters it
  assert.equal(hurtEnemy(e, 10, -e.face, false, 'punch'), true);
  assert.equal(e.hp, hp);
  for (let k = 0; k < BARRIER.hp; k++) hurtEnemy(e, 10, -e.face, true, 'punch');
  assert.ok(!(e.wallUntil > G.time), 'shattered');
  hurtEnemy(e, 10, -e.face, false, 'punch');
  assert.ok(e.hp < hp, 'open now');
});

test("the noodle chef's flurry: three cuts, the last one knocks her down", async () => {
  const { CHEF } = await import('../src/config.js');
  const e = foe('chef', 70, { flurryCd: 0 });
  e.cd = 0;
  let hits = 0,
    hp = P.hp;
  update(DT);
  assert.equal(e.state, 'cflurry');
  for (let i = 0; i < 90 && e.state === 'cflurry'; i++) {
    update(DT);
    if (P.hp < hp) {
      hits++;
      hp = P.hp;
      if (P.state !== 'ko') P.inv = 0;
    }
  }
  assert.equal(hits, CHEF.hits);
  assert.equal(P.state, 'ko');
});
