# GLM's Angry Alien

A polished, humorous vertical-scrolling space shooter. An alien lab experiment escapes,
steals a heavily-armed flying saucer, and takes revenge on humanity's military space fleet.
Splat the astronauts. You know you want to.

**Play:**
- Demo (GitHub Pages): **https://mattbullis1.github.io/glm-angry-alien/**
- Local (XAMPP): http://mother.local:8080/glm-angry-alien/
  (also works via `http://localhost:8080/glm-angry-alien/` on the host machine)

**Repository:** https://github.com/mattbullis1/glm-angry-alien

---

## Installation

1. The game lives in `C:\xampp\htdocs\glm-angry-alien\` — served by the XAMPP Apache instance
   listening on port **8080**.
2. Open the URL above in any modern desktop or mobile browser. No build step, no CDN,
   no internet connection required — every asset (code, artwork, music, sounds) is local
   and/or generated at runtime.

## Controls

| Action | Keyboard | Mouse | Touch |
|---|---|---|---|
| Fly (horizontal + vertical, smooth diagonals) | Arrow keys / WASD | Move the pointer — saucer follows | Touch and **drag** anywhere (relative drag; ship stays visible above your finger) |
| Fire | Automatic | Automatic | Automatic |
| Pause / Resume | `P` or `Esc` | Pause button (bottom-right) | Pause button |

## How to play

- Your blaster fires upward automatically — just fly, dodge and destroy.
- **Fighters** are fast and fragile. **Interceptors** dodge and snipe. **Heavy fighters**
  soak damage and lob 3-way spreads. Every 5th wave a **boss carrier** arrives — watch its
  health bar and learn its four attack patterns.
- **Astronauts** eject from destroyed ships: shoot or ram them for **+25 points** and a
  deeply satisfying cartoon splat.
- Your **shield** regenerates over time; when it's gone, the next hit costs a life.
  You get 2 seconds of invulnerability after losing a life. Lose all 3 lives and it's over.
- **Power-ups (20 s):** Rapid Fire, Triple Shot, Heavy Plasma (+damage), plus Shield Boost
  pickups. Bosses drop guaranteed loot.

## Scoring

| Target | Points |
|---|---|
| Fighter | 50 |
| Interceptor | 75 |
| Heavy fighter | 150 |
| Astronaut splat | 25 |
| Boss carrier | 1500 + 100 × wave |

Top-10 leaderboard, settings and last-reached wave are saved locally (with full corruption
handling). **Continue** resumes from your last saved wave.

## Deterministic test mode

- `index.html?autotest=1&seed=42&headless=1&minutes=2` — runs the simulation with a fixed
  random seed and fixed timestep under an autopilot bot, then displays a PASS/FAIL panel
  (NaN watchdogs, entity-pool bounds, boss encounter, score/kills). Drop `headless=1` to watch it play.
- `tests/tests.html` — browser version of the full automated suite (67 assertions).
- `node tests/node-tests.js` — the same suite headless (no browser needed).

## Automated tests

66 assertions across: RNG determinism, collision math, wave generation (40 waves, boss
cadence), scoring & shield/life rules, leaderboard insertion, save persistence incl.
corrupted-JSON recovery, sprite-builder smoke test, a full **12-minute headless
fixed-timestep game simulation** (waves, boss kill sequence, astronauts, power-ups, pools),
once-only astronaut scoring, the game-over path, pause/resume, and a render smoke test of
every entity type. See `REPORT.md` for the actual recorded results.

## Project layout

```
glm-angry-alien/
├── index.html            game shell + menus/HUD
├── css/style.css         styling (fixed 480×800 stage, responsive scaling)
├── js/
│   ├── core/rng.js       seeded RNG (deterministic mode)
│   ├── core/collide.js   collision math
│   ├── core/waves.js     wave generation + spawn timelines
│   ├── core/score.js     scoring & shield/life rules
│   ├── config.js         balance constants
│   ├── save.js           localStorage wrapper (corruption-safe)
│   ├── audio.js          procedural WebAudio music + SFX engine
│   ├── sprites.js        original procedural artwork (23 sprites)
│   ├── background.js     4-layer parallax starfield, nebulae, planet
│   ├── entities.js       player, enemies, boss, astronauts, power-ups, FX
│   ├── game.js           state machine, collisions, progression
│   ├── ui.js             menus, HUD, leaderboard
│   └── main.js           bootstrap, input, fixed-timestep loop, autotest
├── tests/                automated test suite (Node + browser)
├── README.md
└── REPORT.md
```
