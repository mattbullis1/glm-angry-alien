/* ============================================================
   AA.core — seeded RNG (deterministic testing support)
   Pure logic, no DOM. Node-compatible (module.exports).
   ============================================================ */
(function (root) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function Random(seed) {
    this.reseed(seed == null ? ((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0) : seed);
  }
  Random.prototype.reseed = function (seed) {
    this.seed = seed >>> 0;
    this.calls = 0;
    this.next = mulberry32(this.seed);
  };
  Random.prototype.float = function () { this.calls++; return this.next(); };
  /** uniform in [min, max) */
  Random.prototype.range = function (min, max) { return min + (max - min) * this.float(); };
  /** integer in [min, max] inclusive */
  Random.prototype.int = function (min, max) { return Math.floor(this.range(min, max + 1)); };
  Random.prototype.pick = function (arr) { return arr[Math.floor(this.float() * arr.length)]; };
  Random.prototype.chance = function (p) { return this.float() < p; };
  Random.prototype.sign = function () { return this.float() < 0.5 ? -1 : 1; };

  const AA = (root.AA = root.AA || {});
  AA.Random = Random;
  AA.mulberry32 = mulberry32;

  if (typeof module !== 'undefined' && module.exports) module.exports = { Random: Random, mulberry32: mulberry32 };
})(typeof self !== 'undefined' ? self : globalThis);
