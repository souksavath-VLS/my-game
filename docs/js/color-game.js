// เกมเลือกสีสำหรับเด็ก 3-5 ปี

function getColorLang() {
  let lang = localStorage.getItem('lang') || 'en';
  if (!['th','en','lao'].includes(lang)) lang = 'en';
  return lang;
}
const COLOR_NAMES = {
  th: ['แดง','เหลือง','เขียว','น้ำเงิน','ส้ม','ม่วง','ชมพู','น้ำตาล'],
  en: ['Red','Yellow','Green','Blue','Orange','Purple','Pink','Brown'],
  lao: ['ສີແດງ','ສີເຫຼືອງ','ສີຂຽວ','ສີນ້ຳເງິນ','ສີສົ້ມ','ສີມ່ວງ','ສີຊົມພູ','ສີນ້ຳຕານ']
};
const COLORS = COLOR_NAMES[getColorLang()].map((name,i)=>{
  const colorArr = ['#e53935','#fbc02d','#43a047','#1e88e5','#fb8c00','#8e24aa','#ec407a','#6d4c41'];
  return { name, color: colorArr[i] };
});

let colorStage = 0; // 0: 3 สี, 1: 5 สี, 2: 8 สี
let correctInStage = 0;



let currentColor = null;
let score = 0;
let round = 0;
let startTime = null;
let endTime = null;

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
  // ใช้ SpeechSynthesis API
  if ('speechSynthesis' in window) {
    let lang = localStorage.getItem('lang') || 'en';
    if (!['th','en','lao'].includes(lang)) lang = 'en';
    let voiceLang = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
    const utter = new SpeechSynthesisUtterance(colorName);
    utter.lang = voiceLang;
    // หา voice ที่ตรงกับ lang
    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(v => v.lang === voiceLang);
    if (matchVoice) utter.voice = matchVoice;
    window.speechSynthesis.speak(utter);
  }
}


function getStageColorCount() {
  if (colorStage === 0) return 3;
  if (colorStage === 1) return 5;
  return 8;
}

function nextColorRound() {
  if (round === 0) {
    startTime = Date.now();
    colorStage = 0;
    correctInStage = 0;
  }
  round++;
  // จบเกมหลังผ่าน 3 stage
  if (colorStage > 2) {
    endTime = Date.now();
    const timeUsed = ((endTime - startTime) / 1000).toFixed(1);
    document.getElementById('color-stage-info').textContent = '';
    document.getElementById('color-question').textContent = 'เก่งมาก! คุณเลือกสีได้ครบทุกระดับ';
    document.getElementById('color-options').innerHTML = '';
    document.getElementById('color-result').innerHTML = `ใช้เวลา: <b>${timeUsed}</b> วินาที`;
    playColorSound('colorCongratsSound');
    setTimeout(() => playColorSound('colorWinSound'), 1200);
    saveColorGameStat(timeUsed);
    return;
  }
  const colorCount = getStageColorCount();
  const colorPool = COLORS.slice(0, colorCount);
  // แสดงชื่อสีทั้งหมดในรอบนี้
  const colorNames = colorPool.map(c => c.name).join(' ');
  document.getElementById('color-stage-info').textContent = `รอบนี้มี ${colorCount} สี: ${colorNames}`;
  const color = colorPool[Math.floor(Math.random() * colorPool.length)];
  currentColor = color;
  document.getElementById('color-question').textContent = `เลือกสี: ${color.name}`;
  renderColorOptions(color, colorPool);
  document.getElementById('color-result').textContent = '';
  // เล่นเสียงพูดชื่อสีของคำตอบที่ถูกต้อง
  setTimeout(() => playColorNameSound(color.name), 350);
}


function renderColorOptions(answerColor, colorPool) {
  // สุ่ม 3 ปุ่ม (stage 0), 5 ปุ่ม (stage 1), 8 ปุ่ม (stage 2)
  let options = shuffle([answerColor, ...shuffle(colorPool.filter(c => c !== answerColor)).slice(0, Math.max(2, colorPool.length-1))]);
  // จำกัดจำนวนปุ่มตาม stage
  options = options.slice(0, getStageColorCount());
  if (!options.includes(answerColor)) options[0] = answerColor; // กันพลาด
  options = shuffle(options);
  const container = document.getElementById('color-options');
  container.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'color-btn';
    btn.style.background = opt.color;
    btn.setAttribute('aria-label', opt.name);
    btn.onclick = () => handleColorSelect(opt);
    container.appendChild(btn);
  });
}


function handleColorSelect(selected) {
  if (!currentColor) return;
  if (selected.name === currentColor.name) {
    score++;
    correctInStage++;
    document.getElementById('color-result').textContent = 'ถูกต้อง!';
    playColorSound('colorCorrectSound');
    setTimeout(() => {
      // ถ้าตอบถูกครบ 3 ครั้งใน stage นี้ ให้ไป stage ถัดไป
      if (correctInStage >= 3) {
        colorStage++;
        correctInStage = 0;
      }
      nextColorRound();
    }, 900);
  } else {
    document.getElementById('color-result').textContent = 'ลองใหม่อีกครั้ง!';
    playColorSound('colorWrongSound');
  }
}



document.getElementById('restartColorBtn').onclick = () => {
  score = 0;
  round = 0;
  colorStage = 0;
  correctInStage = 0;
  startTime = null;
  endTime = null;
  nextColorRound();
};



let ttsPlayed = false;
window.tryPlayTTS = function() {
  if (ttsPlayed) return;
  if (currentColor && currentColor.name) {
    playColorNameSound(currentColor.name);
    ttsPlayed = true;
    window.removeEventListener('touchstart', window.tryPlayTTS);
    window.removeEventListener('mousedown', window.tryPlayTTS);
  }
};
window.onload = () => {
  score = 0;
  round = 0;
  colorStage = 0;
  correctInStage = 0;
  startTime = null;
  endTime = null;
  ttsPlayed = false;
  nextColorRound();
  // เรียกซ้ำเมื่อ user แตะหน้าจอ (สำหรับ mobile webview)
  window.addEventListener('touchstart', window.tryPlayTTS);
  window.addEventListener('mousedown', window.tryPlayTTS);
};
// เก็บสถิติลง localStorage
function saveColorGameStat(timeUsed) {
  const stats = JSON.parse(localStorage.getItem('colorGameStats') || '[]');
  const now = new Date();
  stats.push({
    date: now.toISOString(),
    time: Number(timeUsed),
    rounds: maxRounds
  });
  localStorage.setItem('colorGameStats', JSON.stringify(stats));
}
