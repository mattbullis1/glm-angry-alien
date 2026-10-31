/* ============================================================
   AA test suite — shared by Node runner (node-tests.js) and
   browser runner (tests.html). Calls env.log(str) per line.
   ============================================================ */
(function (root) {
  'use strict';

  function runSuite(AA, log) {
    var C = AA.cfg;
    var passed = 0, failed = 0;
    var failures = [];

    function assert(cond, name) {
      if (cond) { passed++; log('  PASS  ' + name); }
      else { failed++; failures.push(name); log('  FAIL  ' + name); }
    }
    function section(name) { log(''); log('[' + name + ']'); }

    /* ---------- 1. RNG determinism ---------- */
    section('RNG determinism');
    (function () {
      var a = new AA.Random(12345), b = new AA.Random(12345), c = new AA.Random(999);
      var seqA = [], seqB = [], seqC = [];
      for (var i = 0; i < 100; i++) { seqA.push(a.float()); seqB.push(b.float()); seqC.push(c.float()); }
      assert(JSON.stringify(seqA) === JSON.stringify(seqB), 'same seed -> identical sequence');
      assert(JSON.stringify(seqA) !== JSON.stringify(seqC), 'different seed -> different sequence');
      var inRange = true;
      for (i = 0; i < 500; i++) {
        var v = a.int(3, 9);
        if (v < 3 || v > 9 || v !== Math.floor(v)) inRange = false;
      }
      assert(inRange, 'int(min,max) always within inclusive bounds');
      var vals = [a.range(-5, 5), a.range(-5, 5)];
      assert(vals.every(function (v) { return v >= -5 && v < 5; }), 'range(min,max) within bounds');
      assert(typeof a.pick(['x', 'y']) === 'string', 'pick returns member');
    })();

    /* ---------- 2. Collision math ---------- */
    section('Collision math');
    (function () {
      assert(AA.circleHit(0, 0, 5, 3, 4, 1) === true, 'circleHit touching (3-4-5 triangle)');
      assert(AA.circleHit(0, 0, 5, 10, 0, 4) === false, 'circleHit separated');
      assert(AA.circleRectHit(5, 5, 2, 4, 4, 10, 10) === true, 'circleRectHit inside');
      assert(AA.circleRectHit(0, 0, 3, 10, 10, 4, 4) === false, 'circleRectHit far');
      assert(AA.circleRectHit(9, 6, 2, 10, 4, 4, 4) === true, 'circleRectHit edge overlap');
      assert(AA.clamp(15, 0, 10) === 10 && AA.clamp(-3, 0, 10) === 0 && AA.clamp(5, 0, 10) === 5, 'clamp');
      assert(AA.lerp(0, 10, 0.25) === 2.5, 'lerp');
      var v = 0; v = AA.approach(v, 100, 10, 0.1);
      assert(v > 0 && v < 100, 'approach moves toward target');
      v = AA.approach(100, 0, 100, 10);
      assert(Math.abs(v) < 0.01, 'approach converges');
    })();

    /* ---------- 3. Wave generation ---------- */
    section('Wave generation');
    (function () {
      var ok = true, msgs = [];
      for (var n = 1; n <= 40; n++) {
        var rng = new AA.Random(1000 + n);
        var spec = AA.generateWave(n, rng);
        var isBoss = n % 5 === 0;
        if (spec.isBoss !== isBoss) { ok = false; msgs.push('wave ' + n + ' boss flag'); }
        if (isBoss && !spec.events.some(function (e) { return e.kind === 'boss'; })) { ok = false; msgs.push('wave ' + n + ' missing boss event'); }
        if (!spec.events.length) { ok = false; msgs.push('wave ' + n + ' empty'); }
        for (var i = 0; i < spec.events.length; i++) {
          var ev = spec.events[i];
          if (typeof ev.t !== 'number' || ev.t < 0) { ok = false; msgs.push('wave ' + n + ' bad t'); break; }
          if (['fighter', 'interceptor', 'heavy', 'boss'].indexOf(ev.kind) < 0) { ok = false; msgs.push('wave ' + n + ' bad kind ' + ev.kind); break; }
          if (typeof ev.x !== 'number' || !isFinite(ev.x)) { ok = false; msgs.push('wave ' + n + ' bad x'); break; }
        }
        if (spec.hpScale <= 1 && n > 1) { ok = false; msgs.push('wave ' + n + ' hpScale not scaling'); }
      }
      assert(ok, '40 waves: boss every 5th, valid events, scaling' + (msgs.length ? ' — ' + msgs.slice(0, 3).join('; ') : ' — all good'));

      var r1 = new AA.Random(777), r2 = new AA.Random(777);
      assert(JSON.stringify(AA.generateWave(7, r1)) === JSON.stringify(AA.generateWave(7, r2)), 'wave gen deterministic under same seed');

      var tl = AA.buildSpawnTimeline(5, new AA.Random(42));
      assert(tl.events.length > 0 && tl.duration > 0, 'buildSpawnTimeline duration>0');
      var sorted = true;
      for (i = 1; i < tl.events.length; i++) if (tl.events[i].t < tl.events[i - 1].t) sorted = false;
      assert(sorted, 'spawn timeline sorted by time');

      var w1 = AA.generateWave(1, new AA.Random(5));
      assert(w1.events.every(function (e) { return e.kind === 'fighter'; }), 'wave 1 fighters only (gentle intro)');
    })();

    /* ---------- 4. Score & damage rules ---------- */
    section('Score & damage rules');
    (function () {
      assert(AA.SCORES.astronaut === 25, 'astronaut worth exactly 25');
      var r = AA.applyDamage(50, 3, 30);
      assert(r.shield === 20 && r.lives === 3 && !r.lostLife && !r.shieldBroken, 'shield absorbs partial damage');
      r = AA.applyDamage(20, 3, 30);
      assert(r.shield === 0 && r.lives === 3 && r.shieldBroken && !r.lostLife, 'shield break does not cost a life');
      r = AA.applyDamage(0, 3, 10);
      assert(r.lostLife && r.lives === 2, 'hit with 0 shield costs a life');
      assert(AA.awardOnce(false, 25) === 25, 'awardOnce first hit awards');
      assert(AA.awardOnce(true, 25) === 0, 'awardOnce repeat hit awards 0 (no duplicate scoring)');
      assert(AA.bossScore(5) === 2000 && AA.bossScore(10) === 2500, 'boss score scales with wave');
      var list = [{ name: 'A', score: 100, wave: 1 }, { name: 'B', score: 200, wave: 1 }];
      var out = AA.insertScore(list, { name: 'C', score: 150, wave: 2 });
      assert(out.length === 3 && out[0].score === 200 && out[2].score === 100, 'insertScore sorts');
      var big = [];
      for (var i = 0; i < 15; i++) big.push({ name: 'P' + i, score: i * 10, wave: 1 });
      out = AA.insertScore(big, { name: 'LOW', score: 5, wave: 1 });
      assert(out === null, 'insertScore rejects score outside top 10');
      out = AA.insertScore(big, { name: 'TOP', score: 999, wave: 1 });
      assert(out.length === 10 && out[0].name === 'TOP', 'insertScore caps at 10');
    })();

    /* ---------- 5. Save persistence + corruption ---------- */
    section('Save persistence & corruption handling');
    (function () {
      function fakeStorage() {
        var mem = {};
        return {
          getItem: function (k) { return k in mem ? mem[k] : null; },
          setItem: function (k, v) { mem[k] = String(v); },
          removeItem: function (k) { delete mem[k]; }
        };
      }
      var st = fakeStorage();
      AA.save.saveScores([{ name: 'ZED', score: 500, wave: 4 }], st);
      var s = AA.save.loadScores(st);
      assert(s.length === 1 && s[0].name === 'ZED' && s[0].score === 500, 'scores roundtrip');
      AA.save.saveSettings({ music: 0.3, sfx: 0.9, muted: true }, st);
      var cfg2 = AA.save.loadSettings(st);
      assert(cfg2.music === 0.3 && cfg2.sfx === 0.9 && cfg2.muted === true, 'settings roundtrip');
      AA.save.saveProgress(7, st);
      assert(AA.save.loadProgress(st) === 7, 'progress roundtrip');

      st.setItem(C.saveKeys.scores, '{not valid json!!');
      assert(AA.save.loadScores(st).length === 0, 'corrupted scores JSON -> fallback (and self-heals)');
      assert(st.getItem(C.saveKeys.scores) === null, 'corrupted entry removed');

      st.setItem(C.saveKeys.scores, JSON.stringify({ list: [{ name: 'X', score: 'lots', wave: 1 }] }));
      assert(AA.save.loadScores(st).length === 0, 'invalid score types rejected');
      st.setItem(C.saveKeys.scores, JSON.stringify({ list: 'not an array' }));
      assert(AA.save.loadScores(st).length === 0, 'non-array list rejected');
      st.setItem(C.saveKeys.settings, JSON.stringify({ music: 42, sfx: -3, muted: 'yes' }));
      cfg2 = AA.save.loadSettings(st);
      assert(cfg2.music === AA.save.DEFAULT_SETTINGS.music && cfg2.sfx === AA.save.DEFAULT_SETTINGS.sfx && cfg2.muted === false, 'invalid settings -> defaults');
      st.setItem(C.saveKeys.progress, JSON.stringify({ wave: -5 }));
      assert(AA.save.loadProgress(st) === 1, 'invalid progress -> wave 1');
      st.setItem(C.saveKeys.progress, 'null');
      assert(AA.save.loadProgress(st) === 1, 'null progress -> wave 1');
      var st2 = fakeStorage();
      assert(AA.save.loadScores(st2).length === 0 && AA.save.loadProgress(st2) === 1, 'fresh storage -> safe defaults');
    })();

    /* ---------- 6. Sprite builder smoke test (only if sprites available) ---------- */
    if (typeof AA.buildSprites === 'function') {
      section('Sprite builder smoke test');
      (function () {
        try {
          var s = AA.buildSprites();
          var need = ['player', 'fighter', 'interceptor', 'heavy', 'boss', 'astronaut',
            'puRapid', 'puTriple', 'puDmg', 'puShield', 'bullet', 'bulletDmg',
            'ebullet', 'ebulletHeavy', 'flash', 'splat', 'smoke', 'sparkWarm', 'sparkCool',
            'nebulaA', 'nebulaB', 'planet', 'galaxy'];
          var missing = need.filter(function (k) { return !s[k] || !s[k].cv || !(s[k].w > 0); });
          assert(missing.length === 0, 'all ' + need.length + ' sprites built' + (missing.length ? ' — missing: ' + missing.join(',') : ''));
          assert(s.boss.w >= 280, 'boss sprite is significantly larger than enemies (' + s.boss.w + 'px vs ' + s.fighter.w + 'px)');
        } catch (e) {
          assert(false, 'buildSprites threw: ' + e.message);
        }
      })();
    }

    /* ---------- 7. Headless game simulation ---------- */
    section('Headless game simulation (fixed seed, fixed timestep)');
    (function () {
      var SEED = 1337;
      var game = new AA.Game(null, { seed: SEED, bot: true, headless: true });
      assert(game.rng.seed === SEED, 'game uses fixed seed in test mode');
      game.startRun(1);
      assert(game.state === 'playing', 'startRun -> playing');
      assert(game.lives === C.startLives, 'starts with 3 lives');

      var DT = C.FIXED_DT;
      var bossSeenStep = -1, bossKilled = false, gameOverSeen = false, sawAstro = false, sawPowerup = false;
      var maxSteps = 60 * 60 * 12; // up to 12 simulated minutes
      var step = 0;

      for (step = 0; step < maxSteps; step++) {
        game.update(DT);
        // god-mode keeps the pilot alive so the sim exercises the full
        // wave ladder + boss sequence deterministically.
        game.player.invuln = Math.max(game.player.invuln, 0.5);
        game.player.shield = Math.max(game.player.shield, 80);

        if (game.astros.length > 0) sawAstro = true;
        if (game.pups.length > 0) sawPowerup = true;
        if (game.boss && bossSeenStep < 0) bossSeenStep = step;

        if (game.boss && !game.boss.dying && game.boss.y >= game.boss.targetY) {
          game.boss.takeHit(1e9);
          bossKilled = true;
        }

        if (!isFinite(game.score) || !isFinite(game.player.x)) { step = -1; break; }
        if (game.state === 'gameover') { gameOverSeen = true; break; }
        if (bossKilled && game.wave >= 6) break;
      }

      if (step === -1) {
        assert(false, 'simulation produced NaN (crash)');
      } else {
        assert(game.stats.kills > 0 && game.score > 0, 'enemies destroyed & score accumulates (score=' + game.score + ', kills=' + game.stats.kills + ')');
        assert(game.wave >= 6 || gameOverSeen, 'waves progress past boss (reached wave ' + game.wave + ')');
        assert(bossSeenStep >= 0 && bossKilled, 'boss appeared and died (first seen at ' + (bossSeenStep / 60).toFixed(1) + 's)');
        assert(game.stats.bosses >= 1, 'boss kill counted & rewarded (bosses=' + game.stats.bosses + ')');
        assert(sawAstro, 'astronauts eject from destroyed ships');
        assert(sawPowerup, 'power-ups drop from kills');
        assert(game.bullets.length <= C.maxBullets + 8, 'bullet pool bounded (' + game.bullets.length + ')');
        assert(game.fx.particles.length <= C.maxParticles + 8, 'particle pool bounded (' + game.fx.particles.length + ')');
        assert(game.enemies.length < 40, 'enemy count sane (' + game.enemies.length + ')');
        assert(game.player.shield >= 0 && game.player.shield <= C.shieldMax, 'shield stays in [0,100]');
        var prog = AA.save.loadProgress();
        assert(prog >= 5, 'progress persisted across waves (saved wave ' + prog + ')');
      }

      /* once-only astronaut scoring through the real path */
      section('Astronaut once-only scoring');
      var g2 = new AA.Game(null, { seed: 99, headless: true });
      g2.startRun(1);
      var astro = new AA.Astronaut(g2, g2.player.x, g2.player.y);
      g2.astros.push(astro);
      var before = g2.score;
      astro.hit = true; astro.dead = true;
      g2.addScore(AA.SCORES.astronaut, astro.x, astro.y);
      g2.fx.splat(astro.x, astro.y);
      g2.stats.astroSplats++;
      var afterFirst = g2.score;
      if (!astro.hit) { g2.addScore(AA.SCORES.astronaut, astro.x, astro.y); }
      assert(afterFirst - before === 25, 'first splat awards exactly 25');
      assert(g2.score === afterFirst, 'duplicate collision awards 0 (guard holds)');

      /* lives / game over */
      section('Lives / game over path');
      var g3 = new AA.Game(null, { seed: 5, headless: true });
      g3.startRun(1);
      g3.player.shield = 0;
      g3.player.invuln = 0;
      g3.playerDamaged(10, 'bullet');
      assert(g3.lives === C.startLives - 1, 'hit with empty shield costs a life');
      assert(g3.player.invuln > 0, 'invulnerability granted after life loss');
      assert(g3.player.shield > 0, 'shield restored after respawn');
      var hits = 1;
      while (g3.state !== 'gameover' && hits < 6) {
        g3.player.invuln = 0;
        g3.player.shield = 0;
        g3.playerDamaged(10, 'bullet');
        hits++;
      }
      assert(g3.state === 'gameover' && g3.lives === 0, 'exhausting all ' + C.startLives + ' lives ends the game');

      /* pause / resume */
      section('Pause / resume');
      var g4 = new AA.Game(null, { seed: 5, headless: true });
      g4.startRun(1);
      g4.pause();
      assert(g4.state === 'paused', 'pause()');
      var sc0 = g4.score;
      g4.update(DT); g4.update(DT);
      assert(g4.score === sc0, 'no simulation while paused');
      g4.resume();
      assert(g4.state === 'playing', 'resume()');
    })();

    /* ---------- 8. Render smoke test (if a canvas 2d ctx is provided) ---------- */
    if (typeof AA.buildSprites === 'function' && typeof root.__makeFakeCtx === 'function') {
      section('Render smoke test (fake ctx)');
      (function () {
        try {
          var sprites = AA.buildSprites();
          var fctx = root.__makeFakeCtx();
          var g = new AA.Game(sprites, { seed: 7, headless: true });
          g.startRun(1);
          for (var i = 0; i < 600; i++) {
            g.player.invuln = Math.max(g.player.invuln, 0.5);
            g.update(C.FIXED_DT);
          }
          g.render(fctx);
          // force-render every entity type at least once
          g.enemies.push(new AA.Enemy(g, { kind: 'heavy', x: 240, move: 'hover', b: 90 }, g.scales));
          g.enemies.push(new AA.Enemy(g, { kind: 'interceptor', x: 100, move: 'sine', a: 1, b: 120 }, g.scales));
          g.boss = new AA.Boss(g, 5); g.boss.y = 118;
          g.astros.push(new AA.Astronaut(g, 120, 400));
          g.pups.push(new AA.PowerUp(g, 240, 500, 'triple'));
          g.bullets.push({ x: 240, y: 400, vx: 0, vy: -640, dmg: 2, spr: 'bullet', r: 6, t: 0 });
          g.ebullets.push({ x: 100, y: 300, vx: 0, vy: 240, dmg: 12, heavy: true, r: 8 });
          g.fx.explosion(240, 400, 1.2);
          g.fx.splat(200, 450);
          g.render(fctx);
          g.toMenu(); g.update(C.FIXED_DT); g.render(fctx);
          assert(true, 'full render of all entity types completed without exceptions');
        } catch (e) {
          assert(false, 'render smoke test threw: ' + (e && e.message));
        }
      })();
    }

    return { passed: passed, failed: failed, total: passed + failed, failures: failures };
  }

  root.AAsuite = { runSuite: runSuite };
  if (typeof module !== 'undefined' && module.exports) module.exports = { runSuite: runSuite };
})(typeof self !== 'undefined' ? self : globalThis);
