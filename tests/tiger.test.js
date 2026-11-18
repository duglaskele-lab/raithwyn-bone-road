import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_HP, TIGER, TYPES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { spawn } from '../src/enemies.js';
import { grabPlayer, hitPlayer, stunPlayer } from '../src/combat.js';
import { update } from '../src/world.js';
import { newRun } from '../src/replay.js';
import { CHARS } from '../src/characters.js';
import { helpFor } from '../src/i18n.js';
import { tigerPose } from '../src/tigerdraw.js';
import { DT, freshGame } from './helpers.js';

const GD = TIGER.guard;
beforeEach(() => {
  freshGame();
  newRun(7, 1, 'tiger');
  G.waveI = 99;
  G.banner = null;
  G.props = [];
  G.enemies = [];
  Object.assign(P, { x: 300, y: 450, face: 1, inv: 0, rage: 0 });
});
const step = (s, each) => {
  for (let i = 0; i < s / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.(i);
  }
};
/** A skeleton `dx` in front of him, standing still. */
const foe = (dx = 90, type = 'grunt') => {
  const e = spawn(type, 1, P.x + dx, P.y);
  Object.assign(e, { state: 'chase', cd: 99, face: -1 });
  e.T = { ...e.T, speed: 0 };
  return e;
};
/** K pressed (and held). */
const guardUp = () => {
  keys.bone = true;
  pressed.bone = true;
  update(DT);
  for (const k in pressed) delete pressed[k];
};

test('the tiger samurai is playable: more health, his own names for his moves', () => {
  assert.ok(CHARS.find((c) => c.id === 'tiger').playable);
  assert.equal(P.who, 'tiger');
  assert.equal(P.maxHp, MAX_HP.tiger);
  assert.ok(MAX_HP.tiger > MAX_HP.raithwyn);
  assert.equal(helpFor('tiger').bone[1], 'K');
  for (const st of ['idle', 'walk', 'run', 'katana', 'guard', 'iai', 'jump', 'ko', 'down', 'win'])
    assert.ok(Number.isFinite(tigerPose({ ...P, state: st, t: 0.1, cs: 0, ph: 1, airT: null }).sw));
});

test('his katana: three cuts in a chain, each harder than her punches, and slower', () => {
  const e = foe(100);
  e.T = { ...e.T, hp: 999 };
  e.hp = 999;
  keys.atk = true;
  const seen = new Set();
  let t = 0;
  step(2.5, () => {
    if (P.state === 'katana') {
      seen.add(P.cs);
      t += DT;
    }
    e.x = P.x + 100;
    if (e.state !== 'chase') Object.assign(e, { state: 'chase', z: 0 });
  });
  delete keys.atk;
  assert.deepEqual([...seen].sort(), [0, 1, 2]);
  assert.ok(
    TIGER.cuts.every((c) => c.dmg >= 13),
    'a cut does more than a punch (8)',
  );
  assert.ok(e.hp < 999 - TIGER.cuts[0].dmg * 2);
  // the whole chain takes longer than hers (about 0.9 s)
  const chain = TIGER.cuts.reduce((n, c) => n + c.wind + c.act + c.rec, 0);
  assert.ok(chain > 1.4, `${chain.toFixed(2)} s`);
});

test('his guard: a blow from in front blocked late does no harm but costs rage', () => {
  P.rage = 100;
  foe(80);
  guardUp();
  step(GD.deflect + 0.1);
  assert.equal(P.state, 'guard');
  const hp = P.hp;
  assert.ok(hitPlayer(10, -1, false), 'it counts as landed for the attacker');
  assert.equal(P.hp, hp, 'no harm');
  assert.equal(P.rage, 100 - GD.cost);
  assert.equal(P.state, 'guard');
  hitPlayer(10, -1, true);
  assert.equal(P.rage, 100 - GD.cost * 3, 'a heavy blow costs twice');
  // from behind it goes through
  hitPlayer(10, 1, false);
  assert.ok(P.hp < hp);
});

test('K just as a blow lands deflects it: no harm, rage, the attacker reels, his next cut is harder', () => {
  P.rage = 0;
  const e = foe(80);
  guardUp();
  const hp = P.hp;
  assert.ok(hitPlayer(10, -1, false));
  assert.equal(P.hp, hp);
  assert.equal(P.rage, GD.rage, 'rage gained');
  assert.equal(e.state, 'hurt', 'the attacker reels');
  assert.ok(P.ripT > 0);
  // his next cut does more
  delete keys.bone;
  step(0.2);
  e.hp = e.T.hp = 999;
  Object.assign(e, { state: 'chase', x: P.x + 100 });
  pressed.atk = true;
  step(TIGER.cuts[0].wind + TIGER.cuts[0].act + 0.05);
  assert.ok(999 - e.hp >= TIGER.cuts[0].dmg * GD.ripK - 0.01, `${999 - e.hp}`);
});

test('K mashed gives only a sliver of a deflect', () => {
  P.rage = 100;
  foe(80);
  guardUp();
  step(0.1);
  pressed.bone = true;
  step(DT);
  assert.equal(P.gWin, GD.spamWin);
  step(GD.spamWin + 0.02);
  hitPlayer(10, -1, false);
  assert.equal(P.rage, 100 - GD.cost, 'blocked, not deflected');
});

test('out of rage his guard holds against two blows more; the third breaks it', () => {
  P.rage = 0;
  foe(80);
  guardUp();
  step(GD.deflect + 0.1);
  const hp = P.hp;
  for (let i = 0; i < GD.breakN; i++) {
    hitPlayer(10, -1, false);
    assert.equal(P.hp, hp, `blow ${i + 1} held`);
  }
  hitPlayer(10, -1, false);
  assert.ok(P.hp < hp, 'broken');
  assert.equal(P.state, 'ko');
});

test('a grab goes through his guard; a stunning blow is turned', () => {
  P.rage = 100;
  const z = foe(60, 'zombie');
  guardUp();
  step(GD.deflect + 0.1);
  assert.ok(stunPlayer(5, 1), 'turned');
  assert.equal(P.state, 'guard');
  assert.equal(P.rage, 100 - GD.cost);
  z.face = -1;
  assert.ok(grabPlayer(z));
  assert.equal(P.state, 'grabbed');
});

test('the iai: costs rage, a dash through the foes in front, cut as the blade goes in', () => {
  const a = foe(120),
    b = foe(220);
  a.hp = b.hp = 200;
  P.rage = 50;
  pressed.hado = true;
  step(DT);
  assert.notEqual(P.state, 'iai', 'not enough rage');
  P.rage = TIGER.iai.cost + 10;
  const x0 = P.x;
  pressed.hado = true;
  step(DT);
  assert.equal(P.state, 'iai');
  assert.equal(P.rage, 10);
  step(TIGER.iai.wind + TIGER.iai.dash + 0.05);
  assert.ok(P.x - x0 > TIGER.iai.dist * 0.8, 'dashed through');
  assert.equal(a.hp, 200, 'not yet');
  step(TIGER.iai.rec);
  assert.ok(a.hp < 200 && b.hp < 200, 'both cut');
  assert.ok(TYPES.grunt.hp < TIGER.iai.dmg, 'a skeleton does not survive it');
});

test('the tiger walks and runs a little slower than Raithwyn', () => {
  keys.r = true;
  const x0 = P.x;
  step(0.3);
  const walk = P.x - x0;
  delete keys.r;
  assert.ok(walk < 180 * 0.3 && walk > 120 * 0.3, `${walk}`);
});
