// human-body-puzzle.js
const PIECES = [
  { key: 'ear1', label: 'หูซ้าย', icon: '👂', drop: 'หูซ้าย' },
  { key: 'head', label: 'ศีรษะ', icon: '🧑', drop: 'ศีรษะ' },
  { key: 'eyes', label: 'ตา', icon: '👀', drop: 'ตา' },
  { key: 'ear2', label: 'หูขวา', icon: '👂', drop: 'หูขวา' },
  { key: 'mouth', label: 'ปาก', icon: '👄', drop: 'ปาก' },
  { key: 'nose', label: 'จมูก', icon: '👃', drop: 'จมูก' }
];

// เสียง
const correctSound = new Audio('assets/sound/correct.wav');
const wrongSound = new Audio('assets/sound/wrong.wav');
const winSound = new Audio('assets/sound/win.wav');

let correctCount = 0;
let wrongCount = 0;
let startTime = null;
let timerInterval = null;

function shuffle(arr) {
  return arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
}

function speak(text) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'th-TH';
    window.speechSynthesis.speak(utter);
  }
}

function renderPuzzle() {
  correctCount = 0;
  wrongCount = 0;
  document.getElementById('correct').textContent = 'ถูก: 0';

    document.getElementById('wrong').textContent = 'ผิด: 0';
  
  document.getElementById('result').textContent = '';
  if (document.getElementById('wrong-result')) {
    document.getElementById('wrong-result').textContent = '';
  }
  if (document.getElementById('restart-btn')) {
    document.getElementById('restart-btn').disabled = true;
  }
  const row = document.getElementById('piece-row');
  row.innerHTML = '';
  const shuffled = shuffle([...PIECES]);
  shuffled.forEach(piece => {
    const div = document.createElement('div');
    div.className = 'body-piece';
    // icon only
    const iconSpan = document.createElement('span');
    iconSpan.textContent = piece.icon;
    iconSpan.style.fontSize = '2.6em';
    iconSpan.style.marginRight = '8px';
    div.appendChild(iconSpan);
    div.draggable = true;
    div.id = 'piece-' + piece.key;
    div.ondragstart = e => {
      e.dataTransfer.setData('text/plain', piece.key);
    };
    // ปุ่ม TTS
    const ttsBtn = document.createElement('button');
    ttsBtn.className = 'tts-btn';
    ttsBtn.textContent = '🔊';
    ttsBtn.onclick = e => { e.stopPropagation(); speak(piece.label); };
    div.appendChild(ttsBtn);
    row.appendChild(div);
  });
  // reset drop zones
  PIECES.forEach(piece => {
    const dz = document.getElementById('drop-' + piece.key);
    dz.classList.remove('filled');
    dz.textContent = piece.drop;
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('active'); };
    dz.ondragleave = e => dz.classList.remove('active');
    dz.ondrop = function(e) {
      e.preventDefault();
      dz.classList.remove('active');
      const draggedKey = e.dataTransfer.getData('text/plain');
        const wrongResult = document.getElementById('wrong-result');
      if (draggedKey === piece.key && !dz.classList.contains('filled')) {
        dz.classList.add('filled');
        dz.textContent = PIECES.find(p => p.key === draggedKey).label;
        document.getElementById('piece-' + draggedKey).style.visibility = 'hidden';
        correctCount++;
        document.getElementById('correct').textContent = 'ถูก: ' + correctCount;
        speak(PIECES.find(p => p.key === draggedKey).label);
        if (correctSound) correctSound.play();
        if (wrongResult) wrongResult.textContent = '';
        checkWin();
      } else {
        wrongCount++;
        if (document.getElementById('wrong')) {
          document.getElementById('wrong').textContent = 'ผิด: ' + wrongCount;
        }
        if (wrongSound) wrongSound.play();
        if (wrongResult) {
          wrongResult.textContent = 'ตอบผิด ลองใหม่!';
          setTimeout(() => { if (wrongResult.textContent === 'ตอบผิด ลองใหม่!') wrongResult.textContent = ''; }, 1200);
        }
      }
    };
  });
  // timer
  if (timerInterval) clearInterval(timerInterval);
  startTime = Date.now();
  document.getElementById('timer').textContent = 'เวลา: 0 วินาที';
  timerInterval = setInterval(() => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer').textContent = 'เวลา: ' + sec + ' วินาที';
  }, 500);
}

function checkWin() {
  if (correctCount === PIECES.length) {
    clearInterval(timerInterval);
    document.getElementById('result').textContent = 'เก่งมาก! จบเกมใน ' + Math.floor((Date.now() - startTime) / 1000) + ' วินาที';
    if (winSound) winSound.play();
    // enable ปุ่ม restart เมื่อจบเกม
    if (document.getElementById('restart-btn')) {
      document.getElementById('restart-btn').disabled = false;
    }
  }
}

function restartPuzzle() {
  renderPuzzle();
  document.getElementById('restart-btn').disabled = false;
}

document.addEventListener('DOMContentLoaded', () => {
  renderPuzzle();
  document.getElementById('restart-btn').onclick = () => {
    restartPuzzle();
  };
});
