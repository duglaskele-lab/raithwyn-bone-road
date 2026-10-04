// The skeleton samurai: an elite with a katana (numbers in SAMURAI and TYPES.samurai). Out of
// reach of its cut it takes a ready stance and creeps up; step inside and it cuts in a wide
// arc. A hit from afar breaks the stance and dazes it; without the stance it kicks.
import { SAMURAI } from '../config.js';
import { rnd } from '../util.js';
import { P } from '../state.js';
import { SFX } from '../audio.js';
import { hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go, inFront, moveTo } from './kit.js';

const restCd = () => rnd(SAMURAI.stanceCd[0], SAMURAI.stanceCd[1]);

export default defineFoe('samurai', {
  moves: [
    {
      // out of reach of its cut it drops into its ready stance and creeps up
      when: (e, s) =>
        !s.pdown && (e.stanceCd ?? 0) <= 0 && s.adx > SAMURAI.range && s.adx < 460 && s.ady < 120,
      go(e) {
        go(e, 'stance', 0, { engage: false });
        SFX.stance();
      },
    },
  ],
  // the kick's recovery is not the follow-through of a cut
  on: { windup: (e) => (e.cut = false) },
  /**
   * Its guard. A hit from afar (a bone, a dark ball, the super) breaks the stance and dazes
   * it; a blow up close only sets off the cut. The cut is too fast to stop, and a dazed
   * samurai stays dazed unless it is knocked flat.
   */
  guard(e, knock, src) {
    const far = src === 'bone' || src === 'hado' || src === 'super';
    if (e.state === 'stance' || e.state === 'draw') {
      if (far) {
        go(e, 'daze', 0, { z: 0 });
        SFX.daze();
      } else if (e.state === 'stance') go(e, 'draw');
      return true;
    }
    if (e.state === 'slash') return true;
    return e.state === 'daze' && !knock;
  },
  states: {
    stance(e, dt, s) {
      // eyes burning, katana low: one step inside its range and it cuts
      faceP(e);
      const f = s.dx * e.face;
      if (!s.pdown && f > 0 && f < SAMURAI.range && s.ady < SAMURAI.dy && P.z < 120) {
        go(e, 'draw');
        return;
      }
      if (s.pdown || e.t > SAMURAI.stance) {
        go(e, 'chase', 0, { stanceCd: restCd() });
        return;
      }
      moveTo(e, P.x - e.face * SAMURAI.range * 0.7, P.y, SAMURAI.walk, dt);
    },
    draw(e) {
      if (e.t > SAMURAI.draw) {
        go(e, 'slash', 0, { hitDone: false, cut: true });
        SFX.katana();
      }
    },
    slash: {
      pin: true,
      // a wide arc in front of it, stepping through
      tick(e, dt) {
        if (e.t < SAMURAI.slash * 0.7) e.x += e.face * SAMURAI.lunge * dt;
        if (!e.hitDone && inFront(e, SAMURAI.back, SAMURAI.arc, SAMURAI.dy, 130)) {
          e.hitDone = true;
          hitPlayer(SAMURAI.dmg, e.face, true);
        }
        if (e.t > SAMURAI.slash) go(e, 'recover', 0, { stanceCd: restCd() });
      },
    },
    daze(e) {
      if (e.t > SAMURAI.daze) {
        go(e, 'chase');
        e.cd = Math.max(e.cd, 0.4);
        e.stanceCd = restCd();
      }
    },
  },
});
