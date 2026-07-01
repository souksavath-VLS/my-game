// Lao Vowel tracing game — 28 standard Lao vowels with pattern + example syllable,
// pixel-coverage trace detection, TTS pronunciation, per-vowel best score, language sync from index page.

(() => {
  'use strict';

  // ===== 28 Standard Lao Vowels =====
  // p = visual pattern (uses ◌ placeholder), e = example syllable to trace with ກ,
  // rom = romanization, nameLo = Lao name, nameTh = Thai name, nameEn = English description
  const VOWELS = [
    { p:'◌ະ',   e:'ກະ',  rom:'a',    nameLo:'ສະຫຼະ ອະ',   nameTh:'สระ อะ',    nameEn:'a (short)' },
    { p:'◌າ',   e:'ກາ',  rom:'aa',   nameLo:'ສະຫຼະ ອາ',   nameTh:'สระ อา',    nameEn:'a (long)' },
    { p:'◌ິ',   e:'ກິ',  rom:'i',    nameLo:'ສະຫຼະ ອິ',   nameTh:'สระ อิ',    nameEn:'i (short)' },
    { p:'◌ີ',   e:'ກີ',  rom:'ii',   nameLo:'ສະຫຼະ ອີ',   nameTh:'สระ อี',    nameEn:'i (long)' },
    { p:'◌ຶ',   e:'ກຶ',  rom:'ue',   nameLo:'ສະຫຼະ ອຶ',   nameTh:'สระ อึ',    nameEn:'ue (short)' },
    { p:'◌ື',   e:'ກື',  rom:'uue',  nameLo:'ສະຫຼະ ອື',   nameTh:'สระ อื',    nameEn:'ue (long)' },
    { p:'◌ຸ',   e:'ກຸ',  rom:'u',    nameLo:'ສະຫຼະ ອຸ',   nameTh:'สระ อุ',    nameEn:'u (short)' },
    { p:'◌ູ',   e:'ກູ',  rom:'uu',   nameLo:'ສະຫຼະ ອູ',   nameTh:'สระ อู',    nameEn:'u (long)' },
    { p:'ເ◌ະ',  e:'ເກະ', rom:'e',    nameLo:'ສະຫຼະ ເອະ',  nameTh:'สระ เอะ',   nameEn:'e (short)' },
    { p:'ເ◌',   e:'ເກ',  rom:'ee',   nameLo:'ສະຫຼະ ເອ',   nameTh:'สระ เอ',    nameEn:'e (long)' },
    { p:'ແ◌ະ',  e:'ແກະ', rom:'ae',   nameLo:'ສະຫຼະ ແອະ',  nameTh:'สระ แอะ',   nameEn:'ae (short)' },
    { p:'ແ◌',   e:'ແກ',  rom:'aae',  nameLo:'ສະຫຼະ ແອ',   nameTh:'สระ แอ',    nameEn:'ae (long)' },
    { p:'ໂ◌ະ',  e:'ໂກະ', rom:'o',    nameLo:'ສະຫຼະ ໂອະ',  nameTh:'สระ โอะ',   nameEn:'o (short)' },
    { p:'ໂ◌',   e:'ໂກ',  rom:'oo',   nameLo:'ສະຫຼະ ໂອ',   nameTh:'สระ โอ',    nameEn:'o (long)' },
    { p:'ເ◌າະ', e:'ເກາະ',rom:'or',   nameLo:'ສະຫຼະ ເອາະ', nameTh:'สระ เอาะ',  nameEn:'or (short)' },
    { p:'◌ໍ',   e:'ກໍ',  rom:'oor',  nameLo:'ສະຫຼະ ອໍ',   nameTh:'สระ ออ',    nameEn:'or (long)' },
    { p:'ເ◌ິ',  e:'ເກິ', rom:'oe',   nameLo:'ສະຫຼະ ເອິ',  nameTh:'สระ เออะ',  nameEn:'oe (short)' },
    { p:'ເ◌ີ',  e:'ເກີ', rom:'ooe',  nameLo:'ສະຫຼະ ເອີ',  nameTh:'สระ เออ',   nameEn:'oe (long)' },
    { p:'ເ◌ັຍ', e:'ເກັຍ',rom:'ia',   nameLo:'ສະຫຼະ ເອັຍ', nameTh:'สระ เอียะ', nameEn:'ia (short)' },
    { p:'ເ◌ຍ',  e:'ເກຍ', rom:'iia',  nameLo:'ສະຫຼະ ເອຍ',  nameTh:'สระ เอีย',  nameEn:'ia (long)' },
    { p:'ເ◌ຶອ', e:'ເກຶອ',rom:'uea',  nameLo:'ສະຫຼະ ເອຶອ', nameTh:'สระ เอือะ', nameEn:'uea (short)' },
    { p:'ເ◌ືອ', e:'ເກືອ',rom:'uuea', nameLo:'ສະຫຼະ ເອືອ', nameTh:'สระ เอือ',  nameEn:'uea (long)' },
    { p:'◌ົວະ', e:'ກົວະ',rom:'ua',   nameLo:'ສະຫຼະ ອົວະ', nameTh:'สระ อัวะ',  nameEn:'ua (short)' },
    { p:'◌ົວ',  e:'ກົວ', rom:'uua',  nameLo:'ສະຫຼະ ອົວ',  nameTh:'สระ อัว',   nameEn:'ua (long)' },
    { p:'ໄ◌',   e:'ໄກ',  rom:'ai',   nameLo:'ສະຫຼະ ໄອ',   nameTh:'สระ ไอ',    nameEn:'ai (ໄ-)' },
    { p:'ໃ◌',   e:'ໃກ',  rom:'ai',   nameLo:'ສະຫຼະ ໃອ',   nameTh:'สระ ใอ',    nameEn:'ai (ໃ-)' },
    { p:'ເ◌ົາ', e:'ເກົາ',rom:'ao',   nameLo:'ສະຫຼະ ເອົາ', nameTh:'สระ เอา',   nameEn:'ao' },
    { p:'◌ຳ',   e:'ກຳ',  rom:'am',   nameLo:'ສະຫຼະ ອຳ',   nameTh:'สระ อำ',    nameEn:'am' }
  ];

  // ===== UI strings per language =====
  const I18N = {
    th: {
      title: '📝 สระลาว', back: '← หน้าหลัก',
      prev: 'ก่อนหน้า', speak: 'ออกเสียง', clear: 'ลบเส้น', check: 'ตรวจ',
      best: 'ดีที่สุด', done: 'ผ่านแล้ว', tries: 'รอบนี้',
      pass: 'เยี่ยม!', tryAgain: 'ลองอีกครั้ง',
      excellent: 'สุดยอด!', good: 'ดีมาก!'
    },
    en: {
      title: '📝 Lao Vowels', back: '← Home',
      prev: 'Back', speak: 'Sound', clear: 'Clear', check: 'Check',
      best: 'Best', done: 'Passed', tries: 'Tries',
      pass: 'Pass!', tryAgain: 'Try again',
      excellent: 'Excellent!', good: 'Good!'
    },
    lao: {
      title: '📝 ສະຫຼະລາວ', back: '← ໜ້າຫຼັກ',
      prev: 'ກ່ອນໜ້າ', speak: 'ອອກສຽງ', clear: 'ລົບເສັ້ນ', check: 'ກວດ',
      best: 'ດີສຸດ', done: 'ຜ່ານແລ້ວ', tries: 'ຮອບນີ້',
      pass: 'ດີຫຼາຍ!', tryAgain: 'ລອງໃໝ່',
      excellent: 'ສຸດຍອດ!', good: 'ດີຫຼາຍ!'
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'lao_vowel_stats_v1';
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return {
        best: s.best || {},         // {index: bestPct}
        passed: s.passed || []      // array of indices that passed once
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
  let tries = 0;             // tries on current vowel
  let dpr = 1;               // device pixel ratio

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const wrap = $('canvas-wrap');
  const shadowCanvas = $('shadow-canvas');
  const userCanvas = $('user-canvas');
  const sCtx = shadowCanvas.getContext('2d');
  const uCtx = userCanvas.getContext('2d');
  const elFeedback = $('feedback');
  const elPattern = $('pattern');
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

  // ===== Canvas sizing (responsive) =====
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

  // ===== Render shadow (target character) into shadowCanvas at full opacity.
  // CSS opacity dims it visually; pixel data stays full-strength for detection.
  function renderShadow() {
    const v = VOWELS[currentIdx];
    if (!v) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    sCtx.clearRect(0, 0, w, h);
    // Pick font size that fits
    const size = Math.floor(Math.min(w, h) * 0.66);
    sCtx.font = `500 ${size}px 'Noto Sans Lao', 'Phetsarath', sans-serif`;
    sCtx.fillStyle = '#1e40af';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText(v.e, w / 2, h / 2 + size * 0.05);
  }

  // ===== Drawing on userCanvas =====
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
    uCtx.strokeStyle = '#1d4ed8';
    uCtx.lineWidth = Math.max(18, wrap.clientWidth * 0.095);
    // Dot at click — so a single tap still leaves a mark
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

  // ===== Pixel-coverage trace check =====
  // Pixels considered "shadow" = alpha > 30 in shadow canvas
  // Pixels considered "user"   = alpha > 30 in user canvas
  // coverage = (shadow ∩ user) / shadow
  // waste    = (user \ shadow) / user
  // score = clamp(coverage*100 - waste*30, 0, 100)
  function evaluateTrace() {
    const sd = sCtx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height).data;
    const ud = uCtx.getImageData(0, 0, userCanvas.width, userCanvas.height).data;
    let shadowCount = 0, userCount = 0, overlap = 0, wasteCount = 0;
    // Step a few pixels to keep it cheap on mobile
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
    if (shadowCount === 0) return { pct: 0, coverage: 0, waste: 0 };
    const coverage = overlap / shadowCount;
    const waste = userCount > 0 ? wasteCount / userCount : 0;
    const pct = Math.max(0, Math.min(100, Math.round(coverage * 100 - waste * 15)));
    return { pct, coverage, waste };
  }

  // ===== Feedback popup =====
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

  // ===== Render the current vowel card =====
  function render() {
    const v = VOWELS[currentIdx];
    if (!v) return;
    elPattern.textContent = v.p;
    elVname.textContent = (lang === 'th' ? v.nameTh : lang === 'en' ? v.nameEn : v.nameLo);
    // Secondary line: show the other 2 names for learning
    if (lang === 'lao') elVnameSub.textContent = `${v.nameTh} · ${v.nameEn}`;
    else if (lang === 'th') elVnameSub.textContent = `${v.nameLo} · ${v.nameEn}`;
    else elVnameSub.textContent = `${v.nameLo} · ${v.nameTh}`;
    elVrom.textContent = '/' + v.rom + '/';

    tries = 0;
    elTries.textContent = '0';
    elProgCur.textContent = (currentIdx + 1);
    elProgTotal.textContent = VOWELS.length;
    elProgFill.style.width = ((currentIdx + 1) / VOWELS.length * 100) + '%';
    clearUser();
    renderShadow();
    refreshStats();
  }

  function refreshStats() {
    const stats = loadStats();
    elBest.textContent = stats.best[currentIdx] || 0;
    elDone.textContent = stats.passed.length;
    elDoneTotal.textContent = VOWELS.length;
  }

  // ===== Navigation =====
  function nextVowel() {
    currentIdx = (currentIdx + 1) % VOWELS.length;
    render();
  }
  function prevVowel() {
    currentIdx = (currentIdx - 1 + VOWELS.length) % VOWELS.length;
    render();
  }

  // ===== Speech (TTS) =====
  function speak() {
    const v = VOWELS[currentIdx];
    if (!v) return;
    const text = v.e; // pronounce the example syllable
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

  // ===== Buttons =====
  $('btn-check').addEventListener('click', () => {
    tries++;
    elTries.textContent = tries;
    const { pct } = evaluateTrace();
    // Save best regardless of pass/fail
    const stats = loadStats();
    const prevBest = stats.best[currentIdx] || 0;
    if (pct > prevBest) {
      stats.best[currentIdx] = pct;
      saveStats({ best: stats.best });
    }
    const isPass = pct >= 50;
    if (isPass) {
      // Mark passed
      if (!stats.passed.includes(currentIdx)) {
        stats.passed.push(currentIdx);
        saveStats({ passed: stats.passed });
      }
      showFeedback('✅', pct, true);
      // Auto-advance after pass
      setTimeout(() => { nextVowel(); }, 1300);
    } else {
      showFeedback('❌', pct, false);
    }
    refreshStats();
  });
  $('btn-clear').addEventListener('click', clearUser);
  $('btn-prev').addEventListener('click', prevVowel);
  $('btn-speak').addEventListener('click', speak);

  // ===== Apply language to UI =====
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

  // ===== Resize handler =====
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      sizeCanvases();
      renderShadow();
      // Note: clears user drawing on resize
      clearUser();
    }, 150);
  });

  // React to language changes from index page (other tabs)
  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') {
        lang = v;
        applyLang();
      }
    }
  });

  // ===== Init =====
  // Wait for fonts to be ready so the shadow renders with the correct Lao glyphs
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
