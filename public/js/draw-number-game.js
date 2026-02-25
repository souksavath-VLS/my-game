// เกมลากเส้นตัวเลข 1-10 พร้อมเสียงและบันทึกสถิติ

// Multi-language numbers 1-10
const NUMBER_LANG = {
  th: ['หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'],
  en: ['one','two','three','four','five','six','seven','eight','nine','ten'],
  lao: ['หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ']
};
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

function getDrawNumberLang() {
  let lang = localStorage.getItem('lang') || 'en';
  if (!['th','en','lao'].includes(lang)) lang = 'en';
  return lang;
}

function playNumberSound(num, idx) {
  if ('speechSynthesis' in window) {
    let lang = getDrawNumberLang();
    let voiceLang = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
    let text = lang === 'en' ? num : NUMBER_LANG[lang][idx];
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voiceLang;
    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(v => v.lang === voiceLang);
    if (matchVoice) utter.voice = matchVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
}

function showDrawNumber(idx) {
  const num = NUMBERS[idx];
  document.getElementById('draw-char').textContent = num;
  clearDrawCanvas();
  // วาดเงาตัวอย่างบน canvas
  const canvas = document.getElementById('draw-canvas');
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.font = 'bold 120px Arial, Noto Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1976d2';
  ctx.fillText(num, canvas.width/2, canvas.height/2+10);
  ctx.restore();
  playNumberSound(num, idx);
}

function clearDrawCanvas() {
  const canvas = document.getElementById('draw-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function checkDraw() {
  correctCount++;
  // Multi-language result
  let lang = getDrawNumberLang();
  let msg = drawNumberLangData[lang]?.result || 'Great!';
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
    let lang = getDrawNumberLang();
    let finish = drawNumberLangData[lang]?.finish || 'Finished! You traced 1-10';
    let timeLabel = drawNumberLangData[lang]?.time || 'Time:';
    document.getElementById('draw-header').textContent = finish;
    document.getElementById('draw-char').textContent = '';
    clearDrawCanvas();
    document.getElementById('draw-result').innerHTML = `<b>${timeLabel}</b> ${timeUsed} วินาที`;
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
  let lang = getDrawNumberLang();
  let header = drawNumberLangData[lang]?.header || 'Trace the numbers';
  document.getElementById('draw-header').textContent = header;
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
