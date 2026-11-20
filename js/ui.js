/* ============================================================
   DesignYourTaol — Shared UI utilities
   Navigation, toasts, modals, particle background, custom cursor,
   scroll reveal, and a number-counting animation helper.
   Exposed on `window.DYT_UI` so every page can reuse it.
   ============================================================ */

(function(){
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Toasts ---------------- */
  function ensureToastStack(){
    let stack = document.querySelector(".toast-stack");
    if(!stack){
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    return stack;
  }

  function showToast(message, type){
    const stack = ensureToastStack();
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.innerHTML = `<span class="dot"></span><span>${message}</span>`;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    const life = 3200;
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 450);
    }, life);
  }

  /* ---------------- Modals ---------------- */
  function openModal(id){
    const modal = document.getElementById(id);
    if(!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    const focusable = modal.querySelector("button, input, [tabindex]");
    if(focusable) focusable.focus({ preventScroll:true });
  }
  function closeModal(id){
    const modal = document.getElementById(id);
    if(!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function initModalDismissers(){
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
      backdrop.addEventListener("click", e => {
        if(e.target === backdrop) closeModal(backdrop.id);
      });
      backdrop.querySelectorAll("[data-close-modal]").forEach(btn => {
        btn.addEventListener("click", () => closeModal(backdrop.id));
      });
    });
    document.addEventListener("keydown", e => {
      if(e.key === "Escape"){
        document.querySelectorAll(".modal-backdrop.open").forEach(b => closeModal(b.id));
      }
    });
  }

  /* ---------------- Navigation ---------------- */
  function initNav(){
    const nav = document.querySelector(".nav");
    if(!nav) return;
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");

    const onScroll = () => {
      if(window.scrollY > 30) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
      updateScrollProgress();
      updateActiveLink();
    };
    window.addEventListener("scroll", onScroll, { passive:true });
    onScroll();

    if(toggle && links){
      toggle.addEventListener("click", () => {
        links.classList.toggle("open");
        toggle.setAttribute("aria-expanded", links.classList.contains("open") ? "true" : "false");
      });
      links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => links.classList.remove("open")));
    }

    // smooth scroll for in-page anchors
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener("click", e => {
        const targetId = a.getAttribute("href");
        if(targetId.length > 1){
          const target = document.querySelector(targetId);
          if(target){
            e.preventDefault();
            target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
          }
        }
      });
    });
  }

  function updateActiveLink(){
    const links = document.querySelectorAll(".nav-links a[href^='#']");
    if(!links.length) return;
    let currentId = null;
    links.forEach(link => {
      const sec = document.querySelector(link.getAttribute("href"));
      if(sec){
        const rect = sec.getBoundingClientRect();
        if(rect.top <= 140 && rect.bottom >= 140) currentId = link.getAttribute("href");
      }
    });
    links.forEach(link => link.classList.toggle("active", link.getAttribute("href") === currentId));
  }

  function updateScrollProgress(){
    const bar = document.getElementById("scroll-progress");
    if(!bar) return;
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    bar.style.width = (isFinite(scrolled) ? scrolled : 0) + "%";
  }

  /* ---------------- Scroll reveal ---------------- */
  function initScrollReveal(){
    const targets = document.querySelectorAll(".reveal, .reveal-stagger");
    if(!targets.length) return;
    if(reduceMotion){
      targets.forEach(t => t.classList.add("in-view"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    targets.forEach(t => io.observe(t));
  }

  /* ---------------- Particle background ---------------- */
  function initParticles(canvasId){
    const canvas = document.getElementById(canvasId || "particle-bg");
    if(!canvas || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    let w, h, particles;

    function resize(){
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    function makeParticles(){
      const count = Math.min(70, Math.floor((w * h) / 26000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.4,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        a: Math.random() * 0.5 + 0.15
      }));
    }
    function tick(){
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if(p.x < 0) p.x = w; if(p.x > w) p.x = 0;
        if(p.y < 0) p.y = h; if(p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(102,255,179,${p.a})`;
        ctx.fill();
      });
      requestAnimationFrame(tick);
    }
    resize(); makeParticles();
    window.addEventListener("resize", () => { resize(); makeParticles(); });
    tick();
  }

  /* ---------------- Custom cursor (desktop only) ---------------- */
  function initCustomCursor(){
    if(reduceMotion) return;
    if(window.matchMedia && window.matchMedia("(hover: none)").matches) return;
    if(window.innerWidth < 900) return;

    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add("has-custom-cursor");

    let mx = 0, my = 0, rx = 0, ry = 0;
    window.addEventListener("mousemove", e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    });
    function loop(){
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    }
    loop();

    document.addEventListener("mouseover", e => {
      if(e.target.closest && e.target.closest("a, button, .swatch, .opt-chip, input, .coffin-card")){
        ring.classList.add("hover");
      }
    });
    document.addEventListener("mouseout", e => {
      if(e.target.closest && e.target.closest("a, button, .swatch, .opt-chip, input, .coffin-card")){
        ring.classList.remove("hover");
      }
    });
  }

  /* ---------------- Number counting animation ---------------- */
  function animateNumber(el, from, to, opts){
    opts = opts || {};
    const duration = opts.duration || 600;
    const prefix = opts.prefix || "";
    const format = opts.format || (n => Math.round(n).toLocaleString("en-PH"));
    if(reduceMotion){
      el.textContent = prefix + format(to);
      return;
    }
    const start = performance.now();
    function frame(now){
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const val = from + (to - from) * eased;
      el.textContent = prefix + format(val);
      if(t < 1) requestAnimationFrame(frame);
      else el.textContent = prefix + format(to);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- Form validation helper ---------------- */
  function validateField(input, rule){
    const wrap = input.closest(".field");
    const value = input.value.trim();
    let valid = true;
    if(rule === "required") valid = value.length > 0;
    if(rule === "email") valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if(rule === "phone") valid = value.length === 0 || /^[0-9+\-\s()]{7,}$/.test(value);
    if(wrap) wrap.classList.toggle("error", !valid);
    return valid;
  }

  window.DYT_UI = {
    showToast, openModal, closeModal, initModalDismissers,
    initNav, initScrollReveal, initParticles, initCustomCursor,
    animateNumber, validateField, reduceMotion
  };
})();