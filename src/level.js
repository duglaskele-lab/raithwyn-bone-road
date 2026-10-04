// The stages: which one is played, its fights, its floor and how the camera follows the
// player. The Bone Road (stage 1) is a straight strip (the GT..GB band, the camera only goes
// right); Old Quarry (stage 2) has a floor of polygons and a camera path (see level2.js).
import { DECOR, GB, GT, H, W, WAVEGEN, WAVES } from './config.js';
import { clamp } from './util.js';
import { G, P } from './state.js';
import { FLOOR, PATH, PROPS2, WAVEGEN2, WAVES2 } from './level2.js';

export const LEVELS = {
  1: { waves: WAVES, gen: WAVEGEN, banner: ['stage1', 'subtitle'] },
  2: { waves: WAVES2, gen: WAVEGEN2, banner: ['stage2', 'subtitle2'], floor: FLOOR, path: PATH },
};
export const level = () => LEVELS[G.level] ?? LEVELS[1];
export const levelWaves = () => level().waves;

// --- the floor ---------------------------------------------------------------------------

const cross = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
/** Is the point inside a convex polygon (either winding)? */
export function inPoly(poly, x, y) {
  let pos = false,
    neg = false;
  for (let i = 0; i < poly.length; i++) {
    const c = cross(poly[i], poly[(i + 1) % poly.length], [x, y]);
    if (c > 0) pos = true;
    else if (c < 0) neg = true;
    if (pos && neg) return false;
  }
  return true;
}
/** The nearest point to (x, y) on the edges of a polygon. */
function nearestOnPoly(poly, x, y) {
  let best = null,
    bd = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length],
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      u = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy), 0, 1),
      px = a[0] + dx * u,
      py = a[1] + dy * u,
      d = (px - x) ** 2 + (py - y) ** 2;
    if (d < bd) {
      bd = d;
      best = [px, py];
    }
  }
  return [best, bd];
}
/** Can one stand at (x, y)? */
export function onFloor(x, y) {
  const L = level();
  if (!L.floor) return y >= GT && y <= GB;
  return L.floor.some((p) => inPoly(p, x, y));
}
/**
 * Keeps something on the floor. On the Bone Road only the depth is bounded (GT + top to
 * GB - bot); in Old Quarry it is moved to the nearest point of the floor.
 */
export function floorClamp(o, top = 0, bot = 0) {
  const L = level();
  if (!L.floor) {
    o.y = clamp(o.y, GT + top, GB - bot);
    return o;
  }
  if (L.floor.some((p) => inPoly(p, o.x, o.y))) return o;
  let best = null,
    bd = Infinity;
  for (const p of L.floor) {
    const [q, d] = nearestOnPoly(p, o.x, o.y);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  // a hair inside, so the next step starts on the floor
  o.x = best[0];
  o.y = best[1];
  for (const p of L.floor)
    if (!inPoly(p, o.x, o.y)) {
      const cx = p.reduce((n, v) => n + v[0], 0) / p.length,
        cy = p.reduce((n, v) => n + v[1], 0) / p.length;
      if (inPoly(p, o.x + (cx - o.x) * 0.002, o.y + (cy - o.y) * 0.002)) {
        o.x += (cx - o.x) * 0.002;
        o.y += (cy - o.y) * 0.002;
        break;
      }
    }
  return o;
}
/** The floor's depth range under x (lowest top, highest bottom), or null where there is none. */
export function floorSpan(x) {
  const L = level();
  if (!L.floor) return [GT, GB];
  let lo = Infinity,
    hi = -Infinity;
  for (const p of L.floor) {
    for (let i = 0; i < p.length; i++) {
      const a = p[i],
        b = p[(i + 1) % p.length];
      if ((a[0] - x) * (b[0] - x) > 0 || a[0] === b[0]) continue;
      const y = a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

// --- the view ----------------------------------------------------------------------------

/** Is a point of the floor on screen (with a margin)? Feet are at y, so the screen's top
 *  part only shows bodies. */
export const inView = (x, y, m = 0) =>
  x > G.cam - m && x < G.cam + W + m && y > G.camY + 150 - m && y < G.camY + H + m;
/** Keeps the player inside the view (the head too) and on the floor. */
export function viewClamp(o, maxX = G.cam + W - 30) {
  o.x = clamp(o.x, G.cam + 30, maxX);
  if (level().floor) o.y = clamp(o.y, G.camY + 215, G.camY + H - 8);
  return o;
}

// --- the camera path (Old Quarry) ---------------------------------------------------------

const segLen = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/** A position along the path in nodes (2.5) to pixels along the road. */
export function pathPx(s, path = level().path) {
  let d = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const L = segLen(path[i], path[i + 1]);
    if (s <= i + 1) return d + L * clamp(s - i, 0, 1);
    d += L;
  }
  return d;
}
/** The road point and the camera at `d` pixels along the path. */
export function pathAt(d, path = level().path) {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i],
      b = path[i + 1],
      L = segLen(a, b);
    if (d <= L || i === path.length - 2) {
      const u = clamp(d / L, 0, 1),
        f = (k) => a[k] + (b[k] - a[k]) * u;
      return {
        x: f(0),
        y: f(1),
        cx: f(0) - f(2),
        cy: f(1) - f(3),
        dir: [b[0] - a[0], b[1] - a[1]],
      };
    }
    d -= L;
  }
}
/** How far along the road (in pixels) the point nearest to (x, y) is. */
export function pathProject(x, y, path = level().path) {
  let best = 0,
    bd = Infinity,
    d0 = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i],
      b = path[i + 1],
      L = segLen(a, b),
      u = clamp(((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / (L * L), 0, 1),
      d = (a[0] + (b[0] - a[0]) * u - x) ** 2 + (a[1] + (b[1] - a[1]) * u - y) ** 2;
    if (d < bd) {
      bd = d;
      best = d0 + L * u;
    }
    d0 += L;
  }
  return best;
}
/** Puts the camera at `d` pixels along the path. */
export function camTo(d) {
  const c = pathAt(d);
  G.camS = d;
  G.cam = c.cx;
  G.camY = c.cy;
}
/**
 * The camera of Old Quarry between fights: it follows the player along the path, never back,
 * and stops where the next fight is; returns true once it is there.
 */
export function followPath(dt, lockS) {
  const lock = pathPx(lockS),
    tg = clamp(pathProject(P.x, P.y), G.camS, lock);
  camTo(G.camS + (tg - G.camS) * Math.min(1, dt * 7));
  if (G.camS >= lock - 1.5) {
    camTo(lock);
    return true;
  }
  return false;
}
/** Which way the road goes from the camera on: a unit vector (for the GO arrow). */
export function roadDir() {
  if (!level().path) return [1, 0];
  const [dx, dy] = pathAt(G.camS + 1).dir,
    n = Math.hypot(dx, dy) || 1;
  return [dx / n, dy / n];
}

// --- where enemies come from ---------------------------------------------------------------

/**
 * Where an enemy walking in from side `side` (-1 left, 1 right) appears: just off the screen
 * on that side, on the floor. In Old Quarry, where the road goes down the screen and there is
 * no floor off the side, it comes up from below (or down from above). Null: nowhere to come
 * from (it then climbs out of the ground on screen).
 */
export function entryPoint(side, r) {
  const L = level();
  if (!L.floor) return [side > 0 ? G.cam + W + 60 : G.cam - 60, GT + 14 + r() * (GB - GT - 26)];
  const tries = [];
  const x = side > 0 ? G.cam + W + 60 : G.cam - 60,
    span = floorSpan(x);
  if (span) {
    const lo = Math.max(span[0] + 8, G.camY + 220),
      hi = Math.min(span[1] - 8, G.camY + H - 10);
    if (lo < hi) tries.push([x, lo + r() * (hi - lo)]);
  }
  for (const y of [G.camY + H + 50, G.camY + 120])
    for (let i = 0; i < 6; i++) {
      const px = G.cam + 80 + r() * (W - 160);
      if (onFloor(px, y)) {
        tries.push([px, y]);
        break;
      }
    }
  return tries[0] ?? null;
}
/** A random spot of the floor on screen, away from the player (for something climbing out). */
export function groundPoint(r) {
  const L = level();
  for (let n = 0; n < 40; n++) {
    const x = G.cam + 170 + r() * (W - 340),
      y = L.floor ? G.camY + 240 + r() * (H - 260) : GT + 14 + r() * (GB - GT - 26);
    if ((n > 20 || Math.abs(x - P.x) >= 130) && onFloor(x, y)) return [x, y];
  }
  return [P.x + 140, P.y];
}

// --- starting a stage ----------------------------------------------------------------------

/** Old Quarry's barrels, fresh. */
export function levelProps() {
  return PROPS2.map(([x, y, decor, drop]) => ({
    isProp: 1,
    decor,
    x,
    y,
    z: 0,
    w: DECOR[decor].w,
    hp: DECOR[decor].hp,
    drop,
  }));
}

/** Goes on to stage `n` (from the end of the one before, or by the secret): the player keeps
 *  health, lives, rage and score; the world starts over. */
export function startLevel(n) {
  G.level = n;
  G.waveI = 0;
  G.wave = null;
  G.goT = 0;
  for (const k of ['enemies', 'projs', 'pools', 'shocks', 'parts', 'debris', 'floats', 'items'])
    G[k] = [];
  G.lastFoe = null;
  G.slow = 0;
  G.secretDone = true;
  G.props = n === 2 ? levelProps() : G.props;
  camTo(0);
  Object.assign(P, { x: 150, y: 450, z: 0, vz: 0, vx: 0, state: 'idle', t: 0, face: 1, inv: 1 });
  P.an = ['idle', 0];
  const [a, b] = level().banner;
  G.banner = { a, b, t: 0 };
}
