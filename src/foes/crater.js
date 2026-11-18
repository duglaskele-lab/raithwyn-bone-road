// The Children of the Crater (the Wastelands, stage 4): mutants, at war with the Rust Legion
// as well as with her (see war.js). They climb out of the sand.
//   The scavenger (TYPES.scavenger, SCAV): a rebar club. A robot's wreck nearby it walks to and
//     strips, and then fights with the robot's saw arm — further and harder — until a heavy
//     blow knocks it out of its hands. A blow while it strips stops it.
//   The spitter (TYPES.spitter, SPIT): keeps its distance in line with whom it fights, swells
//     its glowing throat sac (a blow then does double harm) and spits acid in an arc: a hit, and
//     a puddle where it lands. Acid eats a robot's armour: one in a puddle, or struck by a
//     spit, corrodes and takes more harm from every blow.
import { SCAV, SPIT, TAU } from '../config.js';
import { clamp, fxRandom, fxRnd, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { spark } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { inView } from '../level.js';
import { ctx } from '../gfx.js';
import { defineFoe } from './registry.js';
import { go, moveTo } from './kit.js';
import {
  brawl,
  faceT,
  nearWreck,
  pickTarget,
  release,
  rivalHit,
  struckAt,
  struckByHer,
  swing,
  warMark,
  warSpawn,
  warTick,
  wake,
} from './war.js';
import { drawWar, scavenger, spitter } from './wasteart.js';

const K = 0.85; // how big they are drawn
const toThink = (state) => [{ when: () => true, go: (e) => go(e, state) }];

// --- the scavenger ----------------------------------------------------------------------------

const club = (e) => (e.saw ? SCAV.saw : SCAV.club);
defineFoe('scavenger', {
  spawn: warSpawn,
  moves: toThink('scThink'),
  corpse: true,
  states: {
    scThink(e, dt, s, ctxE) {
      // a wreck to strip, when nobody is after it just now
      if (!e.saw && !(e.grudgeT > 0)) {
        const w = e.loot?.state === 'wkLie' && !e.loot.looted ? e.loot : nearWreck(e, SCAV.see);
        if (w) {
          w.claimed = e;
          e.loot = w;
          faceT(e, w);
          const side = e.x >= w.x ? 1 : -1;
          if (Math.abs(w.x + side * 34 - e.x) < 14 && Math.abs(w.y - e.y) < 14) {
            e.face = -side;
            go(e, 'scLoot');
          } else moveTo(e, w.x + side * 34, w.y, e.T.speed, dt);
          return;
        }
      }
      release(e, e.loot);
      e.loot = null;
      brawl(e, dt, ctxE, club(e).reach, 'scWind');
    },
    scWind(e) {
      if (e.t > club(e).wind) {
        go(e, 'scSwing', 0, { hitDone: false });
        SFX.swing();
      }
    },
    scSwing(e) {
      const C = club(e);
      if (!e.hitDone) {
        e.hitDone = true;
        swing(e, 14, C.reach + 20, 26, 120, C.dmg, !!e.saw);
      }
      if (e.t > C.act) go(e, 'scRec');
    },
    scRec(e) {
      if (e.t > club(e).rec) {
        go(e, 'scThink');
        e.cd = rnd(e.T.cd[0], e.T.cd[1]);
      }
    },
    scLoot(e) {
      const w = e.loot;
      if (!w || w.state !== 'wkLie' || w.looted || w.dead) {
        e.loot = null;
        go(e, 'scThink');
        return;
      }
      w.t = Math.min(w.t, 6); // (it does not fade away under its hands)
      if (fxRandom() < 0.2) spark(w.x + fxRnd(-20, 20), w.y - 30, '#ffcf5a', false);
      if (e.t > SCAV.loot) {
        w.looted = true;
        w.claimed = null;
        e.loot = null;
        e.saw = true;
        SFX.clang();
        go(e, 'scThink');
      }
    },
  },
  onHit(e, dmg, dir, knock, src) {
    struckByHer(e, src);
    if (e.loot) e.loot.claimed = null;
    e.loot = null;
    // a heavy blow knocks the saw out of its hands
    if (knock && e.saw && e.hp > 0) {
      e.saw = false;
      for (let i = 0; i < 4; i++) spark(e.x + e.face * 60, e.y - 120, '#e8ecf0', i === 0);
      SFX.clang();
    }
    return false;
  },
  tick: warTick,
  draw: (e) => drawWar(e, K, scavenger),
  over: (e) => warMark(e, 185 * K),
});

// --- the spitter ------------------------------------------------------------------------------

/** Spits a ball of acid at whom it fights: in an arc to where they stand. */
function spit(e) {
  const o = e.tgt ?? P,
    x0 = e.x + e.face * 34 * K,
    z0 = 160 * K,
    fl = SPIT.flight,
    dist = clamp(Math.abs(o.x - x0), 80, 560);
  G.projs.push({
    k: 'spit',
    x: x0,
    y: e.y,
    z: z0,
    vx: (e.face * dist) / fl,
    vy: clamp(o.y - e.y, -60, 60) / fl,
    vz: (SPIT.g * fl) / 2 - z0 / fl,
    life: 3,
    owner: e,
    fly: spitFly,
    draw: spitDraw,
  });
  SFX.acid();
}
function spitFly(q, dt) {
  q.y += q.vy * dt;
  q.vz -= SPIT.g * dt;
  q.z += q.vz * dt;
  if (fxRandom() < 0.5)
    G.parts.push({
      k: 'dot',
      x: q.x - Math.sign(q.vx) * fxRnd(6, 14),
      y: q.y - q.z + fxRnd(-5, 5),
      vx: -q.vx * 0.1,
      vy: fxRnd(10, 60),
      g: 300,
      t: 0,
      life: fxRnd(0.2, 0.4),
      s: fxRnd(2, 4),
      col: '#9dff4a',
    });
  if (!q.hit) {
    const who = struckAt(q.x, q.y, q.z, 24, 'mut');
    if (who) {
      q.hit = true;
      const dir = Math.sign(q.vx) || 1;
      if (who === P) {
        hitPlayer(SPIT.dmg, dir, false);
        if (q.owner) wake(q.owner);
      } else {
        rivalHit(q.owner ?? { face: dir }, who, SPIT.dmg, false, dir);
        who.corrodeT = SPIT.corrode;
      }
      splash(q.x, who.y - 100);
    }
  }
  if (q.z <= 0) {
    q.life = 0;
    G.pools.push({ x: q.x, y: q.y, t: 0, life: SPIT.pool, seed: rnd(6) });
    splash(q.x, q.y - 4);
  }
  if (q.x < G.cam - 100 || q.x > G.cam + 1060) q.life = 0;
}
function splash(x, y) {
  SFX.splash();
  for (let i = 0; i < 8; i++)
    G.parts.push({
      k: 'dot',
      x,
      y,
      vx: fxRnd(-180, 180),
      vy: fxRnd(-240, -50),
      g: 700,
      t: 0,
      life: fxRnd(0.3, 0.5),
      s: fxRnd(3, 5),
      col: i % 2 ? '#9dff4a' : '#4fd12a',
    });
}
function spitDraw(q, x, y) {
  ctx.fillStyle = 'rgba(150,255,90,.35)';
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#9dff5a';
  ctx.strokeStyle = '#17151d';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(x, y, 9, 8, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
}

defineFoe('spitter', {
  spawn: warSpawn,
  moves: toThink('spThink'),
  corpse: true,
  states: {
    spThink(e, dt) {
      const o = pickTarget(e, dt),
        dx = o.x - e.x,
        side = e.x >= o.x ? 1 : -1;
      faceT(e, o);
      if (
        e.cd <= 0 &&
        Math.abs(o.y - e.y) < 20 &&
        Math.abs(dx) > 130 &&
        Math.abs(dx) < 560 &&
        inView(e.x, e.y, -30) &&
        !(o === P && P.state === 'dead')
      ) {
        go(e, 'spWind');
        SFX.squelch();
        return;
      }
      moveTo(e, o.x + side * SPIT.keep, o.y, e.T.speed, dt);
    },
    spWind(e) {
      if (e.t > SPIT.wind) {
        spit(e);
        go(e, 'spSpit');
      }
    },
    spSpit(e) {
      if (e.t > SPIT.rec) {
        go(e, 'spThink');
        e.cd = rnd(SPIT.cd[0], SPIT.cd[1]);
      }
    },
  },
  // the swollen sac: a blow then does double harm
  soak: (e) => (e.state === 'spWind' ? SPIT.sac : 1),
  onHit(e, dmg, dir, knock, src) {
    struckByHer(e, src);
    return false;
  },
  tick: warTick,
  draw: (e) => drawWar(e, K, spitter),
  over: (e) => warMark(e, 200 * K),
});
