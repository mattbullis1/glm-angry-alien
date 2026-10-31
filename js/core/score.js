/* ============================================================
   AA.core — scoring & damage rules (pure)
   ============================================================ */
(function (root) {
  'use strict';

  var SCORES = {
    fighter: 50,
    interceptor: 75,
    heavy: 150,
    boss: 1500,        // base; boss bonus added per wave in bossScore()
    astronaut: 25
  };

  function bossScore(wave) { return SCORES.boss + Math.max(0, wave) * 100; }

  /**
   * Apply damage to a shielded actor.
   * Shield absorbs first; when exhausted the NEXT hit costs a life.
   * Returns { shield, lives, lostLife, shieldBroken } — caller mutates its actor.
   */
  function applyDamage(shield, lives, dmg) {
    var out = { shield: shield, lives: lives, lostLife: false, shieldBroken: false };
    if (shield > 0) {
      out.shield = shield - dmg;
      if (out.shield <= 0) { out.shield = 0; out.shieldBroken = true; }
      return out;
    }
    out.lostLife = true;
    out.lives = lives - 1;
    return out;
  }

  /**
   * Once-only award guard: returns points if and only if `hitFlag` was false.
   * Caller is responsible for persisting the flag (prevents duplicate scoring).
   */
  function awardOnce(hitFlag, points) {
    return hitFlag ? 0 : points;
  }

  /** top-10 leaderboard insertion: returns new array (or null if not high enough) */
  function insertScore(list, entry) {
    var arr = (list || []).slice();
    arr.push(entry);
    arr.sort(function (a, b) { return (b.score - a.score) || (b.wave - a.wave); });
    arr = arr.slice(0, 10);
    for (var i = 0; i < arr.length; i++) if (arr[i] === entry) return arr;
    return null;
  }

  var AA = (root.AA = root.AA || {});
  AA.SCORES = SCORES;
  AA.bossScore = bossScore;
  AA.applyDamage = applyDamage;
  AA.awardOnce = awardOnce;
  AA.insertScore = insertScore;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SCORES: SCORES, bossScore: bossScore, applyDamage: applyDamage, awardOnce: awardOnce, insertScore: insertScore };
  }
})(typeof self !== 'undefined' ? self : globalThis);
