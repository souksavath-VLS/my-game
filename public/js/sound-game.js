// เกมฟังเสียงสำหรับเด็ก 3-5 ปี
// ตัวอย่าง: ใช้เสียงสัตว์ (สามารถเปลี่ยน/เพิ่มได้)

const SOUNDS = [
  { name: 'แมว', file: 'cat.wav', img: 'https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg?auto=compress&w=120&h=120&fit=crop' },
  { name: 'หมา', file: 'dog.wav', img: 'https://images.pexels.com/photos/3361739/pexels-photo-3361739.jpeg?auto=compress&w=120&h=120&fit=crop' },
  { name: 'วัว', file: 'cow.wav', img: 'https://images.pexels.com/photos/5770400/pexels-photo-5770400.jpeg?auto=compress&w=120&h=120&fit=crop' },
  { name: 'เป็ด', file: 'duck.wav', img: 'https://images.pexels.com/photos/28849120/pexels-photo-28849120.jpeg?auto=compress&w=120&h=120&fit=crop' },
  { name: 'ไก่', file: 'chicken.wav', img: 'https://images.pexels.com/photos/4554155/pexels-photo-4554155.jpeg?auto=compress&w=120&h=120&fit=crop' },
  { name: 'ช้าง', file: 'elephant.wav', img: 'https://images.pexels.com/photos/667205/pexels-photo-667205.jpeg?auto=compress&w=120&h=120&fit=crop' },
  { name: 'ม้า', file: 'horse.wav', img: 'https://images.pexels.com/photos/209065/pexels-photo-209065.jpeg?auto=compress&w=120&h=120&fit=crop' },
  { name: 'แกะ', file: 'sheep.wav', img: 'https://images.pexels.com/photos/14635235/pexels-photo-14635235.jpeg?auto=compress&w=120&h=120&fit=crop' }
];


let currentSound = null;
let score = 0;
let round = 0;
const maxRounds = 8;
let startTime = null;
let endTime = null;

function playGameSound(file) {
  const audio = document.getElementById('gameSound');
  audio.src = `assets/sound/sound-game/${file}`;
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 1.0;
  audio.play();
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

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function nextSoundRound() {
  round++;
  if (round === 1) {
    startTime = Date.now();
  }
  if (round > maxRounds) {
    endTime = Date.now();
    const timeUsed = ((endTime - startTime) / 1000).toFixed(1);
    document.getElementById('sound-question').textContent = 'เก่งมาก! คุณฟังเสียงได้ถูกต้องทั้งหมด';
    document.getElementById('sound-options').innerHTML = '';
    document.getElementById('sound-result').innerHTML = `ใช้เวลา: <b>${timeUsed}</b> วินาที`;
    playSfx('soundCongrats');
    setTimeout(() => playSfx('soundWin'), 1200);
    saveSoundGameStat(timeUsed);
    return;
  }
  const sound = SOUNDS[Math.floor(Math.random() * SOUNDS.length)];
  currentSound = sound;
  document.getElementById('sound-question').textContent = `รอบที่ ${round}`;
  renderSoundOptions(sound);
  document.getElementById('sound-result').textContent = '';
}


function renderSoundOptions(answerSound) {
  const options = shuffle([answerSound, ...shuffle(SOUNDS.filter(s => s !== answerSound)).slice(0, 2)]);
  const container = document.getElementById('sound-options');
  container.innerHTML = '';
  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'color-btn';
    btn.style.background = '#fff';
    btn.style.border = '2px solid #eee';
    btn.style.width = '120px';
    btn.style.height = '120px';
    btn.style.margin = '16px';
    btn.style.padding = '0';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.onclick = () => handleSoundSelect(opt);
    const img = document.createElement('img');
    img.src = opt.img;
    img.alt = opt.name;
    img.style.width = '100px';
    img.style.height = '100px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '50%';
    btn.appendChild(img);
    container.appendChild(btn);
  });
}

function handleSoundSelect(selected) {
  if (!currentSound) return;
  if (selected.name === currentSound.name) {
    score++;
    document.getElementById('sound-result').textContent = 'ถูกต้อง!';
    playSfx('soundCorrect');
    setTimeout(nextSoundRound, 900);
  } else {
    document.getElementById('sound-result').textContent = 'ลองใหม่อีกครั้ง!';
    playSfx('soundWrong');
  }
}


document.getElementById('restartSoundBtn').onclick = () => {
  score = 0;
  round = 0;
  startTime = null;
  endTime = null;
  nextSoundRound();
};

document.getElementById('playSoundBtn').onclick = () => {
  if (currentSound) playGameSound(currentSound.file);
};


window.onload = () => {
  score = 0;
  round = 0;
  startTime = null;
  endTime = null;
  nextSoundRound();
};
// เก็บสถิติลง localStorage
function saveSoundGameStat(timeUsed) {
  const stats = JSON.parse(localStorage.getItem('soundGameStats') || '[]');
  const now = new Date();
  stats.push({
    date: now.toISOString(),
    time: Number(timeUsed),
    rounds: maxRounds
  });
  localStorage.setItem('soundGameStats', JSON.stringify(stats));
}
