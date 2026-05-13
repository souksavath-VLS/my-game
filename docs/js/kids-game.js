// Memory Match (Kids Game) — classic concentration with themed emoji sets.
// Level progression, theme rotation, card-flip animation, multi-language, Web Audio, localStorage best.

(() => {
  'use strict';

  // ===== Themes (8 emojis each) =====
  const THEMES = [
    { id:'fruit',    em:'🍎', en:'Fruits',   th:'ผลไม้',     lo:'ໝາກໄມ້',
      pool:['🍎','🍌','🍇','🍉','🍓','🍊','🍐','🍍','🍒','🥝','🥭','🍑'] },
    { id:'animal',   em:'🐱', en:'Animals',  th:'สัตว์',     lo:'ສັດ',
      pool:['🐱','🐶','🐘','🦁','🐵','🐼','🐷','🐰','🐨','🐯','🐮','🦊'] },
    { id:'vehicle',  em:'🚗', en:'Vehicles', th:'ยานพาหนะ', lo:'ຍານພາຫະນະ',
      pool:['🚗','🚕','🚙','🚌','🚓','🚑','🚒','🚜','🚂','✈️','🚢','🚲'] },
    { id:'face',     em:'😀', en:'Faces',    th:'หน้าตา',   lo:'ໜ້າຕາ',
      pool:['😀','😍','😎','😂','🥳','🤔','😴','😡','🤗','😋','😭','🤓'] },
    { id:'weather',  em:'☀️', en:'Weather',  th:'อากาศ',    lo:'ອາກາດ',
      pool:['☀️','☁️','🌧️','⛈️','🌈','❄️','🌪️','⭐','🌙','🌤️','💧','🔥'] },
    { id:'sport',    em:'⚽', en:'Sports',   th:'กีฬา',      lo:'ກິລາ',
      pool:['⚽','🏀','🏈','⚾','🎾','🏐','🏓','🥊','🎯','🎳','⛳','🏒'] },
    { id:'food',     em:'🍕', en:'Food',     th:'อาหาร',    lo:'ອາຫານ',
      pool:['🍕','🍔','🍟','🌭','🍿','🍩','🍦','🍰','🥪','🌮','🍜','🍣'] },
    { id:'music',    em:'🎸', en:'Music',    th:'ดนตรี',    lo:'ດົນຕີ',
      pool:['🎸','🥁','🎺','🎷','🎻','🎹','🎤','🪕','🎵','🎼','📯','🎧'] }
  ];

  // ===== UI strings =====
  const I18N = {
    th: {
      title:'🃏 จับคู่ภาพ', back:'← หน้าหลัก',
      themeLbl:'หมวด',
      level:'เลเวล', moves:'ครั้ง', time:'เวลา', best:'ดีที่สุด',
      restart:'เริ่มใหม่', shuffle:'สับใหม่', next:'เลเวลถัดไป',
      winTitle:'เก่งมาก!', winLblTime:'เวลา', winLblMoves:'ครั้ง'
    },
    en: {
      title:'🃏 Memory Match', back:'← Home',
      themeLbl:'Theme',
      level:'Level', moves:'Moves', time:'Time', best:'Best',
      restart:'Restart', shuffle:'Shuffle', next:'Next Level',
      winTitle:'Well done!', winLblTime:'Time', winLblMoves:'Moves'
    },
    lao: {
      title:'🃏 ຈັບຄູ່ພາບ', back:'← ໜ້າຫຼັກ',
      themeLbl:'ໝວດ',
      level:'ລະດັບ', moves:'ຄັ້ງ', time:'ເວລາ', best:'ດີສຸດ',
      restart:'ເລີ່ມໃໝ່', shuffle:'ສັບໃໝ່', next:'ລະດັບຕໍ່ໄປ',
      winTitle:'ເກັ່ງຫຼາຍ!', winLblTime:'ເວລາ', winLblMoves:'ຄັ້ງ'
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'memory_stats_v1';
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return {
        bestPerLevel: s.bestPerLevel || {},  // { level: { time, moves } }
        bestLevel: s.bestLevel || 0,
        plays: s.plays || 0
      };
    } catch { return { bestPerLevel: {}, bestLevel: 0, plays: 0 }; }
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
    if (kind === 'flip')    beep(540, 0.05, 'square', 0.04);
    if (kind === 'match')   { beep(660, 0.1, 'triangle', 0.06); setTimeout(() => beep(880, 0.12, 'triangle', 0.06), 90); }
    if (kind === 'wrong')   { beep(220, 0.14, 'sawtooth', 0.06); }
    if (kind === 'win')     {
      [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.13, 'sine', 0.07), i*100));
    }
  }

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'th';
  })();
  let level = 1;
  let theme = THEMES[0];
  let cards = [];           // each: { id, emoji, matched }
  let flipped = [];         // indices currently face-up but not matched
  let moves = 0;
  let matchedPairs = 0;
  let startTime = 0;
  let timerId = null;
  let inProgress = false;
  let busy = false;         // lock during reveal/hide

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const elBoard = $('board');
  const elLevel = $('ui-level');
  const elMoves = $('ui-moves');
  const elTime = $('ui-time');
  const elBest = $('ui-best');
  const elModalWin = $('modal-win');

  // ===== Level config =====
  function pairsForLevel(lv) {
    if (lv <= 1) return 3;     // 6 cards
    if (lv <= 2) return 4;     // 8 cards
    if (lv <= 4) return 6;     // 12 cards
    return 8;                   // 16 cards (capped)
  }
  function cols(pairs) {
    if (pairs <= 3) return 3;   // 2×3 grid
    if (pairs <= 4) return 4;   // 2×4 grid
    if (pairs <= 6) return 4;   // 3×4 grid
    return 4;                    // 4×4 grid for 8 pairs
  }

  // ===== Helpers =====
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
  function nameFor(t, l) {
    if (l === 'th') return t.th;
    if (l === 'lao') return t.lo;
    return t.en;
  }

  // ===== Build board =====
  function startLevel() {
    busy = false;
    inProgress = false;
    stopTimer();
    moves = 0;
    matchedPairs = 0;
    flipped = [];
    elMoves.textContent = '0';
    elTime.textContent = '0s';
    elModalWin.classList.remove('show');

    // Pick random theme
    theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    $('theme-em').textContent = theme.em;
    $('theme-name').textContent = nameFor(theme, lang);

    const pairs = pairsForLevel(level);
    // Pick `pairs` random emojis from the theme pool
    const chosen = shuffle(theme.pool).slice(0, pairs);
    cards = shuffle([...chosen, ...chosen]).map((emoji, idx) => ({
      id: idx, emoji, matched: false
    }));

    // Layout columns
    const c = cols(pairs);
    elBoard.style.gridTemplateColumns = `repeat(${c}, minmax(0, 1fr))`;
    elBoard.style.maxWidth = (c * 90) + 'px'; // cap so cards stay reasonable

    elLevel.textContent = level;
    renderBoard();
    refreshHud();
  }

  function renderBoard() {
    elBoard.innerHTML = '';
    for (const card of cards) {
      const el = document.createElement('div');
      el.className = 'km-card';
      if (flipped.includes(card.id)) el.classList.add('flipped');
      if (card.matched) el.classList.add('matched');
      el.innerHTML = `
        <div class="km-card-inner">
          <div class="km-card-front">?</div>
          <div class="km-card-back">${card.emoji}</div>
        </div>
      `;
      el.addEventListener('click', () => onCardTap(card, el));
      elBoard.appendChild(el);
    }
  }

  function onCardTap(card, el) {
    if (busy) return;
    if (card.matched) return;
    if (flipped.includes(card.id)) return;
    ensureAudio();
    if (!inProgress) { startTimer(); inProgress = true; }
    el.classList.add('flipped');
    flipped.push(card.id);
    play('flip');
    if (flipped.length === 2) {
      moves++;
      elMoves.textContent = moves;
      const [aId, bId] = flipped;
      const a = cards.find(c => c.id === aId);
      const b = cards.find(c => c.id === bId);
      if (a.emoji === b.emoji) {
        // Match!
        a.matched = true; b.matched = true;
        matchedPairs++;
        flipped = [];
        setTimeout(() => {
          renderBoard();
          play('match');
          if (matchedPairs === cards.length / 2) finishLevel();
        }, 280);
      } else {
        // No match: flip back
        busy = true;
        setTimeout(() => {
          play('wrong');
          const elA = elBoard.children[cards.indexOf(a)];
          const elB = elBoard.children[cards.indexOf(b)];
          if (elA) elA.classList.add('wrong');
          if (elB) elB.classList.add('wrong');
          setTimeout(() => {
            flipped = [];
            busy = false;
            renderBoard();
          }, 450);
        }, 700);
      }
    }
  }

  function startTimer() {
    startTime = Date.now();
    timerId = setInterval(() => {
      const sec = Math.floor((Date.now() - startTime) / 1000);
      elTime.textContent = fmtTime(sec);
    }, 250);
  }
  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function finishLevel() {
    stopTimer();
    inProgress = false;
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const pairs = pairsForLevel(level);
    // Star rating per level: depends on moves vs ideal (pairs = ideal)
    const idealMoves = pairs;
    let stars = 3;
    if (moves > idealMoves * 1.5) stars = 2;
    if (moves > idealMoves * 2.2) stars = 1;
    // Save best for this level
    const prev = loadStats();
    const prevBest = prev.bestPerLevel[level] || {};
    const better = !prevBest.time || sec < prevBest.time || (sec === prevBest.time && moves < prevBest.moves);
    if (better) {
      prev.bestPerLevel[level] = { time: sec, moves, stars };
    }
    prev.bestLevel = Math.max(prev.bestLevel, level);
    prev.plays = (prev.plays || 0) + 1;
    const updated = saveStats(prev);
    $('win-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    $('win-time').textContent = fmtTime(sec);
    $('win-moves').textContent = moves;
    $('newbest').style.display = better ? 'inline-block' : 'none';
    refreshHud();
    play('win');
    setTimeout(() => elModalWin.classList.add('show'), 700);
  }

  // ===== HUD =====
  function refreshHud() {
    const s = loadStats();
    const lvlBest = s.bestPerLevel[level];
    elBest.textContent = lvlBest && lvlBest.time ? fmtTime(lvlBest.time) : '—';
  }

  // ===== Buttons =====
  $('btn-restart').addEventListener('click', () => { startLevel(); });
  $('btn-shuffle').addEventListener('click', () => { startLevel(); });
  $('btn-next').addEventListener('click', () => {
    elModalWin.classList.remove('show');
    level++;
    startLevel();
  });

  // ===== Localization =====
  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    $('theme-lbl').textContent = t.themeLbl;
    $('lbl-level').textContent = t.level;
    $('lbl-moves').textContent = t.moves;
    $('lbl-time').textContent = t.time;
    $('lbl-best').textContent = t.best;
    $('lbl-restart').textContent = t.restart;
    $('lbl-shuffle').textContent = t.shuffle;
    $('lbl-next').textContent = t.next;
    $('win-title').textContent = t.winTitle;
    $('win-lbl-time').textContent = t.winLblTime;
    $('win-lbl-moves').textContent = t.winLblMoves;
    document.title = t.title;
    if (theme) $('theme-name').textContent = nameFor(theme, lang);
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  // ===== Init =====
  applyLang();
  startLevel();
})();
