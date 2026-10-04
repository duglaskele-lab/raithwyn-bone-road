// The bone thrower keeps its distance (TYPES.thrower.keep) and throws bones along the road.
import { G } from '../state.js';
import { defineFoe } from './registry.js';

export default defineFoe('thrower', {
  strike(e) {
    G.projs.push({
      k: 'ebone',
      x: e.x + e.face * 34,
      y: e.y,
      z: 108 * e.T.scale,
      vx: e.face * 340,
      rot: 0,
      life: 3,
    });
  },
});
