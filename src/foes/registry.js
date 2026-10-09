// The foe registry. Every enemy type is one file in src/foes that calls defineFoe() with
// everything about it: when it does what (moves), its own AI states, how it takes hits, how
// it is posed and dressed. The stats (health, speed, damage...) stay in TYPES in config.js.
//
// A foe definition may hold:
//   spawn(e, side, placed)   adjust a fresh enemy (where it appears, its first state)
//   init                     { field: [min, max] } countdowns it starts with, picked at random
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
//   guard(e, knock, src, dir, crush) after the damage, before the usual flinch; true = handled
//   die(e, dir)              replaces the usual shatter into bones
//   unstoppable(e)           true while it is in an attack no hit can stop (red outline)
//   attacks                  its own attack states (a medium enemy's attacks go on through hits)
//   update(e, dt)            replaces the whole AI (the Bone Dragon)
//   tick(e, dt)              every frame, after its state (steam from its joints...)
//   jump                     the numbers of its jet jump, if it has one (ARMOR.jump)
//   pose / look              skeletal animation and costume (see anim.js and skeleton.js)
//   draw(e, aura)            draws it instead of the skeleton rig (a creature of its own)
//   over(e)                  drawn over everyone after it (its flame), outside its red outline
//   ground(e)                drawn on the ground, under everyone (warning marks)
//   corpse                   it dies by falling down and lying still, not into bones
//   walksIn                  it never climbs out of the ground, it comes in from a side
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
