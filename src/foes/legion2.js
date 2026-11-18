// More of the Rust Legion (the Wastelands, stage 4; see legion.js, war.js).
//   The harvester (TYPES.harvester, HARV): an old combine on tracks. From a distance it revs
//     (its lane marked red on the ground) and charges along the lane to the edge of the screen,
//     mowing whoever is on it — her, and the mutants too. There it sticks in the sand a moment,
//     open. Up close, its reel of blades. Nothing stops its charge.
//   The spotter (TYPES.spotter, SPOT): on tall stilts, keeps its distance in line with whom it
//     fights, aims (a red line along the lane, following it, then still) and fires a beam that
//     strikes the first body on the line: her, a mutant — or one of its own, who shields her.
//     Light blows do not stop it; a heavy one topples it.
//   The mine beetle (TYPES.mine, MINE): runs at the nearest living thing (her or a mutant),
//     arms itself and bursts. A blow of hers kicks it away: it bursts where it lands, or on
//     whoever it strikes in flight — send it back among the robots.
import { HARV, MINE, SPOT } from '../config.js';
import { fxRandom, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { dust, spark } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { explode } from '../blast.js';
import { inView } from '../level.js';
import { ctx } from '../gfx.js';
import { scoreMult } from '../style.js';
import { meetsPlayer } from '../height.js';
import { W } from '../config.js';
import { defineFoe, defineState } from './registry.js';
import { dizzy, go, moveTo } from './kit.js';
import { faceT, pickTarget, rivalHit, rivals, struckByHer, swing, warMark } from './war.js';
import { drips, robot } from './legion.js';
import { drawWar } from './wasteart.js';
import { harvester, lensAt, mine, spotter } from './wasteart2.js';

const K = 0.85;
const toThink = (state) => [{ when: () => true, go: (e) => go(e, state) }];
const ready = (e, state, cd = e.T.cd) => {
  go(e, state);
  e.cd = rnd(cd[0], cd[1]);
};

// --- the harvester ---------------------------------------------------------------------------------

defineFoe(
  'harvester',
  robot({
    moves: toThink('hvThink'),
    attacks: ['hvWind', 'hvRun', 'hvChopW', 'hvChop'],
    unstoppable: (e) => e.state === 'hvRun',
    states: {
      hvThink(e, dt) {
        const o = pickTarget(e, dt),
          adx = Math.abs(o.x - e.x),
          ady = Math.abs(o.y - e.y),
          side = e.x >= o.x ? 1 : -1;
        faceT(e, o);
        if (e.cd <= 0 && adx > HARV.min && ady < 30 && inView(e.x, e.y, -20)) {
          go(e, 'hvWind');
          SFX.engine();
          return;
        }
        if (adx < HARV.chop.reach && ady < 18 && !(e.chopCd > 0)) {
          go(e, 'hvChopW');
          return;
        }
        moveTo(e, o.x + side * 300, o.y, e.T.speed, dt);
      },
      hvWind(e) {
        if (fxRandom() < 0.3) dust(e.x - e.face * 80, e.y, 1);
        if (e.t > HARV.wind) {
          go(e, 'hvRun', 0, { hitP: false, mowed: [] });
          SFX.charge();
        }
      },
      hvRun(e, dt) {
        e.x += e.face * HARV.speed * dt;
        e.moving = true;
        e.walkT += dt * 8;
        if (fxRandom() < 0.6) dust(e.x - e.face * 90, e.y, 1);
        // whoever is in front of its reel is mowed down
        const front = e.x + e.face * 110 * K;
        if (
          !e.hitP &&
          Math.abs(P.x - front) < 60 &&
          Math.abs(P.y - e.y) < 28 &&
          meetsPlayer(0, 90)
        ) {
          e.hitP = true;
          hitPlayer(HARV.dmg, e.face, true);
        }
        for (const o of rivals(e))
          if (!e.mowed.includes(o) && Math.abs(o.x - front) < 60 && Math.abs(o.y - e.y) < 28) {
            e.mowed.push(o);
            rivalHit(e, o, HARV.rdmg, true, e.face);
          }
        // the edge of the screen: stuck in the sand
        if ((e.face > 0 && e.x > G.cam + W - 90) || (e.face < 0 && e.x < G.cam + 90)) {
          go(e, 'hvStuck');
          G.shake = Math.max(G.shake, 6);
          dust(e.x + e.face * 90, e.y, 10);
          SFX.thud();
        }
      },
      hvStuck(e) {
        if (e.t > HARV.stuck) ready(e, 'hvThink', HARV.cd);
      },
      hvChopW(e) {
        if (e.t > HARV.chop.wind) go(e, 'hvChop', 0, { hitDone: false });
      },
      hvChop(e) {
        if (!e.hitDone && e.t > 0.08) {
          e.hitDone = true;
          swing(e, 10, HARV.chop.reach + 20, 30, 130, HARV.chop.dmg, true);
          SFX.spin();
        }
        if (e.t > HARV.chop.act) go(e, 'hvRec');
      },
      hvRec(e) {
        if (e.t > HARV.chop.rec) {
          go(e, 'hvThink');
          e.chopCd = rnd(1.5, 2.5);
        }
      },
    },
    timers: ['chopCd'],
    soak: (e) => (e.state === 'hvStuck' ? HARV.open : 1),
    onHit(e, dmg, dir, knock, src) {
      struckByHer(e, src);
      return false;
    },
    // its lane marked on the ground while it revs
    ground(e) {
      if (e.state !== 'hvWind') return;
      const u = Math.min(1, e.t / HARV.wind),
        x0 = e.x - G.cam,
        x1 = e.face > 0 ? W + 20 : -20;
      ctx.save();
      ctx.fillStyle = `rgba(255,50,40,${0.12 + 0.2 * u})`;
      ctx.fillRect(Math.min(x0, x1), e.y - 26, Math.abs(x1 - x0), 52);
      ctx.strokeStyle = `rgba(255,60,40,${0.5 + 0.4 * u})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(Math.min(x0, x1), e.y - 26, Math.abs(x1 - x0), 52);
      ctx.restore();
    },
    draw: (e) => drawWar(e, 0.75, harvester, true),
    over(e) {
      if (e.state === 'hvStuck') dizzy(e.x - G.cam, e.y - e.z - 170, 50);
      drips(e, 150);
      warMark(e, 220);
    },
  }),
);

// --- the spotter ---------------------------------------------------------------------------------

/** The first body on the spotter's line, in front of its lens: her, or anyone of the fight. */
function firstOnLine(e) {
  let best = null,
    bx = Infinity;
  const ahead = (o) => (o.x - e.x) * e.face;
  if (ahead(P) > 20 && Math.abs(P.y - e.y) < 20 && P.z < 160) {
    best = P;
    bx = ahead(P);
  }
  for (const o of G.enemies)
    if (
      o !== e &&
      !o.dead &&
      !o.dying &&
      o.state !== 'rise' &&
      ahead(o) > 20 &&
      ahead(o) < bx &&
      Math.abs(o.y - e.y) < 20 &&
      inView(o.x, o.y)
    ) {
      best = o;
      bx = ahead(o);
    }
  return best;
}
defineFoe(
  'spotter',
  robot({
    moves: toThink('stThink'),
    attacks: ['stAim', 'stFire'],
    states: {
      stThink(e, dt) {
        const o = pickTarget(e, dt),
          dx = o.x - e.x,
          side = e.x >= o.x ? 1 : -1;
        faceT(e, o);
        if (e.cd <= 0 && Math.abs(o.y - e.y) < 30 && Math.abs(dx) > 160 && inView(e.x, e.y, -30)) {
          go(e, 'stAim');
          SFX.beep();
          return;
        }
        moveTo(e, o.x + side * SPOT.keep, o.y, e.T.speed, dt);
      },
      stAim(e, dt) {
        // its line follows the lane of whom it fights, then holds still
        const o = e.tgt;
        if (o && e.t < SPOT.aim - SPOT.lock) {
          const d = o.y - e.y;
          e.y += Math.sign(d) * Math.min(Math.abs(d), SPOT.track * dt);
          e.moving = Math.abs(d) > 2;
          if (e.moving) e.walkT += dt * 3;
        }
        if (e.glitchT > 0) e.y += rnd(-40, 40) * dt;
        if (e.t > SPOT.aim) {
          go(e, 'stFire', 0, { beamDone: false });
          SFX.laser();
        }
      },
      stFire(e) {
        if (!e.beamDone) {
          e.beamDone = true;
          const o = firstOnLine(e);
          e.beamTo = o ? o.x : e.face > 0 ? G.cam + W + 40 : G.cam - 40;
          e.beamZ = o ? (o === P ? 90 : (o.T.height ?? 150) * 0.5) : 90;
          if (o === P) hitPlayer(SPOT.dmg, e.face, false);
          else if (o && o.T.side && o.T.side !== e.T.side) rivalHit(e, o, SPOT.rdmg, false);
          else if (o) spark(o.x - e.face * 10, o.y - e.beamZ, '#ff8a6a', true); // one of its own
        }
        if (e.t > SPOT.fire) ready(e, 'stRec', SPOT.cd);
      },
      stRec(e) {
        if (e.t > 0.4) go(e, 'stThink');
      },
    },
    onHit(e, dmg, dir, knock, src) {
      struckByHer(e, src);
      // a heavy blow knocks its stilts from under it
      if (knock && e.hp > 0) {
        Object.assign(e, { state: 'air', t: 0, vx: dir * 140, vz: 320, engage: false });
        return true;
      }
      return false;
    },
    // its aim along the lane, on the ground
    ground(e) {
      if (e.state !== 'stAim') return;
      const lock = e.t > SPOT.aim - SPOT.lock,
        x0 = e.x - G.cam,
        x1 = e.face > 0 ? W + 20 : -20;
      ctx.save();
      ctx.strokeStyle = lock ? 'rgba(255,40,30,.9)' : 'rgba(255,60,40,.45)';
      ctx.lineWidth = lock ? 3 : 2;
      ctx.setLineDash(lock ? [] : [10, 8]);
      ctx.beginPath();
      ctx.moveTo(x0, e.y);
      ctx.lineTo(x1, e.y);
      ctx.stroke();
      ctx.restore();
    },
    draw: (e) => drawWar(e, K, spotter),
    over(e) {
      const [lx, ly] = lensAt(e, K);
      if (e.state === 'stAim') {
        // a thin red ray from the lens down onto its line
        ctx.save();
        ctx.strokeStyle = 'rgba(255,60,40,.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx - G.cam, ly);
        ctx.lineTo((e.face > 0 ? W : 0) + 0, e.y - 90);
        ctx.stroke();
        ctx.restore();
      } else if (e.state === 'stFire' && e.beamTo !== undefined) {
        const a = 1 - e.t / SPOT.fire;
        ctx.save();
        ctx.lineCap = 'round';
        for (const [lw, col] of [
          [14, `rgba(255,40,30,${0.4 * a})`],
          [5, `rgba(255,200,180,${a})`],
        ]) {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(lx - G.cam, ly);
          ctx.lineTo(e.beamTo - G.cam, e.y - e.beamZ);
          ctx.stroke();
        }
        ctx.restore();
      }
      drips(e, 200 * K);
      warMark(e, 270 * K);
    },
  }),
);

// --- the mine beetle -------------------------------------------------------------------------------

/** It bursts where it is (BLAST.mine: her, and every foe near). */
function burst(e) {
  if (e.dead) return;
  e.dead = true;
  if (e.kicked) P.score += Math.round(e.T.score * scoreMult());
  explode(e.x, e.y, 'mine', e.z);
}
// Kicked away by her: it flies, and bursts where it lands or on whoever it strikes.
defineState('mbKick', {
  pin: true,
  tick(e, dt) {
    e.x += e.vx * dt;
    e.vz -= 1400 * dt;
    e.z = Math.max(0, e.z + e.vz * dt);
    const hit = G.enemies.some(
      (o) =>
        o !== e &&
        !o.dying &&
        !o.dead &&
        o.type !== 'mine' &&
        Math.abs(o.x - e.x) < 40 &&
        Math.abs(o.y - e.y) < 24,
    );
    if (hit || (e.z <= 0 && e.t > 0.1)) burst(e);
  },
});
defineFoe(
  'mine',
  robot({
    moves: toThink('mbRun'),
    die: (e) => burst(e),
    states: {
      mbRun(e, dt) {
        // the nearest living thing: her, or a mutant
        let o = P,
          bd = Math.hypot(P.x - e.x, (P.y - e.y) * 2);
        for (const r of rivals(e)) {
          const d = Math.hypot(r.x - e.x, (r.y - e.y) * 2);
          if (d < bd) {
            o = r;
            bd = d;
          }
        }
        e.tgt = o;
        faceT(e, o);
        if (bd < MINE.near) {
          go(e, 'mbArm');
          SFX.beep();
          return;
        }
        moveTo(e, o.x, o.y, e.T.speed, dt);
      },
      mbArm(e) {
        if (fxRandom() < 0.1) SFX.beep(true);
        if (e.t > MINE.arm) burst(e);
      },
    },
    onHit(e, dmg, dir, knock, src) {
      e.hp = e.T.hp;
      if (src === 'rival' || src === 'blast') {
        // struck by a foe, caught in a blast: it goes off a moment later
        if (e.state !== 'mbArm') go(e, 'mbArm', MINE.arm - 0.15);
        return true;
      }
      // her blow kicks it away
      Object.assign(e, {
        state: 'mbKick',
        t: 0,
        vx: dir * MINE.kick,
        vz: 300,
        z: Math.max(e.z, 12),
        kicked: true,
        engage: false,
      });
      SFX.clang();
      return true;
    },
    draw: (e) => drawWar(e, 0.8, mine),
  }),
);
