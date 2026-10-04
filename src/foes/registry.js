// The foe registry. Every enemy type is one file in src/foes that calls defineFoe() with
// everything about it: when it does what (moves), its own AI states, how it takes hits, how
// it is posed and dressed. The stats (health, speed, damage...) stay in TYPES in config.js.
//
// A foe definition may hold:
//   spawn(e, side, placed)   adjust a fresh enemy (where it appears, its first state)
//   timers                   extra countdown fields to tick down every frame
//   moves                    [{ when(e, s, dt), go(e, s) }] tried in order while it chases
//   riseTime                 seconds to climb out of the ground (0.9)
//   aimDy                    a shooter (T.keep set) still shoots this far off in depth (15)
//   stand                    a brawler stops this far from the player (default reach*0.72)
//   engageCap                how many attackers may already be engaged for it to join (2)
//   engaged                  [{ when, go }] tried when engaged and not close enough to hit
//   strike(e)                the moment its wind-up ends (throw a bone, lob acid...)
//   connect(e)               its melee attack lands; return true to leave the attack state
//   attackTick(e)            every frame of its melee attack (ground smash dust...)
//   on: { state(e, s) }      run at the start of a common state's frame
//   states                   its own AI states: { name: { tick(e, dt, s, ctxE), pin } }
//   immune(e)                cannot be hit right now
//   onHit(e, dmg, dir, knock, src)  first say on a hit; true = fully handled
//   guard(e, knock, src, dir)       after the damage, before the usual flinch; true = handled
//   die(e, dir)              replaces the usual shatter into bones
//   unstoppable(e)           true while it is in an attack no hit can stop (red outline)
//   update(e, dt)            replaces the whole AI (the Bone Dragon)
//   pose / look              skeletal animation and costume (see anim.js and skeleton.js)
export const FOES = {},
  STATES = {};

export function defineState(name, s) {
  if (STATES[name]) throw new Error(`AI state "${name}" is defined twice`);
  STATES[name] = typeof s === 'function' ? { tick: s } : s;
}
export function defineFoe(type, def) {
  if (FOES[type]) throw new Error(`foe "${type}" is defined twice`);
  FOES[type] = def;
  for (const [name, s] of Object.entries(def.states ?? {})) defineState(name, s);
  return def;
}
