/* ============================================================
   AA.audio — procedural WebAudio engine
   - All music & SFX synthesized at runtime (fully offline, zero assets)
   - Separate music / sfx gain buses + mute
   - Created/resumed on first user gesture (autoplay-safe)
   ============================================================ */
(function (root) {
  'use strict';
  var AA = (root.AA = root.AA || {});

  function AudioEngine() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.noiseBuf = null;
    this.musicTimer = null;
    this.musicMode = null;
    this.musicStep = 0;
    this.musicNextTime = 0;
    this.enabled = false;
    this.settings = { music: 0.6, sfx: 0.8, muted: false };
    this._lastLaser = 0;
  }

  AudioEngine.prototype.init = function () {
    if (this.enabled) { this.resume(); return; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return; // extremely old browser: game still runs, silently no audio
    try { this.ctx = new AC(); } catch (e) { return; }
    var c = this.ctx;
    this.master = c.createGain();
    this.sfxBus = c.createGain();
    this.musicBus = c.createGain();
    this.comp = c.createDynamicsCompressor();
    this.sfxBus.connect(this.comp);
    this.musicBus.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(c.destination);

    // reusable 1s white-noise buffer
    var len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    var d = this.noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.enabled = true;
    this.applySettings(this.settings);
    this.resume();
  };

  AudioEngine.prototype.resume = function () {
    if (this.ctx && this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) {} }
  };

  AudioEngine.prototype.applySettings = function (s) {
    if (s) this.settings = s;
    if (!this.enabled) return;
    var t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : 1, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.settings.music * 0.5, t, 0.02);
  };

  /* ---------------- low-level synth helpers ---------------- */
  AudioEngine.prototype._osc = function (type, f0, f1, t, dur, vol, bus, curve) {
    var c = this.ctx;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    if (f1 != null && f1 !== f0) {
      if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      else o.frequency.linearRampToValueAtTime(Math.max(1, f1), t + dur);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  };

  AudioEngine.prototype._noise = function (t, dur, vol, filterType, f0, f1, q, bus) {
    var c = this.ctx;
    var src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    var flt = c.createBiquadFilter();
    flt.type = filterType || 'lowpass';
    flt.Q.value = q || 0.8;
    flt.frequency.setValueAtTime(f0, t);
    if (f1 != null) flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    var g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(flt); flt.connect(g); g.connect(bus || this.sfxBus);
    src.start(t); src.stop(t + dur + 0.05);
    return src;
  };

  /* ---------------- SFX ---------------- */
  AudioEngine.prototype.now = function () { return this.enabled ? this.ctx.currentTime : 0; };

  AudioEngine.prototype.laser = function (kind) {
    if (!this.enabled || this.settings.muted) return;
    var t = this.now();
    if (t - this._lastLaser < 0.045) return; // avoid machine-gun spam clipping
    this._lastLaser = t;
    if (kind === 'dmg') {
      this._osc('sawtooth', 620, 160, t, 0.12, 0.16, null, 'exp');
      this._osc('sine', 220, 70, t, 0.12, 0.14, null, 'exp');
    } else if (kind === 'triple') {
      this._osc('square', 880, 260, t, 0.09, 0.09, null, 'exp');
      this._osc('square', 990, 300, t, 0.09, 0.07, null, 'exp');
    } else {
      this._osc('square', 940, 300, t, 0.08, 0.1, null, 'exp');
      this._noise(t, 0.05, 0.04, 'highpass', 3000, 5000);
    }
  };

  AudioEngine.prototype.enemyLaser = function () {
    if (!this.enabled || this.settings.muted) return;
    var t = this.now();
    this._osc('square', 320, 140, t, 0.14, 0.055, null, 'exp');
  };

  AudioEngine.prototype.explosion = function (size) {
    if (!this.enabled || this.settings.muted) return;
    size = size == null ? 0.5 : Math.max(0, Math.min(1.4, size));
    var t = this.now();
    this._noise(t, 0.28 + size * 0.5, 0.22 + size * 0.3, 'lowpass', 2600, 120, 0.6);
    this._osc('sine', 130 + 40 * size, 38, t, 0.3 + size * 0.35, 0.3 + size * 0.25, null, 'exp');
    if (size > 0.7) this._noise(t + 0.05, 0.5, 0.14, 'bandpass', 500, 80, 1.2);
  };

  AudioEngine.prototype.splat = function () {
    if (!this.enabled || this.settings.muted) return;
    var t = this.now();
    this._noise(t, 0.09, 0.28, 'bandpass', 900, 250, 1.6);
    this._osc('sine', 420, 70, t, 0.13, 0.22, null, 'exp');
    this._osc('triangle', 240, 90, t + 0.03, 0.1, 0.12, null, 'exp');
  };

  AudioEngine.prototype.shieldHit = function () {
    if (!this.enabled || this.settings.muted) return;
    var t = this.now();
    this._osc('triangle', 1300, 900, t, 0.1, 0.14);
    this._noise(t, 0.08, 0.1, 'highpass', 4000, 6000);
  };

  AudioEngine.prototype.shieldDown = function () {
    if (!this.enabled || this.settings.muted) return;
    var t = this.now();
    this._osc('sawtooth', 700, 120, t, 0.4, 0.14, null, 'exp');
    this._osc('square', 350, 60, t, 0.4, 0.1, null, 'exp');
  };

  AudioEngine.prototype.powerup = function (kind) {
    if (!this.enabled || this.settings.muted) return;
    var t = this.now();
    var base = kind === 'shield' ? [520, 660, 880] : [440, 554, 660, 880];
    for (var i = 0; i < base.length; i++) {
      this._osc('square', base[i], base[i], t + i * 0.07, 0.1, 0.12);
    }
    if (kind !== 'shield') this._osc('sawtooth', 220, 440, t, 0.3, 0.06);
  };

  AudioEngine.prototype.bossAlarm = function () {
    if (!this.enabled || this.settings.muted) return;
    var t = this.now();
    for (var i = 0; i < 3; i++) {
      this._osc('sawtooth', 196, 196, t + i * 0.42, 0.18, 0.16);
      this._osc('sawtooth', 155.6, 155.6, t + i * 0.42 + 0.2, 0.18, 0.16);
    }
    this._noise(t, 1.3, 0.05, 'lowpass', 400, 100);
  };

  AudioEngine.prototype.bossHit = function () {
    if (!this.enabled || this.settings.muted) return;
    var t = this.now();
    this._osc('sine', 150, 60, t, 0.1, 0.16, null, 'exp');
  };

  AudioEngine.prototype.lifeLost = function () {
    if (!this.enabled || this.settings.muted) return;
    var t = this.now();
    this._osc('sawtooth', 300, 60, t, 0.5, 0.2, null, 'exp');
    this._noise(t, 0.35, 0.2, 'lowpass', 1500, 100);
    this.alienVoice('hit');
  };

  AudioEngine.prototype.waveStart = function () {
    if (!this.enabled || this.settings.muted) return;
    var t = this.now();
    this._osc('square', 523, 523, t, 0.1, 0.1);
    this._osc('square', 659, 659, t + 0.1, 0.1, 0.1);
    this._osc('square', 784, 784, t + 0.2, 0.16, 0.12);
  };

  AudioEngine.prototype.gameOver = function () {
    if (!this.enabled || this.settings.muted) return;
    var t = this.now();
    var notes = [392, 330, 262, 196];
    for (var i = 0; i < notes.length; i++) {
      this._osc('sawtooth', notes[i], notes[i] * 0.97, t + i * 0.22, 0.24, 0.12);
    }
    this.alienVoice('dead');
  };

  /* humorous alien gibberish: pitch-wobbled saw through a formant-ish filter */
  AudioEngine.prototype.alienVoice = function (kind) {
    if (!this.enabled || this.settings.muted) return;
    var c = this.ctx, t = this.now();
    var cfg = {
      hit:   { f0: 260, f1: 140, dur: 0.3, wob: 60, wobN: 22 },
      power: { f0: 330, f1: 520, dur: 0.28, wob: 90, wobN: 30 },
      boss:  { f0: 200, f1: 420, dur: 0.5, wob: 70, wobN: 24 },
      dead:  { f0: 300, f1: 80, dur: 0.7, wob: 50, wobN: 18 },
      wave:  { f0: 240, f1: 360, dur: 0.35, wob: 80, wobN: 26 }
    }[kind || 'hit'] || { f0: 240, f1: 160, dur: 0.3, wob: 60, wobN: 22 };

    var o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(cfg.f0, t);
    o.frequency.linearRampToValueAtTime(cfg.f1, t + cfg.dur);
    lfo.type = 'sine';
    lfo.frequency.value = cfg.wobN;
    lg.gain.value = cfg.wob;
    lfo.connect(lg); lg.connect(o.frequency);
    var flt = c.createBiquadFilter();
    flt.type = 'bandpass'; flt.Q.value = 2.2;
    flt.frequency.setValueAtTime(cfg.f0 * 3, t);
    flt.frequency.linearRampToValueAtTime(cfg.f1 * 3, t + cfg.dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + cfg.dur);
    o.connect(flt); flt.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + cfg.dur + 0.05);
    lfo.start(t); lfo.stop(t + cfg.dur + 0.05);
  };

  AudioEngine.prototype.click = function () {
    if (!this.enabled || this.settings.muted) return;
    var t = this.now();
    this._osc('square', 700, 500, t, 0.05, 0.06, null, 'exp');
  };

  /* ---------------- Music sequencer ---------------- */
  /* 16th-note grid, 64-step loop (4 bars). Compact chiptune. */
  var NOTE = { C: 0, Cs: 1, D: 2, Ds: 3, E: 4, F: 5, Fs: 6, G: 7, Gs: 8, A: 9, As: 10, B: 11 };
  function freq(name, octave) {
    var semis = NOTE[name] + (octave + 1) * 12;
    return 440 * Math.pow(2, (semis - 69) / 12);
  }

  AudioEngine.prototype.musicPatterns = function (mode) {
    if (mode === 'boss') {
      return {
        bpm: 148,
        bass: ['E2', null, 'E2', 'E2', null, 'E2', null, 'F2', 'E2', null, 'E2', null, 'G2', null, 'F2', 'E2',
               'E2', null, 'E2', 'E2', null, 'E2', null, 'F2', 'Gs2', null, 'E2', null, 'D2', null, 'Cs2', 'B1'],
        lead: ['E4', 'B4', 'E5', 'Ds5', 'E5', 'B4', 'Gs4', 'B4', 'E5', 'Ds5', 'E5', 'Fs5', 'G5', 'Fs5', 'E5', 'Ds5',
               'E4', 'B4', 'E5', 'Ds5', 'E5', 'B4', 'Gs4', 'B4', 'C5', 'B4', 'As4', 'B4', 'C5', 'Ds5', 'E5', 'F5'],
        kick: [0, 8, 16, 24, 32, 40, 48, 56],
        snare:[8, 24, 40, 56],
        hat:  [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 62]
      };
    }
    return {
      bpm: 128,
      bass: ['A1', null, 'A1', null, 'C2', null, 'A1', null, 'G1', null, 'G1', null, 'As1', null, 'G1', null,
             'F1', null, 'F1', null, 'A1', null, 'F1', null, 'G1', null, 'G1', null, 'B1', 'Cs2', 'D2', 'Ds2'],
      lead: ['A3', 'C4', 'E4', 'A4', null, 'G4', 'E4', 'C4', 'B3', 'D4', 'G4', 'B4', null, 'A4', 'G4', 'D4',
             'A3', 'C4', 'F4', 'A4', null, 'E4', 'C4', 'A3', 'B3', 'D4', 'G4', 'B4', 'D5', 'C5', 'B4', 'G4'],
      kick: [0, 8, 16, 24, 32, 40, 48, 56],
      snare:[8, 24, 40, 56],
      hat:  [4, 12, 20, 28, 36, 44, 52, 60]
    };
  };

  AudioEngine.prototype.startMusic = function (mode) {
    if (!this.enabled) return;
    if (this.musicMode === mode && this.musicTimer) return;
    this.stopMusic();
    this.musicMode = mode;
    this.musicStep = 0;
    this.musicNextTime = this.ctx.currentTime + 0.08;
    var self = this;
    this.musicTimer = setInterval(function () { self._schedule(); }, 25);
  };

  AudioEngine.prototype.stopMusic = function () {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    this.musicMode = null;
  };

  AudioEngine.prototype._schedule = function () {
    if (!this.enabled || !this.musicMode) return;
    var pat = this.musicPatterns(this.musicMode);
    var stepDur = 60 / pat.bpm / 4;
    while (this.musicNextTime < this.ctx.currentTime + 0.14) {
      var s = this.musicStep % 64;
      var t = this.musicNextTime;
      var b = pat.bass[s], l = pat.lead[s];
      if (b) this._osc('square', freq.apply(null, parseNote(b)), null, t, stepDur * 1.7, 0.16, this.musicBus);
      if (l) this._osc('sawtooth', freq.apply(null, parseNote(l)), null, t, stepDur * 0.9, 0.055, this.musicBus);
      if (pat.kick.indexOf(s) >= 0) {
        this._osc('sine', 150, 40, t, 0.12, 0.3, this.musicBus, 'exp');
      }
      if (pat.snare.indexOf(s) >= 0) this._noise(t, 0.09, 0.12, 'bandpass', 1800, 900, 1, this.musicBus);
      if (pat.hat.indexOf(s) >= 0) this._noise(t, 0.03, 0.05, 'highpass', 7000, 9000, 1, this.musicBus);
      this.musicNextTime += stepDur;
      this.musicStep++;
    }
  };

  function parseNote(token) {
    var m = /^([A-G]s?)(-?\d)$/.exec(token);
    return m ? [m[1], parseInt(m[2], 10)] : ['A', 3];
  }

  AA.AudioEngine = AudioEngine;
  AA.audio = new AudioEngine();

  if (typeof module !== 'undefined' && module.exports) module.exports = { AudioEngine: AudioEngine };
})(typeof self !== 'undefined' ? self : globalThis);
