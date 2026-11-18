// More of the Children of the Crater (the Wastelands, stage 4; see crater.js, war.js).
//   The rust-eater (TYPES.rusteater, EATER): bites hard. A robot's wreck nearby it walks to
//     and eats: health back and a plate of metal more on its hide (three at most); every plate
//     turns some of the harm of a blow, a heavy blow tears one off. Kill the robots far from it.
//   The two-headed brute (TYPES.twohead, BRUTE): grabs whoever is in front. Her it throws down
//     hard; a robot it lifts over its heads and hurls along its lane, the body striking
//     whoever it meets — her, or other robots. Three blows of hers in a row and the dopey head
//     laughs at the struck one: a moment open, every blow doing more.
//   The glowing one (TYPES.glowing, GLOW): a ring of radiation round it bites her and makes the
//     robots in it glitch (they turn about at random, their blows going astray). Killed, it
//     swells and bursts in a green flash that hurts everyone near — lead it among the robots.
import { BRUTE, EATER, GLOW } from '../config.js';
import { fxRandom, fxRnd, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { floatTxt, spark } from '../fx.js';
import { acidBite, hitPlayer } from '../combat.js';
import { explode } from '../blast.js';
import { scoreMult } from '../style.js';
import { meetsPlayer } from '../height.js';
import { defineFoe } from './registry.js';
import { go, inFront, moveTo } from './kit.js';
import {
  brawl,
  faceT,
  nearWreck,
  release,
  rivalHit,
  rivals,
  struckByHer,
  swing,
  warMark,
  warSpawn,
  warTick,
} from './war.js';
import { drawWar } from './wasteart.js';
import { auraRing, glowing, rusteater, twohead } from './wasteart2.js';

const K = 0.85;
const toThink = (state) => [{ when: () => true, go: (e) => go(e, state) }];
const ready = (e, state) => {
  go(e, state);
  e.cd = rnd(e.T.cd[0], e.T.cd[1]);
};

// --- the rust-eater -----------------------------------------------------------------------------

defineFoe('rusteater', {
  spawn: warSpawn,
  moves: toThink('reThink'),
  corpse: true,
  attacks: ['reWind', 'reBite'],
  states: {
    reThink(e, dt, s, ctxE) {
      if (!(e.grudgeT > 0) && (e.plates ?? 0) < EATER.plates) {
        const w =
          e.food?.state === 'wkLie' && !e.food.dead && !e.food.looted
            ? e.food
            : nearWreck(e, EATER.see);
        if (w) {
          w.claimed = e;
          e.food = w;
          const side = e.x >= w.x ? 1 : -1;
          faceT(e, w);
          if (Math.abs(w.x + side * 50 - e.x) < 14 && Math.abs(w.y - e.y) < 14) go(e, 'reEat');
          else moveTo(e, w.x + side * 50, w.y, e.T.speed, dt);
          return;
        }
      }
      release(e, e.food);
      e.food = null;
      brawl(e, dt, ctxE, EATER.bite.reach, 'reWind');
    },
    reWind(e) {
      if (e.t > EATER.bite.wind) {
        go(e, 'reBite', 0, { hitDone: false });
        SFX.swing();
      }
    },
    reBite(e) {
      if (!e.hitDone) {
        e.hitDone = true;
        swing(e, 14, EATER.bite.reach + 20, 26, 130, EATER.bite.dmg, true);
      }
      if (e.t > EATER.bite.act) go(e, 'reRec');
    },
    reRec(e) {
      if (e.t > EATER.bite.rec) ready(e, 'reThink');
    },
    reEat(e) {
      const w = e.food;
      if (!w || w.state !== 'wkLie' || w.dead || w.looted) {
        e.food = null;
        go(e, 'reThink');
        return;
      }
      w.t = Math.min(w.t, 6);
      if (fxRandom() < 0.3) spark(w.x + fxRnd(-20, 20), w.y - 30, '#d9d2c0', false);
      if (fxRandom() < 0.05) SFX.clack();
      if (e.t > EATER.eat) {
        // eaten: health back, and a plate of its metal more
        w.dead = true;
        e.food = null;
        e.hp = Math.min(e.T.hp, e.hp + EATER.heal);
        e.plates = Math.min(EATER.plates, (e.plates ?? 0) + 1);
        floatTxt(e.x, e.y - 200, `+${EATER.heal}`, '#9dff5a');
        SFX.squelch();
        go(e, 'reThink');
      }
    },
  },
  soak: (e) => 1 - EATER.plate * (e.plates ?? 0),
  onHit(e, dmg, dir, knock, src) {
    struckByHer(e, src);
    if (e.food?.claimed === e) e.food.claimed = null;
    // a heavy blow tears a plate off
    if (knock && e.plates > 0 && e.hp > 0) {
      e.plates--;
      for (let i = 0; i < 4; i++) spark(e.x - dir * 20, e.y - 130, '#d9a060', i === 0);
      SFX.clang();
    }
    return false;
  },
  tick: warTick,
  draw: (e) => drawWar(e, K, rusteater),
  over: (e) => warMark(e, 225 * K),
});

// --- the two-headed brute ------------------------------------------------------------------------

/** Lets go of whatever it holds (it drops to the ground). */
function letGo(e) {
  const o = e.held;
  e.held = null;
  if (o && o.state === 'thHeld') {
    o.heldBy = null;
    go(o, 'air', 0, { vx: 0, vz: 0 });
  }
}
defineFoe('twohead', {
  spawn: warSpawn,
  moves: toThink('thThink'),
  corpse: true,
  attacks: ['thWind', 'thGrab', 'thHold', 'thThrow'],
  states: {
    thThink: (e, dt, s, ctxE) => brawl(e, dt, ctxE, BRUTE.grab.reach, 'thWind'),
    thWind(e) {
      if (e.t > BRUTE.grab.wind) go(e, 'thGrab');
    },
    thGrab(e) {
      // her, in front: thrown down hard
      if (inFront(e, 10, BRUTE.grab.reach + 24, 28, 170) && meetsPlayer(0, 170)) {
        hitPlayer(BRUTE.grab.dmg, e.face, true);
        SFX.heavy();
        go(e, 'thRec');
        return;
      }
      // a foe of the other side, in front (not one of the big ones): lifted up
      const o = rivals(e).find(
        (o) =>
          (o.x - e.x) * e.face > -10 &&
          (o.x - e.x) * e.face < BRUTE.grab.reach + 30 &&
          Math.abs(o.y - e.y) < 28 &&
          o.T.weight !== 'heavy' &&
          !o.T.bigBoss,
      );
      if (o) {
        e.held = o;
        Object.assign(o, { state: 'thHeld', t: 0, heldBy: e, engage: false });
        SFX.grab();
        go(e, 'thHold');
      } else go(e, 'thRec');
    },
    thHold(e) {
      const o = e.held;
      if (!o || o.state !== 'thHeld') {
        e.held = null;
        go(e, 'thRec');
        return;
      }
      Object.assign(o, { x: e.x - e.face * 6, y: e.y + 1, z: 190 * K, face: e.face });
      if (e.t > BRUTE.hold) {
        // hurled along its lane: the body strikes whoever it meets (see warTick)
        e.held = null;
        o.heldBy = null;
        if (o.type === 'mine') {
          // a mine beetle: it bursts where it lands, or on whoever it strikes
          Object.assign(o, { state: 'mbKick', t: 0, vx: e.face * BRUTE.throw.speed, vz: 220 });
          o.z = Math.max(o.z, 120);
          SFX.swing();
          go(e, 'thThrow');
          return;
        }
        rivalHit(e, o, BRUTE.throw.hit, true, e.face);
        Object.assign(o, {
          thrownBy: e,
          thrownHit: [],
          thrownHitP: false,
          vx: e.face * BRUTE.throw.speed,
          vz: 220,
          z: Math.max(o.z, 120),
        });
        if (!o.dying) o.state = 'air';
        SFX.swing();
        go(e, 'thThrow');
      }
    },
    thThrow(e) {
      if (e.t > 0.3) go(e, 'thRec');
    },
    thRec(e) {
      if (e.t > BRUTE.grab.rec) ready(e, 'thThink');
    },
    thLaugh(e) {
      if (e.t > BRUTE.laugh) go(e, 'thThink');
    },
  },
  soak: (e) => (e.state === 'thLaugh' ? BRUTE.open : 1),
  onHit(e, dmg, dir, knock, src) {
    struckByHer(e, src);
    if (src === 'rival' || e.hp <= 0) return false;
    // three blows of hers in a row: the dopey head laughs at the other one
    e.argueN = G.time - (e.argueT ?? -99) < BRUTE.argue ? (e.argueN ?? 0) + 1 : 1;
    e.argueT = G.time;
    if (e.argueN >= 3 && e.state !== 'thLaugh') {
      e.argueN = 0;
      letGo(e);
      go(e, 'thLaugh');
      floatTxt(e.x - e.face * 20, e.y - 230, 'HA-HA!', '#ffd23a');
      SFX.laugh();
      return true;
    }
    return false;
  },
  die(e, dir) {
    letGo(e);
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, { dying: true, engage: false, state: 'fall', t: 0, vx: dir * 80, vz: 200 });
    SFX.thud();
  },
  tick: warTick,
  draw: (e) => drawWar(e, K, twohead),
  over: (e) => warMark(e, 275 * K),
});

// --- the glowing one ------------------------------------------------------------------------------

let biteT = 0; // (her clock in its ring)
/** Its ring: bites her standing in it, makes the robots in it glitch. */
function aura(e, dt) {
  const R = GLOW.aura,
    inRing = (o) => ((o.x - e.x) / R) ** 2 + ((o.y - e.y) / (R * 0.3)) ** 2 < 1;
  if (inRing(P) && P.z < 60) {
    if ((biteT -= dt) <= 0) {
      biteT = GLOW.tick;
      acidBite(GLOW.bite);
    }
  }
  for (const o of G.enemies) if (o.T.side === 'bot' && !o.dying && inRing(o)) o.glitchT = 0.4;
}
defineFoe('glowing', {
  spawn: warSpawn,
  moves: toThink('glThink'),
  attacks: ['glWind', 'glSwipe'],
  states: {
    glThink: (e, dt, s, ctxE) => brawl(e, dt, ctxE, GLOW.swipe.reach, 'glWind'),
    glWind(e) {
      if (e.t > GLOW.swipe.wind) {
        go(e, 'glSwipe', 0, { hitDone: false });
        SFX.swing();
      }
    },
    glSwipe(e) {
      if (!e.hitDone) {
        e.hitDone = true;
        swing(e, 14, GLOW.swipe.reach + 20, 26, 150, GLOW.swipe.dmg, false);
      }
      if (e.t > GLOW.swipe.act) go(e, 'glRec');
    },
    glRec(e) {
      if (e.t > GLOW.swipe.rec) ready(e, 'glThink');
    },
    // dying: it swells, then bursts
    glBoom: {
      pin: true,
      tick(e) {
        if (fxRandom() < 0.3) spark(e.x + fxRnd(-30, 30), e.y - fxRnd(40, 180), '#c8ffaa', false);
        if (e.t > GLOW.boom) {
          e.dead = true;
          explode(e.x, e.y, 'rad');
        }
      },
    },
  },
  die(e) {
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, { dying: true, engage: false, state: 'glBoom', t: 0, hp: 0, z: 0 });
    SFX.hiss();
  },
  onHit(e, dmg, dir, knock, src) {
    struckByHer(e, src);
    return false;
  },
  tick(e, dt) {
    warTick(e, dt);
    if (!e.dying) aura(e, dt);
  },
  ground: (e) => !e.dying && auraRing(e, GLOW.aura),
  draw: (e) => drawWar(e, K, glowing),
  over: (e) => warMark(e, 235 * K),
});
