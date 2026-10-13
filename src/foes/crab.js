// Jawacorp's cyber crab (TYPES.crab, CRAB), the last boss of Midnight City, on the garden at the
// top of the tower. A war machine the size of a tram: a wide armoured carapace of dark steel,
// glowing vents, eyes on stalks, a grilled mouth, two great orange claws in front and six legs,
// three on each side. Like a crab it faces out of the screen and walks sideways along the road.
// Its body is solid, an oval on the ground: the heroine cannot walk into it, she slides round it
// (along the road's depth). Its legs can be broken: each takes so many blows; a broken leg is
// gone, the crab slumps for a moment (its body down, blows on it do more harm) and is slower for
// good; with fewer than two legs on a side it can no longer scuttle; with none left it lies on
// its belly for good and fights from there with its claws and bubbles. Every move has a plain
// wind-up:
//   - the claw slam: a claw rises high over her (its shadow on the ground under it), trembling,
//     then comes down on that spot; in its third phase a second slam follows;
//   - the claw sweep: the claw drawn back low, scraping sparks, then swept out along the
//     ground on her side (jump it);
//   - the bubbles: its mouth glows and its body swells, then bubbles arc out onto her and round
//     her (their shadows show where), bursting;
//   - the stomp: when she is close it rises high on its legs, trembling, steam from its vents,
//     then drops: a ring of shock round it (jump it);
//   - the scuttle: it crouches, legs drumming, then charges sideways through where she stands;
//   - the leap (with legs on both sides): crouched deep, then up out of sight; its landing spot
//     is lit on the ground, following her, then fixed, and it comes down on it.
// Three phases: alone at first; at two thirds of its health two drones (as the mech samurai's)
// fly out of it and laser marked spots under her; at a third (or with all its legs gone) two
// more, its eyes turn red and it gets quicker.
// It never flinches. Beaten, it sinks down, sparking, and bursts.
import { CRAB, OL, TAU, W } from '../config.js';
import { clamp, ease, fxRandom, fxRnd, lerp, random, rnd } from '../util.js';
import { APP, G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { dust, spark } from '../fx.js';
import { finale, hitPlayer } from '../combat.js';
import { scoreMult } from '../style.js';
import { defineFoe } from './registry.js';
import { go } from './kit.js';
import { bossDrones } from './drones.js';
import { jawaLogo } from '../bg3.js';

const C = CRAB;
const STEEL = '#3b4656',
  DARK = '#262d38',
  CLAW = '#c4482a',
  CLAW_DK = '#7a2a18',
  GLOW = '#4fe3ff',
  RED = '#ff3b4b';
/** Its legs: side s (-1 left, 1 right), i from the body outwards. */
const LEGS = [-1, 1].flatMap((s) => [0, 1, 2].map((i) => ({ s, i })));
/** Where each leg's foot stands across the road's depth (behind, level, in front). */
const LEG_DY = [-24, 2, 26];

/** Its countdowns run quicker in its third phase. */
const cd = (e, r) => rnd(...r) * (e.p2 ? C.p2cd : 1);
/** Its pace: quicker in its third phase (slower for every leg it has lost, as it walks). */
const pace = (e) => (e.p2 ? C.p2speed : 1);
const legsLost = (e) => e.legs.filter((l) => l.broken).length;
/** All its legs gone: it lies on its belly for good. */
const grounded = (e) => legsLost(e) === e.legs.length;
/** Where its body rests: on its legs, or down on its belly when they are all gone. */
const restLift = (e) => (grounded(e) ? -90 : 0);
const legsOn = (e, s) => e.legs.filter((l) => l.s === s && !l.broken).length;
/** The side she is on. */
const sideOf = (e) => (P.x >= e.x ? 1 : -1);
/** Where its body may stand: clear of the screen's edges by C.edge. */
const clampX = (e, x) => clamp(x, G.cam + C.bw + C.edge, G.cam + W - C.bw - C.edge);
/** Where on side s its claw can come down: from just off its body to C.slam.reach out. */
function clawX(e, s, x) {
  const a = e.x + s * (C.bw + 30),
    b = e.x + s * (C.bw + C.slam.reach);
  return clamp(x, Math.min(a, b), Math.max(a, b));
}
/** How high its body's underside is now (it rises to stomp, sinks when it slumps or dies). */
const under = (e) => C.hb + (e.lift ?? 0);

/** Where a leg's knee and foot are (offsets from its middle: x along the road, height z). */
function legAt(e, l) {
  const { s, i } = l,
    u = under(e),
    step = e.walking ? Math.max(0, Math.sin(e.walkT * 1.6 + i * 2.1 + (s > 0 ? Math.PI : 0))) : 0,
    drum = e.state === 'crscutw' ? Math.max(0, Math.sin(e.t * 40 + i * 2 + s)) * 10 : 0,
    // rising to stomp it stands tall on straight legs; slumped, they splay out
    splay = e.state === 'crslump' || e.state === 'crdie' ? 40 : 0;
  return {
    rx: s * (C.bw - 30),
    rz: u + 40,
    kx: s * (C.bw + 40 + i * 50 + splay * 0.5),
    kz: u + 95 - i * 18 + (e.lift ?? 0) * 0.3,
    fx: s * (C.bw + 70 + i * 72 + splay),
    fz: step * 16 + drum,
    fy: LEG_DY[i],
  };
}

/** Where a claw's pincer is now (offset x, height z, depth y) and how open it is. */
function clawAt(e, s) {
  const u = under(e),
    // at rest the claws are held up in front of its body, like fists raised
    rest = {
      x: s * (C.bw * 0.72),
      z: u - 10 + Math.sin(e.anim * 2 + s) * 5,
      open: 0.2 + 0.08 * Math.sin(e.anim * 3 + s),
      up: 1,
    };
  if (s !== e.side) return rest;
  const A = C.slam,
    S = C.sweep,
    tx = (e.tx ?? e.x) - e.x;
  switch (e.state) {
    case 'crslamw': {
      const k = ease(clamp(e.t / (e.wind ?? A.wind), 0, 1)),
        shake = e.t > (e.wind ?? A.wind) * 0.6 ? Math.sin(e.t * 60) * 4 : 0;
      return {
        x: lerp(rest.x, tx, k) + shake,
        z: lerp(rest.z, u + 220, k),
        open: 0.25 + 0.5 * k,
        up: 1 - k,
      };
    }
    case 'crslam': {
      const k = clamp(e.t / A.strike, 0, 1);
      return { x: tx, z: lerp(u + 220, 8, k * k), open: 0.75 - 0.6 * k };
    }
    case 'crsweepw': {
      const k = ease(clamp(e.t / S.wind, 0, 1));
      return { x: lerp(rest.x, s * (C.bw * 0.35), k), z: lerp(rest.z, 14, k), open: 0.6 };
    }
    case 'crsweep': {
      const k = ease(clamp(e.t / S.strike, 0, 1));
      return { x: s * lerp(C.bw * 0.35, C.bw + S.reach, k), z: 18, open: 0.6 - 0.4 * k };
    }
    default:
      return rest;
  }
}

/** A ring of shock on the ground at (x, y), `r` round: whoever is on the ground in it is thrown. */
function shock(x, y, r, dmg, col = '#9fe8ff') {
  G.parts.push({ k: 'gring', x, y, t: 0, life: 0.5, s: r, col });
  dust(x, y, 14);
  G.shake = Math.max(G.shake, 14);
  SFX.quake();
  if (((P.x - x) / r) ** 2 + ((P.y - y) / (r * 0.42)) ** 2 < 1 && P.z < 30)
    hitPlayer(dmg, P.x >= x ? 1 : -1, true);
}

/** A leg breaks off: its plates fly, the crab loses health and slumps. */
function breakLeg(e, l) {
  l.broken = true;
  const g = legAt(e, l);
  SFX.shatter();
  SFX.clang();
  G.shake = Math.max(G.shake, 10);
  G.freeze = Math.max(G.freeze, 0.12);
  spark(e.x + g.kx, e.y - g.kz, '#ffd0a0', true);
  for (let k = 0; k < 10; k++)
    G.debris.push({
      k: 'shard',
      x: e.x + lerp(g.kx, g.fx, fxRandom()),
      gy: e.y + g.fy + fxRnd(-6, 6),
      z: fxRnd(20, g.kz),
      vx: l.s * fxRnd(60, 300),
      vz: fxRnd(200, 460),
      rot: fxRnd(TAU),
      vr: fxRnd(-12, 12),
      len: fxRnd(12, 26),
      col: k % 3 ? STEEL : CLAW,
      life: 2.5,
    });
  e.hp -= C.breakDmg;
  // its last leg: down on its belly for good; else it slumps a moment
  if (e.hp > 0) go(e, grounded(e) ? 'crfall' : 'crslump', 0, { side: 0, hitDone: false });
}

/** The marks on the ground: the slam's shadow growing under the raised claw. */
function ground(e) {
  if (e.state === 'crjump') return landing(e);
  if (e.state !== 'crslamw' && e.state !== 'crslam') return;
  const k = e.state === 'crslam' ? 1 : clamp(e.t / (e.wind ?? C.slam.wind), 0, 1),
    r = C.slam.r * (0.55 + 0.45 * k);
  ctx.save();
  ctx.fillStyle = `rgba(10,14,20,${0.15 + 0.35 * k})`;
  ctx.beginPath();
  ctx.ellipse(e.tx - G.cam, e.ty, r, r * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Where it will land from its leap, lit on the ground: a red-orange ring, pulsing, filling in
 *  as it comes down. */
function landing(e) {
  const J = C.jump,
    k = clamp(e.t / (J.up + J.hang + J.fall), 0, 1),
    lock = e.t > J.up + J.hang - J.lock,
    p = 0.5 + 0.5 * Math.sin(G.time * (lock ? 30 : 12)),
    x = e.tx - G.cam;
  ctx.save();
  ctx.fillStyle = `rgba(255,70,40,${0.12 + 0.25 * k})`;
  ctx.strokeStyle = `rgba(255,${lock ? 60 : 140},50,${0.6 + 0.4 * p})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, e.ty, J.r, J.r * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, e.ty, J.r * (1 - 0.8 * k), J.r * 0.42 * (1 - 0.8 * k), 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// its drones: none in its first phase, two from the second, four in the third; they fly out of
// its back and then hover by its eyes (the second pair wider and higher)
const DR = bossDrones(C.drone, {
  strong: (e) => e.phase >= 3,
  beaten: (e) => e.state === 'crdie',
  cd: (e, r) => cd(e, r),
  count: (e) => [0, 0, 2, 4][e.phase ?? 1],
  from: (e) => [e.x, e.y, under(e) + C.bodyH],
  home: (e, i) => {
    const s = i % 2 ? 1 : -1,
      far = i >= 2 ? 1 : 0;
    return [
      e.x + s * (C.drone.side + far * 110) + Math.sin(G.time * 1.7 + i * 2) * 16,
      e.y - 20 + (i % 2) * 40,
      under(e) + C.bodyH + 50 + far * 70 + Math.sin(G.time * 2.3 + i) * 14,
    ];
  },
});

/** Pick its next move, or walk sideways to keep her at claw's length. */
function think(e, dt) {
  const s = sideOf(e),
    gap = Math.abs(P.x - e.x) - C.bw,
    ady = Math.abs(P.y - e.y),
    down = ['ko', 'down', 'getup', 'dead', 'win', 'plunge'].includes(P.state);
  e.side = s;
  const legs = !grounded(e);
  if (!down && e.t > 0.3) {
    if (legs && e.jumpCd <= 0 && legsOn(e, -1) > 0 && legsOn(e, 1) > 0 && gap > 60) {
      go(e, 'crjumpw', 0, { side: 0, hitDone: false });
      SFX.spin();
      return;
    }
    if (legs && e.stompCd <= 0 && gap < C.stomp.near && ady < 120) {
      go(e, 'crstompw', 0, { side: 0 });
      SFX.spin();
      return;
    }
    if (
      legs &&
      e.scutCd <= 0 &&
      gap > 120 &&
      ady < C.scuttle.dy &&
      legsOn(e, -1) >= 2 &&
      legsOn(e, 1) >= 2
    ) {
      go(e, 'crscutw', 0, { rdir: s, hitDone: false });
      return;
    }
    if (e.sweepCd <= 0 && gap > -20 && gap < C.sweep.reach - 60 && ady < C.sweep.dy) {
      go(e, 'crsweepw', 0, { hitDone: false });
      SFX.hiss();
      return;
    }
    if (e.slamCd <= 0 && gap < C.slam.reach) {
      slamAt(e, C.slam.wind, false);
      return;
    }
    if (e.bubCd <= 0 && gap > 150) {
      go(e, 'crbubw', 0, { side: 0 });
      SFX.squelch();
      return;
    }
  }
  // on its belly it can no longer walk: it fights from where it lies
  if (!legs) {
    e.walking = false;
    return;
  }
  // sideways, to keep her a claw's length off its body; drifting across the road after her
  const tx = clampX(e, P.x - s * (C.bw + C.keep)),
    sp = e.T.speed * pace(e) * (1 - C.legSlow * legsLost(e));
  e.walking = Math.abs(tx - e.x) > 8;
  if (e.walking) {
    e.x += Math.sign(tx - e.x) * Math.min(Math.abs(tx - e.x), sp * dt);
    e.walkT += dt * 6 * pace(e);
  }
  e.y += clamp(P.y - e.y, -1, 1) * Math.min(Math.abs(P.y - e.y), 30 * dt);
}
/** A claw rises to slam down on her (`second`: the follow-up in its third phase). */
function slamAt(e, wind, second) {
  const s = sideOf(e);
  e.side = s;
  go(e, 'crslamw', 0, {
    wind,
    second,
    tx: clawX(e, s, P.x),
    ty: P.y,
    hitDone: false,
  });
  SFX.stance();
}

export default defineFoe('crab', {
  init: {
    slamCd: [1, 2],
    sweepCd: [3, 5],
    bubCd: [2, 4],
    stompCd: [4, 6],
    scutCd: [6, 9],
    jumpCd: [5, 8],
    droneCd: [3, 5],
  },
  timers: ['slamCd', 'sweepCd', 'bubCd', 'stompCd', 'scutCd', 'jumpCd', 'droneCd'],
  // it never flinches, never is thrown
  guard: () => true,
  spawn(e, side, placed) {
    e.legs = LEGS.map((l) => ({ ...l, hp: C.legHp, broken: false }));
    Object.assign(e, { lift: 0, walkT: 0, side: 0, phase: 1 });
    if (placed) {
      e.state = 'crwalk';
      return;
    }
    // it drops from the sky onto the garden
    Object.assign(e, { state: 'crdrop', z: 760, vz: -300, x: G.cam + W * 0.62 });
  },
  // its parts: a leg (taking the blow) or its body
  zone(e, x0, x1, y, dy, zLo, zHi) {
    if (e.state === 'crdrop' || e.state === 'crdie' || e.z > 60) return null;
    const lo = Math.min(x0, x1),
      hi = Math.max(x0, x1);
    for (let n = 0; n < e.legs.length; n++) {
      const l = e.legs[n];
      if (l.broken) continue;
      const g = legAt(e, l),
        a = e.x + Math.min(g.kx, g.fx) - 18,
        b = e.x + Math.max(g.kx, g.fx) + 18;
      if (hi > a && lo < b && Math.abs(y - (e.y + g.fy)) < dy + 30 && zLo < g.kz && zHi > 0)
        return `leg${n}`;
    }
    const u = under(e) + e.z;
    if (
      hi > e.x - C.bw &&
      lo < e.x + C.bw &&
      Math.abs(y - e.y) < dy + C.depth &&
      zLo < u + C.bodyH &&
      zHi > u
    )
      return 'body';
    return null;
  },
  // which part a hit lands on: blows on the slumped body do more harm
  zoneHit(e, zone) {
    e.hitZone = zone;
    return zone === 'body' && e.state === 'crslump' ? C.slumpMult : 1;
  },
  onHit(e, dmg) {
    const n = e.hitZone?.startsWith('leg') ? +e.hitZone.slice(3) : -1;
    e.hitZone = null;
    if (n >= 0 && !e.legs[n].broken && (e.legs[n].hp -= dmg) <= 0) breakLeg(e, e.legs[n]);
    return false;
  },
  die(e) {
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, { dying: true, engage: false, state: 'crdie', t: 0, hp: 0 });
    finale(e);
    SFX.boom();
  },
  tick(e, dt) {
    DR.tick(e, dt);
    // its phases: two drones fly out at two thirds of its health; at a third (or with all its
    // legs gone) two more, and it gets quicker
    const ph = e.hp <= e.T.hp * C.ph3 || grounded(e) ? 3 : e.hp <= e.T.hp * C.ph2 ? 2 : 1;
    if (ph > e.phase && !e.dying) {
      e.phase = ph;
      e.p2 = ph >= 3;
      e.droneCd = Math.min(e.droneCd, 1.5);
      if (e.state !== 'crfall' && e.state !== 'crjump') go(e, 'crroar', 0, { side: 0 });
      SFX.nova();
      G.flash = Math.max(G.flash, 0.3);
    }
    // its drones fire when their time comes, whatever the crab is doing
    if (e.phase >= 2 && e.droneCd <= 0 && (e.dm ?? 'home') === 'home' && !e.dying) DR.attack(e);
    // its body is solid, an oval on the ground: she is pushed out of it the shortest way, so
    // she slides round it smoothly (never off the screen: then out the other side)
    if (e.state !== 'crdrop' && e.z < 60) {
      const ax = C.bw + 18,
        ay = C.depth,
        dx = P.x - e.x,
        dy = P.y - e.y,
        v = (dx / ax) ** 2 + (dy / ay) ** 2;
      if (v < 1) {
        const k = v > 1e-6 ? 1 / Math.sqrt(v) : 0;
        let nx = k ? dx * k : (P.x >= e.x ? 1 : -1) * ax,
          ny = k ? dy * k : 0;
        if (e.x + nx < G.cam + 20 || e.x + nx > G.cam + W - 20) nx = -nx;
        P.x = e.x + nx;
        P.y = e.y + ny;
      }
    }
    // steam from its vents, more in its third phase
    if (fxRandom() < (e.p2 ? 0.3 : 0.12))
      G.parts.push({
        k: 'smoke',
        x: e.x + fxRnd(-C.bw * 0.7, C.bw * 0.7),
        y: e.y - e.z - under(e) - C.bodyH - fxRnd(0, 10),
        vx: fxRnd(-20, 20),
        vy: fxRnd(-70, -30),
        g: 0,
        t: 0,
        life: 0.7,
        s: fxRnd(8, 14),
      });
  },
  states: {
    crdrop(e, dt) {
      e.vz -= 2000 * dt;
      e.z += e.vz * dt;
      if (e.z <= 0) {
        e.z = 0;
        shock(e.x, e.y, 300, 16);
        SFX.boom();
        go(e, 'crrec', -0.5);
      }
    },
    crwalk(e, dt) {
      e.lift += (restLift(e) - e.lift) * 0.2;
      think(e, dt);
    },
    // all its legs gone: down on its belly, for good
    crfall(e) {
      e.walking = false;
      e.lift += (-95 - e.lift) * 0.3;
      if (!e.hitDone && e.lift < -80) {
        e.hitDone = true;
        shock(e.x, e.y, C.bw + 60, 10);
        SFX.boom();
      }
      if (e.t > C.fall) go(e, 'crrec', 0);
    },
    // the leap: crouched deep, trembling...
    crjumpw(e) {
      e.walking = false;
      e.lift = -40 * ease(clamp(e.t / 0.4, 0, 1)) + (e.t > 0.4 ? Math.sin(e.t * 60) * 3 : 0);
      if (fxRandom() < 0.4) dust(e.x + fxRnd(-C.bw - 150, C.bw + 150), e.y + fxRnd(-20, 20), 1);
      if (e.t > C.jump.wind / pace(e)) {
        go(e, 'crjump', 0, { x0: e.x, y0: e.y, tx: clampX(e, P.x), ty: P.y, lift: 0 });
        dust(e.x, e.y, 16);
        SFX.jump();
        G.shake = Math.max(G.shake, 8);
      }
    },
    // ...up out of sight, hanging over her (where it will land lit on the ground), and down
    crjump: {
      pin: true,
      tick(e, dt) {
        const J = C.jump,
          T = J.up + J.hang + J.fall;
        if (e.t < J.up + J.hang - J.lock) {
          const k = Math.min(1, dt * 4);
          e.tx += (clampX(e, P.x) - e.tx) * k;
          e.ty += (P.y - e.ty) * k;
        }
        if (e.t < J.up) e.z = J.h * Math.sin(((e.t / J.up) * Math.PI) / 2);
        else if (e.t < J.up + J.hang) e.z = J.h;
        else e.z = J.h * (1 - ((e.t - J.up - J.hang) / J.fall) ** 2);
        const u = ease(clamp(e.t / (J.up + J.hang), 0, 1));
        e.x = lerp(e.x0, e.tx, u);
        e.y = lerp(e.y0, e.ty, u);
        if (e.t >= T) {
          e.z = 0;
          e.x = e.tx;
          e.y = e.ty;
          G.shake = Math.max(G.shake, 22);
          SFX.boom();
          SFX.quake();
          dust(e.x, e.y, 24);
          G.parts.push({ k: 'gring', x: e.x, y: e.y, t: 0, life: 0.5, s: J.r, col: '#ffb27a' });
          if (((P.x - e.x) / J.r) ** 2 + ((P.y - e.y) / (J.r * 0.42)) ** 2 < 1 && P.z < 60)
            hitPlayer(J.dmg, P.x >= e.x ? 1 : -1, true);
          go(e, 'crrec', -(J.rec - C.rec), { jumpCd: cd(e, J.cd), lift: -30 });
        }
      },
    },
    crrec(e) {
      e.walking = false;
      e.lift += (restLift(e) - e.lift) * 0.2;
      if (e.t > C.rec / pace(e)) go(e, 'crwalk');
    },
    crroar(e) {
      e.walking = false;
      if (fxRandom() < 0.5)
        spark(e.x + fxRnd(-C.bw, C.bw), e.y - under(e) - fxRnd(20, C.bodyH), '#ffb0a0', false);
      if (e.t > 1) go(e, 'crwalk');
    },
    // the claw slam: up high over her, then down on the spot
    crslamw(e, dt) {
      e.walking = false;
      if (e.t < C.slam.track) {
        const s = e.side,
          k = Math.min(1, dt * 5);
        e.tx += (clawX(e, s, P.x) - e.tx) * k;
        e.ty += (P.y - e.ty) * k;
      }
      if (fxRandom() < 0.3) {
        const c = clawAt(e, e.side);
        G.parts.push({
          k: 'glow',
          x: e.x + c.x,
          y: e.y - c.z,
          vx: 0,
          vy: -20,
          g: 0,
          t: 0,
          life: 0.2,
          s: 4,
          col: '#ffd27a',
        });
      }
      if (e.t > e.wind / pace(e)) {
        go(e, 'crslam', 0);
        SFX.swing();
      }
    },
    crslam(e) {
      if (!e.hitDone && e.t >= C.slam.strike) {
        e.hitDone = true;
        const r = C.slam.r;
        G.parts.push({ k: 'gring', x: e.tx, y: e.ty, t: 0, life: 0.4, s: r, col: '#ffb27a' });
        dust(e.tx, e.ty, 12);
        G.shake = Math.max(G.shake, 12);
        SFX.thud();
        SFX.clang();
        if (((P.x - e.tx) / r) ** 2 + ((P.y - e.ty) / (r * 0.6)) ** 2 < 1 && P.z < 40)
          hitPlayer(C.slam.dmg, e.side, true);
      }
      if (e.t > C.slam.strike + C.slam.hold / pace(e)) {
        if (e.p2 && !e.second) slamAt(e, C.slam.wind2, true);
        else go(e, 'crrec', 0, { slamCd: cd(e, C.slam.cd), side: 0 });
      }
    },
    // the claw sweep: drawn back low, scraping, then out along the ground
    crsweepw(e) {
      e.walking = false;
      if (fxRandom() < 0.6) {
        const c = clawAt(e, e.side);
        G.parts.push({
          k: 'dot',
          x: e.x + c.x,
          y: e.y + 10,
          vx: fxRnd(-80, 80),
          vy: fxRnd(-200, -80),
          g: 600,
          t: 0,
          life: 0.3,
          s: 2.5,
          col: '#ffd27a',
        });
      }
      if (e.t > C.sweep.wind / pace(e)) {
        go(e, 'crsweep', 0);
        SFX.swing();
      }
    },
    crsweep(e) {
      const c = clawAt(e, e.side);
      if (
        !e.hitDone &&
        (P.x - e.x) * e.side > C.bw - 20 &&
        Math.abs(P.x - (e.x + c.x)) < 60 &&
        Math.abs(P.y - e.y) < C.sweep.dy &&
        P.z < C.sweep.z &&
        hitPlayer(C.sweep.dmg, e.side, true)
      )
        e.hitDone = true;
      if (e.t > C.sweep.strike + 0.2) go(e, 'crrec', 0, { sweepCd: cd(e, C.sweep.cd), side: 0 });
    },
    // the bubbles: the mouth glows, then they arc out
    crbubw(e) {
      e.walking = false;
      if (e.t > C.bubble.wind / pace(e)) {
        const n = e.p2 ? C.bubble.n2 : C.bubble.n;
        for (let k = 0; k < n; k++) {
          const a = random() * TAU,
            d = k ? rnd(70, 170) : 0;
          G.projs.push({
            k: 'cbub',
            x0: e.x,
            y0: e.y + 20,
            z0: under(e) + 20,
            tx: P.x + Math.cos(a) * d,
            ty: P.y + Math.sin(a) * d * 0.4,
            x: e.x,
            y: e.y + 20,
            z: under(e) + 20,
            vx: 0,
            t: -k * 0.08,
            T: C.bubble.flight,
            h: C.bubble.h,
            life: 9,
          });
        }
        SFX.plasma();
        go(e, 'crrec', 0, { bubCd: cd(e, C.bubble.cd) });
      }
    },
    // the stomp: up on its legs, then down
    crstompw(e) {
      e.walking = false;
      e.lift =
        80 * ease(clamp(e.t / C.stomp.wind, 0, 1)) + (e.t > 0.5 ? Math.sin(e.t * 50) * 3 : 0);
      if (fxRandom() < 0.4)
        G.parts.push({
          k: 'smoke',
          x: e.x + fxRnd(-C.bw, C.bw),
          y: e.y - under(e),
          vx: fxRnd(-30, 30),
          vy: fxRnd(-80, -40),
          g: 0,
          t: 0,
          life: 0.6,
          s: fxRnd(10, 16),
        });
      if (e.t > C.stomp.wind / pace(e)) go(e, 'crstomp', 0, { hitDone: false });
    },
    crstomp(e) {
      e.lift = Math.max(-25, 80 - e.t * 900);
      if (!e.hitDone && e.lift <= -25) {
        e.hitDone = true;
        shock(e.x, e.y, C.stomp.r, C.stomp.dmg);
        SFX.boom();
        G.shake = Math.max(G.shake, 20);
      }
      if (e.t > 0.15 + C.stomp.rec / pace(e)) go(e, 'crrec', 0, { stompCd: cd(e, C.stomp.cd) });
    },
    // the scuttle: crouched, legs drumming, then sideways through her
    crscutw(e) {
      e.walking = false;
      e.lift = -18 * ease(clamp(e.t / 0.3, 0, 1));
      if (fxRandom() < 0.5) dust(e.x + fxRnd(-C.bw - 150, C.bw + 150), e.y + fxRnd(-20, 20), 1);
      if (e.t > C.scuttle.wind / pace(e)) {
        go(e, 'crscut', 0);
        SFX.dash();
      }
    },
    crscut(e, dt) {
      e.walking = true;
      e.walkT += dt * 30;
      e.x += e.rdir * C.scuttle.speed * pace(e) * dt;
      if (fxRandom() < 0.7) dust(e.x - e.rdir * (C.bw + 100), e.y + fxRnd(-24, 24), 1);
      if (
        !e.hitDone &&
        Math.abs(P.y - e.y) < C.scuttle.dy &&
        Math.abs(P.x - e.x) < C.bw + 70 &&
        hitPlayer(C.scuttle.dmg, e.rdir, true)
      )
        e.hitDone = true;
      const end = clampX(e, e.x) !== e.x || (e.x - P.x) * e.rdir > C.bw + 160;
      if (end) {
        e.x = clampX(e, e.x);
        G.shake = Math.max(G.shake, 6);
        go(e, 'crrec', 0, { scutCd: cd(e, C.scuttle.cd), lift: 0 });
      }
    },
    // a leg broken: down on its belly for a moment
    crslump(e) {
      e.walking = false;
      e.lift += (Math.min(-70, restLift(e)) - e.lift) * 0.25;
      if (e.t > C.slump) go(e, 'crrec', 0);
    },
    crdie(e) {
      e.walking = false;
      e.lift += (-90 - e.lift) * 0.05;
      if (fxRandom() < 0.4) spark(e.x + fxRnd(-C.bw, C.bw), e.y - fxRnd(40, 220), '#ffd0a0', false);
      if (e.t > C.dieT) {
        e.dead = true;
        G.parts.push({ k: 'boom', x: e.x, y: e.y, z: 120, t: 0, life: 0.8, s: 320 });
        SFX.boom();
        G.shake = 20;
        for (let k = 0; k < 40; k++)
          G.parts.push({
            k: 'dot',
            x: e.x + fxRnd(-C.bw, C.bw),
            y: e.y - fxRnd(40, 280),
            vx: fxRnd(-320, 320),
            vy: fxRnd(-420, 100),
            g: 300,
            t: 0,
            life: fxRnd(0.8, 1.6),
            s: fxRnd(3, 6),
            col: k % 3 ? '#9fe8ff' : '#ff8a5a',
          });
      }
    },
  },
  ground(e) {
    ground(e);
    DR.ground(e);
  },
  over: (e) => DR.draw(e),
  draw: drawCrab,
});

// --- its look --------------------------------------------------------------------------------------

/** A plated segment from p to q, `w` wide. */
function seg(p, q, w, col, fl) {
  ctx.lineCap = 'round';
  for (const [lw, c] of [
    [w + 4, OL],
    [w, fl ? '#fff' : col],
  ]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(...p);
    ctx.lineTo(...q);
    ctx.stroke();
  }
}
/** A joint: a knob with a glowing ring. */
function joint(x, y, r, fl, glow) {
  ctx.fillStyle = fl ? '#fff' : DARK;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (!fl) {
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, TAU);
    ctx.stroke();
  }
}
/** A leg: from the body out and up to the knee, then down to a pointed foot; a stump if broken. */
function drawLeg(e, l, fl, glow) {
  const g = legAt(e, l),
    root = [g.rx, -g.rz],
    knee = [g.kx, -g.kz + g.fy * 0.3],
    foot = [g.fx, -g.fz + g.fy];
  if (l.broken) {
    const end = [lerp(root[0], knee[0], 0.45), lerp(root[1], knee[1], 0.45)];
    seg(root, end, 16, STEEL, fl);
    if (fxRandom() < 0.08) spark(e.x + end[0], e.y - e.z + end[1], '#ffd0a0', false);
    return;
  }
  seg(root, knee, 18, STEEL, fl);
  seg(knee, foot, 12, STEEL, fl);
  // an orange stripe down the shin
  if (!fl) {
    ctx.strokeStyle = CLAW;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lerp(knee[0], foot[0], 0.15), lerp(knee[1], foot[1], 0.15));
    ctx.lineTo(lerp(knee[0], foot[0], 0.6), lerp(knee[1], foot[1], 0.6));
    ctx.stroke();
  }
  // the pointed foot
  ctx.fillStyle = fl ? '#fff' : DARK;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(foot[0] - 7, foot[1] - 10);
  ctx.lineTo(foot[0] + 7, foot[1] - 10);
  ctx.lineTo(foot[0] + l.s * 4, foot[1] + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // cracked as it takes blows
  if (l.hp < C.legHp * 0.5 && !fl) {
    ctx.strokeStyle = '#ffd27a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(knee[0] - 6, knee[1] + 8);
    ctx.lineTo(knee[0] + 4, knee[1] + 18);
    ctx.lineTo(knee[0] - 2, knee[1] + 28);
    ctx.stroke();
  }
  joint(knee[0], knee[1], 10, fl, glow);
}
/** A claw: the arm from the front of its body, the pincer (palm and two fingers) at the end. */
function drawClaw(e, s, fl) {
  const u = under(e),
    c = clawAt(e, s),
    sh = [s * C.bw * 0.45, -u - 30],
    p = [c.x, -c.z + 28],
    up = c.up ?? 0,
    // the elbow: out to the side and low when the claw is held up, else up between
    el = [
      lerp(lerp(sh[0], p[0], 0.5) + s * 30, s * (C.bw + 30), up),
      lerp(Math.min(sh[1], p[1]) - 30, -u + 40, up),
    ];
  seg(sh, el, 20, CLAW_DK, fl);
  seg(el, p, 18, CLAW, fl);
  joint(el[0], el[1], 11, fl, '#ffd27a');
  // the pincer
  // held up, the pincer points up and in; at work, along the forearm
  const along = Math.atan2(p[1] - el[1], p[0] - el[0]),
    a = up > 0.5 ? -Math.PI / 2 - s * 0.55 : along,
    open = c.open;
  ctx.save();
  ctx.translate(p[0], p[1]);
  ctx.rotate(a);
  ctx.scale(1.3, 1.3);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.fillStyle = fl ? '#fff' : CLAW;
  ctx.beginPath();
  ctx.ellipse(10, 0, 30, 22, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  for (const [dir, len] of [
    [-1, 52],
    [1, 44],
  ]) {
    ctx.save();
    ctx.translate(30, dir * 8);
    ctx.rotate(dir * open * 0.9);
    ctx.fillStyle = fl ? '#fff' : dir < 0 ? CLAW : CLAW_DK;
    ctx.beginPath();
    ctx.moveTo(0, -dir * 10);
    ctx.quadraticCurveTo(len * 0.6, -dir * 14, len, dir * 2);
    ctx.lineTo(len * 0.55, dir * 6);
    ctx.lineTo(0, dir * 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  if (!fl) {
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath();
    ctx.ellipse(4, -8, 14, 6, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
/** The cyber crab: legs, its carapace, eyes on stalks, its mouth, its claws. */
function drawCrab(e) {
  const fl = e.flash > 0,
    u = under(e),
    glow = e.p2 ? RED : GLOW,
    lost = (s) => e.legs.filter((l) => l.s === s && l.broken).length,
    tilt = (lost(1) - lost(-1)) * 0.05,
    puff = e.state === 'crbubw' ? Math.sin(clamp(e.t / C.bubble.wind, 0, 1) * Math.PI) * 0.05 : 0;
  ctx.save();
  ctx.translate(e.x - G.cam, e.y - e.z);
  ctx.rotate(tilt);
  // the legs, behind the body
  for (const l of e.legs) drawLeg(e, l, fl, glow);
  // the carapace
  const top = -u - C.bodyH,
    mid = -u - C.bodyH / 2;
  ctx.save();
  ctx.translate(0, mid);
  ctx.scale(1 + puff, 1 + puff);
  ctx.translate(0, -mid);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  const g = ctx.createLinearGradient(0, top, 0, -u);
  g.addColorStop(0, fl ? '#fff' : '#566578');
  g.addColorStop(1, fl ? '#fff' : STEEL);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-C.bw, -u - 20);
  ctx.quadraticCurveTo(-C.bw - 14, mid - 10, -C.bw + 30, top + 18);
  ctx.quadraticCurveTo(0, top - 26, C.bw - 30, top + 18);
  ctx.quadraticCurveTo(C.bw + 14, mid - 10, C.bw, -u - 20);
  ctx.quadraticCurveTo(0, -u + 14, -C.bw, -u - 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!fl) {
    // its plates: ridges fanning out from the middle, a rim of orange, rivets
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (const k of [-0.6, -0.25, 0.25, 0.6]) {
      ctx.moveTo(k * 40, top + 4);
      ctx.quadraticCurveTo(k * 120, mid, k * C.bw * 1.05, -u - 14);
    }
    ctx.stroke();
    ctx.strokeStyle = CLAW;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-C.bw + 10, -u - 22);
    ctx.quadraticCurveTo(0, -u + 6, C.bw - 10, -u - 22);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-C.bw + 50, top + 22);
    ctx.quadraticCurveTo(0, top - 10, C.bw - 50, top + 22);
    ctx.stroke();
    // the vents, glowing
    if (!APP.lowFx) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = glow;
    for (const s of [-1, 1])
      for (let k = 0; k < 3; k++) ctx.fillRect(s * (70 + k * 16) - 4, mid - 18 + k * 6, 8, 18);
    ctx.shadowBlur = 0;
    jawaLogo(0, top + 34, 14);
  }
  // the mouth: a grille glowing as the bubbles gather, two mandibles
  const glowK = e.state === 'crbubw' ? clamp(e.t / C.bubble.wind, 0, 1) : 0.15;
  ctx.fillStyle = fl ? '#fff' : '#12161c';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-34, -u - 34, 68, 26, 6);
  ctx.fill();
  ctx.stroke();
  if (!fl) {
    ctx.fillStyle = `rgba(120,230,255,${0.25 + 0.7 * glowK})`;
    for (let k = 0; k < 5; k++) ctx.fillRect(-28 + k * 12, -u - 30, 6, 18);
  }
  for (const s of [-1, 1]) {
    ctx.fillStyle = fl ? '#fff' : DARK;
    ctx.beginPath();
    ctx.moveTo(s * 20, -u - 10);
    ctx.quadraticCurveTo(s * 30, -u + 8, s * 8, -u + 14);
    ctx.lineTo(s * 12, -u - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // the eyes on their stalks, looking at her
  const look = clamp((P.x - e.x) / 400, -1, 1) * 4;
  for (const s of [-1, 1]) {
    const base = [s * 34, top + 10],
      eye = [s * 44, top - 46 + Math.sin(e.anim * 3 + s) * 3];
    seg(base, eye, 8, DARK, fl);
    ctx.fillStyle = fl ? '#fff' : '#d8e2ea';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(eye[0], eye[1], 13, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (!fl) {
      ctx.fillStyle = e.state === 'crdie' ? `rgba(80,90,100,1)` : glow;
      if (!APP.lowFx) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.arc(eye[0] + look, eye[1], 6, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  ctx.restore();
  // the claws, in front
  for (const s of [-1, 1]) drawClaw(e, s, fl);
  ctx.restore();
}
