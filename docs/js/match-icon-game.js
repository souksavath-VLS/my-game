// Find the Icon — show a target emoji, find ALL occurrences in the grid.
// Endless levels with rising difficulty, lives system, multi-language, audio synth, localStorage.

(() => {
  'use strict';

  // ===== Theme pools (emoji + names per language). Each emoji has 3-lang labels. =====
  const ITEMS = [
    // Fruits
    { em:'🍎', en:'Apple',      th:'แอปเปิ้ล',  lo:'ໝາກໂປມ' },
    { em:'🍌', en:'Banana',     th:'กล้วย',     lo:'ໝາກກ້ວຍ' },
    { em:'🍇', en:'Grapes',     th:'องุ่น',     lo:'ໝາກອະງຸ່ນ' },
    { em:'🍉', en:'Watermelon', th:'แตงโม',     lo:'ໝາກໂມ' },
    { em:'🍓', en:'Strawberry', th:'สตรอเบอรี่',lo:'ສະຕໍເບີຣີ' },
    { em:'🍊', en:'Orange',     th:'ส้ม',       lo:'ໝາກກ້ຽງ' },
    { em:'🍍', en:'Pineapple',  th:'สับปะรด',  lo:'ໝາກນັດ' },
    { em:'🥭', en:'Mango',      th:'มะม่วง',   lo:'ໝາກມ່ວງ' },
    // Animals
    { em:'🐱', en:'Cat',        th:'แมว',       lo:'ແມວ' },
    { em:'🐶', en:'Dog',        th:'หมา',       lo:'ໝາ' },
    { em:'🐘', en:'Elephant',   th:'ช้าง',       lo:'ຊ້າງ' },
    { em:'🦁', en:'Lion',       th:'สิงโต',     lo:'ສິງໂຕ' },
    { em:'🐵', en:'Monkey',     th:'ลิง',        lo:'ລີງ' },
    { em:'🐰', en:'Rabbit',     th:'กระต่าย',   lo:'ກະຕ່າຍ' },
    { em:'🐯', en:'Tiger',      th:'เสือ',       lo:'ເສືອ' },
    { em:'🐼', en:'Panda',      th:'แพนด้า',    lo:'ແພນດ້າ' },
    // Vehicles
    { em:'🚗', en:'Car',        th:'รถยนต์',   lo:'ລົດໃຫຍ່' },
    { em:'🚌', en:'Bus',        th:'รถบัส',    lo:'ລົດເມ' },
    { em:'🚂', en:'Train',      th:'รถไฟ',     lo:'ລົດໄຟ' },
    { em:'✈️', en:'Airplane',   th:'เครื่องบิน',lo:'ເຮືອບິນ' },
    { em:'🚲', en:'Bicycle',    th:'จักรยาน',  lo:'ລົດຖີບ' },
    { em:'⛵', en:'Boat',        th:'เรือใบ',   lo:'ເຮືອໃບ' },
    // Faces
    { em:'😀', en:'Smile',      th:'ยิ้ม',      lo:'ຍິ້ມ' },
    { em:'😍', en:'Love',       th:'รัก',       lo:'ຮັກ' },
    { em:'😂', en:'Laugh',      th:'หัวเราะ',   lo:'ຫົວເລາະ' },
    { em:'😎', en:'Cool',       th:'เท่',       lo:'ເທ່' },
    // Weather
    { em:'☀️', en:'Sun',        th:'พระอาทิตย์',lo:'ຕາເວັນ' },
    { em:'🌙', en:'Moon',       th:'พระจันทร์', lo:'ດວງເດືອນ' },
    { em:'⭐', en:'Star',       th:'ดาว',       lo:'ດາວ' },
    { em:'☁️', en:'Cloud',      th:'เมฆ',       lo:'ເມກ' },
    { em:'🌈', en:'Rainbow',    th:'รุ้ง',       lo:'ຮຸ້ງ' },
    // Sports / fun
    { em:'⚽', en:'Soccer',     th:'ฟุตบอล',   lo:'ບານເຕະ' },
    { em:'🏀', en:'Basketball', th:'บาส',       lo:'ບານບ້ວງ' },
    { em:'🎈', en:'Balloon',    th:'ลูกโป่ง',  lo:'ໝາກປຸ່ມເປົ້າ' },
    { em:'🎁', en:'Gift',       th:'ของขวัญ',  lo:'ຂອງຂວັນ' }
  ];

  const I18N = {
    th: {
      title:'🔍 หาภาพ', back:'← หน้าหลัก',
      level:'เลเวล', score:'คะแนน', lives:'หัวใจ', best:'ดีที่สุด',
      targetLbl:'หาภาพนี้',
      gameover:'จบเกม', overLblScore:'คะแนน', overLblLevel:'เลเวล',
      again:'▶ เล่นใหม่', levelUp:'เลเวล '
    },
    en: {
      title:'🔍 Find the Icon', back:'← Home',
      level:'Level', score:'Score', lives:'Lives', best:'Best',
      targetLbl:'Find these',
      gameover:'Game Over', overLblScore:'Score', overLblLevel:'Level',
      again:'▶ Play Again', levelUp:'Level '
    },
    lao: {
      title:'🔍 ຫາພາບ', back:'← ໜ້າຫຼັກ',
      level:'ລະດັບ', score:'ຄະແນນ', lives:'ຫົວໃຈ', best:'ດີສຸດ',
      targetLbl:'ຫາພາບນີ້',
      gameover:'ຈົບເກມ', overLblScore:'ຄະແນນ', overLblLevel:'ລະດັບ',
      again:'▶ ຫຼິ້ນອີກ', levelUp:'ລະດັບ '
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'find_icon_stats_v1';
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
    if (kind === 'find')    beep(660 + Math.random()*200, 0.08, 'triangle', 0.06);
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
  let target = null;        // current target item
  let cells = [];           // [{ em, isTarget, found }]
  let targetTotal = 0;
  let targetFound = 0;
  let busy = false;

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const elBoard = $('board');
  const elLevel = $('ui-level');
  const elScore = $('ui-score');
  const elLives = $('ui-lives');
  const elBest = $('ui-best');
  const elFlash = $('flash');
  const elModalOver = $('modal-over');
  // Tap target to hear it again
  const elTargetName = $('target-name');
  const elTargetEm = $('target-em');
  [elTargetName, elTargetEm].forEach(el => {
    if (!el) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => { if (target) speak(target); });
  });

  function nameFor(it, l) {
    if (l === 'th') return it.th;
    if (l === 'lao') return it.lo;
    return it.en;
  }
  // ===== TTS =====
  function speak(it) {
    const v = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
    const text = nameFor(it, lang);
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
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ===== Level config =====
  function levelConfig(lv) {
    let cells, cols;
    if (lv <= 2) { cells = 9;  cols = 3; }   // 3×3
    else if (lv <= 4) { cells = 12; cols = 4; } // 4×3
    else            { cells = 16; cols = 4; }   // 4×4
    // Target count = 3..6 depending on level (more cells = more targets but rate decreases)
    let targets;
    if (lv <= 1) targets = 3;
    else if (lv <= 3) targets = 4;
    else if (lv <= 6) targets = 5;
    else if (lv <= 9) targets = 4;             // fewer relative to grid → harder
    else targets = 3;                           // very few targets in large grid
    return { cells, cols, targets };
  }

  // ===== Build round =====
  function startRound() {
    busy = false;
    const cfg = levelConfig(level);
    target = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    // Distractors: pool excluding the target
    const distractors = shuffle(ITEMS.filter(x => x.em !== target.em));
    cells = [];
    for (let i = 0; i < cfg.targets; i++) {
      cells.push({ em: target.em, isTarget: true, found: false });
    }
    for (let i = 0; i < cfg.cells - cfg.targets; i++) {
      const d = distractors[i % distractors.length];
      cells.push({ em: d.em, isTarget: false, found: false });
    }
    cells = shuffle(cells);
    targetTotal = cfg.targets;
    targetFound = 0;

    // Render
    $('target-em').textContent = target.em;
    $('target-name').textContent = nameFor(target, lang);
    $('target-found').textContent = 0;
    $('target-total').textContent = targetTotal;
    // Speak the target so kids hear what to find
    speak(target);
    elBoard.style.gridTemplateColumns = `repeat(${cfg.cols}, minmax(0, 1fr))`;
    // Constrain board width based on cols
    elBoard.style.maxWidth = (cfg.cols * 90) + 'px';
    renderBoard();
    elLevel.textContent = level;
  }

  function renderBoard() {
    elBoard.innerHTML = '';
    for (const c of cells) {
      const el = document.createElement('div');
      el.className = 'mi-cell';
      if (c.found) el.classList.add('found');
      el.textContent = c.em;
      el.addEventListener('click', () => onCellTap(c, el));
      elBoard.appendChild(el);
    }
  }

  function onCellTap(c, el) {
    if (busy) return;
    if (c.found) return;
    ensureAudio();
    if (c.isTarget) {
      c.found = true;
      targetFound++;
      el.classList.add('found');
      $('target-found').textContent = targetFound;
      score += 5 + level;
      elScore.textContent = score;
      play('find');
      if (targetFound >= targetTotal) {
        // Level cleared
        busy = true;
        setTimeout(() => {
          level++;
          showFlash(I18N[lang].levelUp + level + ' 🎉');
          play('levelup');
          setTimeout(() => startRound(), 600);
        }, 350);
      }
    } else {
      lives--;
      elLives.textContent = '❤'.repeat(Math.max(0, lives)) || '·';
      el.classList.add('wrong');
      setTimeout(() => el.classList.remove('wrong'), 400);
      play('wrong');
      if (lives <= 0) {
        gameOver();
      }
    }
  }

  function showFlash(msg) {
    elFlash.textContent = msg;
    elFlash.classList.remove('show');
    void elFlash.offsetWidth;
    elFlash.classList.add('show');
  }

  function gameOver() {
    busy = true;
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

  // ===== Init =====
  function refreshHud() {
    const s = loadStats();
    elBest.textContent = s.bestScore;
  }
  applyLang();
  refreshHud();
  startRound();
})();
