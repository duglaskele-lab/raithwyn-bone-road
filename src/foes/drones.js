// The two drones of a Jawacorp boss (the mech samurai's, the cyber crab's): black lacquered
// discs with golden crests and red eyes that fly beside it, part of it, never to be hit. Now
// and then, as the watcher drones do, they mark a spot under her, follow her with it, hold it
// and fire their lasers there: D.n1 shots in turn, D.n2 when the boss is at its strongest.
// When it is beaten they drop and burst. A boss makes its own pair with bossDrones(D, opts).
import { OL, TAU } from '../config.js';
import { APP, G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { spark } from '../fx.js';
import { hitPlayer } from '../combat.js';

const A = { body: '#2a2d36', trim: '#a8242c', glow: '#ff3b5c' };

/**
 * The drones for a boss, with the numbers D (side, z, keep, cd, aim, lock, beam, r, dmg, gap,
 * n1, n2) and its say: `strong(e)` (more shots), `beaten(e)`, `cd(e, range)` (its pace), and
 * optionally `home(e, i)` ([x, y, z] where drone i hovers at rest), `count(e)` (how many it
 * has now: 2 if not said; more fly out of it as it asks, from `from(e)`, [x, y, z]). Returns
 * { attack, tick, ground, draw }; the boss keeps the countdown e.droneCd and calls attack when
 * it runs out (while e.dm is 'home' and it has drones).
 */
export function bossDrones(D, opts) {
  /** Its drones set off: a run of aimed shots, the drones in turn (more in phase 2). */
  function droneAttack(e) {
    muster(e);
    const m = e.dr.length;
    if (!m) return;
    const n = opts.strong(e) ? D.n2 : D.n1;
    e.dm = 'shots';
    e.shots = [];
    for (let k = 0; k < n; k++)
      e.shots.push({ i: k % m, t: -k * D.gap, tx: P.x, ty: P.y, fired: false });
  }
  /** Where a drone hovers at rest, beside it, bobbing (or where its master says). */
  const home =
    opts.home ??
    ((e, i) => {
      const s = i ? 1 : -1;
      return [
        e.x + s * D.side + Math.sin(G.time * 1.7 + i * 2) * 16,
        e.y - 30 + i * 60,
        D.z + Math.sin(G.time * 2.3 + i) * 14,
      ];
    });
  /** The shot a drone is busy with now (aiming or firing), if any. */
  const busy = (e, i) =>
    e.shots?.find((q) => q.i === i && q.t >= 0 && q.t <= D.aim + D.lock + D.beam);
  /** As many drones as its master has now: new ones fly out of it. */
  function muster(e) {
    e.dr ??= [];
    for (let want = opts.count?.(e) ?? 2; e.dr.length < want && !opts.beaten(e);) {
      const [x, y, z] = opts.from?.(e) ?? home(e, e.dr.length);
      e.dr.push({ x, y, z });
      if (opts.from) SFX.spin();
    }
  }
  /** Its drones fly, aim and fire (and fall when it is beaten). */
  function droneTick(e, dt) {
    muster(e);
    if (opts.beaten(e)) {
      // beaten: they drop, and burst on the ground
      e.shots = null;
      for (const d of e.dr) {
        if (d.boom) continue;
        d.vz = (d.vz ?? 0) - 900 * dt;
        d.z += d.vz * dt;
        if (d.z <= 0) {
          d.z = 0;
          d.boom = true;
          spark(d.x, d.y - 10, '#ffd0d8', true);
          SFX.shatter();
        }
      }
      return;
    }
    // each shot: its mark follows her for `aim` s, holds still `lock` s, then the laser
    for (const q of e.shots ?? []) {
      const was = q.t;
      q.t += dt;
      if (q.t < 0) continue;
      if (was < 0) SFX.beam();
      if (q.t < D.aim) {
        const k = Math.min(1, dt * 5);
        q.tx += (P.x - q.tx) * k;
        q.ty += (P.y - q.ty) * k;
      } else if (q.t > D.aim + D.lock && !q.fired) {
        q.fired = true;
        SFX.zap();
        G.shake = Math.max(G.shake, 2);
        if (Math.abs(P.x - q.tx) < D.r && Math.abs(P.y - q.ty) < D.r * 0.5 && P.z < 60)
          hitPlayer(D.dmg, P.x >= q.tx ? 1 : -1, false);
      }
    }
    if (e.shots?.every((q) => q.t > D.aim + D.lock + D.beam)) {
      e.shots = null;
      e.dm = 'home';
      e.droneCd = opts.cd(e, D.cd);
    }
    for (let i = 0; i < e.dr.length; i++) {
      const d = e.dr[i],
        q = busy(e, i);
      // a drone at work keeps off to one side of its mark, up high; else beside it
      const [tx, ty, tz] = q ? [q.tx + (i % 2 ? 1 : -1) * D.keep, q.ty - 20, D.z] : home(e, i);
      const k = Math.min(1, dt * (q ? 4 : 3));
      d.x += (tx - d.x) * k;
      d.y += (ty - d.y) * k;
      d.z += (tz - d.z) * k;
    }
  }
  /** The drones' shadows and the marks of their shots on the ground. */
  function droneGround(e) {
    if (!e.dr) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    for (const d of e.dr) {
      ctx.beginPath();
      ctx.ellipse(d.x - G.cam, d.y, 22, 7, 0, 0, TAU);
      ctx.fill();
    }
    for (const q of e.shots ?? []) {
      if (q.t < 0 || q.t > D.aim + D.lock + D.beam) continue;
      const x = q.tx - G.cam,
        y = q.ty,
        lock = q.t > D.aim,
        r = D.r * (lock ? 1 : 1.2 - 0.2 * (q.t / D.aim));
      ctx.strokeStyle = lock ? 'rgba(255,40,60,.95)' : 'rgba(255,80,90,.6)';
      ctx.fillStyle = lock ? 'rgba(255,40,60,.22)' : 'rgba(255,80,90,.1)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.45, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - r - 8, y);
      ctx.lineTo(x + r + 8, y);
      ctx.moveTo(x, y - r * 0.45 - 6);
      ctx.lineTo(x, y + r * 0.45 + 6);
      ctx.stroke();
    }
    ctx.restore();
  }
  /** A drone of its: a black lacquered disc with red trim, a golden crest, one red eye, two
   *  thrusters burning under it. At (x, y) on screen. */
  function drawDrone(x, y, face) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.2;
    // the thrusters' flames
    if (!APP.lowFx) {
      ctx.shadowColor = A.glow;
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = 'rgba(255,120,140,.85)';
    for (const s of [-1, 1]) {
      const f = 10 + Math.sin(G.time * 50 + s) * 4;
      ctx.beginPath();
      ctx.moveTo(s * 16 - 5, 8);
      ctx.lineTo(s * 16, 8 + f);
      ctx.lineTo(s * 16 + 5, 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    // the crest
    ctx.fillStyle = '#e3b23c';
    ctx.beginPath();
    ctx.moveTo(-2, -10);
    ctx.quadraticCurveTo(-12, -18, -16, -26);
    ctx.quadraticCurveTo(-4, -20, 0, -12);
    ctx.quadraticCurveTo(6, -20, 16, -26);
    ctx.quadraticCurveTo(12, -16, 2, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // the body
    ctx.fillStyle = A.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 12, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = A.trim;
    ctx.fillRect(-26, -2, 52, 4);
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#3a3f4c';
      ctx.beginPath();
      ctx.ellipse(s * 16, 7, 7, 4, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // the eye
    ctx.fillStyle = '#16080c';
    ctx.beginPath();
    ctx.arc(face * 10, 0, 7, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff3b5c';
    if (!APP.lowFx) {
      ctx.shadowColor = A.glow;
      ctx.shadowBlur = 12;
    }
    ctx.beginPath();
    ctx.arc(face * 11, 0, 3.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  /** A beam of red light from (x0, y0) to (x1, y1) on screen; `w` its width, `a` how bright. */
  function beam(x0, y0, x1, y1, w, a) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,59,92,${0.5 * a})`;
    ctx.lineWidth = w * 2.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,235,240,${a})`;
    ctx.lineWidth = w * 0.7;
    ctx.stroke();
    ctx.restore();
  }
  /** The drones, and their lasers. */
  function drawDrones(e) {
    if (!e.dr) return;
    for (const q of e.shots ?? []) {
      if (!q.fired || q.t > D.aim + D.lock + D.beam) continue;
      const d = e.dr[q.i];
      beam(d.x - G.cam, d.y - d.z + 8, q.tx - G.cam, q.ty, 10, 1);
    }
    for (const d of e.dr) if (!d.boom) drawDrone(d.x - G.cam, d.y - d.z, e.face);
  }

  return { attack: droneAttack, tick: droneTick, ground: droneGround, draw: drawDrones };
}
