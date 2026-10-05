// Explosions of Old Quarry: red barrels and sticks of dynamite. A blast hurts everyone near it,
// the player and the enemies alike, sets off other red barrels around it and breaks barrels.
import { BLAST, TAU } from './config.js';
import { rnd } from './util.js';
import { G, P } from './state.js';
import { SFX } from './audio.js';
import { breakProp, hitPlayer, hurtEnemy } from './combat.js';
import { buzz } from './touch.js';

/** Is (x, y) inside the blast's ellipse on the floor? */
const within = (cx, cy, x, y, r) => ((x - cx) / r) ** 2 + ((y - cy) / (r * 0.42)) ** 2 < 1;

/** A blast at (x, y) on the floor, of the kind `k` in BLAST ('barrel' or 'dynamite'). */
export function explode(x, y, k = 'barrel') {
  const B = BLAST[k];
  SFX.boom();
  buzz(90);
  G.shake = Math.max(G.shake, 16);
  G.freeze = Math.max(G.freeze, 0.06);
  G.parts.push({ k: 'boom', x, y, t: 0, life: 0.55, s: B.r });
  G.parts.push({ k: 'gring', x, y, t: 0, life: 0.4, s: B.r * 1.1, col: '#ffb24a' });
  for (let i = 0; i < 16; i++) {
    const a = rnd(TAU),
      v = rnd(120, 420);
    G.parts.push({
      k: 'dot',
      x: x + rnd(-10, 10),
      y: y - rnd(10, 60),
      vx: Math.cos(a) * v,
      vy: -Math.abs(Math.sin(a)) * v - 80,
      g: 700,
      t: 0,
      life: rnd(0.35, 0.7),
      s: rnd(3, 6),
      col: i % 3 ? '#ffcf5a' : '#ff6a2a',
    });
  }
  for (let i = 0; i < 7; i++)
    G.parts.push({
      k: 'smoke',
      x: x + rnd(-B.r * 0.4, B.r * 0.4),
      y: y - rnd(20, 70),
      vx: rnd(-30, 30),
      vy: rnd(-70, -30),
      g: 0,
      t: 0,
      life: rnd(0.9, 1.5),
      s: rnd(18, 34),
    });
  // the player: knocked down, unless already out of reach in the air
  if (within(x, y, P.x, P.y, B.r) && P.z < 140) hitPlayer(B.dmgP, P.x >= x ? 1 : -1, true);
  for (const e of G.enemies)
    if (!e.dead && within(x, y, e.x, e.y, B.r))
      hurtEnemy(e, B.dmgE, e.x >= x ? 1 : -1, true, 'blast');
  // other barrels: red ones go off a moment later, wooden ones burst
  for (const u of G.props)
    if (!u.dead && within(x, y, u.x, u.y, B.r * 1.05)) {
      if (u.decor === 'tnt') u.fuseT ??= B.chain;
      else breakProp(u);
    }
}
/** Red barrels hit by a blast go off after a short delay (a chain of explosions). */
export function updFuses(dt) {
  for (const u of G.props)
    if (!u.dead && u.fuseT !== undefined && (u.fuseT -= dt) <= 0) breakProp(u);
}
