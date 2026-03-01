// เกมลากเส้นภาษาลาว สระ
// ตัวอย่างพยัญชนะ+สระ: ກະ, ກາ, ໂກະ, ໂກ, ເກະ, ເກ, ແກະ, ແກ, ກິ, ກີ, ກຶ, ກື, ກຸ, ກູ, ກົ, ເກັ, ເກີ, ເກື, ແກັ, ແກີ, ແກື, ໂກະ, ໂກັ, ໂກີ, ໄກ, ໃກ, ເກົາ
const laoVowelSamples = [
  'ກະ','ກາ','ໂກະ','ໂກ','ເກະ','ເກ','ແກະ','ແກ',
  'ກິ','ກີ','ກຶ','ກື','ກຸ','ກູ','ກົ','ເກັ','ເກີ','ເກື',
  'ແກັ','ແກີ','ແກື','ໂກະ','ໂກັ','ໂກີ','ໄກ','ໃກ','ເກົາ'
];

// สำหรับการวนซ้ำ
const laoVowels = laoVowelSamples;
let drawLaoVowelScore = 0;
let drawLaoVowelGameTimer = null;
let drawLaoVowelGameStartTime = 0;
let drawLaoVowelGameFinished = false;
let drawLaoVowelCurrentIdx = 0;

function startDrawLaoVowelGame() {
  drawLaoVowelScore = 0;
  drawLaoVowelGameFinished = false;
  drawLaoVowelGameStartTime = Date.now();
  drawLaoVowelCurrentIdx = 0;
  renderDrawLaoVowel();
  startDrawLaoVowelTimer();
  document.getElementById('draw-lao-vowel-game-result').textContent = '';
}

function renderDrawLaoVowel() {
  const area = document.getElementById('draw-lao-vowel-game-area');
  area.innerHTML = '';
  if (drawLaoVowelCurrentIdx >= laoVowels.length) return;
  const char = laoVowels[drawLaoVowelCurrentIdx];
  const charDiv = document.createElement('div');
  charDiv.className = 'draw-lao-char';
  charDiv.textContent = char;
  area.appendChild(charDiv);
  // วาด canvas
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 220;
  canvas.className = 'draw-lao-canvas';
  area.appendChild(canvas);
  // วาดเงาตัวอย่างตัวอักษร (ฟังก์ชันแยก)
  function drawShadow() {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.18;
    ctx.font = 'bold 120px Noto Sans Lao, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1976d2';
    ctx.fillText(char, canvas.width/2, canvas.height/2+10);
    ctx.restore();
  }
  drawShadow();
  let drawing = false;
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1976d2';
  canvas.addEventListener('mousedown', e => {
    drawing = true;
    ctx.beginPath();
  });
  canvas.addEventListener('mouseup', e => { drawing = false; });
  canvas.addEventListener('mouseleave', e => { drawing = false; });
  canvas.addEventListener('mousemove', e => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  });
  // ปุ่มลบเส้น
  const clearBtn = document.createElement('button');
  clearBtn.className = 'menu-btn draw-lao-btn';
  clearBtn.textContent = 'ลบเส้น';
  clearBtn.onclick = function() { drawShadow(); };
  area.appendChild(clearBtn);
  // ปุ่มเสร็จ
  const btn = document.createElement('button');
  btn.className = 'menu-btn draw-lao-btn';
  btn.textContent = 'เสร็จสิ้นตัวนี้';
  btn.onclick = checkDrawLaoVowel;
  area.appendChild(btn);
}

function checkDrawLaoVowel() {
  playSound('correct');
  drawLaoVowelScore++;
  drawLaoVowelCurrentIdx++;
  if (drawLaoVowelCurrentIdx < laoVowels.length) {
    renderDrawLaoVowel();
  } else {
    drawLaoVowelGameFinished = true;
    endDrawLaoVowelTimer();
    playSound('win');
    document.getElementById('draw-lao-vowel-game-result').textContent = 'ชนะ! ลากเส้นครบทุกสระ';
    saveDrawLaoVowelStats(true);
  }
}

function startDrawLaoVowelTimer() {
  drawLaoVowelGameTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - drawLaoVowelGameStartTime) / 1000);
    document.getElementById('draw-lao-vowel-game-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endDrawLaoVowelTimer() {
  clearInterval(drawLaoVowelGameTimer);
}

function playSound(type) {
  let audio;
  if (type === 'win') audio = new Audio('assets/sound/win.wav');
  else if (type === 'correct') audio = new Audio('assets/sound/correct.wav');
  else if (type === 'wrong') audio = new Audio('assets/sound/wrong.wav');
  if (audio) audio.play();
}

function saveDrawLaoVowelStats(success) {
  const stats = JSON.parse(localStorage.getItem('drawLaoVowelStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: Math.floor((Date.now() - drawLaoVowelGameStartTime) / 1000)
  });
  localStorage.setItem('drawLaoVowelStats', JSON.stringify(stats));
}
