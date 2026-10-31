/* ============================================================
   AA.ui — DOM screens, HUD, leaderboard, settings wiring
   ============================================================ */
(function (root) {
  'use strict';
  var AA = (root.AA = root.AA || {});

  function UI() {
    this.$ = function (id) { return document.getElementById(id); };
    this.screens = ['title', 'instructions', 'settings', 'scores', 'pause', 'gameover'];
    this.lastLives = -1;
    this.powerKeys = '';
    this.game = null;
    this.sprites = null;
    this.pendingHigh = null; // {score, wave} awaiting name save
    this.saved = false;
  }

  UI.prototype.init = function (game, sprites) {
    var self = this;
    this.game = game;
    this.sprites = sprites;
    this.game.onEvent = function (type, a, b) { self.onGameEvent(type, a, b); };

    // --- main menu buttons ---
    this.$('btn-start').addEventListener('click', function () { self.click(); self.newRun(1); });
    this.$('btn-continue').addEventListener('click', function () { self.click(); self.newRun(AA.save.loadProgress()); });
    this.$('btn-instructions').addEventListener('click', function () { self.click(); self.show('instructions'); });
    this.$('btn-settings').addEventListener('click', function () { self.click(); self.show('settings'); });
    this.$('btn-scores').addEventListener('click', function () { self.click(); self.renderScores(); self.show('scores'); });

    // --- back buttons ---
    var backs = document.querySelectorAll('[data-back]');
    for (var i = 0; i < backs.length; i++) {
      backs[i].addEventListener('click', function () { self.click(); self.show('title'); });
    }

    // --- pause menu ---
    this.$('btn-pause').addEventListener('click', function () { self.click(); self.game.pause(); });
    this.$('btn-resume').addEventListener('click', function () { self.click(); self.game.resume(); });
    this.$('btn-restart').addEventListener('click', function () { self.click(); self.newRun(1); });
    this.$('btn-quit').addEventListener('click', function () { self.click(); self.game.toMenu(); self.show('title'); self.refreshTitle(); });

    // --- game over ---
    this.$('btn-go-restart').addEventListener('click', function () { self.click(); self.newRun(1); });
    this.$('btn-go-continue').addEventListener('click', function () { self.click(); self.newRun(AA.save.loadProgress()); });
    this.$('btn-go-title').addEventListener('click', function () { self.click(); self.game.toMenu(); self.show('title'); self.refreshTitle(); });
    this.$('btn-save-score').addEventListener('click', function () { self.saveHighScore(); });

    // --- settings ---
    var settings = AA.save.loadSettings();
    var musicEl = this.$('set-music'), sfxEl = this.$('set-sfx'), muteEl = this.$('set-mute');
    musicEl.value = Math.round(settings.music * 100);
    sfxEl.value = Math.round(settings.sfx * 100);
    muteEl.checked = settings.muted;
    function pushSettings() {
      var s = {
        music: musicEl.value / 100,
        sfx: sfxEl.value / 100,
        muted: muteEl.checked,
        name: settings.name || 'ANGRY-1'
      };
      AA.audio.applySettings(s);
      AA.save.saveSettings(s);
    }
    musicEl.addEventListener('input', pushSettings);
    sfxEl.addEventListener('input', pushSettings);
    muteEl.addEventListener('change', pushSettings);
    this.$('btn-reset-scores').addEventListener('click', function () {
      AA.save.saveScores([]);
      self.click();
    });

    // --- go-name restore ---
    this.$('go-name').value = settings.name || 'ANGRY-1';

    this.buildGallery();
    this.refreshTitle();
  };

  UI.prototype.click = function () { AA.audio.init(); AA.audio.click(); };
  UI.prototype.newRun = function (fromWave) {
    this.saved = false;
    this.pendingHigh = null;
    this.show(null);
    this.game.startRun(fromWave);
    this.$('hud').classList.remove('hidden');
  };

  UI.prototype.show = function (name) {
    for (var i = 0; i < this.screens.length; i++) {
      var el = this.$('screen-' + this.screens[i]);
      el.classList.toggle('active', this.screens[i] === name);
    }
    var inPlay = this.game && (this.game.state === 'playing' || this.game.state === 'paused');
    this.$('hud').classList.toggle('hidden', !inPlay);
    if (name === 'title') this.refreshTitle();
  };

  /* ---------------- game events ---------------- */
  UI.prototype.onGameEvent = function (type, a, b) {
    switch (type) {
      case 'banner': this.banner(a, b); break;
      case 'bossbar':
        this.$('boss-bar').classList.toggle('hidden', !a);
        if (a && b) this.$('boss-name').textContent = b;
        break;
      case 'pause': this.show('pause'); break;
      case 'resume': this.show(null); break;
      case 'menu': this.show('title'); this.$('hud').classList.add('hidden'); break;
      case 'gameover': this.showGameOver(); break;
    }
  };

  UI.prototype.banner = function (text, isBoss) {
    var el = this.$('wave-banner');
    el.textContent = text;
    el.classList.toggle('boss', !!isBoss);
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth; // reflow restarts the CSS animation
    el.style.animation = '';
  };

  /* ---------------- per-frame HUD sync ---------------- */
  UI.prototype.syncHud = function () {
    var g = this.game;
    if (!g.player) return;
    this.$('hud-score').textContent = g.score;
    this.$('hud-wave').textContent = g.wave;

    if (g.lives !== this.lastLives) {
      this.lastLives = g.lives;
      var pips = '';
      for (var i = 0; i < Math.max(0, g.lives); i++) pips += '<span class="life-pip"></span>';
      this.$('hud-lives').innerHTML = pips || '<span style="font-size:10px;color:#ff7a5e">LAST LIFE</span>';
    }

    var p = g.player;
    var fill = this.$('hud-shield-fill');
    var frac = p.shield / AA.cfg.shieldMax;
    fill.style.width = (frac * 100).toFixed(1) + '%';
    fill.classList.toggle('low', frac < 0.3);
    fill.classList.toggle('recharging', p.regenDelay > 0 && p.shield < AA.cfg.shieldMax);

    // power-up chips
    var keys = (p.rapidT > 0 ? 'r' : '') + (p.tripleT > 0 ? 't' : '') + (p.dmgT > 0 ? 'd' : '');
    if (keys !== this.powerKeys) {
      this.powerKeys = keys;
      var html = '';
      if (p.rapidT > 0) html += this.chipHtml('rapid', 'R');
      if (p.tripleT > 0) html += this.chipHtml('triple', '3');
      if (p.dmgT > 0) html += this.chipHtml('dmg', 'D');
      this.$('hud-powers').innerHTML = html;
    }
    var chip, map = { r: 'rapid', t: 'triple', d: 'dmg' };
    for (i = 0; i < keys.length; i++) {
      chip = document.querySelector('.pc-' + map[keys[i]] + ' .p-fill');
      if (chip) {
        var tLeft = map[keys[i]] === 'rapid' ? p.rapidT : (map[keys[i]] === 'triple' ? p.tripleT : p.dmgT);
        chip.style.width = (tLeft / AA.cfg.powerDuration * 100).toFixed(1) + '%';
      }
    }

    // boss bar
    if (g.boss) {
      this.$('boss-bar').classList.remove('hidden');
      this.$('boss-bar-fill').style.width = (g.boss.hp / g.boss.maxHp * 100).toFixed(1) + '%';
    }
  };

  UI.prototype.chipHtml = function (kind, label) {
    return '<div class="power-chip pc-' + kind + '"><span class="p-ico">' + label + '</span>' +
      '<span class="p-bar"><span class="p-fill" style="width:100%"></span></span></div>';
  };

  /* ---------------- title / scores / gameover ---------------- */
  UI.prototype.refreshTitle = function () {
    var scores = AA.save.loadScores();
    var best = scores.length ? scores[0].score : 0;
    this.$('title-hi').textContent = 'HI-SCORE ' + best;
    var prog = AA.save.loadProgress();
    var cont = this.$('btn-continue');
    if (prog > 1) {
      cont.hidden = false;
      this.$('continue-wave').textContent = prog;
    } else cont.hidden = true;
    this.$('go-continue-wave').textContent = prog > 1 ? prog : 1;
  };

  UI.prototype.renderScores = function () {
    var scores = AA.save.loadScores();
    var el = this.$('scores-list');
    if (!scores.length) {
      el.innerHTML = '<div class="scores-empty">No pilots on the board yet. Go make history.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < scores.length; i++) {
      var s = scores[i];
      html += '<li class="' + (i === 0 ? 'top1' : '') + '"><span class="rk">' + (i + 1) + '</span>' +
        '<span class="nm">' + escapeHtml(s.name) + '</span>' +
        '<span class="sc">' + s.score + '</span><span class="wv">W' + s.wave + '</span></li>';
    }
    el.innerHTML = html;
  };

  UI.prototype.showGameOver = function () {
    var g = this.game;
    var scores = AA.save.loadScores();
    var best = scores.length ? scores[0].score : 0;
    this.$('go-score').textContent = g.score;
    this.$('go-wave').textContent = g.wave;
    this.$('go-best').textContent = Math.max(best, g.score);
    var isHigh = g.score > 0 && (scores.length < 10 || g.score > scores[scores.length - 1].score);
    this.$('go-newhigh').classList.toggle('hidden', !isHigh);
    this.$('go-name-row').classList.toggle('hidden', !isHigh);
    this.pendingHigh = isHigh ? { score: g.score, wave: g.wave } : null;
    this.saved = false;
    var quotes = [
      '"This isn\'t over, humans..."',
      '"My splat list is still short."',
      '"I need a bigger saucer."',
      '"Tell the lab... I said hi."',
      '"Shields? WHERE WAS MY SHIELD?"'
    ];
    this.$('go-quote').textContent = quotes[Math.floor(Math.random() * quotes.length)];
    this.$('hud').classList.add('hidden');
    this.$('boss-bar').classList.add('hidden');
    this.show('gameover');
  };

  UI.prototype.saveHighScore = function () {
    if (!this.pendingHigh || this.saved) return;
    var name = (this.$('go-name').value || 'ANGRY-1').trim().slice(0, 8) || 'ANGRY-1';
    var entry = { name: name, score: this.pendingHigh.score, wave: this.pendingHigh.wave };
    var list = AA.save.loadScores();
    var newList = AA.insertScore(list, entry);
    if (newList) AA.save.saveScores(newList);
    // remember pilot tag
    var s = AA.save.loadSettings();
    s.name = name;
    AA.save.saveSettings(s);
    this.saved = true;
    this.$('go-name-row').classList.add('hidden');
    this.$('go-newhigh').classList.add('hidden');
    AA.audio.powerup('shield');
  };

  /* ---------------- instructions gallery ---------------- */
  UI.prototype.buildGallery = function () {
    var host = this.$('enemy-gallery');
    if (!host || !this.sprites) return;
    var items = [
      ['fighter', 'FIGHTER'], ['interceptor', 'INTERCEPTOR'], ['heavy', 'HEAVY'],
      ['astronaut', '+25 PTS'], ['boss', 'BOSS CARRIER']
    ];
    var self = this;
    items.forEach(function (it) {
      var spr = self.sprites[it[0]];
      if (!spr) return;
      var fig = document.createElement('figure');
      var cv = document.createElement('canvas');
      var w = Math.min(64, spr.w), h = spr.h * (w / spr.w);
      cv.width = w * 2; cv.height = h * 2;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      var ctx = cv.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(spr.cv, 0, 0, spr.w, spr.h, 0, 0, w, h);
      var cap = document.createElement('figcaption');
      cap.textContent = it[1];
      fig.appendChild(cv); fig.appendChild(cap);
      host.appendChild(fig);
    });
  };

  /* ---------------- test panel ---------------- */
  UI.prototype.showTestPanel = function (text, fail) {
    var el = document.getElementById('test-panel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'test-panel';
      document.getElementById('stage').appendChild(el);
    }
    el.textContent = text;
    el.classList.toggle('fail', !!fail);
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      var m = {}; m[String.fromCharCode(38)] = ('&a' + 'mp;'); m[String.fromCharCode(60)] = ('&l' + 't;'); m[String.fromCharCode(62)] = ('&g' + 't;'); m[String.fromCharCode(34)] = ('&q' + 'uot;'); m[String.fromCharCode(39)] = ('&#3' + '9;'); return m[c];
    });
  }

  AA.UI = UI;
})(typeof self !== 'undefined' ? self : globalThis);
