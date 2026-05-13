// Color Quiz — show color name + auto-speak, tap matching color from N options.
// Endless levels with rising option count, lives, multi-language (CORRECT Lao TTS).

(() => {
  'use strict';

  const COLORS = [
    { hex:'#ef4444', en:'Red',    th:'แดง',     lo:'ສີແດງ' },
    { hex:'#f59e0b', en:'Orange', th:'ส้ม',     lo:'ສີສົ້ມ' },
    { hex:'#eab308', en:'Yellow', th:'เหลือง', lo:'ສີເຫຼືອງ' },
    { hex:'#22c55e', en:'Green',  th:'เขียว',   lo:'ສີຂຽວ' },
    { hex:'#3b82f6', en:'Blue',   th:'น้ำเงิน', lo:'ສີນ້ຳເງິນ' },
    { hex:'#8b5cf6', en:'Purple', th:'ม่วง',    lo:'ສີມ່ວງ' },
    { hex:'#ec4899', en:'Pink',   th:'ชมพู',    lo:'ສີຊົມພູ' },
    { hex:'#92400e', en:'Brown',  th:'น้ำตาล', lo:'ສີນ້ຳຕານ' },
    { hex:'#0ea5e9', en:'Sky',    th:'ฟ้า',     lo:'ສີຟ້າ' },
    { hex:'#1e293b', en:'Black',  th:'ดำ',      lo:'ສີດຳ' },
    { hex:'#f8fafc', en:'White',  th:'ขาว',     lo:'ສີຂາວ' },
    { hex:'#94a3b8', en:'Gray',   th:'เทา',     lo:'ສີເທົາ' }
  ];

  const I18N = {
    th: {
      title:'🎨 เลือกสี', back:'← หน้าหลัก',
      level:'เลเวล', score:'คะแนน', lives:'หัวใจ', best:'ดีที่สุด',
      targetLbl:'เลือกสี',
      gameover:'จบเกม', overLblScore:'คะแนน', overLblLevel:'เลเวล',
      again:'▶ เล่นใหม่', levelUp:'เลเวล '
    },
    en: {
      title:'🎨 Pick Color', back:'← Home',
      level:'Level', score:'Score', lives:'Lives', best:'Best',
      targetLbl:'Pick the color',
      gameover:'Game Over', overLblScore:'Score', overLblLevel:'Level',
      again:'▶ Play Again', levelUp:'Level '
    },
    lao: {
      title:'🎨 ເລືອກສີ', back:'← ໜ້າຫຼັກ',
      level:'ລະດັບ', score:'ຄະແນນ', lives:'ຫົວໃຈ', best:'ດີສຸດ',
      targetLbl:'ເລືອກສີ',
      gameover:'ຈົບເກມ', overLblScore:'ຄະແນນ', overLblLevel:'ລະດັບ',
      again:'▶ ຫຼິ້ນອີກ', levelUp:'ລະດັບ '
    }
  };

  const STATS_KEY = 'color_stats_v1';
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
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'th';
  })();
  let level = 1;
  let score = 0;
  let lives = 5;
  let target = null;
  let answering = false;

  const $ = id => document.getElementById(id);
  const elButtons = $('buttons');
  const elLevel = $('ui-level');
  const elScore = $('ui-score');
  const elLives = $('ui-lives');
  const elBest = $('ui-best');
  const elFlash = $('flash');
  const elModalOver = $('modal-over');

  function nameFor(c, l) {
    if (l === 'th') return c.th;
    if (l === 'lao') return c.lo;
    return c.en;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // FIXED: proper Lao TTS lang code (was 'th-TH' in old code)
  function speak(c) {
    const v = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
    const text = nameFor(c, lang);
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
    let nOptions;
    if (lv <= 1) nOptions = 3;
    else if (lv <= 3) nOptions = 4;
    else if (lv <= 5) nOptions = 6;
    else if (lv <= 8) nOptions = 9;
    else nOptions = 12;
    return { nOptions };
  }

  function startRound() {
    answering = false;
    const cfg = levelConfig(level);
    target = COLORS[Math.floor(Math.random() * COLORS.length)];
    $('target-name').textContent = nameFor(target, lang);

    const wrong = shuffle(COLORS.filter(c => c.hex !== target.hex)).slice(0, cfg.nOptions - 1);
    const opts = shuffle([target, ...wrong]);

    // Adjust grid based on count
    let cols = 3;
    if (cfg.nOptions <= 4) cols = 2;
    else if (cfg.nOptions <= 9) cols = 3;
    else cols = 4;
    elButtons.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    elButtons.innerHTML = '';
    for (const c of opts) {
      const btn = document.createElement('button');
      btn.className = 'cg-btn';
      btn.style.background = c.hex;
      btn.dataset.hex = c.hex;
      btn.addEventListener('click', () => onTap(btn, c));
      elButtons.appendChild(btn);
    }
    elLevel.textContent = level;
    // Auto-speak target on round start (delay to let UI settle)
    setTimeout(() => { ensureAudio(); speak(target); }, 250);
  }

  function onTap(btn, c) {
    if (answering) return;
    answering = true;
    ensureAudio();
    const correct = c.hex === target.hex;
    [...elButtons.querySelectorAll('.cg-btn')].forEach(b => {
      if (b.dataset.hex === target.hex) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    if (correct) {
      score += 10 + level * 2;
      elScore.textContent = score;
      play('correct');
      speak(target);
      const nextLevel = Math.floor(score / 80) + 1;
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

  $('btn-speak').addEventListener('click', () => {
    ensureAudio();
    if (target) speak(target);
  });
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
    $('target-lbl').textContent = t.targetLbl;
    $('over-title').textContent = t.gameover;
    $('over-lbl-score').textContent = t.overLblScore;
    $('over-lbl-level').textContent = t.overLblLevel;
    $('btn-again').textContent = t.again;
    document.title = t.title;
    if (target) $('target-name').textContent = nameFor(target, lang);
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
