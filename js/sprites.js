/* ============================================================
   AA.sprites — original procedural artwork
   Every sprite is drawn once at boot into an offscreen canvas
   (2x internal resolution for crisp scaling). 100% original,
   zero external assets.
   ============================================================ */
(function (root) {
  'use strict';
  var AA = (root.AA = root.AA || {});
  var SS = 2; // supersampling factor

  function makeCanvas(w, h) {
    var cv = document.createElement('canvas');
    cv.width = Math.ceil(w * SS); cv.height = Math.ceil(h * SS);
    var ctx = cv.getContext('2d');
    ctx.scale(SS, SS);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    return { cv: cv, ctx: ctx, w: w, h: h };
  }

  function lgrad(ctx, x0, y0, x1, y1, stops) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function rgrad(ctx, x, y, r0, r1, stops) {
    var g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function poly(ctx, pts, close) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close !== false) ctx.closePath();
  }
  function glowDot(ctx, x, y, r, color) {
    ctx.fillStyle = rgrad(ctx, x, y, 0, r, [[0, color], [0.55, color], [1, 'rgba(0,0,0,0)']]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  /* ================= PLAYER SAUCER ================= */
  function drawPlayer(s) {
    var ctx = s.ctx, w = s.w, h = s.h;
    var cx = w / 2, hullY = h * 0.68, domeY = h * 0.38;

    // saucer hull — wide metallic lens
    ctx.save();
    ctx.fillStyle = lgrad(ctx, 0, hullY - 16, 0, hullY + 16, [[0, '#cdd6ff'], [0.3, '#8f9bd8'], [0.55, '#6a76c0'], [0.8, '#4a549c'], [1, '#2c3272']]);
    ctx.beginPath();
    ctx.ellipse(cx, hullY, w * 0.46, h * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8eeff'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(cx, hullY, w * 0.46, h * 0.20, 0, 0, Math.PI * 2); ctx.stroke();

    // underside ring + emitter
    ctx.fillStyle = '#262b5e';
    ctx.beginPath(); ctx.ellipse(cx, hullY + 7, w * 0.30, h * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgrad(ctx, cx, hullY + 12, 1, 12, [[0, 'rgba(140,255,190,.95)'], [1, 'rgba(140,255,190,0)']]);
    ctx.beginPath(); ctx.ellipse(cx, hullY + 12, 16, 9, 0, 0, Math.PI * 2); ctx.fill();

    // hull lights
    for (var i = 0; i < 5; i++) {
      var lx = cx + (i - 2) * 15;
      glowDot(ctx, lx, hullY - 3, 3.4, i % 2 ? 'rgba(94,255,182,.9)' : 'rgba(120,190,255,.9)');
    }

    // side cannons
    ctx.fillStyle = '#3a4180';
    poly(ctx, [[cx - 40, hullY - 2], [cx - 26, hullY - 2], [cx - 26, hullY + 6], [cx - 40, hullY + 6]]); ctx.fill();
    poly(ctx, [[cx + 40, hullY - 2], [cx + 26, hullY - 2], [cx + 26, hullY + 6], [cx + 40, hullY + 6]]); ctx.fill();
    ctx.fillStyle = '#8fe0ff';
    ctx.fillRect(cx - 40, hullY + 3, 6, 3); ctx.fillRect(cx + 34, hullY + 3, 6, 3);

    // glass dome
    ctx.fillStyle = rgrad(ctx, cx - 5, domeY - 6, 2, 26, [[0, 'rgba(200,245,255,.95)'], [0.5, 'rgba(120,190,235,.55)'], [1, 'rgba(60,110,190,.75)']]);
    ctx.beginPath(); ctx.ellipse(cx, domeY, 22, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(220,245,255,.8)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(cx, domeY, 22, 20, 0, 0, Math.PI * 2); ctx.stroke();

    // ===== ANGRY ALIEN inside dome =====
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, domeY, 19, 17, 0, 0, Math.PI * 2); ctx.clip();
    // head
    ctx.fillStyle = lgrad(ctx, 0, domeY - 12, 0, domeY + 12, [[0, '#d3ff7a'], [0.55, '#8fdd3c'], [1, '#4f9e1c']]);
    ctx.beginPath(); ctx.ellipse(cx, domeY + 1, 15, 13, 0, 0, Math.PI * 2); ctx.fill();
    // angry brows
    ctx.strokeStyle = '#2c5c0c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 11, domeY - 4); ctx.lineTo(cx - 3, domeY + 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 11, domeY - 4); ctx.lineTo(cx + 3, domeY + 0.5); ctx.stroke();
    // furious eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx - 6, domeY + 2, 4.6, 4.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 6, domeY + 2, 4.6, 4.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c81414';
    ctx.beginPath(); ctx.arc(cx - 6, domeY + 2.8, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 6, domeY + 2.8, 2.2, 0, Math.PI * 2); ctx.fill();
    // gritted teeth frown
    ctx.strokeStyle = '#1e4409'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(cx, domeY + 13, 6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.fillStyle = '#fff';
    poly(ctx, [[cx - 4, domeY + 8], [cx - 2, domeY + 8], [cx - 3, domeY + 10.6]]); ctx.fill();
    poly(ctx, [[cx + 0.5, domeY + 8], [cx + 2.5, domeY + 8], [cx + 1.5, domeY + 10.6]]); ctx.fill();
    // antenna
    ctx.strokeStyle = '#4f9e1c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, domeY - 11); ctx.quadraticCurveTo(cx + 2, domeY - 17, cx + 5, domeY - 18); ctx.stroke();
    glowDot(ctx, cx + 5.5, domeY - 18.5, 2.6, 'rgba(255,120,80,.95)');
    ctx.restore();

    // dome shine
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.ellipse(cx - 8, domeY - 8, 6, 3.4, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ================= HUMAN FIGHTER ================= */
  function drawFighter(s) {
    var ctx = s.ctx, cx = s.w / 2;
    // wings
    ctx.fillStyle = lgrad(ctx, 0, 0, 0, s.h, [[0, '#8ea3c8'], [1, '#4a5b80']]);
    poly(ctx, [[cx, 6], [cx + 20, 26], [cx + 16, 34], [cx, 24], [cx - 16, 34], [cx - 20, 26]]); ctx.fill();
    // wing stripes
    ctx.fillStyle = '#c8d4ec';
    poly(ctx, [[cx + 15, 24], [cx + 20, 26], [cx + 16, 33], [cx + 11, 30]]); ctx.fill();
    poly(ctx, [[cx - 15, 24], [cx - 20, 26], [cx - 16, 33], [cx - 11, 30]]); ctx.fill();
    // fuselage
    ctx.fillStyle = lgrad(ctx, cx - 8, 0, cx + 8, 0, [[0, '#5d729a'], [0.5, '#93a9d1'], [1, '#42536f']]);
    poly(ctx, [[cx - 6, 2], [cx + 6, 2], [cx + 8, 24], [cx, 40], [cx - 8, 24]]); ctx.fill();
    // nose (points down)
    ctx.fillStyle = '#d8e2f6';
    poly(ctx, [[cx - 5, 30], [cx + 5, 30], [cx, 40]]); ctx.fill();
    // canopy
    ctx.fillStyle = rgrad(ctx, cx - 1, 16, 1, 7, [[0, '#ffe9b0'], [1, '#c96a1e']]);
    ctx.beginPath(); ctx.ellipse(cx, 16, 4, 6.5, 0, 0, Math.PI * 2); ctx.fill();
    // engine glow (top)
    glowDot(ctx, cx, 4, 7, 'rgba(120,200,255,.9)');
    // missiles
    ctx.fillStyle = '#31405e';
    ctx.fillRect(cx - 19, 26, 3, 9); ctx.fillRect(cx + 16, 26, 3, 9);
  }

  /* ================= INTERCEPTOR ================= */
  function drawInterceptor(s) {
    var ctx = s.ctx, cx = s.w / 2;
    // swept blades
    ctx.fillStyle = lgrad(ctx, 0, 0, 0, s.h, [[0, '#ff9d3c'], [1, '#a34a0a']]);
    poly(ctx, [[cx - 4, 4], [cx - 22, 34], [cx - 10, 30], [cx - 2, 16]]); ctx.fill();
    poly(ctx, [[cx + 4, 4], [cx + 22, 34], [cx + 10, 30], [cx + 2, 16]]); ctx.fill();
    // fuselage dart
    ctx.fillStyle = lgrad(ctx, cx - 7, 0, cx + 7, 0, [[0, '#b35c10'], [0.5, '#ffb35c'], [1, '#8a3f06']]);
    poly(ctx, [[cx - 5, 2], [cx + 5, 2], [cx + 7, 22], [cx, 42], [cx - 7, 22]]); ctx.fill();
    // dark chevron
    ctx.fillStyle = '#30160a';
    poly(ctx, [[cx - 6, 20], [cx, 26], [cx + 6, 20], [cx, 23]]); ctx.fill();
    // cockpit
    ctx.fillStyle = rgrad(ctx, cx, 10, 1, 6, [[0, '#bff4ff'], [1, '#0e5a78']]);
    ctx.beginPath(); ctx.ellipse(cx, 10, 3.6, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    // twin gun prongs
    ctx.fillStyle = '#4d2606';
    ctx.fillRect(cx - 9, 34, 3, 9); ctx.fillRect(cx + 6, 34, 3, 9);
    glowDot(ctx, cx, 4, 6, 'rgba(255,150,60,.9)');
  }

  /* ================= HEAVY FIGHTER ================= */
  function drawHeavy(s) {
    var ctx = s.ctx, cx = s.w / 2;
    // armor wings
    ctx.fillStyle = lgrad(ctx, 0, 0, 0, s.h, [[0, '#5f8f4a'], [1, '#26421c']]);
    poly(ctx, [[cx - 6, 8], [cx - 32, 20], [cx - 32, 44], [cx - 10, 40]]); ctx.fill();
    poly(ctx, [[cx + 6, 8], [cx + 32, 20], [cx + 32, 44], [cx + 10, 40]]); ctx.fill();
    ctx.strokeStyle = '#16290f'; ctx.lineWidth = 2;
    poly(ctx, [[cx - 6, 8], [cx - 32, 20], [cx - 32, 44], [cx - 10, 40]]); ctx.stroke();
    poly(ctx, [[cx + 6, 8], [cx + 32, 20], [cx + 32, 44], [cx + 10, 40]]); ctx.stroke();
    // rivet plates
    ctx.fillStyle = '#38621f';
    ctx.fillRect(cx - 26, 24, 12, 8); ctx.fillRect(cx + 14, 24, 12, 8);
    ctx.fillStyle = '#77a85a';
    [[cx - 22, 27], [cx - 18, 27], [cx + 18, 27], [cx + 22, 27]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.4, 0, Math.PI * 2); ctx.fill();
    });
    // hull
    ctx.fillStyle = lgrad(ctx, cx - 14, 0, cx + 14, 0, [[0, '#2f5220'], [0.5, '#5c8f3f'], [1, '#243f16']]);
    poly(ctx, [[cx - 12, 2], [cx + 12, 2], [cx + 16, 30], [cx, 56], [cx - 16, 30]]); ctx.fill();
    ctx.strokeStyle = '#16290f'; ctx.lineWidth = 2;
    poly(ctx, [[cx - 12, 2], [cx + 12, 2], [cx + 16, 30], [cx, 56], [cx - 16, 30]]); ctx.stroke();
    // armored faceplate
    ctx.fillStyle = '#43662c';
    poly(ctx, [[cx - 9, 22], [cx + 9, 22], [cx + 11, 34], [cx - 11, 34]]); ctx.fill();
    ctx.fillStyle = '#ff4a3a';
    ctx.beginPath(); ctx.arc(cx - 5, 28, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 5, 28, 2, 0, Math.PI * 2); ctx.fill();
    // twin cannons
    ctx.fillStyle = '#1c2f12';
    ctx.fillRect(cx - 12, 40, 7, 16); ctx.fillRect(cx + 5, 40, 7, 16);
    glowDot(ctx, cx - 8.5, 56, 4, 'rgba(140,255,120,.8)');
    glowDot(ctx, cx + 8.5, 56, 4, 'rgba(140,255,120,.8)');
    glowDot(ctx, cx, 5, 9, 'rgba(150,255,110,.7)');
  }

  /* ================= BOSS CARRIER ================= */
  function drawBoss(s) {
    var ctx = s.ctx, w = s.w, h = s.h, cx = w / 2;
    // main hull — huge armored wedge
    ctx.fillStyle = lgrad(ctx, 0, 0, 0, h, [[0, '#6d7ea6'], [0.4, '#8b9cc4'], [0.75, '#52628a'], [1, '#333f60']]);
    poly(ctx, [[10, h * 0.30], [w - 10, h * 0.30], [w - 40, h * 0.72], [cx + 30, h - 8], [cx - 30, h - 8], [40, h * 0.72]]);
    ctx.fill();
    ctx.strokeStyle = '#1c2440'; ctx.lineWidth = 3; ctx.stroke();

    // deck stripe
    ctx.fillStyle = '#3c4a70';
    poly(ctx, [[30, h * 0.42], [w - 30, h * 0.42], [w - 52, h * 0.62], [52, h * 0.62]]); ctx.fill();
    // runway dashes
    ctx.fillStyle = 'rgba(240,250,255,.75)';
    for (var i = 0; i < 6; i++) {
      var yy = h * 0.44 + i * (h * 0.15 / 6);
      ctx.fillRect(cx - 2.5, yy, 5, h * 0.07);
    }
    // side pods
    ctx.fillStyle = lgrad(ctx, 0, h * 0.3, 0, h * 0.9, [[0, '#7c8db4'], [1, '#2e3a5c']]);
    poly(ctx, [[2, h * 0.32], [58, h * 0.36], [66, h * 0.78], [18, h * 0.7]]); ctx.fill();
    poly(ctx, [[w - 2, h * 0.32], [w - 58, h * 0.36], [w - 66, h * 0.78], [w - 18, h * 0.7]]); ctx.fill();
    ctx.strokeStyle = '#1c2440'; ctx.lineWidth = 2;
    poly(ctx, [[2, h * 0.32], [58, h * 0.36], [66, h * 0.78], [18, h * 0.7]]); ctx.stroke();
    poly(ctx, [[w - 2, h * 0.32], [w - 58, h * 0.36], [w - 66, h * 0.78], [w - 18, h * 0.7]]); ctx.stroke();

    // turret domes
    [30, w - 30].forEach(function (tx) {
      ctx.fillStyle = lgrad(ctx, tx - 14, h * 0.5, tx + 14, h * 0.62, [[0, '#aebbd8'], [1, '#4a5578']]);
      ctx.beginPath(); ctx.ellipse(tx, h * 0.56, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1c2440'; ctx.lineWidth = 2; ctx.stroke();
      // barrels pointing down
      ctx.fillStyle = '#151b30';
      ctx.fillRect(tx - 9, h * 0.62, 5, 22); ctx.fillRect(tx + 4, h * 0.62, 5, 22);
      glowDot(ctx, tx - 6.5, h * 0.62 + 22, 4.5, 'rgba(255,90,50,.9)');
      glowDot(ctx, tx + 6.5, h * 0.62 + 22, 4.5, 'rgba(255,90,50,.9)');
    });

    // command tower (top)
    ctx.fillStyle = lgrad(ctx, cx - 26, 0, cx + 26, h * 0.4, [[0, '#9aa8cc'], [1, '#414d72']]);
    poly(ctx, [[cx - 26, h * 0.06], [cx + 26, h * 0.06], [cx + 34, h * 0.3], [cx - 34, h * 0.3]]); ctx.fill();
    ctx.strokeStyle = '#1c2440'; ctx.lineWidth = 2; ctx.stroke();
    // tower windows
    ctx.fillStyle = '#ffe9a0';
    for (i = 0; i < 4; i++) ctx.fillRect(cx - 20 + i * 11, h * 0.12, 7, 4);
    // antenna
    ctx.strokeStyle = '#8b9cc4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, h * 0.06); ctx.lineTo(cx, 2); ctx.stroke();
    glowDot(ctx, cx, 3, 4, 'rgba(255,60,60,.95)');

    // engines (top edge)
    [-70, -35, 0, 35, 70].forEach(function (ox) {
      glowDot(ctx, cx + ox, h * 0.31, 8, 'rgba(150,220,255,.8)');
    });

    // warnings
    ctx.fillStyle = '#e8b23a';
    [86, w - 86].forEach(function (wx) {
      poly(ctx, [[wx - 8, h * 0.47], [wx + 8, h * 0.47], [wx + 3, h * 0.55], [wx - 3, h * 0.55]]); ctx.fill();
    });

    // hull vents
    ctx.strokeStyle = 'rgba(20,28,50,.8)'; ctx.lineWidth = 2;
    for (i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(100 + i * 12, h * 0.66); ctx.lineTo(96 + i * 12, h * 0.74); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - 100 - i * 12, h * 0.66); ctx.lineTo(w - 96 - i * 12, h * 0.74); ctx.stroke();
    }
    // battle scars
    ctx.strokeStyle = 'rgba(20,26,44,.9)'; ctx.lineWidth = 2.2;
    poly(ctx, [[cx - 60, h * 0.36], [cx - 40, h * 0.44], [cx - 52, h * 0.5]], false); ctx.stroke();
    poly(ctx, [[cx + 44, h * 0.4], [cx + 58, h * 0.48]], false); ctx.stroke();
  }

  /* ================= ASTRONAUT ================= */
  function drawAstronaut(s) {
    var ctx = s.ctx, cx = s.w / 2, cy = s.h / 2;
    // backpack
    ctx.fillStyle = '#b9c4d6';
    ctx.fillRect(cx - 10, cy - 9, 20, 14);
    ctx.fillStyle = '#8a96ac';
    ctx.fillRect(cx - 10, cy - 9, 20, 4);
    // torso + limbs (tucked)
    ctx.fillStyle = '#eef2f8';
    ctx.beginPath(); ctx.ellipse(cx, cy + 4, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e2e8f2';
    ctx.beginPath(); ctx.ellipse(cx - 6, cy + 9, 3.6, 4.6, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 6, cy + 9, 3.6, 4.6, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6f8fc';
    ctx.beginPath(); ctx.ellipse(cx - 8, cy + 1, 3.4, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 8, cy + 1, 3.4, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    // helmet
    ctx.fillStyle = rgrad(ctx, cx - 2, cy - 5, 1, 11, [[0, '#ffffff'], [1, '#cfd8e8']]);
    ctx.beginPath(); ctx.ellipse(cx, cy - 5, 8, 8, 0, 0, Math.PI * 2); ctx.fill();
    // gold visor
    ctx.fillStyle = rgrad(ctx, cx - 1, cy - 6, 1, 6, [[0, '#ffe9a8'], [0.6, '#e8a63c'], [1, '#8a5a10']]);
    ctx.beginPath(); ctx.ellipse(cx + 0.5, cy - 5, 5, 5.4, 0, -Math.PI * 0.85, Math.PI * 0.85); ctx.fill();
    // chest panel
    ctx.fillStyle = '#d24a3a';
    ctx.fillRect(cx - 3, cy + 3, 6, 4);
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(cx - 2, cy + 4, 2, 2);
  }

  /* ================= POWER-UPS ================= */
  function drawPowerup(s, color, dark, icon) {
    var ctx = s.ctx, cx = s.w / 2, cy = s.h / 2, r = s.w / 2 - 4;
    // outer glow ring
    ctx.strokeStyle = color; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r - 3, -2.4, -0.8); ctx.stroke();
    // capsule
    ctx.fillStyle = rgrad(ctx, cx - 3, cy - 3, 1, r, [[0, '#ffffff'], [0.35, color], [1, dark]]);
    ctx.beginPath(); ctx.arc(cx, cy, r - 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, r - 5, 0, Math.PI * 2); ctx.stroke();
    // icon
    ctx.fillStyle = '#0c0c14';
    ctx.strokeStyle = '#0c0c14';
    if (icon === 'bolt') {
      poly(ctx, [[cx + 2, cy - 7], [cx - 4, cy + 1], [cx - 0.5, cy + 1], [cx - 2, cy + 7], [cx + 4, cy - 1], [cx + 0.5, cy - 1]]);
      ctx.fill();
    } else if (icon === 'triple') {
      [[0, -7], [-6, 5], [6, 5]].forEach(function (o) {
        var ax = cx + o[0], ay = cy + o[1];
        poly(ctx, [[ax, ay - 3], [ax - 3.4, ay + 2.6], [ax + 3.4, ay + 2.6]]); ctx.fill();
      });
    } else if (icon === 'dmg') {
      poly(ctx, [[cx, cy - 7], [cx + 5.5, cy + 2], [cx + 2, cy + 2], [cx + 2, cy + 7], [cx - 2, cy + 7], [cx - 2, cy + 2], [cx - 5.5, cy + 2]]);
      ctx.fill();
    } else if (icon === 'shield') {
      ctx.lineWidth = 3;
      poly(ctx, [[cx, cy - 7], [cx + 6, cy - 4], [cx + 6, cy + 1], [cx, cy + 7], [cx - 6, cy + 1], [cx - 6, cy - 4]]);
      ctx.fill();
    }
  }

  /* ================= BULLETS ================= */
  function drawPlayerBullet(s, color, core) {
    var ctx = s.ctx, cx = s.w / 2, cy = s.h / 2;
    ctx.fillStyle = rgrad(ctx, cx, cy, 1, s.w / 2, [[0, 'rgba(255,255,255,.95)'], [0.4, core], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(0, 0, s.w, s.h);
    ctx.fillStyle = color;
    poly(ctx, [[cx, 0], [cx + 3, cy - 2], [cx + 2.4, cy + 8], [cx, cy + 10], [cx - 2.4, cy + 8], [cx - 3, cy - 2]]);
    ctx.fill();
  }

  function drawEnemyBullet(s, color) {
    var ctx = s.ctx, cx = s.w / 2, cy = s.h / 2;
    ctx.fillStyle = rgrad(ctx, cx, cy, 0, s.w / 2, [[0, '#ffffff'], [0.35, color], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(0, 0, s.w, s.h);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, s.w / 4, 0, Math.PI * 2); ctx.fill();
  }

  /* ================= FX SPRITES ================= */
  function drawFlash(s) {
    var ctx = s.ctx, cx = s.w / 2, cy = s.h / 2;
    ctx.fillStyle = rgrad(ctx, cx, cy, 0, cx, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,240,160,.9)'], [0.7, 'rgba(255,150,60,.45)'], [1, 'rgba(255,120,40,0)']]);
    ctx.fillRect(0, 0, s.w, s.h);
    // star spikes
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    poly(ctx, [[cx, 2], [cx + 5, cy - 5], [s.w - 2, cy], [cx + 5, cy + 5], [cx, s.h - 2], [cx - 5, cy + 5], [2, cy], [cx - 5, cy - 5]]);
    ctx.fill();
  }

  function drawSplatBase(s) {
    var ctx = s.ctx, cx = s.w / 2, cy = s.h / 2;
    // gooey irregular blob
    ctx.fillStyle = lgrad(ctx, cx - 14, cy - 14, cx + 14, cy + 14, [[0, '#c8ff8a'], [0.6, '#7ade2e'], [1, '#3e8a12']]);
    ctx.strokeStyle = '#2c6409'; ctx.lineWidth = 2;
    ctx.beginPath();
    var pts = 9, rBase = 13;
    for (var i = 0; i <= pts; i++) {
      var a = (i / pts) * Math.PI * 2;
      var r = rBase * (0.72 + 0.28 * Math.abs(Math.sin(i * 2.7 + 1)));
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.9;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // shine
    ctx.fillStyle = 'rgba(240,255,220,.8)';
    ctx.beginPath(); ctx.ellipse(cx - 4, cy - 5, 4.5, 2.6, -0.5, 0, Math.PI * 2); ctx.fill();
    // dazed face (humor: X eyes)
    ctx.strokeStyle = '#1e4409'; ctx.lineWidth = 1.8;
    [[cx - 4, cy], [cx + 4, cy]].forEach(function (p) {
      ctx.beginPath();
      ctx.moveTo(p[0] - 2, p[1] - 2); ctx.lineTo(p[0] + 2, p[1] + 2);
      ctx.moveTo(p[0] + 2, p[1] - 2); ctx.lineTo(p[0] - 2, p[1] + 2);
      ctx.stroke();
    });
    ctx.beginPath(); ctx.arc(cx, cy + 5, 2.4, 0, Math.PI); ctx.stroke();
  }

  function drawSmoke(s) {
    var ctx = s.ctx, cx = s.w / 2;
    ctx.fillStyle = rgrad(ctx, cx, cx, 0, cx, [[0, 'rgba(190,190,210,.65)'], [0.6, 'rgba(120,120,150,.35)'], [1, 'rgba(80,80,110,0)']]);
    ctx.fillRect(0, 0, s.w, s.w);
  }

  function drawSpark(s, color) {
    var ctx = s.ctx, cx = s.w / 2;
    ctx.fillStyle = rgrad(ctx, cx, cx, 0, cx, [[0, '#ffffff'], [0.35, color], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(0, 0, s.w, s.w);
  }

  function drawNebula(s, hue) {
    var ctx = s.ctx, cx = s.w / 2, cy = s.h / 2;
    var blobs = 7;
    for (var i = 0; i < blobs; i++) {
      var a = (i / blobs) * Math.PI * 2 + hue;
      var bx = cx + Math.cos(a) * s.w * 0.22;
      var by = cy + Math.sin(a * 1.7) * s.h * 0.2;
      var r = s.w * (0.18 + 0.14 * Math.abs(Math.sin(i * 3.3 + hue)));
      var col = i % 2 ? 'hsla(' + ((hue * 60 + 260) % 360) + ',80%,60%,0.10)' : 'hsla(' + ((hue * 60 + 180) % 360) + ',85%,65%,0.09)';
      ctx.fillStyle = rgrad(ctx, bx, by, 0, r, [[0, col], [1, 'rgba(0,0,0,0)']]);
      ctx.fillRect(0, 0, s.w, s.h);
    }
  }

  function drawPlanet(s) {
    var ctx = s.ctx, cx = s.w / 2, cy = s.h / 2, r = Math.min(cx, cy) - 4;
    ctx.save();
    // body
    ctx.fillStyle = rgrad(ctx, cx - r * 0.35, cy - r * 0.35, r * 0.1, r, [[0, '#9fd8e8'], [0.5, '#3f7ea8'], [1, '#122a4a']]);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // bands
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = r * 0.12;
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 0.5 + i * r * 0.45, r * 1.1, r * 0.18, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // ring
    ctx.strokeStyle = 'rgba(220,200,160,.55)';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.5, r * 0.42, -0.35, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawGalaxy(s) {
    var ctx = s.ctx, cx = s.w / 2, cy = s.h / 2;
    for (var i = 0; i < 90; i++) {
      var a = i * 0.35, r = 2 + i * 0.28;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.45;
      ctx.fillStyle = i % 3 ? 'rgba(200,190,255,.25)' : 'rgba(255,240,220,.3)';
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.fillStyle = rgrad(ctx, cx, cy, 0, 14, [[0, 'rgba(255,250,230,.8)'], [1, 'rgba(255,250,230,0)']]);
    ctx.fillRect(0, 0, s.w, s.h);
  }

  /* ================= BUILD ALL ================= */
  AA.buildSprites = function () {
    var mk = makeCanvas;
    var s = {};
    s.player = mk(92, 74); drawPlayer(s.player);
    s.fighter = mk(46, 44); drawFighter(s.fighter);
    s.interceptor = mk(48, 46); drawInterceptor(s.interceptor);
    s.heavy = mk(68, 60); drawHeavy(s.heavy);
    s.boss = mk(310, 150); drawBoss(s.boss);
    s.astronaut = mk(26, 30); drawAstronaut(s.astronaut);

    s.puRapid = mk(30, 30); drawPowerup(s.puRapid, '#ffd23e', '#8a6a00', 'bolt');
    s.puTriple = mk(30, 30); drawPowerup(s.puTriple, '#ff5ec8', '#8a1364', 'triple');
    s.puDmg = mk(30, 30); drawPowerup(s.puDmg, '#ff7a3e', '#8a2f0a', 'dmg');
    s.puShield = mk(30, 30); drawPowerup(s.puShield, '#35e6ff', '#0864a8', 'shield');

    s.bullet = mk(14, 26); drawPlayerBullet(s.bullet, '#8ff7ff', 'rgba(60,220,255,.8)');
    s.bulletDmg = mk(20, 30); drawPlayerBullet(s.bulletDmg, '#ffc36e', 'rgba(255,140,40,.85)');
    s.ebullet = mk(18, 18); drawEnemyBullet(s.ebullet, '#ff5a3c');
    s.ebulletHeavy = mk(26, 26); drawEnemyBullet(s.ebulletHeavy, '#8ef06a');

    s.flash = mk(64, 64); drawFlash(s.flash);
    s.splat = mk(36, 36); drawSplatBase(s.splat);
    s.smoke = mk(48, 48); drawSmoke(s.smoke);
    s.sparkWarm = mk(14, 14); drawSpark(s.sparkWarm, 'rgba(255,180,60,.9)');
    s.sparkCool = mk(14, 14); drawSpark(s.sparkCool, 'rgba(120,220,255,.9)');

    s.nebulaA = mk(230, 230); drawNebula(s.nebulaA, 0.3);
    s.nebulaB = mk(260, 260); drawNebula(s.nebulaB, 1.8);
    s.planet = mk(110, 110); drawPlanet(s.planet);
    s.galaxy = mk(70, 70); drawGalaxy(s.galaxy);
    return s;
  };
})(typeof self !== 'undefined' ? self : globalThis);
