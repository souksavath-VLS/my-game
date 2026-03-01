// เกมวันในสัปดาห์ (Memory Match Icons)
const WEEKDAYS = [
  { name: 'Monday', icon: '🌞' },
  { name: 'Tuesday', icon: '🌱' },
  { name: 'Wednesday', icon: '🌻' },
  { name: 'Thursday', icon: '🌊' },
  { name: 'Friday', icon: '🌟' },
  { name: 'Saturday', icon: '🌈' },
  { name: 'Sunday', icon: '🍀' }
];
let weekGameCards = [];
let weekGameFlipped = [];
let weekGameMatched = 0;
let weekGameTimer = null;
let weekGameStartTime = 0;
let weekGameFinished = false;

function startWeekdaysGame() {
  weekGameMatched = 0;
  weekGameFlipped = [];
  weekGameFinished = false;
  weekGameStartTime = Date.now();
  weekGameCards = shuffle([...WEEKDAYS, ...WEEKDAYS]);
  renderWeekCards();
  startWeekTimer();
  document.getElementById('weekdays-game-result').textContent = '';
}

function renderWeekCards() {
  const board = document.getElementById('weekdays-game-board');
  board.innerHTML = '';
  weekGameCards.forEach((card, idx) => {
    const div = document.createElement('div');
    div.className = 'weekdays-card';
    div.dataset.idx = idx;
    div.onclick = () => flipWeekCard(idx);
    div.innerHTML = '<div class="weekdays-card-inner"><div class="weekdays-card-front"></div><div class="weekdays-card-back">' + card.icon + '<br><span>' + card.name + '</span></div></div>';
    board.appendChild(div);
  });
}

function flipWeekCard(idx) {
  if (weekGameFinished) return;
  const cardDivs = document.querySelectorAll('.weekdays-card');
  if (weekGameFlipped.length === 2 || cardDivs[idx].classList.contains('matched') || cardDivs[idx].classList.contains('flipped')) return;
  cardDivs[idx].classList.add('flipped');
  weekGameFlipped.push(idx);
  if (weekGameFlipped.length === 2) {
    const [i1, i2] = weekGameFlipped;
    if (weekGameCards[i1].name === weekGameCards[i2].name) {
      setTimeout(() => {
        cardDivs[i1].classList.add('matched');
        cardDivs[i2].classList.add('matched');
        playSound('correct');
        weekGameMatched++;
        if (weekGameMatched === 7) {
          weekGameFinished = true;
          playSound('win');
          endWeekTimer();
          document.getElementById('weekdays-game-result').textContent = 'จบเกม! จำวันได้ครบ';
          saveWeekStats(true);
        }
        weekGameFlipped = [];
      }, 600);
    } else {
      setTimeout(() => {
        cardDivs[i1].classList.remove('flipped');
        cardDivs[i2].classList.remove('flipped');
        playSound('wrong');
        document.getElementById('weekdays-game-result').textContent = 'ผิด ลองใหม่!';
        saveWeekStats(false);
        weekGameFlipped = [];
      }, 900);
    }
  }
}

function startWeekTimer() {
  weekGameTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - weekGameStartTime) / 1000);
    document.getElementById('weekdays-game-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endWeekTimer() {
  clearInterval(weekGameTimer);
}

function playSound(type) {
  let audio;
  if (type === 'win') audio = new Audio('assets/sound/win.wav');
  else if (type === 'correct') audio = new Audio('assets/sound/correct.wav');
  else if (type === 'wrong') audio = new Audio('assets/sound/wrong.wav');
  if (audio) audio.play();
}

function saveWeekStats(success) {
  // บันทึก stats ลง localStorage
  const stats = JSON.parse(localStorage.getItem('weekdaysStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: Math.floor((Date.now() - weekGameStartTime) / 1000)
  });
  localStorage.setItem('weekdaysStats', JSON.stringify(stats));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
