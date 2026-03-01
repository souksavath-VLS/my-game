// เกมรดน้ำต้นไม้ (Tap น้ำ 3 ครั้ง ต้นโต)
let treeWaterCount = 0;
let treeGameTimer = null;
let treeGameStartTime = 0;
let treeGameFinished = false;

function startWaterTreeGame() {
  treeWaterCount = 0;
  treeGameFinished = false;
  treeGameStartTime = Date.now();
  renderTree();
  startTreeTimer();
  document.getElementById('tree-game-result').textContent = '';
}

function renderTree() {
  const tree = document.getElementById('tree-game-tree');
  tree.innerHTML = '';
  // วาดต้นไม้: rect (ลำต้น) + circle (ใบ)
  const trunk = document.createElement('div');
  trunk.style.width = '24px';
  trunk.style.height = '80px';
  trunk.style.background = '#8d6e63';
  trunk.style.margin = 'auto';
  trunk.style.borderRadius = '8px';
  trunk.style.position = 'relative';
  trunk.style.top = '40px';
  tree.appendChild(trunk);
  const leaves = document.createElement('div');
  leaves.style.width = (60 + treeWaterCount * 20) + 'px';
  leaves.style.height = (60 + treeWaterCount * 20) + 'px';
  leaves.style.background = '#66bb6a';
  leaves.style.borderRadius = '50%';
  leaves.style.margin = 'auto';
  leaves.style.position = 'relative';
  leaves.style.top = '-40px';
  leaves.style.boxShadow = '0 4px 16px rgba(102,187,106,0.18)';
  tree.appendChild(leaves);
}

function tapWater() {
  if (treeGameFinished) return;
  treeWaterCount++;
  playSound('correct');
  renderTree();
  if (treeWaterCount >= 3) {
    treeGameFinished = true;
    playSound('win');
    endTreeTimer();
    document.getElementById('tree-game-result').textContent = 'ต้นไม้โตแล้ว!';
    saveTreeStats(true);
  }
}

function startTreeTimer() {
  treeGameTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - treeGameStartTime) / 1000);
    document.getElementById('tree-game-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endTreeTimer() {
  clearInterval(treeGameTimer);
}

function playSound(type) {
  let audio;
  if (type === 'win') audio = new Audio('assets/sound/win.wav');
  else if (type === 'correct') audio = new Audio('assets/sound/correct.wav');
  else if (type === 'wrong') audio = new Audio('assets/sound/wrong.wav');
  if (audio) audio.play();
}

function saveTreeStats(success) {
  // บันทึก stats ลง localStorage
  const stats = JSON.parse(localStorage.getItem('waterTreeStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: Math.floor((Date.now() - treeGameStartTime) / 1000)
  });
  localStorage.setItem('waterTreeStats', JSON.stringify(stats));
}
