// A-Z Match game — Learn + Quiz modes.
// Learn: tap a letter pair to hear it + see word/object. Quiz: shown uppercase, tap matching lowercase.

(() => {
  'use strict';

  // ===== 26 letters with mascot emoji + word per language =====
  const LETTERS = [
    { u:'A', l:'a', em:'🍎', en:'Apple',     th:'แอปเปิ้ล',  lo:'ໝາກໂປມ' },
    { u:'B', l:'b', em:'🐝', en:'Bee',       th:'ผึ้ง',       lo:'ເຜິ້ງ' },
    { u:'C', l:'c', em:'🐱', en:'Cat',       th:'แมว',        lo:'ແມວ' },
    { u:'D', l:'d', em:'🐶', en:'Dog',       th:'หมา',        lo:'ໝາ' },
    { u:'E', l:'e', em:'🐘', en:'Elephant',  th:'ช้าง',        lo:'ຊ້າງ' },
    { u:'F', l:'f', em:'🐟', en:'Fish',      th:'ปลา',        lo:'ປາ' },
    { u:'G', l:'g', em:'🦒', en:'Giraffe',   th:'ยีราฟ',      lo:'ຍີຣາບ' },
    { u:'H', l:'h', em:'🏠', en:'House',     th:'บ้าน',        lo:'ເຮືອນ' },
    { u:'I', l:'i', em:'🍦', en:'Ice cream', th:'ไอศกรีม',    lo:'ໄອສະກີມ' },
    { u:'J', l:'j', em:'🤹', en:'Juggler',   th:'นักโยน',     lo:'ນັກໂຍນ' },
    { u:'K', l:'k', em:'🪁', en:'Kite',      th:'ว่าว',        lo:'ວ່າວ' },
    { u:'L', l:'l', em:'🦁', en:'Lion',      th:'สิงโต',      lo:'ສິງໂຕ' },
    { u:'M', l:'m', em:'🐵', en:'Monkey',    th:'ลิง',         lo:'ລີງ' },
    { u:'N', l:'n', em:'🪺', en:'Nest',      th:'รัง',         lo:'ຮັງ' },
    { u:'O', l:'o', em:'🦉', en:'Owl',       th:'นกฮูก',      lo:'ນົກເຄົ້າ' },
    { u:'P', l:'p', em:'🐷', en:'Pig',       th:'หมู',         lo:'ໝູ' },
    { u:'Q', l:'q', em:'👸', en:'Queen',     th:'ราชินี',     lo:'ລາຊິນີ' },
    { u:'R', l:'r', em:'🌈', en:'Rainbow',   th:'รุ้ง',        lo:'ຮຸ້ງ' },
    { u:'S', l:'s', em:'☀️', en:'Sun',       th:'พระอาทิตย์', lo:'ຕາເວັນ' },
    { u:'T', l:'t', em:'🌳', en:'Tree',      th:'ต้นไม้',     lo:'ຕົ້ນໄມ້' },
    { u:'U', l:'u', em:'☂️', en:'Umbrella',  th:'ร่ม',         lo:'ຄັນຮົ່ມ' },
    { u:'V', l:'v', em:'🎻', en:'Violin',    th:'ไวโอลิน',    lo:'ໄວໂອລິນ' },
    { u:'W', l:'w', em:'🐺', en:'Wolf',      th:'หมาป่า',     lo:'ໝາປ່າ' },
    { u:'X', l:'x', em:'🦴', en:'X-ray',     th:'เอกซเรย์',    lo:'ເອັກສະເຣ' },
    { u:'Y', l:'y', em:'🪀', en:'Yo-yo',     th:'โยโย่',       lo:'ໂຢໂຢ' },
    { u:'Z', l:'z', em:'🦓', en:'Zebra',     th:'ม้าลาย',     lo:'ມ້າລາຍ' }
  ];

  // ===== UI strings =====
  const I18N = {
    th: {
      title:'🔤 A-Z จับคู่', back:'← หน้าหลัก',
      learn:'เรียน', quiz:'ทดสอบ',
      time:'เวลา', miss:'พลาด', best:'ดีที่สุด',
      tapHint:'แตะตัวอักษรเพื่อฟังเสียง',
      quizHint:'แตะตัวเล็กที่ตรงกัน',
      winTitle:'เก่งมาก!', winLblTime:'เวลา', winLblMiss:'พลาด', again:'▶ เล่นใหม่'
    },
    en: {
      title:'🔤 A-Z Match', back:'← Home',
      learn:'Learn', quiz:'Quiz',
      time:'Time', miss:'Miss', best:'Best',
      tapHint:'Tap a letter to hear it',
      quizHint:'Tap the matching lowercase',
      winTitle:'Well done!', winLblTime:'Time', winLblMiss:'Miss', again:'▶ Play Again'
    },
    lao: {
      title:'🔤 A-Z ຈັບຄູ່', back:'← ໜ້າຫຼັກ',
      learn:'ຮຽນ', quiz:'ທົດສອບ',
      time:'ເວລາ', miss:'ພາດ', best:'ດີສຸດ',
      tapHint:'ກົດຕົວອັກສອນເພື່ອຟັງສຽງ',
      quizHint:'ກົດຕົວນ້ອຍທີ່ຄ່ຽງກັນ',
      winTitle:'ເກັ່ງຫຼາຍ!', winLblTime:'ເວລາ', winLblMiss:'ພາດ', again:'▶ ຫຼິ້ນອີກ'
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'az_stats_v1';
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return { bestTime: s.bestTime || 0, bestStars: s.bestStars || 0, plays: s.plays || 0 };
    } catch { return { bestTime: 0, bestStars: 0, plays: 0 }; }
  }
  function saveStats(patch) {
    const cur = loadStats();
    const upd = Object.assign({}, cur, patch);
    try { localStorage.setItem(STATS_KEY, JSON.stringify(upd)); } catch {}
    return upd;
  }

  // ===== Audio =====
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function beep(f, d, type, vol) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.connect(g); g.connect(audioCtx.destination);
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f, now);
    g.gain.setValueAtTime(vol || 0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + d);
    osc.start(now); osc.stop(now + d + 0.02);
  }
  function play(kind) {
    if (!audioCtx) return;
    if (kind === 'correct') beep(660 + Math.random()*200, 0.1, 'triangle', 0.06);
    if (kind === 'wrong')   { beep(220, 0.18, 'sawtooth', 0.07); setTimeout(() => beep(160, 0.16, 'sawtooth', 0.06), 150); }
    if (kind === 'win')     {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'sine', 0.07), i*110));
    }
  }

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'th';
  })();
  let mode = 'learn';
  let quizQueue = [];    // shuffled remaining letters for current quiz session
  let quizIdx = 0;       // index into quizQueue
  let current = null;    // current letter in quiz
  let missCount = 0;
  let startTime = 0;
  let timerId = null;
  let inProgress = false;
  let finished = false;
  let answering = false; // lock during reveal

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const elGrid = $('grid');
  const elInfo = $('info');
  const elTabLearn = $('tab-learn');
  const elTabQuiz = $('tab-quiz');
  const elTime = $('ui-time');
  const elMiss = $('ui-miss');
  const elBest = $('ui-best');
  const elQuizCard = $('quiz-card');
  const elQuizOptions = $('quiz-options');
  const elModalWin = $('modal-win');
  const elProgFill = $('prog-fill');
  const elProgCur = $('prog-cur');
  const elProgTotal = $('prog-total');

  function nameFor(it, l) {
    if (l === 'th') return it.th;
    if (l === 'lao') return it.lo;
    return it.en;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function fmtTime(sec) {
    if (sec >= 60) return Math.floor(sec/60)+'m '+(sec%60)+'s';
    return sec+'s';
  }

  // ===== TTS =====
  function speak(text) {
    if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
      try { window.AndroidTTS.speak(text, 'en-US'); return; } catch {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US'; u.rate = 0.85;
        window.speechSynthesis.speak(u);
      } catch {}
    }
  }

  // ===== LEARN MODE =====
  function renderGrid() {
    elGrid.innerHTML = '';
    for (const it of LETTERS) {
      const cell = document.createElement('div');
      cell.className = 'az-cell';
      cell.dataset.u = it.u;
      cell.innerHTML = `
        <div class="em">${it.em}</div>
        <div class="letters">${it.u}${it.l}</div>
      `;
      cell.addEventListener('click', () => onLearnTap(cell, it));
      elGrid.appendChild(cell);
    }
  }
  function onLearnTap(cell, it) {
    ensureAudio();
    cell.classList.add('correct');
    setTimeout(() => cell.classList.remove('correct'), 460);
    showInfo(it);
    speak(it.u + '. ' + it.en);
    play('correct');
  }
  function showInfo(it) {
    $('info-em').textContent = it.em;
    $('info-letters').textContent = it.u + it.l;
    $('info-word').textContent = nameFor(it, lang);
    const others = ['en','th','lao'].filter(k => k !== lang).map(k => nameFor(it, k)).join(' · ');
    $('info-sub').textContent = others;
    elInfo.classList.add('show');
  }

  // ===== QUIZ MODE =====
  function startQuiz() {
    quizQueue = shuffle(LETTERS);
    quizIdx = 0;
    missCount = 0;
    elMiss.textContent = '0';
    elTime.textContent = '0s';
    finished = false;
    answering = false;
    inProgress = false;
    elModalWin.classList.remove('show');
    renderQuizRound();
  }
  function renderQuizRound() {
    if (quizIdx >= quizQueue.length) {
      finishQuiz();
      return;
    }
    current = quizQueue[quizIdx];
    $('quiz-emoji').textContent = current.em;
    $('quiz-letter').textContent = current.u;
    elProgCur.textContent = quizIdx;
    elProgTotal.textContent = LETTERS.length;
    elProgFill.style.width = ((quizIdx) / LETTERS.length * 100) + '%';
    buildQuizOptions();
    answering = false;
  }
  function buildQuizOptions() {
    elQuizOptions.innerHTML = '';
    // Pick 3 wrong lowercase letters
    const others = LETTERS.filter(x => x.u !== current.u);
    const wrong = shuffle(others).slice(0, 3);
    const all = shuffle([current, ...wrong]);
    for (const opt of all) {
      const btn = document.createElement('button');
      btn.className = 'az-quiz-opt';
      btn.textContent = opt.l;
      btn.dataset.l = opt.l;
      btn.addEventListener('click', () => onQuizAnswer(btn, opt));
      elQuizOptions.appendChild(btn);
    }
  }
  function onQuizAnswer(btn, opt) {
    if (answering) return;
    ensureAudio();
    if (!inProgress) { startQuizTimer(); inProgress = true; }
    answering = true;
    const correct = opt.u === current.u;
    [...elQuizOptions.querySelectorAll('.az-quiz-opt')].forEach(b => {
      if (b.dataset.l === current.l) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    if (correct) {
      play('correct');
      speak(current.u);
    } else {
      missCount++;
      elMiss.textContent = missCount;
      play('wrong');
    }
    setTimeout(() => {
      if (correct) {
        quizIdx++;
        renderQuizRound();
      } else {
        // Allow another try on the same letter
        answering = false;
        buildQuizOptions();
      }
    }, correct ? 700 : 1100);
  }

  function startQuizTimer() {
    startTime = Date.now();
    timerId = setInterval(() => {
      const sec = Math.floor((Date.now() - startTime) / 1000);
      elTime.textContent = fmtTime(sec);
    }, 250);
  }
  function stopQuizTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function finishQuiz() {
    stopQuizTimer();
    finished = true;
    inProgress = false;
    const sec = Math.floor((Date.now() - startTime) / 1000);
    elTime.textContent = fmtTime(sec);
    elProgFill.style.width = '100%';
    elProgCur.textContent = LETTERS.length;
    // 3 stars: ≤80s + ≤2 miss; 2 stars: ≤140s + ≤6 miss; else 1
    let stars = 3;
    if (missCount > 2 || sec > 80) stars = 2;
    if (missCount > 6 || sec > 140) stars = 1;
    const prev = loadStats();
    const isNewBest = !prev.bestTime || sec < prev.bestTime || stars > prev.bestStars;
    const updated = saveStats({
      bestTime: (!prev.bestTime || sec < prev.bestTime) ? sec : prev.bestTime,
      bestStars: Math.max(prev.bestStars, stars),
      plays: prev.plays + 1
    });
    $('win-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    $('win-time').textContent = fmtTime(sec);
    $('win-miss').textContent = missCount;
    $('newbest').style.display = (isNewBest && sec > 0) ? 'inline-block' : 'none';
    elBest.textContent = updated.bestTime ? fmtTime(updated.bestTime) : '—';
    play('win');
    setTimeout(() => elModalWin.classList.add('show'), 500);
  }

  // ===== Mode switch =====
  function setMode(m) {
    mode = m;
    elTabLearn.classList.toggle('active', m === 'learn');
    elTabQuiz.classList.toggle('active', m === 'quiz');
    if (m === 'learn') {
      $('prog-row').style.display = 'none';
      elInfo.style.display = '';
      elGrid.classList.remove('hidden');
      elQuizCard.classList.add('hidden');
      elQuizOptions.classList.add('hidden');
      stopQuizTimer();
      elTime.textContent = '0s';
      elMiss.textContent = '0';
      elInfo.classList.remove('show');
    } else {
      $('prog-row').style.display = '';
      elInfo.style.display = 'none';
      elGrid.classList.add('hidden');
      elQuizCard.classList.remove('hidden');
      elQuizOptions.classList.remove('hidden');
      startQuiz();
    }
    refreshHud();
  }

  function refreshHud() {
    const s = loadStats();
    elBest.textContent = (mode === 'quiz' && s.bestTime) ? fmtTime(s.bestTime) : '—';
  }

  // ===== Buttons =====
  elTabLearn.addEventListener('click', () => setMode('learn'));
  elTabQuiz.addEventListener('click', () => setMode('quiz'));
  $('btn-again').addEventListener('click', () => {
    elModalWin.classList.remove('show');
    startQuiz();
  });

  // ===== Localization =====
  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    document.querySelector('#tab-learn span').textContent = t.learn;
    document.querySelector('#tab-quiz span').textContent = t.quiz;
    $('lbl-time').textContent = t.time;
    $('lbl-miss').textContent = t.miss;
    $('lbl-best').textContent = t.best;
    $('quiz-hint').textContent = t.quizHint;
    $('win-title').textContent = t.winTitle;
    $('win-lbl-time').textContent = t.winLblTime;
    $('win-lbl-miss').textContent = t.winLblMiss;
    $('btn-again').textContent = t.again;
    document.title = t.title;
    // Refresh content with new language
    renderGrid();
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  // ===== Init =====
  $('prog-row').style.display = 'none'; // hidden in learn mode
  applyLang();
  refreshHud();
})();
