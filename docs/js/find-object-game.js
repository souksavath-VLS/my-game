// เกมหาสิ่งของในบ้าน

// Multi-language objects (A-Z, can be replaced with real objects)
const OBJECTS_LANG = {
  th: Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i)),
  en: Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i)),
  lao: Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i))
};
const OBJECTS = Array.from({length: 26}, (_, i) => ({ name: String.fromCharCode(65 + i), icon: String.fromCharCode(65 + i) }));

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

function getFindObjectLang() {
  let lang = localStorage.getItem('lang') || 'en';
  if (!['th','en','lao'].includes(lang)) lang = 'en';
  return lang;
}

function speakFindObject(text) {
  if ('speechSynthesis' in window) {
    let lang = getFindObjectLang();
    let voiceLang = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voiceLang;
    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(v => v.lang === voiceLang);
    if (matchVoice) utter.voice = matchVoice;
    utter.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
}

function renderQuestion() {
  const lang = getFindObjectLang();
  const d = window.findObjectLangData ? window.findObjectLangData[lang] : undefined;
  let name = answer.name;
  // ถ้ามี object name หลายภาษา ให้แปลงชื่อ
  if (OBJECTS_LANG[lang]) {
    name = OBJECTS_LANG[lang][currentIndex] || answer.name;
  }
  const qText = d && d.question ? d.question(name) : `Find: ${name}`;
  document.getElementById('find-object-question').textContent = qText;
  speakFindObject(qText);
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
  const lang = getFindObjectLang();
  const d = window.findObjectLangData ? window.findObjectLangData[lang] : undefined;
  if (obj.name === answer.name) {
    playSound('findObjectCorrectSound');
    playSound('findObjectWinSound');
    document.getElementById('find-object-result').textContent = d?.correct || 'Correct!';
    saveStats(true);
    totalCorrect++;
    setTimeout(() => {
      currentIndex++;
      startGame();
    }, 900);
  } else {
    playSound('findObjectWrongSound');
    document.getElementById('find-object-result').textContent = d?.wrong || 'Wrong!';
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
