// FPS Balloon Shooter Game
// Responsive for mobile and web

const canvas = document.getElementById('fps-game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('fps-score');
const timerEl = document.getElementById('fps-timer');

let score = 0;
let startTime = null;
let timerInterval = null;
let balloons = [];
let crosshair = { x: 0, y: 0 };
let gameRunning = false;
let bombFlashPhase = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function startGame() {
  score = 0;
  balloons = [];
  gameRunning = true;
  startTime = Date.now();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
  spawnBalloons();
  requestAnimationFrame(gameLoop);
}

function updateTimer() {
  if (!startTime) return;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const sec = String(elapsed % 60).padStart(2, '0');
  timerEl.innerText = `${min}:${sec}`;
}

function spawnBalloons() {
  let bombCount = 0;
  for (let i = 0; i < 10; i++) {
    // Add up to 2 bomb balloons randomly
    if (bombCount < 2 && Math.random() < 0.5) {
      balloons.push({
        x: Math.random() * canvas.width,
        y: canvas.height - 100 - Math.random() * 200,
        radius: 45,
        color: '#fff',
        speed: 2,
        bomb: true
      });
      bombCount++;
    } else {
      balloons.push({
        x: Math.random() * canvas.width,
        y: canvas.height - 100 - Math.random() * 200,
        radius: 40 + Math.random() * 20,
        color: `hsl(${Math.random() * 360},90%,60%)`,
        speed: 0.5 + Math.random() * 1.5, // Slower for kids
        bomb: false
      });
    }
  }
}

function drawCrosshair() {
  ctx.save();
  ctx.strokeStyle = '#fff700';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(crosshair.x - 20, crosshair.y);
  ctx.lineTo(crosshair.x + 20, crosshair.y);
  ctx.moveTo(crosshair.x, crosshair.y - 20);
  ctx.lineTo(crosshair.x, crosshair.y + 20);
  ctx.stroke();
  ctx.restore();
}

function drawBalloons() {
  balloons.forEach(b => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    if (b.bomb) {
      // Flashing effect
      bombFlashPhase = (bombFlashPhase + 1) % 60;
      ctx.fillStyle = bombFlashPhase < 30 ? '#ff0000' : '#fff';
      ctx.shadowColor = bombFlashPhase < 30 ? '#ff0000' : '#fff';
      ctx.shadowBlur = 24;
    } else {
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 16;
    }
    ctx.fill();
    ctx.restore();
    // Draw bomb icon
    if (b.bomb) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#222';
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.font = `${Math.floor(b.radius * 0.7)}px Arial`;
      ctx.fillStyle = bombFlashPhase < 30 ? '#fff' : '#ff0000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', b.x, b.y);
      ctx.restore();
    }
  });
}

function moveBalloons() {
  balloons.forEach(b => {
    b.y -= b.speed;
  });
  // Remove balloons that go off screen
  balloons = balloons.filter(b => b.y + b.radius > 0);
  // Spawn new balloons if needed
  if (balloons.length < 10) spawnBalloons();
}

function gameLoop() {
  if (!gameRunning) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  moveBalloons();
  drawBalloons();
  drawCrosshair();
  requestAnimationFrame(gameLoop);
}

function playShootSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 600;
    g.gain.value = 0.2;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    o.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

function playExplosionSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 120;
    g.gain.value = 0.5;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.25);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    o.stop(ctx.currentTime + 0.25);
  } catch (e) {}
}

function shoot(x, y) {
  if (!gameRunning) return;
  for (let i = 0; i < balloons.length; i++) {
    const b = balloons[i];
    const dist = Math.hypot(b.x - x, b.y - y);
    if (dist < b.radius) {
      if (b.bomb) {
        playExplosionSound();
        score -= 10;
        if (score < 0) score = 0;
        scoreEl.innerText = score;
        balloons.splice(i, 1);
        return;
      }
      playShootSound();
      balloons.splice(i, 1);
      score += 10;
      scoreEl.innerText = score;
      break;
    }
  }
}

function endGame(msg) {
  gameRunning = false;
  if (timerInterval) clearInterval(timerInterval);
  // Save stats to localStorage
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const stats = JSON.parse(localStorage.getItem('fpsGameStats') || '[]');
  stats.push({
    score,
    time: elapsed,
    date: new Date().toISOString()
  });
  localStorage.setItem('fpsGameStats', JSON.stringify(stats));
  setTimeout(() => {
    alert(msg);
    startGame();
  }, 100);
}

canvas.addEventListener('mousemove', e => {
  crosshair.x = e.clientX;
  crosshair.y = e.clientY;
});
canvas.addEventListener('mousedown', e => {
  shoot(e.clientX, e.clientY);
});

// Touch controls for mobile
canvas.addEventListener('touchmove', e => {
  const touch = e.touches[0];
  crosshair.x = touch.clientX;
  crosshair.y = touch.clientY;
});
canvas.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  shoot(touch.clientX, touch.clientY);
});

// Start game automatically
startGame();
