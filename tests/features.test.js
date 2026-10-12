import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  BONE_COST,
  MAXR,
  SUPER_DMG,
  SUPER_HOLD,
  SWIND,
  SWIND_LOCK,
  TYPES,
  WAVES,
} from '../src/config.js';
import { G, P } from '../src/state.js';
import { MAP, keys, pressed } from '../src/input.js';
import { hitPlayer, hurtEnemy } from '../src/combat.js';
import { spawn, updEnemy } from '../src/enemies.js';
import { update } from '../src/world.js';
import { LANGS, STR, lang, t } from '../src/i18n.js';
import { DT, freshGame } from './helpers.js';

beforeEach(freshGame);

const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.(i);
  }
};

const shape = (o) =>
  Object.fromEntries(
    Object.entries(o).map(([k, v]) => [
      k,
      typeof v === 'object' && !Array.isArray(v) ? shape(v) : typeof v,
    ]),
  );

test('English and Russian texts have exactly the same keys', () => {
  for (const l of LANGS) assert.deepEqual(shape(STR[l]), shape(STR.en), l);
  for (const type of Object.keys(TYPES))
    for (const l of LANGS) assert.ok(STR[l].foe[type], `${l}: name of ${type}`);
});

test('the game starts in English', () => {
  assert.equal(lang, 'en');
  assert.equal(t('menuStart'), 'Start game');
  assert.equal(t('immune', '2.5'), 'Combo immunity 2.5 s');
});

test('controls: J punch, K bone, L hadouken, I super', () => {
  assert.equal(MAP.KeyJ, 'atk');
  assert.equal(MAP.KeyK, 'bone');
  assert.equal(MAP.KeyL, 'hado');
  assert.equal(MAP.KeyI, 'super');
  assert.equal(MAP.Space, 'jump');
});

test('the road to the baron is a quarter shorter than the original 7500 px', () => {
  assert.ok(WAVES.find((w) => w.sp?.[0][0] === 'boss').x <= 7500 * 0.75);
});

test('a bone throw costs 5% of the rage bar and is refused without it', () => {
  assert.equal(BONE_COST, MAXR * 0.05);
  P.rage = 50;
  pressed.bone = true;
  step(0.1);
  assert.equal(P.state, 'throw');
  assert.equal(P.rage, 50 - BONE_COST);

  freshGame();
  P.rage = BONE_COST - 1;
  pressed.bone = true;
  step(0.1);
  assert.notEqual(P.state, 'throw');
  assert.equal(P.rage, BONE_COST - 1);
});

/** Raithwyn up in a jump (near its top), `press` pressed then. */
function jumpAndPress(press) {
  P.who = 'raithwyn';
  pressed.jump = true;
  step(0.3);
  assert.equal(P.state, 'jump');
  assert.ok(P.z > 90, 'up in the air');
  pressed[press] = true;
}

test('Raithwyn throws a bone in a jump (K): down at 30 degrees, it breaks on the ground', () => {
  P.rage = 50;
  jumpAndPress('bone');
  step(0.25);
  const q = G.projs.find((p) => p.k === 'bone');
  assert.ok(q, 'a bone');
  assert.equal(P.rage, 50 - BONE_COST, 'it costs what it costs on the ground');
  const [x0, z0] = [q.x, q.z];
  step(0.1);
  const slope = (z0 - q.z) / Math.abs(q.x - x0);
  assert.ok(Math.abs(slope - Math.tan(Math.PI / 6)) < 0.02, 'down at 30 degrees');
  const debris = G.debris.length;
  step(1);
  assert.ok(!G.projs.includes(q), 'gone');
  assert.ok(Math.abs(q.x - P.x) < 520, 'it struck the ground, short of its full flight');
  assert.ok(G.debris.length > debris, 'broken on the ground');
  // on its way down it hits an enemy on the ground along her lane
  freshGame();
  P.rage = 50;
  const e = spawn('grunt', 1, P.x + 300, P.y);
  Object.assign(e, { state: 'chase', cd: 99 });
  const hp = e.hp;
  jumpAndPress('bone');
  step(0.8);
  assert.ok(e.hp < hp, 'it hits');
});

test('Raithwyn casts the dark ball in a jump (L); one move a jump; Lucy keeps her guns on the ground', () => {
  P.rage = MAXR;
  jumpAndPress('hado');
  step(0.4);
  const q = G.projs.find((p) => p.k === 'hado');
  assert.ok(q, 'a dark ball');
  assert.equal(q.lv, 1, 'a plain L: level I');
  const z = q.z;
  assert.ok(z > 104, 'up at the height she cast it');
  step(0.1);
  assert.equal(q.z, z, 'straight on at that height');
  assert.ok(P.rage < MAXR);
  // a second move in the same jump is not done
  const rage = P.rage;
  pressed.bone = true;
  step(0.05);
  assert.equal(P.rage, rage, 'one move a jump');
  step(0.6);
  assert.notEqual(P.state, 'jump', 'landed');
  // Lucy: K in the air does nothing (her pistol is drawn on the ground)
  freshGame();
  P.who = 'lucy';
  P.ammo = 6;
  pressed.jump = true;
  step(0.25);
  pressed.bone = true;
  step(0.3);
  assert.equal(G.projs.filter((p) => p.k === 'bullet').length, 0);
});

test('the super attack needs a full rage bar', () => {
  P.rage = MAXR - 1;
  pressed.super = keys.super = true;
  step(0.1);
  assert.notEqual(P.state, 'super');
});

test('holding I for 1.25 s with full rage hits every enemy on screen and spends all rage', () => {
  P.x = 400;
  const near = spawn('fat', 1, 520, 450),
    far = spawn('grunt', 1, 900, 470);
  near.cd = far.cd = 99;
  P.rage = MAXR;
  pressed.super = keys.super = true;
  step(SUPER_HOLD * 0.8, () => (P.inv = 1));
  assert.equal(P.state, 'super');
  assert.equal(P.rage, MAXR, 'nothing is spent while charging');
  step(SUPER_HOLD * 0.3, () => (P.inv = 1));
  assert.equal(P.rage, 0);
  assert.equal(near.hp, TYPES.fat.hp - SUPER_DMG);
  assert.ok(far.dead, 'a grunt does not survive the blast');
});

test('letting go of I early or being hit cancels the super and keeps the rage', () => {
  P.rage = MAXR;
  pressed.super = keys.super = true;
  step(0.5);
  keys.super = false;
  step(0.1);
  assert.notEqual(P.state, 'super');
  assert.equal(P.rage, MAXR);

  pressed.super = keys.super = true;
  step(0.5);
  assert.equal(P.state, 'super');
  hitPlayer(5, 1, false);
  assert.equal(P.state, 'hurt');
  step(SUPER_HOLD);
  assert.ok(P.rage >= MAXR - 1, 'rage is not spent');
});

test("the fatso's ground slam cannot be interrupted in the last third of its wind-up", () => {
  assert.ok(Math.abs(SWIND_LOCK - (SWIND * 2) / 3) < 1e-9);
  const e = spawn('fat', 1, 500, 450);
  e.state = 'swind';
  e.t = SWIND_LOCK - 0.05;
  hurtEnemy(e, 16, 1, false, 'punch');
  assert.equal(e.state, 'swind', 'a plain hit does not stop it');
  hurtEnemy(e, 16, 1, true, 'punch');
  assert.equal(e.state, 'hurt', 'early on, a heavy blow breaks it');
  Object.assign(e, { state: 'swind', t: SWIND_LOCK - 0.05 });
  hurtEnemy(e, 16, 1, true, 'punch');
  assert.equal(e.state, 'air', 'and a second one within 3 s knocks him back');

  e.state = 'swind';
  e.t = SWIND_LOCK + 0.01;
  const hp = e.hp;
  for (const src of ['punch', 'hado', 'hado3', 'super']) hurtEnemy(e, 5, 1, true, src);
  assert.equal(e.state, 'swind');
  assert.equal(e.hp, hp - 20, 'the hits still deal damage');
});

test('the necromancer keeps his distance and spits acid', () => {
  P.x = 300;
  P.y = 450;
  const e = spawn('necro', 1, 700, 450);
  e.state = 'chase';
  e.cd = 0;
  const c = { n: 0 };
  for (let i = 0; i < 120 && !G.projs.some((q) => q.k === 'acid'); i++) updEnemy(e, DT, c);
  assert.ok(
    G.projs.some((q) => q.k === 'acid'),
    'an acid ball is fired',
  );
});

test('a cornered necromancer swings his staff, and is easily staggered', () => {
  P.x = 400;
  P.y = 450;
  const e = spawn('necro', 1, 450, 450);
  e.state = 'chase';
  e.cd = 0;
  updEnemy(e, DT, { n: 0 });
  assert.equal(e.state, 'staff');
  for (let i = 0; i < 30; i++) updEnemy(e, DT, { n: 0 });
  assert.ok(P.hp < 100, 'the staff hits');
  hurtEnemy(e, 8, 1, false, 'punch');
  assert.equal(e.state, 'hurt');
});
