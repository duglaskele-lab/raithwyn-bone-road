// The necromancer keeps its distance and lobs balls of acid that leave puddles; cornered, it
// swings its staff.
import { ACID } from '../config.js';
import { clamp } from '../util.js';
import { P } from '../state.js';
import { SFX } from '../audio.js';
import { hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go, inFront, lob } from './kit.js';

export default defineFoe('necro', {
  aimDy: 90,
  moves: [
    {
      when: (e, s) => !s.pdown && e.cd <= 0 && s.adx < e.T.reach + 10 && s.ady < 18,
      go: (e) => go(e, 'staff', 0, { hitDone: false }),
    },
  ],
  // lobbed at where the player stands now, landing after ACID.flight seconds
  strike(e) {
    SFX.acid();
    const x0 = e.x + e.face * 40 * e.T.scale;
    lob(
      e,
      'acid',
      x0,
      150 * e.T.scale,
      ACID.flight,
      ACID.g,
      clamp((P.x - x0) * e.face, 120, 460),
      120,
      {
        life: 3.2,
      },
    );
  },
  states: {
    staff(e) {
      faceP(e);
      if (!e.hitDone && e.t > 0.32) {
        e.hitDone = true;
        SFX.swing();
        if (inFront(e, 14, e.T.reach + 18, 24, 70)) hitPlayer(e.T.dmg, e.face, false);
      }
      if (e.t > 0.5) go(e, 'recover');
    },
  },
});
