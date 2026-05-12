// FPS Balloon Shooter Game — kids-friendly, mobile-first

const canvas = document.getElementById('fps-game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('fps-score');
const timerEl = document.getElementById('fps-timer');
const highScoreEl = document.getElementById('fps-highscore');
const comboEl = document.getElementById('fps-combo');

// ---------- State machine ----------
const STATE_MENU = 'menu';
const STATE_PLAYING = 'playing';
const STATE_GAMEOVER = 'gameover';
let gameState = STATE_MENU;

// ---------- Tunables ----------
const ROUND_SECONDS = 60;
const COMBO_WINDOW_MS = 2000;
const TARGET_BALLOON_COUNT = 8;

// ---------- Game state ----------
let score = 0;
let highScore = parseInt(localStorage.getItem('fpsHighScore') || '0', 10);
let balloons = [];
let particles = [];
let popups = [];
let crosshair = { x: 0, y: 0 };
let bombFlashPhase = 0;
let comboCount = 0;
let lastHitTime = 0;
let roundStartTime = 0;
let lastFrameTime = 0;

// ---------- Audio (one shared context — fixes leak) ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.4;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('fpsMuted') === '1';
applyMute();

function applyMute() {
  masterGain.gain.value = muted ? 0 : 0.4;
}
function toggleMute() {
  muted = !muted;
  localStorage.setItem('fpsMuted', muted ? '1' : '0');
  applyMute();
  const btn = document.getElementById('fps-mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}
window.fpsToggleMute = toggleMute;

function resumeAudio() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function beep({ type = 'square', freq = 600, freqEnd = null, duration = 0.15, gain = 0.3 }) {
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (freqEnd !== null) {
    o.frequency.linearRampToValueAtTime(freqEnd, audioCtx.currentTime + duration);
  }
  g.gain.setValueAtTime(gain, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
  o.connect(g);
  g.connect(masterGain);
  o.start();
  o.stop(audioCtx.currentTime + duration);
}

function playShootSound()    { beep({ type: 'square',   freq: 800,  freqEnd: 400, duration: 0.10, gain: 0.25 }); }
function playGoldSound()     { beep({ type: 'triangle', freq: 900,  freqEnd: 1500, duration: 0.25, gain: 0.4 }); }
function playExplosionSound(){ beep({ type: 'sawtooth', freq: 180,  freqEnd: 40,  duration: 0.35, gain: 0.5 }); }
function playComboSound(level) {
  const base = 600 + level * 150;
  beep({ type: 'triangle', freq: base, freqEnd: base + 400, duration: 0.15, gain: 0.3 });
}
function playRoundEndSound() {
  beep({ type: 'triangle', freq: 523, duration: 0.15, gain: 0.4 });
  setTimeout(() => beep({ type: 'triangle', freq: 659, duration: 0.15, gain: 0.4 }), 150);
  setTimeout(() => beep({ type: 'triangle', freq: 784, duration: 0.3,  gain: 0.4 }), 300);
}

// ---------- Canvas sizing ----------
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ---------- Difficulty (0..1 over the round) ----------
function getDifficulty() {
  if (gameState !== STATE_PLAYING) return 0;
  const elapsed = (Date.now() - roundStartTime) / 1000;
  return Math.min(1, elapsed / ROUND_SECONDS);
}

// ---------- Balloons ----------
function spawnBalloon() {
  const diff = getDifficulty();
  const bombChance = 0.10 + diff * 0.15;   // 10% → 25%
  const goldChance = 0.05;                  // always 5%
  const baseSpeed = 0.6 + diff * 1.8;       // gets faster

  const r = Math.random();
  let type = 'normal';
  if (r < goldChance) type = 'gold';
  else if (r < goldChance + bombChance) type = 'bomb';

  const radius = type === 'bomb' ? 42 : (type === 'gold' ? 38 : 36 + Math.random() * 18);
  balloons.push({
    x: Math.random() * (canvas.width - radius * 2) + radius,
    y: canvas.height + radius,
    radius,
    color: type === 'normal' ? `hsl(${Math.random() * 360},85%,60%)` : null,
    speed: baseSpeed + Math.random() * 0.8,
    sway: (Math.random() - 0.5) * 0.4,
    type
  });
}

function refillBalloons() {
  while (balloons.length < TARGET_BALLOON_COUNT) spawnBalloon();
}

function moveBalloons() {
  balloons.forEach(b => {
    b.y -= b.speed;
    b.x += b.sway;
    if (b.x < b.radius || b.x > canvas.width - b.radius) b.sway *= -1;
  });
  balloons = balloons.filter(b => b.y + b.radius > 0);
  if (gameState === STATE_PLAYING) refillBalloons();
}

function drawBalloon(b) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);

  if (b.type === 'bomb') {
    const flashOn = bombFlashPhase < 30;
    ctx.fillStyle = flashOn ? '#ff2222' : '#ffffff';
    ctx.shadowColor = '#ff2222';
    ctx.shadowBlur = 24;
  } else if (b.type === 'gold') {
    const grad = ctx.createRadialGradient(b.x - b.radius * 0.3, b.y - b.radius * 0.3, 2, b.x, b.y, b.radius);
    grad.addColorStop(0, '#fff8a0');
    grad.addColorStop(0.5, '#ffd700');
    grad.addColorStop(1, '#b8860b');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 22;
  } else {
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 14;
  }
  ctx.fill();
  // String
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y + b.radius);
  ctx.quadraticCurveTo(b.x + 5, b.y + b.radius + 20, b.x, b.y + b.radius + 35);
  ctx.stroke();
  ctx.restore();

  if (b.type === 'bomb') {
    ctx.save();
    ctx.font = `${Math.floor(b.radius * 1.0)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', b.x, b.y);
    ctx.restore();
  } else if (b.type === 'gold') {
    ctx.save();
    ctx.font = `${Math.floor(b.radius * 0.9)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', b.x, b.y);
    ctx.restore();
  }
}

function drawBalloons() {
  balloons.forEach(drawBalloon);
}

// ---------- Particles & popups ----------
function spawnPopParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const speed = 3 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color
    });
  }
}

function updateParticles(dt) {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15; // gravity
    p.life -= dt * 1.5;
  });
  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function spawnPopup(x, y, text, color) {
  popups.push({ x, y, text, color, life: 1, vy: -1.5 });
}

function updatePopups(dt) {
  popups.forEach(p => {
    p.y += p.vy;
    p.life -= dt * 0.8;
  });
  popups = popups.filter(p => p.life > 0);
}

function drawPopups() {
  popups.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.font = 'bold 28px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  });
}

// ---------- Crosshair ----------
function drawCrosshair() {
  if (gameState !== STATE_PLAYING) return;
  ctx.save();
  ctx.strokeStyle = '#fff700';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(crosshair.x - 20, crosshair.y);
  ctx.lineTo(crosshair.x - 6, crosshair.y);
  ctx.moveTo(crosshair.x + 6, crosshair.y);
  ctx.lineTo(crosshair.x + 20, crosshair.y);
  ctx.moveTo(crosshair.x, crosshair.y - 20);
  ctx.lineTo(crosshair.x, crosshair.y - 6);
  ctx.moveTo(crosshair.x, crosshair.y + 6);
  ctx.lineTo(crosshair.x, crosshair.y + 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(crosshair.x, crosshair.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#fff700';
  ctx.fill();
  ctx.restore();
}

// ---------- Shooting ----------
function shoot(x, y) {
  if (gameState !== STATE_PLAYING) return;
  resumeAudio();

  // Iterate from front (last drawn) for visual correctness
  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];
    if (Math.hypot(b.x - x, b.y - y) < b.radius) {
      handleHit(b, i);
      return;
    }
  }
  // Missed — break combo
  comboCount = 0;
  updateComboDisplay();
}

function handleHit(b, i) {
  const now = Date.now();
  if (b.type === 'bomb') {
    playExplosionSound();
    spawnPopParticles(b.x, b.y, '#ff4444');
    spawnPopup(b.x, b.y, '-20', '#ff4444');
    score = Math.max(0, score - 20);
    comboCount = 0;
    balloons.splice(i, 1);
    scoreEl.textContent = score;
    updateComboDisplay();
    return;
  }

  // Combo: increment if hit within window
  if (now - lastHitTime <= COMBO_WINDOW_MS) {
    comboCount++;
  } else {
    comboCount = 1;
  }
  lastHitTime = now;
  const multiplier = comboCount >= 10 ? 5 : comboCount >= 5 ? 3 : comboCount >= 3 ? 2 : 1;

  let base = b.type === 'gold' ? 50 : 10;
  const gained = base * multiplier;
  score += gained;
  scoreEl.textContent = score;

  if (b.type === 'gold') {
    playGoldSound();
    spawnPopParticles(b.x, b.y, '#ffd700');
  } else {
    playShootSound();
    spawnPopParticles(b.x, b.y, b.color);
  }
  if (multiplier > 1) playComboSound(multiplier);

  const popupText = multiplier > 1 ? `+${gained}  x${multiplier}` : `+${gained}`;
  const popupColor = b.type === 'gold' ? '#ffd700' : (multiplier > 1 ? '#00ff99' : '#ffffff');
  spawnPopup(b.x, b.y, popupText, popupColor);

  balloons.splice(i, 1);
  updateComboDisplay();
}

function updateComboDisplay() {
  if (!comboEl) return;
  if (comboCount >= 2) {
    comboEl.style.visibility = 'visible';
    comboEl.textContent = `Combo x${comboCount}`;
  } else {
    comboEl.style.visibility = 'hidden';
  }
}

// ---------- Round timer ----------
function updateTimer() {
  if (gameState !== STATE_PLAYING) return;
  const elapsed = (Date.now() - roundStartTime) / 1000;
  const remaining = Math.max(0, ROUND_SECONDS - elapsed);
  const min = String(Math.floor(remaining / 60)).padStart(2, '0');
  const sec = String(Math.floor(remaining % 60)).padStart(2, '0');
  timerEl.textContent = `${min}:${sec}`;
  if (remaining <= 0) endRound();
}

function endRound() {
  gameState = STATE_GAMEOVER;
  playRoundEndSound();
  const beatHighScore = score > highScore;
  if (beatHighScore) {
    highScore = score;
    localStorage.setItem('fpsHighScore', String(highScore));
  }
  // Save run stats (kept for compatibility)
  try {
    const stats = JSON.parse(localStorage.getItem('fpsGameStats') || '[]');
    stats.push({ score, time: ROUND_SECONDS, date: new Date().toISOString() });
    localStorage.setItem('fpsGameStats', JSON.stringify(stats));
  } catch (e) {}
  showGameOver(score, highScore, beatHighScore);
}

// ---------- UI overlays ----------
function showGameOver(finalScore, hi, isNew) {
  const t = (window.fpsLang) || {};
  const modal = document.getElementById('fps-gameover-modal');
  if (!modal) return;
  document.getElementById('fps-final-score').textContent = finalScore;
  document.getElementById('fps-final-highscore').textContent = hi;
  const newTag = document.getElementById('fps-new-record');
  if (newTag) newTag.style.display = isNew ? '' : 'none';
  document.getElementById('fps-gameover-title').textContent = t.timeUp || "Time's Up!";
  modal.style.display = 'flex';
  updateHighScoreDisplay();
}

function hideGameOver() {
  const modal = document.getElementById('fps-gameover-modal');
  if (modal) modal.style.display = 'none';
}

function showMenu() {
  gameState = STATE_MENU;
  document.getElementById('fps-menu-overlay').style.display = 'flex';
  updateHighScoreDisplay();
}

function hideMenu() {
  document.getElementById('fps-menu-overlay').style.display = 'none';
}

function updateHighScoreDisplay() {
  if (highScoreEl) highScoreEl.textContent = highScore;
  const menuHi = document.getElementById('fps-menu-highscore');
  if (menuHi) menuHi.textContent = highScore;
}

// ---------- Round lifecycle ----------
function startRound() {
  resumeAudio();
  hideMenu();
  hideGameOver();
  score = 0;
  comboCount = 0;
  lastHitTime = 0;
  balloons = [];
  particles = [];
  popups = [];
  scoreEl.textContent = '0';
  updateComboDisplay();
  refillBalloons();
  roundStartTime = Date.now();
  gameState = STATE_PLAYING;
  lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);
}
window.fpsStartRound = startRound;

// ---------- Game loop ----------
function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  bombFlashPhase = (bombFlashPhase + 1) % 60; // once per frame, not per bomb

  if (gameState === STATE_PLAYING) {
    moveBalloons();
    updateTimer();
  } else {
    // Let balloons drift in the background of menu/game-over
    balloons.forEach(b => { b.y -= b.speed * 0.3; });
    balloons = balloons.filter(b => b.y + b.radius > 0);
    if (balloons.length < 5 && Math.random() < 0.02) spawnBalloon();
  }

  updateParticles(dt);
  updatePopups(dt);

  drawBalloons();
  drawParticles();
  drawPopups();
  drawCrosshair();

  requestAnimationFrame(gameLoop);
}

// ---------- Input ----------
canvas.addEventListener('mousemove', e => {
  crosshair.x = e.clientX;
  crosshair.y = e.clientY;
});
canvas.addEventListener('mousedown', e => {
  shoot(e.clientX, e.clientY);
});
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) return;
  crosshair.x = touch.clientX;
  crosshair.y = touch.clientY;
}, { passive: false });
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) return;
  crosshair.x = touch.clientX;
  crosshair.y = touch.clientY;
  shoot(touch.clientX, touch.clientY);
}, { passive: false });

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('fps-start-btn');
  const playAgainBtn = document.getElementById('fps-playagain-btn');
  const menuBtn = document.getElementById('fps-menu-btn');
  const muteBtn = document.getElementById('fps-mute-btn');
  if (startBtn) startBtn.addEventListener('click', startRound);
  if (playAgainBtn) playAgainBtn.addEventListener('click', startRound);
  if (menuBtn) menuBtn.addEventListener('click', () => { hideGameOver(); showMenu(); });
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  updateHighScoreDisplay();
  refillBalloons(); // pretty background while in menu
  lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);
});
