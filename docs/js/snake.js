// Snake Pro — kids-friendly, mobile-first
// One pass per tick. Cells built once, only changed cells re-styled per frame.

// ---------- Board ----------
const ROWS = 21, COLS = 21;
const OBSTACLE_COUNT = 10;
const BASE_TICK_MS = 240;

// ---------- State ----------
const STATE_MENU = 'menu';
const STATE_PLAYING = 'playing';
const STATE_PAUSED = 'paused';
const STATE_OVER = 'over';
let gameState = STATE_MENU;

let board = []; // 0 = empty, 1 = wall
let snake = [];
let food = null;
let bonus = null;
let score = 0;
let highScore = parseInt(localStorage.getItem('snakeHighScore') || '0', 10);
let playerDir = 'right';
let dirQueue = [];
let tickMs = BASE_TICK_MS;
let tickHandle = null;
let cellEls = [];
let dirtyCells = new Set();
let themeIdx = parseInt(localStorage.getItem('snakeTheme') || '0', 10);

const themes = [
  { head: '#4caf50', body: '#81c784', food: '#ffeb3b', bonus: '#ff4081', wall: '#616161', bg: '#111' },
  { head: '#1976d2', body: '#90caf9', food: '#ff4081', bonus: '#ffd600', wall: '#555', bg: '#0d1b2a' },
  { head: '#ffd600', body: '#fffde7', food: '#4caf50', bonus: '#ff4081', wall: '#666', bg: '#2a2200' }
];

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// ---------- Audio (shared) ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.4;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('snakeMuted') === '1';
function applyMute() { masterGain.gain.value = muted ? 0 : 0.4; }
applyMute();
function toggleMute() {
  muted = !muted;
  localStorage.setItem('snakeMuted', muted ? '1' : '0');
  applyMute();
  const btn = document.getElementById('snake-mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}
window.snakeToggleMute = toggleMute;

function beep({ type = 'square', freq = 600, freqEnd = null, duration = 0.12, gain = 0.3 }) {
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
function playEatSound()    { beep({ type: 'triangle', freq: 800, freqEnd: 1200, duration: 0.10, gain: 0.3 }); }
function playBonusSound()  { beep({ type: 'triangle', freq: 900, freqEnd: 1800, duration: 0.22, gain: 0.4 }); }
function playGameOverSound() {
  beep({ type: 'sawtooth', freq: 500, freqEnd: 120, duration: 0.45, gain: 0.4 });
}

// ---------- Theme ----------
function applyTheme() {
  const t = themes[themeIdx];
  document.body.style.background = t.bg;
  document.documentElement.style.setProperty('--snake-head', t.head);
  document.documentElement.style.setProperty('--snake-body', t.body);
  document.documentElement.style.setProperty('--snake-food', t.food);
  document.documentElement.style.setProperty('--snake-bonus', t.bonus);
  document.documentElement.style.setProperty('--snake-wall', t.wall);
}
function cycleTheme() {
  themeIdx = (themeIdx + 1) % themes.length;
  localStorage.setItem('snakeTheme', String(themeIdx));
  applyTheme();
}
window.snakeCycleTheme = cycleTheme;

// ---------- Board build (once) ----------
function buildBoard() {
  const el = document.getElementById('snake-board');
  if (!el) return;
  el.innerHTML = '';
  el.style.setProperty('--cols', COLS);
  el.style.setProperty('--rows', ROWS);
  cellEls = [];
  dirtyCells = new Set();
  for (let i = 0; i < ROWS * COLS; i++) {
    const c = document.createElement('div');
    c.className = 'snake-cell';
    el.appendChild(c);
    cellEls.push(c);
  }
}

function createBoardData() {
  board = [];
  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) board[r][c] = 0;
  }
  // Place obstacles, avoiding the middle row where the snake spawns
  const midR = Math.floor(ROWS / 2);
  const midC = Math.floor(COLS / 2);
  let placed = 0, tries = 0;
  while (placed < OBSTACLE_COUNT && tries < 500) {
    tries++;
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (board[r][c] !== 0) continue;
    // Clear path for the initial snake (mid row, mid-3 to mid+3)
    if (r === midR && c >= midC - 3 && c <= midC + 3) continue;
    board[r][c] = 1;
    placed++;
  }
}

// ---------- Initial placement ----------
function placeSnake() {
  const midR = Math.floor(ROWS / 2);
  const midC = Math.floor(COLS / 2);
  snake = [
    { row: midR, col: midC },
    { row: midR, col: midC - 1 },
    { row: midR, col: midC - 2 }
  ];
}

function occupied(row, col) {
  if (board[row][col] === 1) return true;
  if (snake.some(s => s.row === row && s.col === col)) return true;
  if (food && food.row === row && food.col === col) return true;
  if (bonus && bonus.row === row && bonus.col === col) return true;
  return false;
}

function placeFood() {
  let r, c, tries = 0;
  do {
    r = Math.floor(Math.random() * ROWS);
    c = Math.floor(Math.random() * COLS);
    tries++;
    if (tries > 300) return;
  } while (occupied(r, c));
  food = { row: r, col: c };
}

function maybeSpawnBonus() {
  if (bonus) return; // only one at a time
  if (Math.random() > 0.20) return; // 20% per food eaten
  let r, c, tries = 0;
  do {
    r = Math.floor(Math.random() * ROWS);
    c = Math.floor(Math.random() * COLS);
    tries++;
    if (tries > 300) return;
  } while (occupied(r, c));
  bonus = { row: r, col: c, expiresAt: Date.now() + 8000 };
}

// ---------- Render ----------
function paint() {
  for (const idx of dirtyCells) cellEls[idx].className = 'snake-cell';
  dirtyCells.clear();

  // Walls
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === 1) {
        const idx = r * COLS + c;
        cellEls[idx].className = 'snake-cell snake-wall';
        dirtyCells.add(idx);
      }
    }
  }
  // Food + bonus
  if (food) {
    const idx = food.row * COLS + food.col;
    cellEls[idx].className = 'snake-cell snake-food';
    dirtyCells.add(idx);
  }
  if (bonus) {
    const idx = bonus.row * COLS + bonus.col;
    cellEls[idx].className = 'snake-cell snake-bonus';
    dirtyCells.add(idx);
  }
  // Snake
  for (let i = 0; i < snake.length; i++) {
    const idx = snake[i].row * COLS + snake[i].col;
    cellEls[idx].className = `snake-cell ${i === 0 ? 'snake-head' : 'snake-body'}`;
    dirtyCells.add(idx);
  }
}

// ---------- Direction handling ----------
function queueDirection(d) {
  if (!['up', 'down', 'left', 'right'].includes(d)) return;
  if (gameState !== STATE_PLAYING) return;
  const last = dirQueue.length > 0 ? dirQueue[dirQueue.length - 1] : playerDir;
  if (d === last) return;
  if (OPPOSITE[d] === last) return;
  if (dirQueue.length < 2) dirQueue.push(d);
}
window.setSnakeDirection = queueDirection;

// ---------- Game tick ----------
function tick() {
  if (gameState !== STATE_PLAYING) return;
  if (dirQueue.length > 0) playerDir = dirQueue.shift();

  // Expire bonus
  if (bonus && Date.now() > bonus.expiresAt) bonus = null;

  let dr = 0, dc = 0;
  if (playerDir === 'up') dr = -1;
  else if (playerDir === 'down') dr = 1;
  else if (playerDir === 'left') dc = -1;
  else if (playerDir === 'right') dc = 1;
  const head = { row: snake[0].row + dr, col: snake[0].col + dc };

  // Wall collision
  if (head.row < 0 || head.row >= ROWS || head.col < 0 || head.col >= COLS) return gameOver();
  if (board[head.row][head.col] === 1) return gameOver();
  // Self collision
  if (snake.some(s => s.row === head.row && s.col === head.col)) return gameOver();

  snake.unshift(head);

  // Eat
  let grew = false;
  if (food && head.row === food.row && head.col === food.col) {
    score += 10;
    food = null;
    placeFood();
    maybeSpawnBonus();
    playEatSound();
    grew = true;
    updateSpeed();
  } else if (bonus && head.row === bonus.row && head.col === bonus.col) {
    score += 30;
    // Grow extra
    snake.push({ ...snake[snake.length - 1] });
    bonus = null;
    playBonusSound();
    grew = true;
    updateSpeed();
  }
  if (!grew) snake.pop();

  document.getElementById('snake-score').textContent = score;
  paint();
}

function updateSpeed() {
  const newMs = Math.max(80, BASE_TICK_MS - Math.floor(score / 50) * 20);
  if (newMs !== tickMs) {
    tickMs = newMs;
    restartTick();
  }
}

function restartTick() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = setInterval(tick, tickMs);
}

function stopTick() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = null;
}

// ---------- Game-over flow ----------
function gameOver() {
  gameState = STATE_OVER;
  stopTick();
  playGameOverSound();
  const beat = score > highScore;
  if (beat) {
    highScore = score;
    localStorage.setItem('snakeHighScore', String(highScore));
  }
  showGameOverModal(score, highScore, beat);
  updateHighScoreDisplay();
}

function showGameOverModal(finalScore, hi, isNew) {
  const modal = document.getElementById('snake-gameover-modal');
  if (!modal) return;
  document.getElementById('snake-final-score').textContent = finalScore;
  document.getElementById('snake-final-hi').textContent = hi;
  const newTag = document.getElementById('snake-new-record');
  if (newTag) newTag.style.display = isNew ? '' : 'none';
  modal.style.display = 'flex';
}
function hideGameOverModal() {
  const modal = document.getElementById('snake-gameover-modal');
  if (modal) modal.style.display = 'none';
}

function updateHighScoreDisplay() {
  const el = document.getElementById('snake-highscore');
  if (el) el.textContent = highScore;
}

// ---------- Pause ----------
function togglePause() {
  if (gameState === STATE_OVER || gameState === STATE_MENU) return;
  if (gameState === STATE_PLAYING) {
    gameState = STATE_PAUSED;
    stopTick();
  } else if (gameState === STATE_PAUSED) {
    gameState = STATE_PLAYING;
    restartTick();
  }
  const overlay = document.getElementById('snake-pause-overlay');
  if (overlay) overlay.style.display = gameState === STATE_PAUSED ? 'flex' : 'none';
  const btn = document.getElementById('snake-pause-btn');
  if (btn) btn.textContent = gameState === STATE_PAUSED ? '▶' : '⏸';
}
window.snakeTogglePause = togglePause;

// ---------- Lifecycle ----------
function startGame() {
  hideGameOverModal();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  score = 0;
  playerDir = 'right';
  dirQueue = [];
  tickMs = BASE_TICK_MS;
  food = null;
  bonus = null;
  createBoardData();
  placeSnake();
  placeFood();
  document.getElementById('snake-score').textContent = '0';
  updateHighScoreDisplay();
  const pauseOverlay = document.getElementById('snake-pause-overlay');
  if (pauseOverlay) pauseOverlay.style.display = 'none';
  const pauseBtn = document.getElementById('snake-pause-btn');
  if (pauseBtn) pauseBtn.textContent = '⏸';
  gameState = STATE_PLAYING;
  paint();
  restartTick();
}
window.snakeStartGame = startGame;

// ---------- Input: keyboard ----------
document.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
  if (['ArrowUp', 'w', 'W'].includes(e.key)) queueDirection('up');
  else if (['ArrowDown', 's', 'S'].includes(e.key)) queueDirection('down');
  else if (['ArrowLeft', 'a', 'A'].includes(e.key)) queueDirection('left');
  else if (['ArrowRight', 'd', 'D'].includes(e.key)) queueDirection('right');
});

// ---------- Input: swipe on board ----------
function attachSwipe() {
  const board = document.getElementById('snake-board');
  if (!board) return;
  let startX = 0, startY = 0, active = false;
  const SWIPE_THRESHOLD = 20;

  board.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (!t) return;
    startX = t.clientX; startY = t.clientY; active = true;
  }, { passive: true });

  board.addEventListener('touchmove', (e) => {
    if (!active) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) queueDirection(dx > 0 ? 'right' : 'left');
    else queueDirection(dy > 0 ? 'down' : 'up');
    startX = t.clientX; startY = t.clientY;
    e.preventDefault();
  }, { passive: false });

  board.addEventListener('touchend', () => { active = false; });
  board.addEventListener('touchcancel', () => { active = false; });
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  const muteBtn = document.getElementById('snake-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  const pauseBtn = document.getElementById('snake-pause-btn');
  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);

  const playAgainBtn = document.getElementById('snake-playagain-btn');
  if (playAgainBtn) playAgainBtn.addEventListener('click', startGame);

  const resumeBtn = document.getElementById('snake-resume-btn');
  if (resumeBtn) resumeBtn.addEventListener('click', togglePause);

  const startBtn = document.getElementById('start-snake-btn');
  if (startBtn) startBtn.addEventListener('click', startGame);

  const themeBtn = document.getElementById('theme-snake-btn');
  if (themeBtn) themeBtn.addEventListener('click', cycleTheme);

  applyTheme();
  buildBoard();
  createBoardData();
  placeSnake();
  placeFood();
  paint();
  updateHighScoreDisplay();
  attachSwipe();
});
