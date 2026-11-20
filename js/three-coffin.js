/* ============================================================
   DesignYourTaol — Procedural Three.js coffin engine
   Builds a believable coffin/casket from primitive + extruded
   geometry (no external model required), and exposes an update
   API so customization controls can change the SAME live 3D
   object in real time (see section 15 / 68 of the brief).
   Exposed as `window.CoffinScene`.
   ============================================================ */

const CoffinScene = (function(){

  /* ---------- constants describing the base silhouette ---------- */
  const HALF_LENGTH = 1.0;
  const BODY_H = 0.34;
  const LID_H = 0.10;
  const PANEL_H = 0.035;
  const PLINTH_H = 0.06;

  const SHAPE_PRESETS = {
    classic:  { maxHalfWidth: 0.46, shoulder: 0.62 },
    tapered:  { maxHalfWidth: 0.40, shoulder: 0.55 }
  };

  /* ---------- module state ---------- */
  let canvasEl, container, renderer, scene, camera, controls;
  let cameraLight;
  let coffinGroup, plinthMesh, bodyMesh, lidPivot, lidSlab, lidPanel;
  let interiorMesh, pillowMesh, nameplateMesh, patternMesh, trimMesh, crossMesh, floralGroup, cornerGroup, emblemMesh;
  let handleMeshes = [];
  let bodyMaterial, lidMaterial, handleMaterial, interiorMaterial, pillowMaterial;
  let shapeState = SHAPE_PRESETS.classic;
  let animId = null;
  let idleTimer = null;
  let ready = false;
  let activeTweens = [];
  let lidAngle = 0; // radians, current
  let lidTargetState = "closed";
  let heroTiltX = 0, heroTiltY = 0;
  let targetHeroTiltX = 0, targetHeroTiltY = 0;
  let resizeObserver = null;

  const DEFAULT_CAM = { pos: [2.7, 1.95, 2.75], target: [0, 0.32, 0] };
  const VIEW_PRESETS = {
    front:    { pos: [0, 0.55, 3.3],   target: [0, 0.3, 0] },
    back:     { pos: [0, 0.55, -3.3],  target: [0, 0.3, 0] },
    left:     { pos: [-3.3, 0.55, 0],  target: [0, 0.3, 0] },
    right:    { pos: [3.3, 0.55, 0],   target: [0, 0.3, 0] },
    top:      { pos: [0.01, 3.6, 0.01],target: [0, 0.3, 0] },
    interior: { pos: [0.9, 2.1, 1.5],  target: [0.2, 0.4, 0] }
  };
  const LID_ANGLES = { closed: 0, slightly: -0.38, fully: -1.85 };

  /* ---------- small self-contained tween helper (no GSAP dependency) ---------- */
  function tween(opts){
    const { from, to, duration, onUpdate, onComplete, ease } = opts;
    const start = performance.now();
    const easeFn = ease || (t => 1 - Math.pow(1 - t, 3));
    const id = { cancelled: false };
    activeTweens.push(id);
    function frame(now){
      if(id.cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      const e = easeFn(t);
      const val = {};
      Object.keys(from).forEach(k => { val[k] = from[k] + (to[k] - from[k]) * e; });
      onUpdate(val);
      if(t < 1){ requestAnimationFrame(frame); }
      else{ if(onComplete) onComplete(); }
    }
    requestAnimationFrame(frame);
    return id;
  }

  /* ---------- outline / geometry builders ---------- */
  function taperProfile(t, shoulder){
    let w;
    if(t < shoulder){ w = Math.sin((t / shoulder) * Math.PI / 2); }
    else{ w = Math.cos(((t - shoulder) / (1 - shoulder)) * Math.PI / 2); }
    return 0.4 + 0.6 * w;
  }
  function halfWidthAt(t){ return shapeState.maxHalfWidth * taperProfile(t, shapeState.shoulder); }

  function buildOutlineShape(scale){
    scale = scale || 1;
    const ts = [0, 0.08, 0.18, 0.3, 0.45, 0.62, 0.78, 0.9, 1.0];
    const top = ts.map(t => new THREE.Vector2(
      (-HALF_LENGTH + t * 2 * HALF_LENGTH) * scale,
      halfWidthAt(t) * scale
    ));
    const bottom = ts.slice().reverse().map(t => new THREE.Vector2(
      (-HALF_LENGTH + t * 2 * HALF_LENGTH) * scale,
      -halfWidthAt(t) * scale
    ));
    const shape = new THREE.Shape();
    shape.moveTo(top[0].x, top[0].y);
    shape.splineThru(top.slice(1));
    shape.lineTo(bottom[0].x, bottom[0].y);
    shape.splineThru(bottom.slice(1));
    shape.closePath();
    return shape;
  }

  function buildFrameShape(outerScale, innerScale){
    const outer = buildOutlineShape(outerScale);
    const inner = buildOutlineShape(innerScale);
    const holePath = new THREE.Path();
    // inner shape points already form a closed curve; reuse via a THREE.Shape's getPoints
    const pts = inner.getPoints(40);
    holePath.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => holePath.lineTo(p.x, p.y));
    holePath.closePath();
    outer.holes.push(holePath);
    return outer;
  }

  function extrudeShape(shape, depth, bevel){
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: !!bevel,
      bevelThickness: bevel ? 0.014 : 0,
      bevelSize: bevel ? 0.01 : 0,
      bevelSegments: bevel ? 2 : 0,
      steps: 1,
      curveSegments: 14
    });
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }

  function disposeMesh(mesh){
    if(!mesh) return;
    if(mesh.geometry) mesh.geometry.dispose();
  }

  /* ---------- pattern / text canvas textures ---------- */
  function makePatternTexture(patternId){
    if(!patternId || patternId === "none") return null;
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "rgba(214,178,88,0.85)";
    ctx.fillStyle = "rgba(214,178,88,0.65)";
    ctx.lineWidth = 2;
    const w = c.width, h = c.height;

    function ring(x, y, r){ ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }

    if(patternId === "classic"){
      ctx.strokeRect(24, 24, w - 48, h - 48);
      ctx.beginPath(); ctx.moveTo(24, h/2); ctx.lineTo(w-24, h/2); ctx.stroke();
    } else if(patternId === "floral"){
      for(let i=0;i<10;i++){
        const x = 40 + (i % 5) * ((w-80)/4);
        const y = i < 5 ? 60 : h-60;
        ring(x,y,10); ring(x-14,y,6); ring(x+14,y,6); ring(x,y-14,6); ring(x,y+14,6);
      }
    } else if(patternId === "geometric"){
      const step = 48;
      for(let x = step; x < w; x += step){
        for(let y = step/2; y < h; y += step){
          ctx.beginPath();
          ctx.moveTo(x, y-14); ctx.lineTo(x+14, y); ctx.lineTo(x, y+14); ctx.lineTo(x-14, y); ctx.closePath();
          ctx.stroke();
        }
      }
    } else if(patternId === "royal"){
      ctx.beginPath();
      for(let x = 20; x < w; x += 60){
        ctx.moveTo(x, h/2);
        ctx.bezierCurveTo(x+15, h/2-40, x+45, h/2-40, x+60, h/2);
        ctx.bezierCurveTo(x+45, h/2+40, x+15, h/2+40, x, h/2);
      }
      ctx.stroke();
      ctx.strokeRect(16,16,w-32,h-32);
    } else if(patternId === "minimal"){
      ctx.beginPath(); ctx.moveTo(w*0.15, h/2); ctx.lineTo(w*0.85, h/2); ctx.stroke();
    } else if(patternId === "cross"){
      const step = 64;
      for(let x = step/2; x < w; x += step){
        for(let y = step/2; y < h; y += step){
          ctx.beginPath();
          ctx.moveTo(x-10,y); ctx.lineTo(x+10,y);
          ctx.moveTo(x,y-10); ctx.lineTo(x,y+10);
          ctx.stroke();
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function makeTextTexture(text, fontId){
    const c = document.createElement("canvas");
    c.width = 640; c.height = 160;
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);
    const fontMap = { elegant: "italic 58px Georgia, serif", classic: "52px Georgia, serif", modern: "600 52px Manrope, sans-serif" };
    ctx.font = fontMap[fontId] || fontMap.elegant;
    ctx.fillStyle = "rgba(230,238,240,0.92)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.slice(0, 28), c.width/2, c.height/2);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  /* ---------- scene construction ---------- */
  function buildFloor(){
    const floorGeo = new THREE.CircleGeometry(9, 64);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.2 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(16, 32, 0x666670, 0x383840);
    grid.position.y = 0.002;
    grid.material.transparent = true;
    grid.material.opacity = 0.16;
    scene.add(grid);
  }

  function buildLights(){
    const ambient = new THREE.HemisphereLight(0x607888, 0x080c10, 1.1);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xfff4e0, 2.2);
    key.position.set(3, 4.2, 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 12;
    key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0015;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xaec8d4, 0.65);
    fill.position.set(-3, 2, -2.4);
    scene.add(fill);

    const front = new THREE.DirectionalLight(0xfff6e0, 1.2);
    front.position.set(0.5, 1.2, 4);
    scene.add(front);

    const topFill = new THREE.DirectionalLight(0xffffff, 0.6);
    topFill.position.set(0, 5, 1);
    scene.add(topFill);

    const rim = new THREE.PointLight(0x00e676, 1.8, 8, 2);
    rim.position.set(-1.6, 1.1, -2.2);
    scene.add(rim);

    const rim2 = new THREE.PointLight(0x66ffb3, 0.9, 6, 2);
    rim2.position.set(1.8, 0.6, -1.6);
    scene.add(rim2);

    cameraLight = new THREE.PointLight(0xfff8f0, 1.4, 12, 1.5);
    scene.add(cameraLight);
  }

  function buildCoffin(){
    coffinGroup = new THREE.Group();
    coffinGroup.position.y = PLINTH_H;
    scene.add(coffinGroup);

    bodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0xf0ede8, emissive: 0x181818, roughness: 0.35, metalness: 0.0, clearcoat: 0.4, clearcoatRoughness: 0.4 });
    lidMaterial = bodyMaterial; // lid follows the same finish as the body by default
    handleMaterial = new THREE.MeshStandardMaterial({ color: 0x8a8f94, metalness: 0.5, roughness: 0.4 });
    interiorMaterial = new THREE.MeshStandardMaterial({ color: 0xe6d9bd, roughness: 0.55, metalness: 0.0, side: THREE.BackSide });
    pillowMaterial = new THREE.MeshStandardMaterial({ color: 0xe6d9bd, roughness: 0.8, metalness: 0.0 });

    rebuildStructure();
    buildHandles();
    buildDecorationMeshes();
    buildInteriorAndPillow();
  }

  function rebuildStructure(){
    // dispose old geometries (materials persist so live updates keep working)
    [plinthMesh, bodyMesh, lidSlab, lidPanel].forEach(disposeMesh);

    // plinth
    const plinthGeo = extrudeShape(buildOutlineShape(1.1), PLINTH_H, true);
    if(plinthMesh){ plinthMesh.geometry = plinthGeo; }
    else{
      plinthMesh = new THREE.Mesh(plinthGeo, new THREE.MeshStandardMaterial({ color: 0x0c1113, roughness: 0.6, metalness: 0.15 }));
      plinthMesh.castShadow = true; plinthMesh.receiveShadow = true;
      coffinGroup.add(plinthMesh);
    }
    plinthMesh.position.y = -PLINTH_H;

    // body
    const bodyGeo = extrudeShape(buildOutlineShape(1.0), BODY_H, true);
    if(bodyMesh){ bodyMesh.geometry = bodyGeo; }
    else{
      bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
      bodyMesh.castShadow = true; bodyMesh.receiveShadow = true;
      coffinGroup.add(bodyMesh);
    }

    // lid pivot (hinge at the head end, top of body)
    if(!lidPivot){
      lidPivot = new THREE.Object3D();
      coffinGroup.add(lidPivot);
    }
    lidPivot.position.set(HALF_LENGTH, BODY_H, 0);

    const slabGeo = extrudeShape(buildOutlineShape(1.03), LID_H, true);
    if(lidSlab){ lidSlab.geometry = slabGeo; }
    else{
      lidSlab = new THREE.Mesh(slabGeo, lidMaterial);
      lidSlab.castShadow = true; lidSlab.receiveShadow = true;
      lidSlab.position.set(-HALF_LENGTH, 0, 0);
      lidPivot.add(lidSlab);
    }

    const panelGeo = extrudeShape(buildOutlineShape(0.86), PANEL_H, true);
    if(lidPanel){ lidPanel.geometry = panelGeo; }
    else{
      lidPanel = new THREE.Mesh(panelGeo, lidMaterial);
      lidPanel.castShadow = true;
      lidPanel.position.set(-HALF_LENGTH, LID_H, 0);
      lidPivot.add(lidPanel);
    }

    positionDecorations();
    positionHandles();
  }

  function buildHandles(){
    const plateGeo = new THREE.BoxGeometry(0.2, 0.09, 0.012);
    const barGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.24, 12);
    const positions = [0.2, 0.5, 0.8];
    handleMeshes = [];
    [1, -1].forEach(side => {
      positions.forEach(t => {
        const plate = new THREE.Mesh(plateGeo, handleMaterial);
        const bar = new THREE.Mesh(barGeo, handleMaterial);
        bar.rotation.z = Math.PI / 2;
        plate.castShadow = true; bar.castShadow = true;
        coffinGroup.add(plate, bar);
        handleMeshes.push({ plate, bar, side, t });
      });
    });
    positionHandles();
  }

  function positionHandles(){
    handleMeshes.forEach(h => {
      const x = -HALF_LENGTH + h.t * 2 * HALF_LENGTH;
      const halfW = halfWidthAt(h.t);
      const z = h.side * (halfW + 0.02);
      const y = BODY_H * 0.55;
      h.plate.position.set(x, y, z);
      h.bar.position.set(x, y, z + h.side * 0.035);
    });
  }

  function buildDecorationMeshes(){
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.22 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xc7ccd1, metalness: 0.85, roughness: 0.2 });

    // cross
    const crossGroupLocal = new THREE.Group();
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.17, 0.018), goldMat);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.018), goldMat);
    hBar.position.y = 0.03;
    crossGroupLocal.add(vBar, hBar);
    crossGroupLocal.rotation.x = -Math.PI/2;
    crossGroupLocal.visible = false;
    crossMesh = crossGroupLocal;
    coffinGroup.add(crossMesh);

    // floral cluster
    floralGroup = new THREE.Group();
    const florMat = new THREE.MeshStandardMaterial({ color: 0xe9dfc8, roughness: 0.7 });
    for(let i=0;i<7;i++){
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.018 + Math.random()*0.012, 8, 8), florMat);
      const a = (i/7) * Math.PI * 2;
      s.position.set(Math.cos(a)*0.05, 0.01, Math.sin(a)*0.05);
      floralGroup.add(s);
    }
    floralGroup.visible = false;
    coffinGroup.add(floralGroup);

    // border / trim frame (shared mesh, material swapped between gold/silver)
    const frameGeo = extrudeShape(buildFrameShape(0.98, 0.9), 0.01, false);
    trimMesh = new THREE.Mesh(frameGeo, goldMat);
    trimMesh.userData.goldMat = goldMat;
    trimMesh.userData.silverMat = silverMat;
    trimMesh.visible = false;
    coffinGroup.add(trimMesh);

    // corner ornaments
    cornerGroup = new THREE.Group();
    const ornMat = goldMat;
    [[0.06,1],[0.06,-1],[0.94,1],[0.94,-1]].forEach(([t, side]) => {
      const o = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.045, 10), ornMat);
      const x = -HALF_LENGTH + t*2*HALF_LENGTH;
      const halfW = halfWidthAt(t) * 0.9;
      o.position.set(x, 0, side*halfW);
      cornerGroup.add(o);
    });
    cornerGroup.visible = false;
    coffinGroup.add(cornerGroup);

    // emblem
    emblemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 32), new THREE.MeshStandardMaterial({ color: 0xcbb26a, metalness: 0.7, roughness: 0.3 }));
    emblemMesh.visible = false;
    coffinGroup.add(emblemMesh);

    // pattern overlay plane
    const patGeo = new THREE.PlaneGeometry(2 * HALF_LENGTH * 0.82, 2 * shapeState.maxHalfWidth * 0.82);
    patternMesh = new THREE.Mesh(patGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false }));
    patternMesh.rotation.x = -Math.PI/2;
    patternMesh.visible = false;
    coffinGroup.add(patternMesh);

    // nameplate
    const npGeo = new THREE.PlaneGeometry(0.5, 0.125);
    nameplateMesh = new THREE.Mesh(npGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    nameplateMesh.rotation.x = -Math.PI/2;
    nameplateMesh.visible = false;
    coffinGroup.add(nameplateMesh);
  }

  function positionDecorations(){
    const lidTopY = BODY_H + LID_H + PANEL_H;
    if(crossMesh) crossMesh.position.set(0.1, lidTopY + 0.005, 0);
    if(floralGroup) floralGroup.position.set(-0.55, lidTopY + 0.005, 0);
    if(trimMesh) trimMesh.position.set(0, BODY_H + LID_H + 0.001, 0);
    if(cornerGroup) cornerGroup.position.set(0, lidTopY + 0.005, 0);
    if(emblemMesh) emblemMesh.position.set(0.1, lidTopY + 0.008, 0);
    if(patternMesh){
      patternMesh.geometry.dispose();
      patternMesh.geometry = new THREE.PlaneGeometry(2*HALF_LENGTH*0.8, 2*shapeState.maxHalfWidth*0.78);
      patternMesh.position.set(0, lidTopY + 0.003, 0);
    }
  }

  function buildInteriorAndPillow(){
    const interiorGeo = extrudeShape(buildOutlineShape(0.84), BODY_H*0.78, false);
    interiorMesh = new THREE.Mesh(interiorGeo, interiorMaterial);
    interiorMesh.position.y = BODY_H*0.05;
    coffinGroup.add(interiorMesh);

    pillowMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), pillowMaterial);
    pillowMesh.scale.set(1, 0.42, 0.65);
    pillowMesh.position.set(HALF_LENGTH*0.68, BODY_H*0.62, 0);
    pillowMesh.visible = false;
    pillowMesh.castShadow = true;
    coffinGroup.add(pillowMesh);
  }

  /* ---------- camera / controls ----------
     Self-contained pointer-based orbit controls (rotate / zoom / pan).
     Deliberately built in-house instead of depending on the external
     THREE.OrbitControls addon script: one less CDN file that can fail
     to load, and it gives full control over touch behaviour on mobile.
  ------------------------------------------------------------------- */
  function createSimpleControls(cam, dom, targetVec){
    const c = {
      target: targetVec.clone(),
      spherical: new THREE.Spherical(),
      sphericalDelta: new THREE.Spherical(0, 0, 0),
      minDistance: 2.0, maxDistance: 8.5,
      minPolarAngle: 0.06, maxPolarAngle: Math.PI * 0.94,
      autoRotate: true, autoRotateSpeed: 0.35,
      dampingFactor: 0.09,
      rotateSpeed: 1.0, panSpeed: 1.0
    };
    const listeners = { start: [], end: [] };
    c.addEventListener = (type, cb) => { if(listeners[type]) listeners[type].push(cb); };
    const fire = type => listeners[type].forEach(cb => cb());

    const pointers = new Map();
    let pinchDist = null, pinchMid = null;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const pos = e => ({ x: e.clientX, y: e.clientY });
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    function pan(dx, dy){
      const offset = new THREE.Vector3().copy(cam.position).sub(c.target);
      const targetDistance = offset.length() * Math.tan((cam.fov / 2) * Math.PI / 180);
      const panX = -2 * dx * targetDistance / (dom.clientHeight || 1) * c.panSpeed;
      const panY = 2 * dy * targetDistance / (dom.clientHeight || 1) * c.panSpeed;
      const xCol = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0).multiplyScalar(panX);
      const yCol = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1).multiplyScalar(panY);
      c.target.add(xCol).add(yCol);
    }
    function zoomSteps(steps){
      const offset = new THREE.Vector3().copy(cam.position).sub(c.target);
      const factor = Math.pow(0.95, steps);
      const newLen = clamp(offset.length() * factor, c.minDistance, c.maxDistance);
      offset.setLength(newLen);
      cam.position.copy(c.target).add(offset);
    }

    function onDown(e){
      try{ dom.setPointerCapture(e.pointerId); }catch(err){ /* ignore */ }
      pointers.set(e.pointerId, pos(e));
      if(pointers.size === 1){ fire("start"); }
      if(pointers.size === 2){
        const pts = Array.from(pointers.values());
        pinchDist = dist(pts[0], pts[1]);
        pinchMid = mid(pts[0], pts[1]);
      }
    }
    function onMove(e){
      if(!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      const cur = pos(e);
      pointers.set(e.pointerId, cur);

      if(pointers.size === 1){
        const isPan = e.buttons === 2;
        const dx = cur.x - prev.x, dy = cur.y - prev.y;
        if(isPan){
          pan(dx, dy);
        } else {
          const el = dom.clientWidth || 1, eh = dom.clientHeight || 1;
          c.sphericalDelta.theta -= (2 * Math.PI * dx / el) * c.rotateSpeed;
          c.sphericalDelta.phi -= (2 * Math.PI * dy / eh) * c.rotateSpeed;
        }
      } else if(pointers.size === 2){
        const pts = Array.from(pointers.values());
        const d = dist(pts[0], pts[1]);
        const m = mid(pts[0], pts[1]);
        if(pinchDist != null) zoomSteps((pinchDist - d) * 0.02);
        if(pinchMid != null) pan(m.x - pinchMid.x, m.y - pinchMid.y);
        pinchDist = d; pinchMid = m;
      }
    }
    function onUp(e){
      pointers.delete(e.pointerId);
      if(pointers.size === 0){ pinchDist = null; pinchMid = null; fire("end"); }
      else if(pointers.size < 2){ pinchDist = null; pinchMid = null; }
    }
    function onWheel(e){
      e.preventDefault();
      zoomSteps(e.deltaY * 0.01);
    }
    function onContextMenu(e){ e.preventDefault(); }

    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("contextmenu", onContextMenu);

    c.update = function(){
      // re-derive spherical state from the camera's ACTUAL current position first,
      // so external repositioning (preset views, zoom buttons) is always respected
      const offset = new THREE.Vector3().copy(cam.position).sub(c.target);
      c.spherical.setFromVector3(offset);

      if(c.autoRotate && pointers.size === 0){
        c.spherical.theta -= c.autoRotateSpeed * 0.012;
      }
      c.spherical.theta += c.sphericalDelta.theta;
      c.spherical.phi += c.sphericalDelta.phi;
      c.spherical.phi = clamp(c.spherical.phi, c.minPolarAngle, c.maxPolarAngle);
      c.spherical.makeSafe();

      c.sphericalDelta.theta *= (1 - c.dampingFactor);
      c.sphericalDelta.phi *= (1 - c.dampingFactor);

      const newOffset = new THREE.Vector3().setFromSpherical(c.spherical);
      cam.position.copy(c.target).add(newOffset);
      cam.lookAt(c.target);
    };

    c.dispose = function(){
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("contextmenu", onContextMenu);
    };

    return c;
  }

  function setupCamera(){
    if(typeof THREE === "undefined"){
      throw new Error("Three.js failed to load. Check your internet connection and reload.");
    }
    const rect = container.getBoundingClientRect();
    camera = new THREE.PerspectiveCamera(38, Math.max(rect.width,1) / Math.max(rect.height,1), 0.1, 60);
    camera.position.set(...DEFAULT_CAM.pos);

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(Math.max(rect.width, 1), Math.max(rect.height, 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    if(renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if(renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;

    canvasEl.style.touchAction = "none";
    canvasEl.style.cursor = "grab";

    controls = createSimpleControls(camera, renderer.domElement, new THREE.Vector3(...DEFAULT_CAM.target));
    controls.update();

    controls.addEventListener("start", () => {
      controls.autoRotate = false;
      canvasEl.style.cursor = "grabbing";
      if(idleTimer) clearTimeout(idleTimer);
    });
    controls.addEventListener("end", () => {
      canvasEl.style.cursor = "grab";
      if(idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { controls.autoRotate = true; }, 4500);
    });
  }

  function animate(){
    animId = requestAnimationFrame(animate);
    heroTiltX += (targetHeroTiltX - heroTiltX) * 0.07;
    heroTiltY += (targetHeroTiltY - heroTiltY) * 0.07;
    if(coffinGroup){
      coffinGroup.rotation.x = heroTiltX;
      coffinGroup.rotation.y = heroTiltY;
    }
    if(controls) controls.update();
    if(cameraLight && camera) cameraLight.position.copy(camera.position);
    if(renderer && scene && camera) renderer.render(scene, camera);
  }

  function handleResize(){
    if(!container || !renderer || !camera) return;
    const rect = container.getBoundingClientRect();
    if(rect.width < 2 || rect.height < 2) return;
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height);
  }

  /* ---------- public update API ---------- */
  function setColor(hex){
    if(!bodyMaterial) return;
    bodyMaterial.color.set(hex);
    const col = new THREE.Color(hex);
    bodyMaterial.emissive.set(col).multiplyScalar(0.08);
  }
  function setMaterialProps(props){
    if(!bodyMaterial) return;
    if(typeof props.roughness === "number") bodyMaterial.userData.baseRoughness = props.roughness;
    if(typeof props.metalness === "number") bodyMaterial.metalness = props.metalness;
    applyGloss(bodyMaterial.userData.glossLevel || 0);
  }
  function applyGloss(level){
    if(!bodyMaterial) return;
    bodyMaterial.userData.glossLevel = level;
    const base = bodyMaterial.userData.baseRoughness != null ? bodyMaterial.userData.baseRoughness : 0.45;
    bodyMaterial.roughness = Math.max(0.04, base * (1 - (level/100) * 0.75));
    bodyMaterial.clearcoat = level/100;
    bodyMaterial.clearcoatRoughness = Math.max(0.04, 1 - (level/100) * 0.85);
  }
  function setGloss(level){ applyGloss(level); }

  function setHandles(props){
    if(!handleMaterial) return;
    handleMaterial.color.set(props.color);
    handleMaterial.metalness = props.metalness;
    handleMaterial.roughness = props.roughness;
  }

  function setDecoration(id, on){
    switch(id){
      case "cross": if(crossMesh) crossMesh.visible = on; break;
      case "floral": if(floralGroup) floralGroup.visible = on; break;
      case "border": if(trimMesh){ trimMesh.material = trimMesh.userData.silverMat; trimMesh.visible = on || trimMesh.visible; if(on) trimMesh.visible = true; else if(!getAnyTrimActive()) trimMesh.visible = false; } break;
      case "gold-trim":
        if(trimMesh){ if(on){ trimMesh.material = trimMesh.userData.goldMat; trimMesh.visible = true; } else if(!getAnyTrimActive()){ trimMesh.visible = false; } }
        break;
      case "silver-trim":
        if(trimMesh){ if(on){ trimMesh.material = trimMesh.userData.silverMat; trimMesh.visible = true; } else if(!getAnyTrimActive()){ trimMesh.visible = false; } }
        break;
      case "corner-ornament": if(cornerGroup) cornerGroup.visible = on; break;
      case "emblem": if(emblemMesh) emblemMesh.visible = on; break;
    }
  }
  let trimState = { "gold-trim": false, "silver-trim": false, border: false };
  function getAnyTrimActive(){ return trimState["gold-trim"] || trimState["silver-trim"] || trimState.border; }
  function setDecorationState(id, on){
    if(id in trimState) trimState[id] = on;
    setDecoration(id, on);
  }

  function setPattern(patternId){
    const tex = makePatternTexture(patternId);
    if(!patternMesh) return;
    if(tex){
      patternMesh.material.map = tex;
      patternMesh.material.needsUpdate = true;
      patternMesh.visible = true;
    } else {
      patternMesh.visible = false;
    }
  }

  function setInteriorColor(hex){ if(interiorMaterial){ interiorMaterial.color.set(hex); } if(pillowMaterial){ pillowMaterial.color.set(hex); } }
  function setInteriorMaterialProps(props){ if(interiorMaterial && typeof props.roughness === "number") interiorMaterial.roughness = props.roughness; }
  function setPillow(on){ if(pillowMesh) pillowMesh.visible = on; }

  function setText(text, fontId, positionId){
    if(!nameplateMesh) return;
    if(!text){ nameplateMesh.visible = false; return; }
    const tex = makeTextTexture(text, fontId);
    nameplateMesh.material.map = tex;
    nameplateMesh.material.needsUpdate = true;
    nameplateMesh.visible = true;
    const lidTopY = BODY_H + LID_H + PANEL_H + 0.006;
    let x = 0.1;
    if(positionId === "top") x = 0.55;
    else if(positionId === "bottom") x = -0.5;
    nameplateMesh.position.set(x, lidTopY, 0);
  }

  function setLid(state){
    lidTargetState = state;
    const targetAngle = LID_ANGLES[state] != null ? LID_ANGLES[state] : 0;
    const startAngle = lidAngle;
    tween({
      from: { a: startAngle }, to: { a: targetAngle }, duration: 1100,
      ease: t => t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2,
      onUpdate: v => { lidAngle = v.a; if(lidPivot) lidPivot.rotation.z = v.a; }
    });
  }

  function setModel(shapeKey){
    shapeState = SHAPE_PRESETS[shapeKey] || SHAPE_PRESETS.classic;
    rebuildStructure();
  }

  function flyTo(preset, duration){
    if(!camera || !controls) return;
    controls.autoRotate = false;
    if(idleTimer) clearTimeout(idleTimer);
    const from = { x: camera.position.x, y: camera.position.y, z: camera.position.z, tx: controls.target.x, ty: controls.target.y, tz: controls.target.z };
    const to = { x: preset.pos[0], y: preset.pos[1], z: preset.pos[2], tx: preset.target[0], ty: preset.target[1], tz: preset.target[2] };
    tween({
      from, to, duration: duration || 900,
      ease: t => 1 - Math.pow(1 - t, 3),
      onUpdate: v => {
        camera.position.set(v.x, v.y, v.z);
        controls.target.set(v.tx, v.ty, v.tz);
      },
      onComplete: () => { idleTimer = setTimeout(() => { controls.autoRotate = true; }, 4500); }
    });
  }
  function setView(name){
    const preset = VIEW_PRESETS[name];
    if(!preset) return;
    if(name === "interior" && lidTargetState === "closed") setLid("fully");
    flyTo(preset);
  }
  function resetView(){ flyTo(DEFAULT_CAM, 900); }

  function zoomBy(delta){
    if(!camera || !controls) return;
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
    const dist = dir.length();
    const newDist = Math.min(controls.maxDistance, Math.max(controls.minDistance, dist + delta));
    dir.setLength(newDist);
    camera.position.copy(controls.target).add(dir);
  }

  function setHeroMouseTilt(nx, ny){
    targetHeroTiltX = ny * 0.18;
    targetHeroTiltY = nx * 0.3;
  }

  function setAutoRotate(on){
    if(controls) controls.autoRotate = on;
  }

  function toggleFullscreen(){
    if(!document.fullscreenElement){
      if(container.requestFullscreen) container.requestFullscreen();
      return true;
    } else {
      if(document.exitFullscreen) document.exitFullscreen();
      return false;
    }
  }

  /* ---------- lifecycle ---------- */
  function init(containerEl, canvas, opts){
    opts = opts || {};
    container = containerEl;
    canvasEl = canvas;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4a4a52);
    scene.fog = new THREE.Fog(0x4a4a52, 14, 30);

    setupCamera();
    buildLights();
    buildFloor();
    buildCoffin();

    window.addEventListener("resize", handleResize);
    document.addEventListener("fullscreenchange", handleResize);
    if(window.ResizeObserver){
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(container);
    }

    animate();
    ready = true;
    if(opts.onReady) opts.onReady();
  }

  function destroy(){
    if(animId) cancelAnimationFrame(animId);
    activeTweens.forEach(t => t.cancelled = true);
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("fullscreenchange", handleResize);
    if(resizeObserver) resizeObserver.disconnect();
    if(controls && controls.dispose) controls.dispose();
    if(idleTimer) clearTimeout(idleTimer);
    ready = false;
  }

  return {
    init, destroy, handleResize,
    setColor, setMaterialProps, setGloss, setHandles,
    setDecoration: setDecorationState, setPattern,
    setInteriorColor, setInteriorMaterialProps, setPillow,
    setText, setLid, setModel,
    setView, resetView, zoomBy, toggleFullscreen,
    setHeroMouseTilt, setAutoRotate,
    isReady: () => ready
  };
})();