// Draws the world, the HUD and the title screen.
import {
  ACID,
  DECOR,
  FONT,
  H,
  LUCK,
  LUCY,
  MAXR,
  OL,
  PURPLE,
  RL,
  RW,
  SLAM_R,
  SWIND,
  SWIND_LOCK,
  TAU,
  W,
} from './config.js';
import { clamp, ease } from './util.js';
import { FR } from './atlas-frames.js';
import { G, P } from './state.js';
import { atlas, ctx, fighterFrame, portraits, ready, rr, setCtx, sprite, txt } from './gfx.js';
import { STR, foeName, lang, t } from './i18n.js';
import { touch } from './input.js';
import { canFullScreen } from './touch.js';
import { RANKS, STYLE_STEP, dmgMult, scoreMult, styleRank } from './style.js';
import { drawBG, drawFog, drawVignette } from './background.js';
import { drawBG2, drawFront2 } from './bg2.js';
import { levelWaves, roadDir } from './level.js';
import { hadoLevel } from './combat.js';
import { boneShape, drawAura, drawSkel } from './skeleton.js';
import { drawBike } from './foes/bikes.js';
import { FOES } from './foes/registry.js';
import { stick } from './foes/dynamite.js';
import {
  drawDragon,
  drawDragonBeam,
  drawDragonGround,
  drawDragonPart,
  drawShocks,
} from './dragon.js';

export function shadow(x, y, z, r) {
  const k = clamp(1 - z / 260, 0.45, 1);
  ctx.fillStyle = 'rgba(14,26,30,.34)';
  ctx.beginPath();
  ctx.ellipse(x - G.cam, y + 1, r * k, r * 0.26 * k, 0, 0, TAU);
  ctx.fill();
}
export function bar(x, y, w, h, v, lag, col, skew = 6) {
  const pth = (ww) => {
    ctx.beginPath();
    ctx.moveTo(x + skew, y);
    ctx.lineTo(x + skew + ww, y);
    ctx.lineTo(x + ww, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  };
  pth(w);
  ctx.fillStyle = 'rgba(16,14,24,.85)';
  ctx.fill();
  if (lag > v) {
    pth(w * clamp(lag, 0, 1));
    ctx.fillStyle = '#ff4a5e';
    ctx.fill();
  }
  if (v > 0) {
    pth(w * clamp(v, 0, 1));
    ctx.fillStyle = col;
    ctx.fill();
  }
  pth(w);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ece5cb';
  ctx.stroke();
}
export function drawItem(it) {
  // a magazine about to go: it blinks
  if (it.kind === 'ammo' && it.lie > LUCY.lies - 0.8 && Math.floor(it.lie * 14) % 2) return;
  const x = it.x - G.cam,
    y = it.y - it.z - 14 - Math.sin(it.t * 5) * 3;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = OL;
  if (it.kind === 'ammo') {
    // a pistol magazine: a gently curved steel case, a round lying across the feed lips on top,
    // a broad base plate, a witness hole down the side; it lies tilted
    ctx.scale(1.28, 1.28);
    ctx.rotate(0.35);
    ctx.lineWidth = 2;
    ctx.strokeStyle = OL;
    // the round on top, lying across the feed lips, its bullet forward
    ctx.fillStyle = '#e0b04a';
    ctx.fillRect(-6, -18, 8, 5);
    ctx.strokeRect(-6, -18, 8, 5);
    ctx.fillStyle = '#c46a3a';
    ctx.beginPath();
    ctx.moveTo(2, -18);
    ctx.quadraticCurveTo(9, -15.5, 2, -13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // the body, bent a little forward like a horn
    ctx.beginPath();
    ctx.moveTo(-6, -13);
    ctx.lineTo(6, -13);
    ctx.quadraticCurveTo(9, 0, 8, 11);
    ctx.lineTo(-5, 11);
    ctx.quadraticCurveTo(-3, 0, -6, -13);
    ctx.closePath();
    ctx.fillStyle = '#3d4456';
    ctx.fill();
    ctx.stroke();
    // a light along its front edge
    ctx.strokeStyle = '#b4c0da';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(3.5, -11);
    ctx.quadraticCurveTo(6, 0, 5.5, 9);
    ctx.stroke();
    // the witness holes
    ctx.fillStyle = '#e0b04a';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(-1 + k * 0.4, -6 + k * 5.5, 1.3, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // the base plate
    ctx.fillStyle = '#2c2f38';
    ctx.lineWidth = 1.8;
    rr(-7, 10, 17, 5, 1.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c94a3a'; // a red stripe, to find it on the ground
    ctx.fillRect(-5.5, 11.6, 14, 1.8);
    // a glint, now and then
    if (Math.floor(G.time * 2) % 3 === 0) {
      ctx.fillStyle = 'rgba(255,250,220,.9)';
      ctx.beginPath();
      ctx.arc(-3, -9, 2, 0, TAU);
      ctx.fill();
    }
  } else if (it.kind === 'hp') {
    ctx.fillStyle = '#ff4a5e';
    ctx.beginPath();
    ctx.moveTo(0, 11);
    ctx.bezierCurveTo(-18, -3, -10, -15, 0, -6);
    ctx.bezierCurveTo(10, -15, 18, -3, 0, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.arc(-5, -5, 2.2, 0, TAU);
    ctx.fill();
  } else {
    ctx.shadowColor = PURPLE;
    ctx.shadowBlur = 14;
    ctx.fillStyle = PURPLE;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(9, -2);
    ctx.lineTo(0, 12);
    ctx.lineTo(-9, -2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.fillStyle = '#ecd9ff';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(9, -2);
    ctx.lineTo(0, -2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
export function drawUrn(u) {
  const x = u.x - G.cam,
    y = u.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = OL;
  ctx.fillStyle = '#62808a';
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-8, -6);
  ctx.bezierCurveTo(-24, -18, -20, -38, -8, -42);
  ctx.lineTo(-11, -50);
  ctx.lineTo(11, -50);
  ctx.lineTo(8, -42);
  ctx.bezierCurveTo(20, -38, 24, -18, 8, -6);
  ctx.lineTo(10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  ctx.beginPath();
  ctx.ellipse(-7, -26, 3.5, 10, 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = u.drop === 'hp' ? '#ff8f9d' : '#d2a8ff';
  ctx.globalAlpha = 0.6 + 0.3 * Math.sin(G.time * 3 + u.x);
  ctx.beginPath();
  ctx.arc(2, -25, 3, 0, TAU);
  ctx.fill();
  ctx.restore();
}
// Breakable scenery: a big grave (cracks with every hit), a bench or a stone cross.
export function drawDecor(u) {
  const fl = G.time < (u.flashT || 0),
    D = DECOR[u.decor];
  ctx.save();
  ctx.translate(u.x - G.cam, u.y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = OL;
  const fill = (c) => {
    ctx.fillStyle = fl ? '#fff' : c;
    ctx.fill();
    ctx.stroke();
  };
  if (u.decor === 'tomb') {
    // a big gravestone on a plinth, with a skull carved in; cracks grow with every hit
    ctx.beginPath();
    ctx.rect(-40, -16, 80, 16);
    fill('#566266');
    ctx.beginPath();
    ctx.moveTo(-30, -16);
    ctx.lineTo(-30, -78);
    ctx.quadraticCurveTo(-30, -112, 0, -114);
    ctx.quadraticCurveTo(30, -112, 30, -78);
    ctx.lineTo(30, -16);
    ctx.closePath();
    fill(D.col);
    ctx.strokeStyle = 'rgba(23,21,29,.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -78, 11, 0, TAU);
    ctx.moveTo(-5, -80);
    ctx.arc(-5, -80, 3, 0, TAU);
    ctx.moveTo(8, -80);
    ctx.arc(5, -80, 3, 0, TAU);
    ctx.moveTo(-6, -62);
    ctx.lineTo(6, -62);
    ctx.moveTo(-18, -44);
    ctx.lineTo(18, -44);
    ctx.moveTo(-14, -36);
    ctx.lineTo(14, -36);
    ctx.stroke();
    ctx.fillStyle = 'rgba(96,140,92,.55)';
    ctx.beginPath();
    ctx.ellipse(-20, -14, 16, 5, 0, 0, TAU);
    ctx.ellipse(24, -2, 12, 4, 0, 0, TAU);
    ctx.fill();
    const cracks = [
      [12, -112, 4, -96, 14, -84],
      [-24, -70, -12, -60, -20, -46],
      [24, -60, 14, -48, 22, -30],
    ];
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    for (const c of cracks.slice(0, D.hp - u.hp)) {
      ctx.beginPath();
      ctx.moveTo(c[0], c[1]);
      ctx.lineTo(c[2], c[3]);
      ctx.lineTo(c[4], c[5]);
      ctx.stroke();
    }
  } else if (u.decor === 'barrel' || u.decor === 'tnt') {
    // a barrel: staves bulging out, iron hoops; the red one has TNT on it and a fuse
    const red = u.decor === 'tnt',
      body = red ? '#b02a1e' : D.col;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.quadraticCurveTo(-27, -27, -20, -54);
    ctx.lineTo(20, -54);
    ctx.quadraticCurveTo(27, -27, 20, 0);
    ctx.closePath();
    fill(body);
    ctx.strokeStyle = 'rgba(23,21,29,.35)';
    ctx.lineWidth = 1.5;
    for (const sx of [-12, -4, 4, 12]) {
      ctx.beginPath();
      ctx.moveTo(sx * 0.9, -2);
      ctx.quadraticCurveTo(sx * 1.3, -27, sx * 0.9, -52);
      ctx.stroke();
    }
    ctx.fillStyle = fl ? '#fff' : '#4a4850';
    for (const hy of [-46, -10]) ctx.fillRect(-23, hy - 2, 46, 5);
    ctx.beginPath();
    ctx.ellipse(0, -54, 20, 5, 0, 0, TAU);
    fill(red ? '#7a1a12' : '#6a4428');
    if (red) {
      ctx.fillStyle = '#f2e2b0';
      ctx.font = `900 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TNT', 0, -28);
      // the fuse; lit, it spits sparks and the barrel blinks
      ctx.strokeStyle = '#2c2a2e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(4, -56);
      ctx.quadraticCurveTo(10, -66, 6, -72);
      ctx.stroke();
      if (u.fuseT !== undefined) {
        ctx.fillStyle = Math.floor(G.time * 16) % 2 ? '#fff6c0' : '#ff8a2a';
        ctx.beginPath();
        ctx.arc(6, -73, 4 + Math.random() * 2, 0, TAU);
        ctx.fill();
        if (Math.floor(G.time * 10) % 2) {
          ctx.fillStyle = 'rgba(255,240,180,.35)';
          ctx.fillRect(-24, -56, 48, 56);
        }
      }
    } else if (u.hp < D.hp) {
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -50);
      ctx.lineTo(2, -36);
      ctx.lineTo(-4, -24);
      ctx.moveTo(10, -8);
      ctx.lineTo(4, -20);
      ctx.stroke();
    }
  } else if (u.decor === 'bench') {
    for (const lx of [-26, 22]) {
      ctx.beginPath();
      ctx.rect(lx, -22, 5, 22);
      fill('#2f2b33');
    }
    ctx.beginPath();
    ctx.rect(-34, -26, 68, 7);
    fill(D.col);
    for (const sy of [-52, -42]) {
      ctx.beginPath();
      ctx.rect(-32, sy, 64, 6);
      fill('#8a6544');
    }
    for (const lx of [-28, 24]) {
      ctx.beginPath();
      ctx.rect(lx, -54, 4, 30);
      fill('#2f2b33');
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-5, -38);
    ctx.lineTo(-17, -38);
    ctx.lineTo(-17, -48);
    ctx.lineTo(-5, -48);
    ctx.lineTo(-5, -62);
    ctx.lineTo(5, -62);
    ctx.lineTo(5, -48);
    ctx.lineTo(17, -48);
    ctx.lineTo(17, -38);
    ctx.lineTo(5, -38);
    ctx.lineTo(5, 0);
    ctx.closePath();
    fill(D.col);
  }
  ctx.restore();
}
// A puddle of the necromancer's acid, bubbling until it dries up.
export function drawPool(a) {
  const k = Math.min(1, a.t / 0.2) * Math.min(1, (a.life - a.t) / 0.6),
    x = a.x - G.cam;
  ctx.save();
  ctx.globalAlpha = 0.85 * k;
  ctx.fillStyle = '#3f9f1e';
  ctx.beginPath();
  ctx.ellipse(x, a.y, ACID.rx * (0.6 + 0.4 * k), ACID.ry * (0.6 + 0.4 * k), 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#86e83c';
  ctx.beginPath();
  ctx.ellipse(x - 6, a.y - 2, ACID.rx * 0.62 * k, ACID.ry * 0.5 * k, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#d9ffb0';
  for (let i = 0; i < 4; i++) {
    const u = (G.time * 1.6 + i * 0.25 + a.seed) % 1;
    ctx.globalAlpha = k * (1 - u);
    ctx.beginPath();
    ctx.arc(x + Math.sin(i * 2.3 + a.seed) * ACID.rx * 0.6, a.y - u * 10, 2 + 2 * u, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
export function drawDebris(d) {
  const a = Math.min(1, d.life * 1.5);
  ctx.save();
  ctx.globalAlpha = a;
  if (d.k === 'dpart') {
    drawDragonPart(d);
    ctx.restore();
    return;
  }
  if (d.k === 'bike') {
    ctx.translate(d.x - G.cam, d.gy);
    ctx.scale(d.dir, 1 - 0.58 * ease(d.tilt));
    drawBike(d.x * 0.05, d.hog);
    ctx.restore();
    return;
  }
  ctx.translate(d.x - G.cam, d.gy - d.z - 3);
  ctx.rotate(d.rot);
  if (d.k === 'bone') boneShape(d.len, 4.2, d.col);
  else if (d.k === 'shard') {
    ctx.fillStyle = d.col;
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-d.len, -2);
    ctx.lineTo(d.len * 0.6, -d.len * 0.6);
    ctx.lineTo(d.len * 0.4, d.len * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.translate(0, -d.len + 3);
    ctx.fillStyle = d.col;
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, d.len, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = OL;
    ctx.beginPath();
    ctx.ellipse(3, -1, d.len * 0.3, d.len * 0.36, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(d.len * 0.75, -1, d.len * 0.18, d.len * 0.3, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
export function drawProj(q) {
  const x = q.x - G.cam,
    y = q.y - q.z;
  if (q.k === 'nade') {
    // Lucy's grenade, spinning round its middle
    const [img, f] = fighterFrame('lucy', 'nade', 0);
    if (!img.complete || !img.naturalWidth) return;
    ctx.save();
    ctx.translate(x, y - f[5] / 2);
    ctx.rotate(q.rot);
    ctx.drawImage(img, f[0], f[1], f[2], f[3], -f[4], -f[5] / 2, f[2], f[3]);
    ctx.restore();
    return;
  }
  if (q.k === 'tnt') {
    // a lit stick of dynamite; it blinks faster as the fuse burns down
    ctx.save();
    ctx.translate(x, y - 5);
    ctx.rotate(q.rot);
    stick(24, true, q.fuse < 1 && Math.floor(G.time * (q.fuse < 0.5 ? 16 : 8)) % 2 === 0);
    ctx.restore();
    return;
  }
  if (q.k === 'zspit') {
    // a zombie curled up in a ball of slime
    ctx.save();
    ctx.translate(x, y - 20);
    ctx.rotate(q.rot);
    ctx.fillStyle = 'rgba(111,226,58,.85)';
    ctx.strokeStyle = '#17301a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c8d4a8';
    ctx.beginPath();
    ctx.arc(6, -4, 10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#10200e';
    ctx.beginPath();
    ctx.arc(9, -6, 2.5, 0, TAU);
    ctx.arc(3, -6, 2.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#c8d4a8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-14, 8);
    ctx.lineTo(4, 14);
    ctx.moveTo(-10, -12);
    ctx.lineTo(-16, 4);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (q.k === 'hado') {
    const f = q.vx < 0,
      sc = [1, 1.5, 2.2][q.lv - 1] * (1.05 + 0.1 * Math.sin(G.time * 40));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    const R = 70 * sc,
      g = ctx.createRadialGradient(x, y, 4, x, y, R);
    g.addColorStop(0, 'rgba(176,92,255,.7)');
    g.addColorStop(1, 'rgba(176,92,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
    ctx.restore();
    sprite('fx', 0, x, y, f, sc);
    return;
  }
  if (q.k === 'zhead') {
    drawDebris({ k: 'skull', x: q.x, gy: q.y, z: q.z, rot: q.rot, len: 12, col: q.col, life: 1 });
    return;
  }
  if (q.k === 'plasma') {
    // a crackling ball of violet plasma
    const r = 13 + Math.sin(G.time * 45 + q.x) * 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 2, x, y, r * 3.2);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.3, 'rgba(210,150,255,.75)');
    g.addColorStop(1, 'rgba(140,50,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
    ctx.strokeStyle = 'rgba(240,220,255,.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = G.time * 20 + i * 2.1 + q.x * 0.1;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3);
      ctx.lineTo(x + Math.cos(a + 0.5) * r * 2, y + Math.sin(a + 0.5) * r * 2);
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#f6eaff';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, TAU);
    ctx.fill();
    return;
  }
  if (q.k === 'bullet') {
    // a streak of light along its path
    const d = Math.sign(q.vx) || q.d,
      len = q.big ? 150 : 70,
      g = ctx.createLinearGradient(x - d * len, y, x, y);
    g.addColorStop(0, 'rgba(255,220,120,0)');
    g.addColorStop(1, 'rgba(255,250,220,1)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = g;
    ctx.lineWidth = q.big ? 11 : 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - d * len, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (q.k === 'acid') {
    const r = 11 + Math.sin(G.time * 30) * 1.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 2, x, y, 34);
    g.addColorStop(0, 'rgba(157,255,74,.55)');
    g.addColorStop(1, 'rgba(157,255,74,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 34, y - 34, 68, 68);
    ctx.restore();
    ctx.fillStyle = '#5fd12a';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d9ffb0';
    ctx.beginPath();
    ctx.arc(x - 3.5, y - 4, 3.5, 0, TAU);
    ctx.fill();
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(q.rot);
  if (q.k === 'bone') {
    ctx.shadowColor = PURPLE;
    ctx.shadowBlur = 12;
    boneShape(22, 5, '#f6f0ff');
  } else boneShape(20, 4.6, '#ece5cb');
  ctx.restore();
}
// A red outline round an enemy in an attack no hit can stop. The enemy is drawn alone on a
// layer; its silhouette, made solid and red, is stamped a few pixels around itself and the
// silhouette's own area cut out, leaving a ring; the ring and then the layer go on screen.
const layers = {};
function canvasLayer(name, w, h) {
  let c = layers[name];
  if (!c || c.width !== w || c.height !== h)
    c = layers[name] = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, w, h);
  return [c, x];
}
function outlined(draw, e) {
  if (!FOES[e.type]?.unstoppable?.(e) || typeof document === 'undefined') return draw;
  // a light picture (G.lowFx): no layers, a blinking red tint instead of the ring
  if (G.lowFx)
    return (e) => {
      draw(e);
      if (Math.floor(G.time * 12) % 2) return;
      ctx.fillStyle = 'rgba(255,40,40,.3)';
      ctx.beginPath();
      ctx.ellipse(
        e.x - G.cam,
        e.y - e.z - 90 * e.T.scale,
        60 * e.T.scale,
        110 * e.T.scale,
        0,
        0,
        TAU,
      );
      ctx.fill();
    };
  return (e) => {
    const main = ctx,
      w = main.canvas.width,
      h = main.canvas.height,
      [layer, lc] = canvasLayer('layer', w, h),
      [sil, sc] = canvasLayer('sil', w, h),
      [ring, rc] = canvasLayer('ring', w, h);
    // a glow round it is not part of its shape: it goes straight on screen, unoutlined
    if (!e.T.dragon) drawAura(e);
    lc.setTransform(main.getTransform());
    setCtx(lc);
    draw(e, false);
    setCtx(main);
    // the silhouette: red, and drawn over itself until even see-through parts are solid
    sc.drawImage(layer, 0, 0);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = '#ff2a2a';
    sc.fillRect(0, 0, w, h);
    sc.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 4; i++) sc.drawImage(sil, 0, 0);
    const r = 3 * (w / W);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      rc.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r);
    }
    rc.globalCompositeOperation = 'destination-out';
    rc.drawImage(sil, 0, 0);
    main.save();
    main.setTransform(1, 0, 0, 1, 0, 0);
    main.globalAlpha = 0.8 + 0.2 * Math.sin(G.time * 18);
    main.drawImage(ring, 0, 0);
    main.globalAlpha = 1;
    main.drawImage(layer, 0, 0);
    main.restore();
  };
}
export function drawPart(p) {
  const u = p.t / p.life,
    x = p.x - G.cam,
    y = p.y;
  switch (p.k) {
    case 'star': {
      const s = p.s * (0.5 + u * 0.7);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = 1 - u * u;
      ctx.fillStyle = p.col;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU,
          r = i % 2 ? s * 0.32 : s * (i % 4 === 0 ? 1 : 0.7);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'dot':
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = p.col;
      ctx.fillRect(x - p.s / 2, y - p.s / 2, p.s, p.s);
      ctx.globalAlpha = 1;
      break;
    case 'dust':
      ctx.globalAlpha = (1 - u) * 0.5;
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(x, y, p.s * (0.6 + u), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    case 'glow':
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(x, y, p.s * (1 - u * 0.5), 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    case 'blast': {
      // a plasma explosion: a white-hot core that swells into a violet fireball and fades
      const r = p.s * (0.45 + 0.75 * ease(Math.min(1, u * 1.6))),
        a = 1 - u,
        cy = y - r * 0.55;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, cy, 2, x, cy, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.35, `rgba(235,190,255,${0.9 * a})`);
      g.addColorStop(0.7, `rgba(170,80,255,${0.55 * a})`);
      g.addColorStop(1, 'rgba(120,40,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, cy, r, r * 0.85, 0, 0, TAU);
      ctx.fill();
      // scorched light on the ground
      const gg = ctx.createRadialGradient(x, y, 2, x, y, r * 1.2);
      gg.addColorStop(0, `rgba(230,200,255,${0.6 * a})`);
      gg.addColorStop(1, 'rgba(160,80,255,0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.2, r * 0.4, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'boom': {
      // a fire blast: a white-hot flash, an orange fireball rising and a scorch on the ground
      const r = p.s * (0.35 + 0.65 * ease(Math.min(1, u * 1.8))),
        a = 1 - u,
        cy = y - (p.z || 0) - r * 0.5 - u * 40;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, cy, 2, x, cy, r);
      g.addColorStop(0, `rgba(255,255,230,${a})`);
      g.addColorStop(0.3, `rgba(255,210,90,${0.95 * a})`);
      g.addColorStop(0.65, `rgba(255,110,30,${0.7 * a})`);
      g.addColorStop(1, 'rgba(200,40,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, cy, r, r * 0.8, 0, 0, TAU);
      ctx.fill();
      const gg = ctx.createRadialGradient(x, y, 2, x, y, r * 1.1);
      gg.addColorStop(0, `rgba(255,190,90,${0.6 * a})`);
      gg.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.1, r * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'neon':
      // a critical shot: a red neon "crit!" over the one it hit, rising a little
      neon(x, y - u * 18, 'crit!', 20, 'red', Math.min(1, (1 - u) * 3), p.t);
      break;
    case 'tracer':
      // a bullet's streak from the muzzle to where it lands
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - u;
      ctx.strokeStyle = '#ffe9a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (p.x2 - p.x) * (0.4 + u * 0.6), y + (p.y2 - p.y) * (0.4 + u * 0.6));
      ctx.stroke();
      ctx.restore();
      break;
    case 'smoke':
      ctx.globalAlpha = (1 - u) * 0.45;
      ctx.fillStyle = '#3a302c';
      ctx.beginPath();
      ctx.arc(x, y, p.s * (0.6 + u * 1.2), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    case 'fxring':
      sprite('fx', 1, x, y, false, 1 + u * 2.2, 1 - u);
      break;
    case 'ring':
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - u;
      ctx.strokeStyle = '#d2a8ff';
      ctx.lineWidth = 26 * (1 - u) + 2;
      ctx.beginPath();
      ctx.arc(x, y, p.s * ease(u), 0, TAU);
      ctx.stroke();
      ctx.restore();
      break;
    case 'gring':
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - u) * 0.8;
      ctx.strokeStyle = p.col || PURPLE;
      ctx.lineWidth = 14 * (1 - u) + 2;
      ctx.beginPath();
      ctx.ellipse(x, y, p.s * ease(u), p.s * ease(u) * 0.26, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      break;
    case 'bolt':
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - u;
      ctx.lineJoin = 'round';
      for (const [w, c] of [
        [9, 'rgba(176,92,255,.5)'],
        [3, '#f3e6ff'],
      ]) {
        ctx.lineWidth = w;
        ctx.strokeStyle = c;
        ctx.beginPath();
        p.pts.forEach((q, i) =>
          i ? ctx.lineTo(q[0] - G.cam, q[1]) : ctx.moveTo(q[0] - G.cam, q[1]),
        );
        ctx.stroke();
      }
      ctx.restore();
      break;
  }
}
export function drawPlayer() {
  const p = P;
  let a = 1;
  if (p.inv > 0 && p.state !== 'hado' && Math.floor(G.time * 18) % 2) a = 0.4;
  if (p.state === 'super') {
    // Gathering the super attack: a growing glow at her feet and a charge ring overhead.
    const u = p.sw ? 1 : p.sup,
      R = 90 + 120 * u,
      x = p.x - G.cam;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, p.y, 4, x, p.y, R);
    g.addColorStop(0, `rgba(176,92,255,${0.35 + 0.35 * u})`);
    g.addColorStop(1, 'rgba(176,92,255,0)');
    ctx.fillStyle = g;
    ctx.scale(1, 0.3);
    ctx.fillRect(x - R, p.y / 0.3 - R, R * 2, R * 2);
    ctx.restore();
    if (!p.sw) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(16,14,24,.8)';
      ctx.beginPath();
      ctx.arc(x, p.y - 205, 13, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = u >= 1 ? '#fff' : '#d9b8ff';
      ctx.beginPath();
      ctx.arc(x, p.y - 205, 13, -Math.PI / 2, -Math.PI / 2 + TAU * u);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (p.state === 'hado') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x - G.cam, p.y, 4, p.x - G.cam, p.y, 120);
    g.addColorStop(0, 'rgba(176,92,255,.5)');
    g.addColorStop(1, 'rgba(176,92,255,0)');
    ctx.fillStyle = g;
    ctx.scale(1, 0.3);
    ctx.fillRect(p.x - G.cam - 120, p.y / 0.3 - 120, 240, 240);
    ctx.restore();
  }
  sprite(p.an[0], p.an[1], p.x - G.cam, p.y - p.z + 2, p.face < 0, 1, a, p.who);
}
export function drawWorld() {
  if (G.level === 2) drawBG2();
  else {
    drawBG();
    drawFog();
    drawVignette();
  }
  // the world below is drawn in road coordinates; Old Quarry's camera also moves up and down
  ctx.save();
  ctx.translate(0, -G.camY);
  // slam warning
  for (const e of G.enemies)
    if (e.state === 'swind') {
      const u = e.t / SWIND,
        x = e.x - G.cam,
        locked = e.t >= SWIND_LOCK;
      ctx.fillStyle = `rgba(255,${locked ? 40 : 90},${locked ? 40 : 70},${0.08 + 0.14 * u + (locked ? 0.08 : 0)})`;
      ctx.beginPath();
      ctx.ellipse(x, e.y, SLAM_R, SLAM_R * 0.36, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = locked ? '#ff3a3a' : 'rgba(255,140,110,.9)';
      ctx.lineWidth = locked ? 4 : 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, e.y, SLAM_R * u, SLAM_R * 0.36 * u, 0, 0, TAU);
      ctx.stroke();
    }
  for (const a of G.pools) drawPool(a);
  for (const e of G.enemies) if (e.T.dragon) drawDragonGround(e);
  drawShocks();
  // shadows
  for (const u of G.props) shadow(u.x, u.y, 0, u.decor ? DECOR[u.decor].w * 1.2 : 22);
  for (const e of G.enemies)
    if (e.state !== 'rise' || e.t > 0.4)
      shadow(
        e.x,
        e.y,
        e.z,
        e.T.shadow || (e.mounted ? (e.bike === 'hog' ? 104 : 70) : 34) * e.T.scale,
      );
  for (const it of G.items) shadow(it.x, it.y, it.z, 12);
  for (const q of G.projs)
    if (q.k !== 'bullet')
      shadow(q.x, q.y, q.z, q.k === 'hado' ? 26 * q.lv : q.k === 'plasma' ? 20 : 10);
  if (G.state !== 'title') shadow(P.x, P.y, P.z, 40);
  const list = [];
  for (const d of G.debris) list.push([d.gy - 1, drawDebris, d]);
  for (const u of G.props) list.push([u.y, u.decor ? drawDecor : drawUrn, u]);
  for (const e of G.enemies)
    list.push([e.y, outlined(FOES[e.type]?.draw ?? (e.T.dragon ? drawDragon : drawSkel), e), e]);
  for (const it of G.items) list.push([it.y, drawItem, it]);
  for (const q of G.projs) list.push([q.y + 1, drawProj, q]);
  if (G.state !== 'title') list.push([P.y, drawPlayer, null]);
  list.sort((a, b) => a[0] - b[0]);
  for (const l of list) l[1](l[2]);
  for (const e of G.enemies) if (e.T.dragon) drawDragonBeam(e);
  for (const p of G.parts) drawPart(p);
  for (const f of G.floats) {
    ctx.globalAlpha = 1 - Math.max(0, f.t - 0.6) / 0.5;
    txt(f.txt, f.x - G.cam, f.y - f.t * 34, 16, f.col, 'center', 4);
    ctx.globalAlpha = 1;
  }
  for (const e of G.enemies)
    if (e.state === 'ride' && e.t < RW && Math.floor(G.time * 8) % 2 === 0) {
      const x = e.rdir > 0 ? 30 : W - 30;
      ctx.fillStyle = '#ff4a5e';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x, e.y - 96);
      ctx.lineTo(x + 22, e.y - 56);
      ctx.lineTo(x - 22, e.y - 56);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      txt('!', x, e.y - 62, 24, '#fff', 'center');
    }
  ctx.restore();
  if (G.level === 2) drawFront2();
}
/** A neon sign: a framed word that glows; `on` seconds since it lit (it flickers on). */
const NEON = {
  blue: { glow: '#2fa8ff', line: '#5fd0ff', text: '#a8ecff', back: 'rgba(6,16,40,.6)' },
  red: { glow: '#ff2a3a', line: '#ff5a64', text: '#ffc2c6', back: 'rgba(40,6,10,.6)' },
};
function neon(x, y, label, size, col, a, on) {
  if (on < 0.3 && Math.floor(on * 30) % 3 === 1) return; // a neon tube flickering on
  const C = NEON[col];
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `900 ${size}px ${FONT}`;
  const w = ctx.measureText(label).width + size * 1.4,
    h = size * 1.75;
  rr(x - w / 2, y - h / 2, w, h, size * 0.42);
  ctx.fillStyle = C.back;
  ctx.fill();
  ctx.shadowColor = C.glow;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.line;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.text;
  ctx.fillText(label, x, y + 1);
  ctx.shadowBlur = 6;
  ctx.fillText(label, x, y + 1);
  ctx.restore();
}
/** Lucy's luck held: a blue neon sign above her that flickers on, then fades. */
function drawLucky(p) {
  const left = p.lucky,
    on = LUCK.sign - left;
  if (!(left > 0)) return;
  neon(
    clamp(p.x - G.cam, 130, W - 130),
    p.y - G.camY - p.z - 222 - Math.min(on, 0.4) * 20,
    'you feel lucky!',
    24,
    'blue',
    Math.min(1, left / 0.4),
    on,
  );
}
/** Lucy's rounds, under her rage bar: brass ones left, dark ones spent. */
function drawAmmo(p) {
  for (let i = 0; i < LUCY.ammo; i++) {
    const x = 92 + i * 13,
      y = 77,
      full = i < p.ammo;
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = OL;
    ctx.fillStyle = full ? '#d8a63a' : 'rgba(30,26,34,.75)';
    rr(x, y + 4, 8, 12, 2); // the case
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = full ? '#c46a3a' : 'rgba(30,26,34,.75)';
    ctx.beginPath(); // the bullet
    ctx.moveTo(x, y + 5);
    ctx.quadraticCurveTo(x + 4, y - 4, x + 8, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (full) {
      ctx.fillStyle = 'rgba(255,240,190,.55)';
      ctx.fillRect(x + 1.5, y + 6, 1.6, 8);
    }
  }
}
export function drawHUD() {
  const p = P;
  drawLucky(p);
  if (p.who === 'lucy') drawAmmo(p);
  // portrait
  ctx.fillStyle = '#2a1b3d';
  rr(18, 14, 62, 62, 8);
  ctx.fill();
  ctx.save();
  rr(18, 14, 62, 62, 8);
  ctx.clip();
  const who = P.who ?? 'raithwyn';
  if (ready(portraits[who])) ctx.drawImage(portraits[who], 18, 14, 62, 62);
  else {
    const f = FR.idle[0];
    ctx.drawImage(atlas, f[0] + 14, f[1], 58, 58, 20, 18, 60, 60);
  }
  ctx.restore();
  rr(18, 14, 62, 62, 8);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ece5cb';
  ctx.stroke();
  txt(STR[lang].chars[who]?.name ?? 'Raithwyn', 92, 32, 17, '#ece5cb', 'left', 4);
  bar(90, 40, 250, 15, p.hp / p.maxHp, p.hpLag / p.maxHp, '#f0cf4f');
  const lv = hadoLevel(p.rage),
    pul = 0.75 + 0.25 * Math.sin(G.time * 10);
  if (lv === 3) {
    ctx.save();
    ctx.shadowColor = PURPLE;
    ctx.shadowBlur = 14 * pul;
    bar(88, 61, 210, 10, 1, 0, '#d9b8ff', 4);
    ctx.restore();
  }
  bar(88, 61, 210, 10, p.rage / MAXR, 0, ['#6d4a96', '#9a5ae0', '#c088ff', '#f0dcff'][lv], 4);
  ctx.fillStyle = '#ece5cb';
  for (const r of [RL[0], RL[1]]) ctx.fillRect(88 + (210 * r) / MAXR + 2, 61, 2, 10);
  txt(
    p.who === 'lucy' ? STR[lang].lucy.rage : t(['rage', 'hado1', 'hado2', 'hado3'][lv]),
    308,
    71,
    12,
    ['#9bb0ac', '#d2a8ff', '#e0c2ff', '#fff'][lv],
    'left',
    3,
  );
  for (let i = 0; i < p.lives; i++) {
    ctx.fillStyle = '#ff4a5e';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    const x = 30 + i * 20,
      y = 88;
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.bezierCurveTo(x - 10, y - 2, x - 5, y - 8, x, y - 3);
    ctx.bezierCurveTo(x + 5, y - 8, x + 10, y - 2, x, y + 6);
    ctx.fill();
    ctx.stroke();
  }
  txt(String(p.score).padStart(6, '0'), W - 20, 34, 20, '#ece5cb', 'right', 4);
  drawStyle();
  if (touch) {
    // pause button for touch screens
    const [bx, by, bw, bh] = PAUSE_BTN;
    ctx.fillStyle = 'rgba(16,14,24,.7)';
    rr(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.strokeStyle = '#ece5cb';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ece5cb';
    ctx.fillRect(bx + 11, by + 9, 5, bh - 18);
    ctx.fillRect(bx + bw - 16, by + 9, 5, bh - 18);
    // and next to it, full screen (where the browser allows it)
    if (canFullScreen()) {
      const [fx, fy, fw, fh] = FS_BTN;
      ctx.fillStyle = 'rgba(16,14,24,.7)';
      rr(fx, fy, fw, fh, 8);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#ece5cb';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (const [cx, cy, dx, dy] of [
        [fx + 9, fy + 9, 1, 1],
        [fx + fw - 9, fy + 9, -1, 1],
        [fx + 9, fy + fh - 9, 1, -1],
        [fx + fw - 9, fy + fh - 9, -1, -1],
      ]) {
        ctx.moveTo(cx, cy + dy * 7);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx * 7, cy);
      }
      ctx.stroke();
    }
  }
  // foe bar
  if (G.lastFoe && G.lastFoeT > 0 && !G.lastFoe.T.bigBoss) {
    ctx.globalAlpha = Math.min(1, G.lastFoeT * 2);
    txt(foeName(G.lastFoe.type), W - 20, 60, 14, '#ece5cb', 'right', 3);
    bar(W - 190, 66, 164, 9, Math.max(0, G.lastFoe.hp) / G.lastFoe.T.hp, 0, '#ff8a4a', 4);
    ctx.globalAlpha = 1;
  }
  const boss = G.enemies.find((e) => e.T.bigBoss);
  if (boss) {
    const bx = 440,
      bw = 360;
    txt(foeName(boss.type), bx + 8, 31, 14, '#e3c8ff', 'left', 4);
    bar(bx, 37, bw, 12, Math.max(0, boss.hp) / boss.T.hp, 0, '#b05cff');
    if (boss.T.dragon) {
      // phase marker on the dragon's bar
      ctx.fillStyle = '#ece5cb';
      ctx.fillRect(bx + bw * 0.5 + 3, 37, 2, 12);
    } else if (boss.armor > 0)
      txt(t('immune', boss.armor.toFixed(1)), bx + bw + 4, 31, 12, '#fff', 'right', 3);
    else if (boss.type === 'boss')
      for (let i = 0; i < 2; i++) {
        const x = bx + bw - 8 - i * 18,
          y = 26;
        ctx.beginPath();
        ctx.moveTo(x, y - 7);
        ctx.lineTo(x + 6, y);
        ctx.lineTo(x, y + 7);
        ctx.lineTo(x - 6, y);
        ctx.closePath();
        ctx.fillStyle = i < boss.breaks ? '#ffe9a8' : 'rgba(16,14,24,.85)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ece5cb';
        ctx.stroke();
      }
  }
  if (
    !G.wave &&
    G.waveI < levelWaves().length &&
    G.waveI > 0 &&
    G.goT > 0 &&
    Math.floor(G.time * 3) % 2 === 0
  ) {
    // the arrow points the way the road goes (right, down the slope or down the screen)
    const [dx, dy] = roadDir(),
      ax = dy > 0.8 ? W / 2 : W - 45,
      ay = dy > 0.8 ? H - 70 : 241 + dy * 120;
    txt(
      t('go'),
      ax - (dy > 0.8 ? 0 : 29),
      ay + (dy > 0.8 ? -26 : 9),
      26,
      '#ece5cb',
      dy > 0.8 ? 'center' : 'right',
      5,
    );
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = '#ece5cb';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-17, -15);
    ctx.lineTo(17, 0);
    ctx.lineTo(-17, 15);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
  if (G.banner) {
    const u = G.banner.t,
      a = u < 0.3 ? u / 0.3 : u > 2.5 ? (3 - u) / 0.5 : 1,
      off = (1 - ease(Math.min(1, u / 0.4))) * -60;
    ctx.globalAlpha = clamp(a, 0, 1);
    const s = (k) => (k[0] === '@' ? foeName(k.slice(1)) : t(k));
    txt(s(G.banner.a), W / 2 + off, 138, 38, '#ece5cb', 'center', 7);
    txt(s(G.banner.b), W / 2 - off, 166, 17, '#d2a8ff', 'center', 4);
    ctx.globalAlpha = 1;
  }
  if (G.muted) txt(t('muted'), W - 20, H - 14, 12, '#9bb0ac', 'right', 3);
}
export function overlay(a) {
  ctx.fillStyle = `rgba(12,10,20,${a})`;
  ctx.fillRect(0, 0, W, H);
}
export const PAUSE_BTN = [372, 12, 36, 36],
  FS_BTN = [416, 12, 36, 36];
const RANK_COL = ['#8fa5b8', '#7dffb0', '#5cc8ff', '#ff6ad5', '#ffd23f', '#ff9a3c', '#ff4a5e'];
// Style rank on the left under the lives: the letter, the meter to the next rank, the bonus.
function drawStyle() {
  const r = styleRank();
  if (r === 0) return; // nothing shows until the first rank, D
  const x = 20,
    y = 160,
    col = RANK_COL[r - 1],
    pop = 1 + Math.max(0, P.styPop);
  txt(t('style'), x, y - 42, 12, '#9bb0ac', 'left', 3);
  ctx.save();
  ctx.translate(x + 22, y);
  ctx.scale(pop, pop);
  if (r >= 5) {
    // S and above glow
    ctx.shadowColor = col;
    ctx.shadowBlur = 16 + 6 * Math.sin(G.time * 10);
  }
  const name = RANKS[r - 1];
  txt(name, 0, 0, [46, 36, 28][name.length - 1], col, 'center', 7);
  ctx.restore();
  const into = r === RANKS.length ? 1 : (P.sty % STYLE_STEP) / STYLE_STEP;
  bar(x + 56, y - 26, 120, 8, into, 0, col, 3);
  const bonus = [Math.round((scoreMult() - 1) * 100), Math.round((dmgMult() - 1) * 100)];
  txt(t('styleBonus', ...bonus), x + 56, y - 2, 11, '#ece5cb', 'left', 3);
}
