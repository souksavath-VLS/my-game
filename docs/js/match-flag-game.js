// Match Flag Game — kids-friendly, mobile-first. Tap-to-pair (no drag).
// Country data lives in country-list.js as window.COUNTRIES.

// ---------- Settings ----------
const DIFFICULTY = { easy: 3, medium: 5, hard: 8 };
let pairCount = DIFFICULTY.medium;
let difficultyKey = localStorage.getItem('matchFlagDiff') || 'medium';
if (!DIFFICULTY[difficultyKey]) difficultyKey = 'medium';
pairCount = DIFFICULTY[difficultyKey];

// ---------- State ----------
let lang = 'en';
let countriesThisRound = [];
let selectedFlag = null; // DOM element
let selectedName = null; // DOM element
let matchedCount = 0;
let wrongCount = 0;
let startTime = 0;
let timerHandle = null;
let bestStats = JSON.parse(localStorage.getItem('matchFlagBest') || '{}'); // { easy: {time,wrong}, ... }
let roundActive = false;

// ---------- Audio ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.4;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('matchFlagMuted') === '1';
function applyMute() { masterGain.gain.value = muted ? 0 : 0.4; }
applyMute();
function toggleMute() {
  muted = !muted;
  localStorage.setItem('matchFlagMuted', muted ? '1' : '0');
  applyMute();
  const btn = document.getElementById('mf-mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}
window.matchFlagToggleMute = toggleMute;

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

// ---------- Language ----------
function getLang() {
  let l = localStorage.getItem('lang') || 'en';
  if (!['th', 'en', 'lao'].includes(l)) l = 'en';
  return l;
}
function countryName(c) {
  if (lang === 'th') return c.name_th || c.name_en;
  if (lang === 'lao') return c.name_la || c.name_en; // fallback — country-list has no Lao
  return c.name_en;
}

// ---------- Helpers ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickRandomCountries(n) {
  return shuffle(window.COUNTRIES).slice(0, n);
}
function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ---------- Render ----------
function renderRound() {
  lang = getLang();
  matchedCount = 0;
  wrongCount = 0;
  selectedFlag = null;
  selectedName = null;
  roundActive = true;

  countriesThisRound = pickRandomCountries(pairCount);

  const flagRow = document.getElementById('mf-flag-row');
  const nameRow = document.getElementById('mf-name-row');
  flagRow.innerHTML = '';
  nameRow.innerHTML = '';

  // Flag tiles (in their picked order)
  countriesThisRound.forEach((c, i) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'mf-flag-tile';
    tile.dataset.key = c.name_en;
    const img = document.createElement('img');
    img.src = c.flag;
    img.alt = '';
    img.loading = 'lazy';
    tile.appendChild(img);
    tile.addEventListener('click', () => onFlagTap(tile, c));
    flagRow.appendChild(tile);
  });

  // Name buttons (shuffled order)
  const names = shuffle(countriesThisRound);
  names.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mf-name-btn';
    btn.dataset.key = c.name_en;
    btn.textContent = countryName(c);
    btn.addEventListener('click', () => onNameTap(btn, c));
    nameRow.appendChild(btn);
  });

  startTimer();
  updateStats();
  updateBestDisplay();
}

// ---------- Selection / matching ----------
function clearSelection(el) {
  if (el) el.classList.remove('selected');
}

function onFlagTap(tile, country) {
  if (!roundActive || tile.classList.contains('matched')) return;
  if (selectedName) {
    // Try match
    checkMatch(tile, country, selectedName);
    return;
  }
  // Toggle flag selection
  if (selectedFlag === tile) {
    clearSelection(tile);
    selectedFlag = null;
  } else {
    clearSelection(selectedFlag);
    selectedFlag = tile;
    tile.classList.add('selected');
    sndSelect();
  }
}

function onNameTap(btn, country) {
  if (!roundActive || btn.classList.contains('matched')) return;
  if (selectedFlag) {
    checkMatch(selectedFlag, getCountryByKey(selectedFlag.dataset.key), btn);
    return;
  }
  // Toggle name selection
  if (selectedName === btn) {
    clearSelection(btn);
    selectedName = null;
  } else {
    clearSelection(selectedName);
    selectedName = btn;
    btn.classList.add('selected');
    sndSelect();
  }
}

function getCountryByKey(key) {
  return countriesThisRound.find(c => c.name_en === key);
}

function checkMatch(flagTile, flagCountry, nameBtn) {
  const correct = flagTile.dataset.key === nameBtn.dataset.key;
  if (correct) {
    flagTile.classList.add('matched');
    flagTile.classList.remove('selected');
    nameBtn.classList.add('matched');
    nameBtn.classList.remove('selected');
    nameBtn.disabled = true;
    flagTile.disabled = true;
    matchedCount++;
    sndCorrect();
  } else {
    flagTile.classList.add('wrong');
    nameBtn.classList.add('wrong');
    wrongCount++;
    sndWrong();
    setTimeout(() => {
      flagTile.classList.remove('wrong', 'selected');
      nameBtn.classList.remove('wrong', 'selected');
    }, 600);
  }
  selectedFlag = null;
  selectedName = null;
  updateStats();
  if (matchedCount >= pairCount) finishRound();
}

// ---------- Round end ----------
function finishRound() {
  roundActive = false;
  stopTimer();
  sndComplete();
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const prev = bestStats[difficultyKey];
  const beat = !prev || wrongCount < prev.wrong || (wrongCount === prev.wrong && elapsed < prev.time);
  if (beat) {
    bestStats[difficultyKey] = { time: elapsed, wrong: wrongCount };
    localStorage.setItem('matchFlagBest', JSON.stringify(bestStats));
  }
  showResultModal(elapsed, beat);
  updateBestDisplay();
}

function showResultModal(elapsedSec, beat) {
  const modal = document.getElementById('mf-result-modal');
  if (!modal) return;
  document.getElementById('mf-result-time').textContent = formatTime(elapsedSec);
  document.getElementById('mf-result-wrong').textContent = wrongCount;
  const newTag = document.getElementById('mf-new-record');
  if (newTag) newTag.style.display = beat ? '' : 'none';
  modal.style.display = 'flex';
}
function hideResultModal() {
  const modal = document.getElementById('mf-result-modal');
  if (modal) modal.style.display = 'none';
}

// ---------- Stats UI ----------
function updateStats() {
  document.getElementById('mf-wrong').textContent = wrongCount;
  document.getElementById('mf-progress').textContent = `${matchedCount} / ${pairCount}`;
}
function updateBestDisplay() {
  const el = document.getElementById('mf-best');
  if (!el) return;
  const b = bestStats[difficultyKey];
  el.textContent = b ? `${formatTime(b.time)} · ✗${b.wrong}` : '—';
}

function startTimer() {
  startTime = Date.now();
  stopTimer();
  const update = () => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const el = document.getElementById('mf-time');
    if (el) el.textContent = formatTime(sec);
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
  if (!DIFFICULTY[key]) return;
  difficultyKey = key;
  pairCount = DIFFICULTY[key];
  localStorage.setItem('matchFlagDiff', key);
  updateDifficultyButtons();
  hideResultModal();
  renderRound();
}
window.matchFlagSetDifficulty = setDifficulty;

function updateDifficultyButtons() {
  for (const k of Object.keys(DIFFICULTY)) {
    const btn = document.getElementById('mf-diff-' + k);
    if (btn) btn.classList.toggle('active', k === difficultyKey);
  }
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  lang = getLang();

  const muteBtn = document.getElementById('mf-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  const newGameBtn = document.getElementById('mf-newgame-btn');
  if (newGameBtn) newGameBtn.addEventListener('click', renderRound);
  const replayBtn = document.getElementById('mf-replay-btn');
  if (replayBtn) replayBtn.addEventListener('click', () => { hideResultModal(); renderRound(); });

  for (const k of Object.keys(DIFFICULTY)) {
    const btn = document.getElementById('mf-diff-' + k);
    if (btn) btn.addEventListener('click', () => setDifficulty(k));
  }
  updateDifficultyButtons();

  renderRound();
});
