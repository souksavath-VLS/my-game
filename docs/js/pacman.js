// Pac-Man Pro — kids-friendly, mobile-first
// 15x15 symmetric maze with tunnel, 4 ghosts with distinct AI, power-pellet effect.

// ---------- Maze (each row is exactly 15 chars) ----------
const MAZE = [
  '###############',
  '#......#......#',
  '#.####.#.####.#',
  '#o###..#..###o#',
  '#.####.#.####.#',
  '#......#......#',
  '######.#.######',
  ' ............. ',
  '######.#.######',
  '#......#......#',
  '#.####.#.####.#',
  '#o###..#..###o#',
  '#.####.#.####.#',
  '#......#......#',
  '###############'
];
const ROWS = MAZE.length;
const COLS = MAZE[0].length;

const WALL = 1, DOT = 2, POWER = 3, EMPTY = 0;

// ---------- State machine ----------
const STATE_READY = 'ready';
const STATE_PLAYING = 'playing';
const STATE_PAUSED = 'paused';
const STATE_DYING = 'dying';
const STATE_OVER = 'over';
const STATE_WIN = 'win';
let gameState = STATE_READY;

// ---------- Tunables ----------
const TICK_MS = 180;
const POWER_DURATION_MS = 7000;
const DEATH_PAUSE_MS = 1200;
const STARTING_LIVES = 3;
const SCORE_DOT = 10;
const SCORE_POWER = 50;
const SCORE_GHOST_BASE = 200;

// ---------- Game state ----------
let board = [];                 // 2D static map (WALL/DOT/POWER/EMPTY)
let cellEls = [];               // DOM cell references
let prevEntityCells = new Set();
let pacman = { row: 0, col: 0, dir: 'left', nextDir: null };
let ghosts = [];
let score = 0;
let lives = STARTING_LIVES;
let level = 1;
let dotsRemaining = 0;
let powerUntil = 0;
let ghostsEatenThisPower = 0;
let highScore = parseInt(localStorage.getItem('pacmanHighScore') || '0', 10);
let tickHandle = null;

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// ---------- Audio (shared context, synthesized) ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.4;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('pacmanMuted') === '1';
function applyMute() { masterGain.gain.value = muted ? 0 : 0.4; }
applyMute();
function toggleMute() {
  muted = !muted;
  localStorage.setItem('pacmanMuted', muted ? '1' : '0');
  applyMute();
  const btn = document.getElementById('pacman-mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}
window.pacmanToggleMute = toggleMute;

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
function playDotSound()      { beep({ type: 'square',   freq: 700, freqEnd: 900, duration: 0.05, gain: 0.18 }); }
function playPowerSound()    { beep({ type: 'triangle', freq: 600, freqEnd: 1200, duration: 0.25, gain: 0.4 }); }
function playEatGhostSound() {
  beep({ type: 'triangle', freq: 400, freqEnd: 800, duration: 0.10, gain: 0.4 });
  setTimeout(() => beep({ type: 'triangle', freq: 800, freqEnd: 1400, duration: 0.15, gain: 0.4 }), 100);
}
function playDeathSound()    { beep({ type: 'sawtooth', freq: 500, freqEnd: 80,  duration: 0.6,  gain: 0.4 }); }
function playGameOverSound() {
  beep({ type: 'sawtooth', freq: 300, freqEnd: 80,  duration: 0.8,  gain: 0.4 });
}
function playWinSound() {
  [523, 659, 784, 1046].forEach((f, i) => {
    setTimeout(() => beep({ type: 'triangle', freq: f, duration: 0.15, gain: 0.4 }), i * 150);
  });
}

// ---------- Board parse & build ----------
function parseMaze() {
  board = [];
  dotsRemaining = 0;
  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
      const ch = MAZE[r][c];
      if (ch === '#') board[r][c] = WALL;
      else if (ch === '.') { board[r][c] = DOT; dotsRemaining++; }
      else if (ch === 'o') { board[r][c] = POWER; dotsRemaining++; }
      else board[r][c] = EMPTY;
    }
  }
}

function buildBoard() {
  const el = document.getElementById('pacman-board');
  if (!el) return;
  el.innerHTML = '';
  el.style.setProperty('--cols', COLS);
  el.style.setProperty('--rows', ROWS);
  cellEls = [];
  prevEntityCells = new Set();
  for (let i = 0; i < ROWS * COLS; i++) {
    const c = document.createElement('div');
    c.className = baseClassForIndex(i);
    el.appendChild(c);
    cellEls.push(c);
  }
}

function baseClassForIndex(idx) {
  const r = Math.floor(idx / COLS);
  const c = idx % COLS;
  const v = board[r][c];
  if (v === WALL) return 'pacman-cell wall';
  if (v === DOT) return 'pacman-cell dot';
  if (v === POWER) return 'pacman-cell power';
  return 'pacman-cell';
}

// ---------- Entities ----------
function placePacman() {
  pacman = { row: 7, col: 7, dir: 'left', nextDir: null };
}

function makeGhosts() {
  ghosts = [
    { row: 1,         col: 1,         home: { row: 1, col: 1 },         color: 'red',    ai: 'chase',  dir: 'down',  eaten: false, slow: false },
    { row: 1,         col: COLS - 2,  home: { row: 1, col: COLS - 2 },  color: 'blue',   ai: 'random', dir: 'down',  eaten: false, slow: false },
    { row: ROWS - 2,  col: 1,         home: { row: ROWS - 2, col: 1 },  color: 'orange', ai: 'slow',   dir: 'up',    eaten: false, slow: true  },
    { row: ROWS - 2,  col: COLS - 2,  home: { row: ROWS - 2, col: COLS - 2 }, color: 'green', ai: 'ambush', dir: 'up', eaten: false, slow: false }
  ];
}

// ---------- Render ----------
function paint() {
  for (const idx of prevEntityCells) {
    cellEls[idx].className = baseClassForIndex(idx);
  }
  prevEntityCells.clear();

  // Pac-Man
  const pIdx = pacman.row * COLS + pacman.col;
  cellEls[pIdx].className = `pacman-cell pacman dir-${pacman.dir}`;
  prevEntityCells.add(pIdx);

  // Ghosts (paint after Pac-Man so ghosts appear on top when overlapping)
  const scared = isPowerActive();
  for (const g of ghosts) {
    const gIdx = g.row * COLS + g.col;
    let cls;
    if (g.eaten) cls = 'pacman-cell ghost ghost-eaten';
    else if (scared) {
      const remaining = powerUntil - Date.now();
      cls = `pacman-cell ghost ghost-scared${remaining < 2000 ? ' flashing' : ''}`;
    } else {
      cls = `pacman-cell ghost ghost-${g.color}`;
    }
    cellEls[gIdx].className = cls;
    prevEntityCells.add(gIdx);
  }
}

// ---------- Direction handling ----------
function isWalkable(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  return board[r][c] !== WALL;
}
function step(pos, dir) {
  let r = pos.row, c = pos.col;
  if (dir === 'up') r--;
  else if (dir === 'down') r++;
  else if (dir === 'left') c--;
  else if (dir === 'right') c++;
  // Tunnel wrap on row 7
  if (r === 7) {
    if (c < 0) c = COLS - 1;
    else if (c >= COLS) c = 0;
  }
  return { row: r, col: c };
}

function setPacmanDirection(d) {
  if (!['up', 'down', 'left', 'right'].includes(d)) return;
  if (gameState !== STATE_PLAYING) return;
  pacman.nextDir = d;
}
window.setPacmanDirection = setPacmanDirection;
window.movePacman = setPacmanDirection; // backwards-compat for old HTML

// ---------- Tick ----------
let tickCounter = 0;

function tick() {
  if (gameState !== STATE_PLAYING) return;
  tickCounter++;

  // Pac-Man: try queued direction first
  if (pacman.nextDir) {
    const next = step(pacman, pacman.nextDir);
    if (isWalkable(next.row, next.col)) {
      pacman.dir = pacman.nextDir;
      pacman.nextDir = null;
    }
  }
  const ahead = step(pacman, pacman.dir);
  if (isWalkable(ahead.row, ahead.col)) {
    pacman.row = ahead.row;
    pacman.col = ahead.col;
  }

  // Eat
  const v = board[pacman.row][pacman.col];
  if (v === DOT) {
    board[pacman.row][pacman.col] = EMPTY;
    score += SCORE_DOT;
    dotsRemaining--;
    playDotSound();
  } else if (v === POWER) {
    board[pacman.row][pacman.col] = EMPTY;
    score += SCORE_POWER;
    dotsRemaining--;
    powerUntil = Date.now() + POWER_DURATION_MS;
    ghostsEatenThisPower = 0;
    // Reverse ghost directions when power starts
    for (const g of ghosts) if (!g.eaten) g.dir = OPPOSITE[g.dir] || g.dir;
    playPowerSound();
  }

  // Check Pac-Man / ghost collisions (after Pac-Man move, before ghost move)
  if (handleCollisions()) return;

  // Move ghosts
  for (const g of ghosts) moveGhost(g);

  // Check again after ghost moves
  if (handleCollisions()) return;

  // Update UI
  document.getElementById('pacman-score').textContent = score;
  updateLivesDisplay();

  paint();

  // Win condition
  if (dotsRemaining <= 0) {
    levelClear();
  }
}

// ---------- Ghost AI ----------
function moveGhost(g) {
  if (g.eaten) {
    // Slither home; just chase home position
    moveTowardTarget(g, g.home, { reverseOk: true });
    if (g.row === g.home.row && g.col === g.home.col) g.eaten = false;
    return;
  }

  // Scared ghosts move slower
  const scared = isPowerActive();
  if ((g.slow || scared) && tickCounter % 2 === 0) return; // skip half the ticks

  const dirs = availableDirs(g, /*reverseOk*/false);
  if (dirs.length === 0) return;

  let choice;
  if (scared) {
    // Pick a direction away from Pac-Man
    choice = dirs.reduce((best, d) => {
      const next = step(g, d);
      const dist = manhattan(next, pacman);
      if (!best || dist > best.dist) return { dir: d, dist };
      return best;
    }, null).dir;
  } else {
    switch (g.ai) {
      case 'chase':  choice = pickChase(g, dirs, pacman); break;
      case 'ambush': {
        const target = step(step(step(step(pacman, pacman.dir), pacman.dir), pacman.dir), pacman.dir);
        choice = pickChase(g, dirs, target);
        break;
      }
      case 'random': choice = dirs[Math.floor(Math.random() * dirs.length)]; break;
      case 'slow':   choice = pickChase(g, dirs, pacman); break;
      default:       choice = dirs[0];
    }
  }
  g.dir = choice;
  const next = step(g, g.dir);
  g.row = next.row;
  g.col = next.col;
}

function availableDirs(g, reverseOk) {
  const all = ['up', 'down', 'left', 'right'];
  return all.filter(d => {
    if (!reverseOk && OPPOSITE[d] === g.dir && countOpenNeighbors(g) > 1) return false;
    const next = step(g, d);
    return isWalkable(next.row, next.col);
  });
}
function countOpenNeighbors(g) {
  let count = 0;
  for (const d of ['up', 'down', 'left', 'right']) {
    const n = step(g, d);
    if (isWalkable(n.row, n.col)) count++;
  }
  return count;
}
function manhattan(a, b) { return Math.abs(a.row - b.row) + Math.abs(a.col - b.col); }
function pickChase(g, dirs, target) {
  let best = null, bestD = Infinity;
  for (const d of dirs) {
    const next = step(g, d);
    const dist = manhattan(next, target);
    if (dist < bestD) { bestD = dist; best = d; }
  }
  return best || dirs[0];
}
function moveTowardTarget(g, target, opts = {}) {
  const dirs = availableDirs(g, opts.reverseOk);
  if (dirs.length === 0) return;
  g.dir = pickChase(g, dirs, target);
  const next = step(g, g.dir);
  g.row = next.row;
  g.col = next.col;
}

function isPowerActive() {
  return Date.now() < powerUntil;
}

// ---------- Collisions ----------
function handleCollisions() {
  for (const g of ghosts) {
    if (g.row === pacman.row && g.col === pacman.col) {
      if (g.eaten) continue;
      if (isPowerActive()) {
        // Pac-Man eats ghost
        ghostsEatenThisPower++;
        const points = SCORE_GHOST_BASE * Math.pow(2, ghostsEatenThisPower - 1); // 200, 400, 800, 1600
        score += points;
        g.eaten = true;
        playEatGhostSound();
      } else {
        // Pac-Man dies
        playerDies();
        return true;
      }
    }
  }
  return false;
}

function playerDies() {
  gameState = STATE_DYING;
  stopTick();
  playDeathSound();
  lives--;
  updateLivesDisplay();
  setTimeout(() => {
    if (lives <= 0) {
      gameOver();
    } else {
      // Reset positions, keep dots
      placePacman();
      makeGhosts();
      powerUntil = 0;
      gameState = STATE_PLAYING;
      paint();
      restartTick();
    }
  }, DEATH_PAUSE_MS);
}

// ---------- Game over / win ----------
function gameOver() {
  gameState = STATE_OVER;
  stopTick();
  playGameOverSound();
  const beat = score > highScore;
  if (beat) {
    highScore = score;
    localStorage.setItem('pacmanHighScore', String(highScore));
  }
  showEndModal('over', score, highScore, beat);
}

function levelClear() {
  gameState = STATE_WIN;
  stopTick();
  playWinSound();
  const beat = score > highScore;
  if (beat) {
    highScore = score;
    localStorage.setItem('pacmanHighScore', String(highScore));
  }
  setTimeout(() => showEndModal('win', score, highScore, beat), 600);
}

function showEndModal(type, finalScore, hi, isNew) {
  const modal = document.getElementById('pacman-end-modal');
  if (!modal) return;
  const t = (window.pacmanLang) || {};
  document.getElementById('pacman-end-title').textContent =
    type === 'win' ? (t.win || 'Level Cleared!') : (t.gameOver || 'Game Over');
  document.getElementById('pacman-final-score').textContent = finalScore;
  document.getElementById('pacman-final-hi').textContent = hi;
  const newTag = document.getElementById('pacman-new-record');
  if (newTag) newTag.style.display = isNew ? '' : 'none';
  const nextBtn = document.getElementById('pacman-next-btn');
  if (nextBtn) nextBtn.style.display = type === 'win' ? '' : 'none';
  const replayBtn = document.getElementById('pacman-replay-btn');
  if (replayBtn) replayBtn.style.display = type === 'over' ? '' : 'none';
  modal.style.display = 'flex';
  updateHighScoreDisplay();
}
function hideEndModal() {
  const modal = document.getElementById('pacman-end-modal');
  if (modal) modal.style.display = 'none';
}

// ---------- UI helpers ----------
function updateLivesDisplay() {
  const el = document.getElementById('pacman-lives');
  if (!el) return;
  el.textContent = '❤️'.repeat(Math.max(0, lives));
}
function updateHighScoreDisplay() {
  const el = document.getElementById('pacman-highscore');
  if (el) el.textContent = highScore;
}

// ---------- Pause ----------
function togglePause() {
  if (gameState === STATE_OVER || gameState === STATE_READY || gameState === STATE_WIN) return;
  if (gameState === STATE_PLAYING) {
    gameState = STATE_PAUSED;
    stopTick();
  } else if (gameState === STATE_PAUSED) {
    gameState = STATE_PLAYING;
    restartTick();
  }
  const overlay = document.getElementById('pacman-pause-overlay');
  if (overlay) overlay.style.display = gameState === STATE_PAUSED ? 'flex' : 'none';
  const btn = document.getElementById('pacman-pause-btn');
  if (btn) btn.textContent = gameState === STATE_PAUSED ? '▶' : '⏸';
}
window.pacmanTogglePause = togglePause;

// ---------- Lifecycle ----------
function restartTick() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = setInterval(tick, TICK_MS);
}
function stopTick() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = null;
}

function startNewGame() {
  hideEndModal();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  score = 0;
  lives = STARTING_LIVES;
  level = 1;
  powerUntil = 0;
  parseMaze();
  placePacman();
  makeGhosts();
  document.getElementById('pacman-score').textContent = '0';
  updateLivesDisplay();
  updateHighScoreDisplay();
  gameState = STATE_PLAYING;
  paint();
  restartTick();
}
window.pacmanStartNewGame = startNewGame;

function nextLevel() {
  hideEndModal();
  level++;
  powerUntil = 0;
  parseMaze();
  placePacman();
  makeGhosts();
  gameState = STATE_PLAYING;
  paint();
  restartTick();
}
window.pacmanNextLevel = nextLevel;

// ---------- Input: keyboard ----------
document.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
  if (['ArrowUp', 'w', 'W'].includes(e.key)) setPacmanDirection('up');
  else if (['ArrowDown', 's', 'S'].includes(e.key)) setPacmanDirection('down');
  else if (['ArrowLeft', 'a', 'A'].includes(e.key)) setPacmanDirection('left');
  else if (['ArrowRight', 'd', 'D'].includes(e.key)) setPacmanDirection('right');
});

// ---------- Input: swipe ----------
function attachSwipe() {
  const board = document.getElementById('pacman-board');
  if (!board) return;
  let startX = 0, startY = 0, active = false;
  const SWIPE_THRESHOLD = 18;

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
    if (Math.abs(dx) > Math.abs(dy)) setPacmanDirection(dx > 0 ? 'right' : 'left');
    else setPacmanDirection(dy > 0 ? 'down' : 'up');
    startX = t.clientX; startY = t.clientY;
    e.preventDefault();
  }, { passive: false });

  board.addEventListener('touchend', () => { active = false; });
  board.addEventListener('touchcancel', () => { active = false; });
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  parseMaze();
  buildBoard();
  placePacman();
  makeGhosts();
  paint();
  updateLivesDisplay();
  updateHighScoreDisplay();

  const muteBtn = document.getElementById('pacman-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  const pauseBtn = document.getElementById('pacman-pause-btn');
  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
  const resumeBtn = document.getElementById('pacman-resume-btn');
  if (resumeBtn) resumeBtn.addEventListener('click', togglePause);
  const startBtn = document.getElementById('start-pacman-btn');
  if (startBtn) startBtn.addEventListener('click', startNewGame);
  const replayBtn = document.getElementById('pacman-replay-btn');
  if (replayBtn) replayBtn.addEventListener('click', startNewGame);
  const nextBtn = document.getElementById('pacman-next-btn');
  if (nextBtn) nextBtn.addEventListener('click', nextLevel);

  attachSwipe();
});
