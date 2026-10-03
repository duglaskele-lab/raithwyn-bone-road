import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DUCK,
  SONGS,
  SONG_VOL,
  XFADE,
  nextBar,
  songBuffer,
  songFor,
  songNow,
  songTick,
  songsAttach,
} from '../src/songs.js';

// A stand-in for the Web Audio context that records what the player schedules.
function fakeContext() {
  const ctx = { currentTime: 0, starts: [], stops: [] };
  const param = () => ({
    value: 0,
    events: [],
    setValueAtTime(v, t) {
      this.events.push(['set', v, t]);
    },
    linearRampToValueAtTime(v, t) {
      this.events.push(['ramp', v, t]);
    },
    setTargetAtTime(v, t) {
      this.events.push(['target', v, t]);
    },
    cancelScheduledValues() {},
  });
  ctx.createGain = () => ({ gain: param(), connect() {} });
  ctx.createBufferSource = () => {
    const src = {
      connect() {},
      start: (when, pos) => ctx.starts.push({ src, when, pos }),
      stop: (when) => ctx.stops.push({ src, when }),
    };
    return src;
  };
  return ctx;
}
let ctx, bus;
const tick = (theme, paused = false, muted = false) => songTick(theme, paused, muted);
const runTo = (t, theme) => {
  for (; ctx.currentTime < t; ctx.currentTime += 0.05) tick(theme);
};
beforeEach(() => {
  ctx = fakeContext();
  const out = { connect() {} };
  const make = ctx.createGain;
  ctx.createGain = () => (bus = make());
  songsAttach(ctx, out, false);
  ctx.createGain = make;
  for (const id in SONGS) songBuffer(id, {});
});

test('the loops sit near the timecodes the composer gave, and are whole bars long', () => {
  const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
  const { main, boss } = SONGS;
  near(main.parts.level.from, 1.4, 0.1);
  near(main.parts.level.loop[0], 17, 1);
  near(main.parts.level.loop[1], 171, 2);
  near(boss.parts.p1.loop[0], 18, 3);
  near(boss.parts.p1.loop[1], 113, 1);
  near(boss.parts.p2.from, 113, 1);
  near(boss.parts.p2.loop[1], 190, 3);
  for (const S of [main, boss])
    for (const P of Object.values(S.parts))
      if (P.loop) {
        const bars = ((P.loop[1] - P.loop[0]) * S.bpm) / 240;
        near(bars, Math.round(bars), 0.1);
      }
  // the second phase and the outro carry on from where the loops end
  assert.equal(boss.parts.p2.from, boss.parts.p1.loop[1]);
  assert.equal(boss.parts.outro.from, boss.parts.p2.loop[1]);
});

test('themes map onto song parts; the menus keep the synth', () => {
  assert.deepEqual(songFor('night'), ['main', 'level']);
  assert.deepEqual(songFor('dragon'), ['boss', 'p1']);
  assert.deepEqual(songFor('dragon2'), ['boss', 'p2']);
  assert.deepEqual(songFor('dragonEnd'), ['boss', 'outro']);
  assert.equal(songFor('graveyard'), null);
  assert.equal(songFor('tense'), null);
  assert.equal(tick('graveyard'), false);
});

test('the level song starts past its opening and loops back with a crossfade', () => {
  const { from, loop } = SONGS.main.parts.level;
  assert.equal(tick('night'), true);
  assert.equal(ctx.starts[0].pos, from);
  const first = ctx.starts[0].when,
    seam = first + loop[1] - from;
  runTo(seam + 1, 'night');
  assert.equal(ctx.starts.length, 2, 'one more pass');
  assert.ok(Math.abs(ctx.starts[1].when - seam) < 1e-9, 'right on the seam');
  assert.equal(ctx.starts[1].pos, loop[0]);
  const stop = ctx.stops.find((s) => s.src === ctx.starts[0].src);
  assert.ok(
    Math.abs(stop.when - (seam + XFADE + 0.05)) < 1e-9,
    'the old pass rings on for the fade',
  );
  runTo(seam + (loop[1] - loop[0]) + 1, 'night');
  assert.equal(ctx.starts.length, 3, 'and again');
  assert.equal(ctx.starts[2].pos, loop[0]);
});

test('the second phase comes in on a bar line of the first', () => {
  tick('dragon');
  assert.equal(songNow().part, 'p1');
  runTo(40.02, 'dragon');
  tick('dragon2');
  const now = songNow(),
    { p1, p2 } = SONGS.boss.parts,
    bar = 240 / SONGS.boss.bpm;
  assert.equal(now.part, 'p2');
  assert.equal(now.pos0, p2.from);
  const old = ctx.starts.at(-2),
    pos = old.pos + (now.t0 - old.when),
    bars = (pos - p1.loop[0]) / bar;
  assert.ok(Math.abs(bars - Math.round(bars)) < 1e-6, `${bars} bars into the loop`);
  assert.ok(now.t0 >= ctx.currentTime && now.t0 < ctx.currentTime + bar + 0.3);
  assert.ok(Math.abs(nextBar('boss', 'p1', pos) - pos) < 1e-6);
});

test('a new song fades the old one out; pause ducks it; game over fades it away', () => {
  tick('night');
  ctx.currentTime = 5;
  tick('dragon');
  assert.equal(songNow().song, 'boss');
  assert.equal(ctx.starts.at(-1).pos, 0, 'the boss song plays from its intro');
  tick(null, true);
  assert.equal(songNow().song, 'boss', 'still there under the pause menu');
  assert.deepEqual(bus.gain.events.at(-1).slice(0, 2), ['target', SONG_VOL * DUCK]);
  tick('dragon', false, true);
  assert.deepEqual(bus.gain.events.at(-1).slice(0, 2), ['target', 0], 'muted');
  assert.equal(tick(null), false);
  assert.equal(songNow(), null);
});

test('without the recording the synth keeps playing', () => {
  songsAttach(fakeContext(), { connect() {} }, false);
  for (const id in SONGS) songBuffer(id, undefined);
  assert.equal(tick('night'), false);
});
