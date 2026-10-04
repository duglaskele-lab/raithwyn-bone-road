// Skeletal animation as data.
//
// A pose is a set of joint values for the skeleton rig in skeleton.js:
//   lean (spine), head, rot (whole body), hipH (hip height, null = standing on the legs),
//   jaw, ka (a held blade, null = along the forearm),
//   aF / aB (front / back arm: [upper arm, forearm]), lF / lB (legs: [thigh, shin]).
// Angles are in radians: 0 points straight down, PI/2 forward, PI up.
//
// A clip says how a pose moves while an enemy is in some state. Its parts, applied in order:
//   set:   values held for the whole state
//   tween: { dur, from, to, ease = true, clamp = true } values blended from `from` to `to`
//          over the first `dur` seconds of the state (clamp: false lets it run on past `to`)
//   shake: { after = 0, amp, rate, fields } a tremble once `after` seconds have passed
//   fn:    (o, e, k) => a hand-written touch for what plain data cannot say
// A clip may also be a list of variants: the first whose `if(e)` holds and whose `until`
// (seconds into the state) has not passed is used.
// Any value may be a function (e, k) => value, and 'pre' stands for the front arm's guard
// before the state began. k = { T, br (breathing, -1..1), pre, wind, strike }.
import { clamp, ease, lerp } from './util.js';

const val = (v, e, k) => (typeof v === 'function' ? v(e, k) : v === 'pre' ? k.pre : v);
const mixv = (a, b, p) =>
  Array.isArray(a) ? [lerp(a[0], b[0], p), lerp(a[1], b[1], p)] : lerp(a, b, p);

/** Pick the variant of a clip that applies now. */
function variant(clip, e) {
  if (!Array.isArray(clip)) return clip;
  return (
    clip.find((c) => (!c.if || c.if(e)) && (c.until === undefined || e.t < val(c.until, e))) ?? null
  );
}
/** Apply a clip to pose `o` for enemy `e` (its state clock is e.t). */
export function play(clip, o, e, k) {
  const c = variant(clip, e);
  if (!c) return o;
  if (c.set) for (const f in c.set) o[f] = copy(val(c.set[f], e, k));
  if (c.tween) {
    const w = c.tween,
      u = e.t / val(w.dur, e, k),
      cu = w.clamp === false ? u : clamp(u, 0, 1),
      p = w.ease === false ? cu : ease(cu);
    for (const f in w.to) o[f] = mixv(val(w.from[f], e, k), val(w.to[f], e, k), p);
  }
  if (c.shake && e.t > val(c.shake.after ?? 0, e, k)) {
    const j = Math.sin(e.t * c.shake.rate) * c.shake.amp;
    for (const f of c.shake.fields)
      if (Array.isArray(o[f])) o[f] = [o[f][0] + j, o[f][1] + j];
      else o[f] += j;
  }
  c.fn?.(o, e, k);
  return o;
}
const copy = (v) => (Array.isArray(v) ? v.slice() : v);

// Arm angles of the plain attack styles: drawn back (wind) and thrown out (strike), and how
// far the body leans into the blow.
const UP = [2.95, 3.55];
export const STYLE = {
  punch: { wind: [-0.9, 0.9], strike: [1.5, 1.57], lunge: 0.34 },
  smash: { wind: UP, strike: [0.95, 1.05], lunge: 0.5 },
  slash: { wind: UP, strike: [1.2, 1.45], lunge: 0.34 },
  grab: { wind: [1.15, 1.0], strike: [1.35, 1.5], lunge: 0.34 },
  other: { wind: UP, strike: [1.35, 1.5], lunge: 0.34 },
};
/** The standing pose every skeleton starts from, breathing (`br` from -1 to 1). */
export const rest = (br) => ({
  lean: 0.1,
  head: 0,
  rot: 0,
  hipH: null,
  jaw: 0,
  ka: null,
  aF: [0.25 + 0.05 * br, 1.2 + 0.08 * br],
  aB: [0.02 - 0.04 * br, 0.95],
  lF: [0.16, -0.02],
  lB: [-0.22, -0.34],
});
/** The walk cycle: legs swing with e.walkT, the arms swing against them. */
export function walkCycle(o, e, amp, lean) {
  const s = Math.sin(e.walkT),
    c = Math.cos(e.walkT);
  o.lF = [amp * s, amp * s - 0.15 - 0.6 * Math.max(0, c)];
  o.lB = [-amp * s, -amp * s - 0.15 - 0.6 * Math.max(0, -c)];
  o.aF = [0.25 - 0.35 * s, 1.25 - 0.25 * s];
  o.aB = [0.05 + 0.35 * s, 1 + 0.25 * s];
  o.lean = lean;
}
// States in which a moving skeleton walks: [stride, lean].
export const WALKS = { chase: [0.5, 0.16], charge: [0.8, 0.5] };
const STAND = { lF: [0.16, -0.02], lB: [-0.22, -0.34] };
/** The clips every skeleton shares; each foe adds its own in its pose.states. */
export const POSES = {
  windup: {
    set: { lF: [0.3, 0.1], lB: [-0.35, -0.5] },
    tween: {
      dur: (e) => e.T.wind * 0.7,
      from: { aF: 'pre', lean: 0.1, jaw: 0 },
      to: { aF: (e, k) => k.wind, lean: -0.14, jaw: 4 },
    },
    shake: { after: (e) => e.T.wind * 0.7, amp: 0.04, rate: 70, fields: ['aF'] },
  },
  attack: {
    set: { lF: [0.6, 0.15], lB: [-0.55, -0.8], head: 0.1, jaw: 5 },
    tween: {
      dur: 0.07,
      ease: false,
      from: { aF: (e, k) => k.wind, lean: -0.14 },
      to: { aF: (e, k) => k.strike, lean: (e, k) => k.lunge },
    },
  },
  recover: [
    {
      // getting up from a ground slam
      if: (e) => e.slammed,
      tween: {
        dur: (e) => e.T.rec,
        from: { aF: [0.75, 0.55], aB: [0.6, 0.4], lean: 0.6, lF: [1.1, -0.6], lB: [0.9, -0.8] },
        to: { aF: 'pre', aB: [0.02, 0.95], lean: 0.1, ...STAND },
      },
    },
    {
      tween: {
        dur: (e) => e.T.rec,
        from: { aF: (e, k) => k.strike, lean: 0.34, lF: [0.6, 0.15], lB: [-0.55, -0.8] },
        to: { aF: 'pre', lean: 0.1, ...STAND },
      },
    },
  ],
  hurt: {
    set: {
      lean: -0.32,
      head: -0.4,
      aF: [-0.6, 0.2],
      aB: [-1, -0.3],
      lF: [0.34, 0.12],
      lB: [-0.08, -0.3],
      jaw: 5,
    },
  },
  air: {
    set: {
      aF: [1.9, 2.3],
      aB: [1.4, 1.9],
      lF: [0.95, 0.4],
      lB: [0.45, -0.1],
      hipH: 44,
      jaw: 5,
      head: 0.3,
    },
    tween: { dur: 0.27, ease: false, from: { rot: 0 }, to: { rot: -1.35 } },
  },
  down: {
    set: {
      rot: -1.5,
      hipH: 10,
      aF: [2.5, 2.7],
      aB: [0.5, 0.3],
      lF: [0.2, 0.1],
      lB: [-0.12, -0.05],
      lean: 0,
    },
  },
  getup: {
    tween: {
      dur: 0.45,
      from: { rot: -1.5, hipH: 10, aF: [2.5, 2.7], lF: [0.9, -0.6], lB: [0.6, -0.9] },
      to: { rot: 0, hipH: 70, aF: 'pre', ...STAND },
    },
  },
  rise: {
    set: { aF: (e, k) => [2.7 + 0.1 * k.br, 3.05], aB: [2.45, 2.9], jaw: 4, head: -0.15 },
  },
};
