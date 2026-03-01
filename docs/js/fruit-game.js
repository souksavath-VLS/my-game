// เกมนับจำนวนผลไม้สำหรับเด็ก 3-5 ปี
// ใช้ไอคอนผลไม้จาก flaticon (ลิงก์ตรง)

const FRUITS = [
  { name: 'แอปเปิ้ล', icon: 'https://cdn-icons-png.flaticon.com/512/415/415733.png' },
  { name: 'กล้วย', icon: 'https://cdn-icons-png.flaticon.com/512/415/415734.png' },
  { name: 'ส้ม', icon: 'https://cdn-icons-png.flaticon.com/512/415/415735.png' },
  { name: 'องุ่น', icon: 'https://cdn-icons-png.flaticon.com/512/415/415736.png' },
  { name: 'สตรอเบอร์รี่', icon: 'https://cdn-icons-png.flaticon.com/512/415/415737.png' }
];

let currentFruit = null;
let correctCount = 0;
let round = 0;
const maxRounds = 8;
let startTime = null;
let endTime = null;
let fruitLevel = 1;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFruit() {
  return FRUITS[randomInt(0, FRUITS.length - 1)];
}

function getFruitLang() {
  let lang = localStorage.getItem('lang') || 'en';
  if (!['th','en','lao'].includes(lang)) lang = 'en';
  return lang;
}

const FRUIT_LANG_DATA = {
  th: {
    question: (fruit) => `มีผลไม้ ${fruit} กี่ลูก?`,
    apple: 'แอปเปิ้ล', banana: 'ส้ม', orange: 'หมากแต่ง', grape: 'ขะหนมหวาน', strawberry: 'เค้ก',
    tts: (fruit) => `มีผลไม้ ${fruit} กี่ลูก`
  },
  en: {
    question: (fruit) => `How many ${fruit}s are there?`,
    apple: 'apple', banana: 'orange', orange: 'melon', grape: 'sweeties', strawberry: 'cake',
    tts: (fruit) => `How many ${fruit}s are there?`
  },
  lao: {
    question: (fruit) => `ມີໝາກ${fruit}ຈຳນວນກີ່ຫຼຸດ?`,
    apple: 'ແອັບເປິ້ນ', banana: 'ສົ້ມ', orange: 'ຫມາກແຈ່ງ', grape: 'ຂະຫນົມຫວານ', strawberry: 'ເຄັກ',
    tts: (fruit) => `ມີໝາກ${fruit}ຈຳນວນກີ່ຫຼຸດ`
  }
};

function playFruitQuestionTTS(fruitName) {
  if ('speechSynthesis' in window) {
    let lang = getFruitLang();
    let voiceLang = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
    let text = FRUIT_LANG_DATA[lang].tts(fruitName);
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voiceLang;
    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(v => v.lang === voiceLang);
    if (matchVoice) utter.voice = matchVoice;
    window.speechSynthesis.speak(utter);
  }
}

function generateFruitQuestion() {
  currentFruit = randomFruit();
  // ปรับช่วงจำนวนผลไม้ตามระดับความยาก
  const minFruit = 2 + Math.floor((fruitLevel-1)*0.5);
  const maxFruit = 7 + Math.floor((fruitLevel-1)*0.7);
  const count = randomInt(minFruit, maxFruit);
  const fruitGrid = document.getElementById('fruit-grid');
  fruitGrid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'fruit-item';
    item.innerHTML = `<img src="${currentFruit.icon}" class="fruit-icon" alt="${currentFruit.name}">`;
    fruitGrid.appendChild(item);
  }
  // แปลงชื่อผลไม้เป็นภาษาที่เลือก
  let lang = getFruitLang();
  let fruitName = '';
  switch(currentFruit.name) {
    case 'แอปเปิ้ล': fruitName = FRUIT_LANG_DATA[lang].apple; break;
    case 'กล้วย': fruitName = FRUIT_LANG_DATA[lang].banana; break;
    case 'ส้ม': fruitName = FRUIT_LANG_DATA[lang].orange; break;
    case 'องุ่น': fruitName = FRUIT_LANG_DATA[lang].grape; break;
    case 'สตรอเบอร์รี่': fruitName = FRUIT_LANG_DATA[lang].strawberry; break;
    default: fruitName = currentFruit.name;
  }
  document.getElementById('fruit-question').textContent = FRUIT_LANG_DATA[lang].question(fruitName);
  playFruitQuestionTTS(fruitName);
  renderAnswerButtons(count);
}

function renderAnswerButtons(correct) {
  const container = document.getElementById('answer-buttons');
  container.innerHTML = '';
  let options = [correct];
  while (options.length < 4) {
    let opt = randomInt(2, 7);
    if (!options.includes(opt)) options.push(opt);
  }
  options = options.sort(() => Math.random() - 0.5);
  options.forEach(num => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = num;
    btn.onclick = () => handleFruitAnswer(num, correct);
    container.appendChild(btn);
  });
}

function playSfx(id) {
  const audio = document.getElementById(id);
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play();
  }
}

function handleFruitAnswer(selected, correct) {
  const result = document.getElementById('fruit-result');
  if (selected === correct) {
    correctCount++;
    result.textContent = 'ถูกต้อง!';
    result.className = 'result correct';
    playSfx('soundCorrect');
    setTimeout(nextFruitRound, 900);
  } else {
    result.textContent = 'ลองใหม่อีกครั้ง!';
    result.className = 'result wrong';
    playSfx('soundWrong');
  }
}

function nextFruitRound() {
  round++;
  if (round === 1) {
    startTime = Date.now();
  }
  if (round > maxRounds) {
    endTime = Date.now();
    const timeUsed = ((endTime - startTime) / 1000).toFixed(1);
    document.getElementById('fruit-question').textContent = 'จบเกม! คุณตอบถูกทั้งหมด ' + correctCount + ' รอบ';
    document.getElementById('fruit-grid').innerHTML = '';
    document.getElementById('answer-buttons').innerHTML = '';
    document.getElementById('fruit-result').innerHTML = `<b>ใช้เวลา:</b> ${timeUsed} วินาที`;
    playSfx('soundWin');
    saveFruitGameStat(correctCount, timeUsed);
    // ถ้ายังไม่ถึงระดับ 10 ให้เริ่มระดับถัดไป
    if (fruitLevel < 10) {
      setTimeout(() => {
        fruitLevel++;
        document.getElementById('fruit-level').value = fruitLevel;
        restartFruitGame();
      }, 1200);
    }
    return;
  }
  document.getElementById('fruit-result').textContent = '';
  generateFruitQuestion();
}

function restartFruitGame() {
  correctCount = 0;
  round = 0;
  startTime = null;
  endTime = null;
  fruitLevel = Number(document.getElementById('fruit-level').value) || 1;
  nextFruitRound();
}

function saveFruitGameStat(score, timeUsed) {
  const stats = JSON.parse(localStorage.getItem('fruitGameStats') || '[]');
  const now = new Date();
  stats.push({ date: now.toISOString(), score: score, rounds: maxRounds, time: Number(timeUsed), level: fruitLevel });
  localStorage.setItem('fruitGameStats', JSON.stringify(stats));
}

window.onload = () => {
  const levelSelect = document.getElementById('fruit-level');
  levelSelect.value = '1';
  levelSelect.addEventListener('change', restartFruitGame);
  restartFruitGame();
};
