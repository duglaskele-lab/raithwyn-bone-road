# Ai RAGE: Raithwyn — Bone Road

A beat 'em up prototype in the spirit of Streets of Rage. Raithwyn, a fox who wields dark magic,
fights her way across a graveyard at night through skeletons, zombies and necromancers to the
crypt of the Grave Baron, and beyond it to the lair of the Bone Dragon.

**Play:** https://duglaskele-lab.github.io/raithwyn-bone-road/ · single-file version:
[`/single.html`](https://duglaskele-lab.github.io/raithwyn-bone-road/single.html) (save it with
`Ctrl+S` and it runs from disk, offline).

The game is in English and Russian: it always starts in English, the language is changed in the
settings and remembered by the browser.

After the splash screen comes the main menu: Start game, Settings, Exit. Before the fight there
is the fighter select: four portraits (Raithwyn, Lucy, Tiger man, Gumdong) and four locked slots.
Every fighter has a description and stats. Raithwyn and Lucy are playable (Lucy for testing:
she has her own sprites for standing, idle, walking, running, jumping, punching, a pistol shot,
a grenade throw, taking a hit and being knocked down, every other animation shows her standing
frame, and she plays with Raithwyn's moves for now. Her `K` is a pistol instead of the bone:
it holds seven rounds (shown under her rage bar) and costs no rage; a shot does 9 damage, the bullet flies at 2400 px/s and hits the first enemy or barrel in its way, going out in
the middle of it (`BULLET` in `src/config.js`), and with `K` held she keeps firing, aiming and
firing in turn. Out of rounds, `K` only clicks. Her punches are 20% weaker than Raithwyn's, but
while she is short of rounds a punch that lands knocks a pistol magazine out of the enemy one
time in seven (14%), unless one is already about; it bounces back off the screen's edges, lies
there three seconds (blinking at the end) and is gone; picked up, it fills the gun again
(`LUCY`). Each pistol hit in a row raises the chance of a critical shot by 10%, up to 60%: twice
the damage, under a small red neon "crit!" (0.63 s); a miss, or a second without a shot, ends the run. A pistol bullet that meets her own grenade in
the air sets it off up there, 30% wider and 30% harder (`BLAST.airburst`). Her `I` is a grenade instead of the super: 100 rage; it flies in
an arc, spinning, lands, makes two little hops and blows up about 400 px ahead (it never leaves
the screen: at the edge it bounces back): 70 damage to every enemy in a
wide blast (250 px), knocking them down as a crushing blow does, it breaks barrels and sets red
ones off, and it spares her (`GRENADE` and `BLAST.grenade` in `src/config.js`). She has 20% less health than Raithwyn (80, `MAX_HP`), but
luck: a blow that would finish her has a 10% chance, plus 5% for each style rank (45% at SSS),
to leave her on 10% of her health instead; she goes down, gets up, and a blue neon sign above her
says "you feel lucky!" (`LUCK`). If she loses a stage anyway, she has her own line to say about
it. (She no longer dodges blows by chance: what happens to her depends only on the player.) Her `L` is a big gun instead of the dark ball, with no charging:
she draws it and fires, shot after shot while `L` is held; each shot costs a fifth of the bar
(60) and comes slower than her pistol's (0.36 s), in a shower of sparks. Its bullet is wide and
hard (40 damage) and goes on through whoever it hits, a fifth weaker each time, until nothing is
left of it (five enemies in a row at most); it always knocks enemies down as the last punch of a
chain does, a heavy blow (`BIG_GUN`). Her keys and touch buttons are named for her (Shot, Big
gun, Grenade) and her rage bar
is called Luck. When she wins a stage she sits down and
drinks from a bottle, on and on: a sip back and forth, the bottle lowered for a breath and raised
again, a long gulp with her head tipped back, one after another at random, up to 8 frames each,
`FIGHTER_ANIM.lucy.drink.ways`); the others can be looked at. The fighter
chosen goes into the run's replay.

The game is written in plain JavaScript and Canvas 2D, with no engine and no runtime
dependencies. Skeletons, backgrounds, effects and sound are made in code; the only pictures are
the heroine's sprite sheet and the portraits.

## Running

Node.js 20 or newer is needed.

```bash
npm install
npm run dev        # http://localhost:8080
```

Opening `index.html` with a double click does not work: browsers do not load ES modules from
disk. For that there is a single-file build:

```bash
npm run build      # dist/raithwyn.html — opens from disk, works offline
```

## Controls

| Action | Keys |
| --- | --- |
| Move | `W` `A` `S` `D` or arrows |
| Run | `Shift` or double tap left/right |
| Punch (a three-hit chain; in the air, a flying kick); hold it to keep punching on your own | `J` |
| Launcher: the third hit of the chain with "up" held throws the enemy up for juggling | `W` + `J` |
| Jump | `Space` |
| Throw a bone (costs 15 rage, 5% of the bar); Lucy fires her pistol, held to keep firing (seven rounds) | `K` |
| Dark ball (level I); Lucy: her big gun, shot after shot while held (60 rage a shot), each bullet through a whole line | `L` |
| Super attack: hold for 1 s with a full rage bar, hits everyone on screen; Lucy throws a grenade (100 rage) | hold `I` |
| Pause menu (resume, settings, main menu) / sound | `Esc` or `P` / `M` |
| Record video: start / stop and download the file | `F9` |
| FPS counter: show / hide | `F3` |
| Replay of the last run: watch / save to a file | `F7` / `F8` |

In the menus: `W`/`S` choose, `Enter` accepts, `Esc` goes back. In the settings `A`/`D` change
the language, the sound, the FPS counter and the FPS limit. After a defeat or a win `Esc` returns
to the main menu.

While the game's window is minimised or another tab is in front, sound and music are paused (and
so is the fight); come back and the music goes on from where it stopped.

**FPS.** Works the same on PC and on phones. In the settings: Show FPS (a counter at the top of
the screen, off by default; on PC `F3` also turns it on and off) and FPS limit: 30, 60, 90 or
none, 60 by default. The game never draws more often than the screen does: on a 60 Hz monitor
90 and none give the same 60, on 144 Hz none gives 144. Both choices are remembered by the
browser (`src/fps.js`). The game's speed does not depend on FPS: everything runs on elapsed
time.

**Rage.** The bar holds 300, in three equal steps of 100. Rage comes from chain hits (+5.25 for
each of the first two, +8.25 for the finisher, per enemy hit), the flying kick (+6), a bone that
hits (+3), taking a hit (+6) and rage pickups (+75); after losing a life at least 60 is left.

| Spend | Cost | Damage |
| --- | --- | --- |
| Bone | 15 | 7 |
| Dark ball I — press `L` | 100 | 50 |
| Dark ball II — hidden combo (see below) | 200 | 110 |
| Dark ball III — hidden combo (see below) | 300 | 180 |
| Super attack — hold `I` for 1 s with a full bar | 300 | 150 to everyone on screen |

`L` always throws a level I ball. The expert move is a hidden combo: `S` `S` `D` `L` throws the
ball to the right, `S` `S` `A` `L` to the left (within 0.8 s of the first `S`). It throws the
strongest ball the rage pays for: III with a full bar, II with two steps. Nothing on screen
hints at the combo. The higher the level, the more damage per point of rage and the wider the
ball, so saving up pays. The super attack only spends its rage when it strikes: if Raithwyn is
hit while gathering it, or the key is let go too early, the rage stays.

## Phones and tablets

The game is the same on a computer and on a phone: on a touch screen a stick and buttons appear
by themselves, and the hints say "tap" instead of naming keys (`src/touch.js`). Everything the
fingers do turns into the same presses as the keyboard's, so replays are shared.

- **Always sideways.** A web page cannot stop a phone from rotating the screen, so when the
  phone is held upright the game turns the page a quarter turn itself: the picture and the
  buttons always lie sideways, over the picture.
- **Buttons only in a fight.** The stick and the buttons only show during a stage. In the menus,
  the pause and at the end of a run they are hidden: items are chosen by tapping the picture
  itself. After a defeat or a win there are Try again / Play again and Main menu; after the
  first stage a tap anywhere goes on.
- **Floating stick:** it appears wherever the thumb touches the left part of the screen. A
  slight lean walks, a lean of about half way already runs (she nearly always runs). Quick
  down-down-forward flicks of the stick + Magic also give the hidden ball.
- **Buttons:** two big ones at the bottom — Hit and Jump — and three smaller ones above them —
  Super (hold), Bone and Magic (the dark ball). A finger can slide from one button to the next
  without lifting. **Swipe across Magic to the left or right** for the strongest dark ball that
  way (like `S S A L` / `S S D L`); a plain tap throws the ordinary ball.
- **Secrets:** hold the heroine's portrait for 3 s to go to the final boss (like `X`); hold the
  score for 2 s on the first screen to go to the second stage (like `Z` + `2`).
- **Full screen:** a button next to pause (Android; on iPhone use Share → Add to Home Screen and
  the game opens without the address bar). There is a `manifest.webmanifest` and an icon, so the
  game can be installed on the home screen like an app.
- **Vibration** (Android) on hits, on taking a hit and from explosions.
- **Slow devices:** if a couple of seconds of fighting run below ~42 frames per second, the
  picture lightens itself: fewer pixels, no blurred glow, and the red outline is drawn on a
  small layer round the enemy only (no longer a blinking red oval over it).

## Style

While the heroine keeps hitting enemies without taking damage, her style rank rises: D → C → B →
A → S → SS → SSS. Each rank adds +50% score and +5% damage, so SSS gives +350% score and +35%
damage. Stop
hitting, and after 3.5 seconds the bar drains fast; taking damage drops it by two ranks (S to B,
B to D, SSS to S). Hitting scenery gives no style points but keeps the bar from draining between fights.
The rank and the bar are shown on the left under the lives, from rank D up.

## Replays

Every run is recorded by itself. `F7` on the defeat, win or pause screen or in the main menu
plays the last run from the very start, exactly as it went. `F8` saves it to a
`raithwyn-replay-<date>.json` file (a few kilobytes). Drop the file on the game's page and the
replay starts. `Esc` stops watching. A replay is tied to the game's version: after balance
changes old files may drift from what happened.

How it works: all the randomness of the simulation comes from one seeded generator (`random()`
in `src/util.js`), and from the outside the simulation only gets the time step (in whole
milliseconds) and the buttons. A run is the seed plus, for each frame, the step and the pressed
buttons (`src/replay.js`). Screen shake and synth noise take their randomness elsewhere and do
not affect the game. The look of things has a generator of its own, so it is kept apart (and
tests check it):

- The game's generator (`random()`) is only for what happens in the game. Everything that only
  shapes the look — particles, bone debris, sparks, smoke, dust, whether a puff appears at all —
  comes from a second generator, `fxRandom()` (seeded with the run too). Nothing in the game
  reads particles, so the light picture (`APP.lowFx`, switched on by itself on a slow device,
  maybe in the middle of a run) is free to make fewer of them (it does: Raithwyn's bats and
  mist), and drawing a frame or not, at any frame rate, changes nothing.
- The state is in two parts (`src/state.js`): `APP`, the application, which lives as long as
  the page (the screen that is up, the menus, who the next run is played as, sound, the
  picture, notes on screen), and `G` and `P`, one run: the world and the heroine. `reset()`
  builds the run anew from scratch for every run and every replay (the old objects are emptied
  first, every field), so nothing a run leaves behind — the clock, a hit-stop, a burn under way,
  or a field added one day and forgotten — can carry over into the next one or into a replay.

## Readability and juggling

An enemy doing an attack that cannot be interrupted has a red outline: the last third of
Fatso's jump, the Baron's charge and acid breath, the Samurai's katana strike, the Dragon's beam
and jump, and the Dragon's attacks for a while after it has been stunned. Glows round an enemy
(Raithwyn's red one when blows have steadied her, her gathering dark ball) are drawn apart from
the outline, so they never turn into a solid red disc round her.

The third hit of the chain with "up" (`W`) held is a launcher: a light enemy flies up almost
vertically instead of sideways, ready to be finished in the air. Without "up" the third hit
knocks back as before. A light enemy in the air can be juggled: every hit in the air throws it
up again, a little lower each time, and gives style points.

**Enemy weight classes** (`weight` in `TYPES`, rules in `WEIGHT` in `src/config.js`):

| Class | Who | How it takes hits |
| --- | --- | --- |
| light (default) | Skeleton, Bone Thrower, Bonebreaker, Rocker, Bone Monkey, Necromancer, Zombie, Skeleton Samurai, Zombie Miner, Dynamite Zombie, Mutant Lizard | any hit interrupts its attack, a heavy hit knocks it back, easy to launch and juggle |
| medium | Fatso | ordinary hits do not interrupt its attack, a heavy hit does (it flinches); knocking back or launching takes two heavy hits within 3 seconds or one crushing hit; juggles like a light enemy in the air |
| heavy | Power Armor Zombie, the Prospector | its attacks are not interrupted; only a crushing hit knocks it back; not juggled in the air |
| bosses | Grave Baron, Bone Dragon, Radioactive Slime | their own rules (in their files in `src/foes`); the Slime's attacks are interrupted by the medium rules |

A heavy hit is the chain's finisher, the flying kick, the dark ball or the super attack. A
crushing hit is a level II or III dark ball or the super attack.

## Stage 1: Bone Road

Ordinary fights are put together anew at random every run (`WAVEGEN` in `src/config.js`,
`src/waves.js`). Each fight has a difficulty `lvl` from 0 to 1:

| Fight | Enemies | Strong (Bonebreaker, Fatso, Samurai) | Tricky (Thrower, Necromancer, Rocker) |
| --- | --- | --- | --- |
| first (0) | ~6 | ~0.3, at most one | ~0.9 |
| middle (0.55) | ~9 | ~2, at least one | ~2 |
| last before the Dragon (1) | ~12 | ~4 | ~4 |

The rest are skeletons, zombies (they climb out of the ground and come in pairs) and bone
monkeys. The Baron's fight and the Dragon's fight stay fixed. The randomness comes from the same
seeded generator, so a replay of a run has the same enemies.

The road is a quarter shorter than it used to be, and in two places the next wave comes right
after the one before, with no walk in between. Raithwyn's run is animated 15% slower so that her
legs do not move faster than she does.

Benches stand along the road, and stone crosses and big gravestones all over it; all of them
can be broken, and benches and crosses now and then drop rage. The Necromancer lobs balls of acid
in an arc: where one lands it leaves a puddle that eats a little health for a few seconds.

Zombies are slow and weak but come in crowds (there can be twice as many of them on screen as
other enemies). A zombie grabs the heroine and holds her still for about 1.4 seconds — mashing buttons
breaks free faster. A hit can knock a zombie's head off, and it keeps fighting; now and then a
zombie tears off its own head and throws it.

The fighter select has its own tense music.

Big gravestones break in three hits; a zombie (25%) or a skeleton (25%) may climb out of a
broken one. A Necromancer's ball that hits the heroine does not vanish and still leaves a
puddle.

Every second Rocker rides a long chopper of black iron and bone: spiked wheels, fire from the
pipes, a horned skull for a headlight and a ram of bone spikes. It hits along its whole length,
so it is harder to dodge.

**The Skeleton Samurai** is a medium-strength elite: white hakama, a bare ribcage, a red
headband and a katana. From afar it takes a ready stance (its eyes light up and leave a glowing
trail) and walks slowly towards the heroine. It only takes the stance after 3 seconds on screen
(never from beyond the edge of the screen), no more often than every 1.8–3.4 seconds, and sinks
into it slowly over 0.85 seconds, during which it does not cut yet. Out of the stance it kicks
up close, and further away (up to 175 px) swings its sword flat: half a second drawing the blade
back at shoulder height, then a flat cut in front of it at full arm's length (12 damage, no
knockdown); any hit from the heroine interrupts this cut. Come too close and it cuts in a wide
arc in front of it like lightning. A hit up close does not break the stance, it only provokes
that cut. Attacked from a distance (a bone, the dark ball, the super attack), it loses the
stance and is stunned for 2 seconds. Out of the stance it kicks.

**The Bone Dragon** is the final boss. Past the Baron's crypt there is one more fight with
skeletons and zombies, two hearts lie on the road, and beyond them waits a dracolich a quarter of
the screen in size. It is unhurried, but closes in on a distant heroine with a leaping pounce.
The Dragon picks an attack that will reach the heroine and never uses the same one twice in a
row: a bite (the lowered head then takes ×1.5 damage for a while), a claw swipe, the pounce, a
wide white beam from its bone heart across the whole arena (the heart charges for 1.3 seconds,
a pulse building up and white sparks flying out of it; dodge up or down), plasma — at a distant heroine it spits three plasma balls that fly in
an arc (one at her, two to the sides) and burst where they land — and, in the second phase
(below half health), a jump that strikes the landing area and sends a shock wave across the
whole arena that has to be jumped over. In the second phase the Dragon moves and attacks faster: at first only 15% faster, growing over
20 seconds to 30% faster, and its beam starts as wide as in the first phase but, while it burns (half as long
again in the second phase), widens to 2.4 times its width by the end. It also combines attacks: when the heroine is close, it may leap back to the far side of
the arena and charge the beam from there at once (as wide and as long as the beam of its current
phase). In the second phase it can also rise and hover over the side of the arena, light gathering in
its jaws, then fire three white beams from its mouth, turning its head (back over its shoulder at first) to sweep them slowly (each over 1.8 s, 30% slower than before, so that there is time to react) across
the whole arena from edge to edge, under itself too, all three side by side at once. The
arena's depth is split into five lines, three of them under beams and two safe, one of three
ways at random (`DRAGON.sky.ways`): every other line (its top edge, its middle and its bottom
edge, safe between them; here the beams are narrower, 17 px either way instead of 20), the bottom three (the top two safe) or the top three (the bottom two
safe) — the heroine has to find the right place on the arena. Where a beam passes, the ground burns for a while. Hovering, it is out of reach. Then it drops straight down with the quake and the shockwave of its leap. If the heroine stands
close behind the Dragon, it sometimes (no more than once in 7 seconds) kicks her with a hind
leg instead of turning round. The heroine's hits push the Dragon back a little. The beaten
Dragon does not crumble into bones: it roars one last time, sinks to the ground and falls apart —
skull, ribs, wings, tail, legs. The Dragon's fight has its own music: heavy and grotesque, faster
in the second phase, with funeral bells and an organ playing Dies irae. A strong hit (the
finisher, the flying kick, the dark ball, the super attack) during the wind-up of a bite, claw
or pounce stuns the Dragon, after which it cannot be interrupted for 4 seconds; the beam, the
jumps and the hovering beams are never interrupted. Acid drips from its jaws.

**Video recording.** `F9` starts recording the game — only the game's picture and sound, without
the cursor or windows; `F9` again stops it and the browser downloads a
`raithwyn-<date-time>.webm` file (`.mp4` in Safari). The red REC badge with a timer in the
corner of the page does not get into the video.

**Secret.** At the very start of the stage, before the first fight, hold `X` for 3 seconds and
the heroine is taken straight to the final boss.

**Music.** The stage and the Dragon's fight play the author's songs from "Vault of Trash VI"
(`assets/music/main.mp3` and `boss.mp3`; the loop points are in `SONGS` in `src/songs.js`, times
are of the original files):

- the stage theme starts at 1.35 s, plays to 2:52.3 and, with a light crossfade (0.3 s), goes
  back to 0:16.5 — the loop is exactly 92 bars long;
- the boss theme plays from its intro, then repeats 0:21.0–1:52.7 (54 bars); in the Dragon's
  second phase it moves on the next strong beat to 1:52.7 and repeats 1:54.4–3:07.6 (43 bars);
  when the Dragon falls apart, the song's ending plays from the next bar and finishes on the win
  screen.

The points are fitted to the beat grid (~141 BPM) near the timecodes the author gave. In the
pause the song plays quieter, and on a defeat it fades out. While the songs load (or if a file
fails to load), synthesised themes play: "Night on the Bone Road" in the stage and the Dragon's
theme. The main menu has the graveyard theme, the fighter select a tense theme; the western
theme is kept too. All synthesised themes are in `THEMES` in `src/audio.js`; `attach()` can render
any of them to a file through an `OfflineAudioContext`. On the website the songs are kept in the
browser's Cache Storage after the first visit (`cachedFetch` in `src/songs.js`) and are not
downloaded again; when a song is replaced, raise `MUSIC_CACHE` and the old copies are deleted.
The single-file build has the songs built in (which is why it weighs about 12 MB).

**Raithwyn, the other final boss** (when the player is not Raithwyn: Lucy meets her instead of
the Bone Dragon, to the Dragon's music; numbers in `EVIL` and `TYPES.evil`, code in
`src/foes/evil.js`). She is drawn with her own sprites and fights with the heroine's moves,
1000 health, in three stages by her health (above 66%, above 33%, below), with no show of a
change. She walks and runs at the heroine's own pace (180 and 435 px/s): in the first stage she
mostly walks and only now and then runs to close in or to get away, later more often. Like the heroine she
mostly faces the way she walks or runs, even away from the player (once she has kept going one
way for a moment); now and then she steps back near the player still facing her (`EVIL.face`).
- **Her coming** (`EVIL.intro`): violet bats wheel round the spot where she will stand (1.2 s),
  a violet mist gathers there (0.7 s), and she steps out of it laughing (1.3 s); nothing hurts
  her meanwhile, and until she is out there is not even a shadow.
- **Vanishing** (`EVIL.tele`), from the second stage: mist and bats burst from her and she is gone
  (0.35 s); for 0.7 s bats wheel and mist gathers somewhere else, at least 260 px from the
  player and often behind her, and she steps out of it (0.4 s). Nothing touches her while she
  is (all but) gone. She does it now and then (every 4.5–7.5 s at most), and more readily to
  get away from blows up close.
- **Chain of punches** up close: a red glint in her eyes (0.28 s), then three hits (8, 8, 14),
  the last one knocking down; then she stands open for 0.6 s.
- **Running jump kick**: far off and lined up, she runs straight at the player, gathering speed,
  and leaps forward kicking (14, a knockdown).
- **Bone** along the road (7 damage), never at a player within a quarter of the screen; in the
  third stage a fan of three.
- **Dark ball** of level I, II, III by stage (12, 18 knocking down, 26 knocking down and going on
  through): she holds it at her side (the second frame of her throw) for 0.45, 0.8 and 1.2 s,
  sparks flying out of it, more and faster the stronger it is; then the throw plays on and the
  ball flies. From the second stage on nothing stops it (a red outline).
- **Leap back** away from the player's attacks up close and, now and then, after a plain hit she
  takes; with a wall behind her she leaps the other way, over the player.
- **Rage**, from the second stage on, in a small bar under hers: 12 for a blow she lands, 5 for
  one she takes, and in the third stage 6 a second by itself. Full, she gathers a dark orb (1 s,
  as the heroine's super): a heavy blow breaks it and empties her rage (in the third stage
  nothing breaks it: a red outline). The orb rises over the middle of the arena and swells; for 1 s red
  marks on the ground show where each beam will start and the way it will run, and then for 5 s
  three beams from it run over the ground along their own paths (a wide sweep, a loop, a
  figure of eight), burning it violet (the fire hurts) and hurting 10 whoever they touch;
  meanwhile she starts no attack, only keeps her distance and leaps away.
- **The dandy** — at half health she calls up a skeleton finer than the others: a top hat with a
  purple band, a red rose in its teeth, a torn tailcoat with a red bow. It has 2000 health; the
  player's blows hurt it, and so do her own fists, bones, dark balls and beams. When she falls,
  it falls with her.

She takes blows as a light enemy does, with no time out of reach after one: a hit stops her, a
heavy one throws her. But four blows within 2.5 s steady her: for 2.5 s (a faint red glow round
her) she takes them as a medium enemy does, and two more blows meanwhile make her heavy for 3 s
(a strong red glow): then only a crushing blow moves her, and she cannot be juggled
(`EVIL.steady`). Killed, she falls and the stage is won.

**The Grave Baron.** The fight starts with seven zombies climbing out of the ground. Summoning
minions, the charge and the roar cannot be interrupted. When the Baron is below half health the
second phase begins: after a roar he gains an acid breath. 0.7 seconds of wind-up that cannot be
interrupted: the Baron throws his head back and acid drips from his mouth (the area is not
marked on the ground). Then he spits a stream of green acid: the drops fly in an arc and fall in
front of him across about a third of the screen, burning where they land. The breath leaves four
puddles behind.

## Stage 2: Old Quarry

A Wild West mining town at sunset and the mines beneath it. After the Dragon is beaten, "Stage
clear" appears, and a few seconds later (or at once with `J`) the game moves on to the second
stage; health, lives, rage and score carry over. If the heroine loses on the second stage, play
again restarts the second stage (and so does the `F7` replay).

**Not only to the right** (as in Teenage Mutant Ninja Turtles III: The Manhattan Project). The
stage's floor is a set of polygons and the camera runs along a path (`FLOOR` and `PATH` in
`src/level2.js`, `src/level.js`): Main Street runs to the right, then the street goes down a
slant to the lower street, which runs right again, and a second slant leads down to the miners'
camp under the cliff, then the mine's entrance and its tunnel to the hall of the final fight.
Fights only happen on the flat (no slope on a fight's screen); the slants are walked without a
fight. The GO arrow shows where the road goes. The second stage is about 30% longer than the
first, and each fight has a quarter fewer enemies (only a few at first).

**Scenery** (`src/bg2.js`). At the start, on the left by the road (it does not cover the road),
stands a simple wooden sign on two posts with a bull's skull and a lantern: "Welcome to OLD QUARRY — LOST 32120". The houses have no lettering — their signs show what is inside: a bottle at the saloon,
a star at the sheriff's, coins at the bank, a bed at the hotel, a coffin at the undertaker's,
scales, a horseshoe, scissors, pickaxes. Behind the houses is a sunset sky with mesas, cacti, a
windmill and a water tower. The second slant leads out of town past a fence, a water tower and a
stack of logs to the camp under a red sandstone cliff: a headframe with a turning wheel and
cable, a hoist house with a smoking chimney, crates, and in the cliff the mine's heavy timber
portal with crossed pickaxes, lanterns and rails into the dark. At the entrance the road blends
into the tunnel's dark floor and the light fades: inside the mine it is only light around the
heroine and at the lanterns on the props. The Slime's hall has a glowing green lake, the last
hall a broken drilling rig and red emergency lights.

**Barrels.** Wooden barrels break in two hits, and some hold a heart or rage. Red TNT barrels
blow up (`BLAST` in `src/config.js`, `src/blast.js`): a hit lights the fuse, and 0.9 s later the
barrel explodes — there is time to run; a bone, the dark ball or the super attack sets it off at
once. The blast hits everyone in a large radius, enemies and the heroine (if she is close),
breaks wooden barrels and a moment later sets off red ones nearby.

**Old Quarry's enemies** (numbers are in `TYPES`, `MINER`, `DYNAMITE`, `LIZARD`, `ARMOR`,
`SLIME`, `PROS`):

- **Zombie Miner** — the main enemy: a helmet with a lamp, a checked shirt with braces, a
  pickaxe. Strikes down with the pickaxe. Now and then raises the pickaxe over its head (0.7 s
  of wind-up) and charges in a straight line — a hit knocks the heroine down.
- **Zombies** from the first stage are the second main light enemy.
- **Dynamite Zombie** — tricky: a cowboy hat, a bandolier of sticks and a stick in hand (no
  pickaxe). Keeps its distance, lights a stick (the fuse burns 3 seconds), winds up for a long
  time and throws it in an arc; it does not reach for a stick often (every 3–5 seconds). The stick
  lies on the ground and explodes, hurting both the heroine and enemies; a blast sets off the
  sticks lying near it a moment later. Hit or kill it while it
  holds a lit stick and the stick drops at its feet and blows up there.
- **Mutant Lizard** — a light enemy (any hit interrupts its attack; about player size), like a Fallout deathclaw:
  hunched, horned, with long claws and glowing radioactive spots. Runs fast, sees the heroine's
  hits coming and leaps back (invulnerable at the start of the leap), and on landing lunges
  forward with a strike that knocks her down. Up close it claws. It is not a skeleton: killed, it
  does not crumble into bones but falls to the ground and lies there until it fades. Bodies do
  not count as enemies: as soon as no living ones are left, the fight is over and the way is
  open.
- **Power Armor Zombie** — a heavy elite enemy with a model twice as detailed (a little bigger
  than an ordinary enemy): riveted plates, hydraulics on the legs, a glowing reactor on the back,
  a cracked visor showing a dead face behind it, an antenna and an arm-mounted machine gun with
  an ammo belt. It never climbs out of the ground — it always comes from the edge of the screen;
  killed, it falls to the ground instead of crumbling into bones. It spins up the gun for a long
  time (1.2 s), tilting the barrel down, and fires for 2.6 s: bullets leave the muzzle and hit
  the ground (dust and tracers show where), first at its feet, then further and further away as
  the barrel rises; every third bullet in a row knocks the heroine down. Barrels in the stream
  burst (red ones blow up) and sticks of dynamite lying there go off. Up close it kicks: for
  0.6 s it raises its knee, the visor turns red and a "!" lights up above it (it knocks down).
  Now and then, at a distance, it crouches and leaps on the jets of its pack (flame and smoke
  trail behind it): a red area with a crosshair on the ground
  shows where it will land and what it will hit, filling up as it falls; half the time the spot
  is not the heroine's but a random one nearby. Landing hurts and knocks down everyone in the area. Up close, a quarter of its kicks become
  such a jump away to another spot instead. The reactor gauge on its back shows its
  health (green, yellow, red). Only a crushing hit moves it. No more than two in one wave.
- **Radioactive Slime** (miniboss, in the mine's flooded hall) — drops from the ceiling. Rolls
  across the hall and bounces off the edge once, jumps (not always at the heroine) and strikes an
  area on landing (it leaves no puddles), spits out zombies: they fly like projectiles and, once
  landed, get up and fight (no more than four at once). Its attacks are interrupted by the medium
  rules; instead of flying off it slides back.

**The finale: the Prospector** (boss of Old Quarry, 1300 health; numbers in `PROS` and
`TYPES.prospector`, code in `src/foes/prospector.js`). A giant zombie in grey power armour, 1.1
times the size of the Power Armor Zombie and drawn in finer detail: riveted plates with dents,
hazard stripes and orange trim, a helmet like the Power Armor's (a rounded dome with a glowing
visor slit and a crack over the dead face, two antennas), two red fuel tanks on its back
feeding a flamethrower on its arm through a hose, two short mortars over its shoulders, a
pressure gauge on its chest whose needle creeps into the red as it loses health, and steam
hissing out of its joints. It walks in from the edge of the screen and fights alone. Its
attacks:
- **Flamethrower** — the pilot light flares for 0.75 s, then the flame slowly grows out of the
  nozzle (0.9 s to its full 320 px) and burns for 1.6 s; standing in it burns 4 health every
  0.2 s without a knockdown (a burn that would kill knocks down). It sets the road alight
  behind its front: patches of fire that burn 3 health every 0.25 s and die down in 1.4 s
  (`PROS.fire`).
- **Walking flame** — it comes walking at the heroine for 2.6 s with the flame aimed at the road
  just in front of it, setting the ground before it on fire.
- **Ram** — it crouches for 0.85 s (a "!", and tongues of flame roaring out backwards from its
  tanks), then rushes in a straight line at 820 px/s up to 760 px or the screen's edge, knocking
  down whoever is in its way (24 damage) and bursting barrels, and skids to a stop. In the second
  phase it leaves a wide cone of fire on the ground behind it as it rushes, which burns and dies
  down in 0.8 s (`PROS.ram.trail`).
- **Mortars** — the barrels rise, and three shells go up one after another and come down where
  the heroine stands (a little to the side for all but the first), each on a red area marked on
  the ground that fills up as it falls; the blast (`BLAST.mortar`, r 115, 16 damage) knocks her
  down and spares the enemies. Shells cannot be shot down.
- **Jet jump** — as the Power Armor's, but bigger, and always onto the heroine.
- **Kick** up close, with a "!" and a reddened visor — but up close it mostly (65% of the time)
  moves somewhere else on its jets instead: a hop back, a slide aside in depth, a leap over the
  heroine to land on her other side, or the big jet jump to another spot of the arena; landed,
  it does not kick at once (`PROS.move`).

At half health its helmet flies off and rolls away: under it is a zombie's head in miner's
goggles. It fights harder: 25% faster on its feet and between attacks, the flame sweeps across
the road from one side to the other (2.2 s) and the mortars fire a fork of five shells. It is
heavy (only a crushing blow knocks it over, and only while it walks, kicks or skids to a stop
after the ram); the flame, the walking flame, the ram, the mortars, the jump and the loss of
the helmet cannot be interrupted by anything (red outline), and it cannot be hurt while it
tears off its helmet. Killed, it falls and the stage is won.

**Secret.** On the first screen of the first stage, before the first fight, hold `Z` and `2`
together for 2 seconds and the heroine goes straight to the entrance of Old Quarry. On the first
screen of Old Quarry, hold `X` for 3 seconds and she goes straight to the Prospector's arena.

**Music.** For now the second stage plays synthesised western themes (`THEMES` in
`src/audio.js`): "Old Quarry" (A minor, 136 BPM, Andalusian cadence, galloping bass, whistle,
trumpet, tremolo guitar, bells, choir and a whip crack) while walking, and "Showdown in the Deep"
(D minor, 156 BPM, trumpet fanfares, driving bass, bells and choir) in the Slime's fight and the
finale.

## Layout

```
index.html, styles.css    the page and its layout (touch buttons included)
assets/atlas.png          the heroine's sprite atlas
assets/lucy.png           Lucy's sprite atlas
assets/source/            the source sprite sheet, the idle video and full-size portraits
assets/portraits/         320×320 fighter portraits for the game
assets/music/             the stage and boss songs (mp3)
src/
  config.js               every balance number: enemies, waves, rage steps
  i18n.js                 English and Russian texts, the language choice
  menu.js                 main menu, settings, fighter select
  fps.js                  FPS counter and frame limit
  characters.js           the fighters and their stats
  style.js                style rank and its bonuses
  dragon.js               the Bone Dragon: behaviour, hit zones, drawing
  level.js                stages: floor, camera path, where enemies come from, transition
  level2.js               Old Quarry: floor, camera path, waves, barrels
  bg2.js                  Old Quarry's procedural backdrop
  blast.js                barrel and dynamite explosions
  state.js                the application (APP); one run: the world (G), the player (P), reset()
  util.js                 small pure functions
  input.js                keyboard and pointer input
  touch.js                touch controls: stick, buttons, gestures
  audio.js                synthesised sound and music
  songs.js                songs: parts, loops, changes on the bar
  combat.js               damage rules, rage, boss immunity
  player.js               the heroine's state machine
  enemies.js              spawning enemies and running their AI (shared by all)
  foes/                   enemies as data: one file per enemy (see "A new enemy")
    registry.js           the enemy registry and what an enemy can describe
    kit.js                tools: sight, walking, hitboxes, lobbed throws
    common.js             shared states: rising, chasing, wind-up, strike, falling...
    bikes.js              the Rocker's motorbike, chopper and chain
  anim.js                 skeletal animation as data: poses, clips, shared clips
  replay.js               recording a run and replaying it
  world.js                one simulation step and the wave script
  waves.js                random fights by difficulty
  skeleton.js             the skeleton's vector rig: a pose from data and drawing the bones
  background.js           procedural backdrop
  fx.js                   particles and debris
  render.js               drawing the world, the HUD and the title screen
  gfx.js                  canvas, atlas, shared drawing helpers
  atlas-frames.js         frame coordinates (generated)
  lucy-frames.js          Lucy's frame coordinates (generated)
  main.js                 entry point and game loop
tests/                    tests (node:test)
tools/                    dev server, build, atlas and sprite tools
```

The logic (`config`, `state`, `combat`, `player`, `enemies`, `foes`, `world`, the poses in
`skeleton`) never touches the DOM, so all of it runs in Node: the tests run the real simulation
without a browser.

## Tests

```bash
npm test
```

What is checked:

- `config.test.js` — waves only refer to existing enemies and run left to right, the stage ends
  with a boss, the rage steps agree.
- `combat.test.js` — dark ball levels, knocking the Rocker off his bike, the chopper hitting
  along its whole length, juggling light enemies and heavy ones falling, the Baron's immunity
  after two interrupted attacks, damage to the player.
- `world.test.js` — the simulation: the first fight starts, each enemy type fights for 20 seconds
  without errors, the flying kick, the whole stage played through to a win, the idle loop.
- `extras.test.js` — music themes, style from scenery, the secret combo.
- `evil.test.js` — Raithwyn as the boss: who meets her, her music, her stages, her dark ball and
  bones by stage, her chain of punches, her walk and run, her running jump kick, how blows take
  her, her leap back, her rage, her super and its orb, the dandy, her coming out of bats and mist,
  her vanishing and coming back somewhere else.
- `dragon.test.js` — the end of the stage, the Dragon's unstoppable attacks, choosing an attack
  that reaches, the bite and the ×1.5 head, the beam and dodging it, the widening second-phase
  beam, the hind-leg kick, plasma balls, the second-phase jump, the longer beam charge with sparks, the
  leap back and beam combo, the hovering triple beam (from the turning head, sweeping, with a burning trail) and its safe gaps, the drop with a shockwave,
  the win.
- `boss.test.js` — the fight's opening zombies, the unstoppable summon, the second phase and the
  breath, big gravestones, the acid ball after a hit.
- `zombie.test.js` — the grab, flying and thrown heads, zombie crowds.
- `style.test.js` — style ranks D…SSS and their bonuses, scenery, the acid puddle, the pause menu.
- `menu.test.js` — main menu, settings (FPS counter and limit), fighter select (Raithwyn and Lucy are
  playable).
- `features.test.js` — translations, key layout, bone cost, super attack, the unstoppable end of
  Fatso's wind-up, the Necromancer.
- `level2.test.js` — Old Quarry: the `Z`+`2` secret, the transition after the first stage, the
  floor and the camera path (two slants), fights only on the flat, about 30% longer than the
  first stage, where enemies come from, barrels and blasts, the Miner, Dynamite, the Lizard, the
  Power Armor, its gun and its jump onto a marked spot, no more than two armors per wave, the Slime and its zombies, the
  final fight against the Prospector alone, the `X` secret to it.
- `prospector.test.js` — the Prospector: its health and size, what stops it and what does not,
  the slowly growing flame and the fire it leaves, the walking flame, the ram, the mortar shells
  (they spare it), the jump, the helmet coming off at half health and the second phase, its
  death.
- `waves.test.js` — random fights: few enemies and rarely strong ones at first, crowds of every
  kind at the end, difficulty rising along the road, a replay giving the same enemies.
- `samurai.test.js` — the stance and creeping up, the arc cut, the stun from a distant attack,
  the close-range counter, the kick, 3 seconds on screen before the stance, taking the stance
  again.
- `replay.test.js` — the same seed and buttons give the same run; a recorded run (and the same
  run from a file) replays exactly, even right after another run that left things behind; a new
  run carries nothing over (even a field nobody knew of) while the application keeps its own;
  drawing every frame, and the light picture (with fewer particles), change nothing in a fight
  with every kind of foe.
- `skeleton.test.js` — every enemy has a valid pose in every state.
- `util.test.js` — helper functions.

Drawing is not covered by tests; it is checked by eye in a browser.

## Changing the game

**Balance.** Everything is in `src/config.js`. Enemy fields: `hp`, `speed`, `dmg`, `reach` (the
range of the close attack) or `keep` (the distance a ranged enemy keeps), `wind`/`act`/`rec`
(wind-up, active phase and recovery in seconds), `cd` (pause between attacks, from and to).

**A new fight.** Add a line to `WAVES`: `x` — where the camera stops, `lvl` — the difficulty of
a random fight from 0 to 1 (the make-up, shares and enemy pools are in `WAVEGEN`). For a fixed
fight give `sp` instead of `lvl` — a list of `[type, side, delay]`. Side `1` is the right, `-1`
the left, `0` climbs out of the ground.

**A new enemy.** Everything about an enemy is in one file, `src/foes/<name>.js`:

1. Stats go in `TYPES` (`src/config.js`), the name in `foe` of both languages in `src/i18n.js`.
2. The enemy's file calls `defineFoe('<name>', { ... })` and is imported in `src/foes/index.js`.
3. Everything an enemy can describe is listed at the top of `src/foes/registry.js`. The main
   parts:
   - `moves` — what the enemy does while chasing: a list of `{ when, go }`, checked in order;
   - `states` — its own AI states (`tick(e, dt, s)`; `s` is where the player is);
   - `strike`, `connect`, `guard`, `onHit`, `immune`, `unstoppable` — its own rules for hitting
     and being hit;
   - `pose` — poses as data (the format is at the top of `src/anim.js`): `base`, `walk`, `guard`
     and `states` with `set` / `tween` / `shake` clips;
   - `look` — costume and weapon by drawing layer (`back`, `torso`, `legs`, `head`, `weapon`,
     `world`, `mount`, `sleeves`).
4. The shared states (chase, wind-up, strike, recover, fall) are already in
   `src/foes/common.js`: a simple enemy needs only a line in `TYPES` and an empty `defineFoe`
   (that is how `grunt.js` is made). A richer example is `samurai.js`.
5. New states should be added to the `STATES` list in `tests/skeleton.test.js`.

An example of a small enemy that leaps back now and then:

```js
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';

export default defineFoe('jumper', {
  moves: [{ when: (e, s) => s.adx < 90 && e.cd <= 0, go: (e) => go(e, 'hop', 0, { vz: 400 }) }],
  states: {
    hop(e, dt) {
      faceP(e);
      e.x -= e.face * 200 * dt;
      e.vz -= 1500 * dt;
      e.z = Math.max(0, e.z + e.vz * dt);
      if (e.z === 0 && e.vz < 0) go(e, 'recover');
    },
  },
  pose: { states: { hop: { set: { lF: [1.2, -0.4], lB: [0.9, -0.8], aF: [2.6, 2.9], jaw: 5 } } } },
});
```

**Sprites.** Edit `assets/source/raithwyn_sheet.png` and rebuild the atlas:

```bash
pip install pillow numpy
npm run atlas
```

The sheet's rows, top to bottom, are listed in `ROW_NAMES` in `tools/build_atlas.py`. Every
frame is halved on the same grid around its anchor, so frames do not jitter against each other.

The idle stance is the sheet's first row: 11 poses of breathing and a swaying tail taken from
the video `assets/source/idle.mp4` (the loop is frames 60–113, 2.25 s). The row is made by
`python3 tools/idle_from_video.py assets/source/idle.mp4 60 114 11` (11 is how many poses to
take, evenly over the loop; without it, all 28 different ones): it removes the checkerboard
background, puts back the tail's tip where the video's edge cuts it off, lines the frames up on
the boots, scales them to the sheet and prints how long each pose is held — that is `IDLE_HOLD`
in `src/config.js` (in 1/24 s, as in the video). The punches are aligned to the idle stance. The
pale fringe left by the video's light background is removed by
`python3 tools/defringe.py 16 372` (see-through edge pixels take the colour of the solid pixels
next to them; the video tool does this itself). The idle row in the sheet has been retouched by
hand: rebuilding it from the video would wipe those edits.

**Lucy's sprites.** Her sheet is `assets/source/lucy_sheet.png`, made from her pictures and
videos in `assets/source/lucy/` by `python3 tools/lucy_sheet.py`: each frame is cut out of its
white background (only the figure is kept, so the video's watermark goes too, and bits of
background shut in between her legs or tail are cut out as well), scaled to Raithwyn's height
(356 sheet px, ears to boots; one scale for all the videos) and the frames of one animation are
cut with one window, so they keep their places from the video and do not jitter. Rows: `stand`
(standing.png), `idle` (11 poses over the 2.6 s loop of idle.mp4), `walk` and `run1` (her first run,
kept but not used; 8 frames over a 1 s loop of walk.mp4 and run.mp4; the video frames are in
`ANIMS`), and from the videos that start with her standing still (each scaled by that first
frame, which also lines the row up: its boots are the anchor and its ground the bottom,
`REF_VIDEOS`): `run2` (her second run, kept but not used: 8 frames over one stride of run_2.mp4, after she sets off), `drink` (the
win, drink.mp4: 16 frames of sitting down and taking out the bottle, then the last 7, drunk from
back and forth, `DRINK_LOOP` and `FIGHTER_ANIM.lucy.drink`), `evade1`, `evade2` and `evade3`
(three dodges from evade.mp4, without its explosions; kept in the atlas, not used since her
dodge by chance is gone) and `super` (super_gun.mp4: six frames of
drawing the gun, six of firing), and her run, `run`: the six drawn figures of run_3.png (`RUN3`), lined
up by the head (it barely moves in a run, while the sleeves swing), each at its own height above
the ground, so she bobs a little; 0.1 s a frame (`FIGHTER_ANIM.lucy.run`), `punch1` and `punch2`
(the four panels of strike_2.png, guard, jab, fist back, cross, as two punches of five frames,
`PUNCH1` and `PUNCH2`), `jump` (the four figures of jump.png as the five jump frames, `JUMPS`;
the drawn ground shadows, dust and motion lines are taken off by `strip_marks`), `throw` (the four panels of shoot.png: side on, drawing,
aiming, firing; her tail is cut off at the picture's left edge in the last two, so its tip is
grafted on from the first panel, `mend_tail`), `grenade` (the five figures of grenade.png:
grenade in hand, arm back, letting go, arm out, follow through) and `nade` (the grenade itself,
taken from the last figure, `NADE`; drawn spinning as it flies), `hurt` (the two figures of hit1.png) and `ko`
(the four of death.png as the six knockdown frames, `KO`; these two pictures are drawn at other
sizes than standing.png, so `HIT_SIZE`, `DEATH_SIZE`, `GUARD` and `JUMP_SIZE` bring her to the
same height). The frames and their anchors go to
`assets/source/lucy_sheet.json`, and `npm run atlas` builds `assets/lucy.png` and
`src/lucy-frames.js` from them (`FIGHTERS` in `tools/build_atlas.py`). How fast her idle, walk
and run play is in `FIGHTER_ANIM` in `src/config.js`. The sheet's transparency has been retouched by hand
(stray pixels round the figure), so `tools/lucy_sheet.py` only adds the rows the sheet does not
have yet, below the others, and leaves those as they are (`--all` makes the whole sheet again and
wipes the retouching); after a change by hand only `npm run atlas` is run. An animation she does not have yet shows
her standing frame (`fighterFrame` in `src/gfx.js`).

**Portraits.** Put a picture in `assets/source/portraits/<name>.webp` and run
`npm run portraits`: a smaller copy appears in `assets/portraits/`. A new fighter is described in
`src/characters.js`, its name and description in `chars` in `src/i18n.js`.

**Debugging.** The browser console has a `__game` object:

```js
__game.P.rage = 300;                 // full rage
__game.spawn('biker', 1);            // a Rocker from the right
__game.G.enemies.forEach((e) => (e.dead = true));
```

**Formatting.** `npm run format` (Prettier).

## Publishing on GitHub

```bash
git init -b main
git add .
git commit -m "Raithwyn: beat 'em up prototype"
git remote add origin https://github.com/<user>/<repository>.git
git push -u origin main
```

The repository already has a workflow, `.github/workflows/ci.yml`: on every push and pull
request it runs the tests and the build, and from the `main` branch it publishes the game on
GitHub Pages. For that to work, turn on **Settings → Pages → Source: GitHub Actions** once in the
repository's settings. The game is then at `https://<user>.github.io/<repository>/`, and the
single-file version at `/single.html` there.

## License

There is no license file in the repository yet: one has to be chosen. Raithwyn's sprite sheet is
the author's own work, and its terms are worth stating apart from the terms for the code.
