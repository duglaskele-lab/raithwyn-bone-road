// The ordinary fights on the Bone Road are rolled anew every run from WAVEGEN (config.js): early
// on a few easy enemies and now and then a strong one, towards the end crowds of every kind.
// The fights of the later stages each have an idea of their own (`core`, see themedWave): who
// is in them is fixed, and only a few plain foes around them are rolled.
// The rolls use the game's seeded chance, so a replay meets the same enemies.
import { WAVEGEN } from './config.js';
import { level } from './level.js';
import { P } from './state.js';
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
  // one of a kind that has reached its cap is rolled again (an easy one if need be)
  const count = (k) => types.filter((x) => x === k).length,
    pickIn = (pool) => {
      for (let i = 0; i < 6; i++) {
        const k = pick(pool);
        if (count(k) < (cap[k] ?? Infinity)) return k;
      }
      return null;
    },
    pickHard = () => pickIn(G.pools.hard);
  for (let i = 0; i < n; i++) {
    const r = random(),
      h = r < hard && strong < maxHard ? pickHard() : null;
    if (h) {
      types.push(h);
      strong++;
    } else types.push((r < hard + mid && pickIn(G.pools.mid)) || pick(G.pools.easy));
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
/**
 * A fight with an idea of its own: `core`, the enemies it is about, always the same ([type,
 * side, delay] each), and round them `fill`, a few plain ones rolled anew every run:
 * { n: [fewest, most], pool: { type: weight }, from: the first one's delay, gap: between them }.
 */
export function themedWave(w) {
  const sp = w.core.map((s) => s.slice()),
    F = w.fill;
  if (!F) return sp;
  const n = F.n[0] + Math.floor(random() * (F.n[1] - F.n[0] + 1));
  let t = F.from ?? 0.4;
  for (let i = 0; i < n; i++) {
    const type = pick(F.pool);
    sp.push([type, side(type), Math.round(t * 100) / 100]);
    t += (F.gap ?? 0.8) * rnd(0.7, 1.3);
  }
  return sp;
}
/** What wave `i` brings: its fixed list, a fight with an idea, or a freshly rolled one. */
export function waveSpawns(i) {
  const L = level(),
    w = L.waves[i];
  // on the Bone Road, someone other than Raithwyn meets Raithwyn herself instead of the dragon;
  // in Old Quarry, someone other than Lucy meets Lucy instead of the Prospector
  const swap = (s) =>
    s[0] === 'dragon' && P.who && P.who !== 'raithwyn'
      ? ['evil', ...s.slice(1)]
      : s[0] === 'prospector' && P.who && P.who !== 'lucy'
        ? ['lucyboss', ...s.slice(1)]
        : s.slice();
  // (a fight may roll from its own pools, and have fixed enemies join it: `gen`, `add`)
  if (w.sp) return w.sp.map(swap);
  if (w.core) return themedWave(w);
  return rollWave(w.lvl, w.gen ?? L.gen).concat(w.add ?? []);
}
export const STRONG = Object.keys(WAVEGEN.pools.hard);
