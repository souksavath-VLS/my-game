// Count Fruits — show N fruit emojis, tap correct count from 4 options.
// Endless levels with rising count + tighter distractors. Lives, multi-language, TTS.

(() => {
  'use strict';

  // ===== 12 fruits — names corrected (the original had wrong translations) =====
  const FRUITS = [
    { em:'🍎', en:'apple',      th:'แอปเปิ้ล',   lo:'ໝາກໂປມ' },
    { em:'🍌', en:'banana',     th:'กล้วย',       lo:'ໝາກກ້ວຍ' },
    { em:'🍊', en:'orange',     th:'ส้ม',         lo:'ໝາກກ້ຽງ' },
    { em:'🍇', en:'grape',      th:'องุ่น',       lo:'ໝາກອະງຸ່ນ' },
    { em:'🍓', en:'strawberry', th:'สตรอเบอรี่', lo:'ສະຕໍເບີຣີ' },
    { em:'🍉', en:'watermelon', th:'แตงโม',      lo:'ໝາກໂມ' },
    { em:'🍍', en:'pineapple',  th:'สับปะรด',   lo:'ໝາກນັດ' },
    { em:'🥝', en:'kiwi',       th:'กีวี',        lo:'ກີວີ' },
    { em:'🥭', en:'mango',      th:'มะม่วง',     lo:'ໝາກມ່ວງ' },
    { em:'🍑', en:'peach',      th:'ลูกพีช',     lo:'ໝາກພີດ' },
    { em:'🍒', en:'cherry',     th:'เชอร์รี่',   lo:'ເຊີຣີ' },
    { em:'🍐', en:'pear',       th:'ลูกแพร์',    lo:'ໝາກສາລີ່' }
  ];

  const I18N = {
    th: {
      title:'🍎 นับผลไม้', back:'← หน้าหลัก',
      level:'เลเวล', score:'คะแนน', lives:'หัวใจ', best:'ดีที่สุด',
      qText: (name) => `มี ${name} กี่ลูก?`,
      qSub:'นับแล้วเลือกตัวเลขที่ถูกต้อง',
      gameover:'จบเกม', overLblScore:'คะแนน', overLblLevel:'เลเวล',
      again:'▶ เล่นใหม่', levelUp:'เลเวล '
    },
    en: {
      title:'🍎 Count Fruits', back:'← Home',
      level:'Level', score:'Score', lives:'Lives', best:'Best',
      qText: (name) => `How many ${name}?`,
      qSub:'Count and pick the correct number',
      gameover:'Game Over', overLblScore:'Score', overLblLevel:'Level',
      again:'▶ Play Again', levelUp:'Level '
    },
    lao: {
      title:'🍎 ນັບໝາກໄມ້', back:'← ໜ້າຫຼັກ',
      level:'ລະດັບ', score:'ຄະແນນ', lives:'ຫົວໃຈ', best:'ດີສຸດ',
      qText: (name) => `ມີ${name} ຈັກໜ່ວຍ?`,
      qSub:'ນັບແລ້ວເລືອກຕົວເລກທີ່ຖືກຕ້ອງ',
      gameover:'ຈົບເກມ', overLblScore:'ຄະແນນ', overLblLevel:'ລະດັບ',
      again:'▶ ຫຼິ້ນອີກ', levelUp:'ລະດັບ '
    }
  };

  const STATS_KEY = 'fruit_count_stats_v1';
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
    if (kind === 'wrong')   { beep(220, 0.16, 'sawtooth', 0.07); setTimeout(() => beep(160, 0.16, 'sawtooth', 0.06), 130); }
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
  let currentFruit = null;
  let currentCount = 0;
  let answering = false;

  const $ = id => document.getElementById(id);
  const elDisplay = $('display');
  const elOptions = $('options');
  const elLevel = $('ui-level');
  const elScore = $('ui-score');
  const elLives = $('ui-lives');
  const elBest = $('ui-best');
  const elFlash = $('flash');
  const elModalOver = $('modal-over');

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
  function randint(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

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
    // count range, distractor spread
    let minC, maxC, spread;
    if (lv <= 1)      { minC = 1;  maxC = 5;  spread = 3; }
    else if (lv <= 3) { minC = 2;  maxC = 8;  spread = 3; }
    else if (lv <= 5) { minC = 3;  maxC = 12; spread = 4; }
    else if (lv <= 8) { minC = 5;  maxC = 16; spread = 4; }
    else if (lv <= 12){ minC = 6;  maxC = 20; spread = 5; }
    else              { minC = 8;  maxC = 24; spread = 5; }
    return { minC, maxC, spread };
  }

  // ===== Build round =====
  function startRound() {
    answering = false;
    const cfg = levelConfig(level);
    currentFruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    currentCount = randint(cfg.minC, cfg.maxC);

    // Build distractors near correct value
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const offset = randint(1, cfg.spread) * (Math.random() < 0.5 ? -1 : 1);
      const candidate = currentCount + offset;
      if (candidate !== currentCount && candidate >= 1 && candidate <= cfg.maxC + cfg.spread) {
        wrongs.add(candidate);
      }
    }
    const options = shuffle([currentCount, ...wrongs]);

    // Render question
    $('q-text').textContent = I18N[lang].qText(nameFor(currentFruit, lang));
    $('q-sub').textContent = I18N[lang].qSub;

    // Render fruit grid (with staggered drop animation)
    elDisplay.innerHTML = '';
    for (let i = 0; i < currentCount; i++) {
      const span = document.createElement('span');
      span.className = 'fr-emoji';
      span.textContent = currentFruit.em;
      span.style.animationDelay = (i * 30) + 'ms';
      elDisplay.appendChild(span);
    }

    // Render options
    elOptions.innerHTML = '';
    for (const opt of options) {
      const btn = document.createElement('button');
      btn.className = 'fr-opt';
      btn.textContent = opt;
      btn.dataset.v = opt;
      btn.addEventListener('click', () => onAnswer(btn, opt));
      elOptions.appendChild(btn);
    }
    elLevel.textContent = level;
  }

  function onAnswer(btn, val) {
    if (answering) return;
    answering = true;
    ensureAudio();
    const correct = val === currentCount;
    [...elOptions.querySelectorAll('.fr-opt')].forEach(b => {
      const v = parseInt(b.dataset.v, 10);
      if (v === currentCount) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    if (correct) {
      score += 10 + level * 2;
      elScore.textContent = score;
      play('correct');
      speak(String(currentCount));
      const nextLevel = Math.floor(score / 70) + 1;
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
        if (lives <= 0) gameOver();
        else startRound();
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

  $('btn-again').addEventListener('click', () => {
    ensureAudio();
    elModalOver.classList.remove('show');
    level = 1; score = 0; lives = 5;
    elLevel.textContent = '1';
    elScore.textContent = '0';
    elLives.textContent = '❤❤❤❤❤';
    startRound();
  });

  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    $('lbl-level').textContent = t.level;
    $('lbl-score').textContent = t.score;
    $('lbl-lives').textContent = t.lives;
    $('lbl-best').textContent = t.best;
    $('over-title').textContent = t.gameover;
    $('over-lbl-score').textContent = t.overLblScore;
    $('over-lbl-level').textContent = t.overLblLevel;
    $('btn-again').textContent = t.again;
    document.title = t.title;
    if (currentFruit) {
      $('q-text').textContent = t.qText(nameFor(currentFruit, lang));
      $('q-sub').textContent = t.qSub;
    }
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  function refreshHud() {
    const s = loadStats();
    elBest.textContent = s.bestScore;
  }
  applyLang();
  refreshHud();
  startRound();
})();
