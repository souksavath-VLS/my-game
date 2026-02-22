// เกมหาสิ่งของในบ้าน

const OBJECTS = [
  ...Array.from({length: 26}, (_, i) => ({ name: String.fromCharCode(65 + i), icon: String.fromCharCode(65 + i) }))
];

let answer = null;
let finished = false;
let startTime = null;
let endTime = null;
let timer = null;
let currentIndex = 0;
let totalCorrect = 0;

function startGame() {
  finished = false;
  if (currentIndex >= OBJECTS.length) {
    document.getElementById('find-object-question').textContent = 'จบเกม! คุณหาตัวอักษรครบ A-Z แล้ว';
    document.getElementById('find-object-options').innerHTML = '';
    document.getElementById('find-object-result').textContent = `ถูกต้องทั้งหมด: ${totalCorrect} / 26`;
    document.getElementById('find-object-timer').textContent = '';
    return;
  }
  answer = OBJECTS[currentIndex];
  renderQuestion();
  renderOptions();
  document.getElementById('find-object-result').textContent = '';
  startTimer();
}
function startTimer() {
  startTime = Date.now();
  endTime = null;
  timer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('find-object-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endTimer() {
  endTime = Date.now();
  clearInterval(timer);
  const elapsed = Math.floor((endTime - startTime) / 1000);
  document.getElementById('find-object-timer').textContent = 'ใช้เวลา: ' + elapsed + ' วินาที';
}

function renderQuestion() {
  const qText = 'หา: ' + answer.name;
  document.getElementById('find-object-question').textContent = qText;
  speakThai(qText);
// Text-to-speech (Thai)
function speakThai(text) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'th-TH';
    utter.rate = 1.05;
    window.speechSynthesis.cancel(); // stop previous
    window.speechSynthesis.speak(utter);
  }
}
}

function renderOptions() {
  const container = document.getElementById('find-object-options');
  container.innerHTML = '';
  const options = shuffle([...OBJECTS]).slice(0, 4);
  if (!options.some(o => o.name === answer.name)) options[0] = answer;
  shuffle(options);
  options.forEach(obj => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.style.margin = '0 12px';
    btn.style.fontSize = '2.2rem';
    btn.style.fontWeight = 'bold';
    btn.innerHTML = obj.icon;
    btn.onclick = () => selectObject(obj);
    container.appendChild(btn);
  });
}

function selectObject(obj) {
  if (finished) return;
  finished = true;
  endTimer();
  if (obj.name === answer.name) {
    playSound('findObjectCorrectSound');
    playSound('findObjectWinSound');
    document.getElementById('find-object-result').textContent = 'ถูกต้อง!';
    saveStats(true);
    totalCorrect++;
    setTimeout(() => {
      currentIndex++;
      startGame();
    }, 900);
  } else {
    playSound('findObjectWrongSound');
    document.getElementById('find-object-result').textContent = 'ผิด ลองใหม่!';
    saveStats(false);
  }
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
  // ตัวอย่างบันทึก stats ลง localStorage
  const stats = JSON.parse(localStorage.getItem('findObjectStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: endTime && startTime ? Math.floor((endTime - startTime) / 1000) : null
  });
  localStorage.setItem('findObjectStats', JSON.stringify(stats));
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

document.getElementById('restartFindObjectBtn').onclick = startGame;
window.onload = () => {
  currentIndex = 0;
  totalCorrect = 0;
  startGame();
};
