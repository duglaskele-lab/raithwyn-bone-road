// The fatso: punches, and now and then jumps and slams the ground around it. Past the last
// third of the slam's wind-up nothing stops it.
import { FAT, SLAM_R, SWIND, SWIND_LOCK, TAU } from '../config.js';
import { rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';

export default defineFoe('fat', {
  init: { slamCd: [1.5, 3] },
  timers: ['slamCd', 'heavyT'],
  moves: [
    {
      when: (e, s) => e.slamCd <= 0 && s.adx < 200 && s.ady < 80 && !s.pdown,
      go: (e) => go(e, 'swind', 0, { engage: false }),
    },
  ],
  pose: {
    states: {
      // both arms up, then the jump
      swind: {
        set: { jaw: 5 },
        tween: {
          dur: 0.5,
          from: { aF: 'pre', aB: [0.02, 0.95], lean: 0 },
          to: { aF: [2.9, 3.2], aB: [2.7, 3.0], lean: -0.15 },
        },
        fn(o, e) {
          if (e.z > 0) {
            o.lF = [0.9, -0.5];
            o.lB = [0.7, -0.7];
            o.hipH = 46;
          }
        },
      },
    },
  },
  states: {
    swind(e) {
      faceP(e);
      const h = e.t - 0.55;
      e.z = h > 0 ? Math.sin(Math.min(1, h / 0.35) * Math.PI) * 60 : 0;
      if (e.t < SWIND) return;
      e.z = 0;
      go(e, 'recover', -0.5, { slammed: true, slamCd: rnd(4.5, 7) });
      SFX.heavy();
      SFX.thud();
      G.shake = Math.max(G.shake, 12);
      G.parts.push({ k: 'gring', x: e.x, y: e.y, t: 0, life: 0.4, s: SLAM_R, col: '#ffe2b0' });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        dust(e.x + Math.cos(a) * SLAM_R * 0.8, e.y + Math.sin(a) * SLAM_R * 0.29, 1);
      }
      const ex = (P.x - e.x) / SLAM_R,
        ey = (P.y - e.y) / (SLAM_R * 0.36);
      if (ex * ex + ey * ey < 1 && P.z < 24) hitPlayer(16, P.x >= e.x ? 1 : -1, true);
    },
  },
  /**
   * Past the last third of the slam's wind-up nothing stops him. Otherwise it takes two heavy
   * blows within FAT.window seconds to knock him down: the first only makes him flinch.
   */
  guard(e, knock, src, dir) {
    if (e.state === 'swind' && e.t >= SWIND_LOCK) return true;
    if (!knock || e.state === 'air') return false;
    if (e.heavyT > 0) {
      e.heavyT = 0; // the second blow in time: down he goes
      return false;
    }
    e.heavyT = FAT.window;
    if (['windup', 'attack', 'swind'].includes(e.state)) e.x += dir * 4;
    else go(e, 'hurt', 0, { z: 0, vx: dir * 95 });
    return true;
  },
  unstoppable: (e) => e.state === 'swind' && e.t >= SWIND_LOCK,
});
