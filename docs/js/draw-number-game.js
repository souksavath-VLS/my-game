// Number tracing game — trace digits 1..10 with pixel-coverage detection.
// Multi-language UI sync, TTS pronunciation, per-digit best score in localStorage.

(() => {
  'use strict';

  // ===== 1-10 with spelled-out names + romanization =====
  const NUMBERS = [
    { d:'1',  en:'one',    th:'หนึ่ง',  lo:'ໜຶ່ງ',     rom:'1' },
    { d:'2',  en:'two',    th:'สอง',    lo:'ສອງ',     rom:'2' },
    { d:'3',  en:'three',  th:'สาม',    lo:'ສາມ',     rom:'3' },
    { d:'4',  en:'four',   th:'สี่',    lo:'ສີ່',     rom:'4' },
    { d:'5',  en:'five',   th:'ห้า',    lo:'ຫ້າ',     rom:'5' },
    { d:'6',  en:'six',    th:'หก',     lo:'ຫົກ',     rom:'6' },
    { d:'7',  en:'seven',  th:'เจ็ด',   lo:'ເຈັດ',    rom:'7' },
    { d:'8',  en:'eight',  th:'แปด',    lo:'ແປດ',     rom:'8' },
    { d:'9',  en:'nine',   th:'เก้า',   lo:'ເກົ້າ',   rom:'9' },
    { d:'10', en:'ten',    th:'สิบ',    lo:'ສິບ',     rom:'10' }
  ];

  const I18N = {
    th: {
      title:'🔢 ลากเลข 1-10', back:'← หน้าหลัก',
      prev:'ก่อนหน้า', speak:'ออกเสียง', clear:'ลบเส้น', check:'ตรวจ',
      best:'ดีที่สุด', done:'ผ่านแล้ว', tries:'รอบนี้',
      pass:'เยี่ยม!', tryAgain:'ลองอีกครั้ง',
      excellent:'สุดยอด!', good:'ดีมาก!'
    },
    en: {
      title:'🔢 Trace 1-10', back:'← Home',
      prev:'Back', speak:'Sound', clear:'Clear', check:'Check',
      best:'Best', done:'Passed', tries:'Tries',
      pass:'Pass!', tryAgain:'Try again',
      excellent:'Excellent!', good:'Good!'
    },
    lao: {
      title:'🔢 ລາກເລກ 1-10', back:'← ໜ້າຫຼັກ',
      prev:'ກ່ອນໜ້າ', speak:'ອອກສຽງ', clear:'ລົບເສັ້ນ', check:'ກວດ',
      best:'ດີສຸດ', done:'ຜ່ານແລ້ວ', tries:'ຮອບນີ້',
      pass:'ດີຫຼາຍ!', tryAgain:'ລອງໃໝ່',
      excellent:'ສຸດຍອດ!', good:'ດີຫຼາຍ!'
    }
  };

  const STATS_KEY = 'draw_num_stats_v1';
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return { best: s.best || {}, passed: s.passed || [] };
    } catch { return { best: {}, passed: [] }; }
  }
  function saveStats(patch) {
    const cur = loadStats();
    const upd = Object.assign({}, cur, patch);
    try { localStorage.setItem(STATS_KEY, JSON.stringify(upd)); } catch {}
    return upd;
  }

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'th';
  })();
  let currentIdx = 0;
  let tries = 0;
  let dpr = 1;

  const $ = id => document.getElementById(id);
  const wrap = $('canvas-wrap');
  const shadowCanvas = $('shadow-canvas');
  const userCanvas = $('user-canvas');
  const sCtx = shadowCanvas.getContext('2d');
  const uCtx = userCanvas.getContext('2d');
  const elFeedback = $('feedback');
  const elNumeral = $('numeral');
  const elVname = $('vname');
  const elVnameSub = $('vname-sub');
  const elVrom = $('vrom');
  const elProgFill = $('prog-fill');
  const elProgCur = $('prog-cur');
  const elProgTotal = $('prog-total');
  const elBest = $('ui-best');
  const elDone = $('ui-done');
  const elDoneTotal = $('ui-done-total');
  const elTries = $('ui-tries');

  function sizeCanvases() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [shadowCanvas, userCanvas]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    uCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function renderShadow() {
    const n = NUMBERS[currentIdx];
    if (!n) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    sCtx.clearRect(0, 0, w, h);
    // 2-digit "10" needs smaller font to fit
    const sizeRatio = n.d.length > 1 ? 0.62 : 0.82;
    const size = Math.floor(Math.min(w, h) * sizeRatio);
    sCtx.font = `900 ${size}px Arial, sans-serif`;
    sCtx.fillStyle = '#1e3a8a';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText(n.d, w / 2, h / 2 + size * 0.04);
  }

  // Drawing
  let drawing = false;
  let lastX = 0, lastY = 0;
  function localPoint(ev) {
    const rect = userCanvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }
  function startStroke(ev) {
    ev.preventDefault();
    drawing = true;
    const p = localPoint(ev);
    lastX = p.x; lastY = p.y;
    uCtx.lineCap = 'round';
    uCtx.lineJoin = 'round';
    uCtx.strokeStyle = '#2563eb';
    uCtx.lineWidth = Math.max(10, wrap.clientWidth * 0.045);
    uCtx.beginPath();
    uCtx.arc(p.x, p.y, uCtx.lineWidth / 2, 0, Math.PI * 2);
    uCtx.fillStyle = uCtx.strokeStyle;
    uCtx.fill();
  }
  function moveStroke(ev) {
    if (!drawing) return;
    ev.preventDefault();
    const p = localPoint(ev);
    uCtx.beginPath();
    uCtx.moveTo(lastX, lastY);
    uCtx.lineTo(p.x, p.y);
    uCtx.stroke();
    lastX = p.x; lastY = p.y;
  }
  function endStroke(ev) {
    if (!drawing) return;
    if (ev) ev.preventDefault();
    drawing = false;
  }
  userCanvas.addEventListener('pointerdown', startStroke);
  userCanvas.addEventListener('pointermove', moveStroke);
  userCanvas.addEventListener('pointerup', endStroke);
  userCanvas.addEventListener('pointerleave', endStroke);
  userCanvas.addEventListener('pointercancel', endStroke);

  function clearUser() { uCtx.clearRect(0, 0, wrap.clientWidth, wrap.clientHeight); }

  function evaluateTrace() {
    const sd = sCtx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height).data;
    const ud = uCtx.getImageData(0, 0, userCanvas.width, userCanvas.height).data;
    let shadowCount = 0, userCount = 0, overlap = 0, wasteCount = 0;
    const step = 4;
    for (let i = 0; i < sd.length; i += 4 * step) {
      const sA = sd[i + 3];
      const uA = ud[i + 3];
      const sP = sA > 30;
      const uP = uA > 30;
      if (sP) shadowCount++;
      if (uP) userCount++;
      if (sP && uP) overlap++;
      else if (uP) wasteCount++;
    }
    if (shadowCount === 0) return { pct: 0 };
    const coverage = overlap / shadowCount;
    const waste = userCount > 0 ? wasteCount / userCount : 0;
    const pct = Math.max(0, Math.min(100, Math.round(coverage * 100 - waste * 30)));
    return { pct };
  }

  function showFeedback(emoji, pct, isPass) {
    const t = I18N[lang];
    let label;
    if (pct >= 80) label = t.excellent;
    else if (pct >= 60) label = t.good;
    else if (isPass) label = t.pass;
    else label = t.tryAgain;
    elFeedback.innerHTML = `${emoji}<div class="pct">${label} · ${pct}%</div>`;
    elFeedback.classList.remove('show');
    void elFeedback.offsetWidth;
    elFeedback.classList.add('show');
  }

  function nameFor(n, l) {
    if (l === 'th') return n.th;
    if (l === 'lao') return n.lo;
    return n.en;
  }

  function render() {
    const n = NUMBERS[currentIdx];
    if (!n) return;
    elNumeral.textContent = n.d;
    elVname.textContent = nameFor(n, lang);
    if (lang === 'lao') elVnameSub.textContent = `${n.th} · ${n.en}`;
    else if (lang === 'th') elVnameSub.textContent = `${n.lo} · ${n.en}`;
    else elVnameSub.textContent = `${n.lo} · ${n.th}`;
    elVrom.textContent = '/' + n.rom + '/';

    tries = 0;
    elTries.textContent = '0';
    elProgCur.textContent = (currentIdx + 1);
    elProgTotal.textContent = NUMBERS.length;
    elProgFill.style.width = ((currentIdx + 1) / NUMBERS.length * 100) + '%';
    clearUser();
    renderShadow();
    refreshStats();
  }

  function refreshStats() {
    const stats = loadStats();
    elBest.textContent = stats.best[currentIdx] || 0;
    elDone.textContent = stats.passed.length;
    elDoneTotal.textContent = NUMBERS.length;
  }

  function nextNumber() {
    currentIdx = (currentIdx + 1) % NUMBERS.length;
    render();
  }
  function prevNumber() {
    currentIdx = (currentIdx - 1 + NUMBERS.length) % NUMBERS.length;
    render();
  }

  function speak() {
    const n = NUMBERS[currentIdx];
    if (!n) return;
    const text = nameFor(n, lang);
    const v = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
    if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
      try { window.AndroidTTS.speak(text, v); return; } catch {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = v;
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
      } catch {}
    }
  }

  $('btn-check').addEventListener('click', () => {
    tries++;
    elTries.textContent = tries;
    const { pct } = evaluateTrace();
    const stats = loadStats();
    const prevBest = stats.best[currentIdx] || 0;
    if (pct > prevBest) {
      stats.best[currentIdx] = pct;
      saveStats({ best: stats.best });
    }
    const isPass = pct >= 50;
    if (isPass) {
      if (!stats.passed.includes(currentIdx)) {
        stats.passed.push(currentIdx);
        saveStats({ passed: stats.passed });
      }
      showFeedback('✅', pct, true);
      setTimeout(() => { nextNumber(); }, 1300);
    } else {
      showFeedback('❌', pct, false);
    }
    refreshStats();
  });
  $('btn-clear').addEventListener('click', clearUser);
  $('btn-prev').addEventListener('click', prevNumber);
  $('btn-speak').addEventListener('click', speak);

  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    $('lbl-prev').textContent = t.prev;
    $('lbl-speak').textContent = t.speak;
    $('lbl-clear').textContent = t.clear;
    $('lbl-check').textContent = t.check;
    $('lbl-best').textContent = t.best;
    $('lbl-done').textContent = t.done;
    $('lbl-tries').textContent = t.tries;
    document.title = t.title;
    render();
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { sizeCanvases(); renderShadow(); clearUser(); }, 150);
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  function init() {
    sizeCanvases();
    applyLang();
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init).catch(init);
  } else {
    init();
  }
})();
