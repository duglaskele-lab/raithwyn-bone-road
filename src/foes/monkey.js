// The bone monkey: quick and weak, keeps its distance and pounces from afar.
import { clamp } from '../util.js';
import { P } from '../state.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';

export default defineFoe('monkey', {
  stand: 215,
  engaged: [
    {
      when: (e, s) => s.adx > 110 && s.adx < 340 && s.ady < 34,
      go: (e) => go(e, 'lwind'),
    },
  ],
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
