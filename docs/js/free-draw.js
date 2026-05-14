// Free Drawing Pad — pen, eraser, flood-fill bucket, custom color picker,
// image-as-tracing-shadow background, stroke-based undo, save PNG.

(() => {
  'use strict';

  const COLORS = [
    '#1e293b', '#ffffff', '#ef4444', '#f59e0b', '#eab308', '#22c55e',
    '#0ea5e9', '#3b82f6', '#8b5cf6', '#ec4899', '#92400e', '#94a3b8'
  ];

  const I18N = {
    th: {
      title:'🎨 วาดอิสระ', back:'← หน้าหลัก',
      color:'สี', size:'ขนาด', tool:'เครื่องมือ',
      undo:'ย้อนกลับ', clear:'ล้าง', save:'บันทึก',
      clearTitle:'ล้างภาพ?', clearText:'ภาพที่วาดไว้จะหายหมด แน่ใจไหม?',
      cancel:'ยกเลิก', confirm:'ล้าง'
    },
    en: {
      title:'🎨 Free Draw', back:'← Home',
      color:'Color', size:'Size', tool:'Tool',
      undo:'Undo', clear:'Clear', save:'Save',
      clearTitle:'Clear canvas?', clearText:'Your drawing will be gone. Sure?',
      cancel:'Cancel', confirm:'Clear'
    },
    lao: {
      title:'🎨 ແຕ້ມຮູບອິດສະຫຼະ', back:'← ໜ້າຫຼັກ',
      color:'ສີ', size:'ໜາ', tool:'ເຄື່ອງ',
      undo:'ຍ້ອນກັບ', clear:'ລ້າງ', save:'ບັນທຶກ',
      clearTitle:'ລ້າງຮູບ?', clearText:'ຮູບທີ່ແຕ້ມໄວ້ຈະຫາຍໝົດ. ແນ່ໃຈບໍ່?',
      cancel:'ຍົກເລີກ', confirm:'ລ້າງ'
    }
  };

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'lao';
  })();
  let curColor = COLORS[0];
  let curSize = 18;
  let curTool = 'pen';     // 'pen' | 'eraser' | 'fill'
  let customColor = '#ff6b9d';

  // Stroke history: { tool, color, size, points } OR { tool:'fill', color, x, y }
  let strokes = [];
  let active = null;
  let dpr = window.devicePixelRatio || 1;

  // Background-image tracing
  let bgImage = null;
  let bgOpacity = 0.35;

  // Zoom / pan (CSS transform on .fd-stage)
  let zoom = 1, panX = 0, panY = 0;
  const ZOOM_MIN = 0.5, ZOOM_MAX = 5;

  // Pointer state machine: 'idle' | 'drawing' | 'gesturing' | 'draining'
  const pointers = new Map(); // pointerId -> { x, y }
  let mode = 'idle';
  let pinchStart = null;      // { p1, p2, zoom, panX, panY }
  let pendingFillTimer = null;
  let indicatorTimer = null;

  const $ = id => document.getElementById(id);
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const bgCanvas = $('bg-canvas');
  const bgCtx = bgCanvas.getContext('2d');
  const stage = $('stage');
  const wrap = $('canvas-wrap');

  // ===== Canvas sizing =====
  function sizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    // Use stage's CSS size (wrap minus padding) as the canvas display size.
    const cssW = stage.clientWidth || canvas.clientWidth;
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = canvas.width;
    bgCanvas.width  = canvas.width;
    bgCanvas.height = canvas.height;
    redraw();
    renderBg();
  }

  // ===== Zoom / pan =====
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function clampPan() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (zoom >= 1) {
      // Zoomed in: keep canvas covering the viewport (pan within negative range).
      panX = Math.max(w - w * zoom, Math.min(0, panX));
      panY = Math.max(h - h * zoom, Math.min(0, panY));
    } else {
      // Zoomed out: center the smaller canvas.
      panX = (w - w * zoom) / 2;
      panY = (h - h * zoom) / 2;
    }
  }

  function applyTransform() {
    clampPan();
    stage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    showZoomIndicator();
  }

  function showZoomIndicator() {
    const el = $('zoom-pct');
    el.textContent = Math.round(zoom * 100) + '%';
    el.classList.add('show');
    if (indicatorTimer) clearTimeout(indicatorTimer);
    indicatorTimer = setTimeout(() => el.classList.remove('show'), 900);
  }

  function zoomAt(screenX, screenY, factor) {
    // screenX/Y are wrap-relative coords. Keep the stage-world point under (screenX,screenY) fixed.
    const worldX = (screenX - panX) / zoom;
    const worldY = (screenY - panY) / zoom;
    const newZoom = clamp(zoom * factor, ZOOM_MIN, ZOOM_MAX);
    if (newZoom === zoom) return;
    zoom = newZoom;
    panX = screenX - worldX * zoom;
    panY = screenY - worldY * zoom;
    applyTransform();
  }

  function resetZoom() {
    zoom = 1; panX = 0; panY = 0;
    applyTransform();
  }

  // ===== Drawing =====
  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokes) {
      if (s.tool === 'fill') floodFill(s.x, s.y, s.color);
      else drawStroke(s);
    }
  }

  function drawStroke(s) {
    if (!s.points || !s.points.length) return;
    ctx.save();
    if (s.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle   = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = s.color;
      ctx.fillStyle   = s.color;
    }
    ctx.lineWidth = s.size * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (s.points.length === 1) {
      const p = s.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, (s.size * dpr) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLastSegment(s) {
    if (!s.points || s.points.length < 2) return;
    const a = s.points[s.points.length - 2];
    const b = s.points[s.points.length - 1];
    ctx.save();
    if (s.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = s.color;
    }
    ctx.lineWidth = s.size * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  // ===== Flood fill =====
  function hexToRgba(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 255
    };
  }
  function floodFill(sx, sy, fillHex) {
    sx = Math.floor(sx); sy = Math.floor(sy);
    const W = canvas.width, H = canvas.height;
    if (sx < 0 || sx >= W || sy < 0 || sy >= H) return;
    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;
    const startIdx = (sy * W + sx) * 4;
    const t = { r: data[startIdx], g: data[startIdx+1], b: data[startIdx+2], a: data[startIdx+3] };
    const f = hexToRgba(fillHex);
    if (t.r === f.r && t.g === f.g && t.b === f.b && t.a === f.a) return;
    const tol = 40;
    const total = W * H;
    const visited = new Uint8Array(total);
    const stack = [sy * W + sx];
    visited[sy * W + sx] = 1;
    while (stack.length) {
      const p = stack.pop();
      const i4 = p * 4;
      data[i4] = f.r; data[i4+1] = f.g; data[i4+2] = f.b; data[i4+3] = f.a;
      const x = p % W;
      const y = (p - x) / W;
      if (x > 0)     { const np = p - 1; if (!visited[np] && matches(data, np*4, t, tol)) { visited[np] = 1; stack.push(np); } }
      if (x < W - 1) { const np = p + 1; if (!visited[np] && matches(data, np*4, t, tol)) { visited[np] = 1; stack.push(np); } }
      if (y > 0)     { const np = p - W; if (!visited[np] && matches(data, np*4, t, tol)) { visited[np] = 1; stack.push(np); } }
      if (y < H - 1) { const np = p + W; if (!visited[np] && matches(data, np*4, t, tol)) { visited[np] = 1; stack.push(np); } }
    }
    ctx.putImageData(imageData, 0, 0);
  }
  function matches(data, i, t, tol) {
    return Math.abs(data[i]   - t.r) <= tol &&
           Math.abs(data[i+1] - t.g) <= tol &&
           Math.abs(data[i+2] - t.b) <= tol &&
           Math.abs(data[i+3] - t.a) <= tol;
  }

  // ===== Input =====
  // Convert client coords → canvas pixel coords. getBoundingClientRect() returns
  // post-transform rect, so this works correctly under any zoom/pan.
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top)  * (canvas.height / r.height)
    };
  }
  // Pointer position relative to canvas-wrap (used for zoom focal-point math).
  function wrapPos(e) {
    const r = wrap.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function startStrokeAt(p) {
    active = { tool: curTool, color: curColor, size: curSize, points: [p] };
    strokes.push(active);
    drawStroke(active);
    updateUndoBtn();
  }

  function cancelActiveStroke() {
    if (active) {
      strokes.pop();
      active = null;
      redraw();
      updateUndoBtn();
    }
  }

  function startPinch() {
    const pts = [...pointers.values()];
    if (pts.length < 2) return;
    pinchStart = {
      p1: { x: pts[0].x, y: pts[0].y },
      p2: { x: pts[1].x, y: pts[1].y },
      zoom: zoom, panX: panX, panY: panY
    };
  }

  function updatePinch() {
    if (!pinchStart) return;
    const pts = [...pointers.values()];
    if (pts.length < 2) return;
    const p1 = pts[0], p2 = pts[1];
    const d  = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const sd = Math.hypot(pinchStart.p1.x - pinchStart.p2.x, pinchStart.p1.y - pinchStart.p2.y);
    if (sd === 0) return;
    const scale = d / sd;

    // Midpoint of fingers (relative to wrap)
    const wrapRect = wrap.getBoundingClientRect();
    const cx  = (p1.x + p2.x) / 2 - wrapRect.left;
    const cy  = (p1.y + p2.y) / 2 - wrapRect.top;
    const scx = (pinchStart.p1.x + pinchStart.p2.x) / 2 - wrapRect.left;
    const scy = (pinchStart.p1.y + pinchStart.p2.y) / 2 - wrapRect.top;

    const newZoom = clamp(pinchStart.zoom * scale, ZOOM_MIN, ZOOM_MAX);
    // World point that was under the starting midpoint should follow the current midpoint.
    const worldX = (scx - pinchStart.panX) / pinchStart.zoom;
    const worldY = (scy - pinchStart.panY) / pinchStart.zoom;
    zoom = newZoom;
    panX = cx - worldX * zoom;
    panY = cy - worldY * zoom;
    applyTransform();
  }

  function endPinch() { pinchStart = null; }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size >= 2) {
      // 2nd finger arrived: cancel any in-progress single-finger action.
      if (pendingFillTimer) { clearTimeout(pendingFillTimer); pendingFillTimer = null; showBusy(false); }
      if (mode === 'drawing') cancelActiveStroke();
      mode = 'gesturing';
      startPinch();
      return;
    }

    // pointers.size === 1
    if (mode === 'draining') {
      // Still waiting for the last gesture finger to lift; ignore this fresh touch.
      return;
    }

    mode = 'drawing';
    const p = pos(e);
    if (curTool === 'fill') {
      showBusy(true);
      pendingFillTimer = setTimeout(() => {
        pendingFillTimer = null;
        floodFill(p.x, p.y, curColor);
        strokes.push({ tool: 'fill', color: curColor, x: p.x, y: p.y });
        updateUndoBtn();
        showBusy(false);
        mode = 'idle';
      }, 20);
      return;
    }
    startStrokeAt(p);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    e.preventDefault();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (mode === 'gesturing') {
      updatePinch();
      return;
    }
    if (mode === 'drawing' && active) {
      const p = pos(e);
      const last = active.points[active.points.length - 1];
      if (Math.abs(p.x - last.x) < 1 && Math.abs(p.y - last.y) < 1) return;
      active.points.push(p);
      drawLastSegment(active);
    }
  });

  function onPointerEnd(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);

    if (pointers.size === 0) {
      if (mode === 'drawing') active = null;
      endPinch();
      mode = 'idle';
    } else if (pointers.size === 1 && mode === 'gesturing') {
      // First pinch finger released; stay in 'draining' until the last finger lifts.
      endPinch();
      mode = 'draining';
    }
  }
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);

  // Mouse wheel zoom (desktop)
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const wp = wrapPos(e);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAt(wp.x, wp.y, factor);
  }, { passive: false });

  // Zoom buttons
  $('zoom-in').addEventListener('click',    () => zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1.25));
  $('zoom-out').addEventListener('click',   () => zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1 / 1.25));
  $('zoom-reset').addEventListener('click', () => resetZoom());

  // ===== Busy overlay =====
  function showBusy(on) {
    $('busy').classList.toggle('show', !!on);
  }

  // ===== Color swatches =====
  function buildSwatches() {
    const row = $('row-colors');
    [...row.querySelectorAll('.fd-swatch')].forEach(el => el.remove());
    for (const c of COLORS) {
      const sw = document.createElement('div');
      sw.className = 'fd-swatch';
      sw.style.background = c;
      sw.dataset.color = c;
      if (c.toLowerCase() === '#ffffff') sw.classList.add('white');
      if (c === curColor) sw.classList.add('active');
      sw.addEventListener('click', () => selectColor(c));
      row.appendChild(sw);
    }
    // Custom color "+" swatch
    const custom = document.createElement('label');
    custom.className = 'fd-swatch custom';
    custom.title = 'Custom color';
    custom.innerHTML = `<span class="plus">+</span><input type="color" id="custom-color">`;
    row.appendChild(custom);
    const input = custom.querySelector('input');
    input.value = customColor;
    input.addEventListener('input', () => {
      customColor = input.value;
      custom.style.background = customColor;
      selectColor(customColor);
    });
    input.addEventListener('change', () => {
      customColor = input.value;
      custom.style.background = customColor;
      selectColor(customColor);
    });
  }
  function selectColor(c) {
    curColor = c;
    // Switching color implies pen if currently eraser
    if (curTool === 'eraser') {
      curTool = 'pen';
      $('tool-pen').classList.add('active');
      $('tool-eraser').classList.remove('active');
    }
    [...document.querySelectorAll('.fd-swatch:not(.custom)')].forEach(el => {
      el.classList.toggle('active', el.dataset.color === c);
    });
  }

  // ===== Sizes & tool buttons =====
  [...document.querySelectorAll('.fd-size')].forEach(el => {
    el.addEventListener('click', () => {
      curSize = parseInt(el.dataset.size, 10);
      [...document.querySelectorAll('.fd-size')].forEach(e2 => e2.classList.toggle('active', e2 === el));
    });
  });
  function setActiveTool(name) {
    curTool = name;
    $('tool-pen').classList.toggle('active',    name === 'pen');
    $('tool-eraser').classList.toggle('active', name === 'eraser');
    $('tool-fill').classList.toggle('active',   name === 'fill');
  }
  $('tool-pen').addEventListener('click',    () => setActiveTool('pen'));
  $('tool-eraser').addEventListener('click', () => setActiveTool('eraser'));
  $('tool-fill').addEventListener('click',   () => setActiveTool('fill'));

  // ===== Image background (tracing) =====
  $('img-input').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        bgImage = img;
        renderBg();
        $('bg-row').classList.add('show');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be picked again later
    e.target.value = '';
  });
  $('bg-opacity').addEventListener('input', (e) => {
    bgOpacity = parseInt(e.target.value, 10) / 100;
    $('bg-pct').textContent = e.target.value + '%';
    renderBg();
  });
  $('bg-clear').addEventListener('click', () => {
    bgImage = null;
    renderBg();
    $('bg-row').classList.remove('show');
  });

  function renderBg() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    if (!bgImage) { bgCanvas.style.display = 'none'; return; }
    bgCanvas.style.display = '';
    // White base so checkerboard doesn't show through
    bgCtx.fillStyle = '#ffffff';
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    // Fit image with "contain"
    const W = bgCanvas.width, H = bgCanvas.height;
    const ratio = bgImage.width / bgImage.height;
    let w, h;
    if (ratio > 1) { w = W; h = W / ratio; }
    else           { h = H; w = H * ratio; }
    const x = (W - w) / 2, y = (H - h) / 2;
    bgCtx.globalAlpha = bgOpacity;
    bgCtx.drawImage(bgImage, x, y, w, h);
    bgCtx.globalAlpha = 1;
  }

  // ===== Undo / Clear / Save =====
  function updateUndoBtn() {
    $('btn-undo').disabled = strokes.length === 0;
  }
  $('btn-undo').addEventListener('click', () => {
    if (!strokes.length) return;
    strokes.pop();
    redraw();
    updateUndoBtn();
  });

  $('btn-clear').addEventListener('click', () => {
    if (!strokes.length && !bgImage) return;
    $('modal-clear').classList.add('show');
  });
  $('clear-cancel').addEventListener('click', () => $('modal-clear').classList.remove('show'));
  $('clear-confirm').addEventListener('click', () => {
    strokes = [];
    redraw();
    bgImage = null;
    renderBg();
    $('bg-row').classList.remove('show');
    updateUndoBtn();
    $('modal-clear').classList.remove('show');
  });

  $('btn-save').addEventListener('click', () => {
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const octx = out.getContext('2d');
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, out.width, out.height);
    if (bgImage) octx.drawImage(bgCanvas, 0, 0);
    octx.drawImage(canvas, 0, 0);

    const ts = new Date();
    const stamp = ts.getFullYear() + String(ts.getMonth() + 1).padStart(2, '0') + String(ts.getDate()).padStart(2, '0')
                + '-' + String(ts.getHours()).padStart(2, '0') + String(ts.getMinutes()).padStart(2, '0') + String(ts.getSeconds()).padStart(2, '0');
    const filename = `drawing-${stamp}.png`;
    const url = out.toDataURL('image/png');

    if (window.AndroidSave && typeof window.AndroidSave.saveImage === 'function') {
      try { window.AndroidSave.saveImage(url, filename); return; } catch {}
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // ===== Language =====
  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    $('lbl-color').textContent = t.color;
    $('lbl-size').textContent = t.size;
    $('lbl-tool').textContent = t.tool;
    $('btn-undo-lbl').textContent = t.undo;
    $('btn-clear-lbl').textContent = t.clear;
    $('btn-save-lbl').textContent = t.save;
    $('clear-title').textContent = t.clearTitle;
    $('clear-text').textContent = t.clearText;
    $('clear-cancel').textContent = t.cancel;
    $('clear-confirm').textContent = t.confirm;
    document.title = t.title;
  }
  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  // ===== Resize =====
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      sizeCanvas();
      // Re-clamp pan to new stage size; reset zoom if currently zoomed out below 1.
      applyTransform();
    });
  });

  applyLang();
  buildSwatches();
  sizeCanvas();
  applyTransform();
})();
