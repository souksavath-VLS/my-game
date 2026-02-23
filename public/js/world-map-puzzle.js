// world-map-puzzle.js
// World Map Puzzle: Drag & Drop ทวีป/ประเทศ ลงบนแผนที่โลก

const LEVELS = {
  1: {
    name: 'ทวีป',
    pieces: [
      { key: 'asia', label: 'เอเชีย', x: 520, y: 140, w: 120, h: 80 },
      { key: 'europe', label: 'ยุโรป', x: 410, y: 70, w: 80, h: 60 },
      { key: 'africa', label: 'แอฟริกา', x: 410, y: 210, w: 90, h: 100 },
      { key: 'north-america', label: 'อเมริกาเหนือ', x: 120, y: 80, w: 120, h: 90 },
      { key: 'south-america', label: 'อเมริกาใต้', x: 180, y: 260, w: 80, h: 90 },
      { key: 'australia', label: 'ออสเตรเลีย', x: 650, y: 300, w: 70, h: 60 },
      { key: 'antarctica', label: 'แอนตาร์กติกา', x: 350, y: 360, w: 200, h: 30 }
    ],
    outline: 'assets/world-outline-continents.png'
  },
  2: {
    name: 'ประเทศใหญ่',
    pieces: [
      { key: 'thailand', label: 'ประเทศไทย', x: 540, y: 180, w: 40, h: 40 },
      { key: 'china', label: 'จีน', x: 600, y: 120, w: 80, h: 60 },
      { key: 'japan', label: 'ญี่ปุ่น', x: 700, y: 120, w: 30, h: 30 },
      { key: 'usa', label: 'สหรัฐอเมริกา', x: 120, y: 120, w: 120, h: 60 },
      { key: 'brazil', label: 'บราซิล', x: 220, y: 260, w: 60, h: 70 },
      { key: 'russia', label: 'รัสเซีย', x: 480, y: 40, w: 180, h: 60 },
      { key: 'india', label: 'อินเดีย', x: 570, y: 200, w: 60, h: 40 },
      { key: 'australia', label: 'ออสเตรเลีย', x: 650, y: 300, w: 70, h: 60 },
      { key: 'egypt', label: 'อียิปต์', x: 420, y: 200, w: 40, h: 40 },
      { key: 'uk', label: 'อังกฤษ', x: 390, y: 80, w: 30, h: 30 }
    ],
    outline: 'assets/world-outline-countries.png'
  }
};

let currentLevel = 1;
let correctCount = 0;
let wrongCount = 0;
let startTime = null;
let timerInterval = null;

function renderMapPuzzle() {
  const board = document.getElementById('map-board');
  const piecesRow = document.getElementById('pieces-row');
  const outlineImg = document.getElementById('map-outline');
  const levelData = LEVELS[currentLevel];
  correctCount = 0;
  wrongCount = 0;
  document.getElementById('correct').textContent = 'ถูก: 0';
  document.getElementById('wrong').textContent = 'ผิด: 0';
  document.getElementById('result').textContent = '';
  outlineImg.src = levelData.outline;

  // ลบ drop zones เดิม
  Array.from(board.querySelectorAll('.drop-zone')).forEach(e => e.remove());
  // ลบชิ้น puzzle เดิม
  piecesRow.innerHTML = '';

  // สร้าง drop zones
  levelData.pieces.forEach((p, i) => {
    const dz = document.createElement('div');
    dz.className = 'drop-zone';
    dz.style.left = p.x + 'px';
    dz.style.top = p.y + 'px';
    dz.style.width = p.w + 'px';
    dz.style.height = p.h + 'px';
    dz.dataset.key = p.key;
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('active'); };
    dz.ondragleave = e => dz.classList.remove('active');
    dz.ondrop = function(e) {
      e.preventDefault();
      dz.classList.remove('active');
      const draggedKey = e.dataTransfer.getData('text/plain');
      if (draggedKey === p.key) {
        dz.style.background = '#c8e6c9';
        dz.textContent = p.label;
        dz.style.color = '#1976d2';
        dz.style.fontWeight = 'bold';
        dz.style.opacity = 1;
        correctCount++;
        document.getElementById('correct').textContent = 'ถูก: ' + correctCount;
        document.querySelector(`[data-piece='${draggedKey}']`).remove();
        checkWin();
      } else {
        dz.style.background = '#ffcdd2';
        setTimeout(() => { dz.style.background = ''; }, 700);
        wrongCount++;
        document.getElementById('wrong').textContent = 'ผิด: ' + wrongCount;
      }
    };
    board.appendChild(dz);
  });

  // สุ่มชิ้น puzzle
  const shuffled = levelData.pieces.slice().sort(() => Math.random() - 0.5);
  shuffled.forEach(p => {
    const piece = document.createElement('div');
    piece.className = 'puzzle-piece';
    piece.textContent = p.label;
    piece.draggable = true;
    piece.dataset.piece = p.key;
    piece.ondragstart = e => {
      e.dataTransfer.setData('text/plain', p.key);
    };
    piecesRow.appendChild(piece);
  });

  // จับเวลา
  if (timerInterval) clearInterval(timerInterval);
  startTime = Date.now();
  document.getElementById('timer').textContent = 'เวลา: 0 วินาที';
  timerInterval = setInterval(() => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer').textContent = 'เวลา: ' + sec + ' วินาที';
  }, 500);
}

function checkWin() {
  const levelData = LEVELS[currentLevel];
  if (correctCount === levelData.pieces.length) {
    clearInterval(timerInterval);
    document.getElementById('result').textContent = 'เก่งมาก! จบเกมใน ' + Math.floor((Date.now() - startTime) / 1000) + ' วินาที';
    // เก็บสถิติใน localStorage
    let stats = JSON.parse(localStorage.getItem('worldMapPuzzleStats') || '[]');
    stats.push({
      level: currentLevel,
      time: Math.floor((Date.now() - startTime) / 1000),
      correct: correctCount,
      wrong: wrongCount,
      date: new Date().toISOString()
    });
    localStorage.setItem('worldMapPuzzleStats', JSON.stringify(stats));
  }
}

document.getElementById('level-select').onchange = function() {
  currentLevel = parseInt(this.value);
  renderMapPuzzle();
};

document.addEventListener('DOMContentLoaded', renderMapPuzzle);
