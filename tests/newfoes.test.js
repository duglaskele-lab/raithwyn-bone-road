import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { BANSHEE, GB, GT, SHIELD, STRONG, W, WAVES, WAVEGEN, ZOMBIE } from '../src/config.js';
import { G, P } from '../src/state.js';
import { pressed } from '../src/input.js';
import { spawn } from '../src/enemies.js';
import { hurtEnemy } from '../src/combat.js';
import { update } from '../src/world.js';
import '../src/foes/index.js';
import { inWail } from '../src/foes/banshee.js';
import { DT, freshGame } from './helpers.js';

beforeEach(() => {
  freshGame();
  G.props = [];
  G.items = [];
  G.waveI = 99;
  G.cam = WAVES.at(-1).x - 600;
  Object.assign(P, { x: G.cam + 300, y: (GT + GB) / 2 });
});
const step = (s, each) => {
  for (let i = 0; i < s / DT; i++) {
    update(DT);
    each?.();
  }
};
/** An enemy of `type` `dx` in front of the player, facing her, standing still. */
function foe(type, dx = 160, extra = {}) {
  const e = spawn(type, 1, P.x + dx, P.y);
  Object.assign(e, { state: 'chase', t: 0, z: 0, face: dx > 0 ? -1 : 1, cd: 99 }, extra);
  return e;
}

test('the shield bearer comes on the Bone Road', () => {
  assert.ok(WAVEGEN.pools.mid.shield > 0);
});

test('its shield stops blows and shots from the front; three heavy blows splinter it', () => {
  const e = foe('shield'),
    front = -e.face,
    hp = e.hp;
  assert.equal(e.shieldHp, SHIELD.heavy);
  for (const src of ['punch', 'bone']) {
    assert.equal(hurtEnemy(e, 10, front, false, src), true, 'it rings on the shield');
    assert.equal(e.hp, hp, `no harm from a ${src}`);
  }
  assert.equal(e.shieldHp, SHIELD.heavy, 'light blows do not wear it');
  hurtEnemy(e, 16, front, true, 'punch');
  hurtEnemy(e, 16, front, true, 'punch');
  assert.equal(e.shieldHp, 1, 'cracked twice');
  assert.equal(e.hp, hp);
  const debris = G.debris.length;
  hurtEnemy(e, 16, front, true, 'punch');
  assert.equal(e.shieldHp, 0, 'the third splinters it');
  assert.ok(G.debris.length > debris, 'in splinters');
  hurtEnemy(e, 10, front, false, 'punch');
  assert.ok(e.hp < hp, 'then blows land');
});

test('from behind blows land; a crushing blow smashes the shield and goes on through', () => {
  let e = foe('shield');
  const hp = e.hp;
  hurtEnemy(e, 10, e.face, false, 'punch');
  assert.ok(e.hp < hp, 'from behind');
  assert.equal(e.shieldHp, SHIELD.heavy);
  e = foe('shield', 200);
  hurtEnemy(e, 40, -e.face, true, 'super');
  assert.equal(e.shieldHp, 0);
  assert.ok(e.hp < e.T.hp, 'and it hurts');
});

test('it turns round only after the player has been behind it a moment', () => {
  const e = foe('shield', 160);
  step(0.1);
  assert.equal(e.face, -1);
  P.x = e.x + 120; // round its back
  step(SHIELD.turn * 0.5);
  assert.equal(e.face, -1, 'not yet');
  step(SHIELD.turn);
  assert.equal(e.face, 1, 'now');
});

test('the strongman: grabs, hoists her up and throws her across, bowling foes over', () => {
  const e = foe('strongman', 60, { state: 'windup', t: 0 }),
    g = spawn('grunt', 1, P.x - 260, P.y);
  Object.assign(g, { state: 'chase', cd: 99 });
  e.face = -1;
  for (let i = 0; i < 60 && P.state !== 'grabbed'; i++) update(DT);
  assert.equal(P.state, 'grabbed');
  assert.equal(e.state, 'lift');
  step(0.4);
  assert.ok(P.z > 150, 'up over his head');
  const hp = P.hp;
  for (let i = 0; i < STRONG.lift / DT + 5 && P.state === 'grabbed'; i++) update(DT);
  assert.equal(P.state, 'ko', 'thrown');
  assert.ok(P.vx <= -STRONG.throwV + 1, 'hard, across the screen');
  assert.ok(P.hp <= hp - STRONG.throwDmg);
  const ghp = g.hp;
  for (let i = 0; i < 90 && P.state === 'ko'; i++) update(DT);
  assert.ok(g.hp < ghp, 'the skeleton she flew into is bowled over');
  assert.ok(['air', 'down', 'getup'].includes(g.state) || g.dead);
});

test('mashing breaks free of his grab before the throw', () => {
  const e = foe('strongman', 60, { state: 'windup', t: 0 });
  e.face = -1;
  for (let i = 0; i < 60 && P.state !== 'grabbed'; i++) update(DT);
  for (let i = 0; i < 40 && P.state === 'grabbed'; i++) {
    pressed.atk = true;
    update(DT);
    delete pressed.atk;
    update(DT);
  }
  assert.notEqual(P.state, 'grabbed');
  assert.notEqual(P.state, 'ko', 'free, not thrown');
  assert.equal(P.z, 0, 'back on her feet');
  assert.ok(STRONG.hold / ZOMBIE.mash < STRONG.lift / DT, 'mashing is quicker than the throw');
});

test('flexing he shrugs blows off; a crushing blow throws him', () => {
  const e = foe('strongman', 70, { state: 'flex', t: 0 }),
    hp = e.hp;
  hurtEnemy(e, 20, 1, true, 'punch');
  assert.ok(Math.abs(hp - e.hp - 20 * STRONG.soak) < 1e-9, 'a tenth');
  assert.equal(e.state, 'flex', 'and he goes on');
  hurtEnemy(e, 30, 1, true, 'super');
  assert.equal(e.state, 'air', 'thrown');
});

test('his ground slam: a wave along the ground to the edge of the screen, jump over it', () => {
  const e = foe('strongman', 400, { state: 'slam', t: 0, slammed: false });
  P.y = GT + 4; // far up the road: the wave covers the whole depth
  step(STRONG.slamWind + 0.05);
  const q = G.projs.find((p) => p.k === 'quake');
  assert.ok(q, 'the wave');
  for (let i = 0; i < 120 && P.state !== 'ko'; i++) update(DT);
  assert.equal(P.state, 'ko', 'it throws her, at any depth');
  // jumping, she is spared
  freshGame();
  G.props = [];
  G.cam = 0;
  Object.assign(P, { x: 300, y: 450 });
  const e2 = foe('strongman', 400, { state: 'slam', t: 0, slammed: false });
  step(STRONG.slamWind + 0.05);
  const q2 = G.projs.find((p) => p.k === 'quake');
  for (let i = 0; i < 120 && G.projs.includes(q2); i++) {
    P.z = Math.abs(P.x - q2.x) < 120 ? 60 : 0; // in the air as it passes
    P.state = P.z > 0 ? 'jump' : 'idle';
    update(DT);
  }
  assert.notEqual(P.state, 'ko', 'over it');
  assert.ok(q2.x < G.cam || q2.x > G.cam + W || q2.life <= 0, 'it ran out at the edge');
  void e2;
});

test('the banshee: see-through and untouchable while she drifts; hittable when she shows', () => {
  const e = foe('banshee', 230);
  Object.assign(e, { state: 'gfloat', t: 0, floatT: 9 });
  const hp = e.hp;
  assert.equal(hurtEnemy(e, 10, -1, false, 'punch'), false);
  assert.equal(e.hp, hp, 'nothing touches her');
  Object.assign(e, { state: 'gshow', t: 0 });
  assert.equal(hurtEnemy(e, 10, -1, false, 'punch'), true);
  assert.ok(e.hp < hp);
});

test('her wail stuns whoever is in its cone for half a second; out of its depth, no', () => {
  const e = foe('banshee', 230);
  Object.assign(e, { state: 'gfloat', t: 0, floatT: 0.01, face: -1 });
  for (let i = 0; i < 120 && P.state !== 'dazed'; i++) update(DT);
  assert.equal(P.state, 'dazed', 'stunned');
  let t = 0;
  while (P.state === 'dazed' && t < 2) {
    update(DT);
    t += DT;
  }
  assert.ok(Math.abs(t - BANSHEE.stun) < 0.1, `half a second (${t})`);
  // well up the road from her line: the cone does not reach
  Object.assign(e, { state: 'gwail', t: 0, stunned: false, y: P.y + BANSHEE.w1 + 30 });
  assert.equal(inWail(e), false);
  update(DT);
  assert.notEqual(P.state, 'dazed');
});

test('from afar she conjures a slow skull: open to blows meanwhile; it knocks down, or is dodged', () => {
  const e = foe('banshee', 420);
  Object.assign(e, { state: 'gfloat', t: 1, floatT: 9, castCd: 0 });
  update(DT);
  assert.equal(e.state, 'gcast');
  const hp = e.hp;
  assert.equal(hurtEnemy(e, 1, -1, false, 'punch'), true, 'shown, she can be hit');
  assert.ok(e.hp < hp);
  Object.assign(e, { state: 'gcast', t: 0, cast: false, x: P.x + 420, face: -1 });
  step(BANSHEE.castWind + 0.05);
  const q = G.projs.find((p) => p.k === 'skull');
  assert.ok(q, 'the skull flies');
  assert.ok(q.vx < 0 && Math.abs(q.vx) === BANSHEE.skullSpeed, 'slowly, at the player');
  const hp0 = P.hp;
  for (let i = 0; i < 4 / DT && q.life > 0; i++) update(DT);
  assert.equal(P.state, 'ko', 'it knocks her down');
  assert.equal(P.hp, hp0 - BANSHEE.skullDmg);
  // the next one: she steps out of its line
  freshGame();
  G.waveI = 99;
  G.cam = WAVES.at(-1).x - 600;
  Object.assign(P, { x: G.cam + 300, y: (GT + GB) / 2 });
  const e2 = foe('banshee', 420, { state: 'gcast', t: 0, cast: false });
  step(BANSHEE.castWind + 0.05);
  const q2 = G.projs.find((p) => p.k === 'skull');
  P.y += 60;
  for (let i = 0; i < 6 / DT && q2.life > 0; i++) update(DT);
  assert.notEqual(P.state, 'ko', 'dodged');
  assert.ok(q2.life <= 0, 'gone off the screen');
  void e2;
});

test('she dies dissolving into the air, no bones', () => {
  const e = foe('banshee', 200, { state: 'gshow', t: 0 });
  const debris = G.debris.length;
  hurtEnemy(e, 999, -1, true, 'punch');
  assert.equal(e.state, 'gdie');
  step(1);
  assert.ok(e.dead);
  assert.equal(G.debris.length, debris, 'no bones scattered');
});
