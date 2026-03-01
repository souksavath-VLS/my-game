// kids-game.js - เกมจับคู่ภาพสำหรับเด็ก พร้อมเสียงและจับเวลา
const images = [
  'https://cdn.pixabay.com/photo/2017/01/06/19/15/fruit-1959753_1280.png',
  'https://cdn.pixabay.com/photo/2016/03/05/19/02/bananas-1238258_1280.jpg',
  'https://cdn.pixabay.com/photo/2017/01/20/15/06/grapes-1990980_1280.jpg',
  'https://cdn.pixabay.com/photo/2016/07/22/09/59/watermelon-1534494_1280.jpg',
  'https://cdn.pixabay.com/photo/2017/01/20/15/06/strawberry-1990981_1280.jpg',
  'https://cdn.pixabay.com/photo/2017/01/20/15/06/orange-1990982_1280.jpg',
  'https://cdn.pixabay.com/photo/2017/01/20/15/06/apple-1990983_1280.jpg',
  'https://cdn.pixabay.com/photo/2017/01/20/15/06/pear-1990984_1280.jpg',
  'https://cdn.pixabay.com/photo/2017/01/20/15/06/pineapple-1990985_1280.jpg',
  'https://cdn.pixabay.com/photo/2017/01/20/15/06/cherry-1990986_1280.jpg'
];
let cards = [];
let flipped = [];
let matched = [];
let startTime = null;
let timerInterval = null;

// --- เพิ่มตัวแปรระดับความยาก ---
let level = 1; // เริ่มต้น 1 คู่ (4 ใบ)

// --- เพิ่มฟังก์ชันสร้าง images ตามระดับ ---
function getLevelImages() {
  // ใช้ภาพ 10 แบบ (หากมีไม่พอจะใช้ emoji แทน)
  const allImages = [
    'https://cdn.pixabay.com/photo/2017/01/06/19/15/fruit-1959753_1280.png',
    'https://cdn.pixabay.com/photo/2016/03/05/19/02/bananas-1238258_1280.jpg',
    'https://cdn.pixabay.com/photo/2017/01/20/15/06/grapes-1990980_1280.jpg',
    'https://cdn.pixabay.com/photo/2016/07/22/09/59/watermelon-1534494_1280.jpg',
    'https://cdn.pixabay.com/photo/2017/01/20/15/06/strawberry-1990981_1280.jpg',
    'https://cdn.pixabay.com/photo/2017/01/20/15/06/orange-1990982_1280.jpg',
    'https://cdn.pixabay.com/photo/2017/01/20/15/06/apple-1990983_1280.jpg',
    'https://cdn.pixabay.com/photo/2017/01/20/15/06/pear-1990984_1280.jpg',
    'https://cdn.pixabay.com/photo/2017/01/20/15/06/pineapple-1990985_1280.jpg',
    'https://cdn.pixabay.com/photo/2017/01/20/15/06/cherry-1990986_1280.jpg'
  ];
  const fallbackEmoji = ['🍎','🍌','🍇','🍉','🍓','🍊','🍏','🍐','🍍','🍒'];
  let imgs = [];
  for(let i=0;i<level;i++) {
    imgs.push(allImages[i] || fallbackEmoji[i]);
  }
  return imgs;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderBoard() {
  const board = document.getElementById('game-board');
  board.innerHTML = '';
  cards.forEach((img, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.idx = idx;
    if (flipped.includes(idx) || matched.includes(idx)) {
      card.classList.add('flipped');
      if (img.startsWith('http')) {
        const imgElem = document.createElement('img');
        imgElem.src = img;
        imgElem.alt = 'fruit';
        imgElem.style.width = '70px';
        imgElem.style.height = '70px';
        imgElem.onerror = function() { this.style.display='none'; card.innerText = fallbackEmoji[idx%fallbackEmoji.length]; };
        card.appendChild(imgElem);
      } else {
        card.innerText = img;
      }
    }
    if (matched.includes(idx)) {
      card.classList.add('matched');
    }
    card.onclick = () => flipCard(idx);
    board.appendChild(card);
  });
}

function flipCard(idx) {
  if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;
  flipped.push(idx);
  renderBoard();
  if (flipped.length === 2) {
    setTimeout(checkMatch, 800);
  }
}

function checkMatch() {
  const [a, b] = flipped;
  if (cards[a] === cards[b]) {
    matched.push(a, b);
    playSound('correctSound');
    if (matched.length === cards.length) {
      clearInterval(timerInterval);
      let reward = '';
      const sec = Math.floor((Date.now() - startTime) / 1000);
      if (sec <= 20) reward = '🏅 เหรียญทอง!';
      else if (sec <= 35) reward = '⭐ ได้ดาว!';
      else reward = '🎉 ได้สติ๊กเกอร์!';
      document.getElementById('reward').innerText = `เก่งมาก! ${reward}`;
      playSound('congratsSound');
      playSound('winSound');
      // --- บันทึกสถิติลง localStorage (รองรับหลายเกม) ---
      let allStats = JSON.parse(localStorage.getItem('kidsGameStatsAll') || '{}');
      if (typeof allStats !== 'object' || allStats === null) allStats = {};
      if (!Array.isArray(allStats.memory)) allStats.memory = [];
      allStats.memory.push({ time: sec, reward, level, date: new Date().toISOString() });
      localStorage.setItem('kidsGameStatsAll', JSON.stringify(allStats));
      // ---
      setTimeout(() => {
        if(level < 15) {
          level++;
          document.getElementById('level-select').value = level;
          restartGame();
        }
      }, 1800);
      // ---
    }
  } else {
    playSound('wrongSound');
  }
  flipped = [];
  renderBoard();
}

function restartGame() {
  const imgs = getLevelImages();
  cards = shuffle([...imgs, ...imgs]);
  flipped = [];
  matched = [];
  document.getElementById('reward').innerText = '';
  renderBoard();
  startTime = Date.now();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 500);
}

function updateTimer() {
  if (!startTime) return;
  const now = Date.now();
  const sec = Math.floor((now - startTime) / 1000);
  document.getElementById('timer').innerText = `เวลาที่ใช้: ${sec} วินาที`;
}

document.getElementById('restartBtn').onclick = restartGame;
window.onload = restartGame;

// --- เพิ่ม UI เลือกระดับ ---
window.addEventListener('DOMContentLoaded', () => {
  let levelSel = document.createElement('select');
  levelSel.id = 'level-select';
  for(let i=1;i<=15;i++) {
    let opt = document.createElement('option');
    opt.value = i;
    opt.innerText = `ระดับ ${i} (${i*2} ใบ)`;
    if(i===level) opt.selected = true;
    levelSel.appendChild(opt);
  }
  levelSel.style.margin = '1rem auto';
  levelSel.style.display = 'block';
  levelSel.style.fontSize = '1.2rem';
  levelSel.style.borderRadius = '12px';
  levelSel.style.padding = '0.3rem 1.2rem';
  levelSel.style.background = '#fffbe7';
  levelSel.style.color = '#4caf50';
  levelSel.onchange = function() {
    level = parseInt(this.value);
    restartGame();
  };
  document.querySelector('.header')?.after(levelSel);
});

// --- เพิ่มปุ่มออกเกม ---
window.addEventListener('DOMContentLoaded', () => {
  let exitBtn = document.createElement('button');
  exitBtn.innerText = 'ออกเกม';
  exitBtn.className = 'menu-btn';
  exitBtn.style.background = '#ffebee';
  exitBtn.style.color = '#e53935';
  exitBtn.style.margin = '1rem auto';
  exitBtn.style.display = 'block';
  exitBtn.onclick = () => window.location.href = 'index.html';
  document.querySelector('.header')?.after(exitBtn);
});

// --- Animal Images (Pexels) ---
const animalImages = [
  'https://images.pexels.com/photos/145939/pexels-photo-145939.jpeg', // Cat
  'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', // Dog
  'https://images.pexels.com/photos/667205/pexels-photo-667205.jpeg', // Elephant
  'https://images.pexels.com/photos/247502/pexels-photo-247502.jpeg', // Lion
  'https://images.pexels.com/photos/208984/pexels-photo-208984.jpeg', // Monkey
  'https://images.pexels.com/photos/325781/pexels-photo-325781.jpeg', // Panda
  'https://images.pexels.com/photos/162203/pexels-photo-162203.jpeg', // Pig
  'https://images.pexels.com/photos/326012/pexels-photo-326012.jpeg', // Rabbit
  'https://images.pexels.com/photos/45911/pexels-photo-45911.jpeg', // Sheep
  'https://images.pexels.com/photos/1459390/pexels-photo-1459390.jpeg', // Tiger
  'https://images.pexels.com/photos/302280/pexels-photo-302280.jpeg', // Horse
  'https://images.pexels.com/photos/568900/pexels-photo-568900.jpeg', // Cow
  'https://images.pexels.com/photos/33392/pexels-photo-33392.jpeg', // Duck
  'https://images.pexels.com/photos/162240/pexels-photo-162240.jpeg', // Chicken
  'https://images.pexels.com/photos/45911/pexels-photo-45911.jpeg' // Goat
];
const fallbackEmoji = ['🐱','🐶','🐘','🦁','🐵','🐼','🐷','🐰','🐑','🐯','🐴','🐮','🦆','🐔','🐐'];

function getLevelImages() {
  let imgs = [];
  for(let i=0;i<level;i++) {
    imgs.push(animalImages[i] || fallbackEmoji[i]);
  }
  return imgs;
}

// --- เพิ่มเสียงตื่นเต้นเมื่อชนะ ---
let winSound = document.getElementById('winSound');

function playSound(id) {
  const el = document.getElementById(id);
  if (el) {
    el.pause();
    el.currentTime = 0;
    el.volume = 1.0; // เพิ่มความดังสูงสุด
    el.play();
  }
}
