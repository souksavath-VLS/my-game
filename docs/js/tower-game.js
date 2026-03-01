// เกมหอคอย (Balance stack)
const TOWER_BLOCKS = [120, 100, 80, 60, 40]; // block width px
let towerBlocks = [];
let towerStack = [];
let towerGameTimer = null;
let towerGameStartTime = 0;
let towerGameFinished = false;

function startTowerGame() {
  towerBlocks = [...TOWER_BLOCKS];
  towerStack = [];
  towerGameFinished = false;
  towerGameStartTime = Date.now();
  renderTowerBlocks();
  renderTowerStack();
  startTowerTimer();
  document.getElementById('tower-game-result').textContent = '';
}

function renderTowerBlocks() {
  const blocks = document.getElementById('tower-game-blocks');
  blocks.innerHTML = '';
  towerBlocks.forEach((w, idx) => {
    const div = document.createElement('div');
    div.className = 'tower-block';
    div.style.width = w + 'px';
    div.style.height = '32px';
    div.style.background = '#ffb300';
    div.style.borderRadius = '8px';
    div.style.margin = '8px auto';
    div.style.boxShadow = '0 2px 8px rgba(255,179,0,0.12)';
    div.draggable = true;
    div.dataset.idx = idx;
    div.ondragstart = e => e.dataTransfer.setData('blockIdx', idx);
    blocks.appendChild(div);
  });
}

function renderTowerStack() {
  const stack = document.getElementById('tower-game-stack');
  stack.innerHTML = '';
  towerStack.forEach(w => {
    const div = document.createElement('div');
    div.className = 'tower-block';
    div.style.width = w + 'px';
    div.style.height = '32px';
    div.style.background = '#ffb300';
    div.style.borderRadius = '8px';
    div.style.margin = '8px auto';
    div.style.boxShadow = '0 2px 8px rgba(255,179,0,0.12)';
    stack.appendChild(div);
  });
}

function allowDrop(e) {
  e.preventDefault();
}

function dropBlock(e) {
  if (towerGameFinished) return;
  const idx = e.dataTransfer.getData('blockIdx');
  const w = towerBlocks[idx];
  // ตรวจสอบ balance: block ที่ซ้อนต้องเล็กกว่าหรือเท่ากับ block ด้านล่าง
  if (towerStack.length === 0 || w <= towerStack[towerStack.length - 1]) {
    playSound('correct');
    towerStack.push(w);
    towerBlocks.splice(idx, 1);
    renderTowerBlocks();
    renderTowerStack();
    if (towerStack.length === 5) {
      towerGameFinished = true;
      endTowerTimer();
      playSound('win');
      document.getElementById('tower-game-result').textContent = 'ซ้อนครบ 5 ชั้น! Tower สูงสุด';
      saveTowerStats(true);
    }
  } else {
    playSound('wrong');
    document.getElementById('tower-game-result').textContent = 'ผิด! ต้องซ้อน block เล็กกว่าด้านล่าง';
    saveTowerStats(false);
  }
}

function startTowerTimer() {
  towerGameTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - towerGameStartTime) / 1000);
    document.getElementById('tower-game-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endTowerTimer() {
  clearInterval(towerGameTimer);
}

function playSound(type) {
  let audio;
  if (type === 'win') audio = new Audio('assets/sound/win.wav');
  else if (type === 'correct') audio = new Audio('assets/sound/correct.wav');
  else if (type === 'wrong') audio = new Audio('assets/sound/wrong.wav');
  if (audio) audio.play();
}

function saveTowerStats(success) {
  // บันทึก stats ลง localStorage
  const stats = JSON.parse(localStorage.getItem('towerStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: Math.floor((Date.now() - towerGameStartTime) / 1000)
  });
  localStorage.setItem('towerStats', JSON.stringify(stats));
}
