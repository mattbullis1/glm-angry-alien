/* ============================================================
   GLM's Angry Alien — Node test runner
   Installs a minimal DOM/canvas shim so the REAL sprite-drawing
   and render paths can be smoke-tested outside a browser, then
   runs the shared suite (tests/suite.js).

   Run:  node tests/node-tests.js
   ============================================================ */
'use strict';
var path = require('path');

/* ---------------- blackhole proxy: accepts any property set,
   returns itself from any call — perfect fake 2D context ------- */
function blackhole() {
  var target = function () { return p; };
  var p = new Proxy(target, {
    get: function (t, prop) {
      if (prop === Symbol.toPrimitive) return function () { return 0; };
      if (prop === 'canvas') return { width: 480, height: 800 };
      return p;
    },
    set: function () { return true; },
    apply: function () { return p; }
  });
  return p;
}
global.__makeFakeCtx = blackhole;

/* ---------------- minimal document shim (canvas factory) ------ */
global.document = {
  createElement: function (tag) {
    if (tag === 'canvas') {
      return {
        width: 0, height: 0, style: {},
        getContext: function () { return blackhole(); }
      };
    }
    return { style: {}, appendChild: function () {}, addEventListener: function () {} };
  }
};

/* ---------------- load the real game modules ------------------ */
require(path.join(__dirname, '..', 'js', 'core', 'rng.js'));
require(path.join(__dirname, '..', 'js', 'core', 'collide.js'));
require(path.join(__dirname, '..', 'js', 'core', 'waves.js'));
require(path.join(__dirname, '..', 'js', 'core', 'score.js'));
require(path.join(__dirname, '..', 'js', 'config.js'));
require(path.join(__dirname, '..', 'js', 'save.js'));
require(path.join(__dirname, '..', 'js', 'audio.js'));
require(path.join(__dirname, '..', 'js', 'background.js'));
require(path.join(__dirname, '..', 'js', 'entities.js'));
require(path.join(__dirname, '..', 'js', 'game.js'));
require(path.join(__dirname, '..', 'js', 'sprites.js'));

var suite = require(path.join(__dirname, 'suite.js'));
var result = suite.runSuite(global.AA, function (line) { console.log(line); });

console.log('\n============================================');
console.log('RESULTS: ' + result.passed + ' passed, ' + result.failed + ' failed, ' + result.total + ' total');
if (result.failed) {
  console.log('FAILED TESTS:');
  result.failures.forEach(function (f) { console.log('  - ' + f); });
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
  process.exit(0);
}
