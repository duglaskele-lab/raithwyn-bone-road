// Explosions of Old Quarry: red barrels and sticks of dynamite. A blast hurts everyone near it,
// the player and the enemies alike, sets off other red barrels around it and breaks barrels.
import { BLAST, TAU } from './config.js';
import { fxRnd } from './util.js';
import { G, P } from './state.js';
import { SFX } from './audio.js';
import { breakProp, hitPlayer, hurtEnemy } from './combat.js';
import { buzz } from './touch.js';

/** Is (x, y) inside the blast's ellipse on the floor? */
const within = (cx, cy, x, y, r) => ((x - cx) / r) ** 2 + ((y - cy) / (r * 0.42)) ** 2 < 1;

/** A blast at (x, y) on the floor, of the kind `k` in BLAST ('barrel', 'dynamite', 'grenade',
 * 'airburst'); `z` up in the air for a grenade shot out of it (it still hits what is below). */
export function explode(x, y, k = 'barrel', z = 0) {
  const B = BLAST[k];
  SFX.boom();
  buzz(90);
  G.shake = Math.max(G.shake, 16);
  G.freeze = Math.max(G.freeze, 0.06);
  G.parts.push({ k: 'boom', x, y, z, t: 0, life: 0.55, s: B.r });
  G.parts.push({ k: 'gring', x, y, t: 0, life: 0.4, s: B.r * 1.1, col: '#ffb24a' });
  for (let i = 0; i < 16; i++) {
    const a = fxRnd(TAU),
      v = fxRnd(120, 420);
    G.parts.push({
      k: 'dot',
      x: x + fxRnd(-10, 10),
      y: y - z - fxRnd(10, 60),
      vx: Math.cos(a) * v,
      vy: -Math.abs(Math.sin(a)) * v - 80,
      g: 700,
      t: 0,
      life: fxRnd(0.35, 0.7),
      s: fxRnd(3, 6),
      col: i % 3 ? '#ffcf5a' : '#ff6a2a',
    });
  }
  for (let i = 0; i < 7; i++)
    G.parts.push({
      k: 'smoke',
      x: x + fxRnd(-B.r * 0.4, B.r * 0.4),
      y: y - z - fxRnd(20, 70),
      vx: fxRnd(-30, 30),
      vy: fxRnd(-70, -30),
      g: 0,
      t: 0,
      life: fxRnd(0.9, 1.5),
      s: fxRnd(18, 34),
    });
  // the player: knocked down, unless already out of reach in the air
  if (B.dmgP && within(x, y, P.x, P.y, B.r) && P.z < 140)
    hitPlayer(B.dmgP, P.x >= x ? 1 : -1, true);
  // a blast that spares the enemies (the Prospector's mortar shells) leaves them be
  for (const e of B.dmgE ? G.enemies : [])
    if (!e.dead && within(x, y, e.x, e.y, B.r))
      hurtEnemy(e, B.dmgE, e.x >= x ? 1 : -1, true, B.crush ? 'blast2' : 'blast');
  // sticks of dynamite caught in it go off a moment later too
  for (const q of G.projs)
    if (q.k === 'tnt' && q.fuse > B.chain && within(x, y, q.x, q.y, B.r)) q.fuse = B.chain;
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
