// Whack-a-Mole — 3x3 grid of holes, moles pop up randomly, tap to score.
// Types: normal mole (+10), golden mole (+25), bomb (-1 life if tapped).
// Endless levels, faster spawn rate at higher levels.

(() => {
  'use strict';

  const I18N = {
    th: {
      title:'🔨 ตีตัวตุ่น', back:'← หน้าหลัก',
      level:'เลเวล', score:'คะแนน', lives:'หัวใจ', best:'ดีที่สุด',
      gameover:'จบเกม', overLblScore:'คะแนน', overLblLevel:'เลเวล',
      again:'▶ เล่นใหม่', start:'เริ่มเล่น', pause:'หยุดชั่วคราว',
      levelUp:'เลเวล ', combo:'คอมโบ x'
    },
    en: {
      title:'🔨 Whack-a-Mole', back:'← Home',
      level:'Level', score:'Score', lives:'Lives', best:'Best',
      gameover:'Game Over', overLblScore:'Score', overLblLevel:'Level',
      again:'▶ Play Again', start:'Start', pause:'Pause',
      levelUp:'Level ', combo:'Combo x'
    },
    lao: {
      title:'🔨 ຕີໜູ', back:'← ໜ້າຫຼັກ',
      level:'ລະດັບ', score:'ຄະແນນ', lives:'ຫົວໃຈ', best:'ດີສຸດ',
      gameover:'ຈົບເກມ', overLblScore:'ຄະແນນ', overLblLevel:'ລະດັບ',
      again:'▶ ຫຼິ້ນອີກ', start:'ເລີ່ມຫຼິ້ນ', pause:'ຢຸດຊົ່ວຄາວ',
      levelUp:'ລະດັບ ', combo:'ຄອມໂບ x'
    }
  };

  const STATS_KEY = 'whack_stats_v1';
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
    g.gain.setValueAtTime(vol || 0.05, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + d);
    osc.start(now); osc.stop(now + d + 0.02);
  }
  function play(kind) {
    if (!audioCtx) return;
    if (kind === 'hit')     { beep(660, 0.08, 'triangle', 0.07); setTimeout(() => beep(880, 0.06, 'triangle', 0.05), 50); }
    if (kind === 'gold')    { [660, 880, 1100].forEach((f, i) => setTimeout(() => beep(f, 0.08, 'triangle', 0.07), i*50)); }
    if (kind === 'bomb')    { beep(120, 0.3, 'sawtooth', 0.1); setTimeout(() => beep(80, 0.2, 'sawtooth', 0.08), 150); }
    if (kind === 'pop')     beep(330 + Math.random()*100, 0.06, 'square', 0.04);
    if (kind === 'levelup') { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.13, 'sine', 0.07), i*100)); }
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
  let combo = 0;
  let playing = false;
  let spawnTimer = null;
  const HOLES = 9;
  const holeStates = new Array(HOLES).fill(null);  // null or { type, hitTaken, hideTimer }

  const $ = id => document.getElementById(id);
  const grid = $('grid');

  function levelConfig(lv) {
    // Faster spawn + shorter visibility as level rises
    const spawnInterval = Math.max(420, 1500 - (lv - 1) * 90);
    const visibleMs     = Math.max(700, 1700 - (lv - 1) * 80);
    const bombChance    = Math.min(0.28, 0.08 + (lv - 1) * 0.022);
    const goldChance    = Math.min(0.12, 0.04 + (lv - 1) * 0.008);
    const maxConcurrent = lv >= 7 ? 3 : (lv >= 3 ? 2 : 1);
    return { spawnInterval, visibleMs, bombChance, goldChance, maxConcurrent };
  }

  function buildGrid() {
    grid.innerHTML = '';
    for (let i = 0; i < HOLES; i++) {
      const hole = document.createElement('div');
      hole.className = 'wm-hole';
      hole.dataset.i = i;
      const mole = document.createElement('div');
      mole.className = 'wm-mole';
      mole.dataset.i = i;
      hole.appendChild(mole);
      hole.addEventListener('pointerdown', onHit);
      grid.appendChild(hole);
    }
  }

  function emojiFor(type) {
    if (type === 'gold') return '👑';
    if (type === 'bomb') return '💣';
    return '🐹';
  }

  function spawn() {
    if (!playing) return;
    const cfg = levelConfig(level);
    const active = holeStates.filter(Boolean).length;
    if (active >= cfg.maxConcurrent) return;

    // Pick empty hole
    const empty = [];
    for (let i = 0; i < HOLES; i++) if (!holeStates[i]) empty.push(i);
    if (!empty.length) return;
    const idx = empty[Math.floor(Math.random() * empty.length)];

    // Pick type
    const r = Math.random();
    let type = 'normal';
    if (r < cfg.bombChance) type = 'bomb';
    else if (r < cfg.bombChance + cfg.goldChance) type = 'gold';

    const mole = grid.children[idx].querySelector('.wm-mole');
    mole.classList.remove('hit', 'show');
    mole.textContent = emojiFor(type);
    // Force reflow so transition triggers
    void mole.offsetWidth;
    mole.classList.add('show');
    play('pop');

    const hideTimer = setTimeout(() => hideMole(idx, false), cfg.visibleMs);
    holeStates[idx] = { type, hitTaken: false, hideTimer };
  }

  function hideMole(idx, wasHit) {
    const st = holeStates[idx];
    if (!st) return;
    if (st.hideTimer) clearTimeout(st.hideTimer);
    const mole = grid.children[idx].querySelector('.wm-mole');
    mole.classList.remove('show', 'hit');
    // If not hit and is a normal/gold mole that escaped, break combo
    if (!wasHit && st.type !== 'bomb') {
      combo = 0;
    }
    holeStates[idx] = null;
  }

  function popText(holeEl, text, neg) {
    // Append to grid (not hole) so popup isn't clipped by hole's overflow:hidden.
    const pop = document.createElement('div');
    pop.className = 'wm-pop' + (neg ? ' neg' : '');
    pop.textContent = text;
    pop.style.left = (holeEl.offsetLeft + holeEl.offsetWidth / 2) + 'px';
    pop.style.top  = (holeEl.offsetTop  + holeEl.offsetHeight * 0.25) + 'px';
    grid.appendChild(pop);
    setTimeout(() => pop.remove(), 800);
  }

  function onHit(e) {
    if (!playing) return;
    ensureAudio();
    const holeEl = e.currentTarget;
    const idx = parseInt(holeEl.dataset.i, 10);
    const st = holeStates[idx];
    if (!st || st.hitTaken) return;
    st.hitTaken = true;

    const mole = holeEl.querySelector('.wm-mole');
    mole.classList.add('hit');

    if (st.type === 'bomb') {
      lives--;
      play('bomb');
      popText(holeEl, '-1 ❤', true);
      combo = 0;
      $('ui-lives').textContent = '❤'.repeat(Math.max(0, lives)) || '·';
    } else {
      combo++;
      const base = st.type === 'gold' ? 25 : 10;
      const comboBonus = Math.min(combo - 1, 10) * 2;
      const gained = base + comboBonus;
      score += gained;
      $('ui-score').textContent = score;
      play(st.type === 'gold' ? 'gold' : 'hit');
      popText(holeEl, '+' + gained, false);
      if (combo >= 3 && combo % 3 === 0) {
        showFlash(I18N[lang].combo + combo + '!');
      }
      // Level up every 100 points
      const nextLevel = Math.floor(score / 100) + 1;
      if (nextLevel > level) {
        level = nextLevel;
        showFlash(I18N[lang].levelUp + level + ' 🎉');
        play('levelup');
        $('ui-level').textContent = level;
        restartSpawnLoop();
      }
    }

    // Clear scheduled auto-hide; let the .hit animation play, then clean up classes & state.
    if (st.hideTimer) clearTimeout(st.hideTimer);
    setTimeout(() => {
      mole.classList.remove('show', 'hit');
      holeStates[idx] = null;
    }, 320);

    if (lives <= 0) gameOver();
  }

  function showFlash(msg) {
    const el = $('flash');
    el.textContent = msg;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function restartSpawnLoop() {
    if (spawnTimer) clearInterval(spawnTimer);
    const cfg = levelConfig(level);
    spawnTimer = setInterval(spawn, cfg.spawnInterval);
  }

  function startGame() {
    level = 1; score = 0; lives = 5; combo = 0;
    $('ui-level').textContent = '1';
    $('ui-score').textContent = '0';
    $('ui-lives').textContent = '❤❤❤❤❤';
    // Clear any leftover moles
    for (let i = 0; i < HOLES; i++) hideMole(i, false);
    playing = true;
    $('start-row').style.display = 'none';
    restartSpawnLoop();
  }

  function stopGame() {
    playing = false;
    if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
    for (let i = 0; i < HOLES; i++) hideMole(i, false);
  }

  function gameOver() {
    stopGame();
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

  $('btn-start').addEventListener('click', () => { ensureAudio(); startGame(); });
  $('btn-again').addEventListener('click', () => {
    ensureAudio();
    $('modal-over').classList.remove('show');
    startGame();
  });

  // Pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) {
      if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
    } else if (!document.hidden && playing && !spawnTimer) {
      restartSpawnLoop();
    }
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
    $('btn-start-lbl').textContent = t.start;
    document.title = t.title;
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  applyLang();
  $('ui-best').textContent = loadStats().bestScore;
  buildGrid();
})();
