// Weekdays game — Learn + Quiz modes with traditional Thai/Lao day colors.
// Multi-language, TTS, star rating, today widget, localStorage best.

(() => {
  'use strict';

  // ===== 7 days starting from Sunday (Thai/Lao tradition) =====
  // Each day has its traditional Buddhist-tradition color (สีประจำวัน / ສີປະຈຳວັນ)
  const DAYS = [
    { idx:0, en:'Sunday',    th:'อาทิตย์',    lo:'ອາທິດ',   short:'Sun', em:'☀️', color:'#ef4444',
      colorEn:'red',     colorTh:'แดง',    colorLo:'ແດງ' },
    { idx:1, en:'Monday',    th:'จันทร์',     lo:'ຈັນ',     short:'Mon', em:'🌙', color:'#fbbf24',
      colorEn:'yellow',  colorTh:'เหลือง', colorLo:'ເຫຼືອງ' },
    { idx:2, en:'Tuesday',   th:'อังคาร',     lo:'ອັງຄານ',  short:'Tue', em:'🌺', color:'#ec4899',
      colorEn:'pink',    colorTh:'ชมพู',  colorLo:'ບົວ' },
    { idx:3, en:'Wednesday', th:'พุธ',        lo:'ພຸດ',     short:'Wed', em:'🌿', color:'#10b981',
      colorEn:'green',   colorTh:'เขียว', colorLo:'ຂຽວ' },
    { idx:4, en:'Thursday',  th:'พฤหัสบดี',  lo:'ພະຫັດ',   short:'Thu', em:'🍊', color:'#f97316',
      colorEn:'orange',  colorTh:'ส้ม',    colorLo:'ສົ້ມ' },
    { idx:5, en:'Friday',    th:'ศุกร์',      lo:'ສຸກ',     short:'Fri', em:'💧', color:'#3b82f6',
      colorEn:'blue',    colorTh:'ฟ้า',    colorLo:'ຟ້າ' },
    { idx:6, en:'Saturday',  th:'เสาร์',      lo:'ເສົາ',    short:'Sat', em:'🍇', color:'#8b5cf6',
      colorEn:'purple',  colorTh:'ม่วง',  colorLo:'ມ່ວງ' }
  ];

  // ===== UI strings =====
  const I18N = {
    th: {
      title:'📅 วันในสัปดาห์', back:'← หน้าหลัก',
      learn:'เรียน', quiz:'ทดสอบ',
      time:'เวลา', miss:'พลาด', best:'ดีที่สุด',
      todayLbl:'วันนี้คือ',
      tapToHear:'แตะวันเพื่อฟังเสียง',
      winTitle:'เก่งมาก!', winLblTime:'เวลา', winLblMiss:'พลาด', again:'▶ เล่นใหม่'
    },
    en: {
      title:'📅 Weekdays', back:'← Home',
      learn:'Learn', quiz:'Quiz',
      time:'Time', miss:'Miss', best:'Best',
      todayLbl:'Today is',
      tapToHear:'Tap a day to hear it',
      winTitle:'Well done!', winLblTime:'Time', winLblMiss:'Miss', again:'▶ Play Again'
    },
    lao: {
      title:'📅 ວັນໃນອາທິດ', back:'← ໜ້າຫຼັກ',
      learn:'ຮຽນ', quiz:'ທົດສອບ',
      time:'ເວລາ', miss:'ພາດ', best:'ດີສຸດ',
      todayLbl:'ມື້ນີ້ແມ່ນ',
      tapToHear:'ກົດວັນເພື່ອຟັງສຽງ',
      winTitle:'ເກັ່ງຫຼາຍ!', winLblTime:'ເວລາ', winLblMiss:'ພາດ', again:'▶ ຫຼິ້ນອີກ'
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'weekdays_stats_v1';
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
  let shuffled = [];
  let nextIdx = 0;        // 0..6: which day should be tapped next
  let missCount = 0;
  let startTime = 0;
  let timerId = null;
  let inProgress = false;
  let finished = false;
  const todayIdx = new Date().getDay(); // 0=Sunday

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

  function nameFor(d, l) {
    if (l === 'th') return d.th;
    if (l === 'lao') return d.lo;
    return d.en;
  }
  function colorFor(d, l) {
    if (l === 'th') return d.colorTh;
    if (l === 'lao') return d.colorLo;
    return d.colorEn;
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
  function speak(d) {
    const text = d.en;
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

  // ===== Render =====
  function renderGrid() {
    elGrid.innerHTML = '';
    elGrid.classList.toggle('quiz', mode === 'quiz');
    for (const d of shuffled) {
      const cell = document.createElement('div');
      cell.className = 'wd-cell';
      cell.style.setProperty('--day-color', d.color);
      cell.dataset.idx = d.idx;
      if (d.idx === todayIdx) cell.classList.add('today');
      cell.innerHTML = `
        <div class="num">${d.idx + 1}</div>
        <div class="em">${d.em}</div>
        <div class="name">${nameFor(d, lang)}</div>
      `;
      cell.addEventListener('click', () => onCellClick(cell, d));
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
    for (let i = 0; i < 7; i++) {
      const step = document.createElement('div');
      step.className = 'wd-step';
      if (i < nextIdx) step.classList.add('done');
      else if (i === nextIdx) step.classList.add('current');
      step.textContent = DAYS[i].short;
      elTimeline.appendChild(step);
    }
  }

  function renderTodayWidget() {
    const t = DAYS[todayIdx];
    $('today-em').textContent = t.em;
    $('today-lbl').textContent = I18N[lang].todayLbl;
    const pill = $('today-pill');
    pill.textContent = nameFor(t, lang);
    pill.style.background = t.color;
  }

  // ===== Click handling =====
  function onCellClick(cell, d) {
    ensureAudio();
    if (mode === 'learn') {
      showInfo(d);
      cell.classList.add('correct');
      setTimeout(() => cell.classList.remove('correct'), 460);
      speak(d);
      play('correct');
      return;
    }
    if (finished) return;
    if (!inProgress) { startQuizTimer(); inProgress = true; }
    if (d.idx === nextIdx) {
      cell.classList.add('correct');
      setTimeout(() => {
        cell.classList.remove('correct');
        cell.classList.add('done');
      }, 460);
      play('correct');
      speak(d);
      nextIdx++;
      renderTimeline();
      if (nextIdx >= 7) finishQuiz();
    } else {
      missCount++;
      elMiss.textContent = missCount;
      cell.classList.add('wrong');
      setTimeout(() => cell.classList.remove('wrong'), 420);
      play('wrong');
    }
  }

  function showInfo(d) {
    $('info-em').textContent = d.em;
    $('info-nm').textContent = nameFor(d, lang);
    const otherNames = ['en','th','lao'].filter(k => k !== lang).map(k => nameFor(d, k)).join(' · ');
    $('info-sb').textContent = otherNames;
    const chip = $('info-chip');
    chip.style.background = d.color;
    chip.textContent = colorFor(d, lang);
    elInfo.classList.add('show');
  }

  // ===== Timer / finish =====
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
    let stars = 3;
    if (missCount > 1 || sec > 35) stars = 2;
    if (missCount > 4 || sec > 60) stars = 1;
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

  // ===== Mode =====
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
    nextIdx = 0;
    elMiss.textContent = '0';
    elTime.textContent = '0s';
    elInfo.classList.remove('show');
    elModalWin.classList.remove('show');
    if (mode === 'quiz') shuffled = shuffle(DAYS);
    else shuffled = DAYS.slice();
    renderGrid();
    renderTimeline();
    refreshHud();
  }
  function refreshHud() {
    const s = loadStats();
    elBest.textContent = (mode === 'quiz' && s.bestTime) ? fmtTime(s.bestTime) : '—';
  }

  // ===== Wiring =====
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
    renderTodayWidget();
    renderGrid();
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  // ===== Init =====
  shuffled = DAYS.slice();
  applyLang();
  renderTimeline();
  refreshHud();
})();
