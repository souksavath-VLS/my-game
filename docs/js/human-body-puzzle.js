// Human Body Puzzle — tap-to-place, kids-friendly, mobile-first.
// Face mode (6 pieces) / Body mode (10 pieces). Slot positions on a silhouette.

// ---------- Body part definitions (label + emoji) ----------
const PARTS = {
  hair:   { emoji: '🦱', label: { th: 'ผม',     en: 'Hair',  lao: 'ຜົມ' } },
  eyes:   { emoji: '👀', label: { th: 'ตา',     en: 'Eyes',  lao: 'ຕາ' } },
  ear:    { emoji: '👂', label: { th: 'หู',     en: 'Ear',   lao: 'ຫູ' } },
  nose:   { emoji: '👃', label: { th: 'จมูก',  en: 'Nose',  lao: 'ດັງ' } },
  mouth:  { emoji: '👄', label: { th: 'ปาก',   en: 'Mouth', lao: 'ປາກ' } },
  brain:  { emoji: '🧠', label: { th: 'สมอง',  en: 'Brain', lao: 'ສະໝອງ' } },
  heart:  { emoji: '❤️', label: { th: 'หัวใจ', en: 'Heart', lao: 'ຫົວໃຈ' } },
  hand:   { emoji: '🤚', label: { th: 'มือ',    en: 'Hand',  lao: 'ມື' } },
  foot:   { emoji: '🦶', label: { th: 'เท้า',   en: 'Foot',  lao: 'ຕີນ' } }
};

// Face mode slots: positioned as %-coords on the face silhouette (.body-figure container)
const FACE_SLOTS = [
  { id: 'hair',  accept: 'hair',  x: 50, y: 6  },
  { id: 'ear-L', accept: 'ear',   x: 12, y: 32 },
  { id: 'eyes',  accept: 'eyes',  x: 50, y: 32 },
  { id: 'ear-R', accept: 'ear',   x: 88, y: 32 },
  { id: 'nose',  accept: 'nose',  x: 50, y: 50 },
  { id: 'mouth', accept: 'mouth', x: 50, y: 68 }
];
const FACE_PIECES = ['hair', 'eyes', 'ear', 'ear', 'nose', 'mouth'];

// Body mode: face slots + 4 body slots
const BODY_SLOTS = [
  { id: 'hair',  accept: 'hair',  x: 50, y: 4  },
  { id: 'brain', accept: 'brain', x: 50, y: 12 },
  { id: 'ear-L', accept: 'ear',   x: 23, y: 18 },
  { id: 'eyes',  accept: 'eyes',  x: 50, y: 18 },
  { id: 'ear-R', accept: 'ear',   x: 77, y: 18 },
  { id: 'nose',  accept: 'nose',  x: 50, y: 25 },
  { id: 'mouth', accept: 'mouth', x: 50, y: 30 },
  { id: 'heart', accept: 'heart', x: 50, y: 46 },
  { id: 'hand',  accept: 'hand',  x: 14, y: 55 },
  { id: 'foot',  accept: 'foot',  x: 50, y: 92 }
];
const BODY_PIECES = ['hair', 'brain', 'eyes', 'ear', 'ear', 'nose', 'mouth', 'heart', 'hand', 'foot'];

// ---------- State ----------
let lang = 'en';
let modeKey = localStorage.getItem('hbpMode') || 'face';
if (!['face', 'body'].includes(modeKey)) modeKey = 'face';
let slots = [];
let pieces = []; // [{ id, type }]
let selectedPieceId = null;
let matchedCount = 0;
let correctCount = 0;
let wrongCount = 0;
let startTime = 0;
let timerHandle = null;
let bestStats = JSON.parse(localStorage.getItem('hbpBest') || '{}');
let active = false;

// ---------- Audio ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.4;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('hbpMuted') === '1';
function applyMute() { masterGain.gain.value = muted ? 0 : 0.4; }
applyMute();
function toggleMute() {
  muted = !muted;
  localStorage.setItem('hbpMuted', muted ? '1' : '0');
  applyMute();
  const btn = document.getElementById('hbp-mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}
window.hbpToggleMute = toggleMute;

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
function sndSelect()  { beep({ type: 'triangle', freq: 600, duration: 0.04, gain: 0.18 }); }
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

// ---------- TTS ----------
function speak(text) {
  if (muted) return;
  if (!('speechSynthesis' in window)) return;
  try {
    const langMap = { th: 'th-TH', en: 'en-US', lao: 'lo-LA' };
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langMap[lang] || 'en-US';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// ---------- Language ----------
function getLang() {
  let l = localStorage.getItem('lang') || 'en';
  if (!['th', 'en', 'lao'].includes(l)) l = 'en';
  return l;
}

// ---------- Setup / Render ----------
function setupMode() {
  if (modeKey === 'face') {
    slots = FACE_SLOTS.map(s => ({ ...s, filled: false }));
    pieces = shuffle(FACE_PIECES.map((type, i) => ({ id: `${type}-${i}`, type })));
  } else {
    slots = BODY_SLOTS.map(s => ({ ...s, filled: false }));
    pieces = shuffle(BODY_PIECES.map((type, i) => ({ id: `${type}-${i}`, type })));
  }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderFigure() {
  const figure = document.getElementById('hbp-figure');
  figure.className = `hbp-figure ${modeKey}`;

  // Clear previous slot DOM (keep silhouette)
  Array.from(figure.querySelectorAll('.hbp-slot')).forEach(e => e.remove());

  for (const slot of slots) {
    const el = document.createElement('div');
    el.className = 'hbp-slot' + (slot.filled ? ' filled' : '');
    el.dataset.slot = slot.id;
    el.style.left = slot.x + '%';
    el.style.top  = slot.y + '%';
    if (slot.filled) {
      el.textContent = PARTS[slot.accept].emoji;
    }
    el.addEventListener('click', () => onSlotTap(slot, el));
    figure.appendChild(el);
  }
}

function renderPalette() {
  const palette = document.getElementById('hbp-palette');
  palette.innerHTML = '';
  for (const p of pieces) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'hbp-piece';
    el.dataset.id = p.id;
    el.dataset.type = p.type;
    el.textContent = PARTS[p.type].emoji;
    el.addEventListener('click', () => onPieceTap(p, el));
    palette.appendChild(el);
  }
}

// ---------- Selection / matching ----------
function clearSelection() {
  const cur = document.querySelector('.hbp-piece.selected');
  if (cur) cur.classList.remove('selected');
  selectedPieceId = null;
}

function onPieceTap(piece, el) {
  if (!active) return;
  if (selectedPieceId === piece.id) {
    clearSelection();
    return;
  }
  clearSelection();
  selectedPieceId = piece.id;
  el.classList.add('selected');
  sndSelect();
}

function onSlotTap(slot, slotEl) {
  if (!active || slot.filled) return;
  if (!selectedPieceId) return;
  const piece = pieces.find(p => p.id === selectedPieceId);
  if (!piece) return;
  if (piece.type === slot.accept) {
    // Match!
    slot.filled = true;
    slotEl.classList.add('filled', 'pop');
    slotEl.textContent = PARTS[piece.type].emoji;
    setTimeout(() => slotEl.classList.remove('pop'), 500);
    // Remove piece from palette
    pieces = pieces.filter(p => p.id !== piece.id);
    const pieceEl = document.querySelector(`.hbp-piece[data-id="${piece.id}"]`);
    if (pieceEl) pieceEl.remove();
    matchedCount++;
    correctCount++;
    sndCorrect();
    speak(PARTS[piece.type].label[lang]);
    clearSelection();
    updateStats();
    if (matchedCount >= slots.length) finishRound();
  } else {
    // Wrong
    wrongCount++;
    slotEl.classList.add('wrong');
    sndWrong();
    setTimeout(() => slotEl.classList.remove('wrong'), 600);
    updateStats();
  }
}

// ---------- Round end ----------
function finishRound() {
  active = false;
  stopTimer();
  sndComplete();
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const prev = bestStats[modeKey];
  const beat = !prev || wrongCount < prev.wrong || (wrongCount === prev.wrong && elapsed < prev.time);
  if (beat) {
    bestStats[modeKey] = { time: elapsed, wrong: wrongCount };
    localStorage.setItem('hbpBest', JSON.stringify(bestStats));
  }
  showResultModal(elapsed, beat);
  updateBestDisplay();
}

function showResultModal(elapsedSec, beat) {
  const modal = document.getElementById('hbp-result-modal');
  if (!modal) return;
  document.getElementById('hbp-result-time').textContent = formatTime(elapsedSec);
  document.getElementById('hbp-result-wrong').textContent = wrongCount;
  const newTag = document.getElementById('hbp-new-record');
  if (newTag) newTag.style.display = beat ? '' : 'none';
  modal.style.display = 'flex';
}
function hideResultModal() {
  const modal = document.getElementById('hbp-result-modal');
  if (modal) modal.style.display = 'none';
}

// ---------- UI helpers ----------
function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateStats() {
  document.getElementById('hbp-correct').textContent = correctCount;
  document.getElementById('hbp-wrong').textContent = wrongCount;
  document.getElementById('hbp-progress').textContent = `${matchedCount} / ${slots.length}`;
}

function updateBestDisplay() {
  const el = document.getElementById('hbp-best');
  if (!el) return;
  const b = bestStats[modeKey];
  el.textContent = b ? `${formatTime(b.time)} · ✗${b.wrong}` : '—';
}

function startTimer() {
  startTime = Date.now();
  stopTimer();
  const update = () => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const el = document.getElementById('hbp-time');
    if (el) el.textContent = formatTime(sec);
  };
  update();
  timerHandle = setInterval(update, 500);
}
function stopTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
}

// ---------- Mode switching ----------
function setMode(key) {
  if (!['face', 'body'].includes(key)) return;
  modeKey = key;
  localStorage.setItem('hbpMode', key);
  updateModeButtons();
  hideResultModal();
  startRound();
}
window.hbpSetMode = setMode;

function updateModeButtons() {
  for (const k of ['face', 'body']) {
    const btn = document.getElementById('hbp-mode-' + k);
    if (btn) btn.classList.toggle('active', k === modeKey);
  }
}

// ---------- Lifecycle ----------
function startRound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  hideResultModal();
  lang = getLang();
  matchedCount = 0;
  correctCount = 0;
  wrongCount = 0;
  selectedPieceId = null;
  setupMode();
  renderFigure();
  renderPalette();
  updateStats();
  updateBestDisplay();
  startTimer();
  active = true;
}
window.hbpStartRound = startRound;

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  lang = getLang();

  const muteBtn = document.getElementById('hbp-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  const newGameBtn = document.getElementById('hbp-newgame-btn');
  if (newGameBtn) newGameBtn.addEventListener('click', startRound);
  const replayBtn = document.getElementById('hbp-replay-btn');
  if (replayBtn) replayBtn.addEventListener('click', startRound);

  for (const k of ['face', 'body']) {
    const btn = document.getElementById('hbp-mode-' + k);
    if (btn) btn.addEventListener('click', () => setMode(k));
  }
  updateModeButtons();

  startRound();
});
