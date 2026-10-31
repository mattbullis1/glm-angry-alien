/* ============================================================
   AA.core — wave generation & spawn timelines (pure, seeded)
   ============================================================ */
(function (root) {
  'use strict';

  var W = 480;

  var FORMATION_POOL = ['line', 'rain', 'vee', 'columns', 'snake', 'flank'];

  function pickFormations(n, rng) {
    // unlock progressively so wave 1 stays readable
    var pool = ['line', 'rain'];
    if (n >= 2) pool.push('vee', 'columns');
    if (n >= 3) pool.push('snake');
    if (n >= 4) pool.push('flank');
    var groups = Math.min(2 + Math.floor(n / 2), 6);
    var out = [];
    for (var i = 0; i < groups; i++) out.push(rng.pick(pool));
    return out;
  }

  function pickEnemyKind(n, rng) {
    var weights = [
      { kind: 'fighter', w: 10 },
      { kind: 'interceptor', w: n >= 2 ? 7 : 0 },
      { kind: 'heavy', w: n >= 3 ? 4 : 0 }
    ];
    var total = 0, i;
    for (i = 0; i < weights.length; i++) total += weights[i].w;
    var r = rng.float() * total;
    for (i = 0; i < weights.length; i++) { r -= weights[i].w; if (r <= 0) return weights[i].kind; }
    return 'fighter';
  }

  /**
   * generateWave(n, rng) -> wave spec
   * Deterministic given (n, rng state).
   */
  function generateWave(n, rng) {
    var isBoss = (n % 5 === 0);
    var spec = {
      wave: n,
      isBoss: isBoss,
      hpScale: Math.min(1 + (n - 1) * 0.14, 3.2),
      speedScale: Math.min(1 + (n - 1) * 0.055, 1.9),
      fireScale: Math.min(1 + (n - 1) * 0.07, 2.3),
      events: []
    };

    if (isBoss) {
      spec.events.push({ t: 0.6, kind: 'boss', x: W / 2, move: 'boss' });
      // light escort stream during the whole fight
      var escorts = 4 + Math.floor(n / 5);
      for (var i = 0; i < escorts; i++) {
        spec.events.push({
          t: 4 + i * 5.5,
          kind: 'fighter',
          x: rng.range(50, W - 50),
          move: rng.chance(0.5) ? 'sine' : 'diagonal',
          a: rng.range(-90, 90),
          b: 90 * spec.speedScale
        });
      }
      return spec;
    }

    var formTypes = pickFormations(n, rng);
    var t = 0;
    for (var f = 0; f < formTypes.length; f++) {
      var type = formTypes[f];
      var count, kind, perDelay, j;
      switch (type) {
        case 'line':
          kind = pickEnemyKind(n, rng);
          count = 5 + Math.min(3, Math.floor(n / 3));
          perDelay = 0.22;
          for (j = 0; j < count; j++) {
            spec.events.push({
              t: t + j * perDelay,
              kind: kind,
              x: W * (0.16 + 0.68 * (j / (count - 1 || 1))) + rng.range(-14, 14),
              move: 'straight',
              b: rng.range(85, 105)
            });
          }
          t += count * perDelay + rng.range(1.2, 2.0);
          break;

        case 'vee':
          kind = pickEnemyKind(n, rng);
          count = 5 + Math.min(3, Math.floor(n / 4));
          perDelay = 0.3;
          for (j = 0; j < count; j++) {
            var arm = (j % 2 === 0) ? 1 : -1;
            var step = Math.ceil(j / 2);
            spec.events.push({
              t: t + j * perDelay,
              kind: kind,
              x: W / 2 + arm * step * 52 + rng.range(-8, 8),
              move: 'straight',
              b: rng.range(80, 100)
            });
          }
          t += count * perDelay + rng.range(1.2, 2.0);
          break;

        case 'columns':
          count = 4 + Math.min(4, Math.floor(n / 3));
          perDelay = 0.5;
          for (j = 0; j < count; j++) {
            var colX = rng.chance(0.5) ? W * 0.3 : W * 0.7;
            spec.events.push({
              t: t + j * perDelay,
              kind: pickEnemyKind(n, rng),
              x: colX + rng.range(-18, 18),
              move: 'straight',
              b: rng.range(70, 90)
            });
          }
          t += count * perDelay + rng.range(1.0, 1.6);
          break;

        case 'snake':
          count = 5 + Math.min(4, Math.floor(n / 2));
          perDelay = 0.42;
          var fromLeft = rng.chance(0.5);
          for (j = 0; j < count; j++) {
            spec.events.push({
              t: t + j * perDelay,
              kind: rng.chance(0.65) ? 'interceptor' : 'fighter',
              x: fromLeft ? -34 : W + 34,
              move: 'sine',
              a: fromLeft ? 1 : -1,           // direction
              b: rng.range(115, 145)          // horizontal speed
            });
          }
          t += count * perDelay + rng.range(1.1, 1.8);
          break;

        case 'flank':
          count = 4 + Math.min(2, Math.floor(n / 4));
          perDelay = 0.3;
          var side = rng.chance(0.5) ? 1 : -1;
          for (j = 0; j < count; j++) {
            spec.events.push({
              t: t + j * perDelay,
              kind: pickEnemyKind(n, rng),
              x: side > 0 ? -30 : W + 30,
              move: 'diagonal',
              a: side,                        // vx direction
              b: rng.range(85, 115)           // speed magnitude
            });
          }
          t += count * perDelay + rng.range(1.1, 1.8);
          break;

        case 'rain':
        default:
          count = 6 + Math.min(6, n);
          for (j = 0; j < count; j++) {
            spec.events.push({
              t: t + j * rng.range(0.28, 0.5),
              kind: pickEnemyKind(n, rng),
              x: rng.range(36, W - 36),
              move: 'dive',
              b: rng.range(150, 210)
            });
          }
          t += count * 0.4 + rng.range(1.0, 1.6);
          break;
      }
    }
    spec.events.sort(function (a, b) { return a.t - b.t; });
    return spec;
  }

  /**
   * buildSpawnTimeline(n, rng) -> array of events (already generated),
   * provided as separate helper so tests can validate monotonic times,
   * on-screen bounds, and boss cadence without touching the renderer.
   */
  function buildSpawnTimeline(n, rng) {
    var spec = generateWave(n, rng);
    var t = 0;
    for (var i = 0; i < spec.events.length; i++) {
      spec.events[i].seq = i;
      t = Math.max(t, spec.events[i].t);
    }
    spec.duration = t;
    return spec;
  }

  var AA = (root.AA = root.AA || {});
  AA.generateWave = generateWave;
  AA.buildSpawnTimeline = buildSpawnTimeline;
  AA.FORMATION_POOL = FORMATION_POOL;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateWave: generateWave, buildSpawnTimeline: buildSpawnTimeline, FORMATION_POOL: FORMATION_POOL };
  }
})(typeof self !== 'undefined' ? self : globalThis);
