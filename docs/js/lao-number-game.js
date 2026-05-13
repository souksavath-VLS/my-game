// Lao Numerals ໐-໙ — Learn mode (tap to hear) + Quiz mode (match Lao ↔ Arabic).
// Endless levels, lives, multi-language TTS.

(() => {
  'use strict';

  const NUMBERS = [
    { arab:'0', lao:'໐', en:'Zero',  th:'ศูนย์', lo:'ສູນ',  pron:'sun'  },
    { arab:'1', lao:'໑', en:'One',   th:'หนึ่ง', lo:'ນຶ່ງ', pron:'neung' },
    { arab:'2', lao:'໒', en:'Two',   th:'สอง',   lo:'ສອງ', pron:'song' },
    { arab:'3', lao:'໓', en:'Three', th:'สาม',   lo:'ສາມ', pron:'sam'  },
    { arab:'4', lao:'໔', en:'Four',  th:'สี่',    lo:'ສີ່',   pron:'si'   },
    { arab:'5', lao:'໕', en:'Five',  th:'ห้า',   lo:'ຫ້າ',  pron:'ha'   },
    { arab:'6', lao:'໖', en:'Six',   th:'หก',    lo:'ຫົກ',  pron:'hok'  },
    { arab:'7', lao:'໗', en:'Seven', th:'เจ็ด',  lo:'ເຈັດ', pron:'jet'  },
    { arab:'8', lao:'໘', en:'Eight', th:'แปด',   lo:'ແປດ', pron:'paet' },
    { arab:'9', lao:'໙', en:'Nine',  th:'เก้า',  lo:'ເກົ້າ', pron:'kao'  }
  ];

  const I18N = {
    th: {
      title:'໐໑໒ ตัวเลขลาว', back:'← หน้าหลัก',
      tabLearn:'เรียนรู้', tabQuiz:'คำถาม',
      level:'เลเวล', score:'คะแนน', lives:'หัวใจ', best:'ดีที่สุด',
      qLaoToArab:'เลขลาวนี้คือเลขอะไร?',
      qArabToLao:'เลขอารบิกนี้เขียนแบบลาวยังไง?',
      qSound:'ฟังเสียง แล้วเลือกเลขที่ถูก',
      gameover:'จบเกม', overLblScore:'คะแนน', overLblLevel:'เลเวล',
      again:'▶ เล่นใหม่', levelUp:'เลเวล '
    },
    en: {
      title:'໐໑໒ Lao Numerals', back:'← Home',
      tabLearn:'Learn', tabQuiz:'Quiz',
      level:'Level', score:'Score', lives:'Lives', best:'Best',
      qLaoToArab:'What number is this Lao digit?',
      qArabToLao:'How is this number written in Lao?',
      qSound:'Listen and pick the right number',
      gameover:'Game Over', overLblScore:'Score', overLblLevel:'Level',
      again:'▶ Play Again', levelUp:'Level '
    },
    lao: {
      title:'໐໑໒ ຕົວເລກລາວ', back:'← ໜ້າຫຼັກ',
      tabLearn:'ຮຽນຮູ້', tabQuiz:'ຄຳຖາມ',
      level:'ລະດັບ', score:'ຄະແນນ', lives:'ຫົວໃຈ', best:'ດີສຸດ',
      qLaoToArab:'ຕົວເລກລາວນີ້ແມ່ນເລກຫຍັງ?',
      qArabToLao:'ຕົວເລກນີ້ຂຽນແບບລາວແນວໃດ?',
      qSound:'ຟັງສຽງ ແລະ ເລືອກໂຕເລກທີ່ຖືກ',
      gameover:'ຈົບເກມ', overLblScore:'ຄະແນນ', overLblLevel:'ລະດັບ',
      again:'▶ ຫຼິ້ນອີກ', levelUp:'ລະດັບ '
    }
  };

  const STATS_KEY = 'lao_num_stats_v1';
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
    if (kind === 'tap')     beep(440 + Math.random()*220, 0.08, 'sine', 0.05);
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
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'lao';
  })();
  let mode = 'learn';      // 'learn' | 'quiz'
  let level = 1;
  let score = 0;
  let lives = 5;
  let current = null;      // current target number
  let qVariant = 'laoToArab'; // quiz variant
  let answering = false;

  const $ = id => document.getElementById(id);

  function nameFor(n, l) {
    if (l === 'th') return n.th;
    if (l === 'lao') return n.lo;
    return n.en;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function speak(n) {
    const v = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
    const text = nameFor(n, lang);
    if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
      try { window.AndroidTTS.speak(text, v); return; } catch {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = v; u.rate = 0.8;
        window.speechSynthesis.speak(u);
      } catch {}
    }
  }

  // ===== Learn mode =====
  function renderLearn() {
    const grid = $('learn-grid');
    grid.innerHTML = '';
    for (const n of NUMBERS) {
      const card = document.createElement('div');
      card.className = 'ln-card';
      card.innerHTML = `
        <div class="lao">${n.lao}</div>
        <div class="arab">${n.arab}</div>
        <div class="name">${nameFor(n, lang)}</div>
      `;
      card.addEventListener('click', () => {
        ensureAudio();
        play('tap');
        speak(n);
        card.style.transform = 'scale(.92)';
        setTimeout(() => { card.style.transform = ''; }, 180);
      });
      grid.appendChild(card);
    }
  }

  // ===== Quiz mode =====
  function levelConfig(lv) {
    let nOptions;
    if (lv <= 1) nOptions = 2;
    else if (lv <= 3) nOptions = 4;
    else nOptions = 6;
    return { nOptions };
  }

  function startQuizRound() {
    answering = false;
    const cfg = levelConfig(level);
    current = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];

    // Pick a quiz variant: laoToArab, arabToLao, or sound (level 3+)
    const variants = ['laoToArab', 'arabToLao'];
    if (level >= 3) variants.push('sound');
    qVariant = variants[Math.floor(Math.random() * variants.length)];

    const targetEl = $('target-val');
    const targetLbl = $('target-lbl');
    const t = I18N[lang];

    if (qVariant === 'laoToArab') {
      targetEl.textContent = current.lao;
      targetEl.classList.remove('arab');
      targetLbl.textContent = t.qLaoToArab;
    } else if (qVariant === 'arabToLao') {
      targetEl.textContent = current.arab;
      targetEl.classList.add('arab');
      targetLbl.textContent = t.qArabToLao;
    } else { // sound
      targetEl.textContent = '🔊';
      targetEl.classList.remove('arab');
      targetLbl.textContent = t.qSound;
    }

    // Options
    const wrong = shuffle(NUMBERS.filter(n => n.arab !== current.arab)).slice(0, cfg.nOptions - 1);
    const opts = shuffle([current, ...wrong]);

    const optsEl = $('options');
    optsEl.innerHTML = '';
    optsEl.style.gridTemplateColumns = cfg.nOptions <= 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)';

    for (const n of opts) {
      const btn = document.createElement('button');
      btn.className = 'ln-opt';
      if (qVariant === 'laoToArab') {
        btn.classList.add('arab');
        btn.textContent = n.arab;
      } else { // arabToLao OR sound — options show Lao
        btn.classList.add('lao');
        btn.textContent = n.lao;
      }
      btn.dataset.arab = n.arab;
      btn.addEventListener('click', () => onTap(btn, n));
      optsEl.appendChild(btn);
    }

    $('ui-level').textContent = level;

    // Auto-speak for sound variant; speak Lao name otherwise (helps learning)
    setTimeout(() => { ensureAudio(); speak(current); }, 250);
  }

  function onTap(btn, n) {
    if (answering) return;
    answering = true;
    ensureAudio();
    const correct = n.arab === current.arab;
    [...$('options').querySelectorAll('.ln-opt')].forEach(b => {
      if (b.dataset.arab === current.arab) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    if (correct) {
      score += 10 + level * 2;
      $('ui-score').textContent = score;
      play('correct');
      speak(current);
      const nextLevel = Math.floor(score / 60) + 1;
      const leveledUp = nextLevel > level;
      setTimeout(() => {
        if (leveledUp) {
          level = nextLevel;
          showFlash(I18N[lang].levelUp + level + ' 🎉');
          play('levelup');
        }
        startQuizRound();
      }, 700);
    } else {
      lives--;
      $('ui-lives').textContent = '❤'.repeat(Math.max(0, lives)) || '·';
      play('wrong');
      setTimeout(() => {
        if (lives <= 0) gameOver();
        else startQuizRound();
      }, 1100);
    }
  }

  function showFlash(msg) {
    const el = $('flash');
    el.textContent = msg;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
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
    $('ui-best').textContent = updated.bestScore;
    setTimeout(() => $('modal-over').classList.add('show'), 500);
  }

  function resetGame() {
    level = 1; score = 0; lives = 5;
    $('ui-level').textContent = '1';
    $('ui-score').textContent = '0';
    $('ui-lives').textContent = '❤❤❤❤❤';
  }

  function setMode(newMode) {
    mode = newMode;
    $('tab-learn').classList.toggle('active', mode === 'learn');
    $('tab-quiz').classList.toggle('active', mode === 'quiz');
    $('learn-view').style.display = mode === 'learn' ? '' : 'none';
    $('quiz-view').style.display  = mode === 'quiz'  ? '' : 'none';
    $('hud').style.display = mode === 'quiz' ? '' : 'none';
    if (mode === 'learn') {
      renderLearn();
    } else {
      resetGame();
      startQuizRound();
    }
  }

  $('tab-learn').addEventListener('click', () => { ensureAudio(); setMode('learn'); });
  $('tab-quiz').addEventListener('click',  () => { ensureAudio(); setMode('quiz'); });
  $('btn-speak').addEventListener('click', () => {
    ensureAudio();
    if (current) speak(current);
  });
  $('btn-again').addEventListener('click', () => {
    ensureAudio();
    $('modal-over').classList.remove('show');
    resetGame();
    startQuizRound();
  });

  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    $('tab-learn-lbl').textContent = t.tabLearn;
    $('tab-quiz-lbl').textContent = t.tabQuiz;
    $('lbl-level').textContent = t.level;
    $('lbl-score').textContent = t.score;
    $('lbl-lives').textContent = t.lives;
    $('lbl-best').textContent = t.best;
    $('over-title').textContent = t.gameover;
    $('over-lbl-score').textContent = t.overLblScore;
    $('over-lbl-level').textContent = t.overLblLevel;
    $('btn-again').textContent = t.again;
    document.title = t.title;
    if (mode === 'learn') renderLearn();
    else if (current) {
      // Update label without restarting round
      if (qVariant === 'laoToArab') $('target-lbl').textContent = t.qLaoToArab;
      else if (qVariant === 'arabToLao') $('target-lbl').textContent = t.qArabToLao;
      else $('target-lbl').textContent = t.qSound;
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
    $('ui-best').textContent = s.bestScore;
  }

  applyLang();
  refreshHud();
  setMode('learn');
})();
