// The composer's own songs: the level theme and the Bone Dragon's theme (assets/music).
// Each song is cut into parts. A part starts at `from`, then repeats `loop` [start, end]
// for as long as it is needed, crossfading over the seam; a part without a loop plays to
// the end of the file. A change of part inside one song waits for the next bar so the beat
// carries on; a change of song fades the old one out. Until a song has loaded (or when it
// cannot load, e.g. the single file opened from disk without it) the synth themes play.
// All times are in seconds of the original files.
export const SONGS = {
  main: {
    file: 'main.mp3',
    bpm: 141.79,
    parts: { level: { from: 1.353, loop: [16.525, 172.309] } },
  },
  boss: {
    file: 'boss.mp3',
    bpm: 141.19,
    parts: {
      p1: { from: 0, loop: [20.957, 112.748] },
      p2: { from: 112.748, loop: [114.448, 187.564] },
      outro: { from: 187.564 },
    },
  },
};
export const XFADE = 0.3, // crossfade over a loop seam or a change of part
  SONG_VOL = 0.65, // song level inside the master gain
  DUCK = 0.3, // share of that level while the game is paused
  LOOK = 0.2; // how far ahead seams are scheduled

// Which song part goes with which theme of the game (see themeFor in audio.js).
const THEME_PART = {
  night: ['main', 'level'],
  dragon: ['boss', 'p1'],
  dragon2: ['boss', 'p2'],
  dragonEnd: ['boss', 'outro'],
};
export const songFor = (theme) => THEME_PART[theme] ?? null;

/** The next bar line of a part at or after position `pos` (beats are counted from its loop). */
export function nextBar(song, part, pos) {
  const S = SONGS[song],
    P = S.parts[part],
    bar = 240 / S.bpm,
    anchor = P.loop ? P.loop[0] : P.from;
  return anchor + Math.ceil((pos - anchor) / bar - 1e-6) * bar;
}

let AC = null,
  bus = null,
  level = -1,
  cur = null; // { song, part, v: { src, g, t0, pos0 } }
const buffers = {},
  files = {};

// Start downloading as soon as the page opens; decoding waits for the audio context.
function fetchSong(id) {
  const url = globalThis.window?.__MUSIC__?.[id] ?? `assets/music/${SONGS[id].file}`;
  return (files[id] ??= fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.arrayBuffer();
  }));
}
if (globalThis.document && globalThis.fetch) for (const id in SONGS) fetchSong(id).catch(() => {}); // a failure is handled on decode

/** Connects the song player to an audio context; `out` is the master gain. */
export function songsAttach(ctx, out, decode = true) {
  AC = ctx;
  bus = AC.createGain();
  bus.gain.value = 0;
  bus.connect(out);
  level = 0;
  cur = null;
  if (decode)
    for (const id in SONGS)
      fetchSong(id)
        .then((data) => new Promise((ok, no) => AC.decodeAudioData(data, ok, no)))
        .then((buf) => (buffers[id] = buf))
        .catch(() => {}); // stays on the synth theme
}
/** For tests and offline rendering: a decoded song handed over directly. */
export const songBuffer = (id, buf) => (buffers[id] = buf);

function play(song, part, when, fade, pos = SONGS[song].parts[part].from) {
  const src = AC.createBufferSource(),
    g = AC.createGain();
  src.buffer = buffers[song];
  src.connect(g);
  g.connect(bus);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(1, when + fade);
  src.start(when, pos);
  return { src, g, t0: when, pos0: pos };
}
function fadeOut(v, when, dur) {
  v.g.gain.cancelScheduledValues(when);
  v.g.gain.setValueAtTime(v.t0 < when ? 1 : 0, when);
  v.g.gain.linearRampToValueAtTime(0, when + dur);
  v.src.stop(when + dur + 0.05);
}

/**
 * Called by the music scheduler. Plays the song part that goes with `theme` (kept, but
 * quieter, while paused) and returns true while a song is playing, so the synth stays quiet.
 */
export function songTick(theme, paused, muted) {
  if (!AC) return false;
  const now = AC.currentTime,
    target = muted ? 0 : paused ? SONG_VOL * DUCK : SONG_VOL;
  if (target !== level) {
    bus.gain.setTargetAtTime(target, now, 0.12);
    level = target;
  }
  const want = paused && cur ? [cur.song, cur.part] : songFor(theme);
  if (!want || !buffers[want[0]]) {
    if (cur) fadeOut(cur.v, now, theme ? 0.8 : 2); // a synth theme next, or silence
    cur = null;
    return false;
  }
  const [song, part] = want;
  if (!cur || cur.song !== song) {
    if (cur) fadeOut(cur.v, now, 1);
    cur = { song, part, v: play(song, part, now + 0.05, cur ? 0.6 : 0.03) };
    return true;
  }
  // a loop seam coming up: the old pass rings on into its tail while the new one fades in
  const P = SONGS[song].parts[cur.part];
  if (P.loop) {
    const seam = cur.v.t0 + (P.loop[1] - cur.v.pos0);
    if (seam < now + LOOK) {
      const at = Math.max(seam, now);
      fadeOut(cur.v, at, XFADE);
      cur.v = play(song, cur.part, at, XFADE, P.loop[0] + (at - seam));
    }
  }
  // a new part (the dragon's second phase, its death): on the next bar line
  if (cur.part !== part) {
    const v = cur.v,
      pos = v.pos0 + (now + LOOK - v.t0),
      at = v.t0 + (nextBar(song, cur.part, pos) - v.pos0);
    fadeOut(v, at, XFADE);
    cur = { song, part, v: play(song, part, at, XFADE) };
  }
  return true;
}
/** What is playing now, for tests. */
export const songNow = () =>
  cur && { song: cur.song, part: cur.part, t0: cur.v.t0, pos0: cur.v.pos0 };
