/* ============================================================
   AA.core — collision math (pure)
   ============================================================ */
(function (root) {
  'use strict';

  /** circle vs circle */
  function circleHit(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2, dy = y1 - y2, rr = r1 + r2;
    return dx * dx + dy * dy <= rr * rr;
  }

  /** circle vs axis-aligned rect */
  function circleRectHit(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  }

  /** clamp value into [min, max] */
  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }

  /** linear interpolation */
  function lerp(a, b, t) { return a + (b - a) * t; }

  /** frame-rate independent exponential approach */
  function approach(current, target, rate, dt) {
    return current + (target - current) * (1 - Math.exp(-rate * dt));
  }

  const AA = (root.AA = root.AA || {});
  AA.circleHit = circleHit;
  AA.circleRectHit = circleRectHit;
  AA.clamp = clamp;
  AA.lerp = lerp;
  AA.approach = approach;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { circleHit: circleHit, circleRectHit: circleRectHit, clamp: clamp, lerp: lerp, approach: approach };
  }
})(typeof self !== 'undefined' ? self : globalThis);
