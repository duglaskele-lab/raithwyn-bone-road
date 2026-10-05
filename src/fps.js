// Frames per second: the counter shown in a corner (if chosen in the settings) and the limit
// on how often the game draws (60 by default). Both are remembered in localStorage.
const KEY = 'raithwyn.fps';
/** The limits to choose from, frames per second. */
export const CAPS = [30, 45, 60, 75, 125];
export const fps = { show: false, cap: 60, now: 0 };

try {
  const v = JSON.parse(localStorage.getItem(KEY));
  if (typeof v?.show === 'boolean') fps.show = v.show;
  if (CAPS.includes(v?.cap)) fps.cap = v.cap;
} catch {
  // no storage (or nothing saved): the defaults
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ show: fps.show, cap: fps.cap }));
  } catch {
    // not saved, but it still applies to this session
  }
}
export function toggleFps() {
  fps.show = !fps.show;
  save();
}
/** The next limit up (dir 1) or down (-1), round the list. */
export function stepCap(dir = 1) {
  fps.cap = CAPS[(CAPS.indexOf(fps.cap) + dir + CAPS.length) % CAPS.length];
  save();
}

// The pacing: the screen calls back at its own rate (60, 90, 120, 144 times a second); a frame
// is only drawn once its turn under the limit has come. The turns keep their own clock, so 45
// on a 60 Hz screen draws three frames of every four, not every second one.
let next = 0;
/** Should a frame be drawn at `ts` (ms)? */
export function due(ts) {
  const step = 1000 / fps.cap;
  // a millisecond and a half of slack: the screen's ticks are not exactly even
  if (ts < next - 1.5) return false;
  next = ts - next > step ? ts + step : next + step; // after a stall, start the turns afresh
  return true;
}

// The counter: frames drawn over the last half second.
let n = 0,
  t0 = 0;
/** Counts a drawn frame at `ts` (ms). */
export function countFrame(ts) {
  n++;
  if (ts - t0 >= 500) {
    fps.now = Math.round((n * 1000) / (ts - t0));
    n = 0;
    t0 = ts;
  }
}
