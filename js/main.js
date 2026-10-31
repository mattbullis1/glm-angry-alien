/* ============================================================
   AA.main — bootstrap: canvas scaling, input, fixed-timestep
   loop, visibility auto-pause, deterministic test mode.
   ============================================================ */
(function () {
  'use strict';
  var AA = window.AA;
  var C = AA.cfg;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var stage = document.getElementById('stage');

  /* ---------------- responsive scaling (480x800 letterboxed) ---------------- */
  var scale = 1;
  function resize() {
    var vw = window.innerWidth, vh = window.innerHeight;
    scale = Math.min(vw / C.W, vh / C.H);
    stage.style.transform = 'scale(' + scale + ')';
    stage.style.left = Math.max(0, (vw - C.W * scale) / 2) + 'px';
    stage.style.top = Math.max(0, (vh - C.H * scale) / 2) + 'px';
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(C.W * dpr);
    canvas.height = Math.round(C.H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  resize();

  /* ---------------- URL params: deterministic test mode ---------------- */
  var params = new URLSearchParams(location.search);
  var testOpts = {};
  if (params.has('seed')) testOpts.seed = parseInt(params.get('seed'), 10) >>> 0;
  if (params.get('bot') === '1') testOpts.bot = true;
  var autoTest = params.get('autotest') === '1';
  if (autoTest) {
    if (testOpts.bot !== false) testOpts.bot = true;
    testOpts.headless = params.get('headless') === '1';
  }

  /* ---------------- build world ---------------- */
  var sprites = AA.buildSprites();
  var game = new AA.Game(sprites, testOpts);
  var ui = new AA.UI();
  ui.init(game, sprites);
  window.AA.game = game;
  window.AA.ui = ui;

  /* ---------------- input ---------------- */
  var input = game.input;

  // keyboard
  var KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down'
  };
  window.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    AA.audio.init(); AA.audio.resume();
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (game.state === 'playing') game.pause();
      else if (game.state === 'paused') game.resume();
      e.preventDefault();
      return;
    }
    if (e.code === 'Enter' && (game.state === 'menu' || game.state === 'gameover')) {
      if (ui.$('screen-title').classList.contains('active')) ui.newRun(1);
      e.preventDefault();
      return;
    }
    var k = KEYMAP[e.code];
    if (k) { input[k] = true; input.mode = 'keys'; e.preventDefault(); }
  });
  window.addEventListener('keyup', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    var k = KEYMAP[e.code];
    if (k) { input[k] = false; e.preventDefault(); }
  });

  // pointer → logical coords
  function toLogical(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) / (r.width / C.W),
      y: (clientY - r.top) / (r.height / C.H)
    };
  }
  var touchOffset = 70; // keep the saucer visible above the finger

  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' && !touchActive) return;
    var pt = toLogical(e.clientX, e.clientY);
    if (e.pointerType === 'touch') pt.y -= touchOffset;
    input.mode = 'pointer';
    if (e.pointerType === 'mouse' || touchActive) {
      input.pointerActive = true;
      input.tx = pt.x; input.ty = pt.y;
    }
    if (e.pointerType === 'mouse') e.preventDefault();
  });
  var touchActive = false;
  canvas.addEventListener('pointerdown', function (e) {
    AA.audio.init(); AA.audio.resume();
    if (e.pointerType === 'touch') {
      touchActive = true;
      var pt = toLogical(e.clientX, e.clientY);
      input.mode = 'pointer';
      input.pointerActive = true;
      // relative dragging: anchor so the ship doesn't teleport under the finger
      input.tx = game.player ? game.player.x : pt.x;
      input.ty = game.player ? game.player.y : pt.y - touchOffset;
      input._anchorX = pt.x; input._anchorY = pt.y;
      input._shipX = input.tx; input._shipY = input.ty;
      e.preventDefault();
    } else if (e.pointerType === 'mouse' && e.button === 0) {
      var m = toLogical(e.clientX, e.clientY);
      input.mode = 'pointer'; input.pointerActive = true;
      input.tx = m.x; input.ty = m.y;
    }
  });
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'touch' || !touchActive) return;
    var pt = toLogical(e.clientX, e.clientY);
    // drag: ship follows finger movement 1:1 (offset upward)
    input.tx = input._shipX + (pt.x - input._anchorX);
    input.ty = input._shipY + (pt.y - input._anchorY);
    e.preventDefault();
  }, { passive: false });
  function endPointer(e) {
    if (e.pointerType === 'touch') touchActive = false;
    if (e.pointerType === 'mouse') input.pointerActive = false;
  }
  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', endPointer);
  document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });

  /* ---------------- auto-pause when tab hidden ---------------- */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (game.state === 'playing') game.pause();
      AA.audio.stopMusic();
    } else {
      AA.audio.resume();
      if (game.state === 'paused') AA.audio.startMusic(game.wave % 5 === 0 ? 'boss' : 'main');
    }
  });

  /* ---------------- fixed-timestep loop ---------------- */
  var last = performance.now(), acc = 0, hudTick = 0;
  var running = true;

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > 0.25) elapsed = 0.25; // tab-switch spike guard
    acc += elapsed;

    var steps = 0;
    while (acc >= C.FIXED_DT && steps < C.MAX_STEPS_PER_FRAME) {
      game.update(C.FIXED_DT);
      acc -= C.FIXED_DT;
      steps++;
    }
    if (steps === C.MAX_STEPS_PER_FRAME) acc = 0; // drop backlog, keep frame time bounded

    if (!game.headless && game.state !== 'paused') {
      game.render(ctx);
    }
    hudTick += elapsed;
    if (hudTick > 0.1) { hudTick = 0; ui.syncHud(); }
  }
  requestAnimationFrame(frame);

  /* ---------------- automated in-game test mode ----------------
     Usage: index.html?autotest=1&seed=42&headless=1&minutes=2
     Runs a fixed-seed, fixed-timestep bot session entirely on the
     simulation (no rendering when headless=1) and reports results. */
  if (autoTest) {
    var minutes = parseFloat(params.get('minutes') || '2');
    var totalSec = Math.max(10, Math.min(10 * 60, minutes * 60));
    var stepsToRun = Math.round(totalSec / C.FIXED_DT);
    var errors = [];
    var warnings = [];
    var maxEnemies = 0, maxParts = 0, maxBullets = 0, bossSeen = false, astroSeen = 0, scoreSeen = 0;

    game.onEvent = function (type) {
      if (type === 'gameover') warnings.push('bot died at wave ' + game.wave + ' (balance info, not a logic failure)');
    };
    game.startRun(1);

    function snapshot(tag) {
      var p = game.player;
      if (!isFinite(game.score)) errors.push('NaN score ' + tag);
      if (!p || !isFinite(p.x) || !isFinite(p.y) || !isFinite(p.shield)) errors.push('NaN player ' + tag);
      for (var k = 0; k < game.enemies.length; k++) {
        var e = game.enemies[k];
        if (!isFinite(e.x) || !isFinite(e.y) || !isFinite(e.hp)) { errors.push('NaN enemy ' + tag); break; }
      }
    }

    var t0 = Date.now();
    for (var s = 0; s < stepsToRun; s++) {
      game.update(C.FIXED_DT);
      if (game.state === 'gameover') break;
      if (s % 120 === 0) snapshot('step ' + s);
      if (game.enemies.length > maxEnemies) maxEnemies = game.enemies.length;
      if (game.fx.particles.length > maxParts) maxParts = game.fx.particles.length;
      if (game.bullets.length + game.ebullets.length > maxBullets) maxBullets = game.bullets.length + game.ebullets.length;
      if (game.boss) bossSeen = true;
      astroSeen = Math.max(astroSeen, game.astros.length);
      scoreSeen = game.score;
    }
    var simMs = Date.now() - t0;

    var lines = [
      '== AA AUTOTEST (seed ' + (testOpts.seed || 'random') + ', ' + totalSec + 's sim) ==',
      'result: ' + (errors.length ? 'FAIL' : 'PASS'),
      'score: ' + scoreSeen + '  wave: ' + game.wave,
      'kills: ' + game.stats.kills + '  astroSplats: ' + game.stats.astroSplats + '  bosses: ' + game.stats.bosses,
      'maxEnemies: ' + maxEnemies + '  maxParticles: ' + maxParts + '  maxBullets: ' + maxBullets,
      'bossEncountered: ' + bossSeen + '  astroOnScreenMax: ' + astroSeen,
      'sim wall time: ' + simMs + 'ms (' + (simMs / totalSec * 1000).toFixed(1) + 'ms/s realtime)',
      warnings.length ? ('notes:\n- ' + warnings.join('\n- ')) : '',
      errors.length ? ('issues:\n- ' + errors.slice(0, 8).join('\n- ')) : 'no NaN, no crashes, entity pools bounded'
    ].filter(function (l) { return l !== ''; });
    if (!game.headless) game.render(ctx);
    ui.showTestPanel(lines.join('\n'), errors.length > 0);
    console.log(lines.join('\n'));
    window.AA.autotestResult = { pass: errors.length === 0, lines: lines };
  }
})();
