// Every foe of the game. To add one: give it stats in TYPES (config.js), a name in i18n.js,
// write src/foes/<name>.js with defineFoe() and import it here.
import './common.js';
import './grunt.js';
import './thrower.js';
import './brute.js';
import './fat.js';
import './biker.js';
import './monkey.js';
import './necro.js';
import './zombie.js';
import './samurai.js';
import './baron.js';
import './dragon.js';
export { FOES, STATES } from './registry.js';
