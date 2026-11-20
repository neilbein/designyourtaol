/* DesignYourTaol — Hero 3D Coffin Canvas Renderer (no external deps) */
const HeroCoffinCanvas = (function () {

  var canvas, ctx, container;
  var w = 480, h = 480, cx = 240, cy = 220;
  var rotY = 0, rotX = -0.28;
  var tRotY = 0, tRotX = -0.28;
  var autoY = 0;
  var over = false;
  var cur = 0;
  var cycleTimer = null;
  var started = false;

  /* coffin top-view profile */
  var PROFILE = [
    [-0.97, 0.17], [-0.80, 0.30], [-0.52, 0.43], [-0.10, 0.47],
    [ 0.18, 0.46], [ 0.58, 0.39], [ 0.95, 0.21],
    [ 0.95,-0.21], [ 0.58,-0.39], [ 0.18,-0.46],
    [-0.10,-0.47], [-0.52,-0.43], [-0.80,-0.30], [-0.97,-0.17]
  ];
  var HH = 0.26;

  var PRESETS = [
    { name:'Premium Gold',    tag:'Luxury Ceremonial',    price:'₱42,000',
      body:'#f0ede6', lid:'#f8f5ef', dark:'#b0a898', edge:'#d4af37', acc:'#d4af37',
      handleColor:'#d4af37', handleDark:'#a07820' },
    { name:'Royal Heritage',  tag:'Luxury Mahogany',      price:'₱35,000',
      body:'#e8ddd0', lid:'#ede5d8', dark:'#a09080', edge:'#c9a84c', acc:'#d4af37',
      handleColor:'#d4af37', handleDark:'#a07820' },
    { name:'Modern Serenity', tag:'Contemporary Minimal', price:'₱28,000',
      body:'#dce8f4', lid:'#e6f0f8', dark:'#8899aa', edge:'#b0bcc8', acc:'#c7ccd1',
      handleColor:'#b0b8c0', handleDark:'#7a8898' }
  ];

  /* ---- math helpers ---- */
  function rv(x, y, z, ry, rx) {
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var x1 = x*cy + z*sy, z1 = -x*sy + z*cy;
    var cr = Math.cos(rx), sr = Math.sin(rx);
    return [x1, y*cr - z1*sr, y*sr + z1*cr];
  }
  function proj(x, y, z) {
    var d = 3.2 + z, s = Math.min(w, h) * 0.44;
    return [cx + x/d*s, cy + y/d*s, z];
  }
  function hex2rgb(h) {
    return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  }
  function tone(hex, f) {
    var c = hex2rgb(hex);
    return 'rgb('+Math.round(c[0]*f)+','+Math.round(c[1]*f)+','+Math.round(c[2]*f)+')';
  }
  function mixColor(hex, r2, g2, b2, t) {
    var c = hex2rgb(hex);
    return 'rgb('+Math.round(c[0]*(1-t)+r2*t)+','+Math.round(c[1]*(1-t)+g2*t)+','+Math.round(c[2]*(1-t)+b2*t)+')';
  }
  function polyPath(pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  /* ---- draw one frame ---- */
  function draw() {
    requestAnimationFrame(draw);
    if (!over) autoY += 0.007;
    rotY += (tRotY - rotY) * 0.08;
    rotX += (tRotX - rotX) * 0.08;

    var ry = autoY + rotY, rx = rotX;
    var p  = PRESETS[cur], n = PROFILE.length;

    ctx.clearRect(0, 0, w, h);

    /* ---- background with spotlight ---- */
    var bg = ctx.createRadialGradient(cx, cy*0.5, 0, cx, cy, w*0.78);
    bg.addColorStop(0, '#6a6a74');
    bg.addColorStop(0.5, '#484850');
    bg.addColorStop(1, '#28282e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    /* ---- project all vertices ---- */
    var top = [], bot = [];
    for (var k = 0; k < n; k++) {
      var pf = PROFILE[k];
      var t = rv(pf[0],  HH, pf[1], ry, rx); top.push(proj(t[0], t[1], t[2]));
      var b = rv(pf[0], -HH, pf[1], ry, rx); bot.push(proj(b[0], b[1], b[2]));
    }

    /* center of lid */
    var mx = 0, my = 0;
    for (var i = 0; i < n; i++) { mx += top[i][0]; my += top[i][1]; }
    mx /= n; my /= n;

    /* ---- FLOOR REFLECTION (faded upside-down coffin) ---- */
    ctx.save();
    ctx.globalAlpha = 0.18;
    /* reflect top pts around a horizontal line just below the coffin bottom */
    var floorY = 0;
    for (var i = 0; i < n; i++) floorY = Math.max(floorY, bot[i][1]);
    floorY += 6;
    var rTop = top.map(function(v){ return [v[0], floorY*2 - v[1], v[2]]; });
    var rBot = bot.map(function(v){ return [v[0], floorY*2 - v[1], v[2]]; });
    /* sides of reflection */
    for (var i = 0; i < n; i++) {
      var j = (i+1)%n;
      polyPath([rTop[i], rTop[j], rBot[j], rBot[i]]);
      ctx.fillStyle = tone(p.body, 0.6); ctx.fill();
    }
    polyPath(rTop); ctx.fillStyle = p.lid; ctx.fill();
    /* fade gradient over reflection */
    ctx.globalAlpha = 1;
    var fGrad = ctx.createLinearGradient(0, floorY, 0, floorY + h*0.22);
    fGrad.addColorStop(0, 'rgba(40,40,46,0)');
    fGrad.addColorStop(1, 'rgba(40,40,46,1)');
    ctx.fillStyle = fGrad; ctx.fillRect(0, floorY, w, h*0.3);
    ctx.restore();

    /* ---- floor shadow ellipse ---- */
    ctx.save();
    ctx.translate(cx, floorY + 4); ctx.scale(1, 0.14);
    ctx.beginPath(); ctx.arc(0, 0, w*0.30, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
    ctx.restore();

    /* ---- collect + sort side faces ---- */
    var sides = [];
    for (var i = 0; i < n; i++) {
      var j = (i+1)%n;
      var avgZ = (top[i][2]+top[j][2]+bot[j][2]+bot[i][2])/4;
      var dx = PROFILE[j][0]-PROFILE[i][0], dz = PROFILE[j][1]-PROFILE[i][1];
      var len = Math.sqrt(dx*dx+dz*dz)||1;
      var nx = -dz/len, nz = dx/len;
      var cosRy = Math.cos(ry), sinRy = Math.sin(ry);
      var rnx = nx*cosRy + nz*sinRy, rnz = -nx*sinRy + nz*cosRy;
      /* light from front-upper-right */
      var light = Math.max(0, rnx*0.4 + rnz*0.85);
      /* specular */
      var spec = Math.pow(Math.max(0, rnz*0.9 + rnx*0.1), 6) * 0.5;
      sides.push({
        pts: [[top[i][0],top[i][1]], [top[j][0],top[j][1]], [bot[j][0],bot[j][1]], [bot[i][0],bot[i][1]]],
        avgZ: avgZ, light: light, spec: spec
      });
    }
    sides.sort(function(a,b){ return b.avgZ - a.avgZ; });

    /* ---- draw sides ---- */
    for (var s = 0; s < sides.length; s++) {
      var f = sides[s];
      /* wide brightness range: dark=0.22, bright=1.0 */
      var br = 0.22 + f.light * 0.78;
      polyPath(f.pts);
      ctx.fillStyle = tone(p.body, br); ctx.fill();
      /* specular sheen on bright faces */
      if (f.spec > 0.02) {
        polyPath(f.pts);
        ctx.fillStyle = 'rgba(255,255,255,' + (f.spec * 0.55) + ')'; ctx.fill();
      }
      /* subtle dark edge line */
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.6; ctx.stroke();
    }

    /* ---- bottom face ---- */
    polyPath(bot.map(function(v){ return [v[0],v[1]]; }));
    ctx.fillStyle = tone(p.dark, 0.75); ctx.fill();

    /* ---- handles (3 per visible long side) ---- */
    var handlePositions = [-0.55, 0, 0.55]; /* along length axis */
    for (var hi = 0; hi < handlePositions.length; hi++) {
      var hx = handlePositions[hi];
      /* left side handle */
      var hLeft = rv(hx, 0, 0.52, ry, rx); var hlPt = proj(hLeft[0], hLeft[1], hLeft[2]);
      /* right side handle */
      var hRight = rv(hx, 0, -0.52, ry, rx); var hrPt = proj(hRight[0], hRight[1], hRight[2]);
      var scale = Math.min(w, h) * 0.44;
      var hSize = scale / (3.2 + hLeft[2]) * 0.045;
      /* only draw if facing forward (z depth reasonable) */
      if (hLeft[2] < 0.4) {
        ctx.beginPath(); ctx.ellipse(hlPt[0], hlPt[1], hSize*1.6, hSize*0.7, 0, 0, Math.PI*2);
        ctx.fillStyle = p.handleColor; ctx.fill();
        ctx.strokeStyle = p.handleDark; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(hlPt[0], hlPt[1], hSize*0.7, hSize*0.3, 0, 0, Math.PI*2);
        ctx.fillStyle = tone(p.handleColor, 1.3); ctx.fill();
      }
      if (hRight[2] < 0.4) {
        var hrSize = scale / (3.2 + hRight[2]) * 0.045;
        ctx.beginPath(); ctx.ellipse(hrPt[0], hrPt[1], hrSize*1.6, hrSize*0.7, 0, 0, Math.PI*2);
        ctx.fillStyle = p.handleColor; ctx.fill();
        ctx.strokeStyle = p.handleDark; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(hrPt[0], hrPt[1], hrSize*0.7, hrSize*0.3, 0, 0, Math.PI*2);
        ctx.fillStyle = tone(p.handleColor, 1.3); ctx.fill();
      }
    }

    /* ---- lid (top face) ---- */
    var lidPts = top.map(function(v){ return [v[0],v[1]]; });
    polyPath(lidPts); ctx.fillStyle = p.lid; ctx.fill();
    polyPath(lidPts); ctx.strokeStyle = p.edge; ctx.lineWidth = 1.2; ctx.stroke();

    /* ---- lid gloss: large soft highlight ---- */
    var hg = ctx.createRadialGradient(mx - w*0.07, my - h*0.07, 0, mx, my, w*0.32);
    hg.addColorStop(0, 'rgba(255,255,255,0.52)');
    hg.addColorStop(0.4, 'rgba(255,255,255,0.18)');
    hg.addColorStop(1, 'rgba(255,255,255,0.00)');
    polyPath(lidPts); ctx.fillStyle = hg; ctx.fill();

    /* ---- lid gloss: sharp specular streak ---- */
    var sx1 = mx - w*0.14, sy1 = my - h*0.10;
    var sx2 = mx + w*0.06, sy2 = my - h*0.04;
    var streak = ctx.createLinearGradient(sx1, sy1, sx2, sy2);
    streak.addColorStop(0, 'rgba(255,255,255,0.00)');
    streak.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    streak.addColorStop(1, 'rgba(255,255,255,0.00)');
    polyPath(lidPts); ctx.fillStyle = streak; ctx.fill();

    /* ---- lid inner panel border ---- */
    var inner = lidPts.map(function(pt){ return [pt[0]*0.80 + mx*0.20, pt[1]*0.80 + my*0.20]; });
    polyPath(inner); ctx.strokeStyle = p.acc; ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.72; ctx.stroke(); ctx.globalAlpha = 1;

    /* ---- cross on lid ---- */
    var cs = Math.min(w,h) * 0.042;
    ctx.beginPath();
    ctx.moveTo(mx-cs, my); ctx.lineTo(mx+cs, my);
    ctx.moveTo(mx, my-cs*1.7); ctx.lineTo(mx, my+cs*1.7);
    ctx.strokeStyle = p.acc; ctx.lineWidth = 2.8; ctx.globalAlpha = 0.72; ctx.stroke();
    ctx.globalAlpha = 1;

    /* ---- top edge highlight (rim light) ---- */
    ctx.beginPath(); ctx.moveTo(lidPts[0][0], lidPts[0][1]);
    for (var i = 1; i < n; i++) ctx.lineTo(lidPts[i][0], lidPts[i][1]);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.0; ctx.stroke();
  }

  /* ---- UI update ---- */
  function updateUI(idx) {
    var p = PRESETS[idx];
    var nm = document.querySelector('.hero-coffin-name');
    var tg = document.querySelector('.hero-coffin-tagline');
    var pr = document.querySelector('.hero-coffin-price');
    if (nm) nm.textContent = p.name;
    if (tg) tg.textContent = p.tag;
    if (pr) pr.textContent = p.price;
    document.querySelectorAll('.coffin-dot').forEach(function(d, i){ d.classList.toggle('active', i===idx); });
  }

  function restartCycle() {
    if (cycleTimer) clearInterval(cycleTimer);
    cycleTimer = setInterval(function(){ cur = (cur+1)%PRESETS.length; updateUI(cur); }, 5000);
  }

  /* ---- resize ---- */
  function resize() {
    if (!container) return;
    var r = container.getBoundingClientRect();
    w = r.width  || 480;
    h = r.height || 480;
    canvas.width  = w;
    canvas.height = h;
    cx = w * 0.50;
    cy = h * 0.44;
  }

  /* ---- init ---- */
  function init(containerEl, canvasEl) {
    container = containerEl;
    canvas    = canvasEl;
    ctx       = canvas.getContext('2d');
    resize();
    updateUI(0);
    window.addEventListener('resize', resize);

    container.addEventListener('mousemove', function(e) {
      var r = container.getBoundingClientRect();
      tRotY = ((e.clientX - r.left)/r.width*2  - 1) * 0.52;
      tRotX = ((e.clientY - r.top) /r.height*2 - 1) * 0.22 - 0.22;
      over = true;
    });
    container.addEventListener('mouseleave', function() { tRotY=0; tRotX=-0.22; over=false; });

    document.querySelectorAll('.coffin-dot').forEach(function(dot, i) {
      dot.addEventListener('click', function(){ cur=i; updateUI(i); restartCycle(); });
    });

    if (!started) { started = true; draw(); }
    restartCycle();
  }

  function setPreset(idx) { cur = idx; updateUI(idx); }

  return { init: init, setPreset: setPreset, resize: resize };
})();
