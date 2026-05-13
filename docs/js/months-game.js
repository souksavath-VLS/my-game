// Months game — Learn + Quiz modes, multi-language, TTS, progress timeline, star rating, localStorage best.

(() => {
  'use strict';

  // ===== 12 months with names per language + season emoji =====
  const MONTHS = [
    { n: 1,  en:'January',   th:'มกราคม',     lo:'ມັງກອນ',   short:'Jan', emoji:'❄️' },
    { n: 2,  en:'February',  th:'กุมภาพันธ์', lo:'ກຸມພາ',    short:'Feb', emoji:'🥶' },
    { n: 3,  en:'March',     th:'มีนาคม',     lo:'ມີນາ',     short:'Mar', emoji:'🌷' },
    { n: 4,  en:'April',     th:'เมษายน',     lo:'ເມສາ',     short:'Apr', emoji:'🌸' },
    { n: 5,  en:'May',       th:'พฤษภาคม',    lo:'ພຶດສະພາ',  short:'May', emoji:'🌻' },
    { n: 6,  en:'June',      th:'มิถุนายน',   lo:'ມິຖຸນາ',   short:'Jun', emoji:'☀️' },
    { n: 7,  en:'July',      th:'กรกฎาคม',    lo:'ກໍລະກົດ',  short:'Jul', emoji:'🌴' },
    { n: 8,  en:'August',    th:'สิงหาคม',    lo:'ສິງຫາ',    short:'Aug', emoji:'⛱️' },
    { n: 9,  en:'September', th:'กันยายน',    lo:'ກັນຍາ',    short:'Sep', emoji:'🍂' },
    { n:10,  en:'October',   th:'ตุลาคม',     lo:'ຕຸລາ',     short:'Oct', emoji:'🎃' },
    { n:11,  en:'November',  th:'พฤศจิกายน',  lo:'ພະຈິກ',    short:'Nov', emoji:'🍁' },
    { n:12,  en:'December',  th:'ธันวาคม',    lo:'ທັນວາ',    short:'Dec', emoji:'🎄' }
  ];

  // ===== UI strings =====
  const I18N = {
    th: {
      title:'📅 เดือนในปี', back:'← หน้าหลัก',
      learn:'เรียน', quiz:'ทดสอบ',
      time:'เวลา', miss:'พลาด', best:'ดีที่สุด',
      tapToHear:'แตะเดือนเพื่อฟังเสียง',
      quizPrompt:'แตะเดือนที่ ',
      winTitle:'เก่งมาก!', winLblTime:'เวลา', winLblMiss:'พลาด', again:'▶ เล่นใหม่'
    },
    en: {
      title:'📅 Months', back:'← Home',
      learn:'Learn', quiz:'Quiz',
      time:'Time', miss:'Miss', best:'Best',
      tapToHear:'Tap a month to hear it',
      quizPrompt:'Tap month ',
      winTitle:'Well done!', winLblTime:'Time', winLblMiss:'Miss', again:'▶ Play Again'
    },
    lao: {
      title:'📅 ເດືອນໃນປີ', back:'← ໜ້າຫຼັກ',
      learn:'ຮຽນ', quiz:'ທົດສອບ',
      time:'ເວລາ', miss:'ພາດ', best:'ດີສຸດ',
      tapToHear:'ກົດເດືອນເພື່ອຟັງສຽງ',
      quizPrompt:'ກົດເດືອນທີ ',
      winTitle:'ເກັ່ງຫຼາຍ!', winLblTime:'ເວລາ', winLblMiss:'ພາດ', again:'▶ ຫຼິ້ນອີກ'
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'months_stats_v1';
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

  // ===== Web Audio =====
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
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
  let shuffled = [];   // shuffled MONTHS list (visual order in grid)
  let nextMonthN = 1;  // quiz: next month number to tap (1..12)
  let missCount = 0;
  let startTime = 0;
  let timerId = null;
  let inProgress = false;
  let finished = false;

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const elGrid = $('grid');
  const elTimeline = $('timeline');
  const elInfo = $('info');
  const elTabLearn = $('tab-learn');
  const elTabQuiz = $('tab-quiz');
  const elTime = $('ui-time');
  const elMiss = $('ui-miss');
  const elBest = $('ui-best');
  const elModalWin = $('modal-win');

  // ===== Helpers =====
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function nameFor(m, l) {
    if (l === 'th') return m.th;
    if (l === 'lao') return m.lo;
    return m.en;
  }
  function fmtTime(sec) {
    if (sec >= 60) return Math.floor(sec/60)+'m '+(sec%60)+'s';
    return sec+'s';
  }

  // ===== TTS =====
  function speak(m) {
    const text = m.en; // TTS coverage is best in English; consistent across browsers
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

  // ===== Render grid =====
  function renderGrid() {
    elGrid.innerHTML = '';
    elGrid.classList.toggle('quiz', mode === 'quiz');
    for (const m of shuffled) {
      const cell = document.createElement('div');
      cell.className = 'mg-cell';
      cell.dataset.num = m.n;
      cell.innerHTML = `
        <div class="num">${m.n}</div>
        <div class="emoji">${m.emoji}</div>
        <div class="name">${nameFor(m, lang)}</div>
      `;
      cell.addEventListener('click', () => onCellClick(cell, m));
      elGrid.appendChild(cell);
    }
  }

  function renderTimeline() {
    elTimeline.innerHTML = '';
    if (mode !== 'quiz') {
      elTimeline.style.display = 'none';
      return;
    }
    elTimeline.style.display = 'flex';
    for (let i = 1; i <= 12; i++) {
      const step = document.createElement('div');
      step.className = 'mg-step';
      if (i < nextMonthN) step.classList.add('done');
      else if (i === nextMonthN) step.classList.add('current');
      step.textContent = i;
      elTimeline.appendChild(step);
    }
  }

  // ===== Click handling =====
  function onCellClick(cell, m) {
    ensureAudio();
    if (mode === 'learn') {
      showInfo(m);
      flashCorrect(cell);
      speak(m);
      play('correct');
      return;
    }
    // Quiz mode
    if (finished) return;
    if (!inProgress) {
      startQuizTimer();
      inProgress = true;
    }
    if (m.n === nextMonthN) {
      cell.classList.add('correct');
      setTimeout(() => {
        cell.classList.remove('correct');
        cell.classList.add('done');
      }, 460);
      play('correct');
      speak(m);
      nextMonthN++;
      renderTimeline();
      updateCurrentHint();
      if (nextMonthN > 12) finishQuiz();
    } else {
      missCount++;
      elMiss.textContent = missCount;
      cell.classList.add('wrong');
      setTimeout(() => cell.classList.remove('wrong'), 420);
      play('wrong');
    }
  }

  function updateCurrentHint() {
    // No special hint highlight (kids must find from name)
    // Optionally hint the next number on a cell? Keep clean.
    for (const cell of elGrid.querySelectorAll('.mg-cell')) {
      cell.classList.remove('current-hint');
    }
  }

  function flashCorrect(cell) {
    cell.classList.add('correct');
    setTimeout(() => cell.classList.remove('correct'), 460);
  }

  // ===== Info card (Learn) =====
  function showInfo(m) {
    $('info-em').textContent = m.emoji;
    $('info-nm').textContent = nameFor(m, lang);
    const otherNames = ['en','th','lao'].filter(k => k !== lang).map(k => nameFor(m, k)).join(' · ');
    $('info-sb').textContent = otherNames;
    $('info-nb').textContent = '#' + m.n;
    elInfo.classList.add('show');
  }
  function hideInfo() { elInfo.classList.remove('show'); }

  // ===== Quiz timer / finish =====
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
    // Star rating: 3 if fast & no miss, 2 if some miss, 1 minimum
    let stars = 3;
    if (missCount > 2 || sec > 60) stars = 2;
    if (missCount > 5 || sec > 90) stars = 1;
    const prev = loadStats();
    let isNewBest = false;
    if (!prev.bestTime || sec < prev.bestTime || stars > prev.bestStars) {
      isNewBest = true;
    }
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
    resetState();
  }

  function resetState() {
    stopQuizTimer();
    finished = false;
    inProgress = false;
    missCount = 0;
    nextMonthN = 1;
    elMiss.textContent = '0';
    elTime.textContent = '0s';
    hideInfo();
    elModalWin.classList.remove('show');
    if (mode === 'quiz') {
      shuffled = shuffle(MONTHS);
    } else {
      shuffled = MONTHS.slice(); // ordered in learn mode
    }
    renderGrid();
    renderTimeline();
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
    resetState();
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
    $('win-title').textContent = t.winTitle;
    $('win-lbl-time').textContent = t.winLblTime;
    $('win-lbl-miss').textContent = t.winLblMiss;
    $('btn-again').textContent = t.again;
    document.title = t.title;
    renderGrid();
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  // ===== Init =====
  shuffled = MONTHS.slice();
  applyLang();
  renderTimeline();
  refreshHud();
})();
