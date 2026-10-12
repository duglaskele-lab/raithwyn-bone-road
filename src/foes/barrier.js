// Jawacorp's barrier heavy (TYPES.barrier, BARRIER), a heavy foe: a broad robot in blue armour,
// a domed head with a T-shaped visor, a projector on its forearm. Now and then it raises a wall
// of hard light in front of it, and keeps it up while it walks: every shot of the player's
// (bullets, bones, a level I dark ball) stops on the wall — so it shields the robots behind it
// too — and so do blows from the front; heavy blows crack the wall and the third shatters it,
// a crushing blow shatters it at once. From behind it is open. Only crushing blows move it.
// Wall up or not, every so often it takes a grenade from the pack on its back and lobs it at
// her (JNADE: three seconds on its timer, and the blast hurts robots too).
import { BARRIER, JNADE, OL, TAU } from '../config.js';
import { fxRnd, rnd } from '../util.js';
import { APP, G } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { spark } from '../fx.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';
import { drawJnade, robotDie, robotLook, THROW_POSE } from './robot.js';

const A = { body: '#5a7ca3', trim: '#2b3a4f', glow: '#5fd0ff', w: 17, chest: 1.3 };

/** Is its wall up? */
export const wallUp = (e) => e.type === 'barrier' && !e.dying && (e.wallUntil ?? 0) > G.time;
/** Where its wall stands (x on the road). */
const wallX = (e) => e.x + e.face * BARRIER.w * e.T.scale;
/** The wall goes down in a burst of light. */
function shatterWall(e) {
  e.wallUntil = 0;
  e.barCd = rnd(...BARRIER.cd);
  SFX.shatter();
  for (let k = 0; k < 12; k++)
    G.parts.push({
      k: 'dot',
      x: wallX(e),
      y: e.y - fxRnd(20, 200),
      vx: fxRnd(-200, 200),
      vy: fxRnd(-200, 100),
      g: 400,
      t: 0,
      life: fxRnd(0.3, 0.6),
      s: fxRnd(2, 4),
      col: '#bff0ff',
    });
}
/** Does a wall of light stop this shot of the player's? (Then it rings off it.) */
export function wallStops(q) {
  const shot = q.k === 'bone' || (q.k === 'bullet' && !q.spent) || (q.k === 'hado' && q.lv === 1);
  if (!shot) return false;
  for (const e of G.enemies) {
    if (!wallUp(e) || Math.sign(e.x - q.x) !== Math.sign(q.vx) || Math.abs(q.y - e.y) > BARRIER.d)
      continue;
    const wx = wallX(e),
      d = (wx - q.x) * Math.sign(q.vx);
    if (d < 30 && d > -40) {
      spark(wx, q.y - q.z, '#bff0ff', false);
      SFX.clang();
      e.wallFlash = G.time + 0.12;
      return true;
    }
  }
  return false;
}

export default defineFoe('barrier', {
  init: { barCd: [1, 2.5], nadeCd: [2, 4] },
  timers: ['barCd', 'nadeCd'],
  attacks: ['braise', 'gthrow'],
  moves: [
    {
      // a grenade from its pack, over its wall or without one
      when: (e, s) =>
        e.nadeCd <= 0 && !s.pdown && s.adx > JNADE.min && s.adx < JNADE.max && s.ady < 150,
      go(e) {
        go(e, 'gthrow', 0, { engage: false, thrown: false });
      },
    },
    {
      when: (e, s) => e.barCd <= 0 && !wallUp(e) && s.adx < 620,
      go(e) {
        faceP(e);
        go(e, 'braise', 0, { engage: false });
        SFX.stance();
      },
    },
  ],
  // the wall turns away blows from the front; heavy ones crack it
  block(e, dir, knock, src, crush) {
    if (!wallUp(e) || dir !== -e.face) return false;
    if (crush) {
      shatterWall(e);
      return false;
    }
    if (knock && --e.wallHp <= 0) {
      shatterWall(e);
      return true;
    }
    spark(wallX(e), e.y - 100, '#bff0ff', knock);
    SFX.clang();
    e.wallFlash = G.time + 0.12;
    return true;
  },
  die(e, dir) {
    e.wallUntil = 0;
    robotDie(e, dir);
  },
  // behind its wall it throws the way the wall faces
  nadeFace: (e) => wallUp(e),
  // it turns towards her slowly while its wall is up, so going round it works
  tick(e) {
    if (wallUp(e) && e.state === 'chase') e.face = e.wallFace;
    if (!wallUp(e) && e.wallUntil) {
      e.wallUntil = 0;
      e.barCd = rnd(...BARRIER.cd);
    }
  },
  states: {
    braise(e) {
      if (e.t > 0.35) {
        Object.assign(e, { wallUntil: G.time + BARRIER.up, wallHp: BARRIER.hp, wallFace: e.face });
        go(e, 'chase');
      }
    },
  },
  over: drawWall,
  look: robotLook(A, head, projector, null, { pack: backpack, backHand: heldNade }),
  pose: {
    guard: { chase: { set: { aF: (e, k) => [1.1, 1.5 + 0.04 * k.br], aB: [0.5, 1.2] } } },
    states: {
      braise: { set: { aF: [1.5, 1.57], aB: [1.3, 1.5], lean: 0.05 } },
      // the projector held out while the other arm throws (the wall up or not)
      gthrow: { ...THROW_POSE, set: { aF: [1.1, 1.5] } },
    },
  },
});

/** The pack on its back: a steel case with a cooling grille, an aerial, and a rack of
 *  grenades on its side. */
function backpack(c) {
  const { fl } = c;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = fl ? '#fff' : A.trim;
  ctx.beginPath();
  ctx.roundRect(-52, -70, 40, 60, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : A.body;
  ctx.beginPath();
  ctx.roundRect(-60, -62, 14, 44, 5);
  ctx.fill();
  ctx.stroke();
  if (!fl) {
    // the grille
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = -58; y < -24; y += 6) {
      ctx.moveTo(-58, y);
      ctx.lineTo(-49, y);
    }
    ctx.stroke();
    // a status light
    ctx.fillStyle = A.glow;
    ctx.fillRect(-30, -64, 8, 5);
  }
  // the aerial
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-40, -70);
  ctx.lineTo(-46, -100);
  ctx.stroke();
  ctx.fillStyle = '#ff3b4b';
  ctx.beginPath();
  ctx.arc(-46, -101, 3, 0, TAU);
  ctx.fill();
  // the rack of grenades at the bottom
  for (const x of [-44, -28]) {
    ctx.save();
    ctx.translate(x, -8);
    drawJnade(6.5, null, fl);
    ctx.restore();
  }
}
/** The grenade in its back hand, drawn back for the throw. */
function heldNade(c, p) {
  const { e, fl } = c;
  if (e.state !== 'gthrow' || e.thrown) return;
  ctx.save();
  ctx.translate(p[0], p[1]);
  drawJnade(8, null, fl);
  ctx.restore();
}
/** The domed head with its T-shaped visor. */
function head(c) {
  const { e, fl } = c;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = fl ? '#fff' : A.body;
  ctx.beginPath();
  ctx.arc(1, 0, 17, Math.PI * 0.6, Math.PI * 2.2);
  ctx.lineTo(16, 13);
  ctx.lineTo(-4, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0b0d14';
  ctx.fillRect(0, -6, 18, 5);
  ctx.fillRect(9, -6, 5, 16);
  ctx.fillStyle = e.T.eye;
  if (!APP.lowFx) {
    ctx.shadowColor = e.T.eye;
    ctx.shadowBlur = 8;
  }
  ctx.fillRect(2, -5, 14, 2.5);
  ctx.fillRect(10, -4, 2.5, 12);
  ctx.shadowBlur = 0;
}
/** The projector on its forearm. */
function projector(c) {
  const { fl, h, wa, e } = c;
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(-wa);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = fl ? '#fff' : A.trim;
  ctx.fillRect(-14, -24, 28, 30);
  ctx.strokeRect(-14, -24, 28, 30);
  ctx.fillStyle = wallUp(e) ? '#bff0ff' : A.glow;
  ctx.beginPath();
  ctx.arc(0, -8, 7, 0, TAU);
  ctx.fill();
  ctx.restore();
}
/** The wall of hard light: a tall pane of hexagons on the road in front of it, cracking. */
function drawWall(e) {
  if (!wallUp(e)) return;
  const s = e.T.scale,
    x = wallX(e) - G.cam,
    d = BARRIER.d,
    h = 210 * s,
    left = e.wallUntil - G.time,
    a = (left < 0.8 && Math.floor(G.time * 14) % 2 ? 0.3 : 0.6) + (e.wallFlash > G.time ? 0.3 : 0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(90,200,255,${a * 0.28})`;
  ctx.strokeStyle = `rgba(190,240,255,${a})`;
  ctx.lineWidth = 2.5;
  // a pane standing across the road's depth: its foot from the back to the front of the lane
  const pane = [
    [x - e.face * 8, e.y - d],
    [x + e.face * 8, e.y + d],
    [x + e.face * 8, e.y + d - h],
    [x - e.face * 8, e.y - d - h],
  ];
  ctx.beginPath();
  pane.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 1; k < 6; k++) {
    const y = e.y - d - h + (k * (h + 2 * d)) / 6;
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + 8, y + 10);
  }
  ctx.stroke();
  // cracks for every heavy blow it has taken
  ctx.strokeStyle = `rgba(255,255,255,${a})`;
  ctx.lineWidth = 2;
  for (let k = 0; k < BARRIER.hp - e.wallHp; k++) {
    ctx.beginPath();
    ctx.moveTo(x, e.y - 40 - k * 60);
    ctx.lineTo(x + 6, e.y - 70 - k * 60);
    ctx.lineTo(x - 4, e.y - 95 - k * 60);
    ctx.stroke();
  }
  ctx.restore();
}
