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

// --- the scrapyard's six -------------------------------------------------------------------------

test('the rust-eater eats a wreck: health back and a plate more; a heavy blow tears one off', async () => {
  const { EATER } = await import('../src/config.js');
  wastes(4);
  P.x = G.cam + 40;
  P.inv = 99;
  const r = foe('rusteater', 500),
    j = foe('junker', 640);
  r.hp = 60;
  hurtEnemy(j, 999, 1, true, 'punch');
  step(1 + EATER.eat + 3, () => (P.inv = 99));
  assert.ok(j.dead, 'eaten');
  assert.equal(r.plates, 1);
  assert.ok(r.hp >= 60 + EATER.heal - 1);
  const hp = r.hp;
  hurtEnemy(r, 10, 1, false, 'punch');
  assert.ok(Math.abs(hp - r.hp - 10 * (1 - EATER.plate)) < 0.01, 'a plate turns some of it');
  hurtEnemy(r, 1, 1, true, 'punch');
  assert.equal(r.plates, 0, 'torn off');
});

test('the brute throws her down; a robot it lifts and hurls, the body striking its own', async () => {
  const { BRUTE } = await import('../src/config.js');
  wastes();
  const b = foe('twohead', 300, 0, { face: 1 }),
    j = foe('junker', 380),
    j2 = foe('junker', 640);
  P.x = G.cam + 40;
  Object.assign(b, { state: 'thGrab', t: 0 });
  update(DT);
  assert.equal(j.state, 'thHeld');
  step(BRUTE.hold + 0.6, () => {
    P.inv = 99;
    j2.state = 'chase';
    j2.x = b.x + 340;
    j2.y = b.y;
  });
  assert.ok(j2.hp < TYPES.junker.hp, 'struck by the thrown body');
  // her: thrown down hard
  freshGame();
  wastes();
  const b2 = foe('twohead', 70, 0, { face: -1, state: 'thGrab', t: 0 });
  const hp = P.hp;
  update(DT);
  assert.ok(P.hp <= hp - BRUTE.grab.dmg + 0.01);
  assert.ok(['ko', 'air', 'down', 'hurt'].includes(P.state) || P.z > 0, P.state);
  b2.dead = true;
});

test('three blows of hers in a row: the dopey head laughs, the brute open', async () => {
  const { BRUTE } = await import('../src/config.js');
  wastes();
  const b = foe('twohead', 80);
  for (let i = 0; i < 3; i++) hurtEnemy(b, 2, 1, false, 'punch');
  assert.equal(b.state, 'thLaugh');
  const hp = b.hp;
  hurtEnemy(b, 10, 1, false, 'punch');
  assert.equal(hp - b.hp, 10 * BRUTE.open);
});

test('the glowing one: its ring bites her and makes robots glitch; killed, it bursts', async () => {
  const { GLOW } = await import('../src/config.js');
  wastes();
  const g = foe('glowing', 40, 0, { state: 'glRec', t: -99 }),
    j = foe('junker', 100);
  const hp = P.hp;
  step(GLOW.tick * 3, () => {
    g.state = 'glRec';
    g.t = -99;
    j.state = 'jkRec';
    j.t = -99;
  });
  assert.ok(P.hp < hp, 'bitten');
  assert.ok(j.glitchT > 0, 'glitching');
  hurtEnemy(g, 999, 1, false, 'punch');
  assert.equal(g.state, 'glBoom');
  const jhp = j.hp;
  step(GLOW.boom + 0.1);
  assert.ok(g.dead);
  assert.ok(j.hp < jhp || j.dying, 'the flash burns the robot');
});

test('the harvester charges along its lane, mowing her and the mutants; stuck at the edge', async () => {
  const { HARV } = await import('../src/config.js');
  wastes();
  P.x = G.cam + 500;
  const h = foe('harvester', -400, 0, { face: 1 }),
    s = foe('scavenger', 200);
  Object.assign(h, { state: 'hvWind', t: 0 });
  const hp = P.hp;
  let stuck = false;
  step(HARV.wind + 2, () => {
    stuck ||= h.state === 'hvStuck';
    s.state = 'chase';
    s.cd = 99;
  });
  assert.ok(P.hp < hp, 'mowed');
  assert.ok(s.hp < TYPES.scavenger.hp, 'the mutant too');
  assert.ok(stuck, 'stuck in the sand');
  Object.assign(h, { state: 'hvStuck', t: 0 });
  const hhp = h.hp;
  hurtEnemy(h, 10, 1, false, 'punch');
  assert.equal(hhp - h.hp, 10 * HARV.open);
});

test("the spotter's beam strikes the first on its line: a robot between shields her", async () => {
  const { SPOT } = await import('../src/config.js');
  wastes();
  P.x = G.cam + 700;
  const sp = foe('spotter', -500, 0, { face: 1 });
  sp.tgt = P;
  Object.assign(sp, { state: 'stAim', t: SPOT.aim - 0.01 });
  const j = foe('junker', -250, 0, { cd: 99 });
  const hp = P.hp;
  step(DT * 3, () => (j.state = 'chase'));
  assert.equal(P.hp, hp, 'shielded by the junker');
  // a mutant between: struck instead of her
  const s = foe('scavenger', -250, 0, { cd: 99 });
  j.dead = true;
  G.enemies = G.enemies.filter((o) => !o.dead);
  Object.assign(sp, { state: 'stAim', t: SPOT.aim - 0.01 });
  step(DT * 3, () => (s.state = 'chase'));
  assert.equal(P.hp, hp);
  assert.ok(s.hp < TYPES.scavenger.hp);
  // nothing between: her
  s.dead = true;
  G.enemies = G.enemies.filter((o) => !o.dead);
  Object.assign(sp, { state: 'stAim', t: SPOT.aim - 0.01 });
  step(DT * 3);
  assert.ok(P.hp < hp);
  // a heavy blow topples it
  hurtEnemy(sp, 1, 1, true, 'punch');
  assert.equal(sp.state, 'air');
});

test('the mine beetle runs at the nearest one and bursts; kicked by her it bursts where it lands', async () => {
  const { MINE } = await import('../src/config.js');
  wastes();
  const m = foe('mine', 200);
  const hp = P.hp;
  step(2 + MINE.arm);
  assert.ok(m.dead, 'burst');
  assert.ok(P.hp < hp, 'on her');
  freshGame();
  wastes();
  const m2 = foe('mine', 60),
    j = foe('junker', 260, 0, { cd: 99 });
  hurtEnemy(m2, 1, 1, false, 'punch');
  assert.equal(m2.state, 'mbKick');
  step(1, () => {
    j.state = 'chase';
    j.cd = 99;
  });
  assert.ok(m2.dead);
  assert.ok(j.hp < TYPES.junker.hp || j.dying, 'among its own');
});
