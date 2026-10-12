// Heights: the third dimension of the fight. Everyone has a band of heights it fills, from its
// feet (up in the air when it is) to the top of its head; every attack covers a band of heights
// too, and it reaches only what its band meets — on top of the usual checks along the road and
// across its depth. So a dark ball cast at the top of a jump flies over a short enemy, a blow
// from the ground misses a drone hovering up high, and the heroine can jump over a bone thrown
// at her chest. See HEIGHT in config.js.
import { DECOR, HEIGHT } from './config.js';
import { P } from './state.js';
import { FOES } from './foes/registry.js';

/** Lying on the ground (knocked down, getting up): a low band. */
const LYING = ['down', 'getup'];

/** The band of heights [lo, hi] an enemy (or a thing to break) fills now. */
export function bodyBand(e) {
  // scenery: from the ground to its top (a barrel, a grave, an urn...)
  if (e.isProp) return [0, e.decor ? DECOR[e.decor].h : HEIGHT.urn];
  const own = FOES[e.type]?.band?.(e);
  if (own) return own;
  const s = e.T?.scale ?? 1;
  if (LYING.includes(e.state)) return [e.z, e.z + HEIGHT.down * s];
  // (never so short that a shot from the ground, at a standing heroine's chest, passes over it)
  return [e.z, e.z + Math.max(HEIGHT.min, (e.T?.height ?? HEIGHT.body) * s)];
}
/**
 * Does an attack covering heights lo..hi reach `e`? A shot (`shot`: a bone, a bullet, a dark
 * ball) reaches a flying robot from the ground too: it is aimed at it.
 */
export function reaches(e, lo, hi, shot = false) {
  if (shot && e.T?.flyer) return true;
  const [a, b] = bodyBand(e);
  return lo < b && hi > a;
}
/** The band of heights the heroine fills: in a jump her legs are tucked up under her. */
export function playerBand() {
  return [P.z > 0 ? P.z + HEIGHT.tuck : 0, P.z + HEIGHT.player];
}
/** Does something covering heights lo..hi meet the heroine? */
export function meetsPlayer(lo, hi) {
  const [a, b] = playerBand();
  return lo < b && hi > a;
}
/** The heights a blow of hers covers: from the ground, or a flying kick in a jump. */
export function blowBand(air) {
  const [a, b] = air ? HEIGHT.kick : HEIGHT.punch;
  return [P.z + a, P.z + b];
}
