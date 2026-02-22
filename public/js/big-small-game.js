// เกมใหญ่-เล็ก บน-ล่าง ซ้าย-ขวา

const QUESTIONS = [
  { type: 'size', question: 'เลือกภาพที่ใหญ่กว่า', options: ['big', 'small'], correct: 'big' },
  { type: 'size', question: 'เลือกภาพที่เล็กกว่า', options: ['small', 'big'], correct: 'small' },
  { type: 'position', question: 'เลือกภาพที่อยู่บน', options: ['top', 'bottom'], correct: 'top' },
  { type: 'position', question: 'เลือกภาพที่อยู่ล่าง', options: ['bottom', 'top'], correct: 'bottom' },
  { type: 'position', question: 'เลือกภาพที่อยู่ซ้าย', options: ['left', 'right'], correct: 'left' },
  { type: 'position', question: 'เลือกภาพที่อยู่ขวา', options: ['right', 'left'], correct: 'right' }
];

let currentQ = null;
let finished = false;

function startGame() {
  finished = false;
  currentQ = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  renderQuestion();
  renderOptions();
  document.getElementById('bigsmall-result').textContent = '';
}

function renderQuestion() {
  document.getElementById('bigsmall-question').textContent = currentQ.question;
}

function renderOptions() {
  const container = document.getElementById('bigsmall-options');
  container.innerHTML = '';
  currentQ.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.style.margin = '0 12px';
    btn.innerHTML = getOptionIcon(opt);
    btn.onclick = () => selectOption(opt);
    container.appendChild(btn);
  });
}

function getOptionIcon(opt) {
  // ใช้ flaticon icon
  if (opt === 'big') return '<img src="https://cdn-icons-png.flaticon.com/512/1828/1828884.png" alt="ใหญ่" style="width:48px;height:48px;">';
  if (opt === 'small') return '<img src="https://cdn-icons-png.flaticon.com/512/1828/1828890.png" alt="เล็ก" style="width:32px;height:32px;">';
  if (opt === 'top') return '<div style="display:flex;flex-direction:column;align-items:center;">'
    + '<img src="https://cdn-icons-png.flaticon.com/512/2989/2989987.png" alt="บน" style="width:40px;height:40px;">'
    + '<span style="font-size:1.1rem;color:#1976d2;">บน</span>'
    + '</div>';
  if (opt === 'bottom') return '<div style="display:flex;flex-direction:column;align-items:center;">'
    + '<img src="https://cdn-icons-png.flaticon.com/512/2989/2989988.png" alt="ล่าง" style="width:40px;height:40px;">'
    + '<span style="font-size:1.1rem;color:#e53935;">ล่าง</span>'
    + '</div>';
  if (opt === 'left') return '<img src="https://cdn-icons-png.flaticon.com/512/2989/2989977.png" alt="ซ้าย" style="width:40px;height:40px;">';
  if (opt === 'right') return '<img src="https://cdn-icons-png.flaticon.com/512/2989/2989978.png" alt="ขวา" style="width:40px;height:40px;">';
  return opt;
}

function getOptionLabel(opt) {
  // สามารถเปลี่ยนเป็นรูปภาพได้
  if (opt === 'big') return 'ใหญ่';
  if (opt === 'small') return 'เล็ก';
  if (opt === 'top') return 'บน';
  if (opt === 'bottom') return 'ล่าง';
  if (opt === 'left') return 'ซ้าย';
  if (opt === 'right') return 'ขวา';
  return opt;
}

function selectOption(opt) {
  if (finished) return;
  finished = true;
  if (opt === currentQ.correct) {
    playSound('bigSmallCorrectSound');
    document.getElementById('bigsmall-result').textContent = 'ถูกต้อง!';
    saveStats(true);
  } else {
    playSound('bigSmallWrongSound');
    document.getElementById('bigsmall-result').textContent = 'ผิด ลองใหม่!';
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
