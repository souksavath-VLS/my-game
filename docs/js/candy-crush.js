// Candy Crush — match-3 puzzle.
// Modes:
//   - classic (easy/medium/hard): fixed grid, fixed moves, score-only
//   - hardcore: level progression, target score, obstacles (ice), wallet, boosters

// ---------- Candy types ----------
const CANDIES     = ['🍓', '🍋', '🍇', '🫐', '🍏', '🍊'];
const TYPE_BG     = ['#ffcdd2', '#fff9c4', '#e1bee7', '#bbdefb', '#c8e6c9', '#ffe0b2'];
const TYPE_BORDER = ['#c62828', '#f9a825', '#7b1fa2', '#1565c0', '#388e3c', '#ef6c00'];

// ---------- Difficulty (classic mode) ----------
const DIFFICULTY = {
  easy:   { rows: 6, cols: 6, types: 5, moves: 25 },
  medium: { rows: 7, cols: 7, types: 6, moves: 20 },
  hard:   { rows: 8, cols: 8, types: 6, moves: 15 }
};

// ---------- Hardcore level config ----------
function levelConfig(level) {
  const types = level <= 1 ? 4 : (level === 2 ? 5 : 6);
  const moves = Math.max(10, 22 - (level - 1) * 2);     // 22 → 20 → 18 → ... → 10
  const target = 400 + (level - 1) * 300;                // 400 → 700 → 1000 → ...
  const obstacles = level >= 3 ? Math.min(8, (level - 2) * 2) : 0;
  return { rows: 7, cols: 7, types, moves, target, obstacles };
}

// ---------- Boosters ----------
const BOOSTERS = {
  hammer:  { price: 5,  icon: '🔨', kind: 'aim' },     // click a cell to destroy
  rowbomb: { price: 10, icon: '💥', kind: 'instant' }, // destroy a random row
  moves5:  { price: 15, icon: '⏩', kind: 'instant' }   // +5 moves
};

// ---------- State ----------
let lang = 'en';
let mode = localStorage.getItem('candyMode') || 'classic';
if (mode !== 'classic' && mode !== 'hardcore') mode = 'classic';

let diffKey = localStorage.getItem('candyDiff') || 'medium';
if (!DIFFICULTY[diffKey]) diffKey = 'medium';

let cfg = DIFFICULTY[diffKey];        // current effective config (mutated for hardcore)
let level = 1;                         // hardcore only
let targetScore = 0;                   // hardcore only

let grid = [];                         // grid[r][c] = type index or null
let obstacles = [];                    // obstacles[r][c] = null | 'ice'
let cellEls = [];
let selected = null;
let score = 0;
let movesLeft = 0;
let combo = 0;
let busy = false;
let highScores = JSON.parse(localStorage.getItem('candyHigh') || '{}');
let pointerState = null;
let wallet = parseInt(localStorage.getItem('candyWallet') || '30', 10);
let activeBooster = null;              // null | 'hammer'

// ---------- Audio ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.35;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('candyMuted') === '1';
function applyMute() { masterGain.gain.value = muted ? 0 : 0.35; }
applyMute();
function toggleMute() {
  muted = !muted;
  localStorage.setItem('candyMuted', muted ? '1' : '0');
  applyMute();
  const btn = document.getElementById('cc-mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}
window.candyToggleMute = toggleMute;

function beep({ type = 'triangle', freq = 700, freqEnd = null, duration = 0.10, gain = 0.30 }) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (freqEnd !== null) o.frequency.linearRampToValueAtTime(freqEnd, audioCtx.currentTime + duration);
  g.gain.setValueAtTime(gain, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
  o.connect(g); g.connect(masterGain);
  o.start();
  o.stop(audioCtx.currentTime + duration);
}
function sndSelect()  { beep({ freq: 600, duration: 0.04, gain: 0.18 }); }
function sndSwap()    { beep({ freq: 500, freqEnd: 800, duration: 0.10, gain: 0.25 }); }
function sndMatch(n)  {
  const base = 700 + Math.min(n, 8) * 60;
  beep({ freq: base, freqEnd: base + 300, duration: 0.12, gain: 0.32 });
}
function sndCombo(l)  { beep({ freq: 800 + l * 120, freqEnd: 1300 + l * 120, duration: 0.15, gain: 0.35 }); }
function sndNoMatch() { beep({ type: 'sawtooth', freq: 300, freqEnd: 200, duration: 0.12, gain: 0.25 }); }
function sndIceBreak(){ beep({ type: 'square', freq: 1200, freqEnd: 400, duration: 0.10, gain: 0.30 }); }
function sndBooster() { beep({ freq: 900, freqEnd: 1500, duration: 0.18, gain: 0.32 }); }
function sndDenied()  { beep({ type: 'sawtooth', freq: 200, duration: 0.20, gain: 0.30 }); }
function sndLevelUp() {
  [523, 659, 784, 1046].forEach((f, i) =>
    setTimeout(() => beep({ freq: f, duration: 0.18, gain: 0.4 }), i * 120));
}
function sndGameOver() {
  [659, 523, 392, 262].forEach((f, i) =>
    setTimeout(() => beep({ freq: f, duration: 0.18, gain: 0.35 }), i * 130));
}
function sndWin() {
  [523, 659, 784, 1046].forEach((f, i) =>
    setTimeout(() => beep({ freq: f, duration: 0.18, gain: 0.4 }), i * 120));
}

// ---------- Language ----------
function getLang() {
  let l = localStorage.getItem('lang') || 'en';
  if (!['th', 'en', 'lao'].includes(l)) l = 'en';
  return l;
}
function t(key) {
  const data = window.candyLangData || {};
  const set = data[lang] || data.en || {};
  return set[key] || key;
}

// ---------- Grid + obstacle build ----------
function emptyObstacles() {
  const o = [];
  for (let r = 0; r < cfg.rows; r++) {
    o[r] = [];
    for (let c = 0; c < cfg.cols; c++) o[r][c] = null;
  }
  return o;
}

function placeObstacles(count) {
  obstacles = emptyObstacles();
  let placed = 0, safety = 0;
  while (placed < count && safety < 200) {
    safety++;
    const r = Math.floor(Math.random() * cfg.rows);
    const c = Math.floor(Math.random() * cfg.cols);
    if (obstacles[r][c] != null) continue;
    obstacles[r][c] = 'ice';
    grid[r][c] = null;  // ice cells have no candy underneath
    placed++;
  }
}

function buildGrid() {
  grid = [];
  for (let r = 0; r < cfg.rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cfg.cols; c++) {
      let type, safety = 0;
      do {
        type = Math.floor(Math.random() * cfg.types);
        safety++;
      } while (
        safety < 30 && (
          (c >= 2 && grid[r][c - 1] === type && grid[r][c - 2] === type) ||
          (r >= 2 && grid[r - 1][c] === type && grid[r - 2][c] === type)
        )
      );
      grid[r][c] = type;
    }
  }
}

function buildDOM() {
  const board = document.getElementById('cc-board');
  if (!board) return;
  board.innerHTML = '';
  board.style.setProperty('--cols', cfg.cols);
  board.style.setProperty('--rows', cfg.rows);
  cellEls = [];
  for (let r = 0; r < cfg.rows; r++) {
    cellEls[r] = [];
    for (let c = 0; c < cfg.cols; c++) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'cc-cell';
      el.dataset.r = r;
      el.dataset.c = c;
      el.addEventListener('pointerdown', (e) => {
        if (busy || movesLeft <= 0) return;
        // If hammer is active, consume it on this cell instead of starting a swap
        if (activeBooster === 'hammer') {
          useHammer(r, c);
          return;
        }
        pointerState = { r, c, x: e.clientX, y: e.clientY, swiped: false };
      });
      board.appendChild(el);
      cellEls[r][c] = el;
    }
  }
  attachBoardGestures(board);
}

function attachBoardGestures(board) {
  if (board.dataset.gestures === '1') return;
  board.dataset.gestures = '1';
  const SWIPE_THRESHOLD = 18;

  board.addEventListener('pointermove', (e) => {
    if (!pointerState || pointerState.swiped) return;
    const dx = e.clientX - pointerState.x;
    const dy = e.clientY - pointerState.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    let dr = 0, dc = 0;
    if (Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
    else dr = dy > 0 ? 1 : -1;
    const a = { r: pointerState.r, c: pointerState.c };
    const b = { r: a.r + dr, c: a.c + dc };
    if (b.r < 0 || b.r >= cfg.rows || b.c < 0 || b.c >= cfg.cols) return;
    pointerState.swiped = true;
    if (selected) {
      const prev = selected; selected = null;
      paintCell(prev.r, prev.c);
    }
    tryMove(a, b);
  });

  board.addEventListener('pointerup', () => {
    if (pointerState && !pointerState.swiped) {
      onTap(pointerState.r, pointerState.c);
    }
    pointerState = null;
  });
  board.addEventListener('pointercancel', () => { pointerState = null; });
}

// ---------- Render ----------
function paintCell(r, c) {
  const el = cellEls[r][c];
  el.classList.remove('selected', 'ice', 'matched');
  if (obstacles[r] && obstacles[r][c] === 'ice') {
    el.textContent = '🧊';
    el.style.background = '#e0f2fe';
    el.style.borderColor = '#0284c7';
    el.classList.add('ice');
    return;
  }
  const tIdx = grid[r][c];
  if (tIdx == null) {
    el.textContent = '';
    el.style.background = 'transparent';
    el.style.borderColor = 'transparent';
    return;
  }
  el.textContent = CANDIES[tIdx];
  el.style.background = TYPE_BG[tIdx];
  el.style.borderColor = TYPE_BORDER[tIdx];
  if (selected && selected.r === r && selected.c === c) {
    el.classList.add('selected');
  }
}

function renderAll() {
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) paintCell(r, c);
  }
}

function updateStats() {
  document.getElementById('cc-score').textContent = score;
  document.getElementById('cc-moves').textContent = movesLeft;
  const bestEl = document.getElementById('cc-best');
  if (bestEl) {
    const bestKey = mode === 'hardcore' ? 'hardcoreLevel' : diffKey;
    bestEl.textContent = highScores[bestKey] || 0;
  }
  const levelPill = document.getElementById('cc-level-pill');
  if (levelPill) levelPill.style.display = mode === 'hardcore' ? '' : 'none';
  const walletPill = document.getElementById('cc-wallet-pill');
  if (walletPill) walletPill.style.display = mode === 'hardcore' ? '' : 'none';
  const targetWrap = document.getElementById('cc-target-wrap');
  if (targetWrap) targetWrap.style.display = mode === 'hardcore' ? '' : 'none';
  const boosterRow = document.getElementById('cc-booster-row');
  if (boosterRow) boosterRow.style.display = mode === 'hardcore' ? '' : 'none';

  if (mode === 'hardcore') {
    document.getElementById('cc-level').textContent = level;
    document.getElementById('cc-target').textContent = targetScore;
    const pct = Math.min(100, (score / targetScore) * 100);
    const bar = document.getElementById('cc-target-bar');
    if (bar) bar.style.width = pct + '%';
    document.getElementById('cc-wallet').textContent = wallet;
    updateBoosterButtons();
  }
}

function updateBoosterButtons() {
  for (const key of Object.keys(BOOSTERS)) {
    const btn = document.getElementById('cc-boost-' + key);
    if (!btn) continue;
    const price = BOOSTERS[key].price;
    btn.classList.toggle('disabled', wallet < price);
    btn.classList.toggle('active', activeBooster === key);
  }
}

// ---------- Tap handling ----------
function onTap(r, c) {
  if (busy || movesLeft <= 0) return;
  if (obstacles[r][c] === 'ice') return;

  if (!selected) {
    selected = { r, c };
    paintCell(r, c);
    sndSelect();
    return;
  }
  if (selected.r === r && selected.c === c) {
    const prev = selected; selected = null;
    paintCell(prev.r, prev.c);
    return;
  }
  if (isAdjacent(selected, { r, c })) {
    const a = selected, b = { r, c };
    selected = null;
    paintCell(a.r, a.c);
    tryMove(a, b);
  } else {
    const prev = selected;
    selected = { r, c };
    paintCell(prev.r, prev.c);
    paintCell(r, c);
    sndSelect();
  }
}

function isAdjacent(a, b) {
  return (a.r === b.r && Math.abs(a.c - b.c) === 1) ||
         (a.c === b.c && Math.abs(a.r - b.r) === 1);
}

// ---------- Move attempt ----------
async function tryMove(a, b) {
  // Block swaps involving ice cells
  if (obstacles[a.r][a.c] === 'ice' || obstacles[b.r][b.c] === 'ice') return;

  busy = true;
  swap(a, b);
  paintCell(a.r, a.c); paintCell(b.r, b.c);
  sndSwap();
  await delay(150);

  const matches = findMatches();
  if (matches.length === 0) {
    await delay(150);
    swap(a, b);
    paintCell(a.r, a.c); paintCell(b.r, b.c);
    sndNoMatch();
    busy = false;
    return;
  }

  movesLeft--;
  combo = 0;
  await processMatches(matches);
  updateStats();
  busy = false;

  if (mode === 'hardcore' && score >= targetScore) {
    await levelUp();
    return;
  }
  if (movesLeft <= 0) finishGame();
}

function swap(a, b) {
  const t = grid[a.r][a.c];
  grid[a.r][a.c] = grid[b.r][b.c];
  grid[b.r][b.c] = t;
}

// ---------- Match detection (ice cells excluded) ----------
function findMatches() {
  const matched = new Set();
  for (let r = 0; r < cfg.rows; r++) {
    let runStart = 0;
    for (let c = 1; c <= cfg.cols; c++) {
      const breakHere = (c === cfg.cols) ||
        grid[r][c] !== grid[r][runStart] ||
        obstacles[r][c] === 'ice' ||
        obstacles[r][runStart] === 'ice';
      if (breakHere) {
        const runLen = c - runStart;
        if (grid[r][runStart] != null && obstacles[r][runStart] !== 'ice' && runLen >= 3) {
          for (let k = runStart; k < c; k++) matched.add(r + ',' + k);
        }
        runStart = c;
      }
    }
  }
  for (let c = 0; c < cfg.cols; c++) {
    let runStart = 0;
    for (let r = 1; r <= cfg.rows; r++) {
      const breakHere = (r === cfg.rows) ||
        grid[r][c] !== grid[runStart][c] ||
        obstacles[r][c] === 'ice' ||
        obstacles[runStart][c] === 'ice';
      if (breakHere) {
        const runLen = r - runStart;
        if (grid[runStart][c] != null && obstacles[runStart][c] !== 'ice' && runLen >= 3) {
          for (let k = runStart; k < r; k++) matched.add(k + ',' + c);
        }
        runStart = r;
      }
    }
  }
  return Array.from(matched).map(s => {
    const [r, c] = s.split(',').map(Number);
    return { r, c };
  });
}

// ---------- Cascade processing ----------
async function processMatches(matches) {
  while (matches.length > 0) {
    combo++;
    const points = computePoints(matches, combo);
    score += points;
    if (combo > 1) sndCombo(combo);
    sndMatch(matches.length);
    showPopup(points, combo, matches);

    for (const { r, c } of matches) {
      cellEls[r][c].classList.add('matched');
    }
    await delay(320);

    // Break adjacent ice blocks
    let iceBroken = false;
    for (const { r, c } of matches) {
      grid[r][c] = null;
      cellEls[r][c].classList.remove('matched');
      paintCell(r, c);
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= cfg.rows || nc < 0 || nc >= cfg.cols) continue;
        if (obstacles[nr][nc] === 'ice') {
          obstacles[nr][nc] = null;
          grid[nr][nc] = null;
          paintCell(nr, nc);
          iceBroken = true;
        }
      }
    }
    if (iceBroken) sndIceBreak();
    await delay(100);

    applyGravity();
    refill();
    renderAll();
    updateStats();
    await delay(220);

    matches = findMatches();
  }
}

function computePoints(matches, comboLevel) {
  return Math.floor(matches.length * 20 * (1 + (comboLevel - 1) * 0.5));
}

function applyGravity() {
  for (let c = 0; c < cfg.cols; c++) {
    let writeRow = cfg.rows - 1;
    for (let r = cfg.rows - 1; r >= 0; r--) {
      if (obstacles[r][c] === 'ice') {
        writeRow = r - 1; // candies don't pass through ice
        continue;
      }
      if (grid[r][c] != null) {
        if (writeRow !== r) {
          grid[writeRow][c] = grid[r][c];
          grid[r][c] = null;
        }
        writeRow--;
      }
    }
  }
}

function refill() {
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      if (grid[r][c] == null && obstacles[r][c] !== 'ice') {
        grid[r][c] = Math.floor(Math.random() * cfg.types);
      }
    }
  }
}

// ---------- Score popup ----------
function showPopup(points, comboLevel, matches) {
  if (matches.length === 0) return;
  let sumR = 0, sumC = 0;
  for (const m of matches) { sumR += m.r; sumC += m.c; }
  const r = sumR / matches.length, c = sumC / matches.length;
  const board = document.getElementById('cc-board');
  if (!board) return;
  const rect = board.getBoundingClientRect();
  const cellW = rect.width / cfg.cols;
  const cellH = rect.height / cfg.rows;
  const popup = document.createElement('div');
  popup.className = 'cc-popup';
  popup.textContent = comboLevel > 1 ? `+${points}  ×${comboLevel}` : `+${points}`;
  popup.style.left = (rect.left + (c + 0.5) * cellW) + 'px';
  popup.style.top  = (rect.top  + (r + 0.5) * cellH) + 'px';
  if (comboLevel > 1) popup.classList.add('cc-popup-combo');
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

// ---------- Level up (hardcore) ----------
async function levelUp() {
  busy = true;
  sndLevelUp();
  const reward = 10 + level * 2;
  wallet += reward;
  localStorage.setItem('candyWallet', String(wallet));
  // Track best level
  const prevBest = highScores.hardcoreLevel || 0;
  if (level > prevBest) {
    highScores.hardcoreLevel = level;
    localStorage.setItem('candyHigh', JSON.stringify(highScores));
  }

  await showLevelUpPopup(level, reward);

  level++;
  const lc = levelConfig(level);
  cfg = { rows: lc.rows, cols: lc.cols, types: lc.types, moves: lc.moves };
  targetScore = lc.target;
  movesLeft = lc.moves;
  score = 0;
  combo = 0;
  selected = null;
  activeBooster = null;
  buildGrid();
  placeObstacles(lc.obstacles);
  buildDOM();
  renderAll();
  updateStats();
  busy = false;
}

function showLevelUpPopup(reachedLevel, reward) {
  return new Promise(resolve => {
    const modal = document.getElementById('cc-levelup-modal');
    if (!modal) { resolve(); return; }
    document.getElementById('cc-levelup-level').textContent = reachedLevel + 1;
    document.getElementById('cc-levelup-reward').textContent = '+' + reward;
    modal.style.display = 'flex';
    const btn = document.getElementById('cc-levelup-btn');
    const handler = () => {
      btn.removeEventListener('click', handler);
      modal.style.display = 'none';
      resolve();
    };
    btn.addEventListener('click', handler);
    // Auto-resolve after 4s if user doesn't click
    setTimeout(() => { if (modal.style.display === 'flex') handler(); }, 4000);
  });
}

// ---------- Boosters ----------
function activateBooster(key) {
  if (busy || movesLeft <= 0) return;
  if (mode !== 'hardcore') return;
  const b = BOOSTERS[key];
  if (!b) return;
  if (wallet < b.price) {
    flashWalletInsufficient();
    sndDenied();
    return;
  }
  if (b.kind === 'instant') {
    wallet -= b.price;
    localStorage.setItem('candyWallet', String(wallet));
    sndBooster();
    if (key === 'rowbomb') useRowBomber();
    else if (key === 'moves5') useExtraMoves();
    activeBooster = null;
    updateStats();
  } else if (b.kind === 'aim') {
    // Toggle aim mode
    if (activeBooster === key) {
      activeBooster = null;
    } else {
      activeBooster = key;
      sndBooster();
    }
    updateStats();
  }
}
window.candyActivateBooster = activateBooster;

function flashWalletInsufficient() {
  const pill = document.getElementById('cc-wallet-pill');
  if (!pill) return;
  pill.classList.add('flash-bad');
  setTimeout(() => pill.classList.remove('flash-bad'), 700);
  // Toast
  const toast = document.createElement('div');
  toast.className = 'cc-toast';
  toast.textContent = t('walletEmpty') || 'Not enough money';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1600);
}

async function useHammer(r, c) {
  if (obstacles[r][c] === 'ice') {
    // Hammer also breaks ice directly
    wallet -= BOOSTERS.hammer.price;
    localStorage.setItem('candyWallet', String(wallet));
    obstacles[r][c] = null;
    grid[r][c] = null;
    sndIceBreak();
    activeBooster = null;
    busy = true;
    paintCell(r, c);
    await delay(150);
    applyGravity();
    refill();
    renderAll();
    // Cascade any new matches
    let m = findMatches();
    if (m.length > 0) { combo = 0; await processMatches(m); }
    updateStats();
    busy = false;
    return;
  }
  if (grid[r][c] == null) return;
  wallet -= BOOSTERS.hammer.price;
  localStorage.setItem('candyWallet', String(wallet));
  activeBooster = null;
  busy = true;
  // Destroy this candy
  cellEls[r][c].classList.add('matched');
  sndBooster();
  await delay(280);
  grid[r][c] = null;
  paintCell(r, c);
  await delay(80);
  applyGravity();
  refill();
  renderAll();
  let m = findMatches();
  if (m.length > 0) {
    combo = 0;
    await processMatches(m);
  }
  updateStats();
  busy = false;
  if (mode === 'hardcore' && score >= targetScore) await levelUp();
}

async function useRowBomber() {
  busy = true;
  // Pick a random row that has at least one candy (not all ice)
  let candidateRows = [];
  for (let r = 0; r < cfg.rows; r++) {
    let has = false;
    for (let c = 0; c < cfg.cols; c++) {
      if (grid[r][c] != null && obstacles[r][c] !== 'ice') { has = true; break; }
    }
    if (has) candidateRows.push(r);
  }
  if (candidateRows.length === 0) { busy = false; return; }
  const row = candidateRows[Math.floor(Math.random() * candidateRows.length)];
  const cells = [];
  for (let c = 0; c < cfg.cols; c++) {
    if (grid[row][c] != null && obstacles[row][c] !== 'ice') {
      cells.push({ r: row, c });
      cellEls[row][c].classList.add('matched');
    }
  }
  sndMatch(cells.length);
  // Award some points
  const earned = cells.length * 15;
  score += earned;
  showPopup(earned, 1, cells);
  await delay(320);
  for (const { r, c } of cells) {
    grid[r][c] = null;
    cellEls[r][c].classList.remove('matched');
    paintCell(r, c);
  }
  applyGravity();
  refill();
  renderAll();
  let m = findMatches();
  if (m.length > 0) {
    combo = 0;
    await processMatches(m);
  }
  updateStats();
  busy = false;
  if (mode === 'hardcore' && score >= targetScore) await levelUp();
}

function useExtraMoves() {
  movesLeft += 5;
  updateStats();
}

// ---------- Lifecycle ----------
function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

function startNewGame() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  hideResultModal();
  selected = null;
  busy = false;
  score = 0;
  combo = 0;
  activeBooster = null;

  if (mode === 'hardcore') {
    level = 1;
    const lc = levelConfig(level);
    cfg = { rows: lc.rows, cols: lc.cols, types: lc.types, moves: lc.moves };
    targetScore = lc.target;
    movesLeft = lc.moves;
    buildGrid();
    placeObstacles(lc.obstacles);
  } else {
    cfg = DIFFICULTY[diffKey];
    movesLeft = cfg.moves;
    targetScore = 0;
    obstacles = emptyObstacles();
    buildGrid();
  }

  buildDOM();
  renderAll();
  updateStats();
}
window.candyStartNewGame = startNewGame;

function finishGame() {
  if (mode === 'hardcore') {
    // Track best level reached
    const prev = highScores.hardcoreLevel || 0;
    if (level > prev) {
      highScores.hardcoreLevel = level;
      localStorage.setItem('candyHigh', JSON.stringify(highScores));
    }
    sndGameOver();
    showResultModal(false, true);
  } else {
    const prev = highScores[diffKey] || 0;
    const beat = score > prev;
    if (beat) {
      highScores[diffKey] = score;
      localStorage.setItem('candyHigh', JSON.stringify(highScores));
    }
    if (beat) sndWin(); else sndGameOver();
    showResultModal(beat, false);
  }
  updateStats();
}

function showResultModal(beat, isHardcore) {
  const modal = document.getElementById('cc-result-modal');
  if (!modal) return;
  document.getElementById('cc-result-score').textContent = score;
  document.getElementById('cc-result-best').textContent =
    isHardcore ? (highScores.hardcoreLevel || level) : (highScores[diffKey] || 0);
  document.getElementById('cc-result-best-label').textContent =
    isHardcore ? (t('bestLevel') || 'Best Level') : (t('resultBest') || 'Best');
  const titleEl = document.getElementById('cc-result-title');
  if (titleEl) {
    titleEl.textContent = isHardcore
      ? (t('hardcoreFailed') || `Reached Level ${level}`).replace('{L}', level)
      : (t('resultTitle') || 'Game Over 🍭');
  }
  const newTag = document.getElementById('cc-new-record');
  if (newTag) newTag.style.display = beat ? '' : 'none';
  modal.style.display = 'flex';
}
function hideResultModal() {
  const modal = document.getElementById('cc-result-modal');
  if (modal) modal.style.display = 'none';
}

// ---------- Mode / Difficulty ----------
function setMode(newMode) {
  if (newMode !== 'classic' && newMode !== 'hardcore') return;
  mode = newMode;
  localStorage.setItem('candyMode', mode);
  updateModeButtons();
  startNewGame();
}
window.candySetMode = setMode;

function setDifficulty(key) {
  if (!DIFFICULTY[key]) return;
  diffKey = key;
  localStorage.setItem('candyDiff', key);
  mode = 'classic';
  localStorage.setItem('candyMode', mode);
  updateModeButtons();
  startNewGame();
}
window.candySetDifficulty = setDifficulty;

function updateModeButtons() {
  for (const k of Object.keys(DIFFICULTY)) {
    const btn = document.getElementById('cc-diff-' + k);
    if (btn) btn.classList.toggle('active', mode === 'classic' && k === diffKey);
  }
  const hcBtn = document.getElementById('cc-diff-hardcore');
  if (hcBtn) hcBtn.classList.toggle('active', mode === 'hardcore');
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  lang = getLang();

  const muteBtn = document.getElementById('cc-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  const newGameBtn = document.getElementById('cc-newgame-btn');
  if (newGameBtn) newGameBtn.addEventListener('click', startNewGame);
  const replayBtn = document.getElementById('cc-replay-btn');
  if (replayBtn) replayBtn.addEventListener('click', startNewGame);

  for (const k of Object.keys(DIFFICULTY)) {
    const btn = document.getElementById('cc-diff-' + k);
    if (btn) btn.addEventListener('click', () => setDifficulty(k));
  }
  const hcBtn = document.getElementById('cc-diff-hardcore');
  if (hcBtn) hcBtn.addEventListener('click', () => setMode('hardcore'));

  for (const key of Object.keys(BOOSTERS)) {
    const btn = document.getElementById('cc-boost-' + key);
    if (btn) btn.addEventListener('click', () => activateBooster(key));
  }

  updateModeButtons();
  startNewGame();
});
