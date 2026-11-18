import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DECOR, JUNK, SCAV, SPIT, STAGE_HOLD, TYPES, WAR, WELD } from '../src/config.js';
import { APP, G, P } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { spawn } from '../src/enemies.js';
import { hurtEnemy } from '../src/combat.js';
import { update } from '../src/world.js';
import { themeFor } from '../src/audio.js';
import { camTo, LAST_LEVEL, onFloor, pathAt, pathPx, startLevel } from '../src/level.js';
import { PATH, WAVES4 } from '../src/level4.js';
import { pickTarget, rivalHit, swing } from '../src/foes/war.js';
import '../src/foes/index.js';
import { DT, freshGame } from './helpers.js';

beforeEach(freshGame);

const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.(i);
  }
};
/** The Wastelands, the camera at fight `i`, no fight on, nothing about. */
function wastes(i = 0) {
  startLevel(4);
  G.banner = null;
  G.waveI = 99;
  G.props = [];
  const d = pathPx(WAVES4[i].s, PATH);
  camTo(d);
  const c = pathAt(d, PATH);
  Object.assign(P, { x: G.cam + 150, y: c.y, inv: 0, face: 1 });
}
/** A foe of `type` `dx` from her, `dy` deeper, standing ready. */
function foe(type, dx, dy = 0, extra = {}) {
  const e = spawn(type, 1, P.x + dx, P.y + dy);
  Object.assign(e, { state: 'chase', t: 0, cd: 0 }, extra);
  return e;
}

// --- the stages in their new order ---------------------------------------------------------

test('Z and 4 take her to the Wastelands, stage 4; Z and 5 to Frostfang Pass, now the last', () => {
  keys.lvlZ = true;
  keys.lvl4 = true;
  step(STAGE_HOLD + 0.2);
  assert.equal(G.level, 4);
  assert.ok(G.props.length > 8 && G.props.every((u) => DECOR[u.decor].k4), 'its own things');
  assert.ok(G.props.every((u) => onFloor(u.x, u.y)));
  assert.equal(LAST_LEVEL, 5);
  freshGame();
  keys.lvlZ = true;
  keys.lvl5 = true;
  step(STAGE_HOLD + 0.2);
  assert.equal(G.level, 5);
});

test('winning the Wastelands leads on to Frostfang Pass; its music is the western ride', () => {
  startLevel(4);
  assert.equal(themeFor('play', [], null), 'frontier');
  APP.state = 'win';
  G.endT = 8;
  pressed.atk = true;
  update(DT);
  assert.equal(G.level, 5);
  assert.equal(APP.state, 'play');
});

test('the fights: the first one is the clash, both sides in every one, the last the biggest', () => {
  assert.ok(WAVES4[0].war, 'the first: they are at it already');
  for (const w of WAVES4) {
    const sides = new Set(w.core.concat(w.mid ?? []).map(([k]) => TYPES[k].side));
    assert.deepEqual([...sides].sort(), ['bot', 'mut'], w.name);
  }
});

// --- the war ---------------------------------------------------------------------------------

test('a mutant and a robot near each other fight each other, not her', () => {
  wastes();
  const s = foe('scavenger', 500),
    j = foe('junker', 560);
  assert.equal(pickTarget(s, DT), j);
  assert.equal(pickTarget(j, DT), s);
  // her, nearer than the rival: her
  const s2 = foe('scavenger', 60);
  assert.equal(pickTarget(s2, DT), P);
});

test("a blow lands on whoever is in front: her and the other side, never its own side's", () => {
  wastes();
  const s = foe('scavenger', 300, 0, { face: 1 }),
    j = foe('junker', 360),
    s2 = foe('scavenger', 350);
  P.x = s.x + 50;
  const hp = P.hp;
  swing(s, 10, 100, 24, 120, 10, false);
  assert.ok(P.hp < hp, 'her');
  assert.equal(j.hp, TYPES.junker.hp - 10 * WAR.rivalK, 'the robot, at a share of the harm');
  assert.equal(s2.hp, TYPES.scavenger.hp, 'not its own');
});

test('a foe a rival finishes is worth half; all of it and a bonus if she hit it just before', () => {
  wastes();
  const s = foe('scavenger', 400),
    j = foe('junker', 450);
  let sc = P.score;
  j.hp = 1;
  rivalHit(s, j, 50, false);
  assert.equal(P.score - sc, Math.round(TYPES.junker.score * WAR.half));
  const j2 = foe('junker', 450);
  hurtEnemy(j2, 1, 1, false, 'punch'); // hers
  j2.hp = 1;
  sc = P.score;
  rivalHit(s, j2, 50, false);
  assert.equal(P.score - sc, TYPES.junker.score + WAR.bonus);
  assert.ok(G.floats.length > 0, 'SET ON!');
});

test('whoever hit it last it goes after', () => {
  wastes();
  const s = foe('scavenger', 300),
    j = foe('junker', 700);
  rivalHit(j, s, 5, false);
  assert.equal(pickTarget(s, DT), j);
  hurtEnemy(s, 1, 1, false, 'punch');
  assert.equal(pickTarget(s, DT), P, 'her blow: now her');
});

test('the clash: they do not see her until she comes close or hits one of them', () => {
  wastes(0);
  G.waveI = 0;
  const s = foe('scavenger', 300),
    j = foe('junker', 600);
  assert.ok(s.unaware && j.unaware);
  // even with her nearer than the rival
  s.x = P.x + 120;
  j.x = P.x + 700;
  s.lookT = 0;
  assert.equal(pickTarget(s, DT), j);
  hurtEnemy(s, 1, -1, false, 'punch');
  assert.ok(!s.unaware);
  assert.equal(pickTarget(s, DT), P);
});

// --- the four of them ---------------------------------------------------------------------------

test("the scavenger strips a robot's wreck and fights with its saw, until a heavy blow", () => {
  wastes();
  P.inv = 99;
  const j = foe('junker', 500),
    s = foe('scavenger', 400);
  hurtEnemy(j, 999, 1, true, 'punch');
  step(1, () => (P.inv = 99));
  assert.equal(j.state, 'wkLie', 'a wreck');
  step(SCAV.loot + 2.5, () => (P.inv = 99));
  assert.ok(s.saw, 'it has the saw');
  assert.ok(j.looted);
  hurtEnemy(s, 1, 1, true, 'punch');
  assert.ok(!s.saw, 'knocked out of its hands');
});

test('the spitter: acid on a robot corrodes it (more harm); its swollen sac takes double', () => {
  wastes();
  P.x = G.cam + 60;
  P.inv = 99;
  const sp = foe('spitter', 160),
    j = foe('junker', 450);
  sp.lookT = 9;
  sp.tgt = j;
  sp.face = 1;
  sp.state = 'spWind';
  sp.t = 0;
  let hit = false;
  step(SPIT.wind + SPIT.flight + 0.3, () => {
    P.inv = 99;
    j.state = 'chase'; // (it stands where it is)
    j.x = sp.x + 290;
    j.y = sp.y;
    hit ||= j.corrodeT > 0;
  });
  assert.ok(hit, 'corroded');
  j.corrodeT = 3;
  const hp = j.hp;
  hurtEnemy(j, 10, 1, false, 'punch');
  assert.equal(hp - j.hp, 10 * SPIT.corrodeK);
  // the sac
  const sp2 = foe('spitter', 300, 0, { state: 'spWind', t: 0.1 });
  hurtEnemy(sp2, 5, 1, false, 'punch');
  assert.equal(sp2.hp, TYPES.spitter.hp - 5 * SPIT.sac);
});

test('the junker zaps her (stunned a moment); a blow of hers from a jump tips it over', () => {
  wastes();
  const j = foe('junker', 70, 0, { face: -1 });
  j.state = 'jkZap';
  j.t = 0;
  j.hitDone = false;
  j.tgt = P;
  update(DT);
  assert.equal(P.state, 'dazed');
  assert.ok(P.dazeT >= JUNK.stun - 0.01);
  freshGame();
  wastes();
  const j2 = foe('junker', 80);
  P.z = 40;
  hurtEnemy(j2, 2, 1, false, 'punch');
  assert.equal(j2.state, 'air');
});

test('the welder welds a wreck back up (half its health) and mends hurt robots; a blow stops it', () => {
  wastes();
  P.x = G.cam + 40;
  P.inv = 99;
  const w = foe('welder', 700),
    j = foe('junker', 500);
  hurtEnemy(j, 999, 1, true, 'punch');
  let welding = false;
  step(1.2 + WELD.weld + 2, () => {
    P.inv = 99;
    welding ||= w.state === 'wdWeld';
  });
  assert.ok(welding);
  assert.ok(!j.dying && j.raised, 'up again');
  assert.ok(j.hp <= TYPES.junker.hp * WELD.hpK);
  // mending
  j.hp = 10;
  w.workCd = 0;
  w.state = 'wdThink';
  let mended = false;
  step(2, () => {
    P.inv = 99;
    mended ||= w.state === 'wdFix';
  });
  assert.ok(mended && j.hp > 10, `${j.hp}`);
  // a blow while it mends stops it
  Object.assign(w, { state: 'wdFix', t: 0, job: j });
  hurtEnemy(w, 2, 1, false, 'punch');
  assert.notEqual(w.state, 'wdFix');
});
