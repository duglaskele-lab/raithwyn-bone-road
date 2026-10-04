// The states every skeleton shares: climbing out of the ground, chasing the player (with the
// foe's own moves tried first), the plain wind-up / attack / recover, and taking hits.
import { G, P } from '../state.js';
import { random, rnd } from '../util.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { defineState, FOES } from './registry.js';
import { faceP, go, inFront, moveTo } from './kit.js';
import { CORPSE_T, W } from '../config.js';

defineState('rise', (e) => {
  if (random() < 0.5)
    G.parts.push({
      k: 'dust',
      x: e.x + rnd(-22, 22),
      y: e.y + rnd(-2, 4),
      vx: rnd(-50, 50),
      vy: rnd(-110, -30),
      g: 260,
      t: 0,
      life: rnd(0.3, 0.5),
      s: rnd(3, 7),
      col: '#4d6661',
    });
  faceP(e);
  if (e.t > (FOES[e.type].riseTime ?? 0.9)) go(e, 'chase');
});

defineState('chase', (e, dt, s, ctxE) => {
  const F = FOES[e.type],
    T = e.T;
  faceP(e);
  const side = e.x >= P.x ? 1 : -1;
  for (const m of F.moves ?? [])
    if (m.when(e, s, dt)) {
      m.go(e, s);
      return;
    }
  if (T.keep) {
    // a shooter keeps its distance (T.keep) and shoots when lined up
    if (
      !s.pdown &&
      e.cd <= 0 &&
      s.ady < (F.aimDy ?? 15) &&
      s.adx > 150 &&
      e.x > G.cam + 25 &&
      e.x < G.cam + W - 25
    ) {
      go(e, 'windup');
      return;
    }
    moveTo(e, P.x + side * T.keep, P.y, T.speed, dt);
    return;
  }
  // melee: only a couple of enemies close in at a time, the others circle around
  if (s.pdown) e.engage = false;
  else if (!e.engage && e.cd <= 0 && ctxE.n < (F.engageCap ?? 2)) {
    e.engage = true;
    ctxE.n++;
  }
  if (e.engage) {
    if (s.adx < T.reach && s.ady < 15) {
      go(e, 'windup');
      return;
    }
    for (const m of F.engaged ?? [])
      if (m.when(e, s, dt)) {
        m.go(e, s);
        return;
      }
    moveTo(e, P.x + side * (F.stand ?? T.reach * 0.72), P.y, T.speed, dt);
  } else {
    e.oyT -= dt;
    if (e.oyT <= 0) {
      e.oyT = rnd(1, 2.2);
      e.oy = rnd(-75, 75);
      e.ox = rnd(80, 190);
    }
    moveTo(e, P.x + side * (T.reach + e.ox), P.y + e.oy, T.speed * 0.8, dt);
  }
});

defineState('windup', (e, dt, s) => {
  const F = FOES[e.type];
  F.on?.windup?.(e, s);
  if (e.t > e.T.wind) {
    go(e, 'attack', 0, { hitDone: false });
    SFX.swing();
    F.strike?.(e);
  }
});

defineState('attack', (e) => {
  const F = FOES[e.type],
    T = e.T;
  if (!T.keep && !e.hitDone) {
    if (inFront(e, 14, T.reach + 20, 24, T.knock ? 120 : 70)) {
      e.hitDone = true;
      if (!F.connect) hitPlayer(T.dmg, e.face, T.knock);
      else if (F.connect(e)) return;
    }
    F.attackTick?.(e);
  }
  if (e.t > T.act) go(e, 'recover');
});

defineState('recover', (e) => {
  const T = e.T;
  if (e.t > T.rec) {
    e.state = 'chase';
    e.engage = false;
    e.slammed = false;
    e.cd = rnd(T.cd[0], T.cd[1]);
  }
});

defineState('hurt', {
  pin: true,
  tick(e, dt) {
    e.x += e.vx * dt;
    e.vx *= Math.pow(0.01, dt);
    if (e.t > 0.32) go(e, 'chase');
  },
});

defineState('air', {
  pin: true,
  tick(e, dt) {
    e.x += e.vx * dt;
    e.vz -= 1500 * dt;
    e.z += e.vz * dt;
    if (e.z <= 0) {
      e.z = 0;
      e.juggle = 0;
      go(e, 'down');
      dust(e.x, e.y, 6);
      SFX.thud();
      SFX.clack();
      G.shake = Math.max(G.shake, 4);
    }
  },
});

defineState('down', (e) => {
  if (e.t > 0.75) go(e, 'getup');
});

defineState('getup', (e) => {
  if (e.t > 0.45) {
    go(e, 'chase');
    e.cd = Math.max(e.cd, 0.5);
  }
});

// A creature that is not a skeleton dies whole (see `corpse` in registry.js): it falls...
defineState('fall', {
  pin: true,
  tick(e, dt) {
    e.x += e.vx * dt;
    e.vz -= 1500 * dt;
    e.z += e.vz * dt;
    if (e.z <= 0) {
      e.z = 0;
      go(e, 'corpse');
      dust(e.x, e.y, 8);
      SFX.thud();
      G.shake = Math.max(G.shake, 5);
    }
  },
});
// ...and lies still, fading away.
defineState('corpse', (e) => {
  if (e.t > CORPSE_T) e.dead = true;
});
