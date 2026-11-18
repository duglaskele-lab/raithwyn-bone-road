// The frost wolf (TYPES.frostwolf, FROST): the last boss of Frostfang Pass, in the glade under the
// moon. A white wolf the size of a horse, a mane of ice along its back, eyes like cold stars. It
// fights alone, as a hunter does: it prowls round her, keeps its distance, and picks an attack
// that will reach her, never the same twice in a row. Nothing it does takes her hands off the
// controls, and every attack has a way out that she can see before it comes:
//   - the bites: a snap of its jaws up close, then a lunge after her (step back, or aside);
//   - the pounce: it crouches, and an oval on the ground shows where it will come down (it
//     follows her, then turns red and holds still): step out of it, and the wolf lands on
//     nothing and skids, open;
//   - the ice fangs: it rears up and cracks run along the ground, down her lane (three lanes
//     from its second phase); it slams its paws and fangs of ice shoot up along them, from the
//     wolf outwards: step between the lanes;
//   - the frost breath: a cone of freezing mist, marked on the ground and still from the moment
//     it draws breath; caught in it she is hurt and chilled (slower for a while), no more.
//     Round its flank it cannot turn till it is done;
//   - behind it for too long: a sweep of its tail;
//   - from its second phase (FROST.ph2), the hunt in the snow: it runs off into the blizzard
//     and comes tearing across the glade along her lane, again and again from either side, a
//     pair of eyes and a line on the ground the moment before; after the last run it skids to
//     a stop in the middle, open;
//   - and the howl: a ring of frost spreads over the ground from it (two rings in its third
//     phase, FROST.ph3, when a blizzard blows): jump it.
// It has poise as the other enemies do (POISE in config.js; the bar under its health): her blows
// wear it down, faster while it winds something up, and with none left it is thrown on
// its side for a while, open (stars over its head: every blow does FROST.open times the harm).
// An attack with the red outline cannot be stopped and takes no poise.
import { FROST, H, OL, POISE, TAU, W } from '../config.js';
import { clamp, ease, fxRandom, fxRnd, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { finale, hitPlayer, poiseHit } from '../combat.js';
import { scoreMult } from '../style.js';
import { defineFoe } from './registry.js';
import { dizzy, faceP, go, moveTo } from './kit.js';

// winding something up: her blows wear its poise down faster (FROST.windMult)
const WIND = ['fwbitew', 'fwbite2w', 'fwpouncew', 'fwshardw', 'fwbreathw', 'fwhowlw', 'fwtailw'];
// nothing stops these (the red outline), and they take no poise
const RED = ['fwbite2', 'fwpounce', 'fwshard', 'fwbreath', 'fwdash', 'fwhowl', 'fwtail', 'fwhop'];
// open: every blow does FROST.open times the harm
const OPEN = ['fwskid', 'fwdown'];
// off in the blizzard, or not yet in the glade: nothing reaches it
const AWAY = ['fwenter', 'fwfade', 'fwdashw'];

const ph = (e) => e.phase - 1;
/** How much quicker it is in this phase. */
const quick = (e) => FROST.speed[ph(e)];
/** A wind-up's length in this phase (never shorter than she can react to). */
const wind = (e, t) => Math.max(POISE.minWind, t / quick(e));
const cd = (e, r) => rnd(...r) * FROST.cdK[ph(e)];
/** The glade's depth on screen: the back and the front of the floor. */
const floorY = () => [G.camY + 366, G.camY + H - 18];
export const isOpen = (e) => OPEN.includes(e.state);

/** Back to prowling, with a breath before its next attack. */
function rest(e, t = 0) {
  go(e, 'fwprowl', 0, { cd: Math.max(t, cd(e, FROST.gap)), backT: 0 });
}
/** Its poise gone: thrown on its side, open. */
function knockDown(e) {
  go(e, 'fwdown', 0, { z: 0, wp: FROST.poise, wpT: 0, lanes: null, mark: null });
  SFX.heavy();
  SFX.howl();
  G.shake = Math.max(G.shake, 12);
  G.freeze = Math.max(G.freeze, 0.12);
  dust(e.x, e.y, 14);
}
/** Frost in the air: a puff of pale mist. */
function mist(x, y, vx, vy, life = 0.6, s = 10) {
  G.parts.push({
    k: 'glow',
    x,
    y,
    vx,
    vy,
    g: -30,
    t: 0,
    life,
    s,
    col: fxRandom() < 0.5 ? '#dff8ff' : '#9fe6ff',
  });
}
/** Splinters of ice flying up from a spot of the ground. */
function shards(x, y, n = 5) {
  for (let k = 0; k < n; k++)
    G.debris.push({
      k: 'shard',
      x: x + fxRnd(-8, 8),
      gy: y + fxRnd(-4, 4),
      z: 6,
      vx: fxRnd(-130, 130),
      vz: fxRnd(160, 330),
      rot: fxRnd(TAU),
      vr: fxRnd(-14, 14),
      len: fxRnd(5, 10),
      col: '#d8f8ff',
      life: 0.7,
    });
}
/** Where its jaws are: [x, height]. */
const mouthAt = (e) => [e.x + e.face * 150, 118];
/** How deep the breath's cone is `rel` px in front of it. */
const coneDy = (rel) =>
  FROST.breath.dy0 + (FROST.breath.dy - FROST.breath.dy0) * clamp(rel / FROST.breath.reach, 0, 1);

// --- what it may do next -------------------------------------------------------------------------

/** Its attacks: `ok`: may it now; `go`: it begins. Never the same twice in a row. */
const ATTACKS = {
  bite: {
    ok: (e, s) => s.adx < FROST.bite.near && s.ady < 44,
    go(e) {
      go(e, 'fwbitew');
      SFX.dragonWind();
    },
  },
  pounce: {
    ok: (e, s) => e.pounceCd <= 0 && s.adx > FROST.pounce.min && s.adx < FROST.pounce.max,
    go(e) {
      go(e, 'fwpouncew', 0, { mark: { x: P.x, y: P.y, set: false } });
      SFX.roar();
    },
  },
  shard: {
    ok: (e, s) => e.shardCd <= 0 && s.adx > FROST.shard.min,
    go(e) {
      const S = FROST.shard,
        [y0, y1] = floorY(),
        ys = e.phase >= 2 ? [P.y - S.lanes, P.y, P.y + S.lanes] : [P.y];
      go(e, 'fwshardw', 0, {
        lanes: ys.filter((y) => y > y0 - 12 && y < y1 + 12).map((y) => clamp(y, y0, y1)),
        sx: e.x + e.face * 110,
        front: 0,
        spikes: [],
        hitDone: false,
      });
      SFX.dragonWind();
    },
  },
  breath: {
    ok: (e, s) =>
      e.breathCd <= 0 && s.adx > FROST.breath.min && s.adx < FROST.breath.max && s.ady < 54,
    go(e) {
      go(e, 'fwbreathw', 0, { by: P.y, hitDone: false });
      SFX.breath();
    },
  },
  dash: {
    ok: (e) => e.phase >= 2 && e.dashCd <= 0,
    go(e) {
      go(e, 'fwfade', 0, {
        runs: FROST.dash.n[ph(e)],
        rdir: e.x - G.cam < W / 2 ? -1 : 1,
      });
      SFX.howl();
    },
  },
  howl: {
    ok: (e) => e.phase >= 2 && e.howlCd <= 0,
    go: (e) => howl(e),
  },
  // not an attack: a leap back from her, to where its other attacks reach
  hop: {
    ok: (e, s) => s.adx < FROST.hop.near,
    go(e) {
      const dir = e.x >= P.x ? 1 : -1,
        // (away from her; at the screen's edge, over her to the other side)
        room = dir > 0 ? G.cam + W - 90 - e.x : e.x - G.cam - 90,
        to = room > FROST.hop.dist * 0.6 ? e.x + dir * FROST.hop.dist : P.x - dir * FROST.hop.dist;
      go(e, 'fwhop', 0, { x0: e.x, tx: clamp(to, G.cam + 90, G.cam + W - 90) });
      SFX.jump();
    },
  },
};
function howl(e) {
  go(e, 'fwhowlw', 0, { sung: 0 });
  SFX.howl();
}
/** The attack it takes now, or nothing (none will reach her). */
function choose(e, s) {
  const from = Object.keys(ATTACKS).filter((k) => k !== e.last && ATTACKS[k].ok(e, s));
  if (!from.length) return false;
  const k = from[Math.floor(random() * from.length)];
  e.last = k;
  faceP(e);
  ATTACKS[k].go(e);
  return true;
}

export default defineFoe('frostwolf', {
  walksIn: true,
  engageCap: 9,
  init: { pounceCd: [2, 3.5], shardCd: [3, 5], breathCd: [4, 6], dashCd: [2, 4], howlCd: [5, 8] },
  timers: ['pounceCd', 'shardCd', 'breathCd', 'dashCd', 'howlCd', 'tailCd', 'wpT'],
  attacks: [...WIND, ...RED],
  unstoppable: (e) => RED.includes(e.state),
  immune: (e) => AWAY.includes(e.state),
  soak: (e) => (isOpen(e) ? FROST.open : 1),
  // its poise: worn down by her blows, faster while it winds something up
  guard(e, knock, src, dir, crush) {
    if (RED.includes(e.state) || OPEN.includes(e.state) || e.state === 'fwrise') return true;
    e.wp -= poiseHit(knock, src, crush) * (WIND.includes(e.state) ? FROST.windMult : 1);
    e.wpT = FROST.regen;
    if (e.wp <= 0) knockDown(e);
    return true;
  },
  poise: (e) => (e.dying || AWAY.includes(e.state) ? null : [e.wp, FROST.poise]),
  // it comes running into the glade out of the trees
  spawn(e) {
    Object.assign(e, { phase: 1, w: FROST.w, wp: FROST.poise, face: -1, rings: [], backT: 0 });
    e.sung = 0;
    e.x = G.cam + W + 220;
    e.y = (floorY()[0] + floorY()[1]) / 2;
    go(e, 'fwenter');
  },
  // a blow lands on its long body (not while it is off in the blizzard)
  zone(e, x0, x1, y, dy, zLo, zHi) {
    if (AWAY.includes(e.state) || e.dying || Math.abs(y - e.y) > dy + 22) return null;
    const lo = Math.min(x0, x1),
      hi = Math.max(x0, x1),
      top = isOpen(e) ? 110 : 190;
    return hi > e.x - FROST.w && lo < e.x + FROST.w && zHi > e.z && zLo < e.z + top ? 'body' : null;
  },
  band: (e) => [e.z, e.z + 190],
  tick(e, dt) {
    if (e.moving) e.walkT = (e.walkT ?? 0) + dt * 9.5 * quick(e);
    // its poise comes back whole after a while without a blow
    if (e.wpT <= 0 && e.wp < FROST.poise && !isOpen(e)) e.wp = FROST.poise;
    // the next phase, once it is free to begin it: with a howl
    const p = e.hp / e.T.hp,
      want = p <= FROST.ph3 ? 3 : p <= FROST.ph2 ? 2 : 1;
    if (e.phase < want && !e.dying && e.state === 'fwprowl') {
      e.phase++;
      G.flash = Math.max(G.flash, 0.4);
      G.blizzard = e.phase >= 3;
      e.dashCd = Math.min(e.dashCd, 3);
      e.last = 'howl';
      faceP(e);
      howl(e);
    }
    // the rings of frost spreading from its howl: jump them
    const R = FROST.howl;
    for (const r of e.rings) {
      r.r += R.speed * dt;
      const d = Math.hypot(P.x - r.x, (P.y - r.y) / 0.42);
      if (!r.hit && Math.abs(d - r.r) < R.w && P.z < R.z && !e.dying) {
        r.hit = true;
        hitPlayer(R.dmg, P.x >= r.x ? 1 : -1, true);
      }
    }
    e.rings = e.rings.filter((r) => r.r < 1250);
    // the fangs of ice still standing
    for (const s of e.spikes ?? []) s.t += dt;
    if (e.spikes?.length) e.spikes = e.spikes.filter((s) => s.t < FROST.shard.life);
  },
  die(e) {
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, { dying: true, engage: false, hp: 0, z: 0, rings: [], spikes: [] });
    Object.assign(e, { lanes: null, mark: null });
    go(e, 'fwdie');
    G.blizzard = false;
    SFX.howl();
    finale(e);
  },
  states: {
    // running in from the trees, then a howl at the moon
    fwenter(e, dt) {
      const tx = G.cam + W - 250;
      if (e.x > tx) {
        e.x = Math.max(tx, e.x - 520 * dt);
        e.moving = true;
        e.sung = 0;
      } else if ((e.sung += dt) > 1.3) rest(e, 0.6);
    },
    // prowling: it keeps its distance, drifts into her lane, and chooses
    fwprowl(e, dt, s) {
      const T = FROST.tail,
        behind = s.dx * e.face < 0;
      e.backT = behind ? e.backT + dt : 0;
      // she stays behind it: a sweep of its tail
      if (
        behind &&
        e.backT > T.wait &&
        e.tailCd <= 0 &&
        s.adx < T.near &&
        s.ady < T.dy &&
        !s.pdown
      ) {
        go(e, 'fwtailw');
        return;
      }
      // (it is slow to turn round, slower still when its tail is ready for her)
      if (!behind || e.backT > (e.tailCd <= 0 && s.adx < T.near ? T.wait + 0.2 : 0.3)) faceP(e);
      if (fxRandom() < 0.05) {
        const [mx, mz] = mouthAt(e);
        mist(mx, e.y - mz, e.face * 30, -20, 0.5, 5);
      }
      if (e.cd <= 0 && !s.pdown && choose(e, s)) return;
      const side = s.dx >= 0 ? -1 : 1,
        far = s.adx > FROST.keep + 40,
        near = s.adx < FROST.keep - 70;
      if (far || near || s.ady > 26)
        moveTo(
          e,
          far || near ? P.x + side * FROST.keep : e.x,
          P.y,
          e.T.speed * quick(e) * (near ? 0.7 : 1),
          dt,
        );
    },
    // a breath after an attack
    fwrec(e) {
      if (e.t > e.recT / quick(e)) rest(e);
    },

    // --- the bites: a snap, then a lunge ---
    fwbitew(e) {
      if (e.t > wind(e, FROST.bite.wind)) {
        go(e, 'fwbite', 0, { hitDone: false });
        SFX.clack();
      }
    },
    fwbite(e) {
      const B = FROST.bite,
        rel = (P.x - e.x) * e.face;
      if (
        !e.hitDone &&
        e.t < 0.12 &&
        rel > 0 &&
        rel < FROST.w + B.reach &&
        Math.abs(P.y - e.y) < B.dy &&
        P.z < 70
      )
        e.hitDone = !!hitPlayer(B.dmg, e.face, false);
      if (e.t > 0.2) go(e, 'fwbite2w');
    },
    fwbite2w(e) {
      if (e.t > FROST.bite.wind2 / quick(e)) {
        go(e, 'fwbite2', 0, { hitDone: false, x0: e.x });
        SFX.dash();
      }
    },
    fwbite2: {
      pin: true,
      tick(e) {
        const B = FROST.bite,
          u = clamp(e.t / B.t2, 0, 1),
          rel = (P.x - e.x) * e.face;
        e.x = e.x0 + e.face * B.lunge * ease(u);
        if (
          !e.hitDone &&
          rel > 0 &&
          rel < FROST.w + B.reach2 &&
          Math.abs(P.y - e.y) < B.dy &&
          P.z < 70
        )
          e.hitDone = !!hitPlayer(B.dmg2, e.face, true);
        if (u >= 1) go(e, 'fwrec', 0, { recT: B.rec });
      },
    },

    // a leap back from her (or over her, with its back to the edge)
    fwhop: {
      pin: true,
      tick(e) {
        const u = clamp(e.t / FROST.hop.t, 0, 1);
        e.x = e.x0 + (e.tx - e.x0) * ease(u);
        e.z = 4 * FROST.hop.h * u * (1 - u);
        if (u < 1) return;
        e.z = 0;
        dust(e.x, e.y, 6);
        faceP(e);
        rest(e, 0.25);
        e.cd = 0.25;
      },
    },

    // --- the pounce ---
    fwpouncew(e) {
      const Q = FROST.pounce,
        w = wind(e, Q.wind),
        [y0, y1] = floorY();
      // the mark follows her, then holds still
      if (e.t < w - Q.lock) {
        faceP(e);
        e.mark.x = clamp(P.x, G.cam + 70, G.cam + W - 70);
        e.mark.y = clamp(P.y, y0, y1);
      } else e.mark.set = true;
      if (e.t > w) {
        go(e, 'fwpounce', 0, { x0: e.x, y0: e.y });
        SFX.jump();
      }
    },
    fwpounce: {
      pin: true,
      tick(e) {
        const Q = FROST.pounce,
          u = clamp(e.t / Q.air, 0, 1);
        e.x = e.x0 + (e.mark.x - e.x0) * u;
        e.y = e.y0 + (e.mark.y - e.y0) * u;
        e.z = 4 * Q.h * u * (1 - u);
        if (u < 1) return;
        e.z = 0;
        G.shake = Math.max(G.shake, 10);
        SFX.thud();
        dust(e.x, e.y, 12);
        shards(e.x, e.y, 6);
        const hit =
          ((P.x - e.x) / Q.rx) ** 2 + ((P.y - e.y) / Q.ry) ** 2 < 1 &&
          P.z < 40 &&
          hitPlayer(Q.dmg, P.x >= e.x ? 1 : -1, true);
        e.pounceCd = cd(e, Q.cd);
        e.mark = null;
        // it landed on nothing: it skids, open
        if (hit) go(e, 'fwrec', 0, { recT: Q.rec });
        else go(e, 'fwskid', 0, { skidT: Q.skid, vx: e.face * 260 });
      },
    },
    // skidding to a stop after a pounce that missed or the last run of its hunt: open
    fwskid: {
      pin: true,
      tick(e, dt) {
        e.x += e.vx * dt;
        e.vx *= Math.max(0, 1 - dt * 4);
        if (Math.abs(e.vx) > 40 && fxRandom() < 0.5) dust(e.x + e.face * fxRnd(20, 90), e.y, 1);
        if (e.t > e.skidT) rest(e, 0.3);
      },
    },

    // --- the ice fangs ---
    fwshardw(e) {
      if (e.t > wind(e, FROST.shard.wind)) {
        go(e, 'fwshard');
        SFX.boom();
        G.shake = Math.max(G.shake, 9);
        dust(e.sx, e.y, 10);
      }
    },
    fwshard(e, dt) {
      const S = FROST.shard,
        was = e.front;
      e.front += S.speed * dt;
      // a fang shoots up every so often along each lane as the crack runs on
      for (let d = Math.ceil(was / S.step) * S.step; d < e.front; d += S.step)
        for (const y of e.lanes) {
          const x = e.sx + e.face * d;
          if (x < G.cam - 40 || x > G.cam + W + 40) continue;
          e.spikes.push({ x, y, t: 0 });
          if (fxRandom() < 0.5) shards(x, y, 2);
        }
      if (Math.floor(was / 140) !== Math.floor(e.front / 140)) SFX.ice();
      const rel = (P.x - e.sx) * e.face;
      if (
        !e.hitDone &&
        P.z < S.z &&
        Math.abs(rel - e.front) < 46 &&
        rel > 30 &&
        e.lanes.some((y) => Math.abs(P.y - y) < S.w)
      )
        e.hitDone = !!hitPlayer(S.dmg, e.face, true);
      const edge = e.face > 0 ? G.cam + W - e.sx : e.sx - G.cam;
      if (e.front > edge + 60) {
        e.shardCd = cd(e, S.cd);
        e.lanes = null;
        go(e, 'fwrec', 0, { recT: S.rec });
      }
    },

    // --- the frost breath ---
    fwbreathw(e) {
      const [mx, mz] = mouthAt(e);
      if (fxRandom() < 0.5)
        mist(mx + e.face * fxRnd(40, 120), e.y - mz + fxRnd(-30, 30), -e.face * 220, 0, 0.3, 6);
      if (e.t > wind(e, FROST.breath.wind)) {
        go(e, 'fwbreath');
        SFX.iceBreath();
      }
    },
    fwbreath(e) {
      const B = FROST.breath,
        [mx, mz] = mouthAt(e),
        tip = Math.min(B.reach, 60 + e.t * 1100),
        rel = (P.x - e.x) * e.face - 150;
      for (let k = 0; k < 3; k++) {
        const u = fxRnd(0.05, 1);
        mist(
          mx + e.face * tip * u * 0.2,
          e.by - mz * (1 - u) + fxRnd(-1, 1) * coneDy(tip * u),
          e.face * fxRnd(500, 800),
          fxRnd(-30, 30),
          (tip / 700) * fxRnd(0.6, 1),
          fxRnd(8, 15),
        );
      }
      // caught in it: hurt and chilled (slower for a while), never held
      if (
        !e.hitDone &&
        rel > -30 &&
        rel < tip &&
        Math.abs(P.y - e.by) < coneDy(rel) &&
        P.z < 90 &&
        hitPlayer(B.dmg, e.face, false)
      ) {
        e.hitDone = true;
        P.chill = B.chill;
        SFX.freeze();
      }
      if (e.t > B.t) {
        e.breathCd = cd(e, B.cd);
        go(e, 'fwrec', 0, { recT: B.rec });
      }
    },

    // --- the sweep of its tail, at her behind it ---
    fwtailw(e) {
      if (e.t > wind(e, FROST.tail.wind)) {
        go(e, 'fwtail', 0, { hitDone: false });
        SFX.swing();
      }
    },
    fwtail(e) {
      const T = FROST.tail,
        rel = (P.x - e.x) * e.face;
      if (
        !e.hitDone &&
        e.t < 0.16 &&
        rel < 0 &&
        rel > -(FROST.w + T.reach) &&
        Math.abs(P.y - e.y) < T.dy &&
        P.z < 60
      )
        e.hitDone = !!hitPlayer(T.dmg, -e.face, true);
      if (e.t > 0.3) {
        e.tailCd = T.cd;
        go(e, 'fwrec', 0, { recT: 0.3 });
      }
    },

    // --- the hunt in the snow: off into the blizzard, then run after run across the glade ---
    fwfade(e, dt) {
      const D = FROST.dash;
      e.face = e.rdir;
      e.x += e.rdir * 1100 * dt;
      e.moving = true;
      if (e.t > D.fade) go(e, 'fwdashw', 0, { lane: null });
    },
    fwdashw(e) {
      const D = FROST.dash,
        [y0, y1] = floorY();
      // the lane is hers the moment the eyes show, and holds still
      if (e.lane === null) {
        e.lane = clamp(P.y, y0, y1);
        e.face = -e.rdir;
        e.x = e.rdir < 0 ? G.cam - 200 : G.cam + W + 200;
        e.y = e.lane;
        SFX.dragonWind();
      }
      if (e.t > wind(e, D.warn)) {
        go(e, 'fwdash', 0, { hitDone: false });
        SFX.dash();
      }
    },
    fwdash(e, dt) {
      const D = FROST.dash,
        last = e.runs <= 1,
        stop = G.cam + W / 2 - e.face * 60;
      e.x += e.face * D.speed * dt;
      e.moving = true;
      if (fxRandom() < 0.8) mist(e.x - e.face * 60, e.y - fxRnd(20, 120), -e.face * 200, 0, 0.4, 9);
      if (
        !e.hitDone &&
        Math.abs(P.x - e.x) < FROST.w + 20 &&
        Math.abs(P.y - e.lane) < D.dy &&
        P.z < D.z
      )
        e.hitDone = !!hitPlayer(D.dmg, e.face, true);
      // the last run ends in the middle of the glade: it skids to a stop, open
      if (last && (e.x - stop) * e.face >= 0) {
        e.dashCd = cd(e, D.cd);
        e.lane = null;
        go(e, 'fwskid', 0, { skidT: D.skid, vx: e.face * 420 });
        return;
      }
      if (e.x < G.cam - 220 || e.x > G.cam + W + 220) {
        e.runs--;
        e.rdir = e.face;
        go(e, 'fwdashw', 0, { lane: null });
      }
    },

    // --- the howl: rings of frost over the ground ---
    fwhowlw(e) {
      if (e.t > wind(e, FROST.howl.wind)) {
        go(e, 'fwhowl', 0, { sung: 0 });
        SFX.howl();
      }
    },
    fwhowl(e) {
      const R = FROST.howl,
        n = Math.max(1, R.n[ph(e)]);
      if (e.sung < n && e.t >= e.sung * R.gap) {
        e.sung++;
        e.rings.push({ x: e.x, y: e.y, r: 40, hit: false });
        G.shake = Math.max(G.shake, 8);
        SFX.ice();
      }
      if (e.t > (n - 1) * R.gap + R.rec) {
        e.howlCd = cd(e, R.cd);
        rest(e);
      }
    },

    // --- thrown on its side (its poise gone), getting up, its end ---
    fwdown(e) {
      if (e.t > FROST.down) go(e, 'fwrise');
    },
    fwrise(e) {
      if (e.t > 0.45) rest(e, 0.5);
    },
    fwdie(e) {
      if (fxRandom() < 0.4)
        mist(e.x + fxRnd(-120, 120), e.y - fxRnd(10, 70), 0, fxRnd(-40, -10), 1, 14);
      if (e.t > FROST.dieT) e.dead = true;
    },
  },

  // on the ground: where the pounce will land, the cracks of the ice fangs, the breath's cone,
  // the lane of its next run, the rings of frost
  ground(e) {
    ctx.save();
    if (e.mark) {
      const Q = FROST.pounce,
        x = e.mark.x - G.cam,
        red = e.mark.set || e.state === 'fwpounce';
      ctx.strokeStyle = red ? 'rgba(255,90,80,.95)' : 'rgba(170,240,255,.8)';
      ctx.fillStyle = red ? 'rgba(255,80,70,.24)' : 'rgba(120,220,255,.14)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, e.mark.y, Q.rx, Q.ry, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    if (e.lanes && (e.state === 'fwshardw' || e.state === 'fwshard')) {
      // cracks running out from under its paws along each lane, to the edge of the screen
      const S = FROST.shard,
        u = e.state === 'fwshard' ? 1 : clamp(e.t / wind(e, S.wind), 0, 1),
        x0 = e.sx - G.cam,
        x1 = e.face > 0 ? W + 20 : -20,
        xe = x0 + (x1 - x0) * Math.min(1, u * 1.6);
      for (const y of e.lanes) {
        ctx.fillStyle = `rgba(150,235,255,${0.1 + 0.16 * u})`;
        ctx.fillRect(Math.min(x0, xe), y - S.w, Math.abs(xe - x0), S.w * 2);
        ctx.strokeStyle = `rgba(235,252,255,${0.5 + 0.45 * u})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        const n = Math.ceil(Math.abs(xe - x0) / 34);
        for (let k = 1; k <= n; k++)
          ctx.lineTo(x0 + ((xe - x0) * k) / n, y + (k % 2 ? -5 : 5) * (k < n ? 1 : 0));
        ctx.stroke();
      }
    }
    if (e.state === 'fwbreathw' || e.state === 'fwbreath') {
      const B = FROST.breath,
        k = e.state === 'fwbreath' ? 1 : clamp(e.t / wind(e, B.wind), 0, 1),
        x0 = e.x - G.cam + e.face * 150,
        x1 = x0 + e.face * B.reach;
      ctx.fillStyle = `rgba(140,230,255,${0.1 + 0.2 * k})`;
      ctx.strokeStyle = `rgba(230,250,255,${0.45 + 0.5 * k})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0, e.by - B.dy0);
      ctx.lineTo(x1, e.by - B.dy);
      ctx.lineTo(x1, e.by + B.dy);
      ctx.lineTo(x0, e.by + B.dy0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (
      (e.state === 'fwdashw' || e.state === 'fwdash') &&
      e.lane !== null &&
      e.lane !== undefined
    ) {
      const D = FROST.dash,
        k = e.state === 'fwdash' ? 1 : clamp(e.t / wind(e, D.warn), 0, 1);
      ctx.fillStyle = `rgba(255,90,80,${0.1 + 0.2 * k})`;
      ctx.fillRect(0, e.lane - D.dy, W, D.dy * 2);
      ctx.strokeStyle = `rgba(255,150,140,${0.4 + 0.5 * k})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(-4, e.lane - D.dy, W + 8, D.dy * 2);
    }
    // (the rings run over the ground only)
    ctx.beginPath();
    ctx.rect(0, floorY()[0] - 10, W, H);
    ctx.clip();
    for (const r of e.rings) {
      const a = clamp(1.2 - r.r / 1100, 0, 1);
      ctx.strokeStyle = `rgba(120,225,255,${0.35 * a})`;
      ctx.lineWidth = FROST.howl.w * 0.84;
      ctx.beginPath();
      ctx.ellipse(r.x - G.cam, r.y, r.r, r.r * 0.42, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(245,253,255,${0.95 * a})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();
  },
  draw: drawFrostWolf,
  // over everyone: the fangs of ice, its eyes in the blizzard before a run, stars when it is open
  over(e) {
    const S = FROST.shard;
    for (const s of e.spikes ?? []) {
      const u = s.t / S.life,
        h = 78 * (u < 0.18 ? u / 0.18 : 1),
        x = s.x - G.cam;
      ctx.save();
      ctx.globalAlpha = clamp((1 - u) * 3, 0, 1);
      ctx.beginPath();
      ctx.moveTo(x - 13, s.y);
      ctx.lineTo(x - 3, s.y - h);
      ctx.lineTo(x + 13, s.y);
      ctx.closePath();
      ctx.fillStyle = '#bff0ff';
      ctx.fill();
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath();
      ctx.moveTo(x - 6, s.y - 4);
      ctx.lineTo(x - 3, s.y - h * 0.86);
      ctx.lineTo(x, s.y - 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (e.state === 'fwdashw' && e.lane !== null) {
      // two cold eyes at the edge it will come from
      const k = clamp(e.t / wind(e, FROST.dash.warn), 0, 1),
        x = e.rdir < 0 ? 26 : W - 26,
        y = e.lane - 118;
      ctx.save();
      ctx.fillStyle = `rgba(110,240,255,${0.35 + 0.65 * k})`;
      for (const dx of [-13, 13]) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y, 9 + 3 * k, 4 + 2 * k, dx < 0 ? 0.25 : -0.25, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    if (isOpen(e) && !e.dying)
      dizzy(e.x - G.cam + e.face * 120, e.y - e.z - (e.state === 'fwdown' ? 150 : 200));
  },
});

// --- how it looks -----------------------------------------------------------------------------------

const FUR = { fur: '#e9f3fc', sh: '#bfd3e8', dk: '#8fa9c8', ice: '#8fe6ff', eye: '#5ff3ff' },
  WHITE = { fur: '#fff', sh: '#fff', dk: '#eee', ice: '#fff', eye: '#fff' };
const mix = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];

/**
 * Its pose now. `by`: how far its body is sunk; `front`, `rear`: its shoulders and its haunches
 * apart from that; `neck`: its head from where it is held at rest; `head`: the head's tilt (up is
 * negative); `jaw` 0..1; `tail`: up is positive; `legs`: [ahead, lifted] for the near fore, far
 * fore, near hind and far hind paw; `lie`: on its side.
 */
function poseOf(e) {
  const st = e.state,
    br = Math.sin(e.anim * 2.4) * 2,
    o = {
      by: br,
      front: 0,
      rear: 0,
      neck: [0, 0],
      head: 0.12,
      jaw: 0,
      tail: 0.15 + Math.sin(e.anim * 1.7) * 0.08,
      legs: [
        [0, 0],
        [-18, 0],
        [0, 0],
        [22, 0],
      ],
      eye: 1,
      lie: 0,
    },
    stretch = (k) => {
      o.legs = [
        [58 * k, 20 * k],
        [74 * k, 28 * k],
        [-60 * k, 16 * k],
        [-76 * k, 24 * k],
      ];
      o.by = 14 * k;
      o.neck = [22 * k, 20 * k];
      o.head = 0.05;
      o.tail = -0.1;
    };
  if (e.moving && !['fwdash', 'fwfade', 'fwenter'].includes(st)) {
    // a trot
    const f = e.walkT ?? 0,
      step = (a) => [Math.cos(a) * 26, Math.max(0, Math.sin(a)) * 16];
    o.legs = [step(f), step(f + Math.PI), step(f + Math.PI), step(f)];
    o.legs[1][0] -= 16;
    o.legs[3][0] += 18;
    o.by = Math.sin(f * 2) * 2.5;
    o.neck = [8, 12];
    o.head = 0.2;
  }
  const U = (t) => clamp(e.t / t, 0, 1);
  switch (st) {
    case 'fwenter':
    case 'fwfade':
    case 'fwdash': {
      // a gallop: gathered, then stretched out
      const f = e.anim * 20,
        k = 0.5 + 0.5 * Math.sin(f);
      if (st === 'fwenter' && !e.moving) {
        // (arrived: the howl at the moon)
        o.neck = [-14, -30];
        o.head = -1.05;
        o.jaw = 0.7;
        o.tail = 0.5;
        break;
      }
      stretch(k);
      o.jaw = 0.5;
      break;
    }
    case 'fwbitew': {
      const u = ease(U(0.3));
      o.neck = [-18 * u, -8 * u];
      o.head = 0.12 - 0.3 * u;
      o.jaw = 0.75 * u;
      o.front = 8 * u;
      break;
    }
    case 'fwbite': {
      const u = U(0.1);
      o.neck = [34, 8];
      o.head = 0.15;
      o.jaw = 0.8 * (1 - u);
      break;
    }
    case 'fwbite2w':
      o.by += 16;
      o.rear = -8;
      o.neck = [-10, 6];
      o.jaw = 0.5;
      o.tail = 0.5;
      break;
    case 'fwhop':
      stretch(0.7);
      o.tail = 0.6;
      break;
    case 'fwbite2':
      stretch(0.8);
      o.jaw = 0.9 * (1 - U(FROST.bite.t2));
      break;
    case 'fwpouncew': {
      const u = ease(U(0.35));
      o.by += 30 * u;
      o.rear = -16 * u;
      o.front = 10 * u;
      o.neck = [6, 14 * u];
      o.head = 0.28;
      o.tail = 0.15 + 0.7 * u;
      o.jaw = 0.25 * u;
      break;
    }
    case 'fwpounce': {
      const u = U(FROST.pounce.air);
      stretch(1);
      o.front = -26 * (1 - 2 * u);
      o.rear = 22 * (1 - 2 * u);
      o.jaw = 0.8;
      break;
    }
    case 'fwskid': {
      const u = clamp(e.t / 0.25, 0, 1);
      o.by += 22;
      o.front = 12;
      o.legs = [
        [46, 0],
        [30, 0],
        [-30, 0],
        [-8, 0],
      ];
      o.neck = [10, 34];
      o.head = 0.5;
      o.jaw = 0.35;
      o.tail = -0.3 + Math.sin(e.t * 9) * 0.1 * (1 - u);
      o.eye = 0.4;
      break;
    }
    case 'fwshardw': {
      // rearing up on its hind legs, the fore paws in the air
      const u = ease(U(0.4));
      o.front = -70 * u;
      o.rear = 12 * u;
      o.legs[0] = [34 * u, 86 * u];
      o.legs[1] = [16 * u, 74 * u];
      o.neck = [-10 * u, -16 * u];
      o.head = 0.12 - 0.35 * u;
      o.jaw = 0.5 * u;
      o.tail = 0.15 + 0.4 * u;
      break;
    }
    case 'fwshard': {
      const u = U(0.1);
      o.front = -70 * (1 - u) + 16 * u;
      o.by += 8 * u;
      o.legs[0] = [38, 0];
      o.legs[1] = [24, 0];
      o.neck = [12, 20 * u];
      o.head = 0.35;
      o.jaw = 0.6;
      break;
    }
    case 'fwbreathw': {
      const u = ease(U(0.5));
      o.neck = [-24 * u, -20 * u];
      o.head = 0.12 - 0.5 * u;
      o.front = -6 * u;
      o.jaw = 0.2;
      break;
    }
    case 'fwbreath':
      o.front = 12;
      o.neck = [26, 18];
      o.head = 0.2;
      o.jaw = 1;
      o.tail = 0.4;
      break;
    case 'fwhowlw': {
      const u = ease(U(0.5));
      o.rear = 14 * u;
      o.neck = [-10 * u, -18 * u];
      o.head = 0.12 - 0.7 * u;
      o.jaw = 0.2 * u;
      break;
    }
    case 'fwhowl':
      o.rear = 14;
      o.neck = [-14, -30];
      o.head = -1.05 + Math.sin(e.t * 26) * 0.03;
      o.jaw = 0.75;
      o.tail = 0.5;
      break;
    case 'fwtailw':
      o.tail = 0.9 * ease(U(0.3));
      o.head = 0.3;
      o.neck = [-10, 6];
      break;
    case 'fwtail':
      o.tail = 0.9 - 1.6 * U(0.14);
      break;
    case 'fwrise': {
      const u = ease(U(0.45));
      o.lie = 1 - u;
      break;
    }
    case 'fwdown':
    case 'fwdie':
      o.lie = ease(U(0.22));
      break;
  }
  if (o.lie > 0) {
    // thrown on its side: the body on the ground, the legs out, the head down
    const k = o.lie;
    o.by = 66 * k;
    o.front = 6 * k;
    o.legs = [
      [52 * k, 0],
      [28 * k, 10 * k],
      [-46 * k, 0],
      [-20 * k, 10 * k],
    ];
    o.neck = [16 * k, 50 * k];
    o.head = 0.5 * k;
    o.jaw = 0.3 * k;
    o.tail = -0.5 * k;
    o.eye = st === 'fwdie' ? 0 : 1 - 0.7 * k;
  }
  return o;
}
/** Shapes drawn as one: every path stroked with the ink first, then every path filled. */
function joined(col, paths, lw = 5) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = lw;
  for (const p of paths) {
    ctx.beginPath();
    p();
    ctx.stroke();
  }
  ctx.fillStyle = col;
  for (const p of paths) {
    ctx.beginPath();
    p();
    ctx.fill();
  }
}
/** A limb: thick lines through the joints, the ink under them. */
function limb(pts, ws, col) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [extra, c] of [
    [5, OL],
    [0, col],
  ])
    for (let i = 0; i < pts.length - 1; i++) {
      ctx.strokeStyle = c;
      ctx.lineWidth = ws[i] + extra;
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      ctx.stroke();
    }
}
function drawFrostWolf(e) {
  if (e.state === 'fwdashw') return; // (off in the blizzard: only its eyes show, see `over`)
  const C = e.flash > 0 ? WHITE : FUR,
    o = poseOf(e),
    sx = e.x - G.cam,
    sy = e.y - e.z;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(e.face, 1);
  if (e.state === 'fwdie') ctx.globalAlpha = clamp((FROST.dieT - e.t) / 0.7, 0, 1);
  // the joints: shoulder and hip, the paws on the ground (or off it)
  const sh = [70, -136 + o.by + o.front],
    hp = [-76, -128 + o.by + o.rear],
    paw = ([dx, up], x) => [x + dx, -up],
    paws = [paw(o.legs[0], 88), paw(o.legs[1], 88), paw(o.legs[2], -96), paw(o.legs[3], -96)],
    // (`near`: its top is covered with fur again, so that the leg grows out of the body)
    fore = (p, c, near) => {
      const el = mix(sh, p, 0.5),
        wr = mix(sh, p, 0.82);
      limb([[sh[0] + 2, sh[1] + 22], [el[0] - 12, el[1]], [wr[0] + 5, wr[1]], p], [24, 16, 12], c);
      if (near) cover(sh[0] + 2, sh[1] + 14, 15, c);
      pawAt(p, c);
    },
    hind = (p, c, near) => {
      const kn = mix(hp, p, 0.42),
        hk = mix(hp, p, 0.76);
      limb([[hp[0], hp[1] + 18], [kn[0] + 20, kn[1]], [hk[0] - 20, hk[1]], p], [30, 18, 12], c);
      if (near) cover(hp[0], hp[1] + 8, 19, c);
      pawAt(p, c);
    },
    cover = (x, y, r, c) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    },
    pawAt = (p, c) => {
      ctx.beginPath();
      ctx.ellipse(p[0] + 8, p[1] - 6, 15, 8, 0, 0, TAU);
      ctx.fillStyle = c;
      ctx.fill();
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    };
  // the far legs, darker
  hind(paws[3], C.dk);
  fore(paws[1], C.dk);
  // the tail: a bushy plume
  const tp = [[hp[0] - 34, hp[1] - 8]];
  for (let k = 0; k < 4; k++) {
    // (out behind it, curling up the more it is raised)
    const a = 0.25 + o.tail * 0.9 + k * 0.12 * Math.sign(o.tail || 1);
    tp.push([tp[k][0] - Math.cos(a) * 25, tp[k][1] - Math.sin(a) * 25]);
  }
  joined(
    C.fur,
    tp.map(
      ([x, y], k) =>
        () =>
          ctx.arc(x, y, [16, 21, 23, 19, 11][k], 0, TAU),
    ),
  );
  ctx.fillStyle = C.sh;
  ctx.beginPath();
  ctx.arc(tp[1][0], tp[1][1] + 7, 12, 0, TAU);
  ctx.arc(tp[2][0], tp[2][1] + 8, 13, 0, TAU);
  ctx.fill();
  // the body: the chest, the haunch, the waist between them, the neck; a ruff of fur
  const hb = [sh[0] + 56 + o.neck[0], sh[1] - 40 + o.neck[1]], // where the head is held
    spine = (u) => {
      const p = mix([hp[0] - 10, hp[1] - 40], [sh[0] + 10, sh[1] - 46], u);
      return [p[0], p[1] - Math.sin(u * Math.PI) * 4];
    };
  joined(C.fur, [
    () => ctx.ellipse(sh[0], sh[1] + 4, 50, 48, 0, 0, TAU),
    () => ctx.ellipse(hp[0] + 2, hp[1] + 4, 46, 42, 0, 0, TAU),
    () => {
      ctx.moveTo(hp[0], hp[1] - 38);
      ctx.lineTo(sh[0], sh[1] - 44);
      ctx.lineTo(sh[0] + 6, sh[1] + 44);
      ctx.quadraticCurveTo((sh[0] + hp[0]) / 2, sh[1] + 16, hp[0] + 4, hp[1] + 44);
      ctx.closePath();
    },
    () => {
      ctx.moveTo(sh[0] - 8, sh[1] - 42);
      ctx.lineTo(hb[0] - 8, hb[1] - 24);
      ctx.lineTo(hb[0] + 6, hb[1] + 22);
      ctx.lineTo(sh[0] + 38, sh[1] + 26);
      ctx.closePath();
    },
    // the ruff: tufts under the neck and on the chest
    () => {
      ctx.moveTo(sh[0] + 20, sh[1] + 4);
      ctx.lineTo(sh[0] + 62, sh[1] + 18);
      ctx.lineTo(sh[0] + 40, sh[1] + 24);
      ctx.lineTo(sh[0] + 54, sh[1] + 44);
      ctx.lineTo(sh[0] + 28, sh[1] + 40);
      ctx.lineTo(sh[0] + 30, sh[1] + 60);
      ctx.lineTo(sh[0] + 4, sh[1] + 44);
      ctx.closePath();
    },
  ]);
  // the shade under its belly and chest: a soft band along its underside, inside its body
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(sh[0], sh[1] + 4, 50, 48, 0, 0, TAU);
  ctx.ellipse(hp[0] + 2, hp[1] + 4, 46, 42, 0, 0, TAU);
  ctx.moveTo(hp[0], hp[1] - 38);
  ctx.lineTo(sh[0], sh[1] - 44);
  ctx.lineTo(sh[0] + 6, sh[1] + 44);
  ctx.quadraticCurveTo((sh[0] + hp[0]) / 2, sh[1] + 16, hp[0] + 4, hp[1] + 44);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = C.sh;
  ctx.lineWidth = 34;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hp[0] - 30, hp[1] + 52);
  ctx.quadraticCurveTo((sh[0] + hp[0]) / 2, (sh[1] + hp[1]) / 2 + 34, sh[0] + 30, sh[1] + 58);
  ctx.stroke();
  ctx.restore();
  // the mane of ice along its back
  for (const [u, h, lean] of [
    [0.16, 26, -8],
    [0.36, 36, -10],
    [0.56, 44, -8],
    [0.76, 40, -4],
    [0.96, 30, 2],
  ]) {
    const [x, y] = spine(u);
    ctx.beginPath();
    ctx.moveTo(x - 11, y + 6);
    ctx.lineTo(x + lean, y - h);
    ctx.lineTo(x + 12, y + 6);
    ctx.closePath();
    ctx.fillStyle = C.ice;
    ctx.fill();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 2);
    ctx.lineTo(x + lean, y - h * 0.86);
    ctx.lineTo(x + 2, y + 2);
    ctx.closePath();
    ctx.fill();
  }
  // the near legs
  hind(paws[2], C.fur, true);
  fore(paws[0], C.fur, true);
  // the head
  ctx.save();
  ctx.translate(hb[0], hb[1]);
  ctx.rotate(o.head);
  // the lower jaw (behind the muzzle), the dark of its mouth, the tongue
  ctx.save();
  ctx.translate(8, 8);
  ctx.rotate(o.jaw * 0.62);
  if (o.jaw > 0.12) {
    ctx.fillStyle = '#27324d';
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(60, 0);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(62, 2);
  ctx.quadraticCurveTo(64, 12, 52, 13);
  ctx.lineTo(-6, 16);
  ctx.closePath();
  ctx.fillStyle = C.sh;
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  if (o.jaw > 0.2) {
    ctx.fillStyle = '#e8708a';
    ctx.beginPath();
    ctx.ellipse(34, 0, 20, 4, 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (const x of [46, 54]) {
      ctx.beginPath();
      ctx.moveTo(x - 3, 2);
      ctx.lineTo(x, -8);
      ctx.lineTo(x + 3, 2);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
  // the skull and the muzzle, the cheek's fur
  joined(
    C.fur,
    [
      () => ctx.ellipse(0, -4, 30, 26, 0, 0, TAU),
      () => {
        ctx.moveTo(10, -22);
        ctx.quadraticCurveTo(50, -18, 74, -8);
        ctx.quadraticCurveTo(80, 0, 72, 8);
        ctx.lineTo(8, 12);
        ctx.closePath();
      },
      () => {
        ctx.moveTo(-16, -2);
        ctx.lineTo(-38, 12);
        ctx.lineTo(-22, 14);
        ctx.lineTo(-30, 30);
        ctx.lineTo(-10, 22);
        ctx.lineTo(-6, 36);
        ctx.lineTo(8, 16);
        ctx.closePath();
      },
      // the ears
      () => {
        ctx.moveTo(-22, -16);
        ctx.lineTo(-30, -56);
        ctx.lineTo(-4, -26);
        ctx.closePath();
      },
      () => {
        ctx.moveTo(-8, -22);
        ctx.lineTo(-6, -62);
        ctx.lineTo(14, -24);
        ctx.closePath();
      },
    ],
    4.5,
  );
  ctx.fillStyle = C.dk;
  ctx.beginPath();
  ctx.moveTo(-4, -28);
  ctx.lineTo(-5, -52);
  ctx.lineTo(8, -27);
  ctx.closePath();
  ctx.fill();
  // the nose, the fangs of its upper jaw
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.ellipse(74, -4, 7, 6, 0, 0, TAU);
  ctx.fill();
  if (o.jaw > 0.12) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 1.5;
    for (const [x, h] of [
      [62, 13],
      [50, 8],
      [40, 7],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x - 4, 7);
      ctx.lineTo(x, 7 + h);
      ctx.lineTo(x + 4, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // the eye: a cold light under an angry brow (shut when it is beaten)
  if (o.eye > 0.05) {
    ctx.fillStyle = C.eye;
    ctx.beginPath();
    ctx.ellipse(22, -9, 8.5, 5 * o.eye, 0.22, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(24, -9, 3, 2 * o.eye, 0.22, 0, TAU);
    ctx.fill();
  } else {
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(14, -10);
    ctx.lineTo(31, -6);
    ctx.stroke();
  }
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(10, -19);
  ctx.lineTo(34, -12);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}
