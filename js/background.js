/* ============================================================
   AA.background — multi-layer parallax starfield & scenery
   - 4 star layers (far → streaks), independent speeds
   - Twinkle, nebulae, ringed planet, distant galaxy
   - Seamless wrap, zero state shared with gameplay logic
   ============================================================ */
(function (root) {
  'use strict';
  var AA = (root.AA = root.AA || {});

  function Background(rng, W, H) {
    this.W = W; this.H = H;
    this.t = 0;

    function mkLayer(count, speed, sizeMin, sizeMax, alphaMin, alphaMax, streak) {
      var stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: rng.float() * W,
          y: rng.float() * H,
          speed: speed * (0.75 + rng.float() * 0.5),
          size: sizeMin + rng.float() * (sizeMax - sizeMin),
          alpha: alphaMin + rng.float() * (alphaMax - alphaMin),
          tw: 1.5 + rng.float() * 4,          // twinkle speed
          phase: rng.float() * Math.PI * 2,
          hue: rng.float()
        });
      }
      return { stars: stars, streak: !!streak, speed: speed };
    }

    this.layers = [
      mkLayer(95, 13, 0.6, 1.3, 0.30, 0.65),   // far
      mkLayer(55, 34, 1.0, 1.9, 0.45, 0.85),   // mid
      mkLayer(30, 78, 1.6, 2.7, 0.6, 1.0),     // near
      mkLayer(12, 165, 1.4, 2.0, 0.5, 0.95, true) // streak layer (fastest)
    ];

    this.nebulae = [
      { spr: 'nebulaA', x: W * 0.25, y: H * 0.3, vy: 5, scale: 1.5, a: 0.8 },
      { spr: 'nebulaB', x: W * 0.78, y: H * 0.75, vy: 3.4, scale: 1.8, a: 0.7 }
    ];
    this.galaxy = { x: W * 0.8, y: H * 0.18, vy: 7, rot: 0 };
    this.planet = { active: true, x: W * 0.72, y: -140, vy: 11 };
    this.shootTimer = rng.range(4, 9);
    this.shoot = null;
    this.rng = rng;
  }

  Background.prototype.update = function (dt) {
    this.t += dt;
    for (var li = 0; li < this.layers.length; li++) {
      var layer = this.layers[li];
      for (var i = 0; i < layer.stars.length; i++) {
        var s = layer.stars[i];
        s.y += s.speed * dt;
        if (s.y > this.H + 3) {
          s.y = -3;
          s.x = this.rng.float() * this.W;
          s.tw = 1.5 + this.rng.float() * 4;
        }
      }
    }
    for (var n = 0; n < this.nebulae.length; n++) {
      var neb = this.nebulae[n];
      neb.y += neb.vy * dt;
      if (neb.y - 260 > this.H) neb.y = -260;
    }
    this.galaxy.y += this.galaxy.vy * dt;
    this.galaxy.rot += dt * 0.05;
    if (this.galaxy.y - 60 > this.H) this.galaxy.y = -60;

    var p = this.planet;
    p.y += p.vy * dt;
    if (p.y - 160 > this.H) { p.active = false; p.y = -160; p.x = this.W * (0.25 + this.rng.float() * 0.55); }

    // rare shooting star (visual only)
    if (this.shoot) {
      this.shoot.x += this.shoot.vx * dt;
      this.shoot.y += this.shoot.vy * dt;
      this.shoot.life -= dt;
      if (this.shoot.life <= 0) this.shoot = null;
    } else {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = 6 + this.rng.float() * 10;
        this.shoot = {
          x: this.rng.float() * this.W, y: -10,
          vx: this.rng.range(-120, 120), vy: this.rng.range(380, 520),
          life: 0.7
        };
      }
    }
  };

  Background.prototype.draw = function (ctx, sprites) {
    var W = this.W, H = this.H;

    // deep-space gradient
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#070a1e');
    g.addColorStop(0.5, '#04060f');
    g.addColorStop(1, '#02030a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // nebulae + galaxy (additive)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var n = 0; n < this.nebulae.length; n++) {
      var neb = this.nebulae[n];
      var spr = sprites[neb.spr];
      ctx.globalAlpha = neb.a;
      ctx.drawImage(spr.cv, neb.x - spr.w * neb.scale / 2, neb.y - spr.h * neb.scale / 2, spr.w * neb.scale, spr.h * neb.scale);
    }
    ctx.globalAlpha = 0.8;
    var gal = sprites.galaxy;
    ctx.save();
    ctx.translate(this.galaxy.x, this.galaxy.y);
    ctx.rotate(this.galaxy.rot);
    ctx.drawImage(gal.cv, -gal.w / 2, -gal.h / 2, gal.w, gal.h);
    ctx.restore();

    // planet
    if (this.planet.active) {
      var pl = sprites.planet;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(pl.cv, this.planet.x - pl.w / 2, this.planet.y - pl.h / 2, pl.w, pl.h);
    }
    ctx.restore();

    // star layers
    var li, i, s, layer, tw;
    for (li = 0; li < this.layers.length; li++) {
      layer = this.layers[li];
      for (i = 0; i < layer.stars.length; i++) {
        s = layer.stars[i];
        tw = s.alpha * (0.72 + 0.28 * Math.sin(this.t * s.tw + s.phase));
        ctx.globalAlpha = Math.max(0.05, tw);
        if (layer.streak) {
          // near layer drawn as motion streaks
          var len = s.speed * 0.05;
          ctx.strokeStyle = s.hue > 0.5 ? '#cfe4ff' : '#ffe9d6';
          ctx.lineWidth = s.size;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - len);
          ctx.lineTo(s.x, s.y + s.size);
          ctx.stroke();
        } else {
          ctx.fillStyle = s.hue > 0.66 ? '#ffe3c8' : (s.hue > 0.33 ? '#d8e6ff' : '#ffffff');
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    // shooting star
    if (this.shoot) {
      var sh = this.shoot;
      ctx.save();
      ctx.globalAlpha = Math.min(1, sh.life * 2.2);
      ctx.strokeStyle = '#eaf4ff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x - sh.vx * 0.06, sh.y - sh.vy * 0.06);
      ctx.stroke();
      ctx.restore();
    }
  };

  AA.Background = Background;
})(typeof self !== 'undefined' ? self : globalThis);
