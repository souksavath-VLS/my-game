// เกมเรียงสีตามลำดับ พร้อมจับเวลาและบันทึก stats

const COLORS_ORDER = [
  { name: 'แดง', color: '#e53935' },
  { name: 'เหลือง', color: '#fbc02d' },
  { name: 'เขียว', color: '#43a047' },
  { name: 'น้ำเงิน', color: '#1e88e5' },
  { name: 'ส้ม', color: '#fb8c00' },
  { name: 'ม่วง', color: '#8e24aa' },
  { name: 'ชมพู', color: '#ec407a' },
  { name: 'น้ำตาล', color: '#6d4c41' }
];

let order = [];
let userOrder = [];
let timer = null;
let startTime = null;
let endTime = null;
let finished = false;

function startGame() {
  finished = false;
  userOrder = [];
  order = shuffle([...COLORS_ORDER]).slice(0, 4);
  renderQuestion();
  renderOptions();
  document.getElementById('color-order-result').textContent = '';
  startTimer();
}

function renderQuestion() {
  const q = order.map(c => c.name).join(' → ');
  document.getElementById('color-order-question').textContent = 'เรียงสีตามลำดับนี้: ' + q;
}

function renderOptions() {
  const options = shuffle([...order]);
  const container = document.getElementById('color-order-options');
  container.innerHTML = '';
  options.forEach((c, idx) => {
    const btn = document.createElement('button');
    btn.className = 'color-btn';
    btn.style.background = c.color;
    btn.textContent = '';
    btn.onclick = () => selectColor(idx, c);
    container.appendChild(btn);
  });
}

function selectColor(idx, colorObj) {
  if (finished) return;
  userOrder.push(colorObj);
  playColorNameSound(colorObj.name);
  if (userOrder.length === order.length) {
    endTimer();
    checkResult();
  }
}

function checkResult() {
  finished = true;
  let correct = true;
  for (let i = 0; i < order.length; i++) {
    if (userOrder[i].name !== order[i].name) correct = false;
  }
  if (correct) {
    playColorSound('colorOrderCorrectSound');
    document.getElementById('color-order-result').textContent = 'ถูกต้อง!';
    saveStats(true);
  } else {
    playColorSound('colorOrderWrongSound');
    document.getElementById('color-order-result').textContent = 'ผิด ลองใหม่!';
    saveStats(false);
  }
}

function startTimer() {
  startTime = Date.now();
  timer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('color-order-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endTimer() {
  endTime = Date.now();
  clearInterval(timer);
  const elapsed = Math.floor((endTime - startTime) / 1000);
  document.getElementById('color-order-timer').textContent = 'ใช้เวลา: ' + elapsed + ' วินาที';
}

function saveStats(success) {
  // ตัวอย่างบันทึก stats ลง localStorage
  const stats = JSON.parse(localStorage.getItem('colorOrderStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: Math.floor((endTime - startTime) / 1000)
  });
  localStorage.setItem('colorOrderStats', JSON.stringify(stats));
}

function playColorSound(id) {
  const audio = document.getElementById(id);
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play();
  }
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function playColorNameSound(colorName) {
  const colorMap = {
    'แดง': 'red',
    'เหลือง': 'yellow',
    'เขียว': 'green',
    'น้ำเงิน': 'blue',
    'ส้ม': 'orange',
    'ม่วง': 'purple',
    'ชมพู': 'pink',
    'น้ำตาล': 'brown'
  };
  const eng = colorMap[colorName];
  if (!eng) return;
  let audio = document.getElementById('colorOrderNameSound');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'colorOrderNameSound';
    document.body.appendChild(audio);
  }
  audio.src = `assets/sound/color-game/color-${eng}.wav`;
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 1.0;
  audio.play();
}

document.getElementById('restartColorOrderBtn').onclick = startGame;
window.onload = startGame;
