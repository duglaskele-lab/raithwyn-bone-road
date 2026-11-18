// The Rust Legion (the Wastelands, stage 4): the old machines of a dead colony, at war with the
// Children of the Crater as well as with her (see war.js). They roll and walk in from the
// sides. Fallen, a robot lies as a wreck a while (a welder raises it, a scavenger strips it).
// Acid eats their armour: a robot in a puddle of it, or struck by a spit, corrodes (SPIT) and
// every blow on it does more harm (green drips on it show it).
//   The junker (TYPES.junker, JUNK): rolls up quick on its one wheel and zaps her with its
//     prong (a moment stunned). A blow of hers from a jump tips it over.
//   The welder (TYPES.welder, WELD): walks on four legs to the wrecks and welds them back up —
//     they get up with half their health — and mends hurt robots with its arc; in between it
//     burns with its torch. A blow while it welds or mends stops it: hit it first.
import { SPIT, WAR, WELD, JUNK, ACID } from '../config.js';
import { fxRandom, fxRnd, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { dust, floatTxt, spark } from '../fx.js';
import { hitPlayer, stunPlayer } from '../combat.js';
import { t } from '../i18n.js';
import { ctx } from '../gfx.js';
import { defineFoe, defineState } from './registry.js';
import { go, moveTo } from './kit.js';
import {
  brawl,
  faceT,
  nearWreck,
  pickTarget,
  raise,
  release,
  struckByHer,
  swing,
  warMark,
  warSpawn,
  warTick,
  wreck,
} from './war.js';
import { drawWar, junker, torchAt, welder } from './wasteart.js';

const K = 0.85;
const toThink = (state) => [{ when: () => true, go: (e) => go(e, state) }];
const ready = (e, state) => {
  go(e, state);
  e.cd = rnd(e.T.cd[0], e.T.cd[1]);
};

// --- what every robot of the Legion shares -----------------------------------------------------

// Fallen: thrown back, then a wreck on the ground (see war.js).
defineState('wkFall', {
  pin: true,
  tick(e, dt) {
    e.x += e.vx * dt;
    e.vz -= 1500 * dt;
    e.z += e.vz * dt;
    if (e.z <= 0) {
      e.z = 0;
      go(e, 'wkLie');
      dust(e.x, e.y, 8);
      SFX.thud();
      G.shake = Math.max(G.shake, 4);
    }
  },
});
defineState('wkLie', (e) => {
  if (fxRandom() < 0.04) spark(e.x + fxRnd(-30, 30), e.y - 30, '#ffcf5a', false);
  if (e.t > WAR.wreck) e.dead = true;
});
/** In a puddle of acid it corrodes; corroded, it takes more harm. */
function corrode(e, dt) {
  e.corrodeT = (e.corrodeT ?? 0) - dt;
  if (e.z > 4 || e.dying) return;
  for (const a of G.pools) {
    if (a.fire) continue;
    const ex = (e.x - a.x) / ACID.rx,
      ey = (e.y - a.y) / ACID.ry;
    if (ex * ex + ey * ey < 1) e.corrodeT = SPIT.corrode;
  }
}
const soak = (e) => (e.corrodeT > 0 ? SPIT.corrodeK : 1);
/** Green drips running down a corroded robot. */
export function drips(e, top) {
  if (!(e.corrodeT > 0) || e.dying) return;
  ctx.fillStyle = '#9dff5a';
  for (let i = 0; i < 4; i++) {
    const u = (G.time * 0.8 + i * 0.27 + e.seed) % 1,
      x = e.x - G.cam + (i - 1.5) * 16,
      y = e.y - e.z - top + u * (top - 30);
    ctx.globalAlpha = 1 - u;
    ctx.beginPath();
    ctx.ellipse(x, y, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
/** A robot of the Legion: walks in, falls as a wreck, corrodes in acid, glitches in the
 *  glowing one's ring, flies when the brute throws it (see war.js). */
export const robot = (def) => ({
  spawn: warSpawn,
  walksIn: true,
  die: wreck,
  ...def,
  soak: (e, ...a) => soak(e) * (def.soak?.(e, ...a) ?? 1),
  tick(e, dt) {
    corrode(e, dt);
    warTick(e, dt);
    def.tick?.(e, dt);
  },
});

// --- the junker ------------------------------------------------------------------------------

defineFoe(
  'junker',
  robot({
    moves: toThink('jkThink'),
    states: {
      jkThink: (e, dt, s, ctxE) => brawl(e, dt, ctxE, JUNK.reach, 'jkWind'),
      jkWind(e) {
        if (e.t > JUNK.wind) {
          go(e, 'jkZap', 0, { hitDone: false });
          SFX.zap();
        }
      },
      jkZap(e) {
        if (!e.hitDone) {
          e.hitDone = true;
          swing(
            e,
            10,
            JUNK.reach + 24,
            24,
            140,
            JUNK.dmg,
            false,
            (dir) => stunPlayer(JUNK.dmg, JUNK.stun) || hitPlayer(JUNK.dmg, dir, false),
          );
        }
        if (e.t > JUNK.act) go(e, 'jkRec');
      },
      jkRec(e) {
        if (e.t > JUNK.rec) ready(e, 'jkThink');
      },
    },
    onHit(e, dmg, dir, knock, src) {
      struckByHer(e, src);
      // a blow of hers from a jump tips it over
      if (src !== 'rival' && P.z > 10 && e.hp > 0) {
        Object.assign(e, { state: 'air', t: 0, vx: dir * 200, vz: 380, engage: false });
        return true;
      }
      return false;
    },
    draw: (e) => drawWar(e, K, junker),
    over(e) {
      drips(e, 150 * K);
      warMark(e, 215 * K);
    },
  }),
);

// --- the welder ------------------------------------------------------------------------------

/** A hurt robot of the Legion near it, to mend (not itself). */
const hurtFriend = (e) =>
  G.enemies.find(
    (o) =>
      o !== e &&
      o.T.side === 'bot' &&
      !o.dying &&
      !o.dead &&
      o.hp < o.T.hp * WELD.hurt &&
      Math.abs(o.x - e.x) < WELD.range * 1.6,
  );
const busyWith = (e) => e.grudgeT > 0 && e.grudge && !e.grudge.dying;

defineFoe(
  'welder',
  robot({
    moves: toThink('wdThink'),
    timers: ['workCd'],
    attacks: ['wdTorchW', 'wdTorch'],
    states: {
      wdThink(e, dt, s, ctxE) {
        if (!busyWith(e) && !(e.workCd > 0)) {
          // a wreck to weld back up
          const w =
            e.job?.state === 'wkLie' && !e.job.looted && !e.job.dead
              ? e.job
              : nearWreck(e, WELD.see, (o) => o.T.side === 'bot');
          if (w) {
            w.claimed = e;
            e.job = w;
            const side = e.x >= w.x ? 1 : -1,
              tx = w.x + side * 110;
            if (Math.abs(tx - e.x) < 16 && Math.abs(w.y - e.y) < 14) {
              faceT(e, w);
              go(e, 'wdWeld');
              SFX.zap();
            } else {
              faceT(e, w);
              moveTo(e, tx, w.y, e.T.speed, dt);
            }
            return;
          }
          // a hurt robot to mend
          const h = hurtFriend(e);
          if (h) {
            e.job = h;
            faceT(e, h);
            if (Math.abs(h.x - e.x) < WELD.range && Math.abs(h.y - e.y) < 40) go(e, 'wdFix');
            else moveTo(e, h.x + (e.x >= h.x ? 1 : -1) * 140, h.y, e.T.speed, dt);
            return;
          }
        }
        release(e, e.job);
        e.job = null;
        brawl(e, dt, ctxE, WELD.torch.reach, 'wdTorchW');
      },
      wdWeld(e) {
        const w = e.job;
        if (!w || w.state !== 'wkLie' || w.looted || w.dead) {
          e.job = null;
          e.workCd = 1;
          go(e, 'wdThink');
          return;
        }
        w.t = Math.min(w.t, WAR.wreck - 2); // (it does not fade away while it is welded)
        if (fxRandom() < 0.5) spark(w.x + fxRnd(-24, 24), w.y - fxRnd(10, 50), '#cfeeff', false);
        if (e.t > WELD.weld) {
          raise(w, WELD.hpK);
          floatTxt(w.x, w.y - 150, t('welded'), '#ffb02e');
          SFX.clang();
          e.job = null;
          e.workCd = rnd(WELD.cd[0], WELD.cd[1]);
          go(e, 'wdThink');
        }
      },
      wdFix(e, dt) {
        const h = e.job;
        if (
          !h ||
          h.dying ||
          h.dead ||
          h.hp >= h.T.hp ||
          e.t > WELD.fix ||
          Math.abs(h.x - e.x) > WELD.range + 40
        ) {
          e.job = null;
          e.workCd = rnd(WELD.cd[0], WELD.cd[1]);
          go(e, 'wdThink');
          return;
        }
        faceT(e, h);
        h.hp = Math.min(h.T.hp, h.hp + WELD.rate * dt);
      },
      wdTorchW(e) {
        if (e.t > WELD.torch.wind) {
          go(e, 'wdTorch', 0, { hitDone: false });
          SFX.flame();
        }
      },
      wdTorch(e) {
        if (!e.hitDone && e.t > 0.06) {
          e.hitDone = true;
          swing(e, 10, WELD.torch.reach + 30, 26, 150, WELD.torch.dmg, false);
        }
        if (e.t > WELD.torch.act) go(e, 'wdRec');
      },
      wdRec(e) {
        if (e.t > WELD.torch.rec) ready(e, 'wdThink');
      },
    },
    onHit(e, dmg, dir, knock, src) {
      struckByHer(e, src);
      if (e.job?.claimed === e) e.job.claimed = null;
      e.job = null;
      e.workCd = Math.max(e.workCd ?? 0, 1.2);
      return false;
    },
    draw: (e) => drawWar(e, K, welder),
    over(e) {
      // its arc to the wreck it welds or the robot it mends
      if ((e.state === 'wdWeld' || e.state === 'wdFix') && e.job && !e.dying) {
        const [x0, y0] = torchAt(e, K),
          o = e.job,
          x1 = o.x,
          y1 = o.y - o.z - (e.state === 'wdWeld' ? 24 : 90);
        ctx.save();
        ctx.strokeStyle = e.state === 'wdFix' ? '#7dff8a' : '#cfeeff';
        ctx.lineWidth = 3;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(x0 - G.cam, y0);
        for (let i = 1; i <= 6; i++) {
          const u = i / 6;
          ctx.lineTo(
            x0 + (x1 - x0) * u - G.cam + (i < 6 ? fxRnd(-6, 6) : 0),
            y0 + (y1 - y0) * u + (i < 6 ? fxRnd(-8, 8) : 0),
          );
        }
        ctx.stroke();
        ctx.restore();
      }
      drips(e, 140 * K);
      warMark(e, 185 * K);
    },
  }),
);
