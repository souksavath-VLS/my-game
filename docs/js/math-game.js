// Counting Math — addition/subtraction with visual emoji counters.
// Endless levels: visual fruits → larger sums → mixed ops → compact digits only.
// Lives, multi-language, TTS.

(() => {
  'use strict';

  const EMOJIS = ['🍎','🍊','🍋','🍌','🍇','🍓','🍉','🍐','🥝','🍑'];

  const I18N = {
    th: {
      title:'➕➖ บวก-ลบ', back:'← หน้าหลัก',
      level:'เลเวล', score:'คะแนน', lives:'หัวใจ', best:'ดีที่สุด',
      gameover:'จบเกม', overLblScore:'คะแนน', overLblLevel:'เลเวล',
      again:'▶ เล่นใหม่', levelUp:'เลเวล ',
      plus:'บวก', minus:'ลบ', equals:'เท่ากับ', is:'คือ'
    },
    en: {
      title:'➕➖ Add & Subtract', back:'← Home',
      level:'Level', score:'Score', lives:'Lives', best:'Best',
      gameover:'Game Over', overLblScore:'Score', overLblLevel:'Level',
      again:'▶ Play Again', levelUp:'Level ',
      plus:'plus', minus:'minus', equals:'equals', is:'is'
    },
    lao: {
      title:'➕➖ ບວກ-ລົບ', back:'← ໜ້າຫຼັກ',
      level:'ລະດັບ', score:'ຄະແນນ', lives:'ຫົວໃຈ', best:'ດີສຸດ',
      gameover:'ຈົບເກມ', overLblScore:'ຄະແນນ', overLblLevel:'ລະດັບ',
      again:'▶ ຫຼິ້ນອີກ', levelUp:'ລະດັບ ',
      plus:'ບວກ', minus:'ລົບ', equals:'ເທົ່າກັບ', is:'ແມ່ນ'
    }
  };

  const STATS_KEY = 'math_count_stats_v1';
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
  let level = 1;
  let score = 0;
  let lives = 5;
  let answering = false;
  let cur = null;   // { a, b, op:'+'|'-', answer, emoji, visual:bool }

  const $ = id => document.getElementById(id);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function speakQuestion() {
    if (!cur) return;
    // For this game, Lao uses Thai voice + Thai words (Lao TTS reads digits poorly).
    const useTh = (lang === 'lao' || lang === 'th');
    const v = useTh ? 'th-TH' : 'en-US';
    const t = useTh ? I18N.th : I18N.en;
    const opWord = cur.op === '+' ? t.plus : t.minus;
    const text = `${cur.a} ${opWord} ${cur.b} ${t.equals}`;
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

  function levelConfig(lv) {
    // Tunable difficulty curve
    let maxNum, allowSub, visual, nOptions;
    if (lv <= 2)       { maxNum = 5;  allowSub = false; visual = true;  nOptions = 3; }
    else if (lv <= 4)  { maxNum = 10; allowSub = false; visual = true;  nOptions = 4; }
    else if (lv <= 6)  { maxNum = 10; allowSub = true;  visual = true;  nOptions = 4; }
    else if (lv <= 9)  { maxNum = 15; allowSub = true;  visual = true;  nOptions = 4; }
    else if (lv <= 12) { maxNum = 20; allowSub = true;  visual = false; nOptions = 4; }
    else               { maxNum = 30; allowSub = true;  visual = false; nOptions = 4; }
    return { maxNum, allowSub, visual, nOptions };
  }

  function genProblem() {
    const cfg = levelConfig(level);
    const op = cfg.allowSub && Math.random() < 0.4 ? '-' : '+';
    let a, b, answer;
    if (op === '+') {
      a = rand(1, Math.min(cfg.maxNum - 1, 9));
      b = rand(1, Math.min(cfg.maxNum - a, 9));
      answer = a + b;
    } else {
      a = rand(2, cfg.maxNum);
      b = rand(1, a - 1);   // ensure non-negative result
      answer = a - b;
    }
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    return { a, b, op, answer, emoji, visual: cfg.visual, nOptions: cfg.nOptions };
  }

  function renderEmojis(count, emoji) {
    if (count <= 0) return '';
    // Arrange in 2 columns when > 3, otherwise 1 row of N
    const cols = count > 3 ? 2 : count;
    const grid = document.createElement('div');
    grid.className = 'mg-group';
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    for (let i = 0; i < count; i++) {
      const span = document.createElement('span');
      span.className = 'mg-emoji';
      span.textContent = emoji;
      grid.appendChild(span);
    }
    return grid;
  }

  function startRound() {
    answering = false;
    cur = genProblem();
    const row = $('eq-row');
    const card = $('eq-card');
    row.innerHTML = '';
    card.classList.toggle('compact', !cur.visual);

    if (cur.visual) {
      // [emojis] [op] [emojis] = ?
      row.appendChild(renderEmojis(cur.a, cur.emoji));
      const op = document.createElement('span'); op.className = 'mg-op'; op.textContent = cur.op;
      row.appendChild(op);
      row.appendChild(renderEmojis(cur.b, cur.emoji));
      const eq = document.createElement('span'); eq.className = 'mg-op'; eq.textContent = '=';
      row.appendChild(eq);
      const q = document.createElement('span'); q.className = 'mg-eq-q'; q.textContent = '?';
      row.appendChild(q);
    } else {
      // Compact: A op B = ?
      const a = document.createElement('span'); a.className = 'mg-eq-num'; a.textContent = cur.a;
      row.appendChild(a);
      const op = document.createElement('span'); op.className = 'mg-op'; op.textContent = cur.op;
      row.appendChild(op);
      const b = document.createElement('span'); b.className = 'mg-eq-num'; b.textContent = cur.b;
      row.appendChild(b);
      const eq = document.createElement('span'); eq.className = 'mg-op'; eq.textContent = '=';
      row.appendChild(eq);
      const q = document.createElement('span'); q.className = 'mg-eq-q'; q.textContent = '?';
      row.appendChild(q);
    }

    // Build distractor pool: nearby integers, exclude the answer
    const pool = new Set();
    pool.add(cur.answer);
    let safety = 0;
    while (pool.size < cur.nOptions && safety++ < 50) {
      const delta = rand(-3, 3);
      const v = cur.answer + delta;
      if (v >= 0 && v !== cur.answer) pool.add(v);
    }
    // Pad if needed
    let pad = 1;
    while (pool.size < cur.nOptions) {
      const v = cur.answer + pad;
      if (v >= 0) pool.add(v);
      pad++;
    }
    const opts = shuffle([...pool]);

    const optsEl = $('options');
    optsEl.innerHTML = '';
    optsEl.style.gridTemplateColumns = cur.nOptions <= 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)';
    for (const v of opts) {
      const btn = document.createElement('button');
      btn.className = 'mg-opt';
      btn.textContent = v;
      btn.dataset.v = v;
      btn.addEventListener('click', () => onTap(btn, v));
      optsEl.appendChild(btn);
    }

    $('ui-level').textContent = level;
    setTimeout(() => { ensureAudio(); speakQuestion(); }, 200);
  }

  function onTap(btn, v) {
    if (answering) return;
    answering = true;
    ensureAudio();
    const correct = v === cur.answer;
    [...$('options').querySelectorAll('.mg-opt')].forEach(b => {
      const bv = parseInt(b.dataset.v, 10);
      if (bv === cur.answer) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    if (correct) {
      score += 10 + level * 3;
      $('ui-score').textContent = score;
      play('correct');
      // Replace the ? with the answer
      const q = $('eq-row').querySelector('.mg-eq-q');
      if (q) q.textContent = cur.answer;
      const nextLevel = Math.floor(score / 80) + 1;
      const leveledUp = nextLevel > level;
      setTimeout(() => {
        if (leveledUp) {
          level = nextLevel;
          showFlash(I18N[lang].levelUp + level + ' 🎉');
          play('levelup');
        }
        startRound();
      }, 800);
    } else {
      lives--;
      $('ui-lives').textContent = '❤'.repeat(Math.max(0, lives)) || '·';
      play('wrong');
      setTimeout(() => {
        if (lives <= 0) gameOver();
        else startRound();
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

  $('btn-speak').addEventListener('click', () => { ensureAudio(); speakQuestion(); });
  $('btn-again').addEventListener('click', () => {
    ensureAudio();
    $('modal-over').classList.remove('show');
    level = 1; score = 0; lives = 5;
    $('ui-level').textContent = '1';
    $('ui-score').textContent = '0';
    $('ui-lives').textContent = '❤❤❤❤❤';
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
  startRound();
})();
