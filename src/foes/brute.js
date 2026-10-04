// The bonebreaker: a slow club swing that smashes the ground in front of it.
import { G } from '../state.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { defineFoe } from './registry.js';

export default defineFoe('brute', {
  attackTick(e) {
    if (e.t > 0.06) {
      e.hitDone = true;
      dust(e.x + e.face * e.T.reach * 0.8, e.y, 6);
      G.shake = Math.max(G.shake, 6);
      SFX.thud();
    }
  },
});
