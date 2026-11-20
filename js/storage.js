/* ============================================================
   DesignYourTaol — Storage service layer
   Everything here runs on LocalStorage today. Each function is
   written as a "service" so a real backend can be dropped in
   later (see comments) without changing call sites.
   ============================================================ */

const DYT_KEYS = {
  CURRENT: "dyt_current_design",
  SAVED: "dyt_saved_designs",
  DESIGN_ID: "dyt_last_design_id"
};

/* ---------- Design reference / ID generator ---------- */
function generateDesignId(){
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 89999);
  const id = `DYT-${year}-${rand}`;
  try{ localStorage.setItem(DYT_KEYS.DESIGN_ID, id); }catch(e){ /* storage unavailable */ }
  return id;
}

/* ---------- Save / load current in-progress design ----------
   Later: replace body with `return fetch('/api/designs', {method:'POST', body: JSON.stringify(design)})`
------------------------------------------------------------- */
function saveDesign(design){
  try{
    const payload = Object.assign({}, design, { savedAt: new Date().toISOString() });
    localStorage.setItem(DYT_KEYS.CURRENT, JSON.stringify(payload));

    // also keep it in the saved-designs list, keyed by designId
    const list = getSavedDesignsList();
    const idx = list.findIndex(d => d.designId === payload.designId);
    if(idx >= 0){ list[idx] = payload; } else { list.unshift(payload); }
    localStorage.setItem(DYT_KEYS.SAVED, JSON.stringify(list.slice(0, 20)));

    return { ok:true, design: payload };
  }catch(e){
    console.error("saveDesign failed:", e);
    return { ok:false, error: e };
  }
}

function loadDesign(){
  try{
    const raw = localStorage.getItem(DYT_KEYS.CURRENT);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    console.error("loadDesign failed:", e);
    return null;
  }
}

function getSavedDesignsList(){
  try{
    const raw = localStorage.getItem(DYT_KEYS.SAVED);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
}

function clearCurrentDesign(){
  try{ localStorage.removeItem(DYT_KEYS.CURRENT); }catch(e){}
}

/* ---------- Quotation submission (front-end simulation) ----------
   Later: replace with `return fetch('/api/quotations', {...})`
------------------------------------------------------------- */
function submitQuotation(design){
  try{
    const ref = design.designId || generateDesignId();
    const record = Object.assign({}, design, { designId: ref, submittedAt: new Date().toISOString(), status: "submitted" });
    saveDesign(record);
    return { ok:true, reference: ref, design: record };
  }catch(e){
    console.error("submitQuotation failed:", e);
    return { ok:false, error: e };
  }
}

/* ---------- Product / option data getters ----------
   These already just return the mock arrays from data.js, but are
   wrapped as "services" so they can later become async API calls
   (e.g. `await getProducts()` hitting a real endpoint) without any
   call-site changes elsewhere in the app.
------------------------------------------------------------- */
function getProducts(){
  return coffinModels;
}

function getCustomizationOptions(){
  return {
    colors: colorOptions,
    materials: materialOptions,
    finishes: finishPresets,
    handles: handleOptions,
    decorations: decorationOptions,
    patterns: patternOptions,
    interiorColors: interiorColorOptions,
    interiorMaterials: interiorMaterialOptions,
    interiorStyles: interiorStyleOptions,
    accessories: accessoryOptions,
    textFonts: textFontOptions,
    textPositions: textPositionOptions
  };
}