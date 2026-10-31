/* ============================================================
   AA.save — localStorage wrapper with corruption handling
   Storage is injectable so automated tests can use a fake.
   ============================================================ */
(function (root) {
  'use strict';
  var AA = (root.AA = root.AA || {});

  var _cachedStore = null;
  function defaultStorage() {
    if (_cachedStore) return _cachedStore;
    try {
      var t = '__aa_test__';
      root.localStorage.setItem(t, '1');
      root.localStorage.removeItem(t);
      _cachedStore = root.localStorage;
    } catch (e) {
      var mem = {};
      _cachedStore = {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; }
      };
    }
    return _cachedStore;
  }

  /**
   * loadJSON(key, fallback, validate, storage)
   * - missing -> fallback
   * - corrupted JSON / failed validation -> fallback (and remove bad data)
   */
  function loadJSON(key, fallback, validate, storage) {
    var store = storage || defaultStorage();
    var raw = null;
    try { raw = store.getItem(key); } catch (e) { return fallback; }
    if (raw == null) return fallback;
    try {
      var data = JSON.parse(raw);
      if (validate && !validate(data)) throw new Error('validation failed');
      return data;
    } catch (e) {
      try { store.removeItem(key); } catch (e2) { /* ignore */ }
      return fallback;
    }
  }

  function saveJSON(key, value, storage) {
    var store = storage || defaultStorage();
    try { store.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  /* ---------- high scores ---------- */
  function validScores(v) {
    return !!v && typeof v === 'object' && Array.isArray(v.list) && v.list.length <= 10 &&
      v.list.every(function (e) {
        return e && typeof e === 'object' &&
          typeof e.name === 'string' && e.name.length <= 12 &&
          typeof e.score === 'number' && isFinite(e.score) && e.score >= 0 &&
          typeof e.wave === 'number' && isFinite(e.wave) && e.wave >= 1;
      });
  }

  function loadScores(storage) {
    return loadJSON(AA.cfg.saveKeys.scores, { list: [] }, validScores, storage).list;
  }
  function saveScores(list, storage) { return saveJSON(AA.cfg.saveKeys.scores, { list: list.slice(0, 10) }, storage); }

  /* ---------- settings ---------- */
  function validSettings(v) {
    return !!v && typeof v === 'object' &&
      typeof v.music === 'number' && v.music >= 0 && v.music <= 1 &&
      typeof v.sfx === 'number' && v.sfx >= 0 && v.sfx <= 1 &&
      typeof v.muted === 'boolean';
  }
  var DEFAULT_SETTINGS = { music: 0.6, sfx: 0.8, muted: false };

  function loadSettings(storage) {
    var s = loadJSON(AA.cfg.saveKeys.settings, DEFAULT_SETTINGS, validSettings, storage);
    // sanitize individual fields (partial corruption tolerance)
    var out = {
      music: (typeof s.music === 'number' && s.music >= 0 && s.music <= 1) ? s.music : DEFAULT_SETTINGS.music,
      sfx: (typeof s.sfx === 'number' && s.sfx >= 0 && s.sfx <= 1) ? s.sfx : DEFAULT_SETTINGS.sfx,
      muted: (typeof s.muted === 'boolean') ? s.muted : DEFAULT_SETTINGS.muted
    };
    if (typeof s.name === 'string' && s.name.length <= 12) out.name = s.name;
    return out;
  }
  function saveSettings(settings, storage) { return saveJSON(AA.cfg.saveKeys.settings, settings, storage); }

  /* ---------- progress (continue from last wave) ---------- */
  function validProgress(v) {
    return !!v && typeof v === 'object' &&
      typeof v.wave === 'number' && isFinite(v.wave) && v.wave >= 1 && v.wave <= 9999;
  }
  function loadProgress(storage) {
    return loadJSON(AA.cfg.saveKeys.progress, { wave: 1 }, validProgress, storage).wave;
  }
  function saveProgress(wave, storage) { return saveJSON(AA.cfg.saveKeys.progress, { wave: Math.max(1, Math.floor(wave)) }, storage); }
  function clearProgress(storage) {
    var store = storage || defaultStorage();
    try { store.removeItem(AA.cfg.saveKeys.progress); } catch (e) { /* ignore */ }
  }

  AA.save = {
    loadJSON: loadJSON,
    saveJSON: saveJSON,
    loadScores: loadScores,
    saveScores: saveScores,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    clearProgress: clearProgress,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AA.save;
})(typeof self !== 'undefined' ? self : globalThis);
