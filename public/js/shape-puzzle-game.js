// เกมวางรูปร่าง (Shape Puzzle)

const SHAPES = [
  { name: 'วงกลม', icon: '⚪' },
  { name: 'สี่เหลี่ยม', icon: '⬛' },
  { name: 'สามเหลี่ยม', icon: '🔺' },
  { name: 'ดาว', icon: '⭐' },
  { name: 'หัวใจ', icon: '❤️' },
  { name: 'ห้าเหลี่ยม', icon: '⬟' },
  { name: 'หกเหลี่ยม', icon: '⬢' },
  { name: 'วงรี', icon: '🟠' },
  { name: 'สี่เหลี่ยมผืนผ้า', icon: '▬' },
  { name: 'กากบาท', icon: '✖️' },
  { name: 'ลูกศรขึ้น', icon: '⬆️' },
  { name: 'ลูกศรลง', icon: '⬇️' },
  { name: 'ลูกศรซ้าย', icon: '⬅️' },
  { name: 'ลูกศรขวา', icon: '➡️' },
  { name: 'พระจันทร์', icon: '🌙' },
  { name: 'ดวงอาทิตย์', icon: '☀️' },
  { name: 'เมฆ', icon: '☁️' },
  { name: 'ร่ม', icon: '☂️' },
  { name: 'เพชร', icon: '🔷' },
  { name: 'ดอกไม้', icon: '🌸' }
];

let answer = null;
let options = [];
let finished = false;
let startTime = null;
let endTime = null;
let timer = null;
let currentLevel = 1;
let totalCorrect = 0;

function startGame() {
  finished = false;
  if (currentLevel > 10) {
    document.getElementById('shape-shadow').innerHTML = '';
    document.getElementById('shape-puzzle-options').innerHTML = '';
    document.getElementById('shape-puzzle-result').textContent = `จบเกม! คุณผ่านครบ 10 ลำดับ\nถูกต้องทั้งหมด: ${totalCorrect} / 10`;
    document.getElementById('shape-puzzle-timer').textContent = '';
    return;
  }
  const shapeSet = SHAPES.slice(currentLevel - 1, currentLevel + 9);
  answer = shapeSet[Math.floor(Math.random() * shapeSet.length)];
  options = shuffle([
    answer,
    ...getRandomOptions(answer, 3, shapeSet)
  ]);
  renderShadow();
  renderOptions(shapeSet);
  document.getElementById('shape-puzzle-result').textContent = '';
  startTimer();
}

function renderShadow() {
  const shadow = document.getElementById('shape-shadow');
  shadow.innerHTML = answer.icon;
}

function renderOptions() {
  const container = document.getElementById('shape-puzzle-options');
  container.innerHTML = '';
  options.forEach(shape => {
    const div = document.createElement('div');
    div.className = 'draggable-shape';
    div.style.display = 'inline-block';
    div.style.margin = '0 12px';
    div.style.fontSize = '2.2rem';
    div.style.fontWeight = 'bold';
    div.style.cursor = 'grab';
    div.draggable = true;
    div.innerHTML = shape.icon;
    div.ondragstart = e => {
      e.dataTransfer.setData('shape', shape.name);
    };
    container.appendChild(div);
  });
}

function onDropShape(e) {
  if (finished) return;
  const dropped = e.dataTransfer.getData('shape');
  finished = true;
  endTimer();
  if (dropped === answer.name) {
    playSound('shapeCorrectSound');
    playSound('shapeWinSound');
    document.getElementById('shape-puzzle-result').textContent = 'ถูกต้อง!';
    saveStats(true);
    totalCorrect++;
    setTimeout(() => {
      currentLevel++;
      startGame();
    }, 900);
  } else {
    playSound('shapeWrongSound');
    document.getElementById('shape-puzzle-result').textContent = 'ผิด ลองใหม่!';
    saveStats(false);
  }
}

function startTimer() {
  startTime = Date.now();
  endTime = null;
  timer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('shape-puzzle-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endTimer() {
  endTime = Date.now();
  clearInterval(timer);
  const elapsed = Math.floor((endTime - startTime) / 1000);
  document.getElementById('shape-puzzle-timer').textContent = 'ใช้เวลา: ' + elapsed + ' วินาที';
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
  const stats = JSON.parse(localStorage.getItem('shapePuzzleStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: endTime && startTime ? Math.floor((endTime - startTime) / 1000) : null
  });
  localStorage.setItem('shapePuzzleStats', JSON.stringify(stats));
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function getRandomOptions(exclude, count) {
  // เพิ่ม shapeSet เป็น argument เพื่อรองรับแต่ละ level
  const arr = (arguments[2] ? arguments[2] : SHAPES).filter(s => s.name !== exclude.name);
  const res = [];
  while (res.length < count) {
    const idx = Math.floor(Math.random() * arr.length);
    if (!res.includes(arr[idx])) res.push(arr[idx]);
  }
  return res;
}

document.getElementById('restartShapePuzzleBtn').onclick = startGame;
document.getElementById('restartShapePuzzleBtn').onclick = () => {
  currentLevel = 1;
  totalCorrect = 0;
  startGame();
};
window.onload = () => {
  currentLevel = 1;
  totalCorrect = 0;
  startGame();
};
