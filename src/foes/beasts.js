// The beasts of Frostfang Pass (BEAST), after Golden Axe's: the cockatrice (TYPES.rider), a
// green bird-lizard that spins round and whips its spiked tail, and the fire drake
// (TYPES.drake), a blue dragon that breathes fire. A skeleton bandit rides one in; a blow on
// him knocks him out of the saddle, and the beast stands there with nobody on it. Then the
// heroine may jump on (a jump that comes down on it): it is hers, J makes it whip or breathe at
// her foes, a jump gets her off, and a blow on her throws her out of the saddle. Left alone,
// a bandit may come and climb back on; after a while it runs off. A beast never fights by
// itself and is never hurt (it takes no side: the fight does not wait for it).
import { BEAST, OL, RAGE, TAU, W } from '../config.js';
import { clamp, fxRandom, fxRnd, rnd } from '../util.js';
import { G, P } from '../state.js';
import { ctx, txt } from '../gfx.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { addRage, hitPlayer, hurtEnemy } from '../combat.js';
import { spawn } from '../enemies.js';
import { floorClamp, inView } from '../level.js';
import { dmgMult, styleGain } from '../style.js';
import { t } from '../i18n.js';
import { WALKS } from '../anim.js';
import { defineFoe, defineState, FOES } from './registry.js';
import { faceP, go, moveTo, playerDown } from './kit.js';

export const isBeast = (e) => !!FOES[e.type]?.beast;
/** A beast nobody rides, nor is about to. */
const free = (b) => !b.dead && !b.rider && !b.byP && b.state !== 'bleave';

/** Puts rider `r` (a bandit) into beast `b`'s saddle. */
export function seat(r, b) {
  r.steed = b;
  b.rider = r;
  b.claim = null;
  b.freeT = 0;
  r.mountTo = null;
  go(r, 'saddle', 0, { engage: false, vz: 0 });
}
/** The rider is knocked out of the saddle: the beast stands there with nobody on it. */
export function unseat(r) {
  const b = r.steed;
  r.steed = null;
  if (b && b.rider === r) letGo(b);
}
function letGo(b) {
  b.rider = null;
  b.byP = false;
  b.freeT = 0;
  b.claim = null;
  if (b.state !== 'bleave') go(b, 'bwalk');
}

// The rider in the saddle: carried along, sitting up there. A blow knocks him out of it (see
// unseat in the riders' onHit).
defineState('saddle', (e) => {
  const b = e.steed;
  if (!b || b.dead || b.rider !== e) {
    e.steed = null;
    go(e, 'air', 0, { vx: 0, vz: 120 });
    return;
  }
  e.x = b.x - b.face * 6;
  e.y = b.y + 1;
  e.z = BEAST[b.type].seat;
  e.face = b.face;
});
// A bandit walking up to a beast nobody rides, to climb on.
defineState('tomount', (e, dt) => {
  const b = e.mountTo;
  if (!b || !free(b) || b.claim !== e) {
    e.mountTo = null;
    go(e, 'chase');
    return;
  }
  e.face = b.x >= e.x ? 1 : -1;
  moveTo(e, b.x, b.y, e.T.speed * 1.15, dt);
  if (Math.abs(b.x - e.x) < 26 && Math.abs(b.y - e.y) < 14) {
    seat(e, b);
    SFX.jump();
  }
});
WALKS.tomount = WALKS.chase;
/** The riders' move: a beast stands free nearby, the heroine not by it: go and climb on. */
export const remount = {
  when(e) {
    if (e.steed || e.cd > 0 || !level4()) return false;
    for (const b of G.enemies)
      if (
        isBeast(b) &&
        free(b) &&
        (!b.claim || b.claim === e || b.claim.dead || b.claim.mountTo !== b) &&
        Math.abs(b.x - e.x) < BEAST.remount &&
        Math.abs(b.x - P.x) > 140 &&
        inView(b.x, b.y)
      ) {
        e.mountTo = b;
        b.claim = e;
        return true;
      }
    return false;
  },
  go: (e) => go(e, 'tomount', 0, { engage: false }),
};
const level4 = () => G.level === 4;
/** Seconds a beast running off takes to be gone. */
const LEAVE = 2.4;
/** The riders' first say on a blow: out of the saddle (up in the air, off the beast's back). */
export function riderHit(e, dir) {
  if (!e.steed) return false;
  unseat(e);
  if (e.hp > 0) go(e, 'air', 0, { vx: dir * 150, vz: 330 });
  return e.hp > 0;
}

// --- the heroine on a beast ---------------------------------------------------------------

/** Coming down from a jump onto a beast nobody rides: she is in the saddle. */
export function tryMount(p) {
  for (const b of G.enemies) {
    if (!isBeast(b) || !free(b)) continue;
    if (Math.abs(b.x - p.x) < BEAST.near && Math.abs(b.y - p.y) < 26) {
      if (b.claim) {
        b.claim.mountTo = null;
        b.claim = null;
      }
      b.byP = true;
      b.freeT = 0;
      b.cd = 0;
      go(b, 'bwalk');
      Object.assign(p, { state: 'ride', t: 0, z: 0, vz: 0, x: b.x, y: b.y, steed: b, airS: null });
      p.seat = BEAST[b.type].pseat;
      dust(b.x, b.y, 6);
      SFX.thud();
      return true;
    }
  }
  return false;
}
/** She leaves the saddle (a jump off, or thrown out of it). */
export function dismount(p) {
  const b = p.steed;
  p.steed = null;
  if (b && b.byP) letGo(b);
}
/**
 * Her frame on a beast: she steers it (`mx`, `my`), J makes it attack. Returns false once she is
 * no longer on it.
 */
export function rideTick(p, dt, mx, my, atk) {
  const b = p.steed;
  if (!b || b.dead || !b.byP) {
    p.steed = null;
    return false;
  }
  const B = BEAST[b.type],
    busy = b.state !== 'bwalk';
  if (!busy) {
    if (mx) p.face = mx;
    p.x += mx * B.ride * dt;
    p.y += my * B.ride * 0.62 * dt;
  }
  b.pmove = !busy && !!(mx || my);
  if (atk && !busy && b.cd <= 0) {
    go(b, 'bwind', 0, { hits: new Set(), hitDone: false });
    SFX.swing();
  }
  // crouched in the saddle, holding on (the jump's first frame)
  p.an = ['jump', 0];
  return true;
}

// --- the beast ------------------------------------------------------------------------------

/** Who (or what) its attack catches now: the heroine, or, ridden by her, her foes. */
function attackHits(e) {
  const B = BEAST[e.type],
    fire = e.type === 'drake',
    tip = fire ? Math.min(B.reach, 40 + e.t * 900) : B.front,
    from = fire ? 20 : -B.back,
    inside = (o) => {
      const rel = (o.x - e.x) * e.face,
        wide = fire ? B.dy * (0.5 + (0.5 * Math.max(0, rel)) / B.reach) : B.dy;
      return rel > from - (o.w ?? 0) && rel < tip + (o.w ?? 0) && Math.abs(o.y - e.y) < wide;
    };
  if (!e.byP) {
    if (!e.hitDone && inside(P) && P.z < 90 && hitPlayer(B.dmgP, e.face, true)) e.hitDone = true;
    return;
  }
  for (const o of G.enemies.concat(G.props)) {
    if (o === e || o.dead || o.dying || e.hits.has(o) || isBeast(o) || !inside(o)) continue;
    if (!o.isProp && o.z > 110) continue; // (a harpy up in the air)
    e.hits.add(o);
    if (
      hurtEnemy(o, B.dmgE * dmgMult(), (o.x - e.x) * e.face >= 0 ? e.face : -e.face, true, 'beast')
    )
      if (!o.isProp) {
        addRage(RAGE.beast);
        styleGain(10);
      }
  }
}
/** Walking to where it can strike the heroine (a bandit on it), and striking. */
function foeThink(e, dt) {
  const B = BEAST[e.type],
    T = e.T,
    adx = Math.abs(P.x - e.x),
    ady = Math.abs(P.y - e.y),
    want = e.type === 'drake' ? B.reach * 0.7 : B.front * 0.62;
  faceP(e);
  if (!playerDown() && e.cd <= 0 && adx < want + 30 && ady < 18 && inView(e.x, e.y)) {
    go(e, 'bwind', 0, { hitDone: false });
    SFX.swing();
    return;
  }
  const side = e.x >= P.x ? 1 : -1;
  moveTo(e, P.x + side * want, P.y, T.speed, dt);
}
/** Left alone: it waits, then runs off the way it is nearest to the edge. */
function freeThink(e, dt) {
  e.freeT += dt;
  // left behind as the road goes on: gone
  if (e.x < G.cam - 130 || e.x > G.cam + W + 130) {
    e.dead = true;
    return;
  }
  if (e.freeT > BEAST.stay && !(e.claim && e.claim.mountTo === e)) {
    go(e, 'bleave', 0, { rdir: e.x - G.cam < W / 2 ? -1 : 1 });
    SFX.roar();
  }
}
export function beastTick(e, dt) {
  const B = BEAST[e.type],
    T = e.T;
  e.t += dt;
  e.anim += dt;
  e.cd -= dt;
  e.moving = false;
  if (e.byP && (P.state !== 'ride' || P.steed !== e)) letGo(e);
  if (e.rider && (e.rider.dead || e.rider.dying || e.rider.steed !== e)) letGo(e);
  if (e.byP) {
    e.x = P.x;
    e.y = P.y;
    e.face = P.face;
    e.moving = !!e.pmove;
  }
  switch (e.state) {
    case 'bwalk':
      if (e.rider) foeThink(e, dt);
      else if (!e.byP) freeThink(e, dt);
      break;
    case 'bwind':
      if (e.t > B.wind) {
        go(e, 'batk', 0);
        if (e.type === 'drake') SFX.flame();
        else SFX.dash();
      }
      break;
    case 'batk':
      if (e.type === 'drake' ? e.t < B.t : e.t < 0.16) attackHits(e);
      if (e.type === 'drake' && fxRandom() < 0.9) flame(e);
      if (e.t > (e.type === 'drake' ? B.t : T.act)) go(e, 'brec');
      break;
    case 'brec':
      if (e.t > (e.byP ? 0.15 : T.rec)) {
        go(e, 'bwalk');
        e.cd = e.byP ? 0.1 : rnd(...T.cd);
      }
      break;
    case 'bleave':
      e.face = e.rdir;
      e.x += e.rdir * T.speed * 1.6 * dt;
      e.moving = true;
      // (it runs off along the road, fading away where the road does not go off the screen)
      if (e.t > LEAVE || e.x < G.cam - 160 || e.x > G.cam + W + 160) e.dead = true;
      break;
  }
  if (e.moving) e.walkT += dt * 9;
  floorClamp(e, 2, 0);
}
/** The drake's fire: flames rolling out of its jaws. */
function flame(e) {
  const B = BEAST.drake,
    [mx, mz] = mouth(e),
    tip = Math.min(B.reach, 40 + e.t * 900),
    u = fxRnd(0.1, 1);
  G.parts.push({
    k: 'glow',
    x: mx + e.face * tip * u * 0.3,
    y: e.y - mz + 30 * u,
    vx: e.face * fxRnd(500, 760),
    vy: fxRnd(-50, 80),
    g: -60,
    t: 0,
    life: (tip / 640) * fxRnd(0.6, 1),
    s: fxRnd(7, 13),
    col: fxRandom() < 0.5 ? '#ffb02e' : '#ff5a1e',
  });
}
/** Where the drake's mouth is: [x, height]. */
const mouth = (e) => [e.x + e.face * 104, 110];

const beastDef = {
  beast: 1,
  walksIn: true,
  spawn(e, side, placed) {
    Object.assign(e, { neutral: true, state: 'bwalk', freeT: 0, w: 44, rider: null, byP: false });
    e.cd = rnd(1, 2);
    if (!placed) seat(spawn('bandit', side || 1, e.x, e.y), e);
  },
  immune: () => true,
  update: beastTick,
  draw: drawBeast,
  // over everyone: the sign to jump on, when she is near one nobody rides
  over(e) {
    if (!free(e) || P.state === 'ride' || Math.abs(P.x - e.x) > 320) return;
    const x = e.x - G.cam,
      y = e.y - BEAST[e.type].seat - 120 - Math.abs(Math.sin(G.time * 5)) * 10;
    txt(t('mount'), x, y, 16, '#ffe14a', 'center', 4);
    ctx.fillStyle = '#ffe14a';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 8);
    ctx.lineTo(x + 10, y + 8);
    ctx.lineTo(x, y + 20);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  },
};
defineFoe('rider', beastDef);
defineFoe('drake', beastDef);

// --- drawing ---------------------------------------------------------------------------------

function fillOl(c, lw = 2.6) {
  ctx.fillStyle = c;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = OL;
  ctx.stroke();
}
function ell(x, y, rx, ry, rot, c, lw) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  fillOl(c, lw);
}
/** A thick limb: a line drawn with the ink under it. */
function limb(pts, w, c) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [lw, cc] of [
    [w + 5, OL],
    [w, c],
  ]) {
    ctx.strokeStyle = cc;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
}
function saddle(x, y, w) {
  ctx.beginPath();
  ctx.moveTo(x - w, y + 2);
  ctx.quadraticCurveTo(x, y + 10, x + w, y + 2);
  ctx.lineTo(x + w + 4, y - 8);
  ctx.quadraticCurveTo(x, y - 2, x - w - 6, y - 12);
  ctx.closePath();
  fillOl('#7a4a26');
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(x - 3, y + 2, 6, 18);
}
function drawBeast(e) {
  const sx = e.x - G.cam,
    sy = e.y - e.z,
    fl = e.flash > 0;
  ctx.save();
  if (e.state === 'bleave') ctx.globalAlpha = clamp(1 - (e.t - LEAVE + 0.8) / 0.8, 0, 1);
  ctx.translate(sx, sy);
  // the cockatrice spins round as it whips its tail
  const spin =
    e.type === 'rider' && e.state === 'batk' ? Math.cos(clamp(e.t / 0.2, 0, 1) * TAU) : 1;
  ctx.scale(e.face * spin, 1);
  if (e.type === 'rider') drawCockatrice(e, fl);
  else drawDrake(e, fl);
  ctx.restore();
}
/** The cockatrice: a green bird-lizard on two strong legs, a beak and a red comb, a long tail
 *  ending in a spiked club. */
function drawCockatrice(e, fl) {
  const T = e.T,
    col = fl ? '#fff' : T.col,
    dk = fl ? '#ddd' : T.dk,
    br = Math.sin(e.anim * 3) * 2,
    wind = e.state === 'bwind' ? clamp(e.t / BEAST.rider.wind, 0, 1) : 0,
    wk = e.walkT;
  // legs (the far one darker)
  const leg = (ph, c) => {
    const mv = e.moving ? 1 : 0,
      sw = Math.cos(ph) * 18 * mv,
      lift = Math.max(0, Math.sin(ph)) * 16 * mv,
      hip = [-6, -60],
      knee = [6 + sw * 0.4, -34 - lift * 0.5],
      ank = [-6 + sw, -10 - lift],
      foot = [6 + sw, -lift];
    limb([hip, knee], 13, c);
    limb([knee, ank, foot], 6, '#d9a641');
    limb([foot, [foot[0] + 12, foot[1] + 1]], 3, '#d9a641');
    limb([foot, [foot[0] - 7, foot[1]]], 3, '#d9a641');
  };
  leg(wk + Math.PI, dk);
  // the tail: out behind, up and curled while it winds up
  const ta = -0.2 - wind * 0.9,
    tl = [
      [-34, -76],
      [-70, -78 + ta * 30],
      [-104, -70 + ta * 70],
      [-128, -62 + ta * 110],
    ];
  limb(tl, 12, col);
  const [cx, cy] = tl[3];
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, TAU);
  fillOl(dk);
  ctx.fillStyle = '#e8e0c8';
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + e.anim;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11);
    ctx.lineTo(cx + Math.cos(a + 0.25) * 22, cy + Math.sin(a + 0.25) * 22);
    ctx.lineTo(cx + Math.cos(a + 0.5) * 11, cy + Math.sin(a + 0.5) * 11);
    ctx.closePath();
    fillOl('#e8e0c8', 1.6);
  }
  // the body, a pale belly
  ell(0, -74 + br, 46, 27, -0.12, col);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -74 + br, 46, 27, -0.12, 0, TAU);
  ctx.clip();
  ctx.fillStyle = fl ? '#fff' : '#cfe3a0';
  ctx.beginPath();
  ctx.ellipse(12, -56 + br, 40, 16, -0.12, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  for (let k = 0; k < 5; k++) ctx.fillRect(-30 + k * 13, -94 + br, 7, 4);
  ctx.restore();
  saddle(-6, -98 + br, 22);
  leg(wk, col);
  // the neck and the head: a beak, a red comb, a yellow eye
  const nod = e.moving ? Math.sin(wk * 2) * 4 : br;
  limb(
    [
      [28, -86 + br],
      [46, -108 + nod],
      [56, -126 + nod],
    ],
    14,
    col,
  );
  ctx.save();
  ctx.translate(60, -130 + nod);
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.lineTo(-2, -24);
  ctx.lineTo(4, -15);
  ctx.lineTo(10, -26);
  ctx.lineTo(13, -12);
  ctx.closePath();
  fillOl(fl ? '#fff' : '#e8402f', 2);
  ell(0, 0, 17, 12, 0, col);
  ctx.beginPath();
  ctx.moveTo(12, -6);
  ctx.lineTo(34, 2);
  ctx.lineTo(12, 8);
  ctx.closePath();
  fillOl(fl ? '#fff' : '#f0b43c', 2);
  ctx.beginPath();
  ctx.moveTo(12, 2);
  ctx.lineTo(30, 2);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(4, -3, 4.5, 0, TAU);
  fillOl('#fff', 1.5);
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.arc(5, -3, 2.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e8402f'; // the wattle
  ctx.beginPath();
  ctx.ellipse(10, 12, 4, 6, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // the little arms
  limb(
    [
      [30, -70 + br],
      [40, -60 + br],
      [46, -64 + br],
    ],
    5,
    dk,
  );
}
/** The fire drake: a blue dragon on four legs, horns, a crest of spines, folded wings, a long
 *  tail; its fire while it breathes. */
function drawDrake(e, fl) {
  const T = e.T,
    col = fl ? '#fff' : T.col,
    dk = fl ? '#ddd' : T.dk,
    br = Math.sin(e.anim * 2.5) * 2,
    wind = e.state === 'bwind' ? clamp(e.t / BEAST.drake.wind, 0, 1) : 0,
    fire = e.state === 'batk',
    wk = e.walkT;
  const leg = (x, ph, c) => {
    const mv = e.moving ? 1 : 0,
      sw = Math.cos(ph) * 14 * mv,
      lift = Math.max(0, Math.sin(ph)) * 12 * mv;
    limb(
      [
        [x, -58],
        [x + 8 + sw * 0.5, -30 - lift * 0.5],
        [x + sw, -lift],
      ],
      13,
      c,
    );
    limb(
      [
        [x + sw, -lift],
        [x + sw + 12, -lift],
      ],
      6,
      '#e8e0c8',
    );
  };
  leg(36, wk + Math.PI, dk);
  leg(-34, wk, dk);
  // the tail
  limb(
    [
      [-46, -64 + br],
      [-96, -46],
      [-138, -30 + Math.sin(e.anim * 2) * 6],
      [-160, -40 + Math.sin(e.anim * 2) * 10],
    ],
    12,
    col,
  );
  // the body and its belly
  ell(0, -66 + br, 60, 30, -0.05, col);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -66 + br, 60, 30, -0.05, 0, TAU);
  ctx.clip();
  ctx.fillStyle = fl ? '#fff' : '#cfe0f5';
  for (let k = 0; k < 6; k++) ctx.fillRect(-40 + k * 16, -50 + br, 13, 20);
  ctx.restore();
  // spines along the back
  ctx.fillStyle = fl ? '#fff' : '#ffcf3a';
  for (let k = 0; k < 5; k++) {
    const x = -50 + k * 14;
    ctx.beginPath();
    ctx.moveTo(x - 6, -88 + br + Math.abs(x) * 0.12);
    ctx.lineTo(x, -104 + br + Math.abs(x) * 0.12);
    ctx.lineTo(x + 6, -88 + br + Math.abs(x) * 0.12);
    ctx.closePath();
    fillOl(ctx.fillStyle, 1.8);
  }
  // the folded wing
  ctx.beginPath();
  ctx.moveTo(-6, -84 + br);
  ctx.lineTo(-58, -124 + br);
  ctx.lineTo(-48, -100 + br);
  ctx.lineTo(-74, -96 + br);
  ctx.lineTo(-30, -74 + br);
  ctx.closePath();
  fillOl(dk);
  saddle(10, -96 + br, 22);
  leg(46, wk, col);
  leg(-24, wk + Math.PI, col);
  // neck and head: reared back as it draws breath, thrust out as it breathes
  const lift = wind * 16 - (fire ? 6 : 0);
  limb(
    [
      [46, -78 + br],
      [70, -98 - lift],
      [84, -114 - lift],
    ],
    16,
    col,
  );
  ctx.save();
  ctx.translate(88, -116 - lift);
  ctx.rotate(fire ? 0.12 : -wind * 0.3);
  // horns
  for (const [a, c] of [
    [-14, dk],
    [-6, '#e8e0c8'],
  ]) {
    ctx.beginPath();
    ctx.moveTo(a, -8);
    ctx.quadraticCurveTo(a - 16, -22, a - 26, -16);
    ctx.quadraticCurveTo(a - 12, -14, a + 4, -4);
    ctx.closePath();
    fillOl(c, 1.8);
  }
  // the snout, the jaw (open when it breathes)
  const open = fire ? 9 : wind * 4;
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.lineTo(24, 4 + open);
  ctx.lineTo(24, 10 + open);
  ctx.lineTo(-8, 14);
  ctx.closePath();
  fillOl(dk, 2);
  ctx.beginPath();
  ctx.moveTo(-16, -10);
  ctx.quadraticCurveTo(4, -14, 28, -4);
  ctx.lineTo(28, 4);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  fillOl(col);
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.arc(24, -4, 1.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = T.eye;
  ctx.beginPath();
  ctx.arc(2, -5, 3.2, 0, TAU);
  ctx.fill();
  if (wind > 0 || fire) {
    // a glow in its throat
    ctx.fillStyle = `rgba(255,170,40,${0.4 + 0.5 * (fire ? 1 : wind)})`;
    ctx.beginPath();
    ctx.arc(24, 7 + open / 2, 5 + wind * 4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  if (fire) {
    // the fire: a cone of flame rolling out of the jaws
    const B = BEAST.drake,
      tip = Math.min(B.reach, 40 + e.t * 900) / e.T.scale;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 14; k++) {
      const u = k / 13,
        x = 112 + tip * u,
        y = -110 + 48 * u + Math.sin(e.anim * 30 + k) * 4,
        r = 8 + 26 * u;
      ctx.fillStyle = `rgba(255,${Math.round(200 - 140 * u)},40,${0.55 - 0.3 * u})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
