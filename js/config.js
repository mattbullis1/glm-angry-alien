/* ============================================================
   AA.cfg — balance & tuning constants
   ============================================================ */
(function (root) {
  'use strict';
  var AA = (root.AA = root.AA || {});

  AA.cfg = {
    W: 480, H: 800,
    FIXED_DT: 1 / 60,
    MAX_STEPS_PER_FRAME: 4,

    /* player */
    playerRadius: 26,
    playerSpeed: 330,          // keyboard px/s
    followRate: 14,            // pointer follow stiffness
    fireInterval: 0.16,
    fireIntervalRapid: 0.082,
    bulletDamage: 2,
    bulletDamageBoosted: 3,
    bulletSpeed: 640,
    maxLives: 3,
    startLives: 3,

    /* shield */
    shieldMax: 100,
    shieldStart: 100,
    shieldRespawn: 60,         // shield value after losing a life
    shieldRegenDelay: 3.0,     // seconds after last hit
    shieldRegenRate: 6,        // per second
    invulnTime: 2.0,           // seconds after respawn
    pickupShieldAmount: 40,

    /* power-ups (20s durations) */
    powerDuration: 20,
    dropChance: 0.13,
    dropWeights: { rapid: 30, triple: 30, dmg: 22, shield: 18 },

    /* astronaut */
    astroChance: 0.4,
    astroPoints: 25,

    /* enemies (base values; wave scaling applied in-game) */
    enemyDefs: {
      fighter:     { hp: 4,  radius: 17, score: 50,  fireCd: [1.6, 2.8], bulletSpeed: 240, bulletDmg: 12, color: '#7fb1ff' },
      interceptor: { hp: 6,  radius: 18, score: 75,  fireCd: [1.3, 2.3], bulletSpeed: 300, bulletDmg: 15, color: '#ffb14e' },
      heavy:       { hp: 16, radius: 27, score: 150, fireCd: [2.0, 3.2], bulletSpeed: 210, bulletDmg: 22, color: '#8ef06a' }
    },

    /* boss */
    bossBaseHp: 220,
    bossHpPerWave: 30,
    bossRadiusX: 150,
    bossRadiusY: 60,

    /* collision-score safety */
    maxParticles: 420,
    maxBullets: 160,

    /* persistence keys */
    saveKeys: { scores: 'aa_glm_scores_v1', settings: 'aa_glm_settings_v1', progress: 'aa_glm_progress_v1' }
  };
})(typeof self !== 'undefined' ? self : globalThis);
