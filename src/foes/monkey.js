// The bone monkey: quick and weak, keeps its distance and pounces from afar.
import { clamp } from '../util.js';
import { P } from '../state.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';
import { boneSeg } from '../skeleton.js';

export default defineFoe('monkey', {
  look: {
    back(c) {
      const { e, dk } = c;
      const wv = Math.sin(e.anim * 6) * 5;
      boneSeg(
        [
          [-4, 0],
          [-18, 5],
          [-30, -3 + wv],
          [-37, -17 + wv],
          [-31, -28 + wv],
        ],
        3,
        dk,
      );
    },
  },
  stand: 215,
  engaged: [
    {
      when: (e, s) => s.adx > 110 && s.adx < 340 && s.ady < 34,
      go: (e) => go(e, 'lwind'),
    },
  ],
  pose: {
    // hunched, long arms hanging forward
    base: {
      set: {
        lean: 0.5,
        head: -0.35,
        aF: (e, k) => [0.55 + 0.05 * k.br, 0.25],
        aB: [0.4, 0.15],
        lF: [0.5, -0.5],
        lB: [0.2, -0.8],
      },
    },
    walk(o, e) {
      const s = Math.sin(e.walkT);
      o.lean = 0.55;
      o.aF = [0.5 + 0.5 * s, 0.2 + 0.5 * s];
      o.aB = [0.5 - 0.5 * s, 0.2 - 0.5 * s];
    },
    states: {
      lwind: {
        set: {
          lF: [1.2, -0.8],
          lB: [1, -1],
          aF: [-0.7, -0.3],
          aB: [-0.9, -0.5],
          lean: 0.7,
          jaw: 4,
        },
      },
      leap: {
        set: {
          aF: [2.5, 2.1],
          aB: [2.2, 1.8],
          lF: [1.3, -0.3],
          lB: [1, -0.7],
          lean: 0.75,
          hipH: 30,
          jaw: 6,
        },
      },
    },
  },
  states: {
    lwind(e, dt, s) {
      faceP(e);
      if (e.t > 0.3) {
        go(e, 'leap', 0, {
          hitDone: false,
          vx: clamp(s.dx / 0.72, -480, 480),
          vyd: clamp(s.dy / 0.72, -80, 80),
          vz: 540,
        });
        SFX.jump();
      }
    },
    leap: {
      pin: true,
      tick(e, dt) {
        e.x += e.vx * dt;
        e.y += e.vyd * dt;
        e.vz -= 1500 * dt;
        e.z += e.vz * dt;
        if (
          !e.hitDone &&
          Math.abs(P.x - e.x) < 40 &&
          Math.abs(P.y - e.y) < 24 &&
          Math.abs(P.z - e.z) < 95
        ) {
          e.hitDone = true;
          hitPlayer(e.T.dmg, Math.sign(e.vx) || 1, false);
        }
        if (e.z <= 0 && e.vz < 0) {
          e.z = 0;
          go(e, 'recover');
          dust(e.x, e.y, 3);
        }
      },
    },
  },
});
