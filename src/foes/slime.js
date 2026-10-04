// The mini-boss of Old Quarry: a heap of radioactive green slime from the flooded hall, with
// the bones of what it ate floating inside. It drops from the roof, rolls across the hall,
// jumps (not always at the player) and splashes down, and spits out zombies that get up and
// fight. Its attacks are broken like a medium enemy's: plain hits do nothing to them, a heavy
// blow breaks one, two heavy blows within WEIGHT.window seconds (or one crushing blow) send it
// sliding back.
import { ACID, SLIME, TAU, W, WEIGHT } from '../config.js';
import { clamp, lerp, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { finale, hitPlayer } from '../combat.js';
import { scoreMult } from '../style.js';
import { ctx } from '../gfx.js';
import { groundPoint, floorClamp } from '../level.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';

const cd = (k) => rnd(SLIME.cds[k][0], SLIME.cds[k][1]);
const minions = () => G.enemies.filter((o) => o.fromSlime && !o.dead).length;
const ATTACKS = ['rwind', 'roll', 'jwind', 'sjump', 'spwind', 'windup', 'attack'];

function splash(x, y, n, v = 300) {
  for (let i = 0; i < n; i++)
    G.parts.push({
      k: 'dot',
      x: x + rnd(-30, 30),
      y: y - rnd(10, 60),
      vx: rnd(-v, v),
      vy: rnd(-v * 1.2, -60),
      g: 800,
      t: 0,
      life: rnd(0.4, 0.8),
      s: rnd(4, 8),
      col: random() < 0.5 ? '#9dff4a' : '#4fd12a',
    });
}
function puddle(x, y) {
  const p = { x, y };
  floorClamp(p);
  G.pools.push({ x: p.x, y: p.y, t: 0, life: ACID.pool, seed: rnd(6) });
}

// --- drawing ----------------------------------------------------------------------------------

/** Squash and stretch for its state: [width, height] factors. */
function squash(e) {
  const t = e.t,
    wob = Math.sin(e.anim * 4) * 0.03;
  switch (e.state) {
    case 'rwind':
    case 'jwind': {
      const u = clamp(t / 0.4, 0, 1);
      return [1 + 0.25 * u + wob, 1 - 0.3 * u];
    }
    case 'roll':
      return [1.08, 0.92];
    case 'sjump':
      return [0.82, 1.22];
    case 'spwind': {
      const u = clamp(t / SLIME.spwind, 0, 1);
      return [0.95 - 0.08 * u, 1.05 + 0.15 * u];
    }
    case 'quiver':
    case 'stagger':
      return [1 + Math.sin(t * 50) * 0.08, 1 - Math.sin(t * 50) * 0.08];
    case 'sdrop':
      return e.z > 0 ? [0.85, 1.2] : [1.3, 0.7];
    case 'attack':
      return [1.25, 0.85];
    default:
      return [1 + wob, 1 - wob + (e.landT > 0 ? -0.25 * e.landT : 0)];
  }
}
export function drawSlime(e) {
  const T = e.T,
    fl = e.flash > 0,
    [kx, ky] = squash(e),
    R = 96,
    rx = R * kx,
    ry = R * 0.86 * ky,
    t = e.anim;
  ctx.save();
  ctx.translate(e.x - G.cam, e.y - e.z);
  ctx.scale(e.face, 1);
  // its glow on everything around
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(0, -ry, 10, 0, -ry, R * 2.2);
  gl.addColorStop(0, 'rgba(120,255,80,.28)');
  gl.addColorStop(1, 'rgba(120,255,80,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(-R * 2.2, -ry - R * 2.2, R * 4.4, R * 4.4);
  ctx.restore();
  // the body: a wobbling dome, flat on the floor
  const body = () => {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU,
        w = 1 + 0.045 * Math.sin(3 * a + t * 4) + 0.03 * Math.sin(5 * a - t * 3),
        x = Math.cos(a) * rx * w,
        y = Math.min(0, -ry + Math.sin(a) * ry * w);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  body();
  const g = ctx.createRadialGradient(-rx * 0.25, -ry * 1.3, 8, 0, -ry * 0.8, R * 1.3);
  g.addColorStop(0, fl ? '#fff' : '#c8ff8a');
  g.addColorStop(0.45, fl ? '#fff' : 'rgba(111,226,58,.92)');
  g.addColorStop(1, fl ? '#fff' : 'rgba(40,140,24,.95)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#17301a';
  ctx.stroke();
  ctx.save();
  body();
  ctx.clip();
  // what it ate: bones, a skull, a hard hat, drifting and turning (and rolling with it)
  const roll = e.rollA ?? 0;
  for (const [i, k] of [
    [0, 'skull'],
    [1, 'bone'],
    [2, 'bone'],
    [3, 'hat'],
    [4, 'bone'],
  ]) {
    const a = roll + i * 1.3 + Math.sin(t * 0.7 + i) * 0.3,
      r = 30 + (i % 3) * 14,
      x = Math.cos(a) * r * kx,
      y = -ry + Math.sin(a) * r * 0.7 * ky;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a * 1.5 + t * 0.3);
    ctx.globalAlpha = 0.55;
    if (k === 'skull') {
      ctx.fillStyle = '#e8f0d0';
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, TAU);
      ctx.fill();
      ctx.fillRect(-7, 8, 14, 8);
      ctx.fillStyle = '#1a3a1a';
      ctx.beginPath();
      ctx.arc(-5, -1, 3.5, 0, TAU);
      ctx.arc(5, -1, 3.5, 0, TAU);
      ctx.fill();
    } else if (k === 'hat') {
      ctx.fillStyle = '#e3b23c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 9, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillRect(-17, 0, 34, 3);
    } else {
      ctx.fillStyle = '#e8f0d0';
      ctx.fillRect(-16, -2.5, 32, 5);
      for (const sx of [-16, 16])
        for (const sy of [-3, 3]) {
          ctx.beginPath();
          ctx.arc(sx, sy, 3.5, 0, TAU);
          ctx.fill();
        }
    }
    ctx.restore();
  }
  // bubbles rising
  ctx.fillStyle = 'rgba(230,255,190,.55)';
  for (let i = 0; i < 9; i++) {
    const bx = ((i * 37) % (rx * 1.4)) - rx * 0.7,
      by = -((t * 30 + i * 23) % (ry * 1.7));
    ctx.beginPath();
    ctx.arc(bx, by, 2 + (i % 3), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // a shine on the dome
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(-rx * 0.25, -ry * 1.35, rx * 0.45, ry * 0.3, -0.3, Math.PI * 1.1, Math.PI * 1.55);
  ctx.stroke();
  // the face (it turns away while rolling)
  const front = e.state !== 'roll' || Math.cos(roll) > 0;
  if (front) {
    const ex = rx * 0.35,
      ey = -ry * 1.25;
    for (const [dx, r] of [
      [0, 13],
      [-26, 10],
    ]) {
      ctx.fillStyle = '#10200e';
      ctx.beginPath();
      ctx.ellipse(ex + dx, ey, r, r * 1.2, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = fl ? '#fff' : T.eye;
      ctx.shadowColor = T.eye;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(ex + dx + 3, ey + 1, r * 0.45, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // the mouth: wide open to spit
    const open =
      e.state === 'spwind' ? clamp(e.t / SLIME.spwind, 0, 1) : e.state === 'attack' ? 0.6 : 0.15;
    ctx.fillStyle = '#10200e';
    ctx.beginPath();
    ctx.ellipse(rx * 0.3, -ry * 0.75, 26, 4 + 26 * open, 0, 0, TAU);
    ctx.fill();
    if (open > 0.3) {
      ctx.fillStyle = '#9dff4a';
      ctx.beginPath();
      ctx.ellipse(rx * 0.3, -ry * 0.75 + 14 * open, 14, 6 * open, 0, 0, TAU);
      ctx.fill();
    }
  }
  // drips at the foot
  ctx.fillStyle = '#4fd12a';
  for (let i = 0; i < 5; i++) {
    const x = -rx * 0.8 + i * rx * 0.4,
      h = 6 + 6 * Math.abs(Math.sin(t * 2 + i));
    ctx.beginPath();
    ctx.ellipse(x, 2, 10, h * 0.5, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // a warning over it before it rolls or jumps
  if (e.state === 'rwind' || e.state === 'jwind') {
    ctx.fillStyle = '#ff4a5e';
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.t * 30);
    ctx.font = '900 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', e.x - G.cam, e.y - e.z - ry * 2 - 30);
    ctx.globalAlpha = 1;
  }
}

// --- behaviour --------------------------------------------------------------------------------

export default defineFoe('slime', {
  draw: drawSlime,
  timers: ['rollCd', 'jumpCd', 'spitCd', 'landT'],
  engageCap: Infinity,
  spawn(e) {
    e.w = 82;
    e.x = G.cam + W - 250;
    e.y = clamp(P.y, G.camY + 300, G.camY + 500);
    floorClamp(e);
    e.face = -1;
    e.z = 560;
    e.vz = 0;
    e.state = 'sdrop';
    e.rollA = 0;
    Object.assign(e, { rollCd: 2, jumpCd: 4, spitCd: 3 });
    G.banner = { a: '@slime', b: 'slimeBanner', t: 0 };
    SFX.boss();
  },
  immune: (e) => e.state === 'sdrop' || (e.state === 'sjump' && e.z > 50),
  attacks: ATTACKS,
  moves: [
    {
      when: (e, s) => e.spitCd <= 0 && minions() < SLIME.minions && s.adx > 140,
      go: (e) => go(e, 'spwind', 0, { engage: false }),
    },
    {
      when: (e, s, dt) => e.jumpCd <= 0 && !s.pdown && random() < dt * 0.9,
      go: (e) => go(e, 'jwind', 0, { engage: false }),
    },
    {
      when: (e, s) => e.rollCd <= 0 && !s.pdown && s.adx > 170 && s.ady < 100,
      go: (e) => go(e, 'rwind', 0, { engage: false }),
    },
  ],
  guard(e, knock, src, dir, crush) {
    // the medium rules, but it slides instead of flying
    const busy = ATTACKS.includes(e.state);
    e.landT = 0.25;
    if (!knock) return true;
    if (e.heavyT > 0 || crush) {
      e.heavyT = 0;
      go(e, 'stagger', 0, { vx: dir * 260 });
      SFX.squelch();
      splash(e.x, e.y, 6);
    } else {
      e.heavyT = WEIGHT.window;
      if (busy) {
        go(e, 'quiver');
        SFX.squelch();
      }
    }
    return true;
  },
  die(e, dir) {
    e.dead = true;
    P.score += Math.round(e.T.score * scoreMult());
    finale(e);
    SFX.squelch();
    SFX.boom();
    splash(e.x, e.y, 40, 520);
    for (let i = 0; i < 5; i++) puddle(e.x + rnd(-140, 140) + dir * 20, e.y + rnd(-30, 30));
    G.items.push({ kind: 'hp', x: e.x, y: e.y, z: 60, vz: 260, t: 0 });
  },
  states: {
    sdrop(e, dt) {
      e.vz -= 1600 * dt;
      e.z += e.vz * dt;
      if (e.z <= 0) {
        e.z = 0;
        G.shake = 14;
        SFX.squelch();
        SFX.thud();
        splash(e.x, e.y, 20);
        G.parts.push({ k: 'gring', x: e.x, y: e.y, t: 0, life: 0.45, s: 220, col: '#9dff4a' });
        go(e, 'recover', -0.4);
      }
    },
    rwind(e) {
      faceP(e);
      if (e.t > SLIME.rwind) {
        go(e, 'roll', 0, { hitDone: false, cdir: e.face, bounced: false });
        SFX.squelch();
      }
    },
    roll: {
      pin: true,
      tick(e, dt, s) {
        e.x += e.cdir * SLIME.roll * dt;
        e.y += clamp(s.dy, -1, 1) * 30 * dt;
        e.rollA += e.cdir * dt * 7;
        if (random() < 0.5) splash(e.x - e.cdir * 60, e.y, 1, 80);
        if (!e.hitDone && s.adx < 80 && s.ady < 40 && P.z < 100) {
          e.hitDone = true;
          hitPlayer(e.T.dmg, e.cdir, true);
        }
        const edge = (e.cdir > 0 && e.x > G.cam + W - 90) || (e.cdir < 0 && e.x < G.cam + 90);
        if (edge && !e.bounced) {
          // off the wall and back across, once
          e.cdir = -e.cdir;
          e.bounced = true;
          e.hitDone = false;
          G.shake = 6;
          SFX.squelch();
        } else if (e.t > SLIME.rollT || (edge && e.bounced))
          go(e, 'recover', 0, { rollCd: cd('roll') });
      },
    },
    jwind(e) {
      if (e.t <= SLIME.jwind) return;
      // where it lands: on the player half the time, else anywhere it likes
      const [x, y] = random() < 0.5 ? [P.x, P.y] : groundPoint(random);
      go(e, 'sjump', 0, { jx0: e.x, jy0: e.y, jx1: x, jy1: y });
      e.face = x >= e.x ? 1 : -1;
      SFX.squelch();
    },
    sjump(e) {
      const u = clamp(e.t / SLIME.jumpT, 0, 1);
      e.x = lerp(e.jx0, e.jx1, u);
      e.y = lerp(e.jy0, e.jy1, u);
      e.z = Math.sin(u * Math.PI) * 300;
      if (u < 1) return;
      e.z = 0;
      G.shake = 16;
      SFX.squelch();
      SFX.thud();
      splash(e.x, e.y, 24);
      G.parts.push({
        k: 'gring',
        x: e.x,
        y: e.y,
        t: 0,
        life: 0.45,
        s: SLIME.landR,
        col: '#9dff4a',
      });
      const ex = (P.x - e.x) / SLIME.landR,
        ey = (P.y - e.y) / (SLIME.landR * 0.38);
      if (ex * ex + ey * ey < 1 && P.z < 40) hitPlayer(SLIME.landDmg, P.x >= e.x ? 1 : -1, true);
      puddle(e.x - 110, e.y + rnd(-20, 20));
      puddle(e.x + 110, e.y + rnd(-20, 20));
      go(e, 'recover', -0.3, { jumpCd: cd('jump'), landT: 0.4 });
    },
    spwind(e) {
      faceP(e);
      if (e.t <= SLIME.spwind) return;
      // a zombie curled up in slime flies out of its mouth
      const x0 = e.x + e.face * 60,
        d = clamp(Math.abs(P.x - x0) * 0.8, 180, 420),
        f = 0.85;
      G.projs.push({
        k: 'zspit',
        x: x0,
        y: e.y,
        z: 120,
        vx: (e.face * d) / f,
        vy: clamp(P.y - e.y, -120, 120) / f,
        vz: (ACID.g * f) / 2 - 120 / f,
        rot: 0,
        life: 3,
        kind: random() < 0.7 ? 'zombie' : 'miner',
      });
      SFX.squelch();
      splash(x0, e.y - 120, 8, 160);
      go(e, 'recover', 0, { spitCd: cd('spit') });
    },
    quiver(e) {
      if (e.t > 0.35) go(e, 'chase');
    },
    stagger: {
      pin: true,
      tick(e, dt) {
        e.x += e.vx * dt;
        e.vx *= Math.pow(0.02, dt);
        if (random() < 0.4) splash(e.x, e.y, 1, 100);
        if (e.t > 0.8) go(e, 'chase', 0, { cd: 0.4 });
      },
    },
  },
});
