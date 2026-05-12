// Tetris Pro — kids-friendly, mobile-first
// Swipe controls: tap=rotate, swipe-L/R=move, swipe-down=soft drop, swipe-up=hard drop.

// ---------- Constants ----------
const COLS = 10;
const ROWS = 20;

const SHAPES = [
  [[1, 1, 1, 1]],            // I
  [[1, 1], [1, 1]],          // O
  [[0, 1, 0], [1, 1, 1]],    // T
  [[1, 1, 0], [0, 1, 1]],    // S
  [[0, 1, 1], [1, 1, 0]],    // Z
  [[1, 0, 0], [1, 1, 1]],    // J
  [[0, 0, 1], [1, 1, 1]]     // L
];
const COLORS = ['#00bcd4', '#ffeb3b', '#e040fb', '#4caf50', '#f44336', '#1976d2', '#ff9800'];

const LINE_SCORES = [0, 40, 100, 300, 1200]; // NES Tetris scoring per cleared lines
const SOFT_DROP_POINTS = 1;
const HARD_DROP_POINTS = 2;
const LINES_PER_LEVEL = 10;
const START_DROP_MS = 800;
const MIN_DROP_MS = 80;

// ---------- State machine ----------
const STATE_READY = 'ready';
const STATE_PLAYING = 'playing';
const STATE_PAUSED = 'paused';
const STATE_OVER = 'over';
let gameState = STATE_READY;

// ---------- Game state ----------
let board = []; // [row][col] = color string or null
let current = null;
let next = null;
let ghost = null;
let score = 0;
let lines = 0;
let level = 1;
let dropMs = START_DROP_MS;
let highScore = parseInt(localStorage.getItem('tetrisHighScore') || '0', 10);
let startTime = 0;
let tickHandle = null;
let timerHandle = null;
let cellEls = [];
let prevPainted = new Set();
let themeIdx = parseInt(localStorage.getItem('tetrisTheme') || '0', 10);
const THEMES = ['default', 'wood', 'galaxy'];

// ---------- Audio (shared synthesized context) ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.35;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('tetrisMuted') === '1';
function applyMute() { masterGain.gain.value = muted ? 0 : 0.35; }
applyMute();
function toggleMute() {
  muted = !muted;
  localStorage.setItem('tetrisMuted', muted ? '1' : '0');
  applyMute();
  const btn = document.getElementById('tetris-mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}
window.tetrisToggleMute = toggleMute;

function beep({ type = 'square', freq = 600, freqEnd = null, duration = 0.10, gain = 0.3 }) {
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
function sndRotate()   { beep({ type: 'triangle', freq: 800, freqEnd: 1000, duration: 0.06, gain: 0.25 }); }
function sndHardDrop() { beep({ type: 'sawtooth', freq: 200, freqEnd: 80,  duration: 0.15, gain: 0.4 }); }
function sndLock()     { beep({ type: 'square',   freq: 220, duration: 0.04, gain: 0.2 }); }
function sndClear(n) {
  if (n >= 4) {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => beep({ type: 'triangle', freq: f, duration: 0.15, gain: 0.4 }), i * 100);
    });
  } else {
    beep({ type: 'triangle', freq: 600 + n * 200, freqEnd: 900 + n * 250, duration: 0.20, gain: 0.4 });
  }
}
function sndLevelUp()  {
  [523, 659, 784].forEach((f, i) => {
    setTimeout(() => beep({ type: 'triangle', freq: f, duration: 0.12, gain: 0.35 }), i * 90);
  });
}
function sndGameOver() {
  beep({ type: 'sawtooth', freq: 500, freqEnd: 80, duration: 0.7, gain: 0.4 });
}

// ---------- Theme ----------
function applyTheme() {
  document.body.classList.remove('theme-default', 'theme-wood', 'theme-galaxy');
  document.body.classList.add('theme-' + THEMES[themeIdx]);
}
function cycleTheme() {
  themeIdx = (themeIdx + 1) % THEMES.length;
  localStorage.setItem('tetrisTheme', String(themeIdx));
  applyTheme();
}
window.tetrisCycleTheme = cycleTheme;

// ---------- Board build ----------
function resetBoard() {
  board = [];
  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) board[r][c] = null;
  }
}

function buildCells() {
  const el = document.getElementById('tetris-board');
  if (!el) return;
  el.innerHTML = '';
  el.style.setProperty('--cols', COLS);
  el.style.setProperty('--rows', ROWS);
  cellEls = [];
  prevPainted = new Set();
  for (let i = 0; i < ROWS * COLS; i++) {
    const c = document.createElement('div');
    c.className = 'tetris-cell';
    el.appendChild(c);
    cellEls.push(c);
  }
}

// ---------- Pieces ----------
function randomPiece() {
  const idx = Math.floor(Math.random() * SHAPES.length);
  return {
    shape: SHAPES[idx].map(row => row.slice()),
    color: COLORS[idx],
    row: 0,
    col: Math.floor(COLS / 2) - Math.ceil(SHAPES[idx][0].length / 2)
  };
}

function rotateMatrix(shape) {
  return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
}

function validMove(piece, dr, dc, rotated) {
  const shape = rotated || piece.shape;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nr = piece.row + r + dr;
      const nc = piece.col + c + dc;
      if (nc < 0 || nc >= COLS || nr >= ROWS) return false;
      if (nr >= 0 && board[nr][nc]) return false;
    }
  }
  return true;
}

function lockPiece() {
  let topOut = false;
  for (let r = 0; r < current.shape.length; r++) {
    for (let c = 0; c < current.shape[r].length; c++) {
      if (!current.shape[r][c]) continue;
      const nr = current.row + r;
      const nc = current.col + c;
      if (nr < 0) { topOut = true; continue; }
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        board[nr][nc] = current.color;
      }
    }
  }
  sndLock();
  return topOut;
}

function clearCompletedLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      r++; // re-check this row index now that rows shifted
    }
  }
  if (cleared > 0) {
    const points = LINE_SCORES[cleared] * level;
    score += points;
    lines += cleared;
    sndClear(cleared);
    showLineToast(cleared, points);
    const newLevel = Math.floor(lines / LINES_PER_LEVEL) + 1;
    if (newLevel > level) {
      level = newLevel;
      dropMs = Math.max(MIN_DROP_MS, START_DROP_MS - (level - 1) * 70);
      sndLevelUp();
      restartTick();
    }
    updateStats();
  }
}

function showLineToast(count, points) {
  const toast = document.getElementById('tetris-toast');
  if (!toast) return;
  const t = (window.tetrisLang) || {};
  const labels = [null, t.single || 'Single!', t.double || 'Double!', t.triple || 'Triple!', t.tetris || 'TETRIS!'];
  toast.textContent = `${labels[count]}  +${points}`;
  toast.className = `tetris-toast ${count === 4 ? 'tetris-toast-big' : ''}`;
  toast.style.opacity = '1';
  clearTimeout(showLineToast._h);
  showLineToast._h = setTimeout(() => { toast.style.opacity = '0'; }, 1200);
}

// ---------- Ghost ----------
function computeGhost() {
  if (!current) return null;
  const g = { shape: current.shape, color: current.color, row: current.row, col: current.col };
  while (validMove(g, 1, 0)) g.row++;
  return g;
}

// ---------- Render ----------
function paint() {
  for (const idx of prevPainted) {
    cellEls[idx].className = 'tetris-cell';
    cellEls[idx].style.background = '';
  }
  prevPainted.clear();

  // Fixed cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        const idx = r * COLS + c;
        cellEls[idx].className = 'tetris-cell fixed';
        cellEls[idx].style.background = board[r][c];
        prevPainted.add(idx);
      }
    }
  }

  // Ghost (under active piece)
  if (ghost) {
    for (let r = 0; r < ghost.shape.length; r++) {
      for (let c = 0; c < ghost.shape[r].length; c++) {
        if (!ghost.shape[r][c]) continue;
        const nr = ghost.row + r;
        const nc = ghost.col + c;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (board[nr][nc]) continue;
        const idx = nr * COLS + nc;
        // Don't override active piece cells
        if (cellEls[idx].className.includes('active')) continue;
        cellEls[idx].className = 'tetris-cell ghost';
        cellEls[idx].style.background = ghost.color;
        prevPainted.add(idx);
      }
    }
  }

  // Active piece
  if (current) {
    for (let r = 0; r < current.shape.length; r++) {
      for (let c = 0; c < current.shape[r].length; c++) {
        if (!current.shape[r][c]) continue;
        const nr = current.row + r;
        const nc = current.col + c;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        const idx = nr * COLS + nc;
        cellEls[idx].className = 'tetris-cell active';
        cellEls[idx].style.background = current.color;
        prevPainted.add(idx);
      }
    }
  }
}

function paintNext() {
  const preview = document.getElementById('next-preview');
  if (!preview || !next) return;
  preview.innerHTML = '';
  const rows = next.shape.length;
  const cols = next.shape[0].length;
  preview.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  preview.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'next-cell';
      if (next.shape[r][c]) {
        cell.style.background = next.color;
        cell.classList.add('on');
      }
      preview.appendChild(cell);
    }
  }
}

function updateStats() {
  document.getElementById('tetris-score').textContent = score;
  document.getElementById('tetris-lines').textContent = lines;
  document.getElementById('tetris-level').textContent = level;
  document.getElementById('tetris-highscore').textContent = highScore;
}

function updateTimer() {
  if (!startTime) return;
  const t = Math.floor((Date.now() - startTime) / 1000);
  const m = String(Math.floor(t / 60)).padStart(2, '0');
  const s = String(t % 60).padStart(2, '0');
  const el = document.getElementById('tetris-time');
  if (el) el.textContent = `${m}:${s}`;
}

// ---------- Movement ----------
function move(dx) {
  if (gameState !== STATE_PLAYING || !current) return;
  if (validMove(current, 0, dx)) {
    current.col += dx;
    ghost = computeGhost();
    paint();
  }
}

function rotateCurrent() {
  if (gameState !== STATE_PLAYING || !current) return;
  const rotated = rotateMatrix(current.shape);
  // Try basic rotation + simple wall kicks (-1, +1, -2, +2)
  const kicks = [0, -1, 1, -2, 2];
  for (const k of kicks) {
    if (validMove(current, 0, k, rotated)) {
      current.shape = rotated;
      current.col += k;
      ghost = computeGhost();
      sndRotate();
      paint();
      return;
    }
  }
}

function softDrop() {
  if (gameState !== STATE_PLAYING || !current) return;
  if (validMove(current, 1, 0)) {
    current.row++;
    score += SOFT_DROP_POINTS;
    updateStats();
    paint();
  } else {
    lockAndNext();
  }
}

function hardDrop() {
  if (gameState !== STATE_PLAYING || !current) return;
  let dropped = 0;
  while (validMove(current, 1, 0)) {
    current.row++;
    dropped++;
  }
  score += dropped * HARD_DROP_POINTS;
  sndHardDrop();
  updateStats();
  lockAndNext();
}

function lockAndNext() {
  lockPiece();
  clearCompletedLines();
  current = next;
  next = randomPiece();
  ghost = computeGhost();
  paintNext();
  // Game over if new piece collides immediately
  if (!validMove(current, 0, 0)) {
    gameOver();
    return;
  }
  paint();
}

// ---------- Lifecycle ----------
function tick() {
  if (gameState !== STATE_PLAYING || !current) return;
  if (validMove(current, 1, 0)) {
    current.row++;
    ghost = computeGhost();
    paint();
  } else {
    lockAndNext();
  }
}

function restartTick() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = setInterval(tick, dropMs);
}
function stopTick() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = null;
}

function gameOver() {
  gameState = STATE_OVER;
  stopTick();
  clearInterval(timerHandle);
  sndGameOver();
  const beat = score > highScore;
  if (beat) {
    highScore = score;
    localStorage.setItem('tetrisHighScore', String(highScore));
  }
  updateStats();
  showGameOverModal(score, highScore, beat);
}

function showGameOverModal(finalScore, hi, isNew) {
  const modal = document.getElementById('tetris-gameover-modal');
  if (!modal) return;
  document.getElementById('tetris-final-score').textContent = finalScore;
  document.getElementById('tetris-final-hi').textContent = hi;
  document.getElementById('tetris-final-lines').textContent = lines;
  document.getElementById('tetris-final-level').textContent = level;
  const newTag = document.getElementById('tetris-new-record');
  if (newTag) newTag.style.display = isNew ? '' : 'none';
  modal.style.display = 'flex';
}
function hideGameOverModal() {
  const modal = document.getElementById('tetris-gameover-modal');
  if (modal) modal.style.display = 'none';
}

function togglePause() {
  if (gameState === STATE_OVER || gameState === STATE_READY) return;
  if (gameState === STATE_PLAYING) {
    gameState = STATE_PAUSED;
    stopTick();
  } else if (gameState === STATE_PAUSED) {
    gameState = STATE_PLAYING;
    restartTick();
  }
  const overlay = document.getElementById('tetris-pause-overlay');
  if (overlay) overlay.style.display = gameState === STATE_PAUSED ? 'flex' : 'none';
  const btn = document.getElementById('tetris-pause-btn');
  if (btn) btn.textContent = gameState === STATE_PAUSED ? '▶' : '⏸';
}
window.tetrisTogglePause = togglePause;

function startGame() {
  hideGameOverModal();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  resetBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropMs = START_DROP_MS;
  current = randomPiece();
  next = randomPiece();
  ghost = computeGhost();
  startTime = Date.now();
  updateStats();
  paintNext();
  paint();
  gameState = STATE_PLAYING;
  restartTick();
  clearInterval(timerHandle);
  timerHandle = setInterval(updateTimer, 1000);
  updateTimer();
}
window.tetrisStartGame = startGame;

// ---------- Input: keyboard ----------
document.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
  if (gameState !== STATE_PLAYING) return;
  if (e.key === 'ArrowLeft')      { move(-1); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { move(1);  e.preventDefault(); }
  else if (e.key === 'ArrowDown')  { softDrop(); e.preventDefault(); }
  else if (e.key === 'ArrowUp' || e.key === 'x' || e.key === 'X') { rotateCurrent(); e.preventDefault(); }
  else if (e.key === ' ')          { hardDrop(); e.preventDefault(); }
});

// ---------- Input: touch (tap=rotate, swipe) ----------
function attachTouch() {
  const boardEl = document.getElementById('tetris-board');
  if (!boardEl) return;

  let touch = null;
  let touchMoved = false;

  boardEl.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (!t || gameState !== STATE_PLAYING) return;
    touch = {
      startX: t.clientX, startY: t.clientY,
      lastX: t.clientX,  lastY: t.clientY,
      startTime: Date.now()
    };
    touchMoved = false;
  }, { passive: true });

  boardEl.addEventListener('touchmove', (e) => {
    if (!touch || gameState !== STATE_PLAYING) return;
    e.preventDefault();
    const t = e.touches[0];
    if (!t) return;
    const cellSize = boardEl.clientWidth / COLS;
    const stepX = cellSize * 0.7;
    const stepY = cellSize * 0.7;

    const dx = t.clientX - touch.lastX;
    if (Math.abs(dx) >= stepX) {
      const steps = Math.trunc(dx / stepX);
      const dir = steps > 0 ? 1 : -1;
      for (let i = 0; i < Math.abs(steps); i++) move(dir);
      touch.lastX += steps * stepX;
      touchMoved = true;
    }

    const dy = t.clientY - touch.lastY;
    if (dy >= stepY) {
      const steps = Math.trunc(dy / stepY);
      for (let i = 0; i < steps; i++) softDrop();
      touch.lastY += steps * stepY;
      touchMoved = true;
    }
  }, { passive: false });

  boardEl.addEventListener('touchend', () => {
    if (!touch) return;
    const dt = Date.now() - touch.startTime;
    const totalDx = touch.lastX - touch.startX;
    const totalDy = touch.lastY - touch.startY;

    // Hard-drop on quick upward flick from start point
    if (totalDy < -boardEl.clientHeight * 0.18 && dt < 400) {
      hardDrop();
    }
    // Tap → rotate (no movement, short duration)
    else if (!touchMoved && dt < 250 && Math.abs(totalDx) < 12 && Math.abs(totalDy) < 12) {
      rotateCurrent();
    }
    touch = null;
  });
  boardEl.addEventListener('touchcancel', () => { touch = null; });
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  buildCells();
  resetBoard();
  paint();
  paintNext();
  updateStats();

  const startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.addEventListener('click', startGame);
  const replayBtn = document.getElementById('tetris-replay-btn');
  if (replayBtn) replayBtn.addEventListener('click', startGame);
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', cycleTheme);
  const muteBtn = document.getElementById('tetris-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  const pauseBtn = document.getElementById('tetris-pause-btn');
  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
  const resumeBtn = document.getElementById('tetris-resume-btn');
  if (resumeBtn) resumeBtn.addEventListener('click', togglePause);
  const dropBtn = document.getElementById('tetris-drop-btn');
  if (dropBtn) {
    // pointerdown for snappy response (no 300ms click delay on mobile)
    dropBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      hardDrop();
    });
  }

  attachTouch();
});
