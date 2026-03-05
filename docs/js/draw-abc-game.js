// เกมลากเส้น A-Z สำหรับเด็ก
// ใช้ไอคอนจาก flaticon และเสียงแต่ละตัวอักษรจาก assets/sound/abc/



// Multi-language A-Z
const ABC_LANG = {
  th: [
    'เอ', 'บี', 'ซี', 'ดี', 'อี', 'เอฟ', 'จี', 'เฮช', 'ไอ', 'เจ', 'เค', 'แอล', 'เอ็ม', 'เอ็น', 'โอ', 'พี', 'คิว', 'อาร์', 'เอส', 'ที', 'ยู', 'วี', 'ดับเบิลยู', 'เอ็กซ์', 'วาย', 'แซด'
  ],
  en: [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
  ],
  lao: [
    'เอ', 'บี', 'ซี', 'ดี', 'อี', 'เอฟ', 'จี', 'เฮช', 'ไอ', 'เจ', 'เค', 'แอล', 'เอ็ม', 'เอ็น', 'โอ', 'พี', 'คิว', 'อาร์', 'เอส', 'ที', 'ยู', 'วี', 'ดับเบิลยู', 'เอ็กซ์', 'วาย', 'แซด'
  ]
};
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

function getDrawAbcLang() {
  let lang = localStorage.getItem('lang') || 'en';
  if (!['th','en','lao'].includes(lang)) lang = 'en';
  return lang;
}

function playAbcSound(ch, idx) {
  let lang = getDrawAbcLang();
  let voiceLang = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
  let text = '';
  if (lang === 'en') {
    text = ch;
  } else {
    text = ABC_LANG[lang][idx];
  }
  // Android Native TTS
  if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
    window.AndroidTTS.speak(text, voiceLang);
    return;
  }
  // Fallback: SpeechSynthesis API
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voiceLang;
    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(v => v.lang === voiceLang);
    if (matchVoice) utter.voice = matchVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
}

function showDrawChar(idx) {
  const chPair = ABC[idx];
  document.getElementById('draw-char').textContent = chPair;
  clearDrawCanvas();
  drawAbcShadow(chPair);
  // เล่นเสียงตัวอักษรตามภาษา
  playAbcSound(chPair.split(' ')[0], idx);
}

function drawAbcShadow(chPair) {
  const canvas = document.getElementById('draw-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.globalAlpha = 0.18;
  // เพิ่มขนาด font ให้ใหญ่ขึ้น
  ctx.font = 'bold 120px Arial, Noto Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1976d2';
  const [upper, lower] = chPair.split(' ');
  // วาดตัวพิมพ์ใหญ่ทางซ้าย และตัวพิมพ์เล็กทางขวา
  const leftX = canvas.width/2 - 80;
  const rightX = canvas.width/2 + 80;
  const centerY = canvas.height/2;
  ctx.fillText(upper, leftX, centerY);
  ctx.font = 'bold 95px Arial, Noto Sans, sans-serif';
  ctx.fillText(lower, rightX, centerY);
  // วาดลูกศรแสดงทิศทางจากซ้ายไปขวา
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = '#1976d2';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(leftX + 60, centerY);
  ctx.lineTo(rightX - 60, centerY);
  ctx.stroke();
  // วาดหัวลูกศร
  ctx.beginPath();
  ctx.moveTo(rightX - 70, centerY - 18);
  ctx.lineTo(rightX - 60, centerY);
  ctx.lineTo(rightX - 70, centerY + 18);
  ctx.stroke();
  ctx.restore();
}

function clearDrawCanvas() {
  const canvas = document.getElementById('draw-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // วาดเงาตัวอย่างใหม่ถ้ามีตัวอักษรปัจจุบัน
  if (typeof currentIndex === 'number' && currentIndex >= 0 && currentIndex < ABC.length && document.getElementById('draw-char').textContent) {
    drawAbcShadow(ABC[currentIndex]);
  }
}

function checkDraw() {
  // สำหรับตัวอย่าง: ให้ผ่านทุกครั้ง (จริงควรมีตรวจจับเส้น)
  correctCount++;
  // Multi-language result
  let lang = getDrawAbcLang();
  let msg = drawAbcLangData[lang]?.result || 'Great!';
  document.getElementById('draw-result').textContent = msg;
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
  // Multi-language header
  let lang = getDrawAbcLang();
  let header = drawAbcLangData[lang]?.header || 'Trace the English letters';
  document.getElementById('draw-header').textContent = header;
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
