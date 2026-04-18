function playColorOrderNameSound(colorName) {
  let lang = getColorOrderLang();
  let voiceLang = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
  // Android Native TTS
  if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
    window.AndroidTTS.speak(colorName, voiceLang);
    return;
  }
  // Fallback: SpeechSynthesis API
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(colorName);
    utter.lang = voiceLang;
    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(v => v.lang === voiceLang);
    if (matchVoice) utter.voice = matchVoice;
    window.speechSynthesis.speak(utter);
  }
}
// เกมเรียงสีตามลำดับ พร้อมจับเวลาและบันทึก stats

function getColorOrderLang() {
  let lang = localStorage.getItem('lang') || 'en';
  if (!['th','en','lao'].includes(lang)) lang = 'en';
  return lang;
}
const COLOR_ORDER_NAMES = {
  th: ['แดง','เหลือง','เขียว','น้ำเงิน','ส้ม','ม่วง','ชมพู','น้ำตาล'],
  en: ['Red','Yellow','Green','Blue','Orange','Purple','Pink','Brown'],
  lao: ['ສີແດງ','ສີເຫຼືອງ','ສີຂຽວ','ສີນ້ຳເງິນ','ສີສົ້ມ','ສີມ່ວງ','ສີຊົມພູ','ສີນ້ຳຕານ']
};
const COLORS_ORDER = COLOR_ORDER_NAMES[getColorOrderLang()].map((name,i)=>{
  const colorArr = ['#e53935','#fbc02d','#43a047','#1e88e5','#fb8c00','#8e24aa','#ec407a','#6d4c41'];
  return { name, color: colorArr[i] };
});

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
  playColorOrderInstructionSound();
  renderOptions();
  document.getElementById('color-order-result').textContent = '';
  startTimer();
}

// พูดคำแนะนำการเรียงสีตามภาษา
function playColorOrderInstructionSound() {
  let lang = getColorOrderLang();
  let voiceLang = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
  let instruction = '';
  let colorNames = '';
  if (typeof colorOrderLangData !== 'undefined') {
    instruction = colorOrderLangData[lang].question;
  } else {
    instruction = lang === 'th' ? 'เรียงสีตามลำดับนี้' : lang === 'lao' ? 'ຮຽງສີຕາມລຳດັບນີ້' : 'Order the colors';
  }
  if (typeof order !== 'undefined' && Array.isArray(order) && order.length > 0) {
    colorNames = order.map(c => c.name).join(' ');
  }
  const fullText = instruction + (colorNames ? ' ' + colorNames : '');
  // Android Native TTS
  if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
    window.AndroidTTS.speak(fullText, voiceLang);
    return;
  }
  // Fallback: SpeechSynthesis API
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(fullText);
    utter.lang = voiceLang;
    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(v => v.lang === voiceLang);
    if (matchVoice) utter.voice = matchVoice;
    window.speechSynthesis.speak(utter);
  }
}

function renderQuestion() {
  const lang = getColorOrderLang();
  const q = order.map(c => c.name).join(' → ');
  document.getElementById('color-order-question').textContent = colorOrderLangData[lang].question + ' ' + q;
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
  playColorOrderNameSound(colorObj.name);
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
  const lang = getColorOrderLang();
  if (correct) {
    playColorSound('colorOrderCorrectSound');
    document.getElementById('color-order-result').textContent = colorOrderLangData[lang].correct;
    saveStats(true);
  } else {
    playColorSound('colorOrderWrongSound');
    document.getElementById('color-order-result').textContent = colorOrderLangData[lang].wrong;
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
