// เกมหาตัวเลขที่ขาด 1-10

// Multi-language numbers 1-10
const NUMBER_LANG = {
  th: ['หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'],
  en: ['one','two','three','four','five','six','seven','eight','nine','ten'],
  lao: ['หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ']
};
const ALL_LEVELS = Array.from({length: 10}, (_, i) => i + 1);
let currentLevel = 1;
let missing = null;
let options = [];
let finished = false;
let startTime = null;
let endTime = null;
let timer = null;
let totalCorrect = 0;

function startGame() {
  finished = false;
  if (currentLevel > 10) {
    document.getElementById('missing-number-question').textContent = 'จบเกม! คุณผ่านครบ 10 ระดับ';
    document.getElementById('missing-number-options').innerHTML = '';
    document.getElementById('missing-number-result').textContent = `ถูกต้องทั้งหมด: ${totalCorrect} / 10`;
    document.getElementById('missing-number-timer').textContent = '';
    return;
  }
  const NUMBERS = Array.from({length: 11 - currentLevel}, (_, i) => i + currentLevel);
  const nums = shuffle([...NUMBERS]);
  const missingIdx = Math.floor(Math.random() * nums.length);
  missing = nums[missingIdx];
  options = shuffle([
    missing,
    ...getRandomOptions(missing, 3, NUMBERS)
  ]);
  renderQuestion(nums, missingIdx);
  renderOptions();
  document.getElementById('missing-number-result').textContent = '';
  startTimer();
}

function getMissingNumberLang() {
  let lang = localStorage.getItem('lang') || 'en';
  if (!['th','en','lao'].includes(lang)) lang = 'en';
  return lang;
}

function speakMissingNumber(text) {
  let lang = getMissingNumberLang();
  let voiceLang = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
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

function renderQuestion(nums, missingIdx) {
  const lang = getMissingNumberLang();
  const d = typeof window.missingNumberLangData !== 'undefined' ? window.missingNumberLangData[lang] : undefined;
  // ไทยให้แสดงตัวเลข 1-10, อื่นๆ ใช้เดิม
  const q = nums.map((n, i) => {
    if (i === missingIdx) return '?';
    if (lang === 'en' || lang === 'th'|| lang === 'lao') return n;
    return NUMBER_LANG[lang][n-1];
  }).join(' ');
  const qText = d && d.question ? d.question(q) : `Missing number: ${q}`;
  document.getElementById('missing-number-question').textContent = qText;
  speakMissingNumber(qText);
}

function renderOptions() {
  const container = document.getElementById('missing-number-options');
  container.innerHTML = '';
  options.forEach(num => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.style.margin = '0 12px';
    btn.style.fontSize = '2.2rem';
    btn.style.fontWeight = 'bold';
    btn.innerHTML = num;
    btn.onclick = () => selectNumber(num);
    container.appendChild(btn);
  });
}

function selectNumber(num) {
  if (finished) return;
  finished = true;
  endTimer();
  const lang = getMissingNumberLang();
  const d = typeof window.missingNumberLangData !== 'undefined' ? window.missingNumberLangData[lang] : undefined;
  if (num === missing) {
    playSound('missingNumberCorrectSound');
    playSound('missingNumberWinSound');
    document.getElementById('missing-number-result').textContent = d?.correct || 'Correct!';
    saveStats(true);
    totalCorrect++;
    setTimeout(() => {
      currentLevel++;
      startGame();
    }, 900);
  } else {
    playSound('missingNumberWrongSound');
    document.getElementById('missing-number-result').textContent = d?.wrong || 'Wrong!';
    saveStats(false);
  }
}

function startTimer() {
  startTime = Date.now();
  endTime = null;
  const lang = getMissingNumberLang();
  const d = typeof window.missingNumberLangData !== 'undefined' ? window.missingNumberLangData[lang] : undefined;
  timer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('missing-number-timer').textContent = (d?.timer || 'Time:') + ' ' + elapsed + ' วินาที';
  }, 500);
}

function endTimer() {
  endTime = Date.now();
  clearInterval(timer);
  const lang = getMissingNumberLang();
  const d = typeof window.missingNumberLangData !== 'undefined' ? window.missingNumberLangData[lang] : undefined;
  const elapsed = Math.floor((endTime - startTime) / 1000);
  document.getElementById('missing-number-timer').textContent = (d?.used || 'Time used:') + ' ' + elapsed + ' วินาที';
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
  const stats = JSON.parse(localStorage.getItem('missingNumberStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: endTime && startTime ? Math.floor((endTime - startTime) / 1000) : null
  });
  localStorage.setItem('missingNumberStats', JSON.stringify(stats));
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function getRandomOptions(exclude, count) {
  // เพิ่ม NUMBERS เป็น argument เพื่อรองรับแต่ละ level
  const arr = arguments[2] ? arguments[2].filter(n => n !== exclude) : NUMBERS.filter(n => n !== exclude);
  const res = [];
  while (res.length < count) {
    const idx = Math.floor(Math.random() * arr.length);
    if (!res.includes(arr[idx])) res.push(arr[idx]);
  }
  return res;
}

document.getElementById('restartMissingNumberBtn').onclick = () => {
  currentLevel = 1;
  totalCorrect = 0;
  startGame();
};

document.addEventListener('DOMContentLoaded', function() {
  currentLevel = 1;
  totalCorrect = 0;
  startGame();
});
