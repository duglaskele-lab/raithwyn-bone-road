// The Bone Dragon, the lich that waits at the end of the road: AI, hit zones and drawing.
// It is slow, about a quarter of the screen in size. It picks an attack that can actually reach the player, never the same one twice
// in a row when it has a choice:
//   bite   - lowers its head to bite; the lowered head takes 1.5x damage for a while
//   claw   - a swipe of the front paw
//   laser  - a wide white beam from its bone heart along the whole arena; step up or down
//   pounce - a long jump towards a player who stands far away, landing close in front
//   leap   - phase two only: jumps onto the player and hits everything where it lands
//   plasma - at long range: three balls of plasma spat in arcs that blow up where they land
//   kick   - now and then, when the player stands close behind it: a kick of a hind leg
//   retreat - a combo: when the player is close, it leaps back to the far side of the arena
//            and at once charges the beam from there
//   sky    - phase two only: it rises and hovers and, turning its head, sweeps three white
//            beams from its jaws across the whole arena, slowly (along its top edge, its middle
//            and its bottom edge, the gaps between safe; or the bottom three of five lines, the
//            top two safe; or the top three, the bottom two safe), each leaving a burning
//            trail on the ground for a while; then it drops straight down and sends out the
//            leap's shockwave
// A heavy hit (a knockdown blow, a dark ball, the super) during the wind-up of the bite, the
// claw, the kick, the plasma or the pounce staggers it; then it shrugs off interrupts for a few seconds. The laser
// and the leap cannot be stopped at all.
import { GB, GT, TAU, W } from './config.js';
import { clamp, ease, fxRandom, fxRnd, lerp, random, rnd } from './util.js';
import { G, P } from './state.js';
import { SFX, growl } from './audio.js';
import { dust } from './fx.js';
import { hitPlayer } from './combat.js';
import { ctx } from './gfx.js';

export const DRAGON = {
  headMult: 1.5, // damage multiplier on the lowered head
  phase2: 0.5,
  roar: 1.2,
  body: 120, // half-width of the body hit box
  bite: { wind: 0.6, strike: 0.22, down: 1.3, up: 0.5, dmg: 18, min: 110, max: 320, dy: 50 },
  claw: { wind: 0.5, swipe: 0.2, rec: 0.55, dmg: 14, min: 20, max: 240, dy: 60 },
  // fire2: in the second phase the beam burns this much longer (and widens more slowly)
  // wind: the heart charges for this long, white sparks flying out of it
  laser: { wind: 1.3, fire: 1.1, fire2: 1.5, rec: 0.5, dmg: 22, band: 40, dy: 110, cd: 5 },
  // the leap back before a beam: to the far side of the arena from a player this near
  retreat: { crouch: 0.3, air: 0.75, rec: 0, h: 190, cd: 11, near: 280, first: 6 },
  // the hovering triple beam (phase two): rise, charge, fire, hang on, drop straight down.
  // The arena's depth is split into five lines, from GT + edge to GB - edge; the three beams lie
  // along three of them, each band deep each way, the other two are safe. Which three is the
  // attack's way (`ways`): every other line (safe between them), the bottom three (the top two
  // safe) or the top three (the bottom two safe). Firing, the three beams sweep together from
  // under the dragon across the arena in `sweep` seconds (the 1.25 s they used to take, 30%
  // slower, so that there is time to react), its head turning with them; where they pass the
  // ground burns for `trail` seconds.
  sky: {
    rise: 0.9,
    charge: 1.0,
    sweep: 1.25 / 0.7,
    fire: 1.25 / 0.7, // = sweep
    ways: { alt: [0, 2, 4], low: [2, 3, 4], high: [0, 1, 2] },
    trail: 1.4,
    hit: 30, // how close (along the line) the beam's spot must pass to hurt
    rec: 0.3,
    fall: 0.7,
    h: 130,
    band: 20,
    altBand: 17, // narrower beams in the every-other-line way, the safe lines between wider
    edge: 15,
    dmg: 20,
    cd: 13,
    first: 3,
  },
  // three plasma balls spat one after another in arcs at a player far away; each one blows up
  // where it lands (rx, ry: the blast)
  plasma: {
    wind: 0.7,
    gap: 0.16,
    rec: 0.6,
    n: 3,
    flight: 1.05,
    g: 900,
    dmg: 16,
    rx: 72,
    ry: 34,
    min: 330,
    cd: 6,
    spread: 105,
  },
  // a kick of the near hind leg at a player close behind it; rare (cd) and not every time
  kick: {
    wind: 0.45,
    strike: 0.18,
    rec: 0.5,
    dmg: 15,
    min: 30,
    max: 250,
    dy: 55,
    cd: 7,
    odds: 0.5,
  },
  leap: { crouch: 0.6, air: 0.9, rec: 0.8, dmg: 20, rx: 190, ry: 70, h: 230, cd: 4 },
  // the shockwave of the leap: a ring on the ground that runs across the arena
  shock: { speed: 460, band: 22, depth: 0.32, clear: 34, dmg: 14 },
  rage: 1.3, // in the second phase it moves and attacks this much faster
  // ...but only half of that bonus when the second phase starts, growing to all of it over
  // this many seconds
  rageRamp: 20,
  laserGrow: 2.4, // and its laser starts as wide as ever but widens to this much while it fires
  push: { light: 70, heavy: 170 }, // knockback speed from the player's hits
  death: { roar: 0.9, fall: 0.7 }, // a last roar, then it collapses and breaks apart
  pounce: {
    crouch: 0.35,
    air: 0.6,
    rec: 0.45,
    dmg: 12,
    rx: 90,
    ry: 40,
    h: 150,
    cd: 3,
    min: 330,
    gap: 150,
  },
  stagger: 0.6, // how long an interrupt stuns it
  armor: 4, // seconds without interrupts after one
  cd: [0.5, 1.1],
  cd2: [0.25, 0.7],
};
const OL = '#17151d';

// ---- geometry shared by the AI and the drawing (local space: facing +x, ground at y = 0) ----
const HEAD_REST = [165, -215];
/** Where the head is (local x, local y) and how wide the jaw is open. */
export function dragonHead(e) {
  const C = DRAGON.bite,
    br = Math.sin(e.anim * 2) * 4;
  let [x, y] = HEAD_REST,
    jaw = 0.1 + 0.05 * Math.sin(e.anim * 3),
    rot = 0;
  y += br;
  if (e.state === 'bite') {
    const t = e.t,
      reach = e.biteX || 220;
    if (t < C.wind) {
      const p = ease(t / C.wind);
      x = lerp(x, 120, p);
      y = lerp(y, -255, p);
      jaw = 0.1 + 0.5 * p;
    } else if (t < C.wind + C.strike) {
      const p = ease((t - C.wind) / C.strike);
      x = lerp(120, reach, p);
      y = lerp(-255, -28, p);
      jaw = 0.6 - 0.55 * p;
    } else if (t < C.wind + C.strike + C.down) {
      x = reach;
      y = -28 + Math.sin(e.t * 6) * 2;
      jaw = 0.05 + 0.08 * Math.abs(Math.sin(e.t * 5));
    } else {
      const p = ease(Math.min(1, (t - C.wind - C.strike - C.down) / C.up));
      x = lerp(reach, HEAD_REST[0], p);
      y = lerp(-28, HEAD_REST[1], p);
    }
  } else if (e.state === 'dying') {
    // a last roar to the sky, then the head drops to the ground
    const D = DRAGON.death,
      p = ease(clamp((e.t - D.roar) / D.fall, 0, 1));
    x = lerp(150, 175, p);
    y = lerp(-250, -109, p);
    jaw = lerp(0.8, 0.35, p);
  } else if (e.state === 'roar' || (e.state === 'intro' && e.z <= 0)) {
    x = 150;
    y = -245;
    jaw = 0.75;
  } else if (e.state === 'stagger') {
    x = 130;
    y = -250 + Math.sin(e.t * 30) * 4;
    jaw = 0.6;
  } else if (e.state === 'laser') {
    y = -235;
    x = 150;
    jaw = 0.35;
  } else if (e.state === 'sky' && e.aim) {
    // hovering: the head turned down at where its beams are going, even back under itself
    // (then the neck bends back over the shoulder)
    rot = clamp(Math.atan2(e.aim[1] + 205, e.aim[0] - 165), -0.3, Math.PI - 0.2);
    const back = clamp((rot - Math.PI / 2) / (Math.PI / 2), 0, 1);
    x = 165 - 95 * back;
    y = -205 - 35 * back;
    jaw = 0.5;
  } else if (e.state === 'plasma') {
    // head thrown back while the plasma gathers, then a jerk forward with every ball
    const Q = DRAGON.plasma,
      p = ease(Math.min(1, e.t / Q.wind)),
      s = e.t - Q.wind,
      kick = s > 0 && s < Q.n * Q.gap ? Math.sin(((s % Q.gap) / Q.gap) * Math.PI) : 0;
    x = lerp(HEAD_REST[0], 135, p) + 22 * kick;
    y = lerp(HEAD_REST[1] + br, -262, p) + 14 * kick;
    jaw = 0.15 + 0.5 * p + 0.2 * kick;
  }
  return { x, y, jaw, rot };
}
const isHeadDown = (e) => {
  const C = DRAGON.bite;
  return e.state === 'bite' && e.t > C.wind + C.strike * 0.6 && e.t < C.wind + C.strike + C.down;
};
/**
 * Which part of the dragon a hit covering world x0..x1 at depth y lands on:
 * 'head' (the lowered head, 1.5x damage), 'body' or null.
 */
export function dragonZone(e, x0, x1, y, dy = 30) {
  const lo = Math.min(x0, x1),
    hi = Math.max(x0, x1);
  if (isHeadDown(e)) {
    const hx = e.x + e.face * dragonHead(e).x;
    if (hi > hx - 55 && lo < hx + 55 && Math.abs(y - e.y) < dy + 30) return 'head';
  }
  if (e.z > 120) return null;
  if (hi > e.x - DRAGON.body && lo < e.x + DRAGON.body && Math.abs(y - e.y) < dy + 40)
    return 'body';
  return null;
}
/** World position (x, screen y) of the head, for sparks. */
export function headPoint(e) {
  const h = dragonHead(e);
  return [e.x + e.face * h.x, e.y - e.z + h.y];
}

// ---- AI ----
const pdown = () => ['ko', 'down', 'getup', 'dead', 'win'].includes(P.state);
function choose(e) {
  const f = (P.x - e.x) * e.face,
    ady = Math.abs(P.y - e.y),
    C = DRAGON,
    can = [];
  if (f >= C.claw.min && f <= C.claw.max && ady < C.claw.dy) can.push('claw');
  if (f >= C.bite.min && f <= C.bite.max && ady < C.bite.dy) can.push('bite');
  if (f > 90 && ady < C.laser.dy && e.laserCd <= 0) can.push('laser');
  if (e.phase2 && e.leapCd <= 0 && (f > 260 || f < -40 || ady > 70)) can.push('leap');
  if (e.laserCd <= 0 && e.retreatCd <= 0 && Math.abs(P.x - e.x) < C.retreat.near)
    can.push('retreat');
  if (e.phase2 && e.skyCd <= 0) can.push('sky');
  if (e.pounceCd <= 0 && Math.abs(f) > C.pounce.min && ady < 120) can.push('pounce');
  if ((e.plasmaCd ?? 0) <= 0 && f > C.plasma.min) can.push('plasma');
  const fresh = can.filter((a) => a !== e.last);
  const pick = (fresh.length ? fresh : can)[Math.floor(random() * (fresh.length || can.length))];
  return pick || null;
}
function start(e, a) {
  e.state = a;
  e.t = 0;
  e.hitDone = false;
  e.last = a;
  if (a === 'bite') e.biteX = clamp((P.x - e.x) * e.face, 160, 290);
  if (a === 'laser') {
    e.laserY = e.y;
    e.laserCd = DRAGON.laser.cd;
    SFX.dragonCharge();
  }
  if (a === 'leap') e.leapCd = DRAGON.leap.cd;
  if (a === 'retreat') e.retreatCd = DRAGON.retreat.cd;
  if (a === 'sky') {
    e.skyCd = DRAGON.sky.cd;
    const ways = Object.keys(DRAGON.sky.ways);
    e.skyWay = ways[Math.floor(random() * ways.length)];
    e.skyX0 = e.x;
    e.skyY0 = e.y;
    // it hovers over the side of the arena it is nearer to
    e.skyX = e.x < G.cam + W / 2 ? G.cam + 190 : G.cam + W - 190;
    e.skyY = (GT + GB) / 2;
  }
  if (a === 'pounce') e.pounceCd = DRAGON.pounce.cd;
  if (a === 'plasma') {
    e.plasmaCd = DRAGON.plasma.cd;
    e.spat = 0;
    SFX.plasmaWind();
  } else if (a === 'sky') growl(0.6, 120, 70, 0.18);
  else if (a !== 'laser') SFX.dragonWind();
}
function finish(e) {
  e.state = 'walk';
  e.t = 0;
  const [a, b] = e.phase2 ? DRAGON.cd2 : DRAGON.cd;
  e.cd = rnd(a, b);
}
// A jump: crouch, fly in an arc, land with a quake that hurts whoever is under it. The leap
// lands on the player; the pounce lands a short way in front of the player to close the gap.
function jump(e, J) {
  if (e.t < J.crouch) {
    e.z = 0;
    return;
  }
  if (!e.air) {
    e.air = true;
    e.lx0 = e.x;
    e.ly0 = e.y;
    const dir = P.x >= e.x ? 1 : -1,
      // the retreat: to the far side of the arena from the player
      away = P.x > G.cam + W / 2 ? G.cam + 170 : G.cam + W - 170,
      tx = J === DRAGON.pounce ? P.x - dir * J.gap : J === DRAGON.retreat ? away : P.x;
    e.lx = clamp(tx, G.cam + 160, G.cam + W - 160);
    e.ly = clamp(P.y, GT + 20, GB - 10);
    e.face = J === DRAGON.retreat ? (e.lx > e.x ? 1 : -1) : dir;
    SFX.jump();
    growl(0.5, 130, 80, 0.16);
  }
  const u = Math.min(1, (e.t - J.crouch) / J.air);
  if (u < 1) {
    e.x = lerp(e.lx0, e.lx, u);
    e.y = lerp(e.ly0, e.ly, u);
    e.z = 4 * J.h * u * (1 - u);
    return;
  }
  e.z = 0;
  if (J === DRAGON.retreat) {
    // down on the far side: face the player and charge the beam straight away
    G.shake = Math.max(G.shake, 8);
    SFX.thud();
    dust(e.x, e.y, 10);
    e.air = e.landed = false;
    e.face = P.x >= e.x ? 1 : -1;
    start(e, 'laser');
    return;
  }
  if (!e.landed) land(e, J);
  if (e.t > J.crouch + J.air + J.rec) {
    e.air = e.landed = false;
    finish(e);
  }
}
/** Down from a leap (or a pounce, or the drop after the sky beams): a quake that hurts whoever
 *  is under it; the leap and the drop also send a shockwave across the arena. */
function land(e, J) {
  e.landed = true;
  G.shake = J === DRAGON.leap ? 18 : 11;
  SFX.heavy();
  SFX.thud();
  dust(e.x, e.y, J === DRAGON.leap ? 18 : 10);
  G.parts.push({ k: 'gring', x: e.x, y: e.y, t: 0, life: 0.5, s: J.rx * 1.2, col: '#e6dfc8' });
  const ex = (P.x - e.x) / J.rx,
    ey = (P.y - e.y) / J.ry;
  if (ex * ex + ey * ey < 1 && P.z < 40) hitPlayer(J.dmg, P.x >= e.x ? 1 : -1, true);
  if (J === DRAGON.leap) {
    // the second-phase leap also sends a shockwave across the whole arena: jump over it
    G.shocks.push({ x: e.x, y: e.y, r: J.rx, hit: false });
    SFX.quake();
  }
}
/** World point of the mouth: x, depth y, height above the ground. */
function mouth(e) {
  const h = dragonHead(e);
  return [e.x + e.face * (h.x + 38), e.y, e.z - h.y - 6];
}
// One plasma ball, lobbed so it comes down after `flight` seconds: the first at the player,
// the others to either side, so standing still is not enough.
function spitPlasma(e, i) {
  const Q = DRAGON.plasma,
    [x0, y0, z0] = mouth(e),
    off = [0, -1, 1][i % 3] * Q.spread,
    tx = clamp(P.x + off, G.cam + 30, G.cam + W - 30),
    ty = clamp(P.y + (i ? rnd(-40, 40) : 0), GT + 6, GB - 4),
    f = Q.flight;
  G.projs.push({
    k: 'plasma',
    x: x0,
    y: y0,
    z: z0,
    vx: (tx - x0) / f,
    vy: (ty - y0) / f,
    vz: (Q.g * f) / 2 - z0 / f,
    rot: 0,
    life: 4,
  });
  SFX.plasma();
}
/** A plasma ball hits the ground: a blast that hurts the player inside it. */
export function plasmaBlast(q) {
  const Q = DRAGON.plasma;
  G.shake = Math.max(G.shake, 7);
  SFX.blast();
  G.parts.push({ k: 'blast', x: q.x, y: q.y, t: 0, life: 0.5, s: Q.rx * 1.1 });
  G.parts.push({ k: 'gring', x: q.x, y: q.y, t: 0, life: 0.35, s: Q.rx, col: '#e7c8ff' });
  for (let i = 0; i < 22; i++) {
    const a = fxRnd(0, TAU),
      v = fxRnd(100, 320);
    G.parts.push({
      k: 'glow',
      x: q.x,
      y: q.y - 10,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v * 0.6 - 90,
      g: 300,
      t: 0,
      life: fxRnd(0.3, 0.55),
      s: fxRnd(3, 7),
      col: i % 3 ? '#d7a8ff' : '#ffffff',
    });
  }
  dust(q.x, q.y, 4);
  const ex = (P.x - q.x) / Q.rx,
    ey = (P.y - q.y) / Q.ry;
  if (ex * ex + ey * ey < 1 && P.z < 60) hitPlayer(Q.dmg, P.x >= q.x ? 1 : -1, true);
}
/**
 * A hit landed on the dragon. A heavy one during the wind-up of the bite, the claw or the
 * pounce staggers it, unless it is still shrugging off the last interrupt.
 */
export function dragonInterrupt(e, knock, src) {
  const C = DRAGON,
    heavy = knock || src === 'hado' || src === 'super',
    winding =
      (e.state === 'bite' && e.t < C.bite.wind) ||
      (e.state === 'claw' && e.t < C.claw.wind) ||
      (e.state === 'kick' && e.t < C.kick.wind) ||
      (e.state === 'plasma' && e.t < C.plasma.wind) ||
      (e.state === 'pounce' && e.t < C.pounce.crouch);
  if (!heavy || !winding || e.armor > 0) return false;
  Object.assign(e, { state: 'stagger', t: 0, armor: C.armor, swung: false, thud: false });
  e.air = e.landed = false;
  SFX.dragonHurt();
  return true;
}
/** How much faster it is now: in the second phase half the bonus at first, all of it after
 *  rageRamp seconds (a dragon put straight into the second phase has all of it). */
export function rageMult(e) {
  if (!e.phase2) return 1;
  const u = Math.min(1, (e.p2T ?? DRAGON.rageRamp) / DRAGON.rageRamp);
  return 1 + (DRAGON.rage - 1) * (0.5 + 0.5 * u);
}
export function updDragon(e, dt) {
  if (e.phase2 && e.p2T !== undefined) e.p2T += dt;
  // the player's hits push it back a little
  if (e.kbv && !e.air && e.state !== 'dying') {
    e.x += e.kbv * dt;
    e.kbv *= Math.pow(0.002, dt);
    if (Math.abs(e.kbv) < 5) e.kbv = 0;
  }
  // in the second phase everything it does runs faster
  step(e, e.phase2 && e.state !== 'dying' ? dt * rageMult(e) : dt);
}
/** Its health is gone: a last roar, then it collapses (see the 'dying' state). */
export function dragonDie(e) {
  Object.assign(e, { state: 'dying', t: 0, hp: 0, kbv: 0, broken: false });
  e.air = e.landed = false;
  SFX.dragonRoar();
}
// It hits the ground and comes apart: skull, ribcage, wings, tail and legs, each its own piece.
function breakApart(e) {
  const f = e.face,
    T = e.T,
    piece = (part, dx, z, vx, vz, vr, extra = {}) =>
      G.debris.push({
        k: 'dpart',
        part,
        x: e.x + f * dx,
        gy: e.y + fxRnd(-6, 6),
        z,
        vx,
        vz,
        rot: 0,
        vr,
        face: f,
        col: T.col,
        dk: T.dk,
        life: 14,
        ...extra,
      });
  piece('skull', 175, 16, f * fxRnd(70, 130), 150, f * fxRnd(0.2, 0.4));
  piece('ribs', 0, 10, fxRnd(-20, 20), 110, fxRnd(-0.3, 0.3));
  piece('wing', -10, 70, -f * fxRnd(60, 110), 160, -f * 0.6);
  piece('wing', 20, 90, -f * fxRnd(10, 50), 210, f * 0.4, { back: 1 });
  piece('tail', -170, 8, -f * fxRnd(30, 60), 90, -f * 0.25);
  for (const dx of [-90, -60, 80, 110])
    piece('leg', dx, 30, fxRnd(-110, 110), fxRnd(160, 260), fxRnd(-5, 5));
  for (let i = 0; i < 8; i++)
    G.debris.push({
      k: 'bone',
      x: e.x + fxRnd(-120, 120),
      gy: e.y + fxRnd(-10, 10),
      z: fxRnd(10, 60),
      vx: fxRnd(-160, 160),
      vz: fxRnd(150, 300),
      rot: fxRnd(0, TAU),
      vr: fxRnd(-10, 10),
      len: fxRnd(16, 26),
      col: T.col,
      life: 12,
    });
  e.dead = true;
  G.shake = 22;
  SFX.quake();
  SFX.heavy();
  SFX.shatter();
  dust(e.x, e.y, 24);
  G.parts.push({ k: 'gring', x: e.x, y: e.y, t: 0, life: 0.6, s: 320, col: '#e6dfc8' });
}
/** One piece of the fallen dragon, lying where it came to rest. */
export function drawDragonPart(d) {
  const col = d.col,
    dk = d.dk;
  ctx.translate(d.x - G.cam, d.gy - d.z);
  ctx.rotate(d.rot);
  ctx.scale(d.face, 1);
  switch (d.part) {
    case 'skull':
      skull({ x: -20, y: -16, jaw: 0.45 }, col, dk, '#30402c', false);
      break;
    case 'ribs':
      for (let i = 0; i < 7; i++) {
        const x = -56 + i * 18;
        bone(
          [
            [x, -50],
            [x + 10, -26],
            [x + 6, -4],
          ],
          4.5,
          i % 2 ? col : dk,
        );
      }
      bone(
        [
          [-70, -48],
          [60, -52],
        ],
        10,
        col,
      );
      // the bone heart, cracked and gone dark
      ctx.fillStyle = '#4a3d5c';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(25, -14);
      ctx.bezierCurveTo(5, -28, 11, -44, 25, -36);
      ctx.bezierCurveTo(39, -44, 45, -28, 25, -14);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, -38);
      ctx.lineTo(27, -28);
      ctx.lineTo(22, -18);
      ctx.stroke();
      break;
    case 'wing':
      // lying on the ground: flattened
      ctx.scale(0.9, 0.5);
      drawWing([60, 0], -0.4, d.back ? dk : col, 'rgba(48,32,70,.55)', !!d.back);
      break;
    case 'tail': {
      const pts = [];
      for (let i = 0; i <= 9; i++) pts.push([-i * 19, -8 - Math.sin(i * 0.7) * 6]);
      bone(pts, 9, col);
      pts.forEach(([x, y], i) => knob(x, y, 7 - i * 0.55, col));
      break;
    }
    case 'leg':
      bone(
        [
          [-24, -40],
          [4, -22],
          [16, -4],
        ],
        11,
        col,
      );
      knob(4, -22, 6, col);
      claws(20, -2, col);
      break;
  }
}
/** A hit pushes the dragon back; a heavy hit further. */
export function dragonPush(e, dir, heavy) {
  if (e.state === 'intro' || e.state === 'dying' || e.state === 'sky' || e.air) return;
  e.kbv = (e.kbv || 0) + dir * (heavy ? DRAGON.push.heavy : DRAGON.push.light);
}
// Wings beat slowly at rest and hard when it roars, jumps or dies.
const wingsWide = (e) =>
  ['roar', 'leap', 'pounce', 'retreat', 'sky', 'intro', 'dying'].includes(e.state) || e.air;
function step(e, dt) {
  const C = DRAGON;
  e.t += dt;
  e.wingP = (e.wingP || 0) + dt * (wingsWide(e) ? 9 : 3.2);
  e.anim += dt;
  e.flash -= dt;
  e.cd -= dt;
  e.laserCd -= dt;
  e.leapCd -= dt;
  e.retreatCd = (e.retreatCd ?? DRAGON.retreat.first) - dt;
  e.skyCd = (e.skyCd ?? Infinity) - dt;
  e.pounceCd = (e.pounceCd ?? 0) - dt;
  e.kickCd = (e.kickCd ?? 0) - dt;
  e.plasmaCd = (e.plasmaCd ?? 0) - dt;
  e.armor = (e.armor ?? 0) - dt;
  // the burning trails the sky beams leave on the ground fade away
  e.trail = (e.trail ?? []).filter((p) => (p.t += dt) < DRAGON.sky.trail);
  e.moving = false;
  const f = (P.x - e.x) * e.face;
  // acid dripping from the jaws
  if (fxRandom() < dt * 9) {
    const [hx, hy] = headPoint(e);
    G.parts.push({
      k: 'dot',
      x: hx + e.face * fxRnd(30, 52),
      y: hy + 14,
      vx: fxRnd(-10, 10),
      vy: fxRnd(10, 40),
      g: 600,
      t: 0,
      life: fxRnd(0.35, 0.6),
      s: fxRnd(2.5, 4.5),
      col: fxRandom() < 0.5 ? '#9dff4a' : '#5fd12a',
    });
  }
  switch (e.state) {
    case 'intro':
      // drops in from above the crypt, lands with a quake, then roars
      e.z = Math.max(0, 420 * (1 - e.t / 1.2));
      if (e.z <= 0 && !e.hitDone) {
        e.hitDone = true;
        G.shake = 18;
        SFX.heavy();
        SFX.thud();
        SFX.dragonRoar();
        dust(e.x, e.y, 16);
        G.parts.push({ k: 'gring', x: e.x, y: e.y, t: 0, life: 0.5, s: 260, col: '#e6dfc8' });
      }
      if (e.t > 2.2) finish(e);
      break;
    case 'roar':
      if (fxRandom() < 0.5) dust(e.x + fxRnd(-120, 120), e.y, 1);
      G.shake = Math.max(G.shake, 4);
      if (e.t > C.roar) finish(e);
      break;
    case 'walk': {
      if (!e.phase2 && e.hp < e.T.hp * C.phase2) {
        e.phase2 = true;
        e.state = 'roar';
        e.t = 0;
        e.leapCd = 1.5;
        e.skyCd = C.sky.first;
        e.p2T = 0; // the speed bonus starts at half
        G.flash = 0.3;
        SFX.dragonRoar();
        break;
      }
      // turn around when the player stays behind
      if (f < -40) e.behind = (e.behind || 0) + dt;
      else e.behind = 0;
      if (e.behind > 0.7 && !(e.phase2 && e.leapCd <= 0)) {
        const K = C.kick;
        e.behind = 0;
        if (
          (e.kickCd ?? 0) <= 0 &&
          -f >= K.min &&
          -f <= K.max &&
          Math.abs(P.y - e.y) < K.dy &&
          !pdown() &&
          random() < K.odds
        ) {
          // a kick back at the player instead of turning round
          e.kickCd = K.cd;
          start(e, 'kick');
          break;
        }
        e.face = -e.face;
        e.behind = 0;
        e.cd = Math.max(e.cd, 0.35);
        break;
      }
      if (e.cd <= 0 && !pdown() && G.state === 'play') {
        const a = choose(e);
        if (a) {
          start(e, a);
          break;
        }
      }
      // close in slowly: keep the player a claw's length in front
      const tx = P.x - e.face * 170,
        ty = P.y,
        ax = tx - e.x,
        ay = ty - e.y;
      if (Math.abs(ax) > 8 || Math.abs(ay) > 6) {
        e.x += Math.sign(ax) * Math.min(Math.abs(ax), e.T.speed * dt);
        e.y += Math.sign(ay) * Math.min(Math.abs(ay), e.T.speed * 0.6 * dt);
        e.moving = true;
        e.walkT += dt * 7.5; // brisk steps
      }
      break;
    }
    case 'bite': {
      const B = C.bite;
      if (!e.hitDone && e.t > B.wind && e.t < B.wind + B.strike + 0.05) {
        const hx = e.x + e.face * dragonHead(e).x;
        if (Math.abs(P.x - hx) < 60 && Math.abs(P.y - e.y) < 45 && P.z < 60) {
          e.hitDone = true;
          hitPlayer(B.dmg, e.face, true);
        }
      }
      if (!e.thud && e.t > B.wind + B.strike) {
        e.thud = true;
        G.shake = Math.max(G.shake, 7);
        SFX.thud();
        dust(e.x + e.face * e.biteX, e.y, 6);
      }
      if (e.t > B.wind + B.strike + B.down + B.up) {
        e.thud = false;
        finish(e);
      }
      break;
    }
    case 'claw': {
      const K = C.claw;
      if (!e.hitDone && e.t > K.wind && e.t < K.wind + K.swipe) {
        if (!e.swung) {
          e.swung = true;
          SFX.swing();
        }
        if (f > 20 && f < 260 && Math.abs(P.y - e.y) < K.dy && P.z < 110) {
          e.hitDone = true;
          hitPlayer(K.dmg, e.face, true);
        }
      }
      if (e.t > K.wind + K.swipe + K.rec) {
        e.swung = false;
        finish(e);
      }
      break;
    }
    case 'plasma': {
      const Q = C.plasma;
      if (e.t > Q.wind + e.spat * Q.gap && e.spat < Q.n) spitPlasma(e, e.spat++);
      if (e.t > Q.wind + Q.n * Q.gap + Q.rec) finish(e);
      break;
    }
    case 'kick': {
      const K = C.kick;
      if (!e.hitDone && e.t > K.wind && e.t < K.wind + K.strike) {
        if (!e.swung) {
          e.swung = true;
          SFX.swing();
        }
        if (-f > 0 && -f < K.max + 20 && Math.abs(P.y - e.y) < K.dy && P.z < 90) {
          e.hitDone = true;
          hitPlayer(K.dmg, -e.face, true);
        }
      }
      if (e.t > K.wind + K.strike + K.rec) {
        e.swung = false;
        finish(e);
      }
      break;
    }
    case 'laser': {
      const L = C.laser,
        fire = laserFire(e),
        hx = e.x + e.face * 25,
        hy = e.laserY - e.z - 108;
      if (e.t < L.wind) heartSparks(hx, hy, dt, e.t / L.wind);
      if (e.t < L.wind && fxRandom() < 0.3 + e.t) {
        // sparks drawn into the heart as it charges
        const a = fxRnd(0, TAU),
          r = fxRnd(70, 130),
          life = fxRnd(0.25, 0.4);
        G.parts.push({
          k: 'glow',
          x: hx + Math.cos(a) * r,
          y: hy + Math.sin(a) * r,
          vx: (-Math.cos(a) * r) / life,
          vy: (-Math.sin(a) * r) / life,
          g: 0,
          t: 0,
          life,
          s: fxRnd(2, 4),
          col: '#f0dcff',
        });
      }
      if (e.t > L.wind && e.t < L.wind + fire && fxRandom() < 0.8) {
        // sparks thrown off the beam
        const x = hx + e.face * fxRnd(40, W);
        G.parts.push({
          k: 'glow',
          x,
          y: hy + fxRnd(-20, 20),
          vx: e.face * fxRnd(100, 300),
          vy: fxRnd(-120, 120),
          g: 0,
          t: 0,
          life: fxRnd(0.15, 0.3),
          s: fxRnd(2, 4),
          col: '#ffffff',
        });
      }
      if (e.t > L.wind && e.t < L.wind + fire) {
        if (!e.fired) {
          e.fired = true;
          SFX.laser();
        }
        G.shake = Math.max(G.shake, 3);
        if (!e.hitDone && f > 0 && Math.abs(P.y - e.laserY) < laserBand(e) && P.z < 160)
          if (hitPlayer(L.dmg, e.face, true)) e.hitDone = true;
      }
      if (e.t > L.wind + fire + L.rec) {
        e.fired = false;
        finish(e);
      }
      break;
    }
    case 'leap':
    case 'pounce':
    case 'retreat':
      jump(e, C[e.state]);
      break;
    case 'sky':
      sky(e, dt);
      break;
    case 'stagger':
      if (e.t > C.stagger) finish(e);
      break;
    case 'dying': {
      const D = C.death;
      e.z = Math.max(0, e.z - 700 * dt);
      if (e.t < D.roar) G.shake = Math.max(G.shake, 5);
      else if (e.t < D.roar + D.fall && fxRandom() < 0.5) dust(e.x + fxRnd(-120, 120), e.y, 1);
      if (e.t > D.roar + D.fall && !e.broken) {
        e.broken = true;
        breakApart(e);
      }
      break;
    }
  }
  if (!['leap', 'pounce', 'retreat', 'sky'].includes(e.state)) {
    e.x = clamp(e.x, G.cam + 150, G.cam + W - 150);
    e.y = clamp(e.y, GT + 20, GB - 10);
  }
}

/** White sparks flying out of the heart while a beam charges (more of them as it fills). */
function heartSparks(hx, hy, dt, u) {
  const n = dt * (25 + 60 * u);
  for (let i = 0; i < n || (i === 0 && fxRandom() < n); i++) {
    const a = fxRnd(0, TAU),
      v = fxRnd(140, 320);
    G.parts.push({
      k: 'glow',
      x: hx + Math.cos(a) * 8,
      y: hy + Math.sin(a) * 8,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 40,
      g: 260,
      t: 0,
      life: fxRnd(0.25, 0.45),
      s: fxRnd(2, 3.5),
      col: '#ffffff',
    });
  }
}
/** A world point on the ground in the dragon's own drawing space (facing +x, its feet at 0). */
const aimLocal = (e, wx, wy) => [(wx - e.x) * e.face, wy - e.y + e.z];
/** The open jaws, in world screen space (x with the camera, y on screen), for the sky beams. */
export function skyMouth(e) {
  const h = dragonHead(e),
    r = h.rot || 0,
    up = r > Math.PI / 2 ? -1 : 1, // the skull is flipped when it looks back
    lx = h.x + Math.cos(r) * 46 - Math.sin(r) * 10 * up,
    ly = h.y + Math.sin(r) * 46 + Math.cos(r) * 10 * up;
  return [e.x + e.face * lx, e.y - e.z + ly];
}
/** The sky beams sweep from the edge of the arena behind the dragon to the far edge: no spot of
 *  the line is spared, not even under it. */
const skyEdges = (e) => (e.face > 0 ? [G.cam - 30, G.cam + W + 30] : [G.cam + W + 30, G.cam - 30]);
/** The five lines across the arena's depth, from its top edge to its bottom edge. */
export const skyRows = () => {
  const S = DRAGON.sky;
  return [0, 1, 2, 3, 4].map((i) => GT + S.edge + ((GB - GT - 2 * S.edge) * i) / 4);
};
/** The depths of the three sky beams, for the attack's way (every other line by default). */
export const skyLines = (way = 'alt') => DRAGON.sky.ways[way].map((i) => skyRows()[i]);
/** How deep each sky beam reaches either way: narrower when they lie on every other line. */
export const skyBand = (e) => (e.skyWay === 'alt' ? DRAGON.sky.altBand : DRAGON.sky.band);
/** How long the sky beams fire: one sweep. */
export const skyFire = () => DRAGON.sky.sweep;
/** Where the sky attack is: 'rise', 'charge', 'fire', 'rec' or 'fall', and how far into it. */
export function skyPhase(e) {
  const S = DRAGON.sky;
  let t = e.t;
  for (const k of ['rise', 'charge', 'fire', 'rec', 'fall']) {
    const T = k === 'fire' ? skyFire(e) : S[k];
    if (t < T) return [k, t / T];
    t -= T;
  }
  return ['done', 1];
}
/** The three beams `tf` seconds into the fire, side by side: where they have got to. */
export function skyBeams(e, tf) {
  const [x0, x1] = skyEdges(e),
    x = lerp(x0, x1, clamp(tf / DRAGON.sky.sweep, 0, 1));
  return skyLines(e.skyWay ?? 'alt').map((y) => ({ x, y }));
}
// The hovering triple beam: up over the side of the arena, three beams across it from edge to
// edge, then straight down with the leap's quake and shockwave.
function sky(e, dt) {
  const S = DRAGON.sky,
    [ph, u] = skyPhase(e);
  if (ph === 'rise') {
    const p = ease(u);
    e.x = lerp(e.skyX0, e.skyX, p);
    e.y = lerp(e.skyY0, e.skyY, p);
    e.z = S.h * p;
    e.face = e.x < G.cam + W / 2 ? 1 : -1;
  } else if (ph === 'charge') {
    e.z = S.h + Math.sin(e.anim * 3) * 6;
    // the jaws gather the light, turned at where the first beam will start
    e.aim = aimLocal(e, skyEdges(e)[0], skyLines(e.skyWay ?? 'alt')[1]);
    const [mx, my] = skyMouth(e);
    heartSparks(mx, my, dt, u);
    if (!e.charged) {
      e.charged = true;
      SFX.dragonCharge();
    }
  } else if (ph === 'fire') {
    e.z = S.h;
    // the spots where the three beams meet the ground run together from under it across the
    // arena; the head follows the middle one
    const beams = skyBeams(e, u * skyFire(e));
    if (!e.beams) SFX.laser();
    e.beams = beams;
    e.aim = aimLocal(e, beams[1].x, beams[1].y);
    for (const b of beams) e.trail.push({ x: b.x, y: b.y, t: 0 });
    G.shake = Math.max(G.shake, 4);
    if (!e.hitDone && P.z < 160)
      if (beams.some((b) => Math.abs(P.x - b.x) < S.hit && Math.abs(P.y - b.y) < skyBand(e)))
        if (hitPlayer(S.dmg, e.face, true)) e.hitDone = true;
    if (fxRandom() < 0.95) {
      const b = beams[Math.floor(fxRandom() * beams.length)];
      G.parts.push({
        k: 'glow',
        x: b.x + fxRnd(-10, 10),
        y: b.y - fxRnd(0, 20),
        vx: fxRnd(-160, 160),
        vy: fxRnd(-220, -60),
        g: 500,
        t: 0,
        life: fxRnd(0.2, 0.4),
        s: fxRnd(2, 4),
        col: '#ffffff',
      });
    }
  } else if (ph === 'rec') {
    e.z = S.h;
    e.beams = null;
    e.aim = null;
    if (!e.dropSet) {
      // it comes straight down where it hovers
      e.dropSet = true;
      e.lx0 = e.lx = e.x;
      e.ly0 = e.ly = e.y;
    }
  } else if (ph === 'fall') {
    const p = u * u;
    e.x = lerp(e.lx0, e.lx, ease(u));
    e.y = lerp(e.ly0, e.ly, ease(u));
    e.z = S.h * (1 - p);
  } else {
    e.z = 0;
    if (!e.landed) land(e, DRAGON.leap);
    if (e.t > S.rise + S.charge + skyFire(e) + S.rec + S.fall + DRAGON.leap.rec) {
      e.landed = e.fired = e.charged = e.dropSet = false;
      e.aim = null;
      finish(e);
    }
  }
}

// ---- drawing ----
function bone(pts, w, col) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [lw, c] of [
    [w + 4, OL],
    [w, col],
  ]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
}
function knob(x, y, r, col) {
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.arc(x, y, r + 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}
const qpt = (a, c, b, u) => [
  (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0],
  (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1],
];
function claws(x, y, col, dir = 1) {
  for (let i = 0; i < 3; i++) {
    const cx = x + dir * (i * 7 - 4);
    ctx.fillStyle = OL;
    ctx.beginPath();
    ctx.moveTo(cx - 3, y - 6);
    ctx.lineTo(cx + dir * 12, y + 1);
    ctx.lineTo(cx + 3, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx - 1.5, y - 5);
    ctx.lineTo(cx + dir * 9, y);
    ctx.lineTo(cx + 1.5, y - 2.5);
    ctx.closePath();
    ctx.fill();
  }
}
function leg(hip, knee, foot, w, col) {
  bone([hip, knee, foot], w, col);
  knob(knee[0], knee[1], w * 0.55, col);
  claws(foot[0] + 4, foot[1], col);
}
function wing(root, flap, col, mem, back) {
  // a skeletal wing: an arm bone, three long fingers, a torn membrane between them; the whole
  // wing swings around the shoulder as it beats
  ctx.save();
  ctx.translate(root[0], root[1]);
  ctx.rotate(-flap * 0.32);
  ctx.translate(-root[0], -root[1]);
  drawWing(root, flap, col, mem, back);
  ctx.restore();
}
function drawWing(root, flap, col, mem, back) {
  const a = flap,
    elbow = [root[0] - 40, root[1] - 70 - a * 14],
    hand = [root[0] - 70, root[1] - 120 - a * 22],
    tips = [
      [root[0] - 210, root[1] - 70 - a * 10],
      [root[0] - 200, root[1] - 10 + a * 6],
      [root[0] - 140, root[1] + 20 + a * 10],
    ];
  ctx.fillStyle = mem;
  ctx.beginPath();
  ctx.moveTo(root[0], root[1]);
  ctx.lineTo(elbow[0], elbow[1]);
  ctx.lineTo(hand[0], hand[1]);
  tips.forEach((t, i) => {
    ctx.lineTo(t[0], t[1]);
    const n = tips[i + 1] || [root[0] - 30, root[1] + 10];
    // ragged edge between fingers
    ctx.lineTo((t[0] + n[0]) / 2 + 12, (t[1] + n[1]) / 2 - 6 + (i % 2 ? 10 : -4));
  });
  ctx.lineTo(root[0] - 30, root[1] + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(23,21,29,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  bone([root, elbow, hand], back ? 7 : 8, col);
  for (const t of tips) bone([hand, t], back ? 4 : 5, col);
  knob(elbow[0], elbow[1], 5, col);
  knob(hand[0], hand[1], 5, col);
  ctx.fillStyle = col;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hand[0] - 2, hand[1] - 4);
  ctx.lineTo(hand[0] + 8, hand[1] - 22);
  ctx.lineTo(hand[0] + 6, hand[1] - 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
function skull(h, col, dk, eye, fl) {
  const { x, y, jaw, rot } = h;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (rot > Math.PI / 2) ctx.scale(1, -1); // turned back over the shoulder: crown still up
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.6;
  // horns sweeping back
  ctx.fillStyle = fl ? '#fff' : '#cfc6aa';
  for (const [ox, oy, s] of [
    [-6, -14, 1],
    [6, -18, 0.8],
  ]) {
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.quadraticCurveTo(ox - 40 * s, oy - 30 * s, ox - 70 * s, oy - 14 * s);
    ctx.quadraticCurveTo(ox - 38 * s, oy - 16 * s, ox + 6, oy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // lower jaw, hinged at the back of the skull
  ctx.save();
  ctx.translate(-8, 8);
  ctx.rotate(jaw);
  ctx.fillStyle = dk;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(62, 2);
  ctx.lineTo(60, 10);
  ctx.lineTo(4, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f6f1df';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(14 + i * 9, -1);
    ctx.lineTo(18 + i * 9, -9);
    ctx.lineTo(22 + i * 9, 0);
    ctx.fill();
  }
  // acid hanging from the jaw
  ctx.fillStyle = '#7de03a';
  ctx.beginPath();
  ctx.ellipse(52, 13 + Math.sin(G.time * 6) * 2, 3, 5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // cranium and long snout
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-22, 4);
  ctx.quadraticCurveTo(-24, -24, 0, -26);
  ctx.quadraticCurveTo(22, -26, 34, -14);
  ctx.lineTo(70, -6);
  ctx.quadraticCurveTo(78, -2, 72, 6);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // upper teeth
  ctx.fillStyle = '#f6f1df';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(14 + i * 9.5, 8);
    ctx.lineTo(18 + i * 9.5, 17);
    ctx.lineTo(22 + i * 9.5, 7);
    ctx.fill();
    ctx.stroke();
  }
  // brow ridge, eye socket with a green lich-fire, nostril
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.ellipse(10, -10, 10, 7, -0.25, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(62, -4, 4, 2.4, -0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = eye;
  ctx.shadowColor = eye;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(12, -10, 4.2, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(23,21,29,.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -22);
  ctx.quadraticCurveTo(14, -24, 26, -16);
  ctx.moveTo(30, -10);
  ctx.lineTo(44, -8);
  ctx.stroke();
  ctx.restore();
}
/**
 * Shockwaves spread from where the leap landed. The ring is an ellipse on the ground; when its
 * edge passes under the player, she must be in the air (a jump) or she is knocked down.
 */
export function updShocks(dt) {
  const S = DRAGON.shock;
  for (const w of G.shocks) {
    w.r += S.speed * dt;
    if (fxRandom() < 0.9) {
      const a = fxRnd(0, TAU);
      dust(w.x + Math.cos(a) * w.r, w.y + Math.sin(a) * w.r * S.depth, 1);
    }
    const d = Math.hypot(P.x - w.x, (P.y - w.y) / S.depth);
    if (!w.hit && Math.abs(d - w.r) < S.band) {
      if (P.z > S.clear) continue;
      if (hitPlayer(S.dmg, P.x >= w.x ? 1 : -1, true)) w.hit = true;
    }
  }
  G.shocks = G.shocks.filter((w) => w.r < W * 1.4);
}
export function drawShocks() {
  const S = DRAGON.shock;
  for (const w of G.shocks) {
    const x = w.x - G.cam,
      a = Math.max(0, 1 - w.r / (W * 1.4));
    ctx.save();
    // the wave runs along the ground only: keep it on the floor, not up the wall and sky
    ctx.beginPath();
    ctx.rect(0, GT - 8, W, GB - GT + 40);
    ctx.clip();
    ctx.translate(x, w.y);
    ctx.scale(1, S.depth); // draw in ground-plane units, then flatten
    ctx.globalCompositeOperation = 'lighter';
    // a band of churned light behind the front, then the bright crest
    const inner = Math.max(0, w.r - S.band * 3),
      g = ctx.createRadialGradient(0, 0, inner, 0, 0, w.r + S.band);
    g.addColorStop(0, 'rgba(176,92,255,0)');
    g.addColorStop(0.75, `rgba(176,92,255,${0.35 * a})`);
    g.addColorStop(0.92, `rgba(240,225,255,${0.75 * a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w.r + S.band, 0, TAU);
    ctx.arc(0, 0, inner, 0, TAU, true);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * a})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, w.r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}
/** How long the beam burns: half as long again in the second phase. */
export const laserFire = (e) => DRAGON.laser.fire * (e.phase2 ? DRAGON.laser.fire2 : 1);
/**
 * Half-width of the beam. In the second phase it fires as wide as in the first and widens
 * while it burns, ending 2.4 times as wide (a fifth less than the 3 times it used to).
 */
export function laserBand(e) {
  const L = DRAGON.laser;
  if (!e.phase2) return L.band;
  const u = clamp((e.t - L.wind) / laserFire(e), 0, 1);
  return L.band * (1 + (DRAGON.laserGrow - 1) * u);
}
/** The burning trails the sky beams leave on the ground, fading. */
function drawTrails(e) {
  const S = DRAGON.sky;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of e.trail) {
    const a = 1 - p.t / S.trail;
    ctx.fillStyle = `rgba(255,${Math.round(150 + 90 * a)},${Math.round(200 * a)},${0.22 * a})`;
    ctx.beginPath();
    ctx.ellipse(p.x - G.cam, p.y, 16, skyBand(e) * 0.55 * (0.6 + 0.4 * a), 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
/** The sky beam: from the jaws down to where it meets the ground, with a flare at each end. */
function drawSkyBeams(e) {
  const S = DRAGON.sky,
    [ph, u] = skyPhase(e),
    [mx, my] = skyMouth(e),
    hx = mx - G.cam;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (ph === 'charge') {
    const core = ctx.createRadialGradient(hx, my, 1, hx, my, 12 + 36 * u);
    core.addColorStop(0, `rgba(255,255,255,${0.4 + 0.6 * u})`);
    core.addColorStop(1, 'rgba(176,92,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(hx - 60, my - 60, 120, 120);
  } else if (ph === 'fire' && e.beams) {
    const w = skyBand(e) * 0.8 + Math.sin(G.time * 70) * 2;
    for (const b of e.beams)
      for (const [ww, c] of [
        [w * 1.6, 'rgba(176,92,255,.3)'],
        [w * 0.95, 'rgba(215,190,255,.55)'],
        [w * 0.45, 'rgba(255,255,255,.95)'],
      ]) {
        ctx.strokeStyle = c;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1, ww);
        ctx.beginPath();
        ctx.moveTo(hx, my);
        ctx.lineTo(b.x - G.cam, b.y);
        ctx.stroke();
      }
    for (const [x, y, r] of [[hx, my, 46], ...e.beams.map((b) => [b.x - G.cam, b.y, 40])]) {
      const fl = ctx.createRadialGradient(x, y, 2, x, y, r);
      fl.addColorStop(0, 'rgba(255,255,255,.95)');
      fl.addColorStop(1, 'rgba(176,92,255,0)');
      ctx.fillStyle = fl;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  ctx.restore();
}
/** Light thrown on the ground by the firing beam. */
export function drawDragonGround(e) {
  if (e.trail?.length) drawTrails(e);
  if (e.state === 'sky') return;
  const L = DRAGON.laser;
  if (e.state !== 'laser' || e.t < L.wind || e.t > L.wind + laserFire(e)) return;
  const x0 = e.x - G.cam + e.face * 20,
    x1 = e.face > 0 ? W + 40 : -40,
    band = laserBand(e),
    g = ctx.createLinearGradient(0, e.laserY - band, 0, e.laserY + band);
  g.addColorStop(0, 'rgba(230,210,255,0)');
  g.addColorStop(0.5, 'rgba(240,230,255,.35)');
  g.addColorStop(1, 'rgba(230,210,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(Math.min(x0, x1), e.laserY - band, Math.abs(x1 - x0), band * 2);
}
/** The charge and the beam, drawn over everything. */
export function drawDragonBeam(e) {
  if (e.state === 'sky') return drawSkyBeams(e);
  const L = DRAGON.laser;
  if (e.state === 'plasma') {
    // plasma gathering in the jaws
    const Q = DRAGON.plasma,
      [mx, , mz] = mouth(e),
      left = Q.n - (e.spat || 0),
      u = Math.min(1, e.t / Q.wind),
      r = left ? (8 + 14 * u) * (0.9 + 0.1 * Math.sin(G.time * 40)) : 0;
    if (!r) return;
    const x = mx - G.cam,
      y = e.y - mz;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 1, x, y, r * 2.6);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.35, 'rgba(215,160,255,.7)');
    g.addColorStop(1, 'rgba(150,60,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
    ctx.restore();
    return;
  }
  if (e.state !== 'laser') return;
  const hx = e.x - G.cam + e.face * 25,
    hy = e.laserY - e.z - 108,
    x1 = e.face > 0 ? W + 40 : -40;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (e.t < L.wind) {
    // a pulse building in the heart: rings go out faster and brighter as it charges
    const u = e.t / L.wind,
      rate = lerp(2.5, 11, u * u),
      phase = e.anim * rate;
    for (let k = 0; k < 3; k++) {
      const p = (phase + k / 3) % 1,
        r = 10 + p * (40 + 60 * u);
      ctx.strokeStyle = `rgba(235,215,255,${(1 - p) * (0.3 + 0.6 * u)})`;
      ctx.lineWidth = 2 + 5 * u * (1 - p);
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, TAU);
      ctx.stroke();
    }
    const core = ctx.createRadialGradient(hx, hy, 1, hx, hy, 18 + 40 * u);
    core.addColorStop(0, `rgba(255,255,255,${0.4 + 0.6 * u})`);
    core.addColorStop(1, 'rgba(176,92,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(hx - 60, hy - 60, 120, 120);
  } else if (e.t < L.wind + laserFire(e)) {
    // the beam shoots out from the heart, flickers, and thins out at the end
    const s = e.t - L.wind,
      grow = Math.min(1, s / 0.12),
      k = Math.min(1, s / 0.06) * Math.min(1, (L.wind + laserFire(e) - e.t) / 0.2),
      w = laserBand(e) * k + Math.sin(G.time * 70) * 4,
      xe = hx + (x1 - hx) * grow;
    for (const [ww, c] of [
      [w * 2.4, 'rgba(176,92,255,.3)'],
      [w * 1.5, 'rgba(215,190,255,.55)'],
      [w * 0.75, 'rgba(255,255,255,.95)'],
      [w * 0.3, 'rgba(255,255,255,1)'],
    ]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(1, ww);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(xe, hy);
      ctx.stroke();
    }
    // a flare at the heart
    const fl = ctx.createRadialGradient(hx, hy, 2, hx, hy, 70);
    fl.addColorStop(0, 'rgba(255,255,255,.95)');
    fl.addColorStop(1, 'rgba(176,92,255,0)');
    ctx.fillStyle = fl;
    ctx.fillRect(hx - 70, hy - 70, 140, 140);
  }
  ctx.restore();
}
export function drawDragon(e) {
  const T = e.T,
    fl = e.flash > 0,
    col = fl ? '#ffffff' : T.col,
    dk = fl ? '#ffe0e0' : T.dk,
    C = DRAGON,
    S = 1;
  ctx.save();
  ctx.translate(e.x - G.cam, e.y - e.z);
  ctx.scale(e.face * S, S);
  // posture: breathing, crouch before a leap, rearing for the laser and the roar
  let bob = Math.sin(e.anim * 2) * 3,
    rear = 0;
  if (e.state === 'leap' && e.t < C.leap.crouch) bob += 22 * ease(e.t / C.leap.crouch);
  if (e.state === 'pounce' && e.t < C.pounce.crouch) bob += 16 * ease(e.t / C.pounce.crouch);
  if (e.state === 'stagger') rear = -0.07 * Math.sin(Math.min(1, e.t / C.stagger) * Math.PI);
  if (e.state === 'laser') rear = -Math.min(1, e.t / 0.3) * 0.08;
  if (e.state === 'roar') rear = -0.1;
  if (e.state === 'kick') {
    // the weight goes onto the front legs as the hind leg lashes out
    const K = C.kick;
    rear = 0.07 * Math.sin(clamp(e.t / (K.wind + K.strike + K.rec), 0, 1) * Math.PI);
  }
  let sink = 0;
  if (e.state === 'dying') {
    const D = C.death,
      p = ease(clamp((e.t - D.roar) / D.fall, 0, 1));
    rear = lerp(-0.14, 0.12, p);
    sink = 95 * p;
    bob += sink;
  }
  // with the body sinking, the feet stay on the ground and the knees splay out
  const legS = (h, k, ft, w, c) =>
    sink
      ? leg(
          h,
          [k[0] + Math.sign(k[0]) * sink * 0.6, (h[1] - sink) / 2],
          [ft[0] + Math.sign(ft[0]) * sink * 0.5, -sink + 2],
          w,
          c,
        )
      : leg(h, k, ft, w, c);
  const walk = e.moving ? e.walkT : 0,
    st = (k) => Math.sin(walk + k) * 18,
    lift = (k) => Math.max(0, Math.sin(walk + k)) * 14;
  if (e.moving) bob -= Math.abs(Math.sin(walk)) * 4; // the body rides the stride
  ctx.translate(0, bob);
  ctx.rotate(rear);
  const hip = [-70, -125],
    sh = [60, -138],
    flap = Math.sin(e.wingP || 0) * (wingsWide(e) ? 1.3 : 0.8);
  // far side: wing, legs, darker
  wing([10, -150], flap * 0.8, dk, 'rgba(40,28,58,.55)', true);
  legS([hip[0] + 10, hip[1] + 6], [-82, -66], [-58 + st(2), -lift(2)], 10, dk);
  legS([sh[0] + 10, sh[1] + 6], [92, -70], [86 + st(0), -lift(0)], 9, dk);
  // tail: vertebrae from the hip to the tip, swaying, with spikes
  const sway = Math.sin(e.anim * 2.4);
  const tail = [];
  for (let i = 0; i <= 9; i++) {
    const u = i / 9;
    tail.push([
      hip[0] - 20 - u * 170,
      hip[1] + 20 + u * 90 - Math.sin(u * Math.PI) * 30 + sway * u * 14,
    ]);
  }
  bone(tail, 9, col);
  tail.forEach(([x, y], i) => {
    const r = 7 - i * 0.55;
    knob(x, y, r, col);
    if (i % 2 === 0 && i < 9) {
      ctx.fillStyle = dk;
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - r);
      ctx.lineTo(x - 2, y - r - 12 + i);
      ctx.lineTo(x + 4, y - r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  });
  // pelvis
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.ellipse(hip[0], hip[1], 26, 18, -0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(hip[0], hip[1], 22, 14, -0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.arc(hip[0] + 4, hip[1] + 2, 5, 0, TAU);
  ctx.fill();
  // ribcage with the bone heart inside
  const rc = [0, -112];
  ctx.fillStyle = 'rgba(23,21,29,.82)';
  ctx.beginPath();
  ctx.ellipse(rc[0], rc[1], 74, 46, 0, 0, TAU);
  ctx.fill();
  const charge = e.state === 'laser' ? Math.min(1, e.t / C.laser.wind) : 0,
    beat = 0.55 + 0.45 * Math.abs(Math.sin(e.anim * 3)),
    glow = Math.max(beat * 0.6, charge);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const hg = ctx.createRadialGradient(25, -108, 2, 25, -108, 30 + 50 * glow);
  hg.addColorStop(0, `rgba(240,220,255,${0.5 + 0.5 * glow})`);
  hg.addColorStop(1, 'rgba(176,92,255,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(-60, -190, 170, 170);
  ctx.restore();
  ctx.save();
  ctx.translate(25, -108);
  ctx.scale(1 + 0.12 * beat, 1 + 0.12 * beat);
  ctx.fillStyle = fl ? '#fff' : charge > 0.5 ? '#ffffff' : '#e9dcff';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(-20, 0, -14, -16, 0, -8);
  ctx.bezierCurveTo(14, -16, 20, 0, 0, 14);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,70,180,.8)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(0, 4);
  ctx.lineTo(5, -5);
  ctx.stroke();
  ctx.restore();
  // ribs: arcs from the spine down to the breastbone
  for (let i = 0; i < 7; i++) {
    const x = -56 + i * 18,
      top = -150 + Math.abs(i - 3) * 2;
    bone(
      [
        [x, top],
        [x + 10, top + 30],
        [x + 6, -72 - Math.abs(i - 3) * 3],
      ],
      4.5,
      i % 2 ? col : dk,
    );
  }
  bone(
    [
      [-50, -72],
      [-10, -66],
      [44, -70],
    ],
    5,
    col,
  );
  // spine with ridged vertebrae from the hip to the shoulders
  const spine = [hip, [-30, -158], [20, -160], sh];
  bone(spine, 10, col);
  for (let i = 0; i <= 8; i++) {
    const u = i / 8,
      [x, y] = qpt(hip, [-5, -185], sh, u);
    knob(x, y, 6, col);
    ctx.fillStyle = dk;
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 4);
    ctx.lineTo(x - 2, y - 20);
    ctx.lineTo(x + 5, y - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // near legs; the front one swipes during the claw attack
  let foot = [-70 + st(Math.PI), -lift(Math.PI)],
    knee = [-96, -62];
  if (e.state === 'kick') {
    const K = C.kick;
    if (e.t < K.wind) {
      const p = ease(e.t / K.wind);
      foot = [lerp(foot[0], -40, p), lerp(foot[1], -70, p)];
      knee = [lerp(-96, -40, p), lerp(-62, -100, p)];
    } else if (e.t < K.wind + K.strike) {
      const p = ease((e.t - K.wind) / K.strike);
      foot = [lerp(-40, -245, p), lerp(-70, -60, p)];
      knee = [lerp(-40, -150, p), lerp(-100, -95, p)];
    } else {
      const p = ease(Math.min(1, (e.t - K.wind - K.strike) / K.rec));
      foot = [lerp(-245, -70, p), lerp(-60, 0, p)];
      knee = [lerp(-150, -96, p), lerp(-95, -62, p)];
    }
  }
  legS(hip, knee, foot, 12, col);
  let paw = [100 + st(Math.PI + 2), -lift(Math.PI + 2)],
    elbow = [86, -66];
  if (e.state === 'claw') {
    const K = C.claw;
    if (e.t < K.wind) {
      const p = ease(e.t / K.wind);
      paw = [lerp(paw[0], 120, p), lerp(paw[1], -170, p)];
      elbow = [lerp(86, 120, p), lerp(-66, -120, p)];
    } else if (e.t < K.wind + K.swipe) {
      const p = ease((e.t - K.wind) / K.swipe);
      paw = [lerp(120, 230, p), lerp(-170, -12, p)];
      elbow = [lerp(120, 160, p), lerp(-120, -70, p)];
    } else {
      const p = ease(Math.min(1, (e.t - K.wind - K.swipe) / K.rec));
      paw = [lerp(230, 100, p), lerp(-12, 0, p)];
      elbow = [lerp(160, 86, p), lerp(-70, -66, p)];
    }
  }
  legS(sh, elbow, paw, 12, col);
  // near wing over the body
  wing([20, -152], flap, col, 'rgba(58,38,84,.62)', false);
  // neck: a chain of vertebrae from the shoulders to the head
  const h = dragonHead(e),
    ctrl = [sh[0] + 70, Math.min(sh[1], h.y) - 50];
  const neck = [];
  for (let i = 0; i <= 7; i++) neck.push(qpt(sh, ctrl, [h.x - 14, h.y + 4], i / 7));
  bone(neck, 11, col);
  neck.forEach(([x, y], i) => {
    knob(x, y, 7 - i * 0.35, col);
    if (i > 0 && i < 7) {
      ctx.fillStyle = dk;
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 5);
      ctx.lineTo(x - 4, y - 16);
      ctx.lineTo(x + 4, y - 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  });
  skull(h, col, dk, T.eye, fl);
  ctx.restore();
}
