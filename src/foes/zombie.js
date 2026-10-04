// Zombies come in crowds: they grab the player, lose their heads to hits and now and then
// tear the head off themselves and throw it.
import { ACID, ZOMBIE } from '../config.js';
import { clamp } from '../util.js';
import { P } from '../state.js';
import { SFX } from '../audio.js';
import { grabPlayer, popHead } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go, lob } from './kit.js';

export default defineFoe('zombie', {
  engageCap: 4,
  moves: [
    {
      // rarely: tear off its own head and lob it
      when: (e, s, dt) =>
        !e.headless &&
        !s.pdown &&
        e.cd <= 0 &&
        s.adx > 170 &&
        s.adx < 420 &&
        s.ady < 60 &&
        Math.random() < ZOMBIE.throwRate * dt,
      go: (e) => go(e, 'hwind', 0, { engage: false }),
    },
  ],
  connect(e) {
    if (!grabPlayer(e)) return false;
    go(e, 'grab');
    return true;
  },
  guard(e, knock, src, dir) {
    if (!e.headless && (knock || src === 'hado' || Math.random() < ZOMBIE.headOff)) popHead(e, dir);
    return false;
  },
  states: {
    // holds on while the player is stuck; lets go when the player breaks free or gets hit
    grab(e) {
      faceP(e);
      if (P.state !== 'grabbed' || P.grabber !== e) go(e, 'recover');
    },
    hwind(e) {
      faceP(e);
      if (e.t <= 0.55) return;
      const x0 = e.x + e.face * 20,
        f = ZOMBIE.headFlight;
      e.headless = true;
      SFX.swing();
      lob(e, 'zhead', x0, 160 * e.T.scale, f, ACID.g, clamp((P.x - x0) * e.face, 120, 420), 100, {
        col: e.T.col,
        eye: e.T.eye,
        life: 3,
      });
      go(e, 'recover');
    },
  },
});
