const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let activeOscillators = {};

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
  
  // Create Oscillator
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  // Type of sound: sine, square, sawtooth, triangle
  // Triangle sounds a bit like a toy piano/flute
  osc.type = 'triangle';
  osc.frequency.value = freq;
  
  // Attack, Decay, Sustain, Release envelope
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  // Attack
  gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05);
  // Decay & Sustain
  gainNode.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.3);
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
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

// Event Listeners for UI Keys
const keys = document.querySelectorAll('.key');

keys.forEach(key => {
  const noteName = key.getAttribute('data-note');
  const freq = parseFloat(key.getAttribute('data-freq'));
  
  // Mouse Events
  key.addEventListener('mousedown', (e) => {
    e.preventDefault();
    key.classList.add('active');
    playNote(freq, noteName);
    if(typeof checkHit === 'function') checkHit(noteName);
  });
  
  key.addEventListener('mouseup', (e) => {
    e.preventDefault();
    key.classList.remove('active');
    stopNote(noteName);
  });
  
  key.addEventListener('mouseleave', (e) => {
    e.preventDefault();
    key.classList.remove('active');
    stopNote(noteName);
  });
  
  // Touch Events (Mobile)
  key.addEventListener('touchstart', (e) => {
    e.preventDefault(); // prevent mouse emulation
    key.classList.add('active');
    playNote(freq, noteName);
    if(typeof checkHit === 'function') checkHit(noteName);
  });
  
  key.addEventListener('touchend', (e) => {
    e.preventDefault();
    key.classList.remove('active');
    stopNote(noteName);
  });
  
  key.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    key.classList.remove('active');
    stopNote(noteName);
  });
});

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
    const { note, keyElement } = mapping;
    const freq = parseFloat(keyElement.getAttribute('data-freq'));
    keyElement.classList.add('active');
    playNote(freq, note);
    if(typeof checkHit === 'function') checkHit(note);
  }
});

document.addEventListener('keyup', (e) => {
  const mapping = keyMap[e.key.toLowerCase()];
  if (mapping) {
    const { note, keyElement } = mapping;
    keyElement.classList.remove('active');
    stopNote(note);
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
const feedbackText = document.getElementById('feedback-text');

if (songSelect) {
  songSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      trackContainer.style.display = 'block';
    } else {
      trackContainer.style.display = 'none';
      clearInterval(gameInterval);
      notesTrack.innerHTML = '';
    }
  });

  startBtn.addEventListener('click', () => startGame(false));
  if (listenBtn) {
    listenBtn.addEventListener('click', () => startGame(true));
  }
}

function startGame(autoPlay = false) {
  const songId = songSelect.value;
  if (!songId) return;
  
  initAudio();
  
  // Reset game
  clearInterval(gameInterval);
  notesTrack.innerHTML = '';
  rhythmScore = 0;
  isAutoPlayMode = autoPlay === true;
  scoreDisplay.style.visibility = isAutoPlayMode ? 'hidden' : 'visible';
  scoreDisplay.textContent = `Score: ${rhythmScore}`;
  activeNotes = [];
  
  // Clone song data
  currentSong = JSON.parse(JSON.stringify(songs[songId]));
  
  gameStartTime = Date.now() + 1000; // Start in 1 second
  
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
    if (!isAutoPlayMode) {
      setTimeout(() => alert('จบเพลง! คะแนนรวม: ' + rhythmScore), 1000);
    }
  }
}

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
