// เกมปาลูกบอลลงถัง
let throwBallScore = 0;
let throwBallGameTimer = null;
let throwBallGameStartTime = 0;
let throwBallGameFinished = false;
let throwBallShapes = ['กลม', 'สี่เหลี่ยม', 'สามเหลี่ยม'];
let throwBallCurrentShape = '';
let throwBallMatched = [false, false, false];

function startThrowBallGame() {
  throwBallScore = 0;
  throwBallGameFinished = false;
  throwBallGameStartTime = Date.now();
  throwBallMatched = [false, false, false];
  renderThrowBall();
  startThrowBallTimer();
  document.getElementById('throw-ball-game-result').textContent = '';
}

function renderThrowBall() {
  const area = document.getElementById('throw-ball-game-area');
  area.innerHTML = '';
  let nextShapeIdx = throwBallMatched.findIndex(v => !v);
  if (nextShapeIdx === -1) return;
  throwBallCurrentShape = throwBallShapes[nextShapeIdx];
  const ball = document.createElement('div');
  ball.className = 'throw-ball-ball';
  ball.draggable = true;
  ball.textContent = throwBallCurrentShape;
  ball.ondragstart = e => e.dataTransfer.setData('shape', throwBallCurrentShape);
  area.appendChild(ball);
  const binsWrap = document.createElement('div');
  binsWrap.style.display = 'flex';
  binsWrap.style.gap = '32px';
  binsWrap.style.marginTop = '24px';
  for (let i = 0; i < 3; i++) {
    const bin = document.createElement('div');
    bin.className = 'throw-ball-bin';
    bin.textContent = throwBallShapes[i];
    bin.ondragover = e => e.preventDefault();
    bin.ondrop = e => dropBall(e, i);
    if (throwBallMatched[i]) {
      bin.style.background = '#c8e6c9';
      bin.style.opacity = '0.7';
    }
    binsWrap.appendChild(bin);
  }
  area.appendChild(binsWrap);
}

function dropBall(e, binIdx) {
  if (throwBallGameFinished || throwBallMatched[binIdx]) return;
  const shape = e.dataTransfer.getData('shape');
  if (shape === throwBallShapes[binIdx]) {
    playSound('correct');
    throwBallMatched[binIdx] = true;
    throwBallScore++;
    renderThrowBall();
    if (throwBallScore === 3) {
      throwBallGameFinished = true;
      endThrowBallTimer();
      playSound('win');
      document.getElementById('throw-ball-game-result').textContent = 'ชนะ! ปาลูกบอลลงถังครบ 3 ใบ';
      saveThrowBallStats(true);
    }
  } else {
    playSound('wrong');
    document.getElementById('throw-ball-game-result').textContent = 'เลือกถังผิด! ลองใหม่';
  }
}

function startThrowBallTimer() {
  throwBallGameTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - throwBallGameStartTime) / 1000);
    document.getElementById('throw-ball-game-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endThrowBallTimer() {
  clearInterval(throwBallGameTimer);
}

function playSound(type) {
  let audio;
  if (type === 'win') audio = new Audio('assets/sound/win.wav');
  else if (type === 'correct') audio = new Audio('assets/sound/correct.wav');
  else if (type === 'wrong') audio = new Audio('assets/sound/wrong.wav');
  if (audio) audio.play();
}

function saveThrowBallStats(success) {
  const stats = JSON.parse(localStorage.getItem('throwBallStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: Math.floor((Date.now() - throwBallGameStartTime) / 1000)
  });
  localStorage.setItem('throwBallStats', JSON.stringify(stats));
}
