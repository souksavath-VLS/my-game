// เกมเดือนในปี (Click ลำดับ calendar)
const MONTHS = [
  'January','February','March','April','May','June','July','August','September','October','November','December'
];
let monthsGameOrder = [];
let monthsGameCurrent = 0;
let monthsGameTimer = null;
let monthsGameStartTime = 0;
let monthsGameFinished = false;
let monthsGameTargetOrder = [];

function startMonthsGame() {
  monthsGameOrder = shuffle([...MONTHS]);
  monthsGameTargetOrder = [...MONTHS];
  // สุ่มตำแหน่ง array
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  monthsGameCurrent = 0;
  monthsGameFinished = false;
  monthsGameStartTime = Date.now();
  renderMonthsCalendar();
  startMonthsTimer();
  document.getElementById('months-game-result').textContent = '';
}

function renderMonthsCalendar() {
  const cal = document.getElementById('months-game-calendar');
  cal.innerHTML = '';
  monthsGameOrder.forEach((month, idx) => {
    const div = document.createElement('div');
    div.className = 'months-calendar-cell';
    div.textContent = month;
    div.dataset.idx = idx;
    div.onclick = () => clickMonth(idx);
    // highlight เฉพาะเดือนที่คลิกถูกต้อง
    if (monthsGameCurrent > 0) {
      const correctMonths = monthsGameTargetOrder.slice(0, monthsGameCurrent);
      if (correctMonths.includes(month)) {
        div.style.background = '#cfc';
        div.style.color = '#388e3c';
      }
    }
    cal.appendChild(div);
  });
}

function clickMonth(idx) {
  if (monthsGameFinished) return;
  const monthClicked = monthsGameOrder[idx];
  const monthTarget = monthsGameTargetOrder[monthsGameCurrent];
  if (monthClicked === monthTarget) {
    playSound('correct');
    monthsGameCurrent++;
    renderMonthsCalendar();
    if (monthsGameCurrent === 12) {
      monthsGameFinished = true;
      playSound('win');
      endMonthsTimer();
      document.getElementById('months-game-result').textContent = 'จบเกม! คลิกเดือนครบ 12';
      saveMonthsStats(true);
    }
  } else {
    playSound('wrong');
    document.getElementById('months-game-result').textContent = 'ผิด ลำดับ!';
    saveMonthsStats(false);
  }
}

function startMonthsTimer() {
  monthsGameTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - monthsGameStartTime) / 1000);
    document.getElementById('months-game-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endMonthsTimer() {
  clearInterval(monthsGameTimer);
}

function playSound(type) {
  let audio;
  if (type === 'win') audio = new Audio('assets/sound/win.wav');
  else if (type === 'correct') audio = new Audio('assets/sound/correct.wav');
  else if (type === 'wrong') audio = new Audio('assets/sound/wrong.wav');
  if (audio) audio.play();
}

function saveMonthsStats(success) {
  // บันทึก stats ลง localStorage
  const stats = JSON.parse(localStorage.getItem('monthsStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: Math.floor((Date.now() - monthsGameStartTime) / 1000)
  });
  localStorage.setItem('monthsStats', JSON.stringify(stats));
}
