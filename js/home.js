/* ============================================================
   DesignYourTaol — Landing page controller (index.html only)
   ============================================================ */

(function(){
  const { showToast, initNav, initScrollReveal, initParticles, initCustomCursor, validateField, reduceMotion } = window.DYT_UI;
  const qs = (s, r) => (r || document).querySelector(s);
  const qsa = (s, r) => Array.from((r || document).querySelectorAll(s));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; };
  const fmtPeso = n => "\u20B1" + Math.round(n).toLocaleString("en-PH");

  /* ---------- mini 3D coffin per catalog card ---------- */
  var MINI_PAL = {
    'walnut':       {body:'#c8906a',lid:'#d8a07a',dark:'#8a5030',edge:'#b07828',acc:'#b07828',hc:'#c09040',hd:'#7a5020',glow:[192,130,80]},
    'mahogany':     {body:'#c06060',lid:'#cc7272',dark:'#881818',edge:'#c8a040',acc:'#d4af37',hc:'#d4af37',hd:'#886010',glow:[200,100,80]},
    'black':        {body:'#404048',lid:'#505060',dark:'#202028',edge:'#8080a0',acc:'#9090b0',hc:'#9090b0',hd:'#505060',glow:[100,100,140]},
    'natural-wood': {body:'#d4a86a',lid:'#ddb87a',dark:'#b07840',edge:'#c8982a',acc:'#c8982a',hc:'#d4b040',hd:'#886020',glow:[200,160,90]},
    'dark-brown':   {body:'#f2efe8',lid:'#faf7f0',dark:'#a89880',edge:'#d4af37',acc:'#d4af37',hc:'#e8c84a',hd:'#8a6010',glow:[212,175,55]},
    'white':        {body:'#e4e4ea',lid:'#eeeef4',dark:'#b0b0bc',edge:'#c8c8d8',acc:'#c8c8d8',hc:'#d8d8e8',hd:'#9090a0',glow:[200,200,230]}
  };
  /* top-view coffin profile (lying flat, x=length, z=width) */
  var MINI_PROFILE = [
    [-0.97, 0.17],[-0.80, 0.30],[-0.52, 0.43],[-0.10, 0.47],
    [ 0.18, 0.46],[ 0.58, 0.39],[ 0.95, 0.21],
    [ 0.95,-0.21],[ 0.58,-0.39],[ 0.18,-0.46],
    [-0.10,-0.47],[-0.52,-0.43],[-0.80,-0.30],[-0.97,-0.17]
  ];
  var MINI_HH = 0.24;

  function makeMiniCoffin(canvas, media, pal){
    var ctx = canvas.getContext('2d');
    var w=0,h=0,cx=0,cy=0;
    var rotY=0,rotX=-0.30,tRotY=0,tRotX=-0.30,over=false,tick=0;
    var n = MINI_PROFILE.length;

    function resize(){
      var r = media.getBoundingClientRect();
      w = r.width  || 300; h = r.height || 225;
      canvas.width = w; canvas.height = h;
      cx = w*0.5; cy = h*0.48;
    }
    function rv(x,y,z,ry,rx){var c=Math.cos(ry),s=Math.sin(ry),x1=x*c+z*s,z1=-x*s+z*c,cr=Math.cos(rx),sr=Math.sin(rx);return[x1,y*cr-z1*sr,y*sr+z1*cr];}
    function pj(x,y,z){var d=3.0+z,s=Math.min(w,h)*0.48;return[cx+x/d*s,cy+y/d*s,z];}
    function tn(hex,f){var c=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];return'rgb('+Math.round(Math.min(255,c[0]*f))+','+Math.round(Math.min(255,c[1]*f))+','+Math.round(Math.min(255,c[2]*f))+')';}
    function pp(pts){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(var i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();}

    function draw(){
      requestAnimationFrame(draw);
      tick += 0.012;
      if(!over){ var sw=Math.sin(tick*0.55)*0.60; rotY+=(sw-rotY)*0.04; rotX+=(-0.30-rotX)*0.03; }
      else{ rotY+=(tRotY-rotY)*0.08; rotX+=(tRotX-rotX)*0.08; }
      var ry=rotY, rx=rotX, gl=pal.glow;

      ctx.clearRect(0,0,w,h);
      ctx.fillStyle='#0c0c10'; ctx.fillRect(0,0,w,h);

      /* ambient glow */
      var ag=ctx.createRadialGradient(cx,cy*0.9,0,cx,cy,w*0.6);
      ag.addColorStop(0,'rgba('+gl[0]+','+gl[1]+','+gl[2]+','+(0.10+Math.sin(tick)*0.03)+')');
      ag.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=ag; ctx.fillRect(0,0,w,h);

      /* project top/bottom vertices */
      var top=[],bot=[];
      for(var k=0;k<n;k++){
        var pf=MINI_PROFILE[k];
        var t=rv(pf[0],MINI_HH,pf[1],ry,rx); top.push(pj(t[0],t[1],t[2]));
        var b=rv(pf[0],-MINI_HH,pf[1],ry,rx); bot.push(pj(b[0],b[1],b[2]));
      }
      var mx=0,my=0; for(var i=0;i<n;i++){mx+=top[i][0];my+=top[i][1];} mx/=n;my/=n;
      var fy=0; for(var i=0;i<n;i++) fy=Math.max(fy,bot[i][1]); fy+=4;

      /* floor shadow */
      ctx.save(); ctx.translate(cx,fy+2); ctx.scale(1,0.14);
      ctx.beginPath(); ctx.arc(0,0,w*0.30,0,Math.PI*2);
      ctx.fillStyle='rgba(0,0,0,0.70)'; ctx.fill(); ctx.restore();

      /* side faces */
      var sides=[];
      for(var i=0;i<n;i++){
        var j=(i+1)%n, az=(top[i][2]+top[j][2]+bot[j][2]+bot[i][2])/4;
        var dx=MINI_PROFILE[j][0]-MINI_PROFILE[i][0],dz=MINI_PROFILE[j][1]-MINI_PROFILE[i][1],ln=Math.sqrt(dx*dx+dz*dz)||1;
        var nx=-dz/ln,nz=dx/ln,cR=Math.cos(ry),sR=Math.sin(ry),rnx=nx*cR+nz*sR,rnz=-nx*sR+nz*cR;
        var lt=Math.max(0,rnx*0.40+rnz*0.85), sp=Math.pow(Math.max(0,rnz*0.95),8)*0.55;
        sides.push({pts:[[top[i][0],top[i][1]],[top[j][0],top[j][1]],[bot[j][0],bot[j][1]],[bot[i][0],bot[i][1]]],az:az,lt:lt,sp:sp});
      }
      sides.sort(function(a,b){return b.az-a.az;});
      for(var s=0;s<sides.length;s++){
        var f=sides[s],br=0.12+f.lt*0.88;
        pp(f.pts); ctx.fillStyle=tn(pal.body,br); ctx.fill();
        if(f.sp>0.02){pp(f.pts);ctx.fillStyle='rgba(255,255,255,'+(f.sp*0.50)+')';ctx.fill();}
        pp(f.pts); ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.lineWidth=0.5; ctx.stroke();
      }

      /* handles (2 per long side) */
      var hpos=[-0.45,0.45];
      for(var hi=0;hi<2;hi++){
        var hL=rv(hpos[hi],0,0.52,ry,rx),hR=rv(hpos[hi],0,-0.52,ry,rx);
        var sc=Math.min(w,h)*0.48;
        function dh(pt3){
          if(pt3[2]>0.42) return;
          var hp=pj(pt3[0],pt3[1],pt3[2]),hs=sc/(3.0+pt3[2])*0.048;
          ctx.beginPath(); ctx.ellipse(hp[0],hp[1],hs*1.7,hs*0.72,0,0,Math.PI*2);
          ctx.fillStyle=pal.hc; ctx.fill();
          ctx.strokeStyle=pal.hd; ctx.lineWidth=0.7; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(hp[0]-hs*0.35,hp[1]-hs*0.18,hs*0.44,hs*0.20,0,0,Math.PI*2);
          ctx.fillStyle='rgba(255,255,255,0.60)'; ctx.fill();
        }
        dh(hL); dh(hR);
      }

      /* lid */
      var lp=top.map(function(v){return[v[0],v[1]];});
      pp(lp); ctx.fillStyle=pal.lid; ctx.fill();
      pp(lp); ctx.strokeStyle=pal.edge; ctx.lineWidth=1.2; ctx.stroke();

      /* gloss */
      var hg=ctx.createRadialGradient(mx-w*0.07,my-h*0.07,0,mx,my,w*0.28);
      hg.addColorStop(0,'rgba(255,255,255,0.50)'); hg.addColorStop(0.4,'rgba(255,255,255,0.14)'); hg.addColorStop(1,'rgba(255,255,255,0)');
      pp(lp); ctx.fillStyle=hg; ctx.fill();

      /* inner panel */
      var inn=lp.map(function(pt){return[pt[0]*0.80+mx*0.20,pt[1]*0.80+my*0.20];});
      pp(inn); ctx.strokeStyle=pal.acc; ctx.lineWidth=1.5; ctx.globalAlpha=0.75; ctx.stroke(); ctx.globalAlpha=1;

      /* cross */
      var cs=Math.min(w,h)*0.038;
      ctx.beginPath(); ctx.moveTo(mx-cs,my); ctx.lineTo(mx+cs,my); ctx.moveTo(mx,my-cs*1.6); ctx.lineTo(mx,my+cs*1.6);
      ctx.strokeStyle=pal.acc; ctx.lineWidth=2.5; ctx.globalAlpha=0.75; ctx.stroke(); ctx.globalAlpha=1;

      /* rim */
      pp(lp); ctx.strokeStyle='rgba(255,255,255,0.32)'; ctx.lineWidth=1.0; ctx.stroke();

      /* vignette */
      var vg=ctx.createRadialGradient(cx,cy,w*0.2,cx,cy,w*0.65);
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.65)');
      ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
    }

    media.addEventListener('mouseenter', function(){ over=true; });
    media.addEventListener('mouseleave', function(){ over=false; });
    media.addEventListener('mousemove', function(e){
      var r=media.getBoundingClientRect();
      tRotY = ((e.clientX-r.left)/r.width*2-1)*0.65;
      tRotX = ((e.clientY-r.top)/r.height*2-1)*0.28-0.20;
    });

    resize();
    window.addEventListener('resize', resize);
    draw();
    return {
      setPalette: function(p){ pal = p; },
      resize: resize
    };
  }

  /* ---------- catalog ---------- */
  function renderCatalog(){
    const wrap = qs("#catalog-grid");
    if(!wrap) return;
    coffinModels.forEach((m, i) => {
      const card = el("div", "coffin-card reveal");
      card.style.transitionDelay = (i * 0.06) + "s";
      const cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
      card.innerHTML = `
        <div class="coffin-card-media" style="background:#0c0c10;">
          <span class="coffin-card-tag">${m.style}</span>
        </div>
        <div class="coffin-card-body">
          <h3>${m.name}</h3>
          <p>${m.description}</p>
          <div class="coffin-card-meta">
            <span>\u25CF ${m.material}</span>
          </div>
          <div class="coffin-card-foot">
            <div class="coffin-card-price"><small>Starting at</small>${fmtPeso(m.price)}</div>
            <a class="btn btn-secondary btn-sm" href="customize.html?model=${m.id}">Customize</a>
          </div>
        </div>`;
      const media = card.querySelector('.coffin-card-media');
      media.appendChild(cv);
      wrap.appendChild(card);
      const pal = MINI_PAL[m.defaultColor] || MINI_PAL['dark-brown'];
      const inst = makeMiniCoffin(cv, media, pal);
      card.addEventListener('click', function(e){
        if(e.target.closest('.btn')) return;
        openCoffinModal(m, pal, inst);
      });
    });
  }

  /* ---------- coffin detail modal ---------- */
  var _modalInst = null;
  function openCoffinModal(model, startPal, cardInst){
    var overlay = qs('#coffin-modal');
    if(!overlay) return;
    if(!_modalInst){
      var mc = qs('#coffin-modal-canvas');
      var mm = qs('#coffin-modal-visual');
      _modalInst = makeMiniCoffin(mc, mm, startPal);
    } else {
      _modalInst.setPalette(startPal);
    }
    qs('.coffin-modal-tag').textContent   = model.style;
    qs('.coffin-modal-name').textContent  = model.name;
    qs('.coffin-modal-desc').textContent  = model.description;
    qs('.coffin-modal-price').textContent = fmtPeso(model.price);
    qs('#coffin-modal-cta').href = 'customize.html?model=' + model.id;
    var sw = qs('.coffin-modal-swatches');
    sw.innerHTML = '';
    Object.keys(MINI_PAL).forEach(function(key){
      var btn = document.createElement('button');
      btn.className = 'coffin-swatch';
      btn.style.background = MINI_PAL[key].lid;
      btn.title = key.replace(/-/g,' ');
      if(MINI_PAL[key] === startPal) btn.classList.add('active');
      btn.addEventListener('click', function(){
        _modalInst.setPalette(MINI_PAL[key]);
        sw.querySelectorAll('.coffin-swatch').forEach(function(s){ s.classList.remove('active'); });
        btn.classList.add('active');
      });
      sw.appendChild(btn);
    });
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function(){ _modalInst.resize(); });
  }

  function initModal(){
    var overlay = qs('#coffin-modal');
    if(!overlay) return;
    overlay.addEventListener('click', function(e){
      if(e.target === overlay || e.target.closest('.coffin-modal-close')){
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && overlay.classList.contains('open')){
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  /* ---------- scroll rotation on hero coffin ---------- */
  function initScrollRotation(){
    var hero = qs('#home');
    if(!hero || !window.HeroCoffinScroll) return;
    window.addEventListener('scroll', function(){
      var r = hero.getBoundingClientRect();
      var prog = Math.max(0, Math.min(1, -r.top / (r.height * 0.55)));
      window.HeroCoffinScroll(prog);
    }, {passive:true});
  }

  /* ---------- hero color swatches ---------- */
  function initHeroSwatches(){
    document.querySelectorAll('.hero-preset-swatch').forEach(function(sw, i){
      sw.addEventListener('click', function(){
        if(window.HeroCoffinSet) window.HeroCoffinSet(i);
        document.querySelectorAll('.hero-preset-swatch').forEach(function(s,j){ s.classList.toggle('active',j===i); });
        document.querySelectorAll('.coffin-dot').forEach(function(d,j){ d.classList.toggle('active',j===i); });
      });
    });
  }

  /* ---------- loading screen ---------- */
  function initLoader(){
    var loader = qs('#site-loader');
    if(!loader) return;
    setTimeout(function(){
      loader.classList.add('done');
      setTimeout(function(){ if(loader.parentNode) loader.parentNode.removeChild(loader); }, 850);
    }, 1450);
  }

  /* ---------- how it works ---------- */
  function renderHowItWorks(){
    const wrap = qs("#how-it-works-grid");
    if(!wrap) return;
    howItWorksSteps.forEach(s => {
      const item = el("div", "step-item reveal");
      item.innerHTML = `<div class="step-num">${s.num}</div><h4>${s.title}</h4><p>${s.desc}</p>`;
      wrap.appendChild(item);
    });
  }

  /* ---------- features ---------- */
  const FEATURE_ICONS = [
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/></svg>',
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg>',
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.2-.3-.4-.6-.4-1 0-.8.7-1.4 1.5-1.4H16c3.3 0 6-2.7 6-6 0-4.9-4.5-9-10-9z"/></svg>',
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="9"/></svg>',
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
  ];
  function renderFeatures(){
    const wrap = qs("#feature-grid");
    if(!wrap) return;
    featureList.forEach((f,i) => {
      const card = el("div", "feature-card reveal");
      card.style.transitionDelay = (i*0.05)+"s";
      card.innerHTML = `<div class="feature-icon">${FEATURE_ICONS[i % FEATURE_ICONS.length]}</div><h4>${f.title}</h4><p>${f.desc}</p>`;
      wrap.appendChild(card);
    });
  }

  /* ---------- before / after ---------- */
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
  const DOT_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>';
  function renderComparison(){
    const oldWrap = qs("#compare-old-list");
    const newWrap = qs("#compare-new-list");
    if(oldWrap) comparisonData.traditional.forEach(t => oldWrap.appendChild(el("li", "", `${DOT_SVG}<span>${t}</span>`)));
    if(newWrap) comparisonData.designyourtaol.forEach(t => newWrap.appendChild(el("li", "", `${CHECK_SVG}<span>${t}</span>`)));
  }

  /* ---------- benefits ---------- */
  function renderBenefits(){
    const custWrap = qs("#benefits-customer");
    const bizWrap = qs("#benefits-business");
    if(custWrap) benefitsData.customer.forEach(b => custWrap.appendChild(el("li", "", `<span class="benefit-dot"></span><span>${b}</span>`)));
    if(bizWrap) benefitsData.business.forEach(b => bizWrap.appendChild(el("li", "", `<span class="benefit-dot"></span><span>${b}</span>`)));
  }

  /* ---------- hero entrance (GSAP if present, else CSS fallback) ---------- */
  function playHeroEntrance(){
    const lines = qsa(".hero h1 .line span");
    const targets = [".hero-eyebrow", ".hero-desc", ".hero-cta", ".hero-stats", ".hero-visual", ".scroll-cue"];
    if(window.gsap && !reduceMotion){
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(lines, { y: "0%", duration: 0.9, stagger: 0.12 })
        .to(".hero-eyebrow", { opacity: 1, duration: 0.5 }, "-=0.6")
        .to(".hero-desc", { opacity: 1, y: 0, duration: 0.7 }, "-=0.4")
        .to(".hero-cta", { opacity: 1, duration: 0.6 }, "-=0.4")
        .to(".hero-visual", { opacity: 1, duration: 0.8 }, "-=0.5")
        .to(".hero-stats", { opacity: 1, duration: 0.6 }, "-=0.3")
        .to(".scroll-cue", { opacity: 1, duration: 0.6 }, "-=0.2");
    } else {
      lines.forEach(l => l.style.transform = "translateY(0)");
      targets.forEach(sel => { const t = qs(sel); if(t) t.style.opacity = 1; });
    }
  }

  /* ---------- hero visual — pure Canvas 2D 3D coffin (no Three.js needed) ---------- */
  function initHeroVisual(){
    const container = qs("#hero-visual");
    const canvas = qs("#hero-canvas");
    if(!container || !canvas) return;
    /* force visible regardless of GSAP */
    container.style.opacity = "1";
    if(!window.HeroCoffinCanvas) return;
    HeroCoffinCanvas.init(container, canvas);
    /* re-measure after layout settles (canvas may have 0 dimensions at DOMContentLoaded) */
    setTimeout(function(){ HeroCoffinCanvas.resize(); }, 150);
  }

  /* ---------- contact form ---------- */
  function initContactForm(){
    const form = qs("#contact-form");
    if(!form) return;
    form.addEventListener("submit", e => {
      e.preventDefault();
      const name = qs("#cf-name"), email = qs("#cf-email"), phone = qs("#cf-phone"), msg = qs("#cf-message");
      let valid = true;
      if(!validateField(name, "required")) valid = false;
      if(!validateField(email, "email")) valid = false;
      if(!validateField(phone, "phone")) valid = false;
      if(!validateField(msg, "required")) valid = false;
      if(!valid){ showToast("Please complete the required fields.", "error"); return; }
      showToast("Message sent. We'll get back to you shortly.");
      form.reset();
    });
  }

  /* ---------- scroll progress bar element + particle canvas element (inject once) ---------- */
  function injectChrome(){
    if(!qs("#scroll-progress")){ document.body.appendChild(el("div")); document.body.lastChild.id = "scroll-progress"; }
    if(!qs("#particle-bg")){
      const c = document.createElement("canvas"); c.id = "particle-bg";
      document.body.insertBefore(c, document.body.firstChild);
    }
  }

  function init(){
    initLoader();
    injectChrome();
    renderCatalog();
    renderHowItWorks();
    renderFeatures();
    renderComparison();
    renderBenefits();
    initContactForm();
    initModal();
    initNav();
    initScrollReveal();
    initParticles("particle-bg");
    initCustomCursor();
    initHeroVisual();
    initHeroSwatches();
    playHeroEntrance();
    setTimeout(initScrollRotation, 300);
  }

  document.addEventListener("DOMContentLoaded", init);
})();