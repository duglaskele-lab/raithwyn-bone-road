// Style rank: landing hits without getting hurt fills the meter and raises the rank
// D → C → B → A → S. Stop hitting and it drains fast; take any damage and it is gone.
// Every rank adds +50% to the score earned and +5% to the damage dealt; S adds another +10%.
import { P } from './state.js';
import { SFX } from './audio.js';

export const RANKS = ['D', 'C', 'B', 'A', 'S'];
export const STYLE_STEP = 100, // meter points per rank
  STYLE_MAX = 599, // S lasts from 500 up to here
  STYLE_GRACE = 3.5, // seconds without a hit before the meter starts to drain
  STYLE_DRAIN = 90, // meter points per second while draining
  STYLE_BREAK = 2; // ranks lost to a hit taken

/** 0 = no rank yet, 1 = D … 5 = S. */
export const rankOf = (v) => Math.min(RANKS.length, Math.floor(v / STYLE_STEP));
export const styleRank = () => rankOf(P.sty);
export const scoreMult = () => 1 + 0.5 * styleRank();
export function dmgMult() {
  const r = styleRank();
  return 1 + 0.05 * r + (r === RANKS.length ? 0.1 : 0);
}

/** A hit landed: points shrink a little at higher ranks so S takes a real streak. */
export function styleGain(points) {
  const before = styleRank();
  P.sty = Math.min(STYLE_MAX, P.sty + points * (1 - 0.1 * before));
  P.styT = 0;
  if (styleRank() > before) {
    P.styPop = 0.45;
    SFX.rank();
  }
}
/** Scenery was hit: no style points, but the meter does not start draining yet. */
export function styleKeep() {
  P.styT = 0;
}
/** The player got hurt: the meter drops two ranks (keeping the progress within the rank). */
export function styleBreak() {
  P.sty = Math.max(0, P.sty - STYLE_BREAK * STYLE_STEP);
  P.styT = 0;
}
export function updStyle(dt) {
  P.styT += dt;
  P.styPop = Math.max(0, P.styPop - dt);
  if (P.styT > STYLE_GRACE) P.sty = Math.max(0, P.sty - STYLE_DRAIN * dt);
}
