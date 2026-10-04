// The ordinary fights on the road are rolled anew every run from WAVEGEN (config.js): early
// on a few easy enemies and now and then a strong one, towards the end crowds of every kind.
// The rolls use the game's seeded chance, so a replay meets the same enemies.
import { WAVEGEN } from './config.js';
import { level } from './level.js';
import { lerp, random, rnd } from './util.js';

const at = ([a, b], lvl) => lerp(a, b, lvl);
/** A weighted pick from { name: weight }. */
function pick(pool) {
  const names = Object.keys(pool),
    total = names.reduce((n, k) => n + pool[k], 0);
  let r = random() * total;
  for (const k of names) if ((r -= pool[k]) < 0) return k;
  return names[names.length - 1];
}
/** Where an enemy comes from: zombies climb out of the ground, a rider or a power armour comes
 *  in from a side. */
function side(type) {
  if (type === 'zombie' || type === 'slime') return 0;
  if (type === 'biker' || type === 'armor') return random() < 0.5 ? -1 : 1;
  const r = random();
  return r < 0.15 ? 0 : r < 0.6 ? 1 : -1;
}
/** One fight of difficulty `lvl` (0..1): a list of [type, side, delay] like a fixed wave. */
export function rollWave(lvl, G = WAVEGEN) {
  const cap = G.cap ?? {},
    n = Math.max(3, Math.round(at(G.count, lvl) + rnd(-1, 1))),
    hard = at(G.hard, lvl),
    mid = at(G.mid, lvl),
    maxHard = Math.round(at(G.maxHard, lvl)),
    types = [];
  let strong = 0;
  // a strong one of a kind that has reached its cap is rolled again (an easy one if need be)
  const count = (k) => types.filter((x) => x === k).length,
    pickHard = () => {
      for (let i = 0; i < 6; i++) {
        const k = pick(G.pools.hard);
        if (count(k) < (cap[k] ?? Infinity)) return k;
      }
      return null;
    };
  for (let i = 0; i < n; i++) {
    const r = random(),
      h = r < hard && strong < maxHard ? pickHard() : null;
    if (h) {
      types.push(h);
      strong++;
    } else if (r < hard + mid) types.push(pick(G.pools.mid));
    else types.push(pick(G.pools.easy));
  }
  // past the middle of the road a fight always has at least one strong enemy
  if (lvl >= 0.5 && strong === 0) types[n - 1] = pickHard() ?? types[n - 1];
  const gap = at(G.gap, lvl);
  let t = 0;
  return types.map((type, i) => {
    // zombies come in quick pairs, everyone else a little apart
    if (i) t += type === 'zombie' && types[i - 1] === 'zombie' ? gap * 0.45 : gap * rnd(0.7, 1.3);
    return [type, side(type), Math.round(t * 100) / 100];
  });
}
/** What wave `i` brings: its fixed list, or a freshly rolled one. */
export function waveSpawns(i) {
  const L = level(),
    w = L.waves[i];
  return w.sp ? w.sp.map((s) => s.slice()) : rollWave(w.lvl, L.gen);
}
export const STRONG = Object.keys(WAVEGEN.pools.hard);
