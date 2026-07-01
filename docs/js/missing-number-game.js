// Missing Number — find the missing number in a sequence.
// Endless levels with rising difficulty: range/step/length scale up.
// Multi-language, TTS, lives system, audio synth, localStorage best.

(() => {
  'use strict';

  // ===== UI strings =====
  const I18N = {
    th: {
      title:'🔢 เลขที่ขาด', back:'← หน้าหลัก',
      level:'เลเวล', score:'คะแนน', lives:'หัวใจ', best:'ดีที่สุด',
      hint:'เติมเลขที่ขาด',
      gameover:'จบเกม', overLblScore:'คะแนน', overLblLevel:'เลเวล',
      again:'▶ เล่นใหม่', levelUp:'เลเวล '
    },
    en: {
      title:'🔢 Missing Number', back:'← Home',
      level:'Level', score:'Score', lives:'Lives', best:'Best',
      hint:'Find the missing number',
      gameover:'Game Over', overLblScore:'Score', overLblLevel:'Level',
      again:'▶ Play Again', levelUp:'Level '
    },
    lao: {
      title:'🔢 ເລກທີ່ຂາດ', back:'← ໜ້າຫຼັກ',
      level:'ລະດັບ', score:'ຄະແນນ', lives:'ຫົວໃຈ', best:'ດີສຸດ',
      hint:'ຫາເລກທີ່ຂາດ',
      gameover:'ຈົບເກມ', overLblScore:'ຄະແນນ', overLblLevel:'ລະດັບ',
      again:'▶ ຫຼິ້ນອີກ', levelUp:'ລະດັບ '
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'missing_num_stats_v1';
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return { bestScore: s.bestScore | 0, bestLevel: s.bestLevel | 0, plays: s.plays | 0 };
    } catch { return { bestScore: 0, bestLevel: 0, plays: 0 }; }
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
    if (kind === 'levelup') {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.13, 'sine', 0.07), i*100));
    }
    if (kind === 'gameover'){ beep(330, 0.2, 'sawtooth', 0.1); setTimeout(() => beep(220, 0.3, 'sawtooth', 0.1), 200); setTimeout(() => beep(165, 0.5, 'sawtooth', 0.1), 480); }
  }

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'th';
  })();
  let level = 1;
  let score = 0;
  let lives = 5;
  let sequence = [];        // current full sequence (numbers)
  let missingIdx = 0;       // index in sequence where it's hidden
  let missingValue = 0;
  let options = [];
  let answering = false;

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const elSeq = $('sequence');
  const elOptions = $('options');
  const elLevel = $('ui-level');
  const elScore = $('ui-score');
  const elLives = $('ui-lives');
  const elBest = $('ui-best');
  const elFlash = $('flash');
  const elModalOver = $('modal-over');
  // Tap the hint to hear it again
  const elHint = $('seq-hint');
  if (elHint) {
    elHint.style.cursor = 'pointer';
    elHint.addEventListener('click', () => {
      if (elHint.textContent) speak(elHint.textContent);
    });
  }

  // ===== TTS =====
  function speak(text) {
    const v = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
    if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
      try { window.AndroidTTS.speak(text, v); return; } catch {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = v; u.rate = 0.85;
        window.speechSynthesis.speak(u);
      } catch {}
    }
  }

  // ===== Level config =====
  function levelConfig(lv) {
    // length of sequence shown (5 typical), step pattern
    let maxNum, step, length, reverse;
    length = lv >= 5 ? 6 : 5;
    if (lv <= 2)      { maxNum = 10;  step = 1;  reverse = false; }
    else if (lv <= 4) { maxNum = 20;  step = 1;  reverse = false; }
    else if (lv <= 6) { maxNum = 20;  step = 2;  reverse = false; }
    else if (lv <= 8) { maxNum = 30;  step = 2;  reverse = lv % 2 === 0; }
    else if (lv <= 12){ maxNum = 50;  step = 3;  reverse = lv % 2 === 0; }
    else              { maxNum = 100; step = 5;  reverse = lv % 2 === 0; }
    return { maxNum, step, length, reverse };
  }

  // ===== Build round =====
  function startRound() {
    answering = false;
    const cfg = levelConfig(level);
    // Pick a start so sequence fits in [1..maxNum]
    const span = (cfg.length - 1) * cfg.step;
    const minStart = 1;
    const maxStart = cfg.maxNum - span;
    const start = minStart + Math.floor(Math.random() * Math.max(1, maxStart));
    sequence = [];
    for (let i = 0; i < cfg.length; i++) {
      sequence.push(start + i * cfg.step);
    }
    if (cfg.reverse) sequence.reverse();
    missingIdx = Math.floor(Math.random() * cfg.length);
    missingValue = sequence[missingIdx];

    // Build options: correct + 3 wrong (near the correct one)
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const delta = Math.max(1, cfg.step);
      const offset = (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? -1 : 1);
      const candidate = missingValue + offset * (delta === 1 ? 1 : Math.ceil(delta / 2));
      if (candidate !== missingValue && candidate > 0 && !wrongs.has(candidate)) {
        wrongs.add(candidate);
      }
    }
    options = shuffleArray([missingValue, ...wrongs]);

    renderSequence();
    renderOptions();
    elLevel.textContent = level;
    // Speak the question hint each round
    const hintEl = $('seq-hint');
    if (hintEl && hintEl.textContent) speak(hintEl.textContent);
  }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderSequence() {
    elSeq.innerHTML = '';
    for (let i = 0; i < sequence.length; i++) {
      const cell = document.createElement('div');
      cell.className = 'mn-seq-cell';
      if (i === missingIdx) {
        cell.classList.add('miss');
        cell.textContent = '?';
      } else {
        cell.textContent = sequence[i];
      }
      elSeq.appendChild(cell);
      if (i < sequence.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'mn-seq-sep';
        sep.textContent = '·';
        elSeq.appendChild(sep);
      }
    }
  }

  function renderOptions() {
    elOptions.innerHTML = '';
    for (const opt of options) {
      const btn = document.createElement('button');
      btn.className = 'mn-opt';
      btn.textContent = opt;
      btn.dataset.v = opt;
      btn.addEventListener('click', () => onAnswer(btn, opt));
      elOptions.appendChild(btn);
    }
  }

  function onAnswer(btn, val) {
    if (answering) return;
    answering = true;
    ensureAudio();
    const correct = val === missingValue;
    [...elOptions.querySelectorAll('.mn-opt')].forEach(b => {
      const v = parseInt(b.dataset.v, 10);
      if (v === missingValue) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    if (correct) {
      score += 10 + level * 2;
      elScore.textContent = score;
      play('correct');
      speak(String(missingValue));
      // Level up every 3 correct answers
      const nextLevel = Math.floor(score / 60) + 1;
      const leveledUp = nextLevel > level;
      setTimeout(() => {
        if (leveledUp) {
          level = nextLevel;
          showFlash(I18N[lang].levelUp + level + ' 🎉');
          play('levelup');
        }
        startRound();
      }, 700);
    } else {
      lives--;
      elLives.textContent = '❤'.repeat(Math.max(0, lives)) || '·';
      play('wrong');
      setTimeout(() => {
        if (lives <= 0) {
          gameOver();
        } else {
          // Allow another attempt on the same round
          startRound();
        }
      }, 1100);
    }
  }

  function showFlash(msg) {
    elFlash.textContent = msg;
    elFlash.classList.remove('show');
    void elFlash.offsetWidth;
    elFlash.classList.add('show');
  }

  function gameOver() {
    play('gameover');
    const prev = loadStats();
    const isNewBest = score > prev.bestScore;
    const updated = saveStats({
      bestScore: Math.max(prev.bestScore, score),
      bestLevel: Math.max(prev.bestLevel, level),
      plays: prev.plays + 1
    });
    $('over-score').textContent = score;
    $('over-level').textContent = level;
    $('newbest').style.display = (isNewBest && score > 0) ? 'inline-block' : 'none';
    elBest.textContent = updated.bestScore;
    setTimeout(() => elModalOver.classList.add('show'), 500);
  }

  // ===== Buttons =====
  $('btn-again').addEventListener('click', () => {
    ensureAudio();
    elModalOver.classList.remove('show');
    level = 1; score = 0; lives = 5;
    elLevel.textContent = '1';
    elScore.textContent = '0';
    elLives.textContent = '❤❤❤❤❤';
    startRound();
  });

  // ===== Localization =====
  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    $('lbl-level').textContent = t.level;
    $('lbl-score').textContent = t.score;
    $('lbl-lives').textContent = t.lives;
    $('lbl-best').textContent = t.best;
    $('seq-hint').textContent = t.hint;
    $('over-title').textContent = t.gameover;
    $('over-lbl-score').textContent = t.overLblScore;
    $('over-lbl-level').textContent = t.overLblLevel;
    $('btn-again').textContent = t.again;
    document.title = t.title;
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  // ===== Init =====
  function refreshHud() {
    const s = loadStats();
    elBest.textContent = s.bestScore;
  }
  applyLang();
  refreshHud();
  startRound();
})();
