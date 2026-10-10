import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ACID, DECOR, TYPES } from '../src/config.js';
import { APP, G, P } from '../src/state.js';
import { pressed } from '../src/input.js';
import { hitPlayer, hurtEnemy, killEnemy, strike } from '../src/combat.js';
import { spawn } from '../src/enemies.js';
import { update } from '../src/world.js';
import { PAUSE_BOX, SET_BOX, menuStep, pauseStep } from '../src/menu.js';
import {
  RANKS,
  STYLE_GRACE,
  STYLE_STEP,
  dmgMult,
  scoreMult,
  styleGain,
  styleRank,
} from '../src/style.js';
import { DT, freshGame } from './helpers.js';

beforeEach(freshGame);

const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.(i);
  }
};

test('style ranks D … SSS, each +50% score and +5% damage', () => {
  assert.deepEqual(RANKS, ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS']);
  for (let r = 0; r <= 7; r++) {
    P.sty = r * STYLE_STEP + 1;
    assert.equal(styleRank(), r);
    assert.equal(scoreMult(), 1 + 0.5 * r);
    assert.ok(Math.abs(dmgMult() - (1 + 0.05 * r)) < 1e-9, `rank ${r}: ${dmgMult()}`);
  }
  styleGain(10000);
  assert.equal(styleRank(), 7, 'SSS is the top');
});

test('landing hits raises the rank, and the bonus applies to damage and score', () => {
  P.x = 400;
  P.face = 1;
  for (let i = 0; i < 12; i++) {
    const e = spawn('fat', 1, 460, P.y);
    P.hit = new Set();
    strike({ x0: 0, x1: 100, dy: 27, dmg: 8, knock: false, rage: 0 });
    assert.ok(e.hp < TYPES.fat.hp);
    G.enemies = [];
  }
  assert.ok(styleRank() >= 1, `rank after 12 hits: ${styleRank()}`);

  P.sty = 4 * STYLE_STEP + 1; // rank A: +20% damage, +200% score
  const e = spawn('fat', 1, 460, P.y);
  P.hit = new Set();
  strike({ x0: 0, x1: 100, dy: 27, dmg: 10, knock: false, rage: 0 });
  assert.ok(Math.abs(TYPES.fat.hp - e.hp - 12) < 1e-9);
  P.score = 0;
  P.sty = 4 * STYLE_STEP + 1;
  killEnemy(spawn('grunt', 1, 500, 450), 1);
  assert.equal(P.score, TYPES.grunt.score * 3);
});

test('the rank drains fast when the player stops hitting', () => {
  styleGain(250);
  const r = styleRank();
  step(STYLE_GRACE * 0.8);
  assert.equal(styleRank(), r, 'kept for a moment');
  step(3.5);
  assert.equal(P.sty, 0);
});

test('getting hurt costs two ranks of style, not all of it', () => {
  P.sty = 450; // rank A, halfway to S
  hitPlayer(5, 1, false);
  assert.equal(P.sty, 250, 'down to B, halfway');
  P.sty = 150;
  P.inv = 0;
  P.state = 'idle';
  hitPlayer(5, 1, false);
  assert.equal(P.sty, 0, 'never below nothing');
});

test('big graves, benches and crosses line the road and can be broken', () => {
  const decor = G.props.filter((u) => u.decor);
  assert.ok(decor.length >= 15, `only ${decor.length} pieces`);
  for (const kind of ['bench', 'cross', 'tomb'])
    assert.ok(
      decor.some((u) => u.decor === kind),
      kind,
    );
  assert.ok(!decor.some((u) => u.decor === 'grave'), 'no small graves any more');
  assert.ok(decor.filter((u) => u.decor === 'tomb').length >= 12, 'plenty of big graves');
  const tomb = decor.find((u) => u.decor === 'tomb');
  hurtEnemy(tomb, 1, 1, false, 'punch');
  assert.ok(!tomb.dead, 'a big grave takes several hits');
  for (let i = 1; i < DECOR.tomb.hp; i++) hurtEnemy(tomb, 1, 1, false, 'punch');
  assert.ok(tomb.dead);
  assert.ok(G.debris.length > 0);
  const bench = decor.find((u) => u.decor === 'bench');
  hurtEnemy(bench, 1, 1, false, 'punch');
  assert.ok(bench.dead);
});

test('the acid ball arcs down and leaves a puddle that bites without staggering', () => {
  P.x = 300;
  P.y = 450;
  P.inv = 99;
  const e = spawn('necro', 1, 640, 470);
  e.state = 'windup';
  e.t = TYPES.necro.wind + 0.01;
  e.face = -1;
  step(DT);
  const ball = G.projs.find((q) => q.k === 'acid');
  assert.ok(ball, 'an acid ball is cast');
  let top = ball.z;
  step(0.3, () => (top = Math.max(top, ball.z)));
  assert.ok(top > 150 * TYPES.necro.scale, 'it rises first');
  step(ACID.flight);
  assert.ok(!G.projs.includes(ball));
  assert.equal(G.pools.length, 1);
  const pool = G.pools[0];
  assert.ok(Math.abs(pool.x - P.x) < 40, 'lands where the player stood');

  G.enemies = [];
  P.inv = 0;
  P.x = pool.x;
  P.y = pool.y;
  const hp = P.hp;
  step(1.6);
  assert.ok(P.hp <= hp - 2 * ACID.dmg, `hp ${P.hp}`);
  assert.notEqual(P.state, 'hurt', 'acid drains health, it does not stagger');
  step(ACID.pool);
  assert.equal(G.pools.length, 0, 'the puddle dries up');
});

test('Esc pauses the fight; the pause menu resumes, opens settings, returns to the menu', () => {
  APP.state = 'pause';
  APP.menu = 0;
  pressed.start = true;
  pauseStep();
  assert.equal(APP.state, 'play');

  APP.state = 'pause';
  pressed.tap = [PAUSE_BOX[1][0] + 10, PAUSE_BOX[1][1] + 10];
  pauseStep();
  assert.equal(APP.state, 'settings');
  delete pressed.tap;
  pressed.tap = [SET_BOX.at(-1)[0] + 10, SET_BOX.at(-1)[1] + 10];
  menuStep(DT);
  assert.equal(APP.state, 'pause', 'Back from settings returns to the pause menu');
  delete pressed.tap;

  P.score = 500;
  pressed.tap = [PAUSE_BOX[2][0] + 10, PAUSE_BOX[2][1] + 10];
  pauseStep();
  assert.equal(APP.state, 'title');
  assert.equal(P.score, 0, 'the run is reset');
});
