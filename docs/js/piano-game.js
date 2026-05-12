const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let activeOscillators = {};
// Master gain to prevent clipping when many notes play together (chords / glissando)
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.5;
masterGain.connect(audioCtx.destination);

// Resume audio context on first user interaction (browser policy)
document.body.addEventListener('touchstart', initAudio, { once: true });
document.body.addEventListener('mousedown', initAudio, { once: true });
document.body.addEventListener('keydown', initAudio, { once: true });

function initAudio() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playNote(freq, noteName) {
  initAudio();

  // If note is already playing, do nothing
  if (activeOscillators[noteName]) return;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  // Triangle sounds a bit like a toy piano/flute
  osc.type = 'triangle';
  osc.frequency.value = freq;

  // ADSR envelope with lower peak to avoid clipping on chords
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.03);
  gainNode.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.3);

  osc.connect(gainNode);
  gainNode.connect(masterGain);

  osc.start();

  activeOscillators[noteName] = { osc, gainNode };
}

function stopNote(noteName) {
  if (!activeOscillators[noteName]) return;
  
  const { osc, gainNode } = activeOscillators[noteName];
  
  // Release
  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  
  osc.stop(audioCtx.currentTime + 0.1);
  
  delete activeOscillators[noteName];
}

// Unified pointer handling at the keyboard level so we can support
// multi-touch (chords) and glissando (sliding across keys).
const keyboardEl = document.getElementById('keyboard');
const pointerToNote = new Map();   // pointerId -> currently held note
const noteRefCount = {};            // note -> number of pointers holding it

function keyElementFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  return el ? el.closest('.key') : null;
}

function pressNote(note, keyEl) {
  if (!note || !keyEl) return;
  noteRefCount[note] = (noteRefCount[note] || 0) + 1;
  if (noteRefCount[note] === 1) {
    const freq = parseFloat(keyEl.getAttribute('data-freq'));
    keyEl.classList.add('active');
    playNote(freq, note);
    if (typeof checkHit === 'function') checkHit(note);
  }
}

function releaseNote(note) {
  if (!note || !noteRefCount[note]) return;
  noteRefCount[note]--;
  if (noteRefCount[note] === 0) {
    const keyEl = document.querySelector(`.key[data-note="${note}"]`);
    if (keyEl) keyEl.classList.remove('active');
    stopNote(note);
  }
}

if (keyboardEl) {
  keyboardEl.addEventListener('pointerdown', (e) => {
    const keyEl = e.target.closest && e.target.closest('.key');
    if (!keyEl) return;
    e.preventDefault();
    // Don't capture the pointer — we want pointermove to keep hitting other keys
    // (so the user can slide their finger across the keyboard for a glissando).
    const note = keyEl.getAttribute('data-note');
    pointerToNote.set(e.pointerId, note);
    pressNote(note, keyEl);
  });

  keyboardEl.addEventListener('pointermove', (e) => {
    if (!pointerToNote.has(e.pointerId)) return;
    e.preventDefault();
    const keyEl = keyElementFromPoint(e.clientX, e.clientY);
    const newNote = keyEl ? keyEl.getAttribute('data-note') : null;
    const oldNote = pointerToNote.get(e.pointerId);
    if (newNote === oldNote) return;
    if (oldNote) releaseNote(oldNote);
    if (newNote) {
      pointerToNote.set(e.pointerId, newNote);
      pressNote(newNote, keyEl);
    } else {
      pointerToNote.delete(e.pointerId);
    }
  });

  const endPointer = (e) => {
    if (!pointerToNote.has(e.pointerId)) return;
    const note = pointerToNote.get(e.pointerId);
    pointerToNote.delete(e.pointerId);
    releaseNote(note);
  };
  keyboardEl.addEventListener('pointerup', endPointer);
  keyboardEl.addEventListener('pointercancel', endPointer);
  keyboardEl.addEventListener('pointerleave', endPointer);

  // Block native gestures (double-tap zoom, text selection) on the keyboard.
  keyboardEl.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  keyboardEl.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  keyboardEl.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Optional: Keyboard mapping
const keyMap = {
  'a': { note: 'C4', keyElement: document.querySelector('[data-note="C4"]') },
  'w': { note: 'C#4', keyElement: document.querySelector('[data-note="C#4"]') },
  's': { note: 'D4', keyElement: document.querySelector('[data-note="D4"]') },
  'e': { note: 'D#4', keyElement: document.querySelector('[data-note="D#4"]') },
  'd': { note: 'E4', keyElement: document.querySelector('[data-note="E4"]') },
  'f': { note: 'F4', keyElement: document.querySelector('[data-note="F4"]') },
  't': { note: 'F#4', keyElement: document.querySelector('[data-note="F#4"]') },
  'g': { note: 'G4', keyElement: document.querySelector('[data-note="G4"]') },
  'y': { note: 'G#4', keyElement: document.querySelector('[data-note="G#4"]') },
  'h': { note: 'A4', keyElement: document.querySelector('[data-note="A4"]') },
  'u': { note: 'A#4', keyElement: document.querySelector('[data-note="A#4"]') },
  'j': { note: 'B4', keyElement: document.querySelector('[data-note="B4"]') },
  'k': { note: 'C5', keyElement: document.querySelector('[data-note="C5"]') }
};

document.addEventListener('keydown', (e) => {
  if (e.repeat) return; // Ignore holding key down
  const mapping = keyMap[e.key.toLowerCase()];
  if (mapping) {
    pressNote(mapping.note, mapping.keyElement);
  }
});

document.addEventListener('keyup', (e) => {
  const mapping = keyMap[e.key.toLowerCase()];
  if (mapping) {
    releaseNote(mapping.note);
  }
});

// --- Rhythm Game Logic ---
const songs = {
  twinkle: [
    { note: 'C4', time: 1000 }, { note: 'C4', time: 1600 }, { note: 'G4', time: 2200 }, { note: 'G4', time: 2800 },
    { note: 'A4', time: 3400 }, { note: 'A4', time: 4000 }, { note: 'G4', time: 4600 },
    { note: 'F4', time: 5800 }, { note: 'F4', time: 6400 }, { note: 'E4', time: 7000 }, { note: 'E4', time: 7600 },
    { note: 'D4', time: 8200 }, { note: 'D4', time: 8800 }, { note: 'C4', time: 9400 }
  ],
  mary: [
    { note: 'E4', time: 1000 }, { note: 'D4', time: 1500 }, { note: 'C4', time: 2000 }, { note: 'D4', time: 2500 },
    { note: 'E4', time: 3000 }, { note: 'E4', time: 3500 }, { note: 'E4', time: 4000 },
    { note: 'D4', time: 5000 }, { note: 'D4', time: 5500 }, { note: 'D4', time: 6000 },
    { note: 'E4', time: 7000 }, { note: 'G4', time: 7500 }, { note: 'G4', time: 8000 }
  ],
  happy: [
    { note: 'C4', time: 1000 }, { note: 'C4', time: 1300 }, { note: 'D4', time: 1600 }, { note: 'C4', time: 2200 },
    { note: 'F4', time: 2800 }, { note: 'E4', time: 3400 },

    { note: 'C4', time: 4400 }, { note: 'C4', time: 4700 }, { note: 'D4', time: 5000 }, { note: 'C4', time: 5600 },
    { note: 'G4', time: 6200 }, { note: 'F4', time: 6800 },

    { note: 'C4', time: 7800 }, { note: 'C4', time: 8100 }, { note: 'C5', time: 8400 }, { note: 'A4', time: 9000 },
    { note: 'F4', time: 9600 }, { note: 'E4', time: 10200 }, { note: 'D4', time: 10800 },

    { note: 'A#4', time: 11800 }, { note: 'A#4', time: 12100 }, { note: 'A4', time: 12400 }, { note: 'F4', time: 13000 },
    { note: 'G4', time: 13600 }, { note: 'F4', time: 14200 }
  ],

  // Old MacDonald Had a Farm — verse
  oldmac: [
    { note: 'C4', time: 1000 }, { note: 'C4', time: 1600 }, { note: 'C4', time: 2200 }, { note: 'G4', time: 2800 },
    { note: 'A4', time: 3400 }, { note: 'A4', time: 4000 }, { note: 'G4', time: 4600 },
    { note: 'E4', time: 5800 }, { note: 'E4', time: 6400 }, { note: 'D4', time: 7000 }, { note: 'D4', time: 7600 }, { note: 'C4', time: 8200 }
  ],

  // Frère Jacques / Are You Sleeping
  frere: [
    { note: 'C4', time: 1000 }, { note: 'D4', time: 1500 }, { note: 'E4', time: 2000 }, { note: 'C4', time: 2500 },
    { note: 'C4', time: 3000 }, { note: 'D4', time: 3500 }, { note: 'E4', time: 4000 }, { note: 'C4', time: 4500 },
    { note: 'E4', time: 5000 }, { note: 'F4', time: 5500 }, { note: 'G4', time: 6000 },
    { note: 'E4', time: 7000 }, { note: 'F4', time: 7500 }, { note: 'G4', time: 8000 }
  ],

  // Row Row Row Your Boat
  row: [
    { note: 'C4', time: 1000 }, { note: 'C4', time: 2000 }, { note: 'C4', time: 3000 },
    { note: 'D4', time: 3500 }, { note: 'E4', time: 4000 },
    { note: 'E4', time: 5000 }, { note: 'D4', time: 5500 }, { note: 'E4', time: 6000 }, { note: 'F4', time: 6500 }, { note: 'G4', time: 7000 }
  ],

  // London Bridge Is Falling Down
  london: [
    { note: 'G4', time: 1000 }, { note: 'A4', time: 1500 }, { note: 'G4', time: 2000 }, { note: 'F4', time: 2500 },
    { note: 'E4', time: 3000 }, { note: 'F4', time: 3500 }, { note: 'G4', time: 4000 },
    { note: 'D4', time: 5000 }, { note: 'E4', time: 5500 }, { note: 'F4', time: 6000 },
    { note: 'E4', time: 7000 }, { note: 'F4', time: 7500 }, { note: 'G4', time: 8000 },
    { note: 'G4', time: 9000 }, { note: 'A4', time: 9500 }, { note: 'G4', time: 10000 }, { note: 'F4', time: 10500 },
    { note: 'E4', time: 11000 }, { note: 'F4', time: 11500 }, { note: 'G4', time: 12000 },
    { note: 'D4', time: 13000 }, { note: 'G4', time: 13500 }, { note: 'E4', time: 14000 }, { note: 'C4', time: 14500 }
  ],

  // Hot Cross Buns — very easy starter song
  hotcross: [
    { note: 'E4', time: 1000 }, { note: 'D4', time: 1500 }, { note: 'C4', time: 2000 },
    { note: 'E4', time: 3000 }, { note: 'D4', time: 3500 }, { note: 'C4', time: 4000 },
    { note: 'C4', time: 5000 }, { note: 'C4', time: 5300 }, { note: 'C4', time: 5600 }, { note: 'C4', time: 5900 },
    { note: 'D4', time: 6200 }, { note: 'D4', time: 6500 }, { note: 'D4', time: 6800 }, { note: 'D4', time: 7100 },
    { note: 'E4', time: 7500 }, { note: 'D4', time: 8000 }, { note: 'C4', time: 8500 }
  ],

  // Jingle Bells — chorus
  jingle: [
    { note: 'E4', time: 1000 }, { note: 'E4', time: 1600 }, { note: 'E4', time: 2400 },
    { note: 'E4', time: 3200 }, { note: 'E4', time: 3800 }, { note: 'E4', time: 4600 },
    { note: 'E4', time: 5400 }, { note: 'G4', time: 6000 }, { note: 'C4', time: 6600 }, { note: 'D4', time: 7200 },
    { note: 'E4', time: 8000 }
  ],

  // Three Blind Mice
  blindmice: [
    { note: 'E4', time: 1000 }, { note: 'D4', time: 1600 }, { note: 'C4', time: 2200 },
    { note: 'E4', time: 3000 }, { note: 'D4', time: 3600 }, { note: 'C4', time: 4200 },
    { note: 'G4', time: 5000 }, { note: 'F4', time: 5400 }, { note: 'F4', time: 5700 }, { note: 'E4', time: 6000 },
    { note: 'G4', time: 7000 }, { note: 'F4', time: 7400 }, { note: 'F4', time: 7700 }, { note: 'E4', time: 8000 }
  ],

  // Itsy Bitsy Spider — first verse
  spider: [
    { note: 'G4', time: 1000 },
    { note: 'C4', time: 1500 }, { note: 'C4', time: 1800 }, { note: 'C4', time: 2100 },
    { note: 'D4', time: 2500 }, { note: 'E4', time: 3000 },
    { note: 'E4', time: 3300 }, { note: 'E4', time: 3700 },
    { note: 'D4', time: 4200 }, { note: 'C4', time: 4700 },
    { note: 'D4', time: 5300 }, { note: 'E4', time: 5800 }, { note: 'C4', time: 6400 }
  ],

  // If You're Happy and You Know It — Clap your hands
  happyclap: [
    { note: 'C4', time: 1000 }, { note: 'C4', time: 1300 },
    { note: 'F4', time: 1600 }, { note: 'F4', time: 1900 }, { note: 'F4', time: 2200 }, { note: 'F4', time: 2500 },
    { note: 'F4', time: 2800 }, { note: 'E4', time: 3100 }, { note: 'F4', time: 3400 },
    { note: 'G4', time: 4000 }, { note: 'G4', time: 4600 }, { note: 'C4', time: 5200 }
  ],

  // Rain Rain Go Away — very simple, great for beginners
  rainrain: [
    { note: 'G4', time: 1000 }, { note: 'G4', time: 1600 },
    { note: 'E4', time: 2200 }, { note: 'A4', time: 2800 }, { note: 'G4', time: 3400 }, { note: 'E4', time: 4000 },
    { note: 'G4', time: 5200 }, { note: 'G4', time: 5800 }, { note: 'E4', time: 6400 },
    { note: 'G4', time: 7000 }, { note: 'A4', time: 7600 }, { note: 'G4', time: 8200 }, { note: 'E4', time: 8800 }
  ]
};

const noteColors = {
  'C4': '#FF5252', 'D4': '#FF9800', 'E4': '#FFEB3B', 'F4': '#4CAF50',
  'G4': '#2196F3', 'A4': '#9C27B0', 'A#4': '#E040FB', 'B4': '#E91E63', 'C5': '#00BCD4'
};

let currentSong = [];
let gameInterval;
let gameStartTime = 0;
let rhythmScore = 0;
let activeNotes = [];
let isAutoPlayMode = false;

const trackContainer = document.getElementById('track-container');
const notesTrack = document.getElementById('notes-track');
const scoreDisplay = document.getElementById('score-display');
const songSelect = document.getElementById('song-select');
const startBtn = document.getElementById('start-song-btn');
const listenBtn = document.getElementById('listen-song-btn');
const stopBtn = document.getElementById('stop-song-btn');
const feedbackText = document.getElementById('feedback-text');

function stopCurrentSong() {
  clearInterval(gameInterval);
  gameInterval = null;
  currentSong = [];
  activeNotes.forEach(n => n.el && n.el.remove());
  activeNotes = [];
  notesTrack.innerHTML = '';
  // Silence anything still ringing
  Object.keys(activeOscillators).forEach(stopNote);
  if (stopBtn) stopBtn.style.display = 'none';
}

if (songSelect) {
  songSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      trackContainer.style.display = 'block';
    } else {
      trackContainer.style.display = 'none';
      stopCurrentSong();
    }
  });

  startBtn.addEventListener('click', () => startGame(false));
  if (listenBtn) {
    listenBtn.addEventListener('click', () => startGame(true));
  }
  if (stopBtn) {
    stopBtn.addEventListener('click', stopCurrentSong);
  }
}

function startGame(autoPlay = false) {
  const songId = songSelect.value;
  if (!songId) return;

  initAudio();

  // Reset game state without re-showing the stop button via stopCurrentSong's side effects
  clearInterval(gameInterval);
  activeNotes.forEach(n => n.el && n.el.remove());
  notesTrack.innerHTML = '';
  rhythmScore = 0;
  isAutoPlayMode = autoPlay === true;
  scoreDisplay.style.visibility = isAutoPlayMode ? 'hidden' : 'visible';
  scoreDisplay.textContent = `Score: ${rhythmScore}`;
  activeNotes = [];

  // Clone song data
  currentSong = JSON.parse(JSON.stringify(songs[songId]));

  gameStartTime = Date.now() + 1000; // Start in 1 second

  if (stopBtn) stopBtn.style.display = '';
  gameInterval = setInterval(gameLoop, 16); // ~60fps
}

function gameLoop() {
  const now = Date.now();
  const elapsedTime = now - gameStartTime;
  
  // Spawn notes
  if (currentSong.length > 0) {
    const nextNote = currentSong[0];
    // Spawn 2.5 seconds before it hits the line
    if (elapsedTime >= nextNote.time - 2500) {
      spawnNoteElement(nextNote);
      currentSong.shift();
    }
  }
  
  // Move notes
  for (let i = activeNotes.length - 1; i >= 0; i--) {
    const noteObj = activeNotes[i];
    const timeRemaining = noteObj.targetTime - elapsedTime;
    
    // Calculate position: right to left
    // hit-line is at 60px.
    const trackWidth = notesTrack.clientWidth || 600;
    const distanceToTravel = trackWidth - 60;
    const pixelsPerMs = distanceToTravel / 2500;
    
    // Position = 60 + (timeRemaining * pixelsPerMs)
    const currentPos = 60 + (timeRemaining * pixelsPerMs);
    
    // Auto-Play logic
    if (isAutoPlayMode && currentPos <= 60 && !noteObj.played) {
      noteObj.played = true;
      const keyElement = document.querySelector(`.key[data-note="${noteObj.note}"]`);
      if (keyElement) {
        const freq = parseFloat(keyElement.getAttribute('data-freq'));
        keyElement.classList.add('active');
        playNote(freq, noteObj.note);
        setTimeout(() => {
          keyElement.classList.remove('active');
          stopNote(noteObj.note);
        }, 300);
      }
      noteObj.el.remove();
      activeNotes.splice(i, 1);
      continue;
    }
    
    if (currentPos < -50) {
      // Missed
      if (!isAutoPlayMode) showFeedback('Miss!', 'miss');
      noteObj.el.remove();
      activeNotes.splice(i, 1);
    } else {
      noteObj.el.style.left = currentPos + 'px';
      noteObj.currentPos = currentPos;
    }
  }
  
  if (currentSong.length === 0 && activeNotes.length === 0) {
    clearInterval(gameInterval);
    gameInterval = null;
    if (stopBtn) stopBtn.style.display = 'none';
    if (!isAutoPlayMode) {
      setTimeout(() => showGameOverModal(rhythmScore), 800);
    }
  }
}

function showGameOverModal(score) {
  const modal = document.getElementById('game-over-modal');
  if (!modal) return;
  const lang = (typeof getPianoLang === 'function') ? getPianoLang() : 'en';
  const titleMap = { th: 'จบเพลง! 🎉', en: 'Song Complete! 🎉', lao: 'ຈົບເພງ! 🎉' };
  const scoreMap = { th: 'คะแนนรวม', en: 'Final Score', lao: 'ຄະແນນລວມ' };
  document.getElementById('game-over-title').textContent = titleMap[lang] || titleMap.en;
  document.getElementById('game-over-score-label').textContent = scoreMap[lang] || scoreMap.en;
  document.getElementById('game-over-score').textContent = score;
  modal.style.display = 'flex';
}

function hideGameOverModal() {
  const modal = document.getElementById('game-over-modal');
  if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const playAgainBtn = document.getElementById('play-again-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      hideGameOverModal();
      startGame(false);
    });
  }
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideGameOverModal);
  }
});

function spawnNoteElement(noteData) {
  const el = document.createElement('div');
  el.className = 'moving-note';
  el.style.backgroundColor = noteColors[noteData.note] || '#555';
  el.textContent = noteData.note.replace(/\d/, ''); // Remove octave number
  
  notesTrack.appendChild(el);
  
  activeNotes.push({
    note: noteData.note,
    targetTime: noteData.time,
    el: el,
    currentPos: 999
  });
}

function checkHit(pressedNote) {
  if (activeNotes.length === 0) return;
  
  // Find the first note in the track that matches the pressed note
  const hitIndex = activeNotes.findIndex(n => n.note === pressedNote);
  if (hitIndex === -1) return;
  
  const noteObj = activeNotes[hitIndex];
  
  // Check if it's within the hit zone (approx 10px to 110px)
  if (noteObj.currentPos >= 10 && noteObj.currentPos <= 110) {
    // Hit!
    let points = 0;
    if (noteObj.currentPos >= 40 && noteObj.currentPos <= 80) {
      points = 100;
      showFeedback('Perfect!', 'perfect');
    } else {
      points = 50;
      showFeedback('Good!', 'good');
    }
    
    rhythmScore += points;
    scoreDisplay.textContent = `Score: ${rhythmScore}`;
    
    // Remove note
    noteObj.el.remove();
    activeNotes.splice(hitIndex, 1);
  }
}

function showFeedback(text, type) {
  feedbackText.textContent = text;
  feedbackText.className = `feedback-${type}`;
  
  // Reset animation
  feedbackText.style.animation = 'none';
  void feedbackText.offsetWidth; // trigger reflow
  feedbackText.style.animation = null;
}
