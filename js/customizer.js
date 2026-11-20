/* ============================================================
   DesignYourTaol — Customization Studio controller
   Centralized state -> 3D update -> price -> summary -> UI,
   exactly following the flow described in the brief (section 55).
   ============================================================ */

(function(){
  const { showToast, openModal, closeModal, initModalDismissers, animateNumber, reduceMotion } = window.DYT_UI;

  const qs = (s, r) => (r || document).querySelector(s);
  const qsa = (s, r) => Array.from((r || document).querySelectorAll(s));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; };
  const fmtPeso = n => "\u20B1" + Math.round(n).toLocaleString("en-PH");

  const FINISH_FEE = { premium: 3000, glossy: 1500, standard: 0 };
  const STEP_NAMES = ["Model", "Appearance", "Details", "Interior", "Review"];

  /* ---------- central state ---------- */
  let state = defaultState();
  let currentStep = 0;
  let maxStepReached = 0;

  function defaultState(model){
    model = model || coffinModels[0];
    return {
      designId: null,
      designName: "My Custom Coffin",
      modelId: model.id,
      colorId: model.defaultColor,
      customHex: null,
      materialId: materialOptions[0].id,
      glossLevel: 45,
      handleId: "classic",
      decorations: {},
      patternId: "none",
      interior: { colorId: "cream", materialId: "satin", styleId: "classic", pillow: false },
      accessories: {},
      text: { value: "", fontId: "elegant", positionId: "center" },
      lidState: "closed",
      changes: 0,
      _touched: { model:false, color:false, material:false, handles:false, interior:false }
    };
  }

  /* ---------- lookups ---------- */
  const find = (arr, id) => arr.find(o => o.id === id);
  const modelName = id => (find(coffinModels, id) || {}).name || "\u2014";
  const colorName = id => (find(colorOptions, id) || {}).name || "\u2014";
  const materialName = id => (find(materialOptions, id) || {}).name || "\u2014";
  const handleName = id => (find(handleOptions, id) || {}).name || "\u2014";
  const interiorColorName = id => (find(interiorColorOptions, id) || {}).name || "\u2014";
  const interiorMaterialName = id => (find(interiorMaterialOptions, id) || {}).name || "\u2014";

  function markTouched(key){ state._touched[key] = true; }
  function bump(){ state.changes++; }

  /* ============================================================
     RENDER CONTROLS (built from data.js so markup stays in sync)
     ============================================================ */
  function renderModelOptions(){
    const wrap = qs("#model-options"); if(!wrap) return;
    wrap.innerHTML = "";
    coffinModels.forEach(m => {
      const chip = el("button", "opt-chip" + (m.id === state.modelId ? " active" : ""));
      chip.type = "button";
      chip.innerHTML = `<span>${m.name}</span><span class="opt-price">${m.material} \u00b7 ${fmtPeso(m.price)}</span>`;
      chip.addEventListener("click", () => selectModel(m.id));
      wrap.appendChild(chip);
    });
  }

  function getColorHex(st){
    if(st.colorId === "custom" && st.customHex) return st.customHex;
    return (find(colorOptions, st.colorId) || colorOptions[0]).hex;
  }

  function renderColorSwatches(){
    const wrap = qs("#color-swatches"); if(!wrap) return;
    wrap.innerHTML = "";

    const GROUPS = ["Classic", "Wood", "Metallic", "Tones"];
    GROUPS.forEach(group => {
      const colors = colorOptions.filter(c => c.group === group);
      const groupEl = el("div", "color-group");
      groupEl.appendChild(el("div", "color-group-label", group));
      const row = el("div", "swatch-row");
      colors.forEach(c => {
        const item = el("div", "swatch-item");
        const sw = el("button", "swatch" + (c.id === state.colorId ? " active" : ""));
        sw.type = "button";
        sw.style.background = c.hex;
        sw.setAttribute("aria-label", c.name);
        sw.title = c.name;
        sw.addEventListener("click", () => {
          state.colorId = c.id; markTouched("color"); bump();
          CoffinScene.setColor(c.hex);
          showToast(c.name + " selected");
          renderColorSwatches(); updateAll();
        });
        item.appendChild(sw);
        item.appendChild(el("span", "swatch-label", c.name));
        row.appendChild(item);
      });
      groupEl.appendChild(row);
      wrap.appendChild(groupEl);
    });

    /* ---- custom free-pick section ---- */
    const customGroup = el("div", "color-group");
    customGroup.appendChild(el("div", "color-group-label", "Custom Color"));

    const pickerRow = el("div", "color-picker-row");

    /* hidden native color input */
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = state.customHex || "#00e676";
    colorInput.className = "native-color-input";

    /* preview circle */
    const previewItem = el("div", "swatch-item");
    const previewSw = el("button", "swatch custom-pick-swatch" + (state.colorId === "custom" ? " active" : ""));
    previewSw.type = "button";
    previewSw.title = "Choose any color";
    previewSw.setAttribute("aria-label", "Choose custom color");
    previewSw.style.background = state.colorId === "custom" && state.customHex
      ? state.customHex
      : "conic-gradient(red,#ff0 60deg,lime 120deg,cyan 180deg,blue 240deg,magenta 300deg,red)";
    previewSw.appendChild(colorInput);
    previewSw.addEventListener("click", () => colorInput.click());

    colorInput.addEventListener("input", e => {
      const hex = e.target.value;
      state.customHex = hex; state.colorId = "custom";
      markTouched("color"); bump();
      CoffinScene.setColor(hex);
      previewSw.style.background = hex;
      previewSw.classList.add("active");
      hexInp.value = hex.replace("#","");
      updateAll();
    });

    previewItem.appendChild(previewSw);
    previewItem.appendChild(el("span", "swatch-label", "Pick"));
    pickerRow.appendChild(previewItem);

    /* hex text input */
    const hexWrap = el("div", "hex-input-wrap");
    const hashLabel = el("span", "hex-hash", "#");
    const hexInp = document.createElement("input");
    hexInp.type = "text"; hexInp.className = "hex-input";
    hexInp.maxLength = 6; hexInp.placeholder = "hex code";
    hexInp.spellcheck = false;
    if(state.colorId === "custom" && state.customHex) hexInp.value = state.customHex.replace("#","");

    hexInp.addEventListener("input", e => {
      const raw = e.target.value.replace(/[^0-9a-fA-F]/g,"").slice(0,6);
      e.target.value = raw;
      if(raw.length === 6){
        const hex = "#" + raw;
        state.customHex = hex; state.colorId = "custom";
        markTouched("color"); bump();
        CoffinScene.setColor(hex);
        previewSw.style.background = hex;
        previewSw.classList.add("active");
        colorInput.value = hex;
        updateAll();
      }
    });

    hexWrap.appendChild(hashLabel);
    hexWrap.appendChild(hexInp);
    pickerRow.appendChild(hexWrap);

    customGroup.appendChild(pickerRow);
    wrap.appendChild(customGroup);
  }

  function renderMaterialChips(){
    const wrap = qs("#material-chips"); if(!wrap) return;
    wrap.innerHTML = "";
    materialOptions.forEach(m => {
      const chip = el("button", "opt-chip" + (m.id === state.materialId ? " active" : ""));
      chip.type = "button";
      chip.innerHTML = `<span>${m.name}</span><span class="opt-price">+${fmtPeso(m.price)}</span>`;
      chip.addEventListener("click", () => {
        state.materialId = m.id; markTouched("material"); bump();
        CoffinScene.setMaterialProps({ roughness: m.roughness, metalness: m.metalness });
        showToast("Material changed");
        renderMaterialChips(); updateAll();
      });
      wrap.appendChild(chip);
    });
  }

  function renderFinishPresets(){
    const wrap = qs("#finish-presets"); if(!wrap) return;
    wrap.innerHTML = "";
    finishPresets.forEach(f => {
      const p = el("button", "pill-opt" + (Math.abs(f.gloss - state.glossLevel) < 3 ? " active" : ""), f.name);
      p.type = "button";
      p.addEventListener("click", () => { setGloss(f.gloss); });
      wrap.appendChild(p);
    });
  }

  function setGloss(level){
    state.glossLevel = level; bump();
    CoffinScene.setGloss(level);
    const range = qs("#gloss-range"); if(range) range.value = level;
    const val = qs("#gloss-value"); if(val) val.textContent = Math.round(level) + "%";
    renderFinishPresets();
    updateAll();
  }

  function renderHandleChips(){
    const wrap = qs("#handle-chips"); if(!wrap) return;
    wrap.innerHTML = "";
    handleOptions.forEach(h => {
      const chip = el("button", "opt-chip" + (h.id === state.handleId ? " active" : ""));
      chip.type = "button";
      chip.innerHTML = `<span>${h.name}</span><span class="opt-price">${h.price ? "+"+fmtPeso(h.price) : "Included"}</span>`;
      chip.addEventListener("click", () => {
        state.handleId = h.id; markTouched("handles"); bump();
        CoffinScene.setHandles({ color: h.color, metalness: h.metalness, roughness: h.roughness });
        showToast("Handles updated");
        renderHandleChips(); updateAll();
      });
      wrap.appendChild(chip);
    });
  }

  function renderDecorationToggles(){
    const wrap = qs("#decoration-toggles"); if(!wrap) return;
    wrap.innerHTML = "";
    decorationOptions.forEach(d => {
      wrap.appendChild(buildToggleRow(d.id, d.name, d.price, !!state.decorations[d.id], checked => {
        state.decorations[d.id] = checked; bump();
        CoffinScene.setDecoration(d.id, checked);
        showToast(checked ? "Decoration added" : "Decoration removed");
        updateAll();
      }));
    });
  }

  function renderPatternChips(){
    const wrap = qs("#pattern-chips"); if(!wrap) return;
    wrap.innerHTML = "";
    patternOptions.forEach(p => {
      const chip = el("button", "opt-chip" + (p.id === state.patternId ? " active" : ""), `<span>${p.name}</span>`);
      chip.type = "button";
      chip.addEventListener("click", () => {
        state.patternId = p.id; bump();
        CoffinScene.setPattern(p.id);
        showToast("Pattern applied");
        renderPatternChips(); updateAll();
      });
      wrap.appendChild(chip);
    });
  }

  function renderInteriorControls(){
    const colorWrap = qs("#interior-color-swatches");
    if(colorWrap){
      colorWrap.innerHTML = "";
      interiorColorOptions.forEach(c => {
        const item = el("div", "swatch-item");
        const sw = el("button", "swatch" + (c.id === state.interior.colorId ? " active" : ""));
        sw.type = "button"; sw.style.background = c.hex; sw.title = c.name;
        sw.addEventListener("click", () => {
          state.interior.colorId = c.id; markTouched("interior"); bump();
          CoffinScene.setInteriorColor(c.hex);
          renderInteriorControls(); updateAll();
        });
        item.appendChild(sw); item.appendChild(el("span", "swatch-label", c.name));
        colorWrap.appendChild(item);
      });
    }
    const matWrap = qs("#interior-material-chips");
    if(matWrap){
      matWrap.innerHTML = "";
      interiorMaterialOptions.forEach(m => {
        const chip = el("button", "opt-chip" + (m.id === state.interior.materialId ? " active" : ""));
        chip.type = "button";
        chip.innerHTML = `<span>${m.name}</span><span class="opt-price">+${fmtPeso(m.price)}</span>`;
        chip.addEventListener("click", () => {
          state.interior.materialId = m.id; markTouched("interior"); bump();
          CoffinScene.setInteriorMaterialProps({ roughness: m.roughness });
          showToast("Interior updated");
          renderInteriorControls(); updateAll();
        });
        matWrap.appendChild(chip);
      });
    }
    const styleWrap = qs("#interior-style-pills");
    if(styleWrap){
      styleWrap.innerHTML = "";
      interiorStyleOptions.forEach(s => {
        const p = el("button", "pill-opt" + (s.id === state.interior.styleId ? " active" : ""), s.name);
        p.type = "button";
        p.addEventListener("click", () => { state.interior.styleId = s.id; bump(); renderInteriorControls(); updateAll(); });
        styleWrap.appendChild(p);
      });
    }
    const pillowWrap = qs("#pillow-toggle-wrap");
    if(pillowWrap){
      pillowWrap.innerHTML = "";
      pillowWrap.appendChild(buildToggleRow("pillow-interior", "Pillow", null, state.interior.pillow, checked => {
        state.interior.pillow = checked; bump();
        CoffinScene.setPillow(checked);
        syncAccessoryToggleUI();
        updateAll();
      }));
    }
  }

  function renderAccessoryToggles(){
    const wrap = qs("#accessory-toggles"); if(!wrap) return;
    wrap.innerHTML = "";
    accessoryOptions.forEach(a => {
      const checked = a.id === "pillow" ? state.interior.pillow : !!state.accessories[a.id];
      const row = buildToggleRow("acc-" + a.id, a.name, a.price, checked, isOn => {
        if(a.id === "pillow"){
          state.interior.pillow = isOn;
          CoffinScene.setPillow(isOn);
          renderInteriorControls();
        } else {
          state.accessories[a.id] = isOn;
          if(a.id === "cross-acc") CoffinScene.setDecoration("cross", isOn || !!state.decorations.cross);
          if(a.id === "flowers") CoffinScene.setDecoration("floral", isOn || !!state.decorations.floral);
          if(a.id === "corners") CoffinScene.setDecoration("corner-ornament", isOn || !!state.decorations["corner-ornament"]);
        }
        bump();
        showToast(isOn ? "Accessory added" : "Accessory removed");
        updateAll();
      });
      wrap.appendChild(row);
    });
  }
  function syncAccessoryToggleUI(){ renderAccessoryToggles(); }

  function buildToggleRow(id, name, price, checked, onChange){
    const row = el("div", "toggle-row");
    const info = el("div", "t-info");
    info.appendChild(el("span", "t-name", name));
    if(price) info.appendChild(el("span", "t-price", "+" + fmtPeso(price)));
    const label = el("label", "switch");
    const input = el("input"); input.type = "checkbox"; input.checked = checked; input.id = "tg-" + id;
    const track = el("span", "track");
    label.appendChild(input); label.appendChild(track);
    input.addEventListener("change", () => onChange(input.checked));
    row.appendChild(info); row.appendChild(label);
    return row;
  }

  function renderTextControls(){
    const input = qs("#text-input");
    if(input && input.value !== state.text.value) input.value = state.text.value;
    const fontWrap = qs("#text-font-pills");
    if(fontWrap){
      fontWrap.innerHTML = "";
      textFontOptions.forEach(f => {
        const p = el("button", "pill-opt" + (f.id === state.text.fontId ? " active" : ""), f.name);
        p.type = "button";
        p.addEventListener("click", () => { state.text.fontId = f.id; bump(); applyText(); renderTextControls(); updateAll(); });
        fontWrap.appendChild(p);
      });
    }
    const posWrap = qs("#text-position-pills");
    if(posWrap){
      posWrap.innerHTML = "";
      textPositionOptions.forEach(p2 => {
        const p = el("button", "pill-opt" + (p2.id === state.text.positionId ? " active" : ""), p2.name);
        p.type = "button";
        p.addEventListener("click", () => { state.text.positionId = p2.id; bump(); applyText(); renderTextControls(); updateAll(); });
        posWrap.appendChild(p);
      });
    }
    const count = qs("#char-count");
    if(count) count.textContent = state.text.value.length + " / 28";
  }
  function applyText(){ CoffinScene.setText(state.text.value, state.text.fontId, state.text.positionId); }

  function renderLidPills(){
    const wrap = qs("#lid-state-pills"); if(!wrap) return;
    wrap.innerHTML = "";
    [["closed","Closed"],["slightly","Slightly Open"],["fully","Fully Open"]].forEach(([id,label]) => {
      const p = el("button", "pill-opt" + (id === state.lidState ? " active" : ""), label);
      p.type = "button";
      p.addEventListener("click", () => {
        state.lidState = id; bump();
        CoffinScene.setLid(id);
        renderLidPills(); updateAll();
      });
      wrap.appendChild(p);
    });
  }

  /* ============================================================
     MODEL SELECTION
     ============================================================ */
  function selectModel(modelId){
    const model = find(coffinModels, modelId);
    if(!model){ showToast("Please select a coffin model first.", "error"); return; }
    state.modelId = modelId; markTouched("model"); bump();
    // apply model defaults on first switch of a fresh design
    state.colorId = model.defaultColor;
    CoffinScene.setModel(model.shape);
    CoffinScene.setColor(getColorHex(state));
    showToast(model.name + " selected");
    renderModelOptions(); renderColorSwatches(); updateAll();
  }

  /* ============================================================
     PRICE / SUMMARY / COMPLETION
     ============================================================ */
  function computePrice(){
    const base = getBasePrice(state.modelId);
    const material = (find(materialOptions, state.materialId) || {}).price || 0;
    const finishKey = state.glossLevel >= 80 ? "premium" : state.glossLevel >= 50 ? "glossy" : "standard";
    const finish = FINISH_FEE[finishKey];
    const handles = (find(handleOptions, state.handleId) || {}).price || 0;
    const decorations = decorationOptions.reduce((sum,d) => sum + (state.decorations[d.id] ? d.price : 0), 0);
    const interiorMat = (find(interiorMaterialOptions, state.interior.materialId) || {}).price || 0;
    const interior = interiorMat + (state.interior.pillow ? 800 : 0);
    const accessories = accessoryOptions.reduce((sum,a) => a.id === "pillow" ? sum : sum + (state.accessories[a.id] ? a.price : 0), 0);
    const total = base + material + finish + handles + decorations + interior + accessories;
    return { base, material, finish, finishKey, handles, decorations, interior, accessories, total };
  }

  let lastTotal = null;
  function renderPrice(){
    const p = computePrice();
    const rows = qs("#price-breakdown");
    if(rows){
      rows.innerHTML = "";
      const addRow = (label, val, isBase) => {
        const row = el("div", "price-row" + (isBase ? " base" : ""));
        row.innerHTML = `<span>${label}</span><span class="val">${isBase ? fmtPeso(val) : (val ? "+"+fmtPeso(val) : "\u2014")}</span>`;
        rows.appendChild(row);
      };
      addRow("Base Coffin (" + modelName(state.modelId) + ")", p.base, true);
      addRow("Material \u2014 " + materialName(state.materialId), p.material);
      if(p.finish) addRow("Finish \u2014 " + (p.finishKey === "premium" ? "Premium Polish" : "Glossy"), p.finish);
      if(p.handles) addRow("Handles \u2014 " + handleName(state.handleId), p.handles);
      if(p.decorations) addRow("Decorations", p.decorations);
      if(p.interior) addRow("Interior Upgrade", p.interior);
      if(p.accessories) addRow("Accessories", p.accessories);
    }
    const totalEl = qs("#price-total");
    if(totalEl){
      if(lastTotal === null) totalEl.textContent = fmtPeso(p.total);
      else animateNumber(totalEl, lastTotal, p.total, { prefix: "\u20B1" });
      lastTotal = p.total;
    }
    // mirror on review screen
    const reviewTotal = qs("#review-price-total");
    if(reviewTotal) reviewTotal.textContent = fmtPeso(p.total);
    state.price = p.total;
    return p;
  }

  function renderSummary(){
    const rows = [
      ["Model", modelName(state.modelId)],
      ["Color", colorName(state.colorId)],
      ["Material", materialName(state.materialId)],
      ["Finish", state.glossLevel + "% gloss"],
      ["Handles", handleName(state.handleId)],
      ["Interior", interiorColorName(state.interior.colorId) + " " + interiorMaterialName(state.interior.materialId)],
      ["Decorations", decorationSummary() || "None"],
      ["Text", state.text.value ? ("\u201c" + state.text.value + "\u201d") : "None"]
    ];
    const wrap = qs("#summary-list");
    if(wrap){
      wrap.innerHTML = "";
      rows.forEach(([k,v]) => {
        const row = el("div", "summary-row");
        row.innerHTML = `<span class="k">${k}</span><span class="v">${v}</span>`;
        wrap.appendChild(row);
      });
    }
    const reviewWrap = qs("#review-summary-list");
    if(reviewWrap){
      reviewWrap.innerHTML = "";
      rows.forEach(([k,v]) => {
        const row = el("div", "summary-row");
        row.innerHTML = `<span class="k">${k}</span><span class="v">${v}</span>`;
        reviewWrap.appendChild(row);
      });
    }
  }
  function decorationSummary(){
    const active = decorationOptions.filter(d => state.decorations[d.id]).map(d => d.name);
    return active.join(" + ");
  }

  function renderCompletion(){
    const required = ["model","color","material","handles","interior"];
    const done = required.filter(k => state._touched[k]).length;
    const pct = Math.round((done/required.length) * 100);
    const fill = qs("#completion-fill"); if(fill) fill.style.width = pct + "%";
    const label = qs("#completion-percent"); if(label) label.textContent = pct + "%";
    const checks = qs("#completion-checks");
    if(checks){
      checks.innerHTML = "";
      required.forEach(k => {
        const pill = el("span", "check-pill" + (state._touched[k] ? " done" : ""), (state._touched[k] ? "\u2713 " : "") + k.charAt(0).toUpperCase()+k.slice(1));
        checks.appendChild(pill);
      });
      const hasDecor = Object.values(state.decorations).some(Boolean);
      checks.appendChild(el("span", "check-pill" + (hasDecor ? " done" : ""), (hasDecor?"\u2713 ":"") + "Decorations (optional)"));
    }
  }

  function renderMeta(){
    const changesLabel = qs("#meta-changes"); if(changesLabel) changesLabel.textContent = state.changes + " changes";
    const designIdLabel = qs("#meta-design-id"); if(designIdLabel) designIdLabel.textContent = state.designId || "Not yet saved";
  }

  function renderSteps(){
    const dotsWrap = qs("#studio-steps");
    const labelsWrap = qs("#step-labels");
    if(dotsWrap){
      dotsWrap.innerHTML = "";
      STEP_NAMES.forEach((name,i) => {
        const dot = el("div", "step-dot" + (i < currentStep ? " done" : i === currentStep ? " active" : ""));
        dot.addEventListener("click", () => { if(i <= maxStepReached) goToStep(i); });
        dotsWrap.appendChild(dot);
      });
    }
    if(labelsWrap){
      labelsWrap.innerHTML = "";
      STEP_NAMES.forEach((name,i) => labelsWrap.appendChild(el("span", i === currentStep ? "current" : "", name)));
    }
  }

  const STEP_CATEGORY_MAP = [["cat-model"], ["cat-color","cat-material"], ["cat-handles","cat-decorations","cat-patterns","cat-text"], ["cat-interior","cat-accessories"], []];
  function goToStep(i){
    currentStep = i;
    maxStepReached = Math.max(maxStepReached, i);
    if(i === 4){ openReview(); return; }
    // open the relevant categories for this step, collapse the rest
    const openIds = STEP_CATEGORY_MAP[i] || [];
    qsa(".cat-group").forEach(g => g.classList.toggle("open", openIds.includes(g.id)));
    renderSteps();
  }

  /* ============================================================
     UPDATE PIPELINE (state -> price -> summary -> completion -> UI)
     ============================================================ */
  function updateAll(){
    renderPrice();
    renderSummary();
    renderCompletion();
    renderMeta();
    renderSteps();
  }

  /* ============================================================
     APPLY FULL STATE (used by load / reset)
     ============================================================ */
  function applyState(newState){
    state = newState;
    const model = find(coffinModels, state.modelId) || coffinModels[0];
    CoffinScene.setModel(model.shape);
    CoffinScene.setColor(getColorHex(state));
    const mat = find(materialOptions, state.materialId) || materialOptions[0];
    CoffinScene.setMaterialProps({ roughness: mat.roughness, metalness: mat.metalness });
    CoffinScene.setGloss(state.glossLevel);
    const hd = find(handleOptions, state.handleId) || handleOptions[0];
    CoffinScene.setHandles({ color: hd.color, metalness: hd.metalness, roughness: hd.roughness });
    decorationOptions.forEach(d => CoffinScene.setDecoration(d.id, !!state.decorations[d.id]));
    CoffinScene.setPattern(state.patternId);
    CoffinScene.setInteriorColor((find(interiorColorOptions, state.interior.colorId)||{}).hex || "#e6d9bd");
    CoffinScene.setInteriorMaterialProps({ roughness: (find(interiorMaterialOptions, state.interior.materialId)||{}).roughness || 0.5 });
    CoffinScene.setPillow(!!state.interior.pillow);
    CoffinScene.setText(state.text.value, state.text.fontId, state.text.positionId);
    CoffinScene.setLid(state.lidState);

    const nameInput = qs("#design-name-input"); if(nameInput) nameInput.value = state.designName;
    renderModelOptions(); renderColorSwatches(); renderMaterialChips(); renderFinishPresets();
    const range = qs("#gloss-range"); if(range) range.value = state.glossLevel;
    const val = qs("#gloss-value"); if(val) val.textContent = Math.round(state.glossLevel) + "%";
    renderHandleChips(); renderDecorationToggles(); renderPatternChips();
    renderInteriorControls(); renderAccessoryToggles(); renderTextControls(); renderLidPills();
    updateAll();
  }

  /* ============================================================
     SAVE / LOAD / RESET / REVIEW / QUOTATION
     ============================================================ */
  function doSave(){
    if(!state.modelId){ showToast("Please select a coffin model first.", "error"); return; }
    if(!state.designId) state.designId = generateDesignId();
    const result = saveDesign(state);
    if(result.ok){
      showToast("Design saved successfully.");
      const statusLabel = qs("#save-status-label"); if(statusLabel) statusLabel.textContent = "Saved";
      renderMeta();
    } else {
      showToast("Unable to save your design. Please try again.", "error");
    }
  }

  function doLoad(){
    const saved = loadDesign();
    const body = qs("#load-modal-body");
    if(!body) return;
    body.innerHTML = "";
    if(!saved){
      body.innerHTML = `<div style="text-align:center;padding:1.5rem 0;">
        <p style="font-weight:700;color:var(--text-1);margin-bottom:.4rem;">No Saved Designs Yet</p>
        <p class="text-muted" style="font-size:.85rem;">Start creating your first custom coffin design.</p>
      </div>`;
    } else {
      const box = el("div", "price-box");
      box.innerHTML = `<div class="price-row base"><span>${saved.designName || "Untitled Design"}</span><span class="val">${fmtPeso(saved.price||0)}</span></div>
        <div class="price-row"><span>Model</span><span class="val">${modelName(saved.modelId)}</span></div>
        <div class="price-row"><span>Saved</span><span class="val">${saved.savedAt ? new Date(saved.savedAt).toLocaleString() : "\u2014"}</span></div>`;
      body.appendChild(box);
    }
    const loadBtn = qs("#btn-confirm-load");
    if(loadBtn) loadBtn.style.display = saved ? "" : "none";
    openModal("modal-load");
  }

  function confirmLoad(){
    const saved = loadDesign();
    if(saved){
      applyState(Object.assign(defaultState(), saved, { _touched: { model:true,color:true,material:true,handles:true,interior:true } }));
      showToast("Design loaded");
    }
    closeModal("modal-load");
  }

  function doResetConfirm(){ openModal("modal-reset"); }
  function confirmReset(){
    const model = find(coffinModels, state.modelId) || coffinModels[0];
    applyState(defaultState(model));
    showToast("Design reset");
    closeModal("modal-reset");
    goToStep(0);
  }

  function openReview(){
    currentStep = 4;
    renderSteps();
    const p = renderPrice();
    const idLabel = qs("#review-design-id");
    if(!state.designId) state.designId = generateDesignId();
    if(idLabel) idLabel.textContent = state.designId;
    const dateLabel = qs("#review-date");
    if(dateLabel) dateLabel.textContent = new Date().toLocaleString();
    renderSummary();
    openModal("modal-review");
  }

  function submitForQuotation(){
    if(!state.modelId){ showToast("Please review your design before submitting.", "error"); return; }
    const result = submitQuotation(Object.assign({}, state, { price: state.price }));
    closeModal("modal-review");
    if(result.ok){
      const refEl = qs("#quotation-ref"); if(refEl) refEl.textContent = result.reference;
      openModal("modal-quotation");
      showToast("Quotation prepared");
      createOrderNotif(result.reference);
    } else {
      showToast("Unable to save your design. Please try again.", "error");
    }
  }

  function createOrderNotif(ref){
    try{
      var now = new Date().toISOString();
      var oid = 'ORD-' + String(ref).toUpperCase().slice(0,14);
      /* --- add to dyt_orders --- */
      var orders = [];
      try{ orders = JSON.parse(localStorage.getItem('dyt_orders')||'[]'); }catch(e){}
      if(!orders.find(function(o){return o.id===oid;})){
        orders.unshift({
          id: oid,
          coffin: modelName(state.modelId),
          material: materialName(state.materialId),
          color: colorName(state.colorId),
          dimensions: '185 × 65 × 45 cm',
          extras: [],
          basePrice: state.price || 0,
          status: 'confirmed',
          orderedAt: now,
          updatedAt: now,
          pickup: 'DesignYourTaol Showroom, Brgy. San Roque, Quezon City',
          note: 'Design received. Expect a call within 24 hours to confirm your order.'
        });
        localStorage.setItem('dyt_orders', JSON.stringify(orders));
      }
      /* --- add to dyt_notifs --- */
      var notifs = [];
      try{ notifs = JSON.parse(localStorage.getItem('dyt_notifs')||'[]'); }catch(e){}
      notifs.unshift({
        id: 'N-' + Date.now(),
        orderId: oid,
        type: 'confirmed',
        title: 'Design submitted! ✓',
        body: 'Your “' + modelName(state.modelId) + '” design has been submitted for review.',
        ts: now,
        read: false
      });
      localStorage.setItem('dyt_notifs', JSON.stringify(notifs));
    }catch(e){}
  }

  function startNewDesign(){
    closeModal("modal-quotation");
    applyState(defaultState());
    state.designId = null;
    clearCurrentDesign();
    goToStep(0);
    showToast("Ready for a new design");
  }

  /* ============================================================
     MISC UI WIRING
     ============================================================ */
  function debounce(fn, wait){ let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; }

  function wireStaticControls(){
    const nameInput = qs("#design-name-input");
    if(nameInput) nameInput.addEventListener("input", debounce(() => { state.designName = nameInput.value || "My Custom Coffin"; }, 300));

    const range = qs("#gloss-range");
    if(range){
      range.addEventListener("input", () => {
        const val = qs("#gloss-value"); if(val) val.textContent = range.value + "%";
        CoffinScene.setGloss(Number(range.value));
      });
      range.addEventListener("change", () => { setGloss(Number(range.value)); showToast("Material changed"); });
    }

    const textInput = qs("#text-input");
    if(textInput){
      textInput.addEventListener("input", debounce(() => {
        state.text.value = textInput.value.slice(0, 28); bump();
        applyText();
        renderTextControls(); updateAll();
      }, 250));
    }

    qs("#btn-save") && qs("#btn-save").addEventListener("click", doSave);
    qs("#btn-load") && qs("#btn-load").addEventListener("click", doLoad);
    qs("#btn-confirm-load") && qs("#btn-confirm-load").addEventListener("click", confirmLoad);
    qs("#btn-reset") && qs("#btn-reset").addEventListener("click", doResetConfirm);
    qs("#btn-confirm-reset") && qs("#btn-confirm-reset").addEventListener("click", confirmReset);
    qs("#btn-finish") && qs("#btn-finish").addEventListener("click", () => goToStep(4));
    qs("#btn-review") && qs("#btn-review").addEventListener("click", () => goToStep(4));
    qs("#btn-edit-design") && qs("#btn-edit-design").addEventListener("click", () => closeModal("modal-review"));
    qs("#btn-confirm-design") && qs("#btn-confirm-design").addEventListener("click", submitForQuotation);
    qs("#btn-start-new") && qs("#btn-start-new").addEventListener("click", startNewDesign);
    qs("#btn-view-design") && qs("#btn-view-design").addEventListener("click", () => closeModal("modal-quotation"));

    // 3D viewer controls
    qs("#btn-zoom-in") && qs("#btn-zoom-in").addEventListener("click", () => CoffinScene.zoomBy(-0.5));
    qs("#btn-zoom-out") && qs("#btn-zoom-out").addEventListener("click", () => CoffinScene.zoomBy(0.5));
    qs("#btn-reset-view") && qs("#btn-reset-view").addEventListener("click", () => { CoffinScene.resetView(); showToast("View reset"); });
    qs("#btn-fullscreen") && qs("#btn-fullscreen").addEventListener("click", () => CoffinScene.toggleFullscreen());
    qs("#btn-help") && qs("#btn-help").addEventListener("click", () => openModal("modal-help"));

    qsa(".view-presets button").forEach(btn => {
      btn.addEventListener("click", () => {
        qsa(".view-presets button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        CoffinScene.setView(btn.dataset.view);
      });
    });

    // accordion categories
    qsa(".cat-head").forEach(head => {
      head.addEventListener("click", () => head.parentElement.classList.toggle("open"));
    });

    // mobile tab switching
    qsa(".studio-mobile-tabs button").forEach(btn => {
      btn.addEventListener("click", () => {
        qsa(".studio-mobile-tabs button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const target = btn.dataset.target;
        qs(".panel-left").classList.toggle("mobile-open", target === "customize");
        qs(".panel-right").classList.toggle("mobile-open", target === "summary");
      });
    });
  }

  /* ============================================================
     INIT
     ============================================================ */
  function getQueryModel(){
    const params = new URLSearchParams(window.location.search);
    return params.get("model");
  }

  function init(){
    const requestedModel = getQueryModel();
    const startModel = find(coffinModels, requestedModel) || coffinModels[0];
    state = defaultState(startModel);

    const container = qs(".viewer-col");
    const canvas = qs("#coffin-canvas");
    CoffinScene.init(container, canvas, {
      onReady: () => {
        setTimeout(() => {
          const loading = qs("#viewer-loading");
          if(loading) loading.classList.add("hidden");
          const label = qs("#viewer-ready-label");
          if(label) label.textContent = "3D READY";
        }, 550);
      }
    });

    applyState(state);
    wireStaticControls();
    initModalDismissers();
    goToStep(0);
    qsa(".cat-group")[0] && qsa(".cat-group")[0].classList.add("open");
  }

  document.addEventListener("DOMContentLoaded", init);
})();