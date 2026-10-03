import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SAMURAI, TYPES, WAVES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { hurtEnemy } from '../src/combat.js';
import { spawn, updEnemy } from '../src/enemies.js';
import { DT, freshGame } from './helpers.js';

beforeEach(freshGame);

const run = (e, seconds) => {
  for (let i = 0; i < seconds / DT; i++) updEnemy(e, DT, { n: 0 });
};
// A samurai standing on the road, ready to act, the player at `px`.
function samuraiAt(x, px, extra = {}) {
  G.cam = 0;
  Object.assign(P, { x: px, y: 450, z: 0, hp: 100, inv: 0, state: 'idle' });
  const e = spawn('samurai', 1, x, 450);
  Object.assign(e, { state: 'chase', t: 0, cd: 0, stanceCd: 0 }, extra);
  return e;
}

test('the samurai is a mid-strength elite that turns up on the road', () => {
  const T = TYPES.samurai;
  assert.ok(T.hp > TYPES.grunt.hp && T.hp < TYPES.brute.hp);
  assert.ok(T.score > TYPES.biker.score);
  assert.ok(WAVES.filter((w) => w.sp.some((s) => s[0] === 'samurai')).length >= 2);
});

test('from a distance it takes its stance and creeps up; close enough, it cuts', () => {
  const e = samuraiAt(800, 450);
  run(e, DT);
  assert.equal(e.state, 'stance');
  const x0 = e.x;
  run(e, 1);
  assert.ok(e.x < x0, 'creeping towards the player');
  assert.ok(x0 - e.x < SAMURAI.walk * 1.2, 'slowly');
  // the player steps inside its range
  P.x = e.x - SAMURAI.range + 10;
  run(e, DT);
  assert.equal(e.state, 'draw');
  run(e, SAMURAI.draw + DT);
  assert.equal(e.state, 'slash');
  run(e, SAMURAI.slash);
  assert.equal(P.hp, 100 - SAMURAI.dmg, 'one lightning cut');
  assert.equal(P.state, 'ko', 'that knocks the player down');
});

test('the cut sweeps a wide arc in front and a little behind', () => {
  for (const [rel, hit] of [
    [-SAMURAI.back + 10, true],
    [SAMURAI.arc - 10, true],
    [SAMURAI.arc + 20, false],
  ]) {
    freshGame();
    const e = samuraiAt(600, 0, { state: 'slash', t: 0, face: -1, hitDone: false });
    P.x = e.x - rel;
    updEnemy(e, 0.0001, { n: 0 });
    assert.equal(P.hp < 100, hit, `${rel} px in front`);
  }
});

test('a hit from afar breaks the stance and dazes it for two seconds', () => {
  for (const src of ['bone', 'hado', 'super']) {
    freshGame();
    const e = samuraiAt(800, 300, { state: 'stance' });
    assert.ok(hurtEnemy(e, 7, 1, src !== 'bone', src));
    assert.equal(e.state, 'daze', src);
    assert.ok(e.hp < TYPES.samurai.hp, 'and it still takes the damage');
    // dazed: plain hits do not wake it up
    hurtEnemy(e, 1, 1, false, 'punch');
    assert.equal(e.state, 'daze');
    run(e, SAMURAI.daze - 0.1);
    assert.equal(e.state, 'daze');
    run(e, 0.2);
    assert.equal(e.state, 'chase');
  }
});

test('a blow up close does not break the stance: it answers with the cut', () => {
  const e = samuraiAt(800, 300, { state: 'stance' });
  hurtEnemy(e, 8, 1, false, 'punch');
  assert.equal(e.state, 'draw');
  e.state = 'slash';
  hurtEnemy(e, 8, 1, true, 'punch');
  assert.equal(e.state, 'slash', 'the cut is too fast to stop');
});

test('it is quick to take the stance again', () => {
  assert.ok(SAMURAI.stanceCd[1] < 2);
  // just out of reach of its cut, even right after another move, it settles into the stance
  const e = samuraiAt(800, 800 - SAMURAI.range - 10, { cd: 1 });
  run(e, DT);
  assert.equal(e.state, 'stance');
});

test('the stance does not last for ever', () => {
  const e = samuraiAt(800, 100, { state: 'stance' });
  run(e, SAMURAI.stance + 0.1);
  assert.equal(e.state, 'chase');
  assert.ok(e.stanceCd > 0, 'a pause before the next one');
});

test('up close and out of its stance it kicks', () => {
  const e = samuraiAt(560, 500, { stanceCd: 9 });
  run(e, DT);
  assert.equal(e.state, 'windup');
  run(e, TYPES.samurai.wind + TYPES.samurai.act);
  assert.equal(P.hp, 100 - TYPES.samurai.dmg);
});
