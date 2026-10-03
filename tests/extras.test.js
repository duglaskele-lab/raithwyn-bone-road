import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SECRET_HOLD, WAVES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { MAP, keys, pressed } from '../src/input.js';
import { hurtEnemy } from '../src/combat.js';
import { THEMES, themeFor } from '../src/audio.js';
import { STYLE_GRACE } from '../src/style.js';
import { update } from '../src/world.js';
import { DT, freshGame } from './helpers.js';

beforeEach(freshGame);

const step = (seconds) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
  }
};

test('the level plays the night theme; the older themes stay in the game', () => {
  assert.equal(themeFor('play'), 'night');
  assert.ok(THEMES.western, 'the western is kept');
  assert.equal(themeFor('title'), 'graveyard');
  assert.equal(themeFor('select'), 'tense');
  assert.ok(THEMES.graveyard.lead.length > 0, 'the old level theme is kept');
  assert.ok(THEMES.western.step < THEMES.graveyard.step, 'the western is faster');
});

test('smashing scenery gives no style but stops the meter from draining', () => {
  P.sty = 250;
  P.styT = STYLE_GRACE - 0.1;
  const prop = G.props.find((u) => u.decor === 'cross' || u.decor === 'bench');
  hurtEnemy(prop, 1, 1, false, 'punch');
  assert.equal(P.sty, 250, 'no style points');
  assert.equal(P.styT, 0, 'the drain timer starts over');
});

test('holding X for three seconds at the start skips to the final boss', () => {
  assert.equal(MAP.KeyX, 'secret');
  keys.secret = true;
  step(SECRET_HOLD * 0.9);
  assert.equal(G.waveI, 0, 'not yet');
  step(SECRET_HOLD * 0.15);
  assert.equal(G.waveI, WAVES.length - 1);
  keys.secret = false;
  step(1.5);
  assert.ok(G.wave, 'the final fight starts');
  assert.ok(G.enemies.some((e) => e.type === 'dragon'));
});

test('the secret only works before the first fight', () => {
  keys.r = true;
  step(8, () => (P.inv = 1));
  keys.r = false;
  assert.ok(G.wave);
  keys.secret = true;
  step(SECRET_HOLD + 0.5);
  assert.equal(G.waveI, 0);
});

test('the night theme is long, has two solos and a break, and loops without the intro', () => {
  const N = THEMES.night,
    loopSecs = N.form.length * 64 * N.step;
  assert.ok(loopSecs > 70, `${loopSecs.toFixed(0)} s`);
  for (const s of ['solo1', 'solo2', 'brk']) assert.ok(N.form.includes(s), s);
  for (const id of N.form) for (const c of N.sections[id].ch) assert.ok(N.chords[c], c);
  const second = N.form.length * 64;
  assert.equal(N.at(0).idx, 0, 'the first pass opens with the intro');
  assert.equal(N.at(second).idx, 1, 'the loop starts after it');
  // every step of the whole form plays without errors (no audio context: tone() is a no-op)
  for (let n = 0; n < second * 2; n++) N.play(n, 0);
});
