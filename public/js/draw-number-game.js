// เกมลากเส้นตัวเลข 1-10 พร้อมเสียงและบันทึกสถิติ

const NUMBERS = Array.from({length:10}, (_,i) => (i+1).toString());
let currentIndex = 0;
let startTime = null;
let endTime = null;
let correctCount = 0;
let round = 0;
const maxRounds = 10;

function playSfx(id) {
  const audio = document.getElementById(id);
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play();
  }
}

function playNumberSound(num) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(num);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    // เลือกเสียงเด็กหญิงถ้ามี
    const voices = window.speechSynthesis.getVoices();
    let femaleVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('child'));
    if (!femaleVoice) {
      femaleVoice = voices.find(v => v.lang.startsWith('en') && v.gender === 'female');
    }
    if (!femaleVoice) {
      femaleVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'));
    }
    if (!femaleVoice) {
      femaleVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('girl'));
    }
    if (femaleVoice) utter.voice = femaleVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
}

function showDrawNumber(idx) {
  const num = NUMBERS[idx];
  document.getElementById('draw-char').textContent = num;
  clearDrawCanvas();
  playNumberSound(num);
}

function clearDrawCanvas() {
  const canvas = document.getElementById('draw-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function checkDraw() {
  correctCount++;
  document.getElementById('draw-result').textContent = 'เยี่ยมมาก!';
  playSfx('soundCorrect');
  setTimeout(nextDrawRound, 900);
}

function nextDrawRound() {
  round++;
  if (round === 1) startTime = Date.now();
  if (round > maxRounds) {
    endTime = Date.now();
    const timeUsed = ((endTime - startTime) / 1000).toFixed(1);
    document.getElementById('draw-header').textContent = 'จบเกม! คุณลากเส้นครบ 1-10';
    document.getElementById('draw-char').textContent = '';
    clearDrawCanvas();
    document.getElementById('draw-result').innerHTML = `<b>ใช้เวลา:</b> ${timeUsed} วินาที`;
    playSfx('soundWin');
    saveDrawNumberStat(timeUsed);
    return;
  }
  document.getElementById('draw-result').textContent = '';
  currentIndex = round-1;
  showDrawNumber(currentIndex);
}

function restartDrawGame() {
  correctCount = 0;
  round = 0;
  startTime = null;
  endTime = null;
  document.getElementById('draw-header').textContent = 'ลากเส้นตามตัวเลข';
  nextDrawRound();
}

function saveDrawNumberStat(timeUsed) {
  const stats = JSON.parse(localStorage.getItem('drawNumberGameStats') || '[]');
  const now = new Date();
  stats.push({ date: now.toISOString(), time: Number(timeUsed) });
  localStorage.setItem('drawNumberGameStats', JSON.stringify(stats));
}

window.onload = () => {
  restartDrawGame();
};

// วาดเส้นบน canvas (แบบง่าย)
(function enableDrawing() {
  const canvas = document.getElementById('draw-canvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  canvas.addEventListener('mousedown', e => { drawing = true; ctx.beginPath(); });
  canvas.addEventListener('mouseup', e => { drawing = false; });
  canvas.addEventListener('mouseleave', e => { drawing = false; });
  canvas.addEventListener('mousemove', e => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1976d2';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  });
})();
