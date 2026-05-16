// Time Game — read an analog clock, kids-friendly, mobile-first.
// Show clock with random time; pick the correct digital time from 4 options.

// ---------- Settings ----------
const ROUNDS_PER_GAME = 10;
const OPTIONS_PER_ROUND = 4;
const DIFFICULTY_MINUTES = {
  easy:   [0],
  medium: [0, 15, 30, 45],
  hard:   [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
};

// ---------- State ----------
let lang = 'en';
let difficultyKey = localStorage.getItem('timeGameDiff') || 'easy';
if (!DIFFICULTY_MINUTES[difficultyKey]) difficultyKey = 'easy';
let roundIndex = 0;
let target = null;       // { hour, minute }
let options = [];
let answered = false;
let correctCount = 0;
let wrongCount = 0;
let startTime = 0;
let timerHandle = null;
let bestStats = JSON.parse(localStorage.getItem('timeGameBest') || '{}');

// ---------- Audio ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.4;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('timeGameMuted') === '1';
function applyMute() { masterGain.gain.value = muted ? 0 : 0.4; }
applyMute();
function toggleMute() {
  muted = !muted;
  localStorage.setItem('timeGameMuted', muted ? '1' : '0');
  applyMute();
  const btn = document.getElementById('tg-mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}
window.timeGameToggleMute = toggleMute;

function beep({ type = 'square', freq = 600, freqEnd = null, duration = 0.12, gain = 0.35 }) {
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
function sndTick()    { beep({ type: 'square',   freq: 1200, duration: 0.03, gain: 0.15 }); }
function sndCorrect() {
  beep({ type: 'triangle', freq: 700, freqEnd: 1000, duration: 0.10, gain: 0.35 });
  setTimeout(() => beep({ type: 'triangle', freq: 1000, freqEnd: 1400, duration: 0.15, gain: 0.35 }), 90);
}
function sndWrong()   { beep({ type: 'sawtooth', freq: 300, freqEnd: 150, duration: 0.18, gain: 0.35 }); }
function sndComplete() {
  [523, 659, 784, 1046].forEach((f, i) => {
    setTimeout(() => beep({ type: 'triangle', freq: f, duration: 0.18, gain: 0.4 }), i * 130);
  });
}

// ---------- Language ----------
function getLang() {
  let l = localStorage.getItem('lang') || 'en';
  if (!['th', 'en', 'lao'].includes(l)) l = 'en';
  return l;
}

// ---------- Time helpers ----------
function randomTime() {
  const hour = 1 + Math.floor(Math.random() * 12); // 1..12
  const minutesPool = DIFFICULTY_MINUTES[difficultyKey];
  const minute = minutesPool[Math.floor(Math.random() * minutesPool.length)];
  return { hour, minute };
}
function timeKey(t) { return `${t.hour}:${t.minute}`; }
function formatTime(t) {
  return `${t.hour}:${String(t.minute).padStart(2, '0')}`;
}
function timesEqual(a, b) { return a.hour === b.hour && a.minute === b.minute; }
function formatTimer(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ---------- Clock SVG ----------
function buildClockOnce() {
  const svg = document.getElementById('tg-clock');
  if (!svg) return;
  // Only build static elements once
  if (svg.dataset.built === '1') return;
  svg.dataset.built = '1';

  const ns = 'http://www.w3.org/2000/svg';

  // Face
  const face = document.createElementNS(ns, 'circle');
  face.setAttribute('cx', 50); face.setAttribute('cy', 50); face.setAttribute('r', 47);
  face.setAttribute('fill', 'url(#tg-face-gradient)');
  face.setAttribute('stroke', '#1f2937');
  face.setAttribute('stroke-width', '2.5');
  svg.appendChild(face);

  // Define gradient for the face
  const defs = document.createElementNS(ns, 'defs');
  defs.innerHTML = `
    <radialGradient id="tg-face-gradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff8e7"/>
      <stop offset="100%" stop-color="#fde68a"/>
    </radialGradient>`;
  svg.appendChild(defs);

  // Minute ticks
  for (let i = 0; i < 60; i++) {
    const angle = i * 6;
    const isHour = i % 5 === 0;
    const len = isHour ? 5 : 2;
    const x1 = 50 + 42 * Math.sin(angle * Math.PI / 180);
    const y1 = 50 - 42 * Math.cos(angle * Math.PI / 180);
    const x2 = 50 + (42 + len) * Math.sin(angle * Math.PI / 180);
    const y2 = 50 - (42 + len) * Math.cos(angle * Math.PI / 180);
    const tick = document.createElementNS(ns, 'line');
    tick.setAttribute('x1', x1); tick.setAttribute('y1', y1);
    tick.setAttribute('x2', x2); tick.setAttribute('y2', y2);
    tick.setAttribute('stroke', isHour ? '#1f2937' : '#94a3b8');
    tick.setAttribute('stroke-width', isHour ? '1.6' : '0.8');
    svg.appendChild(tick);
  }

  // Numbers 1-12
  for (let h = 1; h <= 12; h++) {
    const angle = h * 30;
    const x = 50 + 34 * Math.sin(angle * Math.PI / 180);
    const y = 50 - 34 * Math.cos(angle * Math.PI / 180);
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', x); text.setAttribute('y', y + 2.5);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '7');
    text.setAttribute('font-weight', '900');
    text.setAttribute('fill', '#7c3aed');
    text.setAttribute('font-family', "'Noto Sans Lao', 'Segoe UI', sans-serif");
    text.textContent = h;
    svg.appendChild(text);
  }

  // Hour hand (created last so it renders on top of static parts)
  const hourHand = document.createElementNS(ns, 'line');
  hourHand.setAttribute('id', 'tg-hour-hand');
  hourHand.setAttribute('x1', 50); hourHand.setAttribute('y1', 50);
  hourHand.setAttribute('x2', 50); hourHand.setAttribute('y2', 28);
  hourHand.setAttribute('stroke', '#1f2937');
  hourHand.setAttribute('stroke-width', '3.5');
  hourHand.setAttribute('stroke-linecap', 'round');
  svg.appendChild(hourHand);

  // Minute hand
  const minHand = document.createElementNS(ns, 'line');
  minHand.setAttribute('id', 'tg-min-hand');
  minHand.setAttribute('x1', 50); minHand.setAttribute('y1', 50);
  minHand.setAttribute('x2', 50); minHand.setAttribute('y2', 14);
  minHand.setAttribute('stroke', '#be185d');
  minHand.setAttribute('stroke-width', '2.2');
  minHand.setAttribute('stroke-linecap', 'round');
  svg.appendChild(minHand);

  // Center dot
  const center = document.createElementNS(ns, 'circle');
  center.setAttribute('cx', 50); center.setAttribute('cy', 50); center.setAttribute('r', 2.5);
  center.setAttribute('fill', '#1f2937');
  svg.appendChild(center);
}

function setClockTime(t) {
  const hourAngle = ((t.hour % 12) * 30) + (t.minute / 60) * 30;
  const minAngle = t.minute * 6;
  const hourHand = document.getElementById('tg-hour-hand');
  const minHand = document.getElementById('tg-min-hand');
  if (hourHand) hourHand.setAttribute('transform', `rotate(${hourAngle} 50 50)`);
  if (minHand) minHand.setAttribute('transform', `rotate(${minAngle} 50 50)`);
}

// ---------- Round logic ----------
function pickOptions(targetTime) {
  const opts = [targetTime];
  const seen = new Set([timeKey(targetTime)]);
  let safety = 0;
  while (opts.length < OPTIONS_PER_ROUND && safety < 50) {
    safety++;
    const t = randomTime();
    if (!seen.has(timeKey(t))) {
      seen.add(timeKey(t));
      opts.push(t);
    }
  }
  // Shuffle
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

function startRound() {
  answered = false;
  target = randomTime();
  options = pickOptions(target);
  setClockTime(target);
  sndTick();

  document.getElementById('tg-round').textContent = `${roundIndex + 1} / ${ROUNDS_PER_GAME}`;

  const grid = document.getElementById('tg-options');
  grid.innerHTML = '';
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tg-option';
    btn.textContent = formatTime(opt);
    btn.addEventListener('click', () => onOptionTap(btn, opt));
    grid.appendChild(btn);
  }
}

function onOptionTap(btn, picked) {
  if (answered) return;
  if (timesEqual(picked, target)) {
    answered = true;
    correctCount++;
    btn.classList.add('correct');
    sndCorrect();
    document.querySelectorAll('.tg-option').forEach(b => { if (b !== btn) b.classList.add('dim'); });
    updateStats();
    setTimeout(advanceRound, 1100);
  } else {
    wrongCount++;
    btn.classList.add('wrong');
    sndWrong();
    updateStats();
    setTimeout(() => btn.classList.remove('wrong'), 600);
  }
}

function advanceRound() {
  roundIndex++;
  if (roundIndex >= ROUNDS_PER_GAME) finishGame();
  else startRound();
}

function finishGame() {
  stopTimer();
  sndComplete();
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const prev = bestStats[difficultyKey];
  const beat = !prev || wrongCount < prev.wrong || (wrongCount === prev.wrong && elapsed < prev.time);
  if (beat) {
    bestStats[difficultyKey] = { time: elapsed, wrong: wrongCount };
    localStorage.setItem('timeGameBest', JSON.stringify(bestStats));
  }
  showResultModal(elapsed, beat);
  updateBestDisplay();
}

function showResultModal(elapsedSec, beat) {
  const modal = document.getElementById('tg-result-modal');
  if (!modal) return;
  document.getElementById('tg-result-correct').textContent = correctCount;
  document.getElementById('tg-result-wrong').textContent = wrongCount;
  document.getElementById('tg-result-time').textContent = formatTimer(elapsedSec);
  const newTag = document.getElementById('tg-new-record');
  if (newTag) newTag.style.display = beat ? '' : 'none';
  modal.style.display = 'flex';
}
function hideResultModal() {
  const modal = document.getElementById('tg-result-modal');
  if (modal) modal.style.display = 'none';
}

// ---------- UI helpers ----------
function updateStats() {
  document.getElementById('tg-correct').textContent = correctCount;
  document.getElementById('tg-wrong').textContent = wrongCount;
}
function updateBestDisplay() {
  const el = document.getElementById('tg-best');
  if (!el) return;
  const b = bestStats[difficultyKey];
  el.textContent = b ? `${formatTimer(b.time)} · ✗${b.wrong}` : '—';
}
function startTimer() {
  startTime = Date.now();
  stopTimer();
  const update = () => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const el = document.getElementById('tg-time');
    if (el) el.textContent = formatTimer(sec);
  };
  update();
  timerHandle = setInterval(update, 500);
}
function stopTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
}

// ---------- Difficulty ----------
function setDifficulty(key) {
  if (!DIFFICULTY_MINUTES[key]) return;
  difficultyKey = key;
  localStorage.setItem('timeGameDiff', key);
  updateDifficultyButtons();
  hideResultModal();
  startNewGame();
}
window.timeGameSetDifficulty = setDifficulty;
function updateDifficultyButtons() {
  for (const k of Object.keys(DIFFICULTY_MINUTES)) {
    const btn = document.getElementById('tg-diff-' + k);
    if (btn) btn.classList.toggle('active', k === difficultyKey);
  }
}

// ---------- Lifecycle ----------
function startNewGame() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  hideResultModal();
  lang = getLang();
  roundIndex = 0;
  correctCount = 0;
  wrongCount = 0;
  updateStats();
  updateBestDisplay();
  startTimer();
  startRound();
}
window.timeGameStartNewGame = startNewGame;

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  lang = getLang();
  buildClockOnce();

  const muteBtn = document.getElementById('tg-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  const newGameBtn = document.getElementById('tg-newgame-btn');
  if (newGameBtn) newGameBtn.addEventListener('click', startNewGame);
  const replayBtn = document.getElementById('tg-replay-btn');
  if (replayBtn) replayBtn.addEventListener('click', startNewGame);

  for (const k of Object.keys(DIFFICULTY_MINUTES)) {
    const btn = document.getElementById('tg-diff-' + k);
    if (btn) btn.addEventListener('click', () => setDifficulty(k));
  }
  updateDifficultyButtons();

  startNewGame();
});
