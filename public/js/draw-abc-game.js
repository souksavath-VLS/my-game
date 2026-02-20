// เกมลากเส้น A-Z สำหรับเด็ก
// ใช้ไอคอนจาก flaticon และเสียงแต่ละตัวอักษรจาก assets/sound/abc/


const ABC = [];
for (let i = 0; i < 26; i++) {
  const upper = String.fromCharCode(65 + i);
  const lower = String.fromCharCode(97 + i);
  ABC.push(upper + ' ' + lower);
}

let currentIndex = 0;
let startTime = null;
let endTime = null;
let correctCount = 0;
let round = 0;
const maxRounds = 26; // A-Z
let drawLevel = 1;

function playSfx(id) {
  const audio = document.getElementById(id);
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play();
  }
}

function playAbcSound(ch) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(ch);
    utter.lang = 'en-US';
    utter.rate = 0.8;
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

function showDrawChar(idx) {
  const chPair = ABC[idx];
  document.getElementById('draw-char').textContent = chPair;
  clearDrawCanvas();
  // เล่นเสียงเฉพาะตัวพิมพ์ใหญ่ เช่น A.mp3
  playAbcSound(chPair.split(' ')[0]);
}

function clearDrawCanvas() {
  const canvas = document.getElementById('draw-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function checkDraw() {
  // สำหรับตัวอย่าง: ให้ผ่านทุกครั้ง (จริงควรมีตรวจจับเส้น)
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
    document.getElementById('draw-header').textContent = 'จบเกม! คุณลากเส้นครบ A-Z';
    document.getElementById('draw-char').textContent = '';
    // ไม่มี icon อีกต่อไป
    clearDrawCanvas();
    document.getElementById('draw-result').innerHTML = `<b>ใช้เวลา:</b> ${timeUsed} วินาที`;
    playSfx('soundWin');
    saveDrawAbcStat(timeUsed);
    return;
  }
  document.getElementById('draw-result').textContent = '';
  currentIndex = round-1;
  showDrawChar(currentIndex);
  clearDrawCanvas();
}

function restartDrawGame() {
  correctCount = 0;
  round = 0;
  startTime = null;
  endTime = null;
  drawLevel = Number(document.getElementById('draw-level-select').value) || 1;
  document.getElementById('draw-header').textContent = 'ลากเส้นตามตัวอักษรภาษาอังกฤษ';
  nextDrawRound();
}

function saveDrawAbcStat(timeUsed) {
  const stats = JSON.parse(localStorage.getItem('drawAbcGameStats') || '[]');
  const now = new Date();
  stats.push({ date: now.toISOString(), time: Number(timeUsed), level: drawLevel });
  localStorage.setItem('drawAbcGameStats', JSON.stringify(stats));
}

window.onload = () => {
  document.getElementById('draw-level-select').addEventListener('change', restartDrawGame);
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
