/* ============================================================
   AA.Game — state machine, spawning, collisions, progression
   Fixed-timestep simulation (update(dt) called with constant dt).
   ============================================================ */
(function (root) {
  'use strict';
  var AA = (root.AA = root.AA || {});
  var C = AA.cfg;
  var clamp = AA.clamp, circleHit = AA.circleHit;
  var TAU = Math.PI * 2;

  function Game(sprites, opts) {
    opts = opts || {};
    this.sprites = sprites;
    this.seed = opts.seed;
    this.rng = new AA.Random(opts.seed == null ? undefined : opts.seed);
    this.background = new AA.Background(this.rng, C.W, C.H);
    this.fx = new AA.FX(this);
    this.bot = !!opts.bot;
    this.headless = !!opts.headless;

    this.state = 'menu';           // menu | playing | paused | gameover
    this.menuT = 0;
    this.shakeMag = 0;

    this.score = 0;
    this.lives = C.startLives;
    this.wave = 1;
    this.bestWave = 1;

    this.bullets = [];
    this.ebullets = [];
    this.enemies = [];
    this.astros = [];
    this.pups = [];
    this.boss = null;

    this.player = null;
    this.input = { left: false, right: false, up: false, down: false, mode: 'keys', pointerActive: false, tx: 0, ty: 0 };
    this.colCd = 0;

    this.spawnQueue = null;
    this.spawnIdx = 0;
    this.waveTimer = 0;
    this.waveState = 'idle';       // intro | spawning | cleared
    this.scales = { hp: 1, speed: 1, fire: 1 };
    this.stats = { kills: 0, astroSplats: 0, bosses: 0 };

    this.onEvent = function () {}; // ui hook (banner, gameover, hud dirty flags)
  }

  /* ---------------- run control ---------------- */
  Game.prototype.startRun = function (fromWave) {
    this.score = 0;
    this.lives = C.startLives;
    this.wave = Math.max(1, fromWave || 1);
    this.bestWave = this.wave;
    this.bullets.length = 0;
    this.ebullets.length = 0;
    this.enemies.length = 0;
    this.astros.length = 0;
    this.pups.length = 0;
    this.boss = null;
    this.fx.particles.length = 0;
    this.fx.texts.length = 0;
    this.stats = { kills: 0, astroSplats: 0, bosses: 0 };
    this.player = new AA.Player(this);
    this.state = 'playing';
    this.beginWave(this.wave);
    AA.audio.startMusic(this.wave % 5 === 0 ? 'boss' : 'main');
  };

  Game.prototype.pause = function () {
    if (this.state === 'playing') { this.state = 'paused'; this.onEvent('pause'); }
  };
  Game.prototype.resume = function () {
    if (this.state === 'paused') { this.state = 'playing'; this.onEvent('resume'); AA.audio.resume(); }
  };
  Game.prototype.toMenu = function () {
    this.state = 'menu';
    this.menuT = 0;
    this.boss = null;
    AA.audio.startMusic('main');
    this.onEvent('menu');
  };

  /* ---------------- waves ---------------- */
  Game.prototype.beginWave = function (n) {
    this.wave = n;
    if (n > this.bestWave) { this.bestWave = n; AA.save.saveProgress(n); }
    var spec = AA.buildSpawnTimeline(n, this.rng);
    this.spawnQueue = spec.events;
    this.spawnIdx = 0;
    this.waveTimer = 0;
    this.waveState = 'intro';
    this.scales = { hp: spec.hpScale, speed: spec.speedScale, fire: spec.fireScale };
    this.isBossWave = spec.isBoss;
    AA.audio.waveStart();
    if (!this.headless) {
      this.onEvent('banner', spec.isBoss ? 'WARNING — BOSS CARRIER' : 'WAVE ' + n, spec.isBoss);
      if (spec.isBoss) AA.audio.bossAlarm();
      AA.audio.startMusic(spec.isBoss ? 'boss' : 'main');
    }
  };

  Game.prototype.spawnAt = function (ev, wave) {
    this.enemies.push(new AA.Enemy(this, ev, this.scales));
  };

  Game.prototype.updateSpawning = function (dt) {
    this.waveTimer += dt;
    if (this.waveState === 'intro') {
      if (this.waveTimer > 1.6) { this.waveState = 'spawning'; this.waveTimer = 0; }
      return;
    }
    if (this.waveState === 'spawning') {
      while (this.spawnIdx < this.spawnQueue.length && this.spawnQueue[this.spawnIdx].t <= this.waveTimer) {
        var ev = this.spawnQueue[this.spawnIdx++];
        if (ev.kind === 'boss') {
          this.boss = new AA.Boss(this, this.wave);
          this.onEvent('bossbar', true, this.boss.name);
        } else {
          this.spawnAt(ev, this.wave);
        }
      }
      var queueDone = this.spawnIdx >= this.spawnQueue.length;
      var screenClear = this.enemies.length === 0 && !this.boss;
      if (queueDone && screenClear) {
        this.waveState = 'cleared';
        this.waveTimer = 0;
      }
    } else if (this.waveState === 'cleared') {
      if (this.waveTimer > 2.0) this.beginWave(this.wave + 1);
    }
  };

  /* ---------------- scoring & death ---------------- */
  Game.prototype.addScore = function (n, x, y, color) {
    this.score += n;
    if (x != null && !this.headless) this.fx.text(x, y, '+' + n, color || '#fff', n >= 100 ? 18 : 14);
    this.onEvent('score');
  };

  Game.prototype.dropPowerup = function (x, y, forceType) {
    var type = forceType;
    if (!type) {
      var w = C.dropWeights, total = w.rapid + w.triple + w.dmg + w.shield;
      var r = this.rng.float() * total;
      if ((r -= w.rapid) <= 0) type = 'rapid';
      else if ((r -= w.triple) <= 0) type = 'triple';
      else if ((r -= w.dmg) <= 0) type = 'dmg';
      else type = 'shield';
    }
    if (this.pups.length < 8) this.pups.push(new AA.PowerUp(this, x, y, type));
  };

  Game.prototype.maybeAstronaut = function (x, y, big) {
    if (!this.rng.chance(C.astroChance)) return;
    var n = big && this.rng.chance(0.5) ? 2 : 1;
    for (var i = 0; i < n; i++) {
      this.astros.push(new AA.Astronaut(this, x + this.rng.range(-14, 14), y + this.rng.range(-8, 8)));
    }
  };

  Game.prototype.killEnemy = function (e, opts) {
    if (e.dead) return;
    e.dead = true;
    opts = opts || {};
    var size = e.kind === 'heavy' ? 1.1 : 0.75;
    this.fx.explosion(e.x, e.y, size);
    if (!opts.silent) this.addScore(e.score, e.x, e.y);
    this.stats.kills++;
    if (this.rng.chance(C.dropChance)) this.dropPowerup(e.x, e.y);
    this.maybeAstronaut(e.x, e.y, e.kind === 'heavy');
  };

  Game.prototype.loseLife = function () {
    this.lives--;
    this.fx.explosion(this.player.x, this.player.y, 1.4);
    this.fx.text(this.player.x, this.player.y - 40, this.lives > 0 ? 'OUCH!' : 'SAUCER DOWN!', '#ff5a3c', 20);
    AA.audio.lifeLost();
    this.shake(14);
    this.onEvent('hud');
    if (this.lives <= 0) this.gameOver();
  };

  Game.prototype.onBossKilled = function (boss) {
    this.boss = null;
    this.stats.bosses++;
    this.fx.explosion(boss.x, boss.y, 1.6);
    for (var i = 0; i < 6; i++) {
      var px = boss.x + this.rng.range(-120, 120), py = boss.y + this.rng.range(-50, 50);
      this.fx.explosion(px, py, 0.9);
    }
    this.addScore(AA.bossScore(this.wave), boss.x, boss.y, '#ffd23e');
    // reward: guaranteed loot + pilots to splat
    for (i = 0; i < 3; i++) this.dropPowerup(boss.x + this.rng.range(-90, 90), boss.y + this.rng.range(-20, 40));
    for (i = 0; i < 3; i++) this.astros.push(new AA.Astronaut(this, boss.x + this.rng.range(-100, 100), boss.y + this.rng.range(-20, 30)));
    // clear enemy fire (mercy window)
    for (i = 0; i < this.ebullets.length; i++) {
      var ebx = this.ebullets[i];
      this.fx.add({ type: 'spark', spr: 'sparkCool', x: ebx.x, y: ebx.y, vx: 0, vy: -20, life: 0.15, maxLife: 0.15, size: 10 });
    }
    this.ebullets.length = 0;
    this.onEvent('bossbar', false);
    AA.audio.alienVoice('boss');
    AA.audio.startMusic('main');
    this.shake(16);
  };

  Game.prototype.gameOver = function () {
    this.state = 'gameover';
    AA.audio.stopMusic();
    AA.audio.gameOver();
    this.onEvent('gameover');
  };

  Game.prototype.shake = function (m) { this.shakeMag = Math.max(this.shakeMag, m); };

  /* ---------------- main update ---------------- */
  Game.prototype.update = function (dt) {
    if (this.state === 'menu') { this.updateMenu(dt); return; }
    if (this.state !== 'playing') return;

    if (this.bot) this.botThink(dt);
    if (this.colCd > 0) this.colCd -= dt;

    this.background.update(dt);
    this.player.update(dt, this.input);
    this.updateSpawning(dt);

    var i, j;

    // enemies
    for (i = this.enemies.length - 1; i >= 0; i--) {
      var e = this.enemies[i];
      e.update(dt);
      if (e.dead) this.enemies.splice(i, 1);
    }
    if (this.boss) this.boss.update(dt);

    // player bullets
    for (i = this.bullets.length - 1; i >= 0; i--) {
      var b = this.bullets[i];
      b.t += dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < -30 || b.x < -20 || b.x > C.W + 20) this.bullets.splice(i, 1);
    }
    // enemy bullets
    for (i = this.ebullets.length - 1; i >= 0; i--) {
      var eb = this.ebullets[i];
      eb.x += eb.vx * dt; eb.y += eb.vy * dt;
      if (eb.y > C.H + 24 || eb.y < -40 || eb.x < -24 || eb.x > C.W + 24) this.ebullets.splice(i, 1);
    }
    // astronauts
    for (i = this.astros.length - 1; i >= 0; i--) {
      var a = this.astros[i];
      a.update(dt);
      if (a.dead) this.astros.splice(i, 1);
    }
    // powerups
    for (i = this.pups.length - 1; i >= 0; i--) {
      var pu = this.pups[i];
      pu.update(dt);
      if (pu.dead) this.pups.splice(i, 1);
    }

    this.fx.update(dt);
    this.collide();
    if (this.shakeMag > 0) this.shakeMag = Math.max(0, this.shakeMag - dt * 30);
  };

  /* ---------------- collisions ---------------- */
  Game.prototype.collide = function () {
    var i, j, p = this.player;

    // player bullets → enemies
    for (i = this.bullets.length - 1; i >= 0; i--) {
      var b = this.bullets[i];
      var consumed = false;
      for (j = 0; j < this.enemies.length; j++) {
        var e = this.enemies[j];
        if (e.dead) continue;
        if (circleHit(b.x, b.y, b.r, e.x, e.y, e.radius)) {
          e.hp -= b.dmg;
          e.hitFlash = 0.1;
          this.fx.add({ type: 'spark', spr: 'sparkCool', x: b.x, y: b.y, vx: 0, vy: -30, life: 0.12, maxLife: 0.12, size: 12 });
          if (e.hp <= 0) this.killEnemy(e);
          consumed = true;
          break;
        }
      }
      if (!consumed && this.boss && !this.boss.dying) {
        // rect-ish hit for the big carrier
        var bs = this.boss;
        if (AA.circleRectHit(b.x, b.y, b.r, bs.x - 140, bs.y - 55, 280, 110)) {
          bs.takeHit(b.dmg);
          this.fx.add({ type: 'spark', spr: 'sparkWarm', x: b.x, y: b.y, vx: 0, vy: -30, life: 0.12, maxLife: 0.12, size: 12 });
          if (this.rng.chance(0.3)) AA.audio.bossHit();
          consumed = true;
        }
      }
      // bullets → astronauts (the 25-point splat)
      if (!consumed) {
        for (j = 0; j < this.astros.length; j++) {
          var a = this.astros[j];
          if (a.hit) continue;
          if (circleHit(b.x, b.y, b.r, a.x, a.y, a.r)) {
            a.hit = true; a.dead = true;
            this.addScore(AA.SCORES.astronaut, a.x, a.y, '#b6ff5e');
            this.fx.splat(a.x, a.y);
            this.stats.astroSplats++;
            consumed = true;
            break;
          }
        }
      }
      if (consumed) this.bullets.splice(i, 1);
    }

    // enemy bullets → player
    for (i = this.ebullets.length - 1; i >= 0; i--) {
      var eb = this.ebullets[i];
      if (circleHit(eb.x, eb.y, eb.r, p.x, p.y, p.rBullet)) {
        this.ebullets.splice(i, 1);
        this.playerDamaged(eb.dmg, 'bullet');
      }
    }

    // enemy ships → player (ramming)
    for (i = this.enemies.length - 1; i >= 0; i--) {
      var e2 = this.enemies[i];
      if (e2.dead) continue;
      if (circleHit(e2.x, e2.y, e2.radius, p.x, p.y, p.rShip)) {
        this.killEnemy(e2, { silent: true }); // destroyed in the crash, no farming score
        this.playerDamaged(35, 'crash');
      }
    }

    // boss → player
    if (this.boss && !this.boss.dying) {
      var bs2 = this.boss;
      if (AA.circleRectHit(p.x, p.y, p.rShip, bs2.x - 130, bs2.y - 45, 260, 100)) {
        this.playerDamaged(45, 'boss');
      }
    }

    // powerups → player
    for (i = this.pups.length - 1; i >= 0; i--) {
      var pu = this.pups[i];
      if (circleHit(pu.x, pu.y, pu.r, p.x, p.y, p.rShip)) {
        p.givePowerup(pu.type);
        this.pups.splice(i, 1);
        AA.audio.powerup(pu.type);
        this.fx.text(p.x, p.y - 44, powerLabel(pu.type), powerColor(pu.type), 15);
        this.onEvent('hud');
      }
    }

    // astronauts → player ship also splats (25 pts, once only)
    for (i = this.astros.length - 1; i >= 0; i--) {
      var a2 = this.astros[i];
      if (a2.hit) continue;
      if (circleHit(a2.x, a2.y, a2.r, p.x, p.y, p.rShip)) {
        a2.hit = true; a2.dead = true;
        this.addScore(AA.SCORES.astronaut, a2.x, a2.y, '#b6ff5e');
        this.fx.splat(a2.x, a2.y);
        this.stats.astroSplats++;
      }
    }
  };

  Game.prototype.playerDamaged = function (dmg, cause) {
    if (this.colCd > 0 && cause !== 'bullet') return; // avoid multi-tick ram damage
    var res = this.player.takeHit(dmg, cause);
    if (res === 'immune') return;
    if (cause !== 'bullet') this.colCd = 0.6;
    var p = this.player;
    if (res === 'shield') {
      AA.audio.shieldHit();
      this.fx.add({ type: 'ring', x: p.x, y: p.y, vx: 0, vy: 0, life: 0.3, maxLife: 0.3, size: 26, grow: 120 });
    } else if (res === 'shielddown') {
      AA.audio.shieldDown();
      this.fx.text(p.x, p.y - 52, 'SHIELD DOWN!', '#35e6ff', 17);
      AA.audio.alienVoice('hit');
    } else if (res === 'life') {
      this.loseLife();
    }
    this.onEvent('hud');
  };

  /* ---------------- menu scene ---------------- */
  Game.prototype.updateMenu = function (dt) {
    this.menuT += dt;
    this.background.update(dt);
    this.fx.update(dt);
  };

  Game.prototype.drawMenu = function (ctx) {
    this.background.draw(ctx, this.sprites);
    var s = this.sprites;
    var bob = Math.sin(this.menuT * 1.6) * 10;
    var tilt = Math.sin(this.menuT * 0.9) * 0.06;
    // mascot saucer
    ctx.save();
    ctx.translate(240, 210 + bob);
    ctx.rotate(tilt);
    ctx.scale(1.5, 1.5);
    ctx.drawImage(s.player.cv, -s.player.w / 2, -s.player.h / 2, s.player.w, s.player.h);
    ctx.restore();
    // engine sparkle
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(140,255,190,.4)';
    ctx.beginPath(); ctx.ellipse(240, 210 + bob + 48, 26, 12, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // drifting astronauts (menu flavor)
    for (var i = 0; i < 3; i++) {
      var t = this.menuT * 0.35 + i * 2.1;
      var ax = 60 + i * 160 + Math.sin(t) * 30;
      var ay = 430 + ((t * 40 + i * 300) % 420);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(Math.sin(t * 2) * 0.8);
      ctx.globalAlpha = 0.85;
      ctx.drawImage(s.astronaut.cv, -13, -15, 26, 30);
      ctx.restore();
    }
    this.fx.draw(ctx, this.sprites);
  };

  /* ---------------- render ---------------- */
  Game.prototype.render = function (ctx) {
    var s = this.sprites;
    if (this.state === 'menu') { this.drawMenu(ctx); return; }

    ctx.save();
    if (this.shakeMag > 0.2) {
      ctx.translate((Math.random() * 2 - 1) * this.shakeMag, (Math.random() * 2 - 1) * this.shakeMag);
    }

    this.background.draw(ctx, s);

    // powerups (below ships)
    for (var i = 0; i < this.pups.length; i++) this.pups[i].draw(ctx, s);
    // astronauts
    for (i = 0; i < this.astros.length; i++) this.astros[i].draw(ctx, s);
    // enemies
    for (i = 0; i < this.enemies.length; i++) this.enemies[i].draw(ctx, s);
    // boss
    if (this.boss) this.boss.draw(ctx, s);

    // player bullets + trails
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < this.bullets.length; i++) {
      var b = this.bullets[i];
      var spr = s[b.spr];
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = b.spr === 'bulletDmg' ? 'rgba(255,150,60,.8)' : 'rgba(90,230,255,.8)';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.drawImage(spr.cv, b.x - spr.w / 2, b.y - spr.h / 2, spr.w, spr.h);
    }
    ctx.restore();

    // enemy bullets
    for (i = 0; i < this.ebullets.length; i++) {
      var eb = this.ebullets[i];
      var es = eb.heavy ? s.ebulletHeavy : s.ebullet;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(es.cv, eb.x - es.w / 2, eb.y - es.h / 2, es.w, es.h);
      ctx.restore();
    }

    // player
    if (this.player && this.state !== 'gameover') this.player.draw(ctx, s);

    // fx on top
    this.fx.draw(ctx, s);
    ctx.restore();
  };

  /* ---------------- autopilot (deterministic test mode) ---------------- */
  Game.prototype.botThink = function (dt) {
    var p = this.player, inp = this.input;
    var tx = p.x, ty = p.y;

    // dodge nearest incoming bullet
    var danger = null, dScore = 1e9;
    for (var i = 0; i < this.ebullets.length; i++) {
      var eb = this.ebullets[i];
      if (eb.vy <= 0) continue;
      var dtImpact = (p.y - eb.y) / eb.vy;
      if (dtImpact < 0 || dtImpact > 1.4) continue;
      var xAt = eb.x + eb.vx * dtImpact;
      var dx = Math.abs(xAt - p.x);
      if (dx < 60 && dtImpact < dScore) { dScore = dtImpact; danger = { x: xAt, dx: dx }; }
    }
    if (danger) {
      tx = p.x + (p.x >= danger.x ? 90 : -90);
      ty = p.y - 30;
    } else {
      // chase nearest loot (astronauts are worth points!), else nearest enemy
      var target = null, best = 1e9, i, d;
      for (i = 0; i < this.astros.length; i++) {
        var a = this.astros[i];
        d = Math.abs(a.x - p.x) + Math.abs(a.y - p.y) * 0.5;
        if (a.y < p.y && d < best) { best = d; target = a; }
      }
      for (i = 0; i < this.pups.length; i++) {
        var pu = this.pups[i];
        d = Math.abs(pu.x - p.x) + Math.abs(pu.y - p.y) * 0.5;
        if (d < best) { best = d; target = pu; }
      }
      if (target) { tx = target.x; ty = Math.min(p.y, target.y + 60); }
      else if (this.boss) { tx = this.boss.x; ty = C.H - 150; }
      else {
        var ne = null, nd = 1e9;
        for (i = 0; i < this.enemies.length; i++) {
          var en = this.enemies[i];
          d = Math.abs(en.x - p.x) + Math.abs(en.y - p.y) * 0.4;
          if (d < nd) { nd = d; ne = en; }
        }
        if (ne) { tx = ne.x; ty = clamp(ne.y + 110, 190, C.H - 60); }
        else { tx = C.W / 2; ty = C.H - 150; }
      }
    }
    inp.mode = 'pointer'; inp.pointerActive = true;
    inp.tx = clamp(tx, 40, C.W - 40);
    inp.ty = clamp(ty, 160, C.H - 60);
  };

  function powerLabel(t) {
    return { rapid: 'RAPID FIRE!', triple: 'TRIPLE SHOT!', dmg: 'HEAVY PLASMA!', shield: 'SHIELD BOOST!' }[t];
  }
  function powerColor(t) {
    return { rapid: '#ffd23e', triple: '#ff5ec8', dmg: '#ff7a3e', shield: '#35e6ff' }[t];
  }

  AA.Game = Game;
})(typeof self !== 'undefined' ? self : globalThis);
