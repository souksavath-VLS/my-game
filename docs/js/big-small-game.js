// เกมใหญ่-เล็ก บน-ล่าง ซ้าย-ขวา

// Multi-language questions and labels
const bigSmallLangData = {
  th: {
    questions: [
      { type: 'size', question: 'เลือกภาพที่ใหญ่กว่า', options: ['big', 'small'], correct: 'big' },
      { type: 'size', question: 'เลือกภาพที่เล็กกว่า', options: ['small', 'big'], correct: 'small' },
      { type: 'position', question: 'เลือกภาพที่อยู่บน', options: ['top', 'bottom'], correct: 'top' },
      { type: 'position', question: 'เลือกภาพที่อยู่ล่าง', options: ['bottom', 'top'], correct: 'bottom' },
      { type: 'position', question: 'เลือกภาพที่อยู่ซ้าย', options: ['left', 'right'], correct: 'left' },
      { type: 'position', question: 'เลือกภาพที่อยู่ขวา', options: ['right', 'left'], correct: 'right' }
    ],
    label: { big: 'ใหญ่', small: 'เล็ก', top: 'บน', bottom: 'ล่าง', left: 'ซ้าย', right: 'ขวา' },
    correct: 'ถูกต้อง!', wrong: 'ผิด ลองใหม่!'
  },
  en: {
    questions: [
      { type: 'size', question: 'Choose the bigger picture', options: ['big', 'small'], correct: 'big' },
      { type: 'size', question: 'Choose the smaller picture', options: ['small', 'big'], correct: 'small' },
      { type: 'position', question: 'Choose the top picture', options: ['top', 'bottom'], correct: 'top' },
      { type: 'position', question: 'Choose the bottom picture', options: ['bottom', 'top'], correct: 'bottom' },
      { type: 'position', question: 'Choose the left picture', options: ['left', 'right'], correct: 'left' },
      { type: 'position', question: 'Choose the right picture', options: ['right', 'left'], correct: 'right' }
    ],
    label: { big: 'Big', small: 'Small', top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' },
    correct: 'Correct!', wrong: 'Wrong! Try again!'
  },
  lao: {
    questions: [
      { type: 'size', question: 'ເລືອກຮູບທີ່ໃຫຍ່ກວ່າ', options: ['big', 'small'], correct: 'big' },
      { type: 'size', question: 'ເລືອກຮູບທີ່ນ້ອຍກວ່າ', options: ['small', 'big'], correct: 'small' },
      { type: 'position', question: 'ເລືອກຮູບທີ່ຢູ່ຂ້າງເທິງ', options: ['top', 'bottom'], correct: 'top' },
      { type: 'position', question: 'ເລືອກຮູບທີ່ຢູ່ຂ້າງລຸ່ມ', options: ['bottom', 'top'], correct: 'bottom' },
      { type: 'position', question: 'ເລືອກຮູບທີ່ຢູ່ຊ້າຍ', options: ['left', 'right'], correct: 'left' },
      { type: 'position', question: 'ເລືອກຮູບທີ່ຢູ່ຂວາ', options: ['right', 'left'], correct: 'right' }
    ],
    label: { big: 'ໃຫຍ່', small: 'ນ້ອຍ', top: 'ເທິງ', bottom: 'ລຸ່ມ', left: 'ຊ້າຍ', right: 'ຂວາ' },
    correct: 'ຖືກຕ້ອງ!', wrong: 'ຜິດ ລອງໃໝ່!'
  }
};


let currentQ = null;
let finished = false;

function getBigSmallLang() {
  let lang = localStorage.getItem('lang') || 'en';
  if (!['th','en','lao'].includes(lang)) lang = 'en';
  return lang;
}

function startGame() {
  finished = false;
  const lang = getBigSmallLang();
  const d = bigSmallLangData[lang];
  const qs = d.questions;
  currentQ = qs[Math.floor(Math.random() * qs.length)];
  renderQuestion();
  renderOptions();
  document.getElementById('bigsmall-result').textContent = '';
}

function renderQuestion() {
  document.getElementById('bigsmall-question').textContent = currentQ.question;
}

function renderOptions() {
  const lang = getBigSmallLang();
  const d = bigSmallLangData[lang];
  const container = document.getElementById('bigsmall-options');
  container.innerHTML = '';
  currentQ.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.style.margin = '0 12px';
    btn.innerHTML = getOptionIcon(opt, d.label[opt]);
    btn.onclick = () => selectOption(opt);
    container.appendChild(btn);
  });
}

function getOptionIcon(opt, label) {
  // ใช้ flaticon icon + multi-language label
  if (opt === 'big') return '<div style="display:flex;flex-direction:column;align-items:center;"><img src="https://cdn-icons-png.flaticon.com/512/1828/1828884.png" alt="big" style="width:48px;height:48px;"><span style="font-size:1.1rem;">'+label+'</span></div>';
  if (opt === 'small') return '<div style="display:flex;flex-direction:column;align-items:center;"><img src="https://cdn-icons-png.flaticon.com/512/1828/1828890.png" alt="small" style="width:32px;height:32px;"><span style="font-size:1.1rem;">'+label+'</span></div>';
  if (opt === 'top') return '<div style="display:flex;flex-direction:column;align-items:center;"><img src="https://cdn-icons-png.flaticon.com/512/2989/2989987.png" alt="top" style="width:40px;height:40px;"><span style="font-size:1.1rem;color:#1976d2;">'+label+'</span></div>';
  if (opt === 'bottom') return '<div style="display:flex;flex-direction:column;align-items:center;"><img src="https://cdn-icons-png.flaticon.com/512/2989/2989988.png" alt="bottom" style="width:40px;height:40px;"><span style="font-size:1.1rem;color:#e53935;">'+label+'</span></div>';
  if (opt === 'left') return '<div style="display:flex;flex-direction:column;align-items:center;"><img src="https://cdn-icons-png.flaticon.com/512/2989/2989977.png" alt="left" style="width:40px;height:40px;"><span style="font-size:1.1rem;">'+label+'</span></div>';
  if (opt === 'right') return '<div style="display:flex;flex-direction:column;align-items:center;"><img src="https://cdn-icons-png.flaticon.com/512/2989/2989978.png" alt="right" style="width:40px;height:40px;"><span style="font-size:1.1rem;">'+label+'</span></div>';

  return label || opt;
}

function selectOption(opt) {
  if (finished) return;
  finished = true;
  const lang = getBigSmallLang();
  const d = bigSmallLangData[lang];
  if (opt === currentQ.correct) {
    playSound('bigSmallCorrectSound');
    document.getElementById('bigsmall-result').textContent = d.correct;
    saveStats(true);
  } else {
    playSound('bigSmallWrongSound');
    document.getElementById('bigsmall-result').textContent = d.wrong;
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
  const stats = JSON.parse(localStorage.getItem('bigSmallStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success
  });
  localStorage.setItem('bigSmallStats', JSON.stringify(stats));
}

document.getElementById('restartBigSmallBtn').onclick = startGame;
window.onload = startGame;
