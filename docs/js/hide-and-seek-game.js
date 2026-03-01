// เกมซ่อนหา (หา object หลังกล่อง)
let hideSeekLevel = 1;
let hideSeekCorrect = 0;
let hideSeekBoxCount = 4;
let hideSeekObjectIdx = 0;
let hideSeekGameTimer = null;
let hideSeekGameStartTime = 0;
let hideSeekGameFinished = false;

function startHideSeekGame() {
  hideSeekLevel = 1;
  hideSeekCorrect = 0;
  hideSeekBoxCount = 4;
  hideSeekGameFinished = false;
  hideSeekGameStartTime = Date.now();
  nextHideSeekRound();
  startHideSeekTimer();
  document.getElementById('hide-seek-game-result').textContent = '';
}

function nextHideSeekRound() {
  hideSeekObjectIdx = Math.floor(Math.random() * hideSeekBoxCount);
  renderHideSeekBoxes();
}

function renderHideSeekBoxes() {
  const area = document.getElementById('hide-seek-game-area');
  area.innerHTML = '';
  for (let i = 0; i < hideSeekBoxCount; i++) {
    const div = document.createElement('div');
    div.className = 'hide-seek-box';
    div.textContent = '?';
    div.onclick = () => tapHideSeekBox(i, div);
    area.appendChild(div);
  }
}

function tapHideSeekBox(idx, div) {
  if (hideSeekGameFinished) return;
  if (idx === hideSeekObjectIdx) {
    playSound('correct');
    speak('เจอแล้ว!');
    div.textContent = '🎁';
    div.style.background = '#cfc';
    hideSeekCorrect++;
    if (hideSeekCorrect === 3) {
      hideSeekGameFinished = true;
      endHideSeekTimer();
      playSound('win');
      document.getElementById('hide-seek-game-result').textContent = 'ชนะ! เจอครบ 3 รอบ';
      saveHideSeekStats(true);
    } else {
      setTimeout(() => {
        if (hideSeekLevel < 2) {
          hideSeekLevel++;
          hideSeekBoxCount = 6;
        }
        nextHideSeekRound();
      }, 900);
    }
  } else {
    playSound('wrong');
    div.textContent = '❌';
    div.style.background = '#fcc';
    document.getElementById('hide-seek-game-result').textContent = 'ผิด ลองใหม่!';
    saveHideSeekStats(false);
  }
}

function startHideSeekTimer() {
  hideSeekGameTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - hideSeekGameStartTime) / 1000);
    document.getElementById('hide-seek-game-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endHideSeekTimer() {
  clearInterval(hideSeekGameTimer);
}

function playSound(type) {
  let audio;
  if (type === 'win') audio = new Audio('assets/sound/win.wav');
  else if (type === 'correct') audio = new Audio('assets/sound/correct.wav');
  else if (type === 'wrong') audio = new Audio('assets/sound/wrong.wav');
  if (audio) audio.play();
}

function speak(text) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'th-TH';
    window.speechSynthesis.speak(utter);
  }
}

function saveHideSeekStats(success) {
  // บันทึก stats ลง localStorage
  const stats = JSON.parse(localStorage.getItem('hideSeekStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: Math.floor((Date.now() - hideSeekGameStartTime) / 1000)
  });
  localStorage.setItem('hideSeekStats', JSON.stringify(stats));
}
