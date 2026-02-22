// เกมจับคู่ตัวอักษร A-Z (uppercase/lowercase)
const AZ_UPPER = Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i));
const AZ_LOWER = Array.from({length: 26}, (_, i) => String.fromCharCode(97 + i));
let azGameTimer = null;
let azGameStartTime = 0;
let azGameCorrect = 0;
let azGameFinished = false;

function startAZMatchGame() {
  azGameCorrect = 0;
  azGameFinished = false;
  azGameStartTime = Date.now();
  renderAZMatch();
  startAZTimer();
  document.getElementById('az-match-result').textContent = '';
}

function renderAZMatch() {
  const upper = shuffle([...AZ_UPPER]);
  const lower = shuffle([...AZ_LOWER]);
  const container = document.getElementById('az-match-options');
  container.innerHTML = '';
  upper.forEach((u, idx) => {
    const div = document.createElement('div');
    div.className = 'az-match-upper';
    div.textContent = u;
    div.setAttribute('draggable', 'true');
    div.dataset.letter = u;
    div.ondragstart = azMatchDragStart;
    container.appendChild(div);
  });
  const shadow = document.getElementById('az-match-shadow');
  shadow.innerHTML = '';
  lower.forEach((l, idx) => {
    const div = document.createElement('div');
    div.className = 'az-match-lower';
    div.textContent = l;
    div.dataset.letter = l;
    div.ondragover = e => e.preventDefault();
    div.ondrop = azMatchDrop;
    shadow.appendChild(div);
  });
}

function azMatchDragStart(e) {
  e.dataTransfer.setData('letter', e.target.dataset.letter);
}

function azMatchDrop(e) {
  if (azGameFinished) return;
  const lower = e.target.dataset.letter;
  const upper = e.dataTransfer.getData('letter');
  if (upper && lower && upper.toLowerCase() === lower) {
    playSound('correct');
    azGameCorrect++;
    e.target.style.background = '#cfc';
    e.target.textContent = upper + ' / ' + lower;
    if (azGameCorrect === 26) {
      azGameFinished = true;
      playSound('win');
      endAZTimer();
      document.getElementById('az-match-result').textContent = 'จบเกม! ถูกต้องครบ 26 ตัวอักษร';
      saveAZStats(true);
    }
  } else {
    playSound('wrong');
    e.target.style.background = '#fcc';
    document.getElementById('az-match-result').textContent = 'ผิด ลองใหม่!';
  }
}

function startAZTimer() {
  azGameTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - azGameStartTime) / 1000);
    document.getElementById('az-match-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endAZTimer() {
  clearInterval(azGameTimer);
}

function playSound(type) {
  let audio;
  if (type === 'win') audio = new Audio('assets/sound/win.wav');
  else if (type === 'correct') audio = new Audio('assets/sound/correct.wav');
  else if (type === 'wrong') audio = new Audio('assets/sound/wrong.wav');
  if (audio) audio.play();
}

function saveAZStats(success) {
  // บันทึก stats ลง localStorage
  const stats = JSON.parse(localStorage.getItem('azMatchStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: Math.floor((Date.now() - azGameStartTime) / 1000)
  });
  localStorage.setItem('azMatchStats', JSON.stringify(stats));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
