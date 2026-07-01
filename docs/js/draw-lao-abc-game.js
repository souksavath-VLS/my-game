// Lao Consonant tracing game — 27 standard Lao consonants with traditional names + emoji,
// pixel-coverage trace detection, TTS pronunciation, per-letter best score, language sync from index page.

(() => {
  'use strict';

  // ===== 27 Standard Lao Consonants (alphabet order) =====
  // c = letter, obj = mascot emoji, rom = romanization,
  // wordLo = Lao word ("ໄກ່"), nameLo = full name "ກໍ່ ໄກ່", nameTh = Thai-style "ก ไก่", nameEn = "k (chicken)"
  const CONSONANTS = [
    { c:'ກ', obj:'🐔', rom:'k',   wordLo:'ໄກ່',    nameLo:'ກໍ່ ໄກ່',     nameTh:'ก ไก่',    nameEn:'k (chicken)' },
    { c:'ຂ', obj:'🥚', rom:'kh',  wordLo:'ໄຂ່',    nameLo:'ຂໍ່ ໄຂ່',     nameTh:'ข ไข่',    nameEn:'kh (egg)' },
    { c:'ຄ', obj:'🐃', rom:'kh',  wordLo:'ຄວາຍ',   nameLo:'ຄໍ່ ຄວາຍ',    nameTh:'ค ควาย',  nameEn:'kh (buffalo)' },
    { c:'ງ', obj:'🐄', rom:'ng',  wordLo:'ງົວ',    nameLo:'ງໍ່ ງົວ',     nameTh:'ง งัว',    nameEn:'ng (ox)' },
    { c:'ຈ', obj:'🥛', rom:'c',   wordLo:'ຈອກ',    nameLo:'ຈໍ່ ຈອກ',     nameTh:'จ จอก',    nameEn:'c (glass)' },
    { c:'ສ', obj:'🐯', rom:'s',   wordLo:'ເສືອ',   nameLo:'ສໍ່ ເສືອ',    nameTh:'ส เสือ',   nameEn:'s (tiger)' },
    { c:'ຊ', obj:'🐘', rom:'s',   wordLo:'ຊ້າງ',   nameLo:'ຊໍ່ ຊ້າງ',    nameTh:'ซ ช้าง',   nameEn:'s (elephant)' },
    { c:'ຍ', obj:'🦟', rom:'ny',  wordLo:'ຍຸງ',    nameLo:'ຍໍ່ ຍຸງ',     nameTh:'ญ ยุง',    nameEn:'ny (mosquito)' },
    { c:'ດ', obj:'👶', rom:'d',   wordLo:'ເດັກ',   nameLo:'ດໍ່ ເດັກ',    nameTh:'ด เด็ก',   nameEn:'d (child)' },
    { c:'ຕ', obj:'👁️', rom:'t',   wordLo:'ຕາ',     nameLo:'ຕໍ່ ຕາ',      nameTh:'ต ตา',     nameEn:'t (eye)' },
    { c:'ຖ', obj:'👜', rom:'th',  wordLo:'ຖົງ',    nameLo:'ຖໍ່ ຖົງ',     nameTh:'ถ ถุง',    nameEn:'th (bag)' },
    { c:'ທ', obj:'🚩', rom:'th',  wordLo:'ທຸງ',    nameLo:'ທໍ່ ທຸງ',     nameTh:'ท ธง',     nameEn:'th (flag)' },
    { c:'ນ', obj:'🐦', rom:'n',   wordLo:'ນົກ',    nameLo:'ນໍ່ ນົກ',     nameTh:'น นก',     nameEn:'n (bird)' },
    { c:'ບ', obj:'🐐', rom:'b',   wordLo:'ແບ້',    nameLo:'ບໍ່ ແບ້',     nameTh:'บ แพะ',    nameEn:'b (goat)' },
    { c:'ປ', obj:'🐟', rom:'p',   wordLo:'ປາ',     nameLo:'ປໍ່ ປາ',      nameTh:'ป ปลา',    nameEn:'p (fish)' },
    { c:'ຜ', obj:'🐝', rom:'ph',  wordLo:'ເຜິ້ງ',  nameLo:'ຜໍ່ ເຜິ້ງ',   nameTh:'ผ ผึ้ง',   nameEn:'ph (bee)' },
    { c:'ຝ', obj:'🌧️', rom:'f',   wordLo:'ຝົນ',    nameLo:'ຝໍ່ ຝົນ',     nameTh:'ฝ ฝน',     nameEn:'f (rain)' },
    { c:'ພ', obj:'⛰️', rom:'ph',  wordLo:'ພູ',     nameLo:'ພໍ່ ພູ',      nameTh:'พ ภู',     nameEn:'ph (mountain)' },
    { c:'ຟ', obj:'🔥', rom:'f',   wordLo:'ໄຟ',     nameLo:'ຟໍ່ ໄຟ',      nameTh:'ฟ ไฟ',     nameEn:'f (fire)' },
    { c:'ມ', obj:'🐱', rom:'m',   wordLo:'ແມວ',    nameLo:'ມໍ່ ແມວ',     nameTh:'ม แมว',    nameEn:'m (cat)' },
    { c:'ຢ', obj:'💊', rom:'y',   wordLo:'ຢາ',     nameLo:'ຢໍ່ ຢາ',      nameTh:'ย ยา',     nameEn:'y (medicine)' },
    { c:'ຣ', obj:'🔔', rom:'r',   wordLo:'ລະຄັງ',  nameLo:'ຣໍ່ ລະຄັງ',   nameTh:'ร ระฆัง',  nameEn:'r (bell)' },
    { c:'ລ', obj:'🐒', rom:'l',   wordLo:'ລີງ',    nameLo:'ລໍ່ ລີງ',     nameTh:'ล ลิง',    nameEn:'l (monkey)' },
    { c:'ວ', obj:'🪭', rom:'w',   wordLo:'ວີ',     nameLo:'ວໍ່ ວີ',      nameTh:'ว วี',     nameEn:'w (fan)' },
    { c:'ຫ', obj:'🦢', rom:'h',   wordLo:'ຫ່ານ',   nameLo:'ຫໍ່ ຫ່ານ',    nameTh:'ห ห่าน',   nameEn:'h (goose)' },
    { c:'ອ', obj:'🥣', rom:'aw',  wordLo:'ໂອ',     nameLo:'ອໍ່ ໂອ',      nameTh:'อ โอ',     nameEn:'aw (bowl)' },
    { c:'ຮ', obj:'🏠', rom:'h',   wordLo:'ເຮືອນ',  nameLo:'ຮໍ່ ເຮືອນ',   nameTh:'ฮ เรือน',  nameEn:'h (house)' }
  ];

  // ===== UI strings per language =====
  const I18N = {
    th: {
      title: '📝 พยัญชนะลาว', back: '← หน้าหลัก',
      prev: 'ก่อนหน้า', speak: 'ออกเสียง', clear: 'ลบเส้น', check: 'ตรวจ',
      best: 'ดีที่สุด', done: 'ผ่านแล้ว', tries: 'รอบนี้',
      pass: 'เยี่ยม!', tryAgain: 'ลองอีกครั้ง',
      excellent: 'สุดยอด!', good: 'ดีมาก!'
    },
    en: {
      title: '📝 Lao Consonants', back: '← Home',
      prev: 'Back', speak: 'Sound', clear: 'Clear', check: 'Check',
      best: 'Best', done: 'Passed', tries: 'Tries',
      pass: 'Pass!', tryAgain: 'Try again',
      excellent: 'Excellent!', good: 'Good!'
    },
    lao: {
      title: '📝 ພະຍັນຊະນະລາວ', back: '← ໜ້າຫຼັກ',
      prev: 'ກ່ອນໜ້າ', speak: 'ອອກສຽງ', clear: 'ລົບເສັ້ນ', check: 'ກວດ',
      best: 'ດີສຸດ', done: 'ຜ່ານແລ້ວ', tries: 'ຮອບນີ້',
      pass: 'ດີຫຼາຍ!', tryAgain: 'ລອງໃໝ່',
      excellent: 'ສຸດຍອດ!', good: 'ດີຫຼາຍ!'
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'lao_abc_stats_v1';
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return {
        best: s.best || {},
        passed: s.passed || []
      };
    } catch { return { best: {}, passed: [] }; }
  }
  function saveStats(patch) {
    const cur = loadStats();
    const updated = Object.assign({}, cur, patch);
    try { localStorage.setItem(STATS_KEY, JSON.stringify(updated)); } catch {}
    return updated;
  }

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'th';
  })();
  let currentIdx = 0;
  let tries = 0;
  let dpr = 1;

  // ===== DOM =====
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

  // ===== Canvas sizing =====
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
    const ch = CONSONANTS[currentIdx];
    if (!ch) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    sCtx.clearRect(0, 0, w, h);
    const size = Math.floor(Math.min(w, h) * 0.66);
    sCtx.font = `500 ${size}px 'Noto Sans Lao', 'Phetsarath', sans-serif`;
    sCtx.fillStyle = '#9d174d';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText(ch.c, w / 2, h / 2 + size * 0.04);
  }

  // ===== Drawing =====
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
    uCtx.strokeStyle = '#be185d';
    uCtx.lineWidth = Math.max(18, wrap.clientWidth * 0.095);
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

  function clearUser() {
    uCtx.clearRect(0, 0, wrap.clientWidth, wrap.clientHeight);
  }

  // ===== Pixel coverage =====
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
    const pct = Math.max(0, Math.min(100, Math.round(coverage * 100 - waste * 15)));
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

  function render() {
    const ch = CONSONANTS[currentIdx];
    if (!ch) return;
    elLetter.textContent = ch.c;
    elObj.textContent = ch.obj;
    elVname.textContent = (lang === 'th' ? ch.nameTh : lang === 'en' ? ch.nameEn : ch.nameLo);
    if (lang === 'lao') elVnameSub.textContent = `${ch.nameTh} · ${ch.nameEn}`;
    else if (lang === 'th') elVnameSub.textContent = `${ch.nameLo} · ${ch.nameEn}`;
    else elVnameSub.textContent = `${ch.nameLo} · ${ch.nameTh}`;
    elVrom.textContent = '/' + ch.rom + '/';

    tries = 0;
    elTries.textContent = '0';
    elProgCur.textContent = (currentIdx + 1);
    elProgTotal.textContent = CONSONANTS.length;
    elProgFill.style.width = ((currentIdx + 1) / CONSONANTS.length * 100) + '%';
    clearUser();
    renderShadow();
    refreshStats();
  }

  function refreshStats() {
    const stats = loadStats();
    elBest.textContent = stats.best[currentIdx] || 0;
    elDone.textContent = stats.passed.length;
    elDoneTotal.textContent = CONSONANTS.length;
  }

  function nextLetter() {
    currentIdx = (currentIdx + 1) % CONSONANTS.length;
    render();
  }
  function prevLetter() {
    currentIdx = (currentIdx - 1 + CONSONANTS.length) % CONSONANTS.length;
    render();
  }

  function speak() {
    const ch = CONSONANTS[currentIdx];
    if (!ch) return;
    // Pronounce the Lao word (more natural than the letter alone)
    const text = ch.wordLo;
    if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
      try { window.AndroidTTS.speak(text, 'lo-LA'); return; } catch {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'lo-LA';
        u.rate = 0.8;
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
      setTimeout(() => { nextLetter(); }, 1300);
    } else {
      showFeedback('❌', pct, false);
    }
    refreshStats();
  });
  $('btn-clear').addEventListener('click', clearUser);
  $('btn-prev').addEventListener('click', prevLetter);
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
    resizeTimer = setTimeout(() => {
      sizeCanvases();
      renderShadow();
      clearUser();
    }, 150);
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') {
        lang = v;
        applyLang();
      }
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
