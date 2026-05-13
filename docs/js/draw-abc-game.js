// A-Z tracing game — trace English letters with pixel-coverage detection.
// Mascot emoji + word per letter, uppercase/lowercase toggle, multi-language, TTS, per-letter best.

(() => {
  'use strict';

  // ===== 26 letters with mascot emoji + word per language =====
  const LETTERS = [
    { u:'A', l:'a', obj:'🍎', rom:'A',  en:'Apple',     th:'แอปเปิ้ล',   lo:'ໝາກໂປມ' },
    { u:'B', l:'b', obj:'🐝', rom:'B',  en:'Bee',       th:'ผึ้ง',        lo:'ເຜິ້ງ' },
    { u:'C', l:'c', obj:'🐱', rom:'C',  en:'Cat',       th:'แมว',         lo:'ແມວ' },
    { u:'D', l:'d', obj:'🐶', rom:'D',  en:'Dog',       th:'หมา',         lo:'ໝາ' },
    { u:'E', l:'e', obj:'🐘', rom:'E',  en:'Elephant',  th:'ช้าง',        lo:'ຊ້າງ' },
    { u:'F', l:'f', obj:'🐟', rom:'F',  en:'Fish',      th:'ปลา',         lo:'ປາ' },
    { u:'G', l:'g', obj:'🦒', rom:'G',  en:'Giraffe',   th:'ยีราฟ',       lo:'ຍີຣາບ' },
    { u:'H', l:'h', obj:'🏠', rom:'H',  en:'House',     th:'บ้าน',        lo:'ເຮືອນ' },
    { u:'I', l:'i', obj:'🍦', rom:'I',  en:'Ice cream', th:'ไอศกรีม',     lo:'ໄອສະກີມ' },
    { u:'J', l:'j', obj:'🤹', rom:'J',  en:'Juggler',   th:'นักโยน',      lo:'ນັກໂຍນ' },
    { u:'K', l:'k', obj:'🪁', rom:'K',  en:'Kite',      th:'ว่าว',        lo:'ວ່າວ' },
    { u:'L', l:'l', obj:'🦁', rom:'L',  en:'Lion',      th:'สิงโต',       lo:'ສິງໂຕ' },
    { u:'M', l:'m', obj:'🐵', rom:'M',  en:'Monkey',    th:'ลิง',          lo:'ລີງ' },
    { u:'N', l:'n', obj:'🪺', rom:'N',  en:'Nest',      th:'รัง',          lo:'ຮັງ' },
    { u:'O', l:'o', obj:'🦉', rom:'O',  en:'Owl',       th:'นกฮูก',       lo:'ນົກເຄົ້າ' },
    { u:'P', l:'p', obj:'🐷', rom:'P',  en:'Pig',       th:'หมู',          lo:'ໝູ' },
    { u:'Q', l:'q', obj:'👸', rom:'Q',  en:'Queen',     th:'ราชินี',      lo:'ລາຊິນີ' },
    { u:'R', l:'r', obj:'🌈', rom:'R',  en:'Rainbow',   th:'รุ้ง',         lo:'ຮຸ້ງ' },
    { u:'S', l:'s', obj:'☀️', rom:'S',  en:'Sun',       th:'พระอาทิตย์', lo:'ຕາເວັນ' },
    { u:'T', l:'t', obj:'🌳', rom:'T',  en:'Tree',      th:'ต้นไม้',      lo:'ຕົ້ນໄມ້' },
    { u:'U', l:'u', obj:'☂️', rom:'U',  en:'Umbrella',  th:'ร่ม',          lo:'ຄັນຮົ່ມ' },
    { u:'V', l:'v', obj:'🎻', rom:'V',  en:'Violin',    th:'ไวโอลิน',     lo:'ໄວໂອລິນ' },
    { u:'W', l:'w', obj:'🐺', rom:'W',  en:'Wolf',      th:'หมาป่า',      lo:'ໝາປ່າ' },
    { u:'X', l:'x', obj:'🦴', rom:'X',  en:'X-ray',     th:'เอกซเรย์',    lo:'ເອັກສະເຣ' },
    { u:'Y', l:'y', obj:'🪀', rom:'Y',  en:'Yo-yo',     th:'โยโย่',        lo:'ໂຢໂຢ' },
    { u:'Z', l:'z', obj:'🦓', rom:'Z',  en:'Zebra',     th:'ม้าลาย',      lo:'ມ້າລາຍ' }
  ];

  const I18N = {
    th: {
      title:'🔤 ลากเส้น A-Z', back:'← หน้าหลัก',
      prev:'ก่อนหน้า', speak:'ออกเสียง', clear:'ลบเส้น', check:'ตรวจ', caseLbl:'เล็ก/ใหญ่',
      best:'ดีที่สุด', done:'ผ่านแล้ว', tries:'รอบนี้',
      pass:'เยี่ยม!', tryAgain:'ลองอีกครั้ง',
      excellent:'สุดยอด!', good:'ดีมาก!'
    },
    en: {
      title:'🔤 Trace A-Z', back:'← Home',
      prev:'Back', speak:'Sound', clear:'Clear', check:'Check', caseLbl:'Case',
      best:'Best', done:'Passed', tries:'Tries',
      pass:'Pass!', tryAgain:'Try again',
      excellent:'Excellent!', good:'Good!'
    },
    lao: {
      title:'🔤 ລາກເສັ້ນ A-Z', back:'← ໜ້າຫຼັກ',
      prev:'ກ່ອນໜ້າ', speak:'ອອກສຽງ', clear:'ລົບເສັ້ນ', check:'ກວດ', caseLbl:'ໃຫຍ່/ນ້ອຍ',
      best:'ດີສຸດ', done:'ຜ່ານແລ້ວ', tries:'ຮອບນີ້',
      pass:'ດີຫຼາຍ!', tryAgain:'ລອງໃໝ່',
      excellent:'ສຸດຍອດ!', good:'ດີຫຼາຍ!'
    }
  };

  const STATS_KEY = 'draw_abc_stats_v1';
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
  let isUpper = true;     // tracing uppercase by default
  let tries = 0;
  let dpr = 1;

  const $ = id => document.getElementById(id);
  const wrap = $('canvas-wrap');
  const shadowCanvas = $('shadow-canvas');
  const userCanvas = $('user-canvas');
  const sCtx = shadowCanvas.getContext('2d');
  const uCtx = userCanvas.getContext('2d');
  const elFeedback = $('feedback');
  const elLetter = $('letter');
  const elObj = $('vobj');
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
  const btnCase = $('btn-case');

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
    const it = LETTERS[currentIdx];
    if (!it) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    sCtx.clearRect(0, 0, w, h);
    const size = Math.floor(Math.min(w, h) * 0.82);
    sCtx.font = `900 ${size}px Arial, sans-serif`;
    sCtx.fillStyle = '#4338ca';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText(isUpper ? it.u : it.l, w / 2, h / 2 + size * 0.04);
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
    uCtx.strokeStyle = '#6366f1';
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

  function nameFor(it, l) {
    if (l === 'th') return it.th;
    if (l === 'lao') return it.lo;
    return it.en;
  }

  // Best-key combines letter index + case (so uppercase and lowercase tracked separately)
  function bestKey() { return currentIdx + (isUpper ? 'u' : 'l'); }

  function render() {
    const it = LETTERS[currentIdx];
    if (!it) return;
    elLetter.textContent = it.u + it.l;
    elObj.textContent = it.obj;
    elVname.textContent = nameFor(it, lang);
    if (lang === 'lao') elVnameSub.textContent = `${it.th} · ${it.en}`;
    else if (lang === 'th') elVnameSub.textContent = `${it.lo} · ${it.en}`;
    else elVnameSub.textContent = `${it.lo} · ${it.th}`;
    elVrom.textContent = '/' + it.rom + '/';

    tries = 0;
    elTries.textContent = '0';
    elProgCur.textContent = (currentIdx + 1);
    elProgTotal.textContent = LETTERS.length;
    elProgFill.style.width = ((currentIdx + 1) / LETTERS.length * 100) + '%';
    clearUser();
    renderShadow();
    refreshStats();
    btnCase.classList.toggle('active', isUpper);
  }

  function refreshStats() {
    const stats = loadStats();
    elBest.textContent = stats.best[bestKey()] || 0;
    elDone.textContent = stats.passed.length;
    elDoneTotal.textContent = LETTERS.length * 2; // upper + lower
  }

  function nextLetter() {
    currentIdx = (currentIdx + 1) % LETTERS.length;
    render();
  }
  function prevLetter() {
    currentIdx = (currentIdx - 1 + LETTERS.length) % LETTERS.length;
    render();
  }
  function toggleCase() {
    isUpper = !isUpper;
    render();
  }

  function speak() {
    const it = LETTERS[currentIdx];
    if (!it) return;
    // Speak letter name + word: "A. Apple"
    const text = it.u + '. ' + it.en;
    if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
      try { window.AndroidTTS.speak(text, 'en-US'); return; } catch {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
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
    const key = bestKey();
    const prevBest = stats.best[key] || 0;
    if (pct > prevBest) {
      stats.best[key] = pct;
      saveStats({ best: stats.best });
    }
    const isPass = pct >= 50;
    if (isPass) {
      if (!stats.passed.includes(key)) {
        stats.passed.push(key);
        saveStats({ passed: stats.passed });
      }
      showFeedback('✅', pct, true);
      setTimeout(() => { nextLetter(); }, 1300);
    } else {
      showFeedback('❌', pct, false);
    }
    refreshStats();
  });
  $('btn-clear').addEventListener('click', clearUser);
  $('btn-prev').addEventListener('click', prevLetter);
  $('btn-speak').addEventListener('click', speak);
  btnCase.addEventListener('click', toggleCase);

  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    $('lbl-prev').textContent = t.prev;
    $('lbl-speak').textContent = t.speak;
    $('lbl-clear').textContent = t.clear;
    $('lbl-check').textContent = t.check;
    $('lbl-case').textContent = t.caseLbl;
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
