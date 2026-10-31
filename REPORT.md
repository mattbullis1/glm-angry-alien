# REPORT — GLM's Angry Alien

## Model name and version

- **Model:** GLM-5.3-Flash (GLM family, z-ai)
- **Role:** sole developer — programming, artwork, audio, testing, deployment.
- The game is titled **"GLM's Angry Alien"** per the `MODEL_NAME's Angry Alien` convention.

## Game features completed

| Area | Delivered |
|---|---|
| Core gameplay | 480×800 portrait vertical shooter, fixed-timestep (60 Hz) simulation, fixed-render interpolation, deterministic seeded mode |
| Player | Angry alien piloting a flying saucer; 2-axis movement with smooth diagonals; auto-fire twin plasma cannons; keyboard + mouse + touch-drag (relative, offset so the finger never hides the ship) |
| Enemies | 3 classes — Fighter (fast, light), Interceptor (evasive sine/hover + aimed shots), Heavy Fighter (armored, hovering, 3-way spread) — with 6 formation types (line, vee, columns, snake, flank, rain) unlocked progressively |
| Bosses | Large human carrier **USS PAYBACK Mk.N** every 5th wave, ~6× enemy size, named health bar, 4 rotating attack patterns (aimed bursts, expanding fans, fighter deployment, sweeping barrage), escalating HP, chain-explosion death sequence with screen shake, guaranteed loot + astronauts |
| Astronauts | Eject from destroyed ships (~40%, doubles from heavies/bosses), tumble-drift with wiggling arms, splattable by bullets **or** ship collision, +25 pts exactly once (hit-flag guard), cartoon goo splat + floating score, humorous alien giggle every 4th splat |
| Shields / lives | Rechargeable 100-pt shield (3 s delay then 6/s regen), shield pickups +40, shield break ≠ life loss, next hit after exhaustion costs a life, 2 s invulnerability after life loss, 3 lives, game over when exhausted |
| Power-ups | Rapid Fire, Triple Shot, Heavy Plasma (+damage) — 20 s with HUD chips and countdown bars; Shield Boost pickup; distinct sprites/colors/sounds |
| Waves | Wave 1 → ∞, escalating HP/speed/fire-rate scaling, banner intros, boss every 5th wave, continue-from-last-saved-wave |
| Parallax background | 4 independently scrolling star layers (far → motion-streak near), per-star twinkle, 2 drifting nebulae, ringed planet, rotating galaxy, occasional shooting star — all seamless-wrap |
| Graphics | 100% original procedural canvas artwork (23 sprites @2× supersampling): saucer with furious alien pilot, three human ship classes, boss carrier, astronaut, power-ups, plasma bolts, explosions (flash, shockwave ring, sparks, debris shards, smoke), goo splat with X-eyes face |
| Audio | Fully procedural WebAudio: looping chiptune sequencer (normal + boss variant), lasers, explosions, splat, shield hit/down, power-up arps, boss alarm, alien gibberish voice reactions, UI clicks — separate music/SFX sliders + master mute, autoplay-safe (context created on first gesture) |
| UI | Animated title screen, Start/Continue/Instructions/Settings/High Scores, mission briefing with live enemy gallery, pause overlay, game-over screen with pilot-tag entry, wave banners, boss bar, score/wave/lives/shield/power-up HUD |
| Persistence | Top-10 leaderboard, settings (music/sfx/mute + pilot tag), last-wave progress — all in localStorage with validation + corrupted-data self-healing |
| Technical | Fixed 60 Hz timestep with spike guard, entity/particle pool caps, tab-invisibility auto-pause, resize/orientation handling, DPR-capped crisp rendering, zero network requests at runtime |

## Libraries used

- **None.** Vanilla HTML5 / CSS3 / Canvas 2D / Web Audio API. All dependencies are the browser platform itself;
  every asset is procedural and local. Fully offline.

## Tests actually performed and results

### 1. Automated logic suite — `node tests/node-tests.js` (66 assertions) — **ALL PASSED**

Also runs in-browser at `tests/tests.html` (same shared suite in `tests/suite.js`).

```
RESULTS: 66 passed, 0 failed, 66 total  →  exit code 0
```

Coverage groups (all PASS):
- **RNG determinism (5):** same-seed identity, different-seed divergence, inclusive int bounds, range bounds, pick.
- **Collision math (9):** circle/circle, circle/rect (inside/far/edge), clamp, lerp, approach.
- **Wave generation (5):** 40 waves → boss event exactly every 5th, valid kinds/times/x-bounds, difficulty scaling, deterministic under seed, timeline sorting, wave-1 fighters-only.
- **Score & damage rules (10):** astronaut = 25, shield partial absorb, shield break ≠ life loss, life loss on empty shield, once-only award guard, boss score scaling, leaderboard sort/reject/cap.
- **Save persistence & corruption (11):** roundtrips, corrupted JSON → fallback + self-heal, invalid types rejected, defaults on fresh storage.
- **Sprite builder smoke (2):** all 23 sprites built, boss visibly larger than fighters.
- **Headless game simulation (14):** 12 simulated minutes @ fixed seed/timestep with god-mode autopilot — score/kills accumulate (18,325 pts, 221 kills), progression to wave 10, boss appeared at 53.8 s and died through the full destruction sequence, astronauts ejected, power-ups dropped, bullet/particle/enemy pools bounded, shield within [0,100], progress persisted.
- **Astronaut once-only scoring (2):** first splat awards exactly +25; duplicate collision frame awards 0.
- **Lives / game over (4):** life loss on empty shield, 2 s invulnerability, shield restored on respawn, 3rd life lost → game over.
- **Pause / resume (3):** state transitions, zero simulation while paused, resume.
- **Render smoke test (1):** full draw of every entity type (incl. boss, splats, explosions, menu scene) without exceptions.

Development note: two earlier failures found and fixed by this suite — (a) in Node the storage fallback was recreated per call, hiding written progress (memoized now); (b) the autopilot never chased enemies so the sim stalled below the boss wave (bot now hunts loot → enemies; suite uses god-mode for the deterministic ladder).

### 2. In-game deterministic test mode — verified

`index.html?autotest=1&seed=42&headless=1&minutes=2` executes a bot-driven fixed-seed session entirely on the simulation and reports score/wave/kills/splat counts, pool maxima, boss encounter, and NaN watchdogs in an on-screen panel (also logged to console, exposed as `window.AA.autotestResult`). Same run without `headless=1` plays visibly.

### 3. Deployment / serving checks — performed via HTTP

- `http://mother.local:8080/glm-angry-alien/` → **HTTP 200**, page title confirmed.
- All 15 game assets + both test pages fetched individually → **17/17 HTTP 200**.
- Static scan of every `.html/.css/.js` file for `http(s)://` references → only the SVG-namespace token inside the inline data-URI favicon (an identifier, never fetched). **Zero remote dependencies.**
- XAMPP Apache (httpd) listens on 0.0.0.0:8080; game works over LAN at `http://mother.local:8080/glm-angry-alien/`. (Port 80 on this host is used by a separate Python service outside my assigned folder; per competition rules I did not modify anything outside `glm-angry-alien/`.)

### 4. Static verification

- All 15 JS modules pass strict-mode parse (no syntax errors; suite exercises every module's real code paths).
- Simulation watchdogs confirm no NaN states and bounded pools over 43,200 fixed steps.

### Manual testing

Keyboard, mouse and touch input paths are implemented per spec (relative touch drag with upward offset; pointer-follow for mouse; WASD/arrows with diagonal normalization) and exercised through the bot which uses the same pointer-follow pipeline. Visual/animation quality was reviewed by rendering every entity and effect in the smoke test; the organizer's play session is the final judge of feel.

## Deployment

- **Local (competition submission):** served by XAMPP Apache at `http://mother.local:8080/glm-angry-alien/` (HTTP 200 verified; all 17 paths individually verified).
- **Public demo:** GitHub Pages at `https://mattbullis1.github.io/glm-angry-alien/` (source: `main` branch, root). The game is fully static with zero remote dependencies, so it runs identically on both hosts and offline.
- **Repository:** https://github.com/mattbullis1/glm-angry-alien

## Known bugs or limitations

1. **(Fixed after organizer playtest)** The menu overlays originally defaulted to `display: flex`, so
   after starting a game every screen stayed stacked on top of the running gameplay ("stuck on home
   screen while action occurs behind it"). Fixed: `.screen` now defaults to `display: none` and only
   `.screen.active` is shown; the pilot-tag row also starts hidden. Verified live on the server.
2. Music is a compact procedural chiptune loop (two variants) rather than a long-form composition.
3. The autopilot is intentionally simple; in visible autotest mode it can die mid-session (reported as an informational note, not a test failure — the headless suite uses god-mode for deterministic coverage).
4. On boss waves, escort fighters continue entering until their spawn queue drains even if the boss dies early (mercy window clears all enemy bullets on boss death).
5. Device pixel ratio is capped at 2× to keep mobile fill-rate comfortable; very high-DPI phones render at 2× rather than native.
6. Web Audio requires a user gesture to start (autoplay policy) — audio begins on the first button press, as designed.
7. Astronauts that drift off the bottom of the screen simply despawn (no penalty/scoring either way).

## Development time

Built in a single continuous session in this environment (not wall-clock measured; roughly one focused working session including design, implementation, test-driven debugging, and deployment verification).
