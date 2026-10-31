/* ============================================================
   AA.entities — player, enemies, boss, astronauts, power-ups,
   bullets and the particle/effects system.
   ============================================================ */
(function (root) {
  'use strict';
  var AA = (root.AA = root.AA || {});
  var C = AA.cfg;
  var clamp = AA.clamp, circleHit = AA.circleHit, approach = AA.approach;
  var TAU = Math.PI * 2;

  /* ================= PLAYER ================= */
  function Player(game) {
    this.game = game;
    this.w = 92; this.h = 74;
    this.x = C.W / 2; this.y = C.H - 130;
    this.vx = 0; this.vy = 0;
    this.rBullet = 20;      // radius vs enemy bullets
    this.rShip = 30;        // radius vs enemy ships / pickups
    this.fireT = 0;
    this.rapidT = 0; this.tripleT = 0; this.dmgT = 0;
    this.shield = C.shieldStart;
    this.invuln = 0;
    this.regenDelay = 0;
    this.hitFlash = 0;
    this.shieldFlash = 0;
    this.t = 0;
    this.alive = true;
  }

  Player.prototype.givePowerup = function (type) {
    if (type === 'shield') { this.shield = Math.min(C.shieldMax, this.shield + C.pickupShieldAmount); this.regenDelay = 0; }
    else if (type === 'rapid') this.rapidT = C.powerDuration;
    else if (type === 'triple') this.tripleT = C.powerDuration;
    else if (type === 'dmg') this.dmgT = C.powerDuration;
  };

  Player.prototype.update = function (dt, input) {
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.shieldFlash > 0) this.shieldFlash -= dt;
    if (this.rapidT > 0) this.rapidT -= dt;
    if (this.tripleT > 0) this.tripleT -= dt;
    if (this.dmgT > 0) this.dmgT -= dt;

    // movement: keyboard velocity or eased pointer-follow
    if (input.mode === 'pointer' && input.pointerActive) {
      this.x = approach(this.x, input.tx, C.followRate, dt);
      this.y = approach(this.y, input.ty, C.followRate, dt);
      this.vx = 0; this.vy = 0;
    } else {
      var ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      var ay = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      if (ax && ay) { ax *= 0.7071; ay *= 0.7071; } // smooth diagonals
      this.vx = approach(this.vx, ax * C.playerSpeed, 18, dt);
      this.vy = approach(this.vy, ay * C.playerSpeed, 18, dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    this.x = clamp(this.x, 30, C.W - 30);
    this.y = clamp(this.y, 120, C.H - 44);

    // shield regen
    if (this.regenDelay > 0) this.regenDelay -= dt;
    else if (this.shield < C.shieldMax) this.shield = Math.min(C.shieldMax, this.shield + C.shieldRegenRate * dt);

    // auto-fire
    this.fireT -= dt;
    if (this.fireT <= 0) {
      this.fireT = (this.rapidT > 0 ? C.fireIntervalRapid : C.fireInterval);
      this.fire();
    }
  };

  Player.prototype.fire = function () {
    var g = this.game;
    var dmg = this.dmgT > 0 ? C.bulletDamageBoosted : C.bulletDamage;
    var spr = this.dmgT > 0 ? 'bulletDmg' : 'bullet';
    var kind = this.dmgT > 0 ? 'dmg' : (this.tripleT > 0 ? 'triple' : null);
    var speed = C.bulletSpeed;
    if (this.tripleT > 0) {
      for (var i = -1; i <= 1; i++) {
        g.bullets.push({ x: this.x + i * 14, y: this.y - 26, vx: i * 110, vy: -speed, dmg: dmg, spr: spr, r: 6, t: 0 });
      }
    } else {
      g.bullets.push({ x: this.x - 18, y: this.y - 20, vx: 0, vy: -speed, dmg: dmg, spr: spr, r: 6, t: 0 });
      g.bullets.push({ x: this.x + 18, y: this.y - 20, vx: 0, vy: -speed, dmg: dmg, spr: spr, r: 6, t: 0 });
    }
    g.fx.muzzle(this.x - 18, this.y - 24); g.fx.muzzle(this.x + 18, this.y - 24);
    AA.audio.laser(kind);
  };

  Player.prototype.takeHit = function (dmg, cause) {
    if (this.invuln > 0 || !this.alive) return 'immune';
    var res = AA.applyDamage(this.shield, 0, dmg); // lives handled by game
    this.shield = res.shield;
    this.regenDelay = C.shieldRegenDelay;
    if (res.lostLife) {
      this.shield = C.shieldRespawn;
      this.invuln = C.invulnTime;
      this.hitFlash = 0.4;
      return 'life';
    }
    this.shieldFlash = 0.35;
    if (res.shieldBroken) return 'shielddown';
    return 'shield';
  };

  Player.prototype.draw = function (ctx, sprites) {
    var g = this.game;
    // engine glow
    var pulse = 0.75 + 0.25 * Math.sin(this.t * 22);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(120,255,190,' + (0.35 * pulse) + ')';
    ctx.beginPath(); ctx.ellipse(this.x, this.y + 26, 20, 10, 0, 0, TAU); ctx.fill();
    ctx.restore();

    // blink while invulnerable
    if (this.invuln > 0 && Math.floor(this.t * 14) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.drawImage(sprites.player.cv, this.x - sprites.player.w / 2, this.y - sprites.player.h / 2, sprites.player.w, sprites.player.h);
    ctx.globalAlpha = 1;

    // shield bubble
    if (this.shield > 0 || this.shieldFlash > 0) {
      var frac = this.shield / C.shieldMax;
      var a = 0.16 + frac * 0.22 + (this.shieldFlash > 0 ? this.shieldFlash : 0);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(90,220,255,' + Math.min(0.9, a + 0.3) + ')';
      ctx.lineWidth = this.shieldFlash > 0 ? 3.5 : 2;
      ctx.beginPath(); ctx.ellipse(this.x, this.y + 4, 40, 34, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(70,190,255,' + (a * 0.35) + ')';
      ctx.beginPath(); ctx.ellipse(this.x, this.y + 4, 40, 34, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  };

  /* ================= ENEMY ================= */
  function Enemy(game, ev, scales) {
    var def = C.enemyDefs[ev.kind];
    this.game = game; this.kind = ev.kind;
    this.hp = def.hp * scales.hp;
    this.maxHp = this.hp;
    this.score = def.score;
    this.radius = def.radius;
    this.bulletDmg = def.bulletDmg;
    this.bulletSpeed = def.bulletSpeed;
    this.speed = scales.speed;
    this.fireScale = scales.fire;
    this.fireT = this.game.rng.range(def.fireCd[0], def.fireCd[1]) / scales.fire * 0.7;
    this.x = ev.x; this.y = -40;
    this.move = ev.move; this.a = ev.a || 0; this.b = ev.b || 90;
    // agile/tanky ships often stop and fight rather than fly through
    if ((ev.kind === 'interceptor' || ev.kind === 'heavy') && ev.move === 'straight' && game.rng.chance(0.6)) {
      this.move = 'hover';
      this.hoverY = game.rng.range(110, ev.kind === 'heavy' ? 210 : 260);
    }
    this.phase = game.rng.range(0, TAU);
    this.baseX = ev.x;
    this.hoverY = game.rng.range(120, 250);
    this.hovered = false;
    this.dashT = game.rng.range(2.2, 4);
    this.t = 0;
    this.hitFlash = 0;
    this.dead = false;
    this.bank = 0;
  }

  Enemy.prototype.update = function (dt) {
    this.t += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    var sp = this.speed;
    switch (this.move) {
      case 'straight':
        this.y += this.b * sp * dt;
        this.x = this.baseX + Math.sin(this.t * 2 + this.phase) * 16;
        break;
      case 'dive':
        this.y += this.b * sp * dt;
        break;
      case 'sine':
        this.x += this.a * this.b * sp * dt;
        this.y += 62 * sp * dt;
        this.bank = this.a * 0.35;
        break;
      case 'diagonal':
        this.x += this.a * this.b * sp * dt;
        this.y += this.b * 0.85 * sp * dt;
        this.bank = this.a * 0.3;
        break;
      case 'hover':
        if (this.y < this.hoverY) {
          this.y += 110 * sp * dt;
        } else {
          this.hovered = true;
          this.dashT -= dt;
          if (this.dashT <= 0) {
            this.dashT = this.game.rng.range(2.4, 4.2);
            this.baseX = clamp(this.baseX + this.game.rng.range(-110, 110), 46, C.W - 46);
          }
          this.x = approach(this.x, this.baseX + Math.sin(this.t * 1.6 + this.phase) * 46, 6, dt);
          this.y = this.hoverY + Math.sin(this.t * 1.1 + this.phase) * 12;
        }
        break;
    }
    // firing
    if (this.y > 10 && this.y < C.H - 60) {
      this.fireT -= dt;
      if (this.fireT <= 0) this.fire();
    }
    // offscreen cleanup
    if (this.y > C.H + 60 || this.x < -70 || this.x > C.W + 70) this.dead = true;
  };

  Enemy.prototype.fire = function () {
    var def = C.enemyDefs[this.kind];
    this.fireT = this.game.rng.range(def.fireCd[0], def.fireCd[1]) / this.fireScale;
    var g = this.game, p = g.player;
    if (this.kind === 'fighter') {
      // mostly straight down, occasionally aimed
      var aimed = this.game.rng.chance(0.35) && p.alive;
      var dx = aimed ? (p.x - this.x) : 0, dy = aimed ? (p.y - this.y) : 1;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var v = this.bulletSpeed;
      g.ebullets.push({ x: this.x, y: this.y + 16, vx: dx / len * v, vy: dy / len * v, dmg: def.bulletDmg, heavy: false, r: 5 });
    } else if (this.kind === 'interceptor') {
      if (p.alive) {
        var dx2 = p.x - this.x, dy2 = p.y - this.y;
        var l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
        var v2 = this.bulletSpeed;
        g.ebullets.push({ x: this.x, y: this.y + 14, vx: dx2 / l2 * v2, vy: dy2 / l2 * v2, dmg: def.bulletDmg, heavy: false, r: 5 });
      }
    } else { // heavy: 3-way slow spread
      var base = p.alive ? Math.atan2(p.y - this.y, p.x - this.x) : Math.PI / 2;
      for (var i = -1; i <= 1; i++) {
        var ang = base + i * 0.3;
        g.ebullets.push({ x: this.x, y: this.y + 20, vx: Math.cos(ang) * this.bulletSpeed, vy: Math.sin(ang) * this.bulletSpeed, dmg: def.bulletDmg, heavy: true, r: 8 });
      }
    }
    AA.audio.enemyLaser();
  };

  Enemy.prototype.draw = function (ctx, sprites) {
    var spr = sprites[this.kind];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.bank || 0);
    ctx.drawImage(spr.cv, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
    if (this.hitFlash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, this.hitFlash * 6);
      ctx.drawImage(spr.cv, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // heavy HP pips
    if (this.kind === 'heavy' && this.hp < this.maxHp) {
      var w = 34, frac = this.hp / this.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(this.x - w / 2, this.y - 36, w, 4);
      ctx.fillStyle = '#8ef06a'; ctx.fillRect(this.x - w / 2 + 1, this.y - 35, (w - 2) * frac, 2);
    }
  };

  /* ================= ASTRONAUT ================= */
  function Astronaut(game, x, y) {
    this.game = game;
    this.x = x; this.y = y;
    this.vy = game.rng.range(42, 78);
    this.swayA = game.rng.range(8, 20);
    this.swayW = game.rng.range(1.2, 2.4);
    this.phase = game.rng.range(0, TAU);
    this.rot = game.rng.range(0, TAU);
    this.vr = game.rng.sign() * game.rng.range(1.2, 3.2);
    this.r = 14;
    this.hit = false;   // once-only scoring guard
    this.dead = false;
    this.t = 0;
  }

  Astronaut.prototype.update = function (dt) {
    this.t += dt;
    this.y += this.vy * dt;
    this.x += Math.sin(this.t * this.swayW + this.phase) * this.swayA * dt;
    this.rot += this.vr * dt;
    if (this.y > C.H + 30) this.dead = true;
  };

  Astronaut.prototype.draw = function (ctx, sprites) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(this.rot) * 0.9); // tumbling wobble
    ctx.drawImage(sprites.astronaut.cv, -13, -15, 26, 30);
    // tiny distress arms wiggle
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2;
    var wig = Math.sin(this.t * 10) * 3;
    ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-13, -6 + wig); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(13, -6 - wig); ctx.stroke();
    ctx.restore();
  };

  /* ================= POWER-UP ================= */
  var PU_SPR = { rapid: 'puRapid', triple: 'puTriple', dmg: 'puDmg', shield: 'puShield' };

  function PowerUp(game, x, y, type) {
    this.game = game;
    this.type = type;
    this.x = x; this.y = y;
    this.vy = 58;
    this.phase = game.rng.range(0, TAU);
    this.t = 0;
    this.r = 16;
    this.dead = false;
  }

  PowerUp.prototype.update = function (dt) {
    this.t += dt;
    this.y += this.vy * dt;
    this.x += Math.sin(this.t * 2.2 + this.phase) * 22 * dt;
    if (this.y > C.H + 26) this.dead = true;
  };

  PowerUp.prototype.draw = function (ctx, sprites) {
    var spr = sprites[PU_SPR[this.type]];
    var pulse = 1 + Math.sin(this.t * 6) * 0.12;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + 0.25 * Math.sin(this.t * 6);
    ctx.drawImage(spr.cv, this.x - spr.w / 2 * 1.5, this.y - spr.h / 2 * 1.5, spr.w * 1.5, spr.h * 1.5);
    ctx.restore();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(this.t * 2 + this.phase) * 0.25);
    ctx.scale(pulse, pulse);
    ctx.drawImage(spr.cv, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
    ctx.restore();
  };

  /* ================= BOSS ================= */
  function Boss(game, wave) {
    this.game = game;
    this.wave = wave;
    this.maxHp = C.bossBaseHp + wave * C.bossHpPerWave;
    this.hp = this.maxHp;
    this.x = C.W / 2; this.y = -160;
    this.targetY = 118;
    this.t = 0;
    this.phaseT = 0;
    this.patternIdx = -1;
    this.burstLeft = 0; this.burstT = 0; this.fanLeft = 0; this.fanT = 0;
    this.sweepN = 0; this.sweepT = 0; this.sweepDir = 1;
    this.rainN = 0; this.rainT = 0;
    this.spawnedAdds = false;
    this.hitFlash = 0;
    this.smokeT = 0;
    this.dying = false; this.dieT = 0;
    this.dead = false;
    this.name = 'USS PAYBACK Mk.' + Math.ceil(wave / 5);
  }

  Boss.prototype.patternDur = function () { return Math.max(2.1, 3.2 - this.wave * 0.04); };

  Boss.prototype.update = function (dt) {
    this.t += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (this.dying) {
      this.dieT += dt;
      var g = this.game;
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = 0.11;
        g.fx.explosion(this.x + g.rng.range(-110, 110), this.y + g.rng.range(-45, 45), 0.55);
        g.shake(6);
      }
      if (this.dieT > 1.7 && !this.dead) {
        this.dead = true;
        g.onBossKilled(this);
      }
      return;
    }

    // entry + idle sway
    if (this.y < this.targetY) {
      this.y = Math.min(this.targetY, this.y + 60 * dt);
    } else {
      this.x = C.W / 2 + Math.sin(this.t * 0.55) * (C.W / 2 - 160);
      this.y = this.targetY + Math.sin(this.t * 0.9) * 14;
    }

    // damage smoke
    if (this.hp < this.maxHp * 0.5) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = this.hp < this.maxHp * 0.25 ? 0.1 : 0.24;
        this.game.fx.smoke(this.x + this.game.rng.range(-100, 100), this.y + this.game.rng.range(-30, 30));
      }
    }

    if (this.y < this.targetY - 5) return; // still entering

    // pattern state machine
    this.phaseT += dt;
    if (this.patternIdx === -1) { this.nextPattern(); return; }
    var p = this.patternIdx % 4;

    if (p === 0) {          // aimed bursts
      if (this.burstLeft > 0) {
        this.burstT -= dt;
        if (this.burstT <= 0) {
          this.burstT = 0.14;
          this.burstLeft--;
          this.fireAimed(1, 320);
        }
      } else if (this.phaseT > 0.6) { this.burstLeft = this.wave >= 10 ? 6 : 4; this.burstT = 0; this.phaseT = 0; }
    } else if (p === 1) {   // fan spreads
      if (this.fanLeft > 0) {
        this.fanT -= dt;
        if (this.fanT <= 0) {
          this.fanT = 0.7;
          this.fanLeft--;
          this.fireFan(7 + Math.min(4, Math.floor(this.wave / 10) * 2), 240);
        }
      } else if (this.phaseT > 0.5) { this.fanLeft = 3; this.fanT = 0; this.phaseT = 0; }
    } else if (p === 2) {   // spawn adds (once per cycle)
      if (!this.spawnedAdds && this.phaseT > 0.8) {
        this.spawnedAdds = true;
        var g2 = this.game;
        for (var i = 0; i < 2; i++) {
          g2.spawnAt({ kind: 'fighter', x: this.x + (i ? 90 : -90), move: 'sine', a: i ? -1 : 1, b: 120 }, this.wave);
        }
        AA.audio.alienVoice('boss');
      }
      if (this.phaseT > 1.4) this.nextPattern();
    } else {                // sweeping barrage
      if (this.sweepN > 0) {
        this.sweepT -= dt;
        if (this.sweepT <= 0) {
          this.sweepT = 0.1;
          this.sweepN--;
          var sx = this.x + this.sweepDir * (60 - this.sweepN * 9);
          this.game.ebullets.push({ x: sx, y: this.y + 60, vx: this.sweepDir * 60, vy: 300, dmg: 18, heavy: false, r: 6 });
        }
      } else if (this.phaseT > 0.4) { this.sweepN = 12; this.sweepDir = this.game.rng.sign(); this.sweepT = 0; this.phaseT = 0; }
    }

    if (this.phaseT > this.patternDur()) this.nextPattern();
  };

  Boss.prototype.nextPattern = function () {
    this.patternIdx++;
    this.phaseT = 0;
    this.burstLeft = 0; this.fanLeft = 0; this.sweepN = 0;
    if (this.patternIdx % 4 === 2) this.spawnedAdds = false;
  };

  Boss.prototype.fireAimed = function (n, speed) {
    var g = this.game, p = g.player;
    if (!p.alive) return;
    var ang = Math.atan2(p.y - this.y, p.x - this.x);
    for (var i = 0; i < n; i++) {
      var a = ang + g.rng.range(-0.08, 0.08);
      g.ebullets.push({ x: this.x + g.rng.range(-60, 60), y: this.y + 55, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg: 16, heavy: false, r: 6 });
    }
    AA.audio.enemyLaser();
  };

  Boss.prototype.fireFan = function (n, speed) {
    var g = this.game;
    var base = Math.PI / 2;
    for (var i = 0; i < n; i++) {
      var a = base + (i / (n - 1) - 0.5) * 1.5;
      g.ebullets.push({ x: this.x, y: this.y + 58, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg: 14, heavy: false, r: 6 });
    }
    AA.audio.enemyLaser();
  };

  Boss.prototype.takeHit = function (dmg) {
    if (this.dying) return;
    this.hp -= dmg;
    this.hitFlash = 0.08;
    if (this.hp <= 0) { this.hp = 0; this.dying = true; this.dieT = 0; this.smokeT = 0; }
  };

  Boss.prototype.draw = function (ctx, sprites) {
    var spr = sprites.boss;
    var scale = this.dying ? Math.max(0.6, 1 - this.dieT * 0.25) : 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    // engine glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(150,220,255,.25)';
    [-95, -35, 35, 95].forEach(function (ox) {
      ctx.beginPath(); ctx.ellipse(ox, -52, 10, 16, 0, 0, TAU); ctx.fill();
    });
    ctx.restore();
    if (this.dying) ctx.rotate(Math.sin(this.dieT * 10) * 0.04);
    ctx.scale(scale, scale);
    ctx.drawImage(spr.cv, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
    if (this.hitFlash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(spr.cv, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
    }
    ctx.restore();
  };

  /* ================= PARTICLES / FX ================= */
  function FX(game) {
    this.game = game;
    this.particles = [];
    this.texts = [];
    this.splatCount = 0;
  }

  FX.prototype.add = function (p) {
    if (this.particles.length >= C.maxParticles) {
      if (p.type === 'smoke' || p.type === 'goo') return; // trim optional types
      this.particles.shift();
    }
    this.particles.push(p);
  };

  FX.prototype.muzzle = function (x, y) {
    this.add({ type: 'spark', spr: 'sparkCool', x: x, y: y, vx: 0, vy: -40, life: 0.07, maxLife: 0.07, size: 10 });
  };

  FX.prototype.explosion = function (x, y, size) {
    size = size == null ? 1 : size;
    var g = this.game, rng = g.rng;
    this.add({ type: 'flash', x: x, y: y, vx: 0, vy: 0, life: 0.16, maxLife: 0.16, size: 40 + 60 * size });
    this.add({ type: 'ring', x: x, y: y, vx: 0, vy: 0, life: 0.35, maxLife: 0.35, size: 10, grow: 160 * (0.6 + size) });
    var n = Math.floor(10 + 16 * size);
    for (var i = 0; i < n; i++) {
      var a = rng.range(0, TAU), sp = rng.range(40, 240) * (0.5 + size);
      this.add({ type: 'spark', spr: rng.chance(0.7) ? 'sparkWarm' : 'sparkCool', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rng.range(0.25, 0.6), maxLife: 0.6, size: rng.range(4, 9) * (0.6 + size * 0.6) });
    }
    var nd = Math.floor(4 + 6 * size);
    for (i = 0; i < nd; i++) {
      a = rng.range(0, TAU); sp = rng.range(60, 200) * (0.5 + size);
      this.add({ type: 'debris', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rng.range(0.5, 1.1), maxLife: 1.1, size: rng.range(2.5, 6), rot: rng.range(0, TAU), vr: rng.range(-9, 9), color: rng.pick(['#9aa7c8', '#6a76a0', '#c8d2ea', '#8f9bd8']) });
    }
    var ns = Math.floor(3 + 4 * size);
    for (i = 0; i < ns; i++) {
      this.add({ type: 'smoke', x: x + rng.range(-10, 10), y: y + rng.range(-10, 10), vx: rng.range(-20, 20), vy: rng.range(-50, -15), life: rng.range(0.5, 1), maxLife: 1, size: rng.range(12, 22) * (0.6 + size * 0.5) });
    }
    if (size >= 0.6) AA.audio.explosion(size);
    this.game.shake(2 + size * 5);
  };

  FX.prototype.splat = function (x, y) {
    var g = this.game, rng = g.rng;
    this.add({ type: 'splat', x: x, y: y, vx: 0, vy: 26, life: 0.55, maxLife: 0.55, size: 20, rot: rng.range(0, TAU) });
    for (var i = 0; i < 12; i++) {
      var a = rng.range(0, TAU), sp = rng.range(50, 190);
      this.add({ type: 'goo', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: rng.range(0.35, 0.8), maxLife: 0.8, size: rng.range(2.5, 6), grav: 340 });
    }
    this.texts.push({ x: x, y: y - 14, vy: -46, life: 0.9, maxLife: 0.9, text: '+25', color: '#b6ff5e', size: 15 });
    AA.audio.splat();
    this.splatCount++;
    if (this.splatCount % 4 === 0) AA.audio.alienVoice('power'); // gleeful giggle
  };

  FX.prototype.smoke = function (x, y) {
    this.add({ type: 'smoke', x: x, y: y, vx: this.game.rng.range(-14, 14), vy: this.game.rng.range(-40, -20), life: 0.8, maxLife: 0.8, size: 14 });
  };

  FX.prototype.text = function (x, y, str, color, size) {
    this.texts.push({ x: x, y: y, vy: -40, life: 0.9, maxLife: 0.9, text: str, color: color || '#fff', size: size || 14 });
  };

  FX.prototype.update = function (dt) {
    var ps = this.particles;
    for (var i = ps.length - 1; i >= 0; i--) {
      var p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      if (p.grav) p.vy += p.grav * dt;
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      if (p.vr) p.rot += p.vr * dt;
      if (p.grow) p.size += p.grow * dt;
    }
    var ts = this.texts;
    for (i = ts.length - 1; i >= 0; i--) {
      var tx = ts[i];
      tx.life -= dt;
      if (tx.life <= 0) { ts.splice(i, 1); continue; }
      tx.y += tx.vy * dt;
    }
  };

  FX.prototype.draw = function (ctx, sprites) {
    var ps = this.particles;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      var k = Math.max(0, p.life / p.maxLife);
      switch (p.type) {
        case 'spark':
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
          var spr = sprites[p.spr];
          var s = p.size * (0.5 + k * 0.5);
          ctx.drawImage(spr.cv, p.x - s / 2, p.y - s / 2, s, s);
          ctx.restore();
          break;
        case 'flash':
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
          var f = sprites.flash, fs = p.size * (1.4 - k * 0.5);
          ctx.drawImage(f.cv, p.x - fs / 2, p.y - fs / 2, fs, fs);
          ctx.restore();
          break;
        case 'ring':
          ctx.save(); ctx.globalAlpha = k * 0.8; ctx.strokeStyle = '#ffe9b0'; ctx.lineWidth = 2 + k * 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.stroke();
          ctx.restore();
          break;
        case 'debris':
          ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
          break;
        case 'smoke':
          ctx.save(); ctx.globalAlpha = k * 0.5;
          var sm = sprites.smoke, ss = p.size * (1.6 - k * 0.6);
          ctx.drawImage(sm.cv, p.x - ss / 2, p.y - ss / 2, ss, ss);
          ctx.restore();
          break;
        case 'goo':
          ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = '#7ade2e';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
          ctx.restore();
          break;
        case 'splat':
          ctx.save(); ctx.globalAlpha = Math.min(1, k * 2.4);
          var sp2 = sprites.splat, sScl = p.size * (1.7 - k * 0.7) / 18;
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(sScl, sScl);
          ctx.drawImage(sp2.cv, -sp2.w / 2, -sp2.h / 2, sp2.w, sp2.h);
          ctx.restore();
          break;
      }
    }
    // floating text
    ctx.save();
    ctx.textAlign = 'center';
    for (i = 0; i < this.texts.length; i++) {
      var tx = this.texts[i];
      var a = Math.min(1, tx.life / tx.maxLife * 2);
      ctx.globalAlpha = a;
      ctx.font = '800 ' + tx.size + 'px "Segoe UI", Arial, sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.strokeText(tx.text, tx.x, tx.y);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.restore();
  };

  AA.Player = Player;
  AA.Enemy = Enemy;
  AA.Astronaut = Astronaut;
  AA.PowerUp = PowerUp;
  AA.Boss = Boss;
  AA.FX = FX;
  AA.PU_SPR = PU_SPR;
})(typeof self !== 'undefined' ? self : globalThis);
