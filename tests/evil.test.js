import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EVIL, GB, GT, TYPES, WAVES, W } from '../src/config.js';
import { G, P } from '../src/state.js';
import { spawn, updEnemy } from '../src/enemies.js';
import { hurtEnemy } from '../src/combat.js';
import { update } from '../src/world.js';
import { waveSpawns } from '../src/waves.js';
import { themeFor } from '../src/audio.js';
import { FOES } from '../src/foes/index.js';
import { orbSpot, stageOf } from '../src/foes/evil.js';
import { DT, freshGame } from './helpers.js';

beforeEach(freshGame);

const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    each?.(i);
  }
};
/** The dragon's arena with Raithwyn in it, `dx` in front of Lucy, everything cooling down. */
function arena(dx = 400, extra = {}) {
  P.who = 'lucy';
  G.banner = null;
  G.waveI = 99;
  G.props = [];
  G.cam = WAVES.at(-1).x;
  Object.assign(P, { x: G.cam + 300, y: (GT + GB) / 2, inv: 0 });
  const e = spawn('evil', 1, P.x + dx, P.y);
  Object.assign(
    e,
    {
      state: 'chase',
      t: 0,
      face: dx > 0 ? -1 : 1,
      comboCd: 99,
      ballCd: 99,
      boneCd: 99,
      jumpCd: 99,
      summoned: true,
    },
    extra,
  );
  return e;
}
const hold = (e) => Object.assign(e, { comboCd: 99, ballCd: 99, boneCd: 99, jumpCd: 99 });

test("the Bone Road ends with Raithwyn for anyone but Raithwyn, with the dragon's music", () => {
  const last = WAVES.length - 1;
  P.who = 'raithwyn';
  assert.equal(waveSpawns(last)[0][0], 'dragon');
  P.who = 'lucy';
  assert.equal(waveSpawns(last)[0][0], 'evil');
  assert.equal(TYPES.evil.bigBoss, 1);
  const e = arena();
  assert.equal(themeFor('play', [e]), 'dragon');
  e.hp = e.T.hp * 0.2;
  e.stage = 3;
  assert.equal(themeFor('play', [e]), 'dragon2');
  P.who = 'raithwyn';
});

test('three stages by her health, with no show of a change', () => {
  const e = arena();
  for (const [f, st] of [
    [1, 1],
    [0.7, 1],
    [0.6, 2],
    [0.4, 2],
    [0.3, 3],
  ]) {
    e.hp = e.T.hp * f;
    assert.equal(stageOf(e), st, `${f}`);
  }
});

test('her dark ball: level I, II, III by stage, gathered longer each time; it hurts the player', () => {
  const winds = [];
  for (const st of [1, 2, 3]) {
    freshGame();
    const e = arena(450);
    e.hp = e.T.hp * [0.9, 0.55, 0.2][st - 1];
    e.ballCd = 0;
    step(DT * 2);
    assert.equal(e.state, 'eball');
    assert.equal(e.lv, st);
    let t = 0;
    while (e.state === 'eball' && t < 3) {
      step(DT, () => hold(e));
      t += DT;
    }
    winds.push(t);
    const q = G.projs.find((p) => p.k === 'ehado');
    assert.ok(q && q.lv === st);
    const hp = P.hp;
    step(1.2, () => hold(e));
    assert.ok(P.hp < hp, `level ${st} hurts`);
  }
  assert.ok(winds[0] < winds[1] && winds[1] < winds[2], `gathered longer: ${winds}`);
});

test('her bone: one in the first stages, a fan of three in the third', () => {
  for (const [f, n] of [
    [0.9, 1],
    [0.55, 1],
    [0.2, 3],
  ]) {
    freshGame();
    const e = arena(400);
    e.hp = e.T.hp * f;
    e.rage = 0;
    e.boneCd = 0;
    step(DT * 2);
    assert.equal(e.state, 'bthrow');
    step(EVIL.bone.wind + 0.05, () => hold(e));
    const bones = G.projs.filter((q) => q.k === 'ebone');
    assert.equal(bones.length, n);
    if (n === 3) assert.ok(bones.some((q) => q.vy < 0) && bones.some((q) => q.vy > 0), 'a fan');
  }
});

test('her chain of punches: a glint, three hits, the last knocks down', () => {
  const e = arena(80);
  e.comboCd = 0;
  step(DT * 2);
  assert.equal(e.state, 'c0');
  step(EVIL.combo.glint + 0.9, () => {
    e.ballCd = e.boneCd = e.jumpCd = 99;
    P.x = Math.min(P.x, e.x - 40);
  });
  assert.ok(P.hp < 100);
  assert.ok(['ko', 'down', 'getup'].includes(P.state));
});

test('she leaps back from an attack up close; with a wall behind her, the other way', () => {
  const e = arena(90);
  e.jumpCd = 0;
  P.state = 'atk1';
  P.face = 1;
  const x = e.x;
  for (let i = 0; i < 120 && e.state !== 'bjump'; i++) {
    updEnemy(e, DT, { n: 0 });
    P.state = 'atk1';
  }
  assert.equal(e.state, 'bjump');
  assert.ok(e.x1 > x + 100, 'away from her');
  assert.ok(FOES.evil.immune(e), 'out of reach as she leaps');
  // at the right wall: over the player to the left
  freshGame();
  const f = arena(90);
  f.x = G.cam + W - 80;
  P.x = f.x - 90;
  f.jumpCd = 0;
  for (let i = 0; i < 120 && f.state !== 'bjump'; i++) {
    updEnemy(f, DT, { n: 0 });
    P.state = 'atk1';
  }
  assert.equal(f.state, 'bjump');
  assert.ok(f.x1 < P.x, 'over her');
});

test('rage: none in the first stage, from blows in the second, by itself in the third', () => {
  const e = arena(500);
  hurtEnemy(e, 5, 1, false, 'punch');
  assert.equal(e.rage, 0, 'first stage: no rage');
  e.hp = e.T.hp * 0.6;
  updEnemy(e, DT, { n: 0 });
  hurtEnemy(e, 5, 1, false, 'punch');
  assert.ok(e.rage > 0, 'second stage: a blow taken');
  const r = e.rage;
  step(1, () => hold(e));
  assert.ok(Math.abs(e.rage - r) < 0.01, 'no rage by itself yet');
  e.hp = e.T.hp * 0.3;
  step(1, () => hold(e));
  assert.ok(e.rage > r + EVIL.rage.passive * 0.8, 'third stage: it fills by itself');
});

test('her super: a heavy blow breaks it and empties her rage; not in the third stage', () => {
  const e = arena(500);
  e.hp = e.T.hp * 0.6;
  e.rage = EVIL.rage.max;
  step(DT * 2, () => hold(e));
  assert.equal(e.state, 'scharge');
  assert.ok(!FOES.evil.unstoppable(e));
  hurtEnemy(e, 5, 1, false, 'punch');
  assert.equal(e.state, 'scharge', 'a plain hit does not break it');
  hurtEnemy(e, 5, 1, true, 'punch');
  assert.equal(e.state, 'hurt');
  assert.equal(e.rage, 0);
  // the third stage
  freshGame();
  const f = arena(500);
  f.hp = f.T.hp * 0.3;
  f.rage = EVIL.rage.max;
  step(DT * 2, () => hold(f));
  assert.equal(f.state, 'scharge');
  assert.ok(FOES.evil.unstoppable(f), 'a red outline');
  hurtEnemy(f, 5, 1, true, 'hado3');
  assert.equal(f.state, 'scharge', 'nothing breaks it');
});

test('the orb rises over the arena, three beams burn the ground for five seconds; she keeps away', () => {
  const e = arena(500);
  e.hp = e.T.hp * 0.6;
  e.summoned = true;
  e.rage = EVIL.rage.max;
  P.inv = 99;
  step(EVIL.orb.charge + 0.1, () => hold(e));
  assert.ok(e.orb, 'out');
  assert.equal(e.rage, 0);
  step(EVIL.orb.rise + 0.5, () => ((P.inv = 99), hold(e)));
  assert.ok(e.orb.z > EVIL.orb.z * 0.9, 'up over the arena');
  assert.equal(e.orb.spots.length, 3);
  // three paths of their own
  const a = [0, 1, 2].map((i) => orbSpot(i, 1)),
    b = [0, 1, 2].map((i) => orbSpot(i, 2));
  assert.ok(new Set(a.map((p, i) => Math.round(p[0] - b[i][0]))).size === 3);
  assert.ok(G.pools.filter((p) => p.fire && p.dark).length > 10, 'the ground burns');
  assert.equal(e.state, 'roam');
  // she starts no attack while it burns
  Object.assign(e, { comboCd: 0, ballCd: 0, boneCd: 0 });
  step(2, () => (P.inv = 99));
  assert.ok(!['c0', 'eball', 'bthrow', 'scharge'].includes(e.state));
  assert.ok(!G.projs.some((q) => q.k === 'ehado' || q.k === 'ebone'));
  step(EVIL.orb.life, () => ((P.inv = 99), hold(e)));
  assert.equal(e.orb, null, 'gone after five seconds');
  // a beam that runs over the player hurts her
  freshGame();
  const f = arena(500);
  f.orb = { t: EVIL.orb.rise + 1, x0: 0, y0: 0, z0: 0, cd: [0, 0, 0], burnT: 0 };
  const [sx, sy] = orbSpot(0, 1 + DT);
  Object.assign(P, { x: sx, y: sy });
  step(DT);
  assert.ok(P.hp < 100);
});

test('at half health she calls up the dandy: only her own blows hurt it, and it falls with her', () => {
  const e = arena(500, { summoned: false });
  e.hp = e.T.hp * 0.49;
  e.rage = 0;
  P.inv = 99;
  step(1.2, () => ((P.inv = 99), hold(e)));
  const d = G.enemies.find((o) => o.type === 'dandy');
  assert.ok(d, 'called up');
  step(1, () => ((P.inv = 99), hold(e)));
  const hp = d.hp;
  assert.equal(hurtEnemy(d, 20, 1, true, 'punch'), false, 'the player cannot hurt it');
  assert.equal(d.hp, hp);
  // her dark ball can
  G.projs.push({
    k: 'ehado',
    lv: 1,
    x: d.x - 30,
    y: d.y,
    z: 104,
    vx: 300,
    dmg: 12,
    owner: e,
    hit: new Set(),
    life: 1,
  });
  step(0.2, () => ((P.inv = 99), hold(e)));
  assert.ok(d.hp < hp, 'her own ball hurts it');
  // she falls: so does it
  e.hp = 1;
  hurtEnemy(e, 10, 1, true, 'punch');
  assert.ok(e.dying);
  assert.ok(d.dead, 'gone with her');
});
