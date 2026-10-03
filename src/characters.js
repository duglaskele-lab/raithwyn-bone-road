// The fighter roster shown on the character select screen. Names and descriptions live in
// i18n.js under `chars`; stats are words from `level` there, drawn as bars of LEVEL segments.
export const CHARS = [
  {
    id: 'raithwyn',
    img: 'raithwyn',
    hover: 'raithwyn_grin',
    playable: true,
    col: '#b05cff',
    stats: { hp: 'medium', dmg: 'medium', spd: 'medium', mag: 'strong' },
  },
  {
    id: 'lucy',
    img: 'lucy',
    col: '#f0b429',
    stats: { hp: 'weak', dmg: 'high', spd: 'high', mag: 'none' },
  },
  {
    id: 'tiger',
    img: 'tiger',
    col: '#ff8a2e',
    stats: { hp: 'good', dmg: 'high', spd: 'low', mag: 'card' },
  },
  {
    id: 'gumdong',
    img: 'gumdong',
    col: '#9fb2c4',
    stats: { hp: 'good', dmg: 'medium', spd: 'medium', mag: 'medium' },
  },
];
// Fighters that are not unlocked yet: dark slots with a question mark.
export const LOCKED = 4;
export const SLOTS = CHARS.length + LOCKED;
export const STATS = ['hp', 'dmg', 'spd', 'mag'];
export const LEVEL = { none: 0, low: 2, weak: 2, medium: 3, good: 4, high: 4, strong: 5, card: 3 };
export const PORTRAITS = ['raithwyn', 'raithwyn_grin', 'lucy', 'tiger', 'gumdong'];
