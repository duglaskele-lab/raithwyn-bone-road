// Raithwyn as the final boss of the Bone Road (numbers in EVIL and TYPES.evil): she waits in the
// dragon's place when the player is someone else, drawn with her own sprites. She fights with
// the heroine's own moves, in three stages by her health, with no show of a change. She walks
// at the heroine's pace and now and then runs (more often in the later stages) to close in or
// to get away. Up close, her three-punch chain (a glint in her eyes first); far off, a running
// jump kick (she runs straight at the player, gathering speed, and leaps); her bone along the
// road (a fan of three in the third stage); her dark ball of level I, II and III by stage (held
// at her side while it gathers, longer each time, sparks flying from it, more the stronger it
// is; nothing stops it from the second stage on); a leap back from the player's attacks (at a
// wall, the other way, over her). From the second stage on she gathers rage (a small bar under
// hers), and in the third it fills by itself; full, she gathers a dark orb (a heavy blow breaks
// it and empties her rage, but not in the third stage), it rises over the arena and for five
// seconds three beams from it run over the ground along their own paths, burning it, while she
// only walks about and leaps away. At half health she calls up the dandy skeleton (dandy.js).
// She comes with pomp: violet bats wheel round the spot, a violet mist gathers, and she steps
// out of it laughing; from the second stage she vanishes the same way now and then (mist and
// bats burst from her) and comes back somewhere else, out of bats and mist (EVIL.intro, tele).
// Otherwise she takes blows as a light enemy: a hit stops her, a heavy one throws her.
import { EVIL, GB, GT, PURPLE, TAU, W } from '../config.js';
import { clamp, ease, lerp, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { dust, motes } from '../fx.js';
import { finale, hitPlayer, hurtEnemy } from '../combat.js';
import { scoreMult } from '../style.js';
import { ctx, sprite } from '../gfx.js';
import { spawn } from '../enemies.js';
import { defineFoe, FOES } from './registry.js';
import { faceP, go, inFront, moveTo } from './kit.js';

/** Her stage, 1 to 3, by how much health she has left. */
export const stageOf = (e) => {
  const f = e.hp / e.T.hp;
  return f > EVIL.stages[0] ? 1 : f > EVIL.stages[1] ? 2 : 3;
};
const onScreen = (e) => e.x > G.cam + 40 && e.x < G.cam + W - 40;
/** The skeletons she has called up (her own blows hurt them too). */
export const dandies = () => G.enemies.filter((o) => o.type === 'dandy' && !o.dead && !o.dying);
/** One of her blows (her fist, a bone, a ball, a beam) on her own skeleton. */
export function evilHurt(o, dmg, dir, knock) {
  G.evilHit = true;
  hurtEnemy(o, dmg, dir, knock, 'evil');
  G.evilHit = false;
}
/** She gains rage, from her second stage on (not while her orb is out). */
export function evilRage(e, n) {
  if (!e || e.dead || e.dying || e.stage < 2 || e.orb) return;
  e.rage = Math.min(EVIL.rage.max, (e.rage ?? 0) + n);
}
/** A blow of hers on the player; one that lands gives her rage. */
export function evilHitP(e, dmg, dir, knock) {
  if (!hitPlayer(dmg, dir, knock)) return false;
  evilRage(e, EVIL.rage.hit);
  return true;
}
/** The player is in the middle of an attack (what she leaps away from). */
const attacking = () =>
  ['atk1', 'atk2', 'throw', 'hado', 'super', 'bigGun', 'nade'].includes(P.state);

// --- her orb -----------------------------------------------------------------------------------

/** Where beam i of the orb meets the ground, `tau` seconds into its life: three paths of their
 *  own over the arena (a wide sweep, a loop, a figure of eight). */
export function orbSpot(i, tau) {
  const cx = G.cam + W / 2,
    hx = W / 2 - 70,
    cy = (GT + GB) / 2,
    hy = (GB - GT) / 2 - 10;
  if (i === 0) return [cx + hx * Math.sin(tau * 0.9), cy + hy * 0.8 * Math.sin(tau * 0.55 + 1)];
  if (i === 1)
    return [cx + hx * 0.75 * Math.cos(tau * 0.75 + 2), cy + hy * 0.9 * Math.sin(tau * 0.75 + 2)];
  return [cx + hx * Math.sin(tau * 0.6 + 4), cy + hy * 0.9 * Math.sin(tau * 1.7)];
}
/** The orb rises from her hands over the middle of the arena and swells; then its beams. */
function updOrb(e, dt) {
  const O = EVIL.orb,
    o = e.orb;
  o.t += dt;
  const u = ease(clamp(o.t / O.rise, 0, 1));
  o.x = lerp(o.x0, G.cam + W / 2, u);
  o.y = lerp(o.y0, (GT + GB) / 2, u);
  o.z = lerp(o.z0, O.z, u);
  o.r = lerp(16, 54, u);
  const tau = o.t - O.rise - O.warn;
  if (tau < 0) return;
  if (tau > O.life) {
    e.orb = null;
    return;
  }
  o.spots = [0, 1, 2].map((i) => orbSpot(i, tau));
  o.burnT -= dt;
  o.spots.forEach(([x, y], i) => {
    if (o.burnT <= 0)
      G.pools.push({ fire: true, dark: true, x, y, t: 0, life: O.burn, seed: rnd(6) });
    // a beam that runs over her: hurt, now and then
    if (
      (o.cd[i] -= dt) <= 0 &&
      Math.abs(P.x - x) < O.hitR &&
      Math.abs(P.y - y) < O.hitR * 0.5 &&
      P.z < 100
    )
      if (evilHitP(e, O.hit, P.x >= x ? 1 : -1, false)) o.cd[i] = O.again;
    for (const d of dandies())
      if (
        (d.beamT ?? 0) <= G.time &&
        Math.abs(d.x - x) < O.hitR &&
        Math.abs(d.y - y) < O.hitR * 0.5
      ) {
        d.beamT = G.time + O.again;
        evilHurt(d, O.hit, d.x >= x ? 1 : -1, false);
      }
    if (random() < 0.5)
      G.parts.push({
        k: 'glow',
        x: x + rnd(-8, 8),
        y: y - rnd(0, 16),
        vx: rnd(-120, 120),
        vy: rnd(-200, -60),
        g: 500,
        t: 0,
        life: rnd(0.2, 0.4),
        s: rnd(2, 4),
        col: random() < 0.5 ? '#ffffff' : '#c58bff',
      });
  });
  if (o.burnT <= 0) o.burnT = O.every;
  G.shake = Math.max(G.shake, 2);
}
/** Before the beams come: red marks on the ground where each will start, and the way it will
 *  run for its first second, filling up as the moment comes. */
function orbMarks(e) {
  const O = EVIL.orb,
    o = e.orb;
  if (!o || o.t < O.rise * 0.5 || o.t > O.rise + O.warn) return;
  const u = clamp((o.t - O.rise * 0.5) / (O.rise * 0.5 + O.warn), 0, 1);
  ctx.save();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = `rgba(255,60,40,${0.25 + 0.3 * u})`;
    for (let k = 1; k <= 8; k++) {
      const [px, py] = orbSpot(i, k * 0.12);
      ctx.beginPath();
      ctx.ellipse(px - G.cam, py, 5, 2.5, 0, 0, TAU);
      ctx.fill();
    }
    const [x, y] = orbSpot(i, 0),
      r = O.hitR * 1.3;
    ctx.fillStyle = `rgba(255,60,40,${0.14 + 0.22 * u})`;
    ctx.beginPath();
    ctx.ellipse(x - G.cam, y, r, r * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = u > 0.7 ? '#ff3a3a' : 'rgba(255,140,110,.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x - G.cam, y, r * u, r * 0.45 * u, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}
/** The orb and its beams, over everything. */
function drawOrb(e) {
  const o = e.orb;
  if (!o) return;
  const x = o.x - G.cam,
    y = o.y - o.z,
    pulse = 1 + 0.08 * Math.sin(G.time * 18);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (o.spots) {
    const w = 12 + Math.sin(G.time * 70) * 2;
    for (const [sx, sy] of o.spots) {
      for (const [ww, c] of [
        [w * 1.6, 'rgba(176,92,255,.3)'],
        [w * 0.95, 'rgba(215,190,255,.55)'],
        [w * 0.45, 'rgba(255,255,255,.95)'],
      ]) {
        ctx.strokeStyle = c;
        ctx.lineCap = 'round';
        ctx.lineWidth = ww;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(sx - G.cam, sy);
        ctx.stroke();
      }
      const fl = ctx.createRadialGradient(sx - G.cam, sy, 2, sx - G.cam, sy, 36);
      fl.addColorStop(0, 'rgba(255,255,255,.9)');
      fl.addColorStop(1, 'rgba(176,92,255,0)');
      ctx.fillStyle = fl;
      ctx.fillRect(sx - G.cam - 36, sy - 36, 72, 72);
    }
  }
  const R = o.r * 2.2 * pulse,
    g = ctx.createRadialGradient(x, y, 2, x, y, R);
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(0.3, 'rgba(197,139,255,.8)');
  g.addColorStop(1, 'rgba(120,40,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  // a dark heart with a bright rim, and arcs of light wheeling round it
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#1a0f2a';
  ctx.beginPath();
  ctx.arc(x, y, o.r * 0.8 * pulse, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(215,170,255,.9)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const a0 = G.time * (2.5 + k) + (k * TAU) / 3;
    ctx.strokeStyle = k % 2 ? 'rgba(255,255,255,.8)' : 'rgba(197,139,255,.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y, o.r * 1.15, o.r * (0.35 + 0.15 * k), a0 * 0.3, a0, a0 + 2.2);
    ctx.stroke();
  }
  ctx.restore();
}

// --- drawing -----------------------------------------------------------------------------------

/** Which of her frames to show now. */
export function evilFrame(e) {
  const t = e.t,
    C = EVIL.combo;
  switch (e.state) {
    case 'eintro': {
      // laughing from the moment she steps out of her mist
      const I = EVIL.intro,
        u = Math.max(0, t - I.bats - I.mist + 0.35);
      return ['laugh', [0, 1, 2, 1, 2, 1, 2, 1][Math.floor(u / 0.13) % 8]];
    }
    case 'ecall':
    case 'tin':
      return ['laugh', [0, 1, 2, 1, 2, 1, 2, 1][Math.floor(t / 0.13) % 8]];
    case 'tout':
      return ['laugh', 0];
    case 'c0':
      return ['punch1', 0];
    case 'c1':
    case 'c2':
      return ['punch1', Math.min(4, 1 + Math.floor((t / C.t[0]) * 4))];
    case 'c3':
      return ['punch2', Math.min(4, Math.floor((t / C.t[2]) * 5))];
    case 'crec':
      return ['punch2', 4];
    case 'windup':
      return ['punch1', 0];
    case 'attack':
      return ['punch1', 2];
    case 'recover':
      return ['punch1', 4];
    case 'bthrow':
      return ['throw', Math.min(3, Math.floor(t / 0.09))];
    case 'eball':
      // the second frame, the ball held at her side, held while it gathers
      return ['hado', 1];
    case 'hrel':
      // then the rest of the throw
      return ['hado', Math.min(5, 2 + Math.floor(t / 0.06))];
    case 'erun':
      return ['run', Math.floor(e.anim / 0.07) % 6];
    case 'rrun':
      return ['run', Math.floor(e.anim / (t < EVIL.rush.accel ? 0.1 : 0.06)) % 6];
    case 'rjump': {
      const u = t / EVIL.rush.jump;
      return u < 0.3 ? ['jump', 1] : u < 0.92 ? ['punch2', u < 0.45 ? 1 : 2] : ['jump', 4];
    }
    case 'rland':
      return ['jump', 4];
    case 'air':
      return ['ko', Math.min(2, Math.floor(t / 0.1))];
    case 'down':
      return ['ko', 5];
    case 'getup':
      return ['ko', Math.max(3, 5 - Math.floor(t / 0.15))];
    case 'scharge':
      return ['orb', Math.min(5, Math.floor((t / EVIL.orb.charge) * 6))];
    case 'sfire':
      return ['orb', 6];
    case 'bjump': {
      const u = t / EVIL.jump.t;
      return ['jump', u < 0.1 ? 0 : u < 0.4 ? 1 : u < 0.65 ? 2 : u < 0.92 ? 3 : 4];
    }
    case 'hurt':
      return ['hurt', t < 0.16 ? 0 : 1];
    case 'edie':
      return ['ko', Math.min(5, Math.floor(t / 0.12))];
  }
  if (e.moving) return ['walk', Math.floor(e.walkT * 1.5) % 8];
  return ['idle', Math.floor(e.anim / 0.12) % 11];
}
/** How much of her is there (0 to 1): nothing while the bats wheel before her coming or while
 *  she is gone, and the fades into and out of the mist. */
export function evilShown(e) {
  const I = EVIL.intro,
    T = EVIL.tele;
  switch (e.state) {
    case 'eintro':
      return clamp((e.t - I.bats - I.mist + 0.35) / 0.35, 0, 1);
    case 'tout':
      return clamp(1 - e.t / T.out, 0, 1);
    case 'tgone':
      return 0;
    case 'tin':
      return clamp(e.t / T.in, 0, 1);
  }
  return 1;
}
/** Steadied by a flurry of blows: a dark glow round her (a faint red while medium, a strong red
 *  when heavy). Behind her, and never inside her red outline (it would turn solid red there). */
function evilAura(e) {
  if (!e.weight) return;
  const x = e.x - G.cam,
    y = e.y - e.z + 2,
    heavy = e.weight === 'heavy',
    g = ctx.createRadialGradient(x, y - 90, 8, x, y - 90, 120),
    c = '255,50,70';
  g.addColorStop(
    0,
    `rgba(${c},${((heavy ? 0.5 : 0.16) + (heavy ? 0.12 : 0.05) * Math.sin(G.time * 12)) * evilShown(e)})`,
  );
  g.addColorStop(1, `rgba(${c},0)`);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - 120, y - 210, 240, 240);
  ctx.restore();
}
/** The dark ball gathering in her hand: a glow round it, the bigger the stronger. */
function ballGlow(e) {
  if (e.state !== 'eball') return;
  const u = clamp(e.t / EVIL.ball.wind[e.lv - 1], 0, 1),
    [bx, by] = ballAt(e),
    R = (8 + 12 * e.lv) * (0.4 + 0.6 * u) * (1 + 0.1 * Math.sin(G.time * 30)),
    hx = bx - G.cam,
    hy = by - e.z,
    g = ctx.createRadialGradient(hx, hy, 1, hx, hy, R + 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  g.addColorStop(0, 'rgba(255,255,255,.9)');
  g.addColorStop(0.4, 'rgba(176,92,255,.7)');
  g.addColorStop(1, 'rgba(176,92,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(hx - R - 1, hy - R - 1, 2 * R + 2, 2 * R + 2);
  ctx.restore();
}
/** Her, and (unless `whole` is false: inside her red outline) the glows round her. */
export function drawEvil(e, whole = true) {
  const shown = evilShown(e);
  if (whole) evilAura(e);
  if (shown <= 0) return;
  const [name, i] = evilFrame(e),
    x = e.x - G.cam,
    y = e.y - e.z + 2,
    a =
      shown *
      (e.state === 'edie'
        ? clamp((3 - e.t) / 0.6, 0, 1)
        : e.flash > 0 && Math.floor(G.time * 30) % 2
          ? 0.55
          : 1);
  sprite(name, i, x, y, e.face < 0, 1, a);
  // the glint in her eyes before her chain of punches
  if (e.state === 'c0') {
    const u = e.t / EVIL.combo.glint,
      gx = x + e.face * 16,
      gy = y - 150,
      r = 4 + 10 * Math.sin(u * Math.PI);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,90,110,.9)';
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * TAU,
        rr = k % 2 ? r * 0.3 : r;
      ctx.lineTo(gx + Math.cos(ang) * rr, gy + Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  if (whole) ballGlow(e);
}

// --- her bats and her mist ---------------------------------------------------------------------

/** Violet bats wheeling round a spot on the ground, closing in and rising as they go. */
function batSwirl(x, y, n, life) {
  if (G.lowFx) n = Math.ceil(n / 2);
  for (let k = 0; k < n; k++)
    G.parts.push({
      k: 'bat',
      x,
      y,
      t: -rnd(0, life * 0.3),
      life,
      a0: (k / n) * TAU + rnd(-0.3, 0.3),
      w: (random() < 0.5 ? 1 : -1) * rnd(5, 8),
      r0: rnd(90, 140),
      r1: rnd(14, 30),
      h0: rnd(20, 80),
      h1: rnd(70, 150),
      s: rnd(10, 15),
      ph: rnd(TAU),
    });
}
/** Bats bursting out of her, scattering up and away. */
function batBurst(x, y, n) {
  if (G.lowFx) n = Math.ceil(n / 2);
  for (let k = 0; k < n; k++) {
    const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05),
      v = rnd(220, 420);
    G.parts.push({
      k: 'bat',
      x: x + rnd(-20, 20),
      y: y - rnd(50, 150),
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v * 0.6,
      g: -60,
      t: 0,
      life: rnd(0.5, 0.8),
      s: rnd(10, 15),
      ph: rnd(TAU),
    });
  }
}
/** Puffs of violet mist round a spot, from the ground up to her height. */
function mist(x, y, n, spread = 70) {
  if (G.lowFx) n = Math.ceil(n / 2);
  for (let k = 0; k < n; k++)
    G.parts.push({
      k: 'mist',
      x: x + rnd(-spread, spread),
      y: y - rnd(0, 150),
      vx: rnd(-25, 25),
      vy: rnd(-30, -5),
      t: 0,
      life: rnd(0.6, 1.1),
      s: rnd(26, 46),
      gy: y,
    });
}
/** Where she comes back to: on screen, well away from the player, often behind her. */
function teleSpot(e) {
  const T = EVIL.tele,
    lo = G.cam + 90,
    hi = G.cam + W - 90;
  let best = null;
  for (let k = 0; k < 12; k++) {
    const behind = random() < 0.5,
      side = behind ? -P.face || 1 : P.x >= e.x ? -1 : 1,
      x = clamp(P.x + side * rnd(T.min, T.min + 200), lo, hi),
      y = rnd(GT + 12, GB - 12);
    best = [x, y];
    if (Math.abs(x - P.x) >= T.min && Math.abs(x - e.x) > 120) break;
  }
  return best;
}
/** She vanishes in mist and bats (see EVIL.tele). */
function teleport(e) {
  faceP(e);
  const [tx, ty] = teleSpot(e);
  go(e, 'tout', 0, { engage: false, tx, ty, teleCd: rnd(...EVIL.tele.cd), swirled: false });
  mist(e.x, e.y, 10, 40);
  batBurst(e.x, e.y, 16);
  SFX.bats();
  SFX.warp();
}

// --- behaviour ---------------------------------------------------------------------------------

/** Where she holds her dark ball as it gathers (in the second frame of her throw). */
const ballAt = (e) => [e.x - e.face * 27, e.y - 100];
/** Sparks flying out of her ball as it gathers: more, and faster, the stronger it is. */
function ballSparks(e) {
  const [bx, by] = ballAt(e),
    n = [1, 2, 4][e.lv - 1];
  for (let k = 0; k < n; k++)
    if (random() < [0.4, 0.8, 1][e.lv - 1]) {
      const a = rnd(TAU),
        v = rnd(60, 120 + 90 * e.lv);
      G.parts.push({
        k: 'glow',
        x: bx,
        y: by - e.z,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 40,
        g: 200,
        t: 0,
        life: rnd(0.2, 0.35 + 0.1 * e.lv),
        s: rnd(2, 3 + e.lv),
        col: random() < 0.4 ? '#ffffff' : PURPLE,
      });
    }
}
/** Her fist this frame: the player and her own skeleton in front of her. */
function punch(e, dmg, knock) {
  const C = EVIL.combo;
  if (!e.hitDone && inFront(e, 10, C.reach, 24, knock ? 120 : 70)) {
    e.hitDone = true;
    evilHitP(e, dmg, e.face, knock);
  }
  for (const d of dandies())
    if (
      !e.hitSet.has(d) &&
      (d.x - e.x) * e.face > -10 &&
      (d.x - e.x) * e.face < C.reach + d.w &&
      Math.abs(d.y - e.y) < 24
    ) {
      e.hitSet.add(d);
      evilHurt(d, dmg, e.face, knock);
    }
}
/** A leap back, away from the player (or, with a wall behind her, the other way, over her). */
function leap(e) {
  const J = EVIL.jump;
  let dir = P.x >= e.x ? -1 : 1,
    dist = J.dist;
  if ((dir < 0 && e.x - G.cam < J.wall) || (dir > 0 && G.cam + W - e.x < J.wall)) {
    dir = -dir;
    dist *= 1.6;
  }
  const x1 = clamp(e.x + dir * dist, G.cam + 50, G.cam + W - 50);
  faceP(e);
  go(e, 'bjump', 0, { x0: e.x, x1, jumpCd: J.cd });
  SFX.jump();
  dust(e.x, e.y, 4);
}
/** A run one way along the road, for a while. */
function run(e, dir) {
  const [a, b] = EVIL.run.t;
  go(e, 'erun', 0, { engage: false, rdir: dir, dur: rnd(a, b), toward: (P.x - e.x) * dir > 0 });
}
/** As the heroine does, she mostly faces the way she walks: once she has gone one way along
 *  the road for a moment she turns that way, even away from the player. Now and then
 *  (`backpedal` of the time, chosen anew every `every` seconds) she steps back near the player
 *  still facing her. Standing, or in her attacks, she faces the player. */
function faceWay(e, dt) {
  const F = EVIL.face,
    dx = e.x - (e.px ?? e.x);
  e.px = e.x;
  if ((e.bpT = (e.bpT ?? 0) - dt) <= 0) {
    e.bpT = F.every;
    e.backpedal = random() < F.backpedal;
  }
  if (!['chase', 'roam'].includes(e.state) || Math.abs(dx) < F.min * dt) {
    e.wayT = 0;
    return;
  }
  const d = Math.sign(dx);
  e.wayT = d === e.way ? (e.wayT ?? 0) + dt : 0;
  e.way = d;
  const near = Math.abs(P.x - e.x) < F.near;
  if (e.wayT > F.turn && !(e.backpedal && near)) e.face = d;
}
const toChase = (e, extra) => go(e, 'chase', 0, { engage: false, ...extra });

export default defineFoe('evil', {
  draw: drawEvil,
  over: drawOrb,
  ground: orbMarks,
  init: {
    comboCd: [0.4, 1],
    ballCd: [2, 3.5],
    boneCd: [1.2, 2.6],
    jumpCd: [1, 2],
    runCd: [1, 2],
    rushCd: [3, 5],
    teleCd: [3, 5],
  },
  timers: ['comboCd', 'ballCd', 'boneCd', 'jumpCd', 'runCd', 'rushCd', 'teleCd'],
  spawn(e, side, placed) {
    if (!placed) {
      e.x = G.cam + W - 260;
      e.y = (GT + GB) / 2;
    }
    Object.assign(e, { state: 'eintro', face: -1, w: 22, stage: 1, rage: 0, orb: null });
    // her coming (EVIL.intro): first only bats wheeling round the spot, then the mist, then her
    batSwirl(e.x, e.y, 24, EVIL.intro.bats + EVIL.intro.mist * 0.6);
    SFX.bats();
    G.banner = { a: '@evil', b: 'evilBanner', t: 0 };
  },
  engageCap: Infinity,
  stand: 80,
  moves: [
    {
      // while her orb burns the arena, she only keeps away
      when: (e) => !!e.orb,
      go: (e) => go(e, 'roam', 0, { engage: false }),
    },
    {
      // half her health gone: she calls up her dandy
      when: (e) => !e.summoned && e.hp < e.T.hp * EVIL.summon,
      go(e) {
        e.summoned = true;
        go(e, 'ecall', 0, { engage: false, called: false });
        SFX.boss();
      },
    },
    {
      // full rage: her super
      when: (e) => e.stage >= 2 && e.rage >= EVIL.rage.max && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'scharge', 0, { engage: false });
        SFX.charge();
      },
    },
    {
      // from the second stage: gone in mist and bats, and back somewhere else (EVIL.tele) —
      // now and then, or (more often) to get away from blows up close
      when: (e, s, dt) =>
        e.stage >= 2 &&
        e.teleCd <= 0 &&
        onScreen(e) &&
        random() < dt * (s.adx < 140 && attacking() ? 4 : EVIL.tele.rate),
      go: teleport,
    },
    {
      // the player attacks close by: a leap back
      when: (e, s, dt) =>
        e.jumpCd <= 0 && s.adx < 120 && s.ady < 45 && attacking() && random() < dt * 5,
      go: leap,
    },
    {
      // a plain hit she took: now and then she leaps away from more
      when: (e) => e.dodge && e.jumpCd <= 0,
      go(e) {
        e.dodge = false;
        if (random() < 0.35) leap(e);
      },
    },
    {
      // up close: her chain of punches, after a glint in her eyes
      when: (e, s) => e.comboCd <= 0 && !s.pdown && s.adx < EVIL.combo.reach && s.ady < 22,
      go(e) {
        faceP(e);
        go(e, 'c0', 0, { engage: false });
      },
    },
    {
      // far off and lined up: a running jump kick, straight at the player
      when: (e, s) =>
        e.rushCd <= 0 && !s.pdown && s.adx > EVIL.rush.min && s.ady < 30 && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'rrun', 0, { engage: false, rdir: e.face, hitDone: false, hitSet: new Set() });
      },
    },
    {
      // at a distance and lined up: her dark ball, as strong as her stage
      when: (e, s) =>
        e.ballCd <= 0 && !s.pdown && s.adx > EVIL.ball.min && s.ady < 26 && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'eball', 0, { engage: false, lv: stageOf(e) });
        SFX.charge();
      },
    },
    {
      // a bone along the road (a fan of three in the third stage, which needs no lining up)
      when: (e, s) =>
        e.boneCd <= 0 &&
        !s.pdown &&
        s.adx > EVIL.bone.min &&
        s.ady < (e.stage >= 3 ? 90 : 26) &&
        onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'bthrow', 0, { engage: false, thrown: false });
      },
    },
    {
      // she mostly walks; now and then she runs to close in on a player far away...
      when: (e, s, dt) =>
        e.runCd <= 0 && s.adx > EVIL.run.far && random() < dt * EVIL.run.toward[stageOf(e) - 1],
      go: (e) => run(e, P.x >= e.x ? 1 : -1),
    },
    {
      // ...or to get away from one too near
      when: (e, s, dt) =>
        e.runCd <= 0 && s.adx < EVIL.run.near && random() < dt * EVIL.run.away[stageOf(e) - 1],
      go: (e) => run(e, P.x >= e.x ? -1 : 1),
    },
  ],
  attacks: [
    'c0',
    'c1',
    'c2',
    'c3',
    'crec',
    'bthrow',
    'eball',
    'hrel',
    'scharge',
    'sfire',
    'bjump',
    'ecall',
    'erun',
    'rrun',
    'rjump',
    'rland',
    'tout',
    'tgone',
    'tin',
  ],
  // nothing stops her gathering her ball from the second stage on, nor her orb in the third
  unstoppable: (e) =>
    (e.state === 'eball' && e.lv >= 2) ||
    (e.state === 'scharge' && e.stage >= 3) ||
    e.state === 'ecall',
  // nothing hurts her while she comes, nor while she is (all but) gone in her mist
  immune: (e) =>
    e.state === 'eintro' ||
    e.state === 'tgone' ||
    (e.state === 'tout' && e.t > EVIL.tele.out * 0.4) ||
    (e.state === 'tin' && e.t < EVIL.tele.in * 0.6),
  hidden: (e) => evilShown(e) <= 0,
  aura: evilAura,
  glow: ballGlow,
  // otherwise she takes blows as a light enemy does: a hit stops her, a heavy one throws her
  guard(e, knock, src, dir) {
    evilRage(e, EVIL.rage.hurt);
    // a flurry of blows steadies her: for a while she takes them as a medium enemy, and a few
    // more blows meanwhile make her heavy (nothing but a crushing blow moves her, no juggling)
    const S = EVIL.steady;
    if (e.weight === 'medium') {
      if (++e.more >= S.more) {
        e.weight = 'heavy';
        e.steadyT = S.heavyT;
      }
    } else if (!e.weight) {
      e.hits = (e.hits ?? []).filter((t) => G.time - t < S.window);
      e.hits.push(G.time);
      if (e.hits.length >= S.hits) {
        e.hits = [];
        e.more = 0;
        e.weight = 'medium';
        e.steadyT = S.t;
      }
    }
    if (FOES.evil.unstoppable(e) || e.state === 'sfire') return true;
    if (e.state === 'scharge') {
      // only a heavy blow breaks her super, and then her rage is gone
      if (!knock) return true;
      e.rage = 0;
      SFX.deny();
      return false;
    }
    if (!knock && e.state === 'chase') e.dodge = true;
    return false;
  },
  die(e, dir) {
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, { dying: true, engage: false, state: 'edie', t: 0, orb: null, vx: dir * 80 });
    finale(e);
    SFX.thud();
  },
  tick(e, dt) {
    if (e.dying) return;
    if (e.steadyT > 0 && (e.steadyT -= dt) <= 0) e.weight = undefined;
    e.stage = stageOf(e);
    if (e.stage >= 3) evilRage(e, EVIL.rage.passive * dt);
    if (e.orb) updOrb(e, dt);
    faceWay(e, dt);
  },
  states: {
    eintro(e, dt) {
      const I = EVIL.intro;
      faceP(e);
      // the mist gathers where the bats wheel; she steps out of it, laughing
      if (e.t > I.bats * 0.7 && e.t < I.bats + I.mist + 0.2 && random() < dt * 30)
        mist(e.x, e.y, 1, 55);
      if (e.t >= I.bats + I.mist && !e.came) {
        e.came = true;
        mist(e.x, e.y, 8, 50);
        G.flash = Math.max(G.flash ?? 0, 0.12);
        SFX.boss();
        SFX.laugh();
      }
      if (e.t > I.bats + I.mist + I.laugh) toChase(e);
    },
    tout(e) {
      if (e.t >= EVIL.tele.out) go(e, 'tgone', 0);
    },
    tgone(e, dt) {
      const T = EVIL.tele;
      if (!e.swirled) {
        // gone: she is already where she will come back (nobody can touch her meanwhile)
        e.swirled = true;
        e.x = e.tx;
        e.y = e.ty;
        e.px = e.x;
        batSwirl(e.tx, e.ty, 16, T.gone + T.in * 0.5);
        SFX.bats();
      }
      if (e.t > T.gone * 0.45 && random() < dt * 30) mist(e.tx, e.ty, 1, 45);
      if (e.t >= T.gone) {
        faceP(e);
        mist(e.x, e.y, 6, 40);
        go(e, 'tin', 0);
      }
    },
    tin(e) {
      faceP(e);
      if (e.t >= EVIL.tele.in) toChase(e);
    },
    ecall(e) {
      faceP(e);
      if (e.t > 0.45 && !e.called) {
        e.called = true;
        const x = clamp(e.x - e.face * 120, G.cam + 80, G.cam + W - 80),
          d = spawn('dandy', 0, x, e.y);
        d.face = e.face;
        G.flash = 0.2;
        motes(x, e.y - 60, 14, 200);
      }
      if (e.t > 0.9) toChase(e);
    },
    c0(e) {
      if (e.t > EVIL.combo.glint) go(e, 'c1', 0, { hitDone: false, hitSet: new Set() });
    },
    c1(e, dt) {
      const C = EVIL.combo;
      e.x += e.face * 70 * dt;
      if (e.t > 0.06) punch(e, C.dmg[0], false);
      if (e.t > C.t[0]) {
        go(e, 'c2', 0, { hitDone: false, hitSet: new Set() });
        SFX.swing();
      }
    },
    c2(e, dt) {
      const C = EVIL.combo;
      e.x += e.face * 70 * dt;
      if (e.t > 0.06) punch(e, C.dmg[1], false);
      if (e.t > C.t[1]) {
        go(e, 'c3', 0, { hitDone: false, hitSet: new Set() });
        SFX.swing();
      }
    },
    c3(e, dt) {
      const C = EVIL.combo;
      e.x += e.face * 130 * dt;
      if (e.t > 0.08 && e.t < 0.22) punch(e, C.dmg[2], true);
      if (e.t > C.t[2]) go(e, 'crec');
    },
    crec(e) {
      if (e.t > EVIL.combo.rec) toChase(e, { comboCd: rnd(...EVIL.combo.cd) });
    },
    bthrow(e) {
      const B = EVIL.bone;
      if (e.t > B.wind && !e.thrown) {
        e.thrown = true;
        SFX.swing();
        const fan = stageOf(e) >= 3 ? [-1, 0, 1] : [0];
        for (const k of fan)
          G.projs.push({
            k: 'ebone',
            x: e.x + e.face * 62,
            y: e.y,
            z: 116,
            vx: e.face * B.speed,
            vy: k * B.fan * B.speed,
            dmg: B.dmg,
            owner: e,
            rot: 0,
            life: 3,
          });
      }
      if (e.t > B.wind + 0.15) toChase(e, { boneCd: rnd(...B.cd) });
    },
    eball(e, dt, s) {
      const wind = EVIL.ball.wind[e.lv - 1];
      if (e.t < wind * 0.6) e.face = s.dx >= 0 ? 1 : -1;
      ballSparks(e);
      // gathered: the throw plays on and the ball flies as her hand comes forward
      if (e.t > wind) go(e, 'hrel', 0, { sent: false });
    },
    hrel(e) {
      if (e.t >= 0.12 && !e.sent) {
        e.sent = true;
        SFX.hado();
        if (e.lv === 3) {
          SFX.nova();
          G.flash = 0.2;
        }
        G.shake = Math.max(G.shake, 4 * e.lv);
        G.projs.push({
          k: 'ehado',
          lv: e.lv,
          x: e.x + e.face * (120 + 20 * e.lv),
          y: e.y,
          z: 104,
          vx: e.face * EVIL.ball.speed,
          dmg: EVIL.ball.dmg[e.lv - 1],
          owner: e,
          hit: new Set(),
          life: 2.6,
        });
      }
      if (e.t > 0.3) toChase(e, { ballCd: rnd(...EVIL.ball.cd) });
    },
    scharge(e) {
      const O = EVIL.orb,
        u = e.t / O.charge;
      if (random() < 0.3 + 0.6 * u) motes(e.x + e.face * 52, e.y - 112, 1, 60 + 140 * u);
      if (e.t >= O.charge) {
        e.rage = 0;
        e.orb = {
          t: 0,
          x0: e.x + e.face * 52,
          y0: e.y,
          z0: 112,
          x: e.x,
          y: e.y,
          z: 112,
          r: 16,
          cd: [0, 0, 0],
          burnT: 0,
          spots: null,
        };
        go(e, 'sfire');
        SFX.nova();
        G.flash = 0.3;
        G.shake = Math.max(G.shake, 8);
      }
    },
    sfire(e) {
      if (e.t > 0.45) go(e, 'roam', 0, { engage: false });
    },
    roam(e, dt, s) {
      // keeping her distance while the orb burns the arena; up close, a leap away
      faceP(e);
      if (!e.orb) return toChase(e);
      if (e.jumpCd <= 0 && s.adx < 130 && s.ady < 60) return leap(e);
      let side = e.x >= P.x ? 1 : -1;
      const tx = P.x + side * EVIL.orb.keep;
      if (tx < G.cam + 60 || tx > G.cam + W - 60) side = -side;
      moveTo(e, P.x + side * EVIL.orb.keep, P.y + (e.y > P.y ? 40 : -40), e.T.speed * 0.9, dt);
    },
    erun(e, dt, s) {
      const R = EVIL.run;
      e.face = e.rdir;
      e.x += e.rdir * R.speed * dt;
      e.y += clamp(P.y - e.y, -60 * dt, 60 * dt) * (e.toward ? 1 : 0);
      e.moving = true;
      if (random() < 0.3) dust(e.x - e.rdir * 20, e.y, 1);
      const edge = e.x < G.cam + 60 || e.x > G.cam + W - 60;
      if (e.t > e.dur || edge || (e.toward ? s.adx < 140 : s.adx > 330)) {
        e.x = clamp(e.x, G.cam + 60, G.cam + W - 60);
        toChase(e, { runCd: rnd(1.2, 2.2) });
      }
    },
    rrun(e, dt, s) {
      // gathering speed in a straight line, then the leap
      const R = EVIL.rush,
        sp = lerp(e.T.speed, EVIL.run.speed, clamp(e.t / R.accel, 0, 1));
      e.face = e.rdir;
      e.x += e.rdir * sp * dt;
      e.moving = true;
      if (random() < 0.5) dust(e.x - e.rdir * 20, e.y, 1);
      const ahead = (P.x - e.x) * e.rdir,
        edge = e.x < G.cam + 60 || e.x > G.cam + W - 60;
      if ((ahead < R.stop && e.t > R.accel) || e.t > R.run || edge) {
        go(e, 'rjump', 0, {
          x0: e.x,
          x1: clamp(e.x + e.rdir * R.dist, G.cam + 50, G.cam + W - 50),
        });
        SFX.jump();
        dust(e.x, e.y, 5);
      }
    },
    rjump(e) {
      // the flying kick: it lands on whoever is in front of her in the air's second half
      const R = EVIL.rush,
        u = Math.min(1, e.t / R.jump);
      e.x = lerp(e.x0, e.x1, u);
      e.z = 4 * R.h * u * (1 - u);
      if (u > 0.3 && u < 0.92) {
        if (
          !e.hitDone &&
          Math.abs(P.x - (e.x + e.rdir * 40)) < 60 &&
          Math.abs(P.y - e.y) < 26 &&
          P.z < 120
        ) {
          e.hitDone = true;
          evilHitP(e, R.dmg, e.rdir, true);
        }
        for (const d of dandies())
          if (
            !e.hitSet.has(d) &&
            Math.abs(d.x - (e.x + e.rdir * 40)) < 60 &&
            Math.abs(d.y - e.y) < 26
          ) {
            e.hitSet.add(d);
            evilHurt(d, R.dmg, e.rdir, true);
          }
      }
      if (u >= 1) {
        e.z = 0;
        dust(e.x, e.y, 6);
        go(e, 'rland');
      }
    },
    rland(e) {
      if (e.t > 0.3) toChase(e, { rushCd: rnd(...EVIL.rush.cd) });
    },
    bjump(e) {
      const J = EVIL.jump,
        u = Math.min(1, e.t / J.t);
      e.x = lerp(e.x0, e.x1, u);
      e.z = 4 * J.h * u * (1 - u);
      if (u >= 1) {
        e.z = 0;
        dust(e.x, e.y, 4);
        toChase(e);
      }
    },
    edie(e, dt) {
      e.x += (e.vx ?? 0) * dt;
      e.vx = (e.vx ?? 0) * Math.pow(0.05, dt);
      if (e.t > 3) e.dead = true;
    },
  },
});
