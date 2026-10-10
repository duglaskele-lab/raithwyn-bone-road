// The banshee (TYPES.banshee, BANSHEE): a ghost. She drifts about see-through, passing through
// everyone, and nothing can touch her then; she keeps her distance, then shows herself (now
// she can be hit) and wails: a cone in front of her stuns whoever stands in it on the ground.
// Step out of its depth (up or down the road) to get away. From further off she conjures
// instead: shown (and open to blows) while a skull of ghost fire swells between her claws,
// she lets it fly, slowly, at the player. Then she fades again. She is no skeleton: drawn as
// she is, and she dies dissolving into the air.
import { BANSHEE, OL, TAU, W } from '../config.js';
import { clamp, fxRandom, fxRnd, lerp, rnd } from '../util.js';
import { G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { hitPlayer, stunPlayer } from '../combat.js';
import { scoreMult } from '../style.js';
import { defineFoe } from './registry.js';
import { faceP, go, moveTo } from './kit.js';

/** How much of her can be seen (and hit) now: 0..1. */
export function ghostShown(e) {
  const B = BANSHEE;
  switch (e.state) {
    case 'gfloat':
      return B.ghost;
    case 'gshow':
      return lerp(B.ghost, 1, clamp(e.t / (B.show * 0.6), 0, 1));
    case 'gcast':
      return lerp(B.ghost, 1, clamp(e.t / B.castShow, 0, 1));
    case 'gfade':
      return lerp(1, B.ghost, clamp(e.t / B.fade, 0, 1));
    case 'gdie':
      return clamp(1 - e.t / 0.8, 0, 1);
  }
  return 1;
}
/** Is the heroine in her wail's cone? */
export function inWail(e) {
  const B = BANSHEE,
    f = (P.x - e.x) * e.face;
  if (f < 0 || f > B.range || P.z > 8) return false;
  return Math.abs(P.y - e.y) < lerp(B.w0, B.w1, f / B.range);
}
const drift = (e) => go(e, 'gfloat', 0, { engage: false, floatT: rnd(...BANSHEE.drift) });

export default defineFoe('banshee', {
  walksIn: true,
  init: { castCd: [2.5, 4.5] },
  timers: ['castCd'],
  spawn(e) {
    drift(e);
  },
  // whatever stops her, she goes back to drifting
  moves: [{ when: () => true, go: drift }],
  attacks: ['gshow', 'gwail', 'gcast'],
  // see-through, nothing touches her
  immune: (e) => ['gfloat', 'gfade', 'gdie'].includes(e.state),
  die(e) {
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, { dying: true, engage: false, state: 'gdie', t: 0 });
    SFX.wail();
  },
  states: {
    gfloat(e, dt, s) {
      // drifting a little way off the player, on her side, bobbing
      faceP(e);
      e.hover = 26 + 8 * Math.sin(e.anim * 2.2);
      const side = e.x >= P.x ? 1 : -1;
      moveTo(e, P.x + side * BANSHEE.keep, P.y + Math.sin(e.anim * 0.9) * 30, BANSHEE.speed, dt);
      e.moving = false;
      if (s.pdown || e.t < 0.8) return;
      const onScreen = e.x > G.cam + 40 && e.x < G.cam + W - 40;
      if (e.castCd <= 0 && onScreen && s.adx > BANSHEE.cast) {
        // from afar: she conjures a skull
        go(e, 'gcast', 0, { cast: false, castCd: rnd(...BANSHEE.castCd) });
        SFX.rise();
      } else if (e.t > e.floatT && s.ady < 40 && s.adx > 120 && s.adx < BANSHEE.range - 20) {
        go(e, 'gshow');
        SFX.rise();
      }
    },
    gshow(e) {
      // she shows herself: her mouth opening, the ground in front of her marked
      faceP(e);
      if (e.t > BANSHEE.show) {
        go(e, 'gwail', 0, { stunned: false });
        SFX.wail();
        G.shake = Math.max(G.shake, 4);
      }
    },
    gwail(e) {
      if (!e.stunned && inWail(e) && stunPlayer(BANSHEE.dmg, BANSHEE.stun)) e.stunned = true;
      if (e.t > BANSHEE.wail) go(e, 'gfade');
    },
    gcast(e) {
      // shown, her claws reaching out, a skull of ghost fire swelling between them; then
      // it flies, aimed at where the player stands
      const B = BANSHEE;
      if (e.t < B.castWind * 0.7) faceP(e);
      if (!e.cast && e.t >= B.castWind) {
        e.cast = true;
        const [hx, hz] = skullAt(e, 1),
          dx = P.x - hx,
          T = Math.max(0.5, Math.abs(dx) / B.skullSpeed);
        G.projs.push({
          k: 'skull',
          x: hx,
          y: e.y,
          z: hz,
          vx: e.face * B.skullSpeed,
          vy: clamp((P.y - e.y) / T, -80, 80),
          rot: 0,
          life: 9,
          hit: false,
        });
        SFX.warp();
        G.shake = Math.max(G.shake, 3);
      }
      if (e.t > B.castWind + B.castRec) go(e, 'gfade');
    },
    gfade(e) {
      if (e.t > BANSHEE.fade) drift(e);
    },
    gdie(e) {
      // gone into the air, wisps rising
      if (fxRandom() < 0.6)
        G.parts.push({
          k: 'glow',
          x: e.x + fxRnd(-30, 30),
          y: e.y - fxRnd(40, 160),
          vx: fxRnd(-20, 20),
          vy: fxRnd(-120, -40),
          g: 0,
          t: 0,
          life: fxRnd(0.4, 0.8),
          s: fxRnd(3, 6),
          col: GHOST,
        });
      if (e.t > 0.8) e.dead = true;
    },
  },
  // her wail's reach, marked faintly on the ground as she shows herself
  ground(e) {
    if (e.state !== 'gshow' && e.state !== 'gwail') return;
    const B = BANSHEE,
      x = e.x - G.cam,
      d = e.face,
      a = e.state === 'gwail' ? 0.22 : 0.08 + 0.1 * clamp(e.t / B.show, 0, 1);
    ctx.save();
    ctx.fillStyle = `rgba(140,255,220,${a})`;
    ctx.beginPath();
    ctx.moveTo(x, e.y - B.w0);
    ctx.lineTo(x + d * B.range, e.y - B.w1);
    ctx.lineTo(x + d * B.range, e.y + B.w1);
    ctx.lineTo(x, e.y + B.w0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
  aura: bansheeAura,
  draw: drawBanshee,
});

/** Her ghost fire's colour. */
const GHOST = '#8dffe0';
/** Where the skull she conjures is (x in the world, height off the ground), `u` grown. */
const skullAt = (e, u) => [e.x + e.face * (58 + 6 * u) * 1.2, e.z + (e.hover ?? 26) + 112 * 1.2];
/** How far the skull she conjures has swelled: 0..1. */
const castGrow = (e) => (e.state === 'gcast' && !e.cast ? clamp(e.t / BANSHEE.castWind, 0, 1) : 0);

/** The skull of ghost fire in flight: on, slowly, sinking to chest height, trailing green
 *  flame; it bursts on the player (knocking her down), or flies off the screen. */
export function skullBall(q, dt) {
  q.y += q.vy * dt;
  q.z += (80 - q.z) * Math.min(1, dt * 1.5);
  q.rot = Math.sin(q.life * 5) * 0.25;
  if (fxRandom() < 0.9)
    G.parts.push({
      k: 'glow',
      x: q.x - Math.sign(q.vx) * fxRnd(8, 22),
      y: q.y - q.z + fxRnd(-10, 10),
      vx: -q.vx * 0.3,
      vy: fxRnd(-50, -10),
      g: 0,
      t: 0,
      life: fxRnd(0.25, 0.5),
      s: fxRnd(3, 6),
      col: GHOST,
    });
  if (
    !q.hit &&
    Math.abs(P.x - q.x) < 28 &&
    Math.abs(P.y - q.y) < 24 &&
    P.z < q.z + 40 &&
    hitPlayer(BANSHEE.skullDmg, Math.sign(q.vx), true)
  ) {
    q.hit = true;
    q.life = 0;
    skullBurst(q);
  }
  if (q.x < G.cam - 100 || q.x > G.cam + W + 100) q.life = 0;
}
/** The skull bursts into ghost fire. */
export function skullBurst(q) {
  SFX.shatter();
  for (let k = 0; k < 14; k++)
    G.parts.push({
      k: 'glow',
      x: q.x,
      y: q.y - q.z,
      vx: fxRnd(-220, 220),
      vy: fxRnd(-240, 120),
      g: 0,
      t: 0,
      life: fxRnd(0.3, 0.6),
      s: fxRnd(3, 7),
      col: k % 3 ? GHOST : '#e8fff8',
    });
}
/** A skull of ghost fire, `r` px round, at (x, y) on the screen, facing `d`, eyes ablaze. */
export function drawSkull(x, y, r, d, rot = 0, a = 1) {
  ctx.save();
  ctx.translate(x, y);
  // the flame round it, licking back
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.6);
  g.addColorStop(0, `rgba(141,255,224,${0.55 * a})`);
  g.addColorStop(1, 'rgba(141,255,224,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-r * 2.6, -r * 2.6, r * 5.2, r * 5.2);
  ctx.fillStyle = `rgba(141,255,224,${0.45 * a})`;
  for (let k = 0; k < 4; k++) {
    const ph = G.time * 14 + k * 1.7,
      yy = (k - 1.5) * r * 0.45;
    ctx.beginPath();
    ctx.moveTo(d * r * 0.2, yy - r * 0.3);
    ctx.quadraticCurveTo(
      -d * r * 1.4,
      yy + Math.sin(ph) * r * 0.3,
      -d * r * (2 + 0.5 * Math.sin(ph * 1.3)),
      yy,
    );
    ctx.quadraticCurveTo(-d * r * 1.2, yy + r * 0.3, d * r * 0.2, yy + r * 0.3);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = a;
  ctx.rotate(rot);
  ctx.scale((d * r) / 16, r / 16);
  // the skull: a cranium, a jaw, black sockets with green fire in them
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.2;
  ctx.fillStyle = '#e9f4ee';
  ctx.beginPath();
  ctx.arc(0, -2, 15, Math.PI * 0.8, Math.PI * 2.2);
  ctx.lineTo(13, 8);
  ctx.lineTo(8, 16);
  ctx.lineTo(-6, 16);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c3d8cf';
  ctx.beginPath();
  ctx.ellipse(-6, 0, 5, 9, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#05070c';
  for (const [ex, rx] of [
    [2, 4.6],
    [10.5, 3.4],
  ]) {
    ctx.beginPath();
    ctx.ellipse(ex, -1, rx, 5, 0, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(7, 4);
  ctx.lineTo(9, 8);
  ctx.lineTo(5, 8);
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(-3 + k * 3.4, 11);
    ctx.lineTo(-3 + k * 3.4, 16);
    ctx.stroke();
  }
  ctx.fillStyle = GHOST;
  ctx.shadowColor = GHOST;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(2.5, -1, 2, 0, TAU);
  ctx.arc(10.5, -1, 1.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** A sickly glow round her (behind her, outside a red outline). */
function bansheeAura(e) {
  const a = ghostShown(e),
    x = e.x - G.cam,
    y = e.y - e.z - (e.hover ?? 26) - 90,
    g = ctx.createRadialGradient(x, y, 8, x, y, 130);
  g.addColorStop(0, `rgba(120,255,215,${0.28 * a})`);
  g.addColorStop(0.6, `rgba(60,120,140,${0.12 * a})`);
  g.addColorStop(1, 'rgba(60,120,140,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - 130, y - 130, 260, 260);
  ctx.restore();
}
/** Her: a gaunt, corpse-grey spirit in a shredded shroud that trails into wisps; wild black
 *  hair writhing as if under water; a skull-like face with black sockets and burning green
 *  eyes; long bony arms ending in claws. Her jaw drops wide when she wails; when she
 *  conjures, a skull of ghost fire swells between her claws. */
export function drawBanshee(e, whole = true) {
  const a = ghostShown(e) * (e.flash > 0 && Math.floor(G.time * 30) % 2 ? 0.6 : 1);
  if (whole) bansheeAura(e);
  const x = e.x - G.cam,
    y = e.y - e.z - (e.hover ?? 26),
    t = e.anim,
    f = e.face,
    wail = e.state === 'gwail',
    cast = e.state === 'gcast',
    open = wail
      ? 1
      : e.state === 'gshow'
        ? clamp(e.t / BANSHEE.show, 0, 1) * 0.6
        : cast
          ? 0.35
          : 0.1,
    fl = e.flash > 0,
    LINE = 'rgba(8,12,20,.9)',
    skin = fl ? '#ffffff' : '#c9d8de';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(f * 1.2, 1.2);
  ctx.globalAlpha = a;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // the hair: a long black mane writhing back as if under water, ragged at the ends, a few
  // loose strands trailing further
  const top = (u) => [-4 - 82 * u, -162 + 16 * u + Math.sin(t * 4 + u * 5) * 9 * u],
    bot = (u) => [-6 - 62 * u, -126 + 46 * u + Math.sin(t * 4 + u * 5 + 1) * 9 * u];
  ctx.fillStyle = '#090a12';
  ctx.beginPath();
  ctx.moveTo(8, -158);
  for (let i = 1; i <= 10; i++) ctx.lineTo(...top(i / 10));
  const [ax, ay] = top(1),
    [bx, by] = bot(1);
  for (let k = 1; k <= 5; k++) {
    const v = k / 5,
      mx = ax + (bx - ax) * v,
      my = ay + (by - ay) * v;
    ctx.lineTo(mx + 24 + 5 * Math.sin(t * 5 + k), my - 5);
    ctx.lineTo(mx - (k % 2 ? 16 : 4) - 6 * Math.sin(t * 6 + k * 2), my + 4);
  }
  for (let i = 10; i >= 0; i--) ctx.lineTo(...bot(i / 10));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#090a12';
  ctx.lineWidth = 2.4;
  for (const [u, k] of [
    [0.3, 0],
    [0.6, 1],
    [0.85, 2],
  ]) {
    const [x0, y0] = top(u),
      w = Math.sin(t * 5 + k * 2);
    ctx.beginPath();
    ctx.moveTo(x0 + 8, y0 + 4);
    ctx.quadraticCurveTo(x0 - 30, y0 - 18 + w * 10, x0 - 52, y0 - 6 + w * 14);
    ctx.stroke();
  }
  if (!e.flash) {
    // a cold sheen along it
    ctx.strokeStyle = '#2b3550';
    ctx.lineWidth = 1.6;
    for (const o of [6, 16]) {
      ctx.beginPath();
      for (let i = 1; i <= 8; i++) {
        const [x0, y0] = top(i / 10);
        i === 1 ? ctx.moveTo(x0, y0 + o) : ctx.lineTo(x0, y0 + o + (i / 10) * o * 0.8);
      }
      ctx.stroke();
    }
  }
  // the shroud, shredded, trailing into ragged wisps
  const shroud = () => {
    ctx.beginPath();
    ctx.moveTo(-12, -120);
    ctx.quadraticCurveTo(14, -126, 18, -106);
    ctx.quadraticCurveTo(24, -72, 16, -44);
    for (let k = 0; k <= 7; k++) {
      const u = k / 7,
        xx = 16 - 56 * u - 22 * u * u,
        yy = -44 + 26 * u + Math.sin(t * 6 + k) * 4;
      ctx.lineTo(xx + (k % 2 ? 4 : -2), yy + (k % 2 ? -14 : 12 + 6 * Math.sin(t * 3 + k)));
    }
    ctx.quadraticCurveTo(-50, -66, -24, -86);
    ctx.quadraticCurveTo(-22, -110, -12, -120);
    ctx.closePath();
  };
  ctx.fillStyle = fl ? '#ffffff' : '#56697c';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2.2;
  shroud();
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (!fl) {
    // a cold light down her front, darker folds, a torn chest showing ribs
    ctx.fillStyle = '#8aa3b5';
    ctx.beginPath();
    ctx.ellipse(10, -84, 9, 40, 0.15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,30,45,.6)';
    ctx.lineWidth = 1.8;
    for (const k of [0, 1, 2]) {
      ctx.beginPath();
      ctx.moveTo(-4 + k * 6, -100);
      ctx.quadraticCurveTo(-8 + k * 4, -70, -22 + k * 8, -36 + Math.sin(t * 4 + k) * 3);
      ctx.stroke();
    }
    ctx.fillStyle = '#1a2230';
    ctx.beginPath();
    ctx.moveTo(2, -112);
    ctx.lineTo(16, -108);
    ctx.lineTo(14, -88);
    ctx.lineTo(4, -92);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = skin;
    ctx.lineWidth = 2;
    for (const yy of [-106, -100, -94]) {
      ctx.beginPath();
      ctx.moveTo(4, yy);
      ctx.quadraticCurveTo(10, yy - 2, 15, yy + 1);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2.2;
  shroud();
  ctx.stroke();
  // long bony arms, reaching; hooked claws
  const reach = wail ? 1 : cast ? 0.85 : 0.5 + 0.1 * Math.sin(t * 2);
  for (const [o, dy, back] of [
    [-5, 7, true],
    [0, 0, false],
  ]) {
    const sx = 6 + o,
      sy = -110 + dy,
      ex = 24 + o + 6 * reach,
      ey = -96 + dy - 4 * reach,
      hx = cast ? 52 + o : 38 + 20 * reach + o,
      hy = cast ? -116 + dy * 2.4 : -92 - 18 * reach + dy;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = fl ? '#ffffff' : back ? '#9fb2bc' : skin;
    ctx.lineWidth = 3.4;
    ctx.stroke();
    // the claws: three long hooked fingers
    const ang = Math.atan2(hy - ey, hx - ex);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    for (const s of [-0.5, 0, 0.5]) {
      const cr = 0.25 * Math.sin(t * 7 + s * 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(8, s * 8, 14, s * 10 + 4 + cr * 6);
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 3.6;
      ctx.stroke();
      ctx.strokeStyle = fl ? '#ffffff' : '#e4eef2';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.restore();
  }
  // the head: gaunt, skull-like
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2.2;
  ctx.fillStyle = skin;
  const jaw = 4 + open * 14;
  ctx.beginPath();
  ctx.moveTo(-8, -150);
  ctx.quadraticCurveTo(6, -160, 16, -148);
  ctx.quadraticCurveTo(20, -138, 17, -130);
  ctx.lineTo(16, -124 + jaw * 0.6);
  ctx.quadraticCurveTo(12, -116 + jaw, 6, -118 + jaw);
  ctx.quadraticCurveTo(-4, -122, -8, -132);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!fl) {
    // hollow cheeks, a crack across the brow
    ctx.fillStyle = 'rgba(40,60,75,.45)';
    ctx.beginPath();
    ctx.ellipse(10, -129, 4, 5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,30,45,.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, -154);
    ctx.lineTo(2, -148);
    ctx.lineTo(0, -144);
    ctx.stroke();
  }
  // hair over the brow
  ctx.fillStyle = '#090a12';
  ctx.beginPath();
  ctx.moveTo(-10, -132);
  ctx.quadraticCurveTo(-12, -158, 6, -160);
  ctx.quadraticCurveTo(18, -158, 18, -146);
  ctx.quadraticCurveTo(8, -152, 2, -146);
  ctx.quadraticCurveTo(-2, -140, -4, -130);
  ctx.closePath();
  ctx.fill();
  // black sockets, green fire burning in them
  ctx.fillStyle = '#020306';
  for (const [ex, rx] of [
    [6, 4.4],
    [14, 3],
  ]) {
    ctx.beginPath();
    ctx.ellipse(ex, -140, rx, 5 + open, 0.15, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = GHOST;
  ctx.shadowColor = GHOST;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(6.5, -140, 1.8 + open * 0.8, 0, TAU);
  ctx.arc(14, -140, 1.4 + open * 0.6, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  // her mouth: a long black gape, jagged teeth top and bottom
  ctx.fillStyle = '#020306';
  ctx.beginPath();
  ctx.ellipse(10, -126 + jaw * 0.35, 3 + open * 2.5, 1.5 + jaw * 0.45, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = fl ? '#ffffff' : '#eef4e8';
  const my = -126 + jaw * 0.35,
    mh = 1.5 + jaw * 0.45,
    mw = 3 + open * 2.5;
  for (const k of [-1, 0, 1]) {
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(10 + k * mw * 0.6 - 1.2, my + sgn * mh);
      ctx.lineTo(10 + k * mw * 0.6 + 1.2, my + sgn * mh);
      ctx.lineTo(10 + k * mw * 0.6, my + sgn * (mh - 2.6));
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
  // the skull she conjures, swelling between her claws
  const grow = castGrow(e);
  if (grow > 0) {
    const [sx, sz] = skullAt(e, grow);
    drawSkull(sx - G.cam, e.y - sz, 4 + 16 * grow, f, 0, a);
  }
  // the wail: rings of sound rolling out of her mouth
  if (wail) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const u = (e.t * 2.2 + k / 4) % 1,
        r = 20 + u * BANSHEE.range * 0.8;
      ctx.strokeStyle = `rgba(150,255,225,${0.55 * (1 - u)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x + f * (14 + r * 0.5), y - 124 + r * 0.25, r * 0.18, 16 + r * 0.22, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
}
