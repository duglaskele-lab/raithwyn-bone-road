// Interface text in English and Russian. The first launch is always in English; the choice
// made in the title menu is remembered in localStorage.
export const LANGS = ['en', 'ru'];
const KEY = 'raithwyn.lang';

export const STR = {
  en: {
    langName: 'English',
    docTitle: 'Raithwyn: Bone Road',
    canvasLabel: 'Game: Raithwyn versus the skeletons',
    subtitle: 'Bone Road',
    stage1: 'Stage 1',
    menuStart: 'Start game',
    menuLang: 'Language',
    menuHint: 'W/S choose · Enter select · A/D language',
    menuHintTouch: 'Tap to start · tap the language to switch',
    rowAtk: 'Punch, a combo of three',
    rowJump: 'Jump, you can punch in the air',
    rowBone: 'Throw a bone (10 rage)',
    rowHado: 'Hadouken, three power levels',
    rowSuper: 'Super: hold with full rage',
    keySpace: 'Space',
    titleTip: 'The more rage, the stronger the hadouken',
    pause: 'Paused',
    resumeTouch: 'Tap the screen to continue',
    resumeKey: 'P to continue',
    overTitle: 'The road claimed you',
    score: 'Score: ',
    restartTouch: 'Tap the screen to try again',
    restartKey: 'Enter to try again',
    winTitle: 'The road is clear',
    againTouch: 'Tap the screen to play again',
    againKey: 'Enter to play again',
    rage: 'Rage',
    hado1: 'Hadouken I',
    hado2: 'Hadouken II',
    hado3: 'Super ready',
    go: 'Go',
    muted: 'Sound off',
    immune: 'Combo immunity {0} s',
    immuneShort: 'Combo immunity',
    interrupted: 'Attack interrupted',
    unhorsed: 'Knocked off the bike',
    lowRage: 'Not enough rage',
    needFull: 'Super needs full rage',
    plusHp: '+35 health',
    plusRage: '+50 rage',
    bossBanner: 'Lord of the road',
    help: {
      move: ['Move', 'W A S D / arrows'],
      run: ['Run', 'Shift / double tap'],
      atk: ['Punch', 'J'],
      jump: ['Jump', 'Space'],
      bone: ['Bone', 'K'],
      hado: ['Hadouken', 'L'],
      super: ['Super', 'hold I'],
      pause: ['Pause', 'P'],
      mute: ['Sound', 'M'],
    },
    pad: { hado: 'Hado', bone: 'Bone', jump: 'Jump', atk: 'Hit', super: 'Super' },
    foe: {
      grunt: 'Skeleton',
      thrower: 'Bone Thrower',
      brute: 'Bonebreaker',
      fat: 'Fatso',
      biker: 'Rocker',
      monkey: 'Bone Monkey',
      necro: 'Necromancer',
      boss: 'Grave Baron',
    },
  },
  ru: {
    langName: 'Русский',
    docTitle: 'Raithwyn: Костяной тракт',
    canvasLabel: 'Игра: Raithwyn против скелетов',
    subtitle: 'Костяной тракт',
    stage1: 'Стадия 1',
    menuStart: 'Начать игру',
    menuLang: 'Язык',
    menuHint: 'W/S выбор · Enter принять · A/D язык',
    menuHintTouch: 'Коснись, чтобы начать · коснись языка, чтобы сменить',
    rowAtk: 'Удар, серия из трёх',
    rowJump: 'Прыжок, в полёте можно бить',
    rowBone: 'Бросок кости (10 ярости)',
    rowHado: 'Хадукен, три уровня силы',
    rowSuper: 'Суперудар: зажать при полной ярости',
    keySpace: 'Пробел',
    titleTip: 'Чем больше ярости, тем сильнее хадукен',
    pause: 'Пауза',
    resumeTouch: 'Коснись экрана, чтобы продолжить',
    resumeKey: 'P — продолжить',
    overTitle: 'Тракт забрал тебя',
    score: 'Очки: ',
    restartTouch: 'Коснись экрана, чтобы начать заново',
    restartKey: 'Enter — начать заново',
    winTitle: 'Тракт очищен',
    againTouch: 'Коснись экрана, чтобы сыграть ещё раз',
    againKey: 'Enter — сыграть ещё раз',
    rage: 'Ярость',
    hado1: 'Хадукен I',
    hado2: 'Хадукен II',
    hado3: 'Суперудар готов',
    go: 'Вперёд',
    muted: 'Звук выключен',
    immune: 'Иммунитет к комбо {0} с',
    immuneShort: 'Иммунитет к комбо',
    interrupted: 'Атака прервана',
    unhorsed: 'Сбит с мотоцикла',
    lowRage: 'Мало ярости',
    needFull: 'Нужна полная ярость',
    plusHp: '+35 здоровья',
    plusRage: '+50 ярости',
    bossBanner: 'Хозяин тракта',
    help: {
      move: ['Ходить', 'W A S D / стрелки'],
      run: ['Бег', 'Shift / двойное нажатие'],
      atk: ['Удар', 'J'],
      jump: ['Прыжок', 'Пробел'],
      bone: ['Кость', 'K'],
      hado: ['Хадукен', 'L'],
      super: ['Суперудар', 'зажать I'],
      pause: ['Пауза', 'P'],
      mute: ['Звук', 'M'],
    },
    pad: { hado: 'Хаду', bone: 'Кость', jump: 'Прыг', atk: 'Удар', super: 'Супер' },
    foe: {
      grunt: 'Скелет',
      thrower: 'Костемёт',
      brute: 'Костолом',
      fat: 'Пузан',
      biker: 'Рокер',
      monkey: 'Костяная мартышка',
      necro: 'Некромант',
      boss: 'Могильный барон',
    },
  },
};

function load() {
  try {
    const v = localStorage.getItem(KEY);
    if (LANGS.includes(v)) return v;
  } catch {
    // storage blocked: fall through to the default
  }
  return 'en';
}

export let lang = typeof localStorage === 'undefined' ? 'en' : load();
const listeners = [];

/** Translates a key; `{0}`, `{1}`… are replaced by the extra arguments. */
export function t(key, ...args) {
  const s = STR[lang][key] ?? STR.en[key] ?? key;
  return typeof s === 'string' ? s.replace(/\{(\d)\}/g, (_, i) => args[i]) : s;
}
export const foeName = (type) => STR[lang].foe[type] ?? type;

export function setLang(l) {
  if (!LANGS.includes(l)) return;
  lang = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    // not saved, but the switch still applies to this session
  }
  for (const f of listeners) f(l);
}
export const nextLang = () => setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]);
export const onLang = (f) => listeners.push(f);
