// Slither (Snake vs Bot) — kids-friendly, mobile-first
// One pass per tick. Cells built once, only changed cells re-styled per frame.

// ---------- Board sizing (16:9 portrait on mobile, 30x30 desktop) ----------
let ROWS = 30, COLS = 30;
if (window.innerWidth <= 600) { ROWS = 16; COLS = 9; }

// ---------- State ----------
let snakes = [];
let foods = [];
let score = 0;
let highScore = parseInt(localStorage.getItem('slitherHighScore') || '0', 10);
let gameInterval = null;
let isGameOver = false;
let isPaused = false;
let playerDir = 'right';
let botDir = 'right';
let dirQueue = []; // buffered direction changes for the player
let tickMs = 200;
let foodsEaten = 0;
let cellEls = [];
let dirtyCells = new Set();
const BOARD_ID = 'slither-board';

// ---------- Audio (shared context) ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.4;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('slitherMuted') === '1';
function applyMute() { masterGain.gain.value = muted ? 0 : 0.4; }
applyMute();
function toggleMute() {
  muted = !muted;
  localStorage.setItem('slitherMuted', muted ? '1' : '0');
  applyMute();
  const btn = document.getElementById('slither-mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}
window.slitherToggleMute = toggleMute;

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
function playEatSound()      { beep({ type: 'triangle', freq: 800, freqEnd: 1200, duration: 0.10, gain: 0.3 }); }
function playBonusSound()    { beep({ type: 'triangle', freq: 900, freqEnd: 1800, duration: 0.20, gain: 0.4 }); }
function playGameOverSound() {
  beep({ type: 'sawtooth', freq: 400, freqEnd: 100, duration: 0.4, gain: 0.4 });
}
function playTickSound()     { /* reserved */ }

// ---------- Board construction (once) ----------
function buildBoard() {
  const el = document.getElementById(BOARD_ID);
  if (!el) return;
  el.innerHTML = '';
  el.style.setProperty('--cols', COLS);
  el.style.setProperty('--rows', ROWS);
  cellEls = [];
  dirtyCells = new Set();
  for (let i = 0; i < ROWS * COLS; i++) {
    const c = document.createElement('div');
    c.className = 'slither-cell';
    el.appendChild(c);
    cellEls.push(c);
  }
}

// ---------- Initial placement ----------
function placePlayerSnake() {
  const midR = Math.floor(ROWS / 2);
  const midC = Math.floor(COLS / 2);
  snakes[0] = [
    { row: midR, col: midC },
    { row: midR, col: midC - 1 },
    { row: midR, col: midC - 2 }
  ];
}
function placeBotSnake() {
  const r = Math.min(5, ROWS - 1);
  const c = Math.min(5, COLS - 1);
  snakes[1] = [
    { row: r, col: c },
    { row: r, col: Math.max(0, c - 1) },
    { row: r, col: Math.max(0, c - 2) }
  ];
}
function occupiedAt(row, col) {
  for (const s of snakes) for (const seg of s) if (seg.row === row && seg.col === col) return true;
  for (const f of foods) if (f.row === row && f.col === col) return true;
  return false;
}
function placeFood(bonus = false) {
  let r, c, tries = 0;
  do {
    r = Math.floor(Math.random() * ROWS);
    c = Math.floor(Math.random() * COLS);
    tries++;
    if (tries > 200) return;
  } while (occupiedAt(r, c));
  const f = { row: r, col: c, bonus };
  if (bonus) f.expiresAt = Date.now() + 8000; // 8s lifespan
  foods.push(f);
}

// ---------- Render: only re-style cells that changed ----------
function paint() {
  // Clear last frame's dirty cells
  for (const idx of dirtyCells) cellEls[idx].className = 'slither-cell';
  dirtyCells.clear();

  // Draw foods
  for (const f of foods) {
    const idx = f.row * COLS + f.col;
    cellEls[idx].className = `slither-cell ${f.bonus ? 'slither-bonus' : 'slither-food'}`;
    dirtyCells.add(idx);
  }
  // Draw snakes (player first so bot can overlap visually if it ever does, though we resolve collisions)
  for (let s = 0; s < snakes.length; s++) {
    const snake = snakes[s];
    for (let i = 0; i < snake.length; i++) {
      const idx = snake[i].row * COLS + snake[i].col;
      const cls = s === 0
        ? (i === 0 ? 'slither-head' : 'slither-body')
        : (i === 0 ? 'slither-bot-head' : 'slither-bot-body');
      cellEls[idx].className = `slither-cell ${cls}`;
      dirtyCells.add(idx);
    }
  }
}

// ---------- Direction handling ----------
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
function queueDirection(d) {
  if (!['up', 'down', 'left', 'right'].includes(d)) return;
  const last = dirQueue.length > 0 ? dirQueue[dirQueue.length - 1] : playerDir;
  if (d === last) return;
  if (OPPOSITE[d] === last) return;
  if (dirQueue.length < 2) dirQueue.push(d);
}
window.setSlitherDirection = queueDirection; // FIX: HTML buttons reference this

// ---------- Game tick ----------
function gameLoop() {
  if (isGameOver || isPaused) return;
  // Apply queued direction change
  if (dirQueue.length > 0) playerDir = dirQueue.shift();

  movePlayer();
  moveBot();
  expireBonusFoods();
  if (checkEatFood()) { /* food eaten */ }
  if (checkCollisions()) return; // game ended

  paint();
  document.getElementById('slither-score').textContent = score;
}

function wrap(pos) {
  if (pos.row < 0) pos.row = ROWS - 1;
  if (pos.row >= ROWS) pos.row = 0;
  if (pos.col < 0) pos.col = COLS - 1;
  if (pos.col >= COLS) pos.col = 0;
}

function movePlayer() {
  let dr = 0, dc = 0;
  if (playerDir === 'up') dr = -1;
  if (playerDir === 'down') dr = 1;
  if (playerDir === 'left') dc = -1;
  if (playerDir === 'right') dc = 1;
  const head = { row: snakes[0][0].row + dr, col: snakes[0][0].col + dc };
  wrap(head);
  snakes[0].unshift(head);
  snakes[0].pop();
}

// ---------- Smarter bot AI ----------
function moveBot() {
  const bot = snakes[1];
  if (!bot || bot.length === 0) return;
  const target = nearestFood(bot[0]);
  const dirs = ['up', 'down', 'left', 'right'];

  // Score each direction: prefer toward food, avoid collisions
  let best = null, bestScore = -Infinity;
  for (const d of dirs) {
    if (OPPOSITE[d] === botDir && bot.length > 1) continue; // can't reverse
    const next = step(bot[0], d);
    if (wouldCollide(next, bot, snakes[0])) continue;
    const dist = target ? distance(next, target) : 0;
    const s = -dist + Math.random() * 0.3; // smaller dist = better; tiny jitter to avoid loops
    if (s > bestScore) { bestScore = s; best = d; }
  }
  // Fallback: any non-colliding direction
  if (!best) {
    for (const d of dirs) {
      const next = step(bot[0], d);
      if (!wouldCollide(next, bot, snakes[0])) { best = d; break; }
    }
  }
  if (!best) best = botDir; // truly stuck, plow ahead
  botDir = best;

  const head = step(bot[0], botDir);
  wrap(head);
  bot.unshift(head);
  bot.pop();
}
function step(pos, d) {
  if (d === 'up') return { row: pos.row - 1, col: pos.col };
  if (d === 'down') return { row: pos.row + 1, col: pos.col };
  if (d === 'left') return { row: pos.row, col: pos.col - 1 };
  return { row: pos.row, col: pos.col + 1 };
}
function distance(a, b) {
  const dr = Math.min(Math.abs(a.row - b.row), ROWS - Math.abs(a.row - b.row));
  const dc = Math.min(Math.abs(a.col - b.col), COLS - Math.abs(a.col - b.col));
  return dr + dc;
}
function wouldCollide(next, ownSnake, otherSnake) {
  const w = { row: next.row, col: next.col };
  wrap(w);
  // Self (skip last segment which will move away)
  for (let i = 0; i < ownSnake.length - 1; i++) {
    if (w.row === ownSnake[i].row && w.col === ownSnake[i].col) return true;
  }
  // Other snake
  for (const seg of otherSnake) {
    if (w.row === seg.row && w.col === seg.col) return true;
  }
  return false;
}
function nearestFood(pos) {
  let best = null, bestD = Infinity;
  for (const f of foods) {
    const d = distance(pos, f);
    if (d < bestD) { bestD = d; best = f; }
  }
  return best;
}

// ---------- Food handling ----------
function expireBonusFoods() {
  const now = Date.now();
  foods = foods.filter(f => !(f.bonus && f.expiresAt && now > f.expiresAt));
}

function checkEatFood() {
  let ate = false;
  const head = snakes[0][0];
  for (let i = 0; i < foods.length; i++) {
    if (head.row === foods[i].row && head.col === foods[i].col) {
      const bonus = !!foods[i].bonus;
      score += bonus ? 30 : 10;
      foodsEaten++;
      snakes[0].push({ ...snakes[0][snakes[0].length - 1] });
      foods.splice(i, 1);
      placeFood();
      // 25% chance to spawn a bonus food alongside a normal one
      if (!bonus && Math.random() < 0.25 && foods.length < 3) placeFood(true);
      ate = true;
      if (bonus) playBonusSound(); else playEatSound();
      // Speed up every 5 foods
      if (foodsEaten % 5 === 0 && tickMs > 80) {
        tickMs = Math.max(80, tickMs - 10);
        restartInterval();
      }
      break;
    }
  }
  // Bot eats (silent — same food pool)
  const bot = snakes[1];
  if (bot && bot.length) {
    const bh = bot[0];
    for (let i = 0; i < foods.length; i++) {
      if (bh.row === foods[i].row && bh.col === foods[i].col) {
        bot.push({ ...bot[bot.length - 1] });
        foods.splice(i, 1);
        placeFood();
        break;
      }
    }
  }
  return ate;
}

// ---------- Collisions ----------
function checkCollisions() {
  const head = snakes[0][0];
  // Player hit self
  for (let i = 1; i < snakes[0].length; i++) {
    if (head.row === snakes[0][i].row && head.col === snakes[0][i].col) {
      gameOver();
      return true;
    }
  }
  // Player hit bot
  for (const seg of snakes[1]) {
    if (head.row === seg.row && head.col === seg.col) {
      gameOver();
      return true;
    }
  }
  // Bot collisions => respawn bot (don't end player's game)
  const bh = snakes[1][0];
  for (let i = 1; i < snakes[1].length; i++) {
    if (bh.row === snakes[1][i].row && bh.col === snakes[1][i].col) { respawnBot(); return false; }
  }
  for (const seg of snakes[0]) {
    if (bh.row === seg.row && bh.col === seg.col) { respawnBot(); return false; }
  }
  return false;
}

function respawnBot() {
  placeBotSnake();
  botDir = 'right';
}

// ---------- Game-over flow ----------
function gameOver() {
  isGameOver = true;
  if (gameInterval) clearInterval(gameInterval);
  playGameOverSound();
  const beat = score > highScore;
  if (beat) {
    highScore = score;
    localStorage.setItem('slitherHighScore', String(highScore));
  }
  showGameOverModal(score, highScore, beat);
  updateHighScoreDisplay();
}

function showGameOverModal(finalScore, hi, isNew) {
  const modal = document.getElementById('slither-gameover-modal');
  if (!modal) return;
  document.getElementById('slither-final-score').textContent = finalScore;
  document.getElementById('slither-final-hi').textContent = hi;
  const newTag = document.getElementById('slither-new-record');
  if (newTag) newTag.style.display = isNew ? '' : 'none';
  modal.style.display = 'flex';
}
function hideGameOverModal() {
  const modal = document.getElementById('slither-gameover-modal');
  if (modal) modal.style.display = 'none';
}

function updateHighScoreDisplay() {
  const el = document.getElementById('slither-highscore');
  if (el) el.textContent = highScore;
}

// ---------- Pause ----------
function togglePause() {
  if (isGameOver) return;
  isPaused = !isPaused;
  const overlay = document.getElementById('slither-pause-overlay');
  if (overlay) overlay.style.display = isPaused ? 'flex' : 'none';
  const btn = document.getElementById('slither-pause-btn');
  if (btn) btn.textContent = isPaused ? '▶' : '⏸';
}
window.slitherTogglePause = togglePause;

// ---------- Lifecycle ----------
function restartInterval() {
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, tickMs);
}

function resetGame() {
  hideGameOverModal();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  score = 0;
  foodsEaten = 0;
  tickMs = 200;
  isGameOver = false;
  isPaused = false;
  snakes = [];
  foods = [];
  dirQueue = [];
  playerDir = 'right';
  botDir = 'right';
  buildBoard();
  placePlayerSnake();
  placeBotSnake();
  placeFood();
  paint();
  document.getElementById('slither-score').textContent = '0';
  updateHighScoreDisplay();
  const pauseOverlay = document.getElementById('slither-pause-overlay');
  if (pauseOverlay) pauseOverlay.style.display = 'none';
  const pauseBtn = document.getElementById('slither-pause-btn');
  if (pauseBtn) pauseBtn.textContent = '⏸';
  restartInterval();
}
window.slitherResetGame = resetGame;

// ---------- Input: keyboard ----------
document.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
  if (isGameOver || isPaused) return;
  if (['ArrowUp', 'w', 'W'].includes(e.key)) queueDirection('up');
  else if (['ArrowDown', 's', 'S'].includes(e.key)) queueDirection('down');
  else if (['ArrowLeft', 'a', 'A'].includes(e.key)) queueDirection('left');
  else if (['ArrowRight', 'd', 'D'].includes(e.key)) queueDirection('right');
});

// ---------- Input: swipe on the board ----------
function attachSwipe() {
  const board = document.getElementById(BOARD_ID);
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
    // Reset origin so subsequent swipes register without lifting
    startX = t.clientX; startY = t.clientY;
    e.preventDefault();
  }, { passive: false });

  board.addEventListener('touchend', () => { active = false; });
  board.addEventListener('touchcancel', () => { active = false; });
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  // Mute button
  const muteBtn = document.getElementById('slither-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  // Pause button
  const pauseBtn = document.getElementById('slither-pause-btn');
  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);

  // Play-again button
  const playAgainBtn = document.getElementById('slither-playagain-btn');
  if (playAgainBtn) playAgainBtn.addEventListener('click', resetGame);

  // Resume button on pause overlay
  const resumeBtn = document.getElementById('slither-resume-btn');
  if (resumeBtn) resumeBtn.addEventListener('click', togglePause);

  buildBoard();
  placePlayerSnake();
  placeBotSnake();
  placeFood();
  paint();
  updateHighScoreDisplay();
  attachSwipe();
});
