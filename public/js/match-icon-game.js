// เกม Match Icon

const ICONS = [
  { name: 'Table', icon: 'https://cdn-icons-png.flaticon.com/512/1046/1046875.png' },
  { name: 'Chair', icon: 'https://cdn-icons-png.flaticon.com/512/1046/1046876.png' },
  { name: 'Bed', icon: 'https://cdn-icons-png.flaticon.com/512/1046/1046877.png' },
  { name: 'Refrigerator', icon: 'https://cdn-icons-png.flaticon.com/512/1046/1046882.png' },
  { name: 'TV', icon: 'https://cdn-icons-png.flaticon.com/512/1046/1046880.png' },
  { name: 'Sofa', icon: 'https://cdn-icons-png.flaticon.com/512/1046/1046878.png' },
  { name: 'Clock', icon: 'https://cdn-icons-png.flaticon.com/512/1046/1046881.png' },
  { name: 'Fan', icon: 'https://cdn-icons-png.flaticon.com/512/1046/1046883.png' }
];

let board = [];
let selected = [];
let finished = false;
let startTime = null;
let endTime = null;
let timer = null;

function startGame() {
  finished = false;
  selected = [];
  board = shuffle([...ICONS, ...ICONS]).slice(0, 16); // 8 คู่
  renderBoard();
  document.getElementById('match-icon-result').textContent = '';
  startTimer();
}

function startTimer() {
  startTime = Date.now();
  endTime = null;
  timer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('match-icon-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endTimer() {
  endTime = Date.now();
  clearInterval(timer);
  const elapsed = Math.floor((endTime - startTime) / 1000);
  document.getElementById('match-icon-timer').textContent = 'ใช้เวลา: ' + elapsed + ' วินาที';
}

function renderBoard() {
  const container = document.getElementById('match-icon-board');
  container.innerHTML = '';
  board.forEach((iconObj, idx) => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.style.margin = '0 12px';
    btn.style.width = '64px';
    btn.style.height = '64px';
    btn.innerHTML = `<img src="${iconObj.icon}" alt="${iconObj.name}" style="width:48px;height:48px;">`;
    btn.onclick = () => selectIcon(idx);
    if (selected.includes(idx)) btn.style.opacity = 0.3;
    container.appendChild(btn);
  });
}

function selectIcon(idx) {
  if (finished) return;
  if (selected.includes(idx)) return;
  selected.push(idx);
  if (selected.length % 2 === 0) {
    const last = selected[selected.length - 1];
    const prev = selected[selected.length - 2];
    if (board[last].name === board[prev].name) {
      playSound('matchIconCorrectSound');
      if (selected.length === board.length) {
        finished = true;
        endTimer();
        playSound('matchIconWinSound');
        document.getElementById('match-icon-result').textContent = 'จบเกม!';
        saveStats(true);
      }
    } else {
      playSound('matchIconWrongSound');
      setTimeout(() => {
        selected.pop();
        selected.pop();
        renderBoard();
      }, 900);
      return;
    }
  }
  renderBoard();
}

function playSound(id) {
  const audio = document.getElementById(id);
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play();
  }
}

function saveStats(success) {
  const stats = JSON.parse(localStorage.getItem('matchIconStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: endTime && startTime ? Math.floor((endTime - startTime) / 1000) : null
  });
  localStorage.setItem('matchIconStats', JSON.stringify(stats));
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

document.getElementById('restartMatchIconBtn').onclick = startGame;
window.onload = startGame;
