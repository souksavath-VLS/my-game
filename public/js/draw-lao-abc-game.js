// เกมลากเส้นภาษาลาว ກ-ຮ
const laoChars = ['ກ','ຂ','ຄ','ງ','ຈ','ສ','ຊ','ຍ','ດ','ຕ','ນ','ບ','ປ','ຜ','ຝ','ພ','ຟ','ມ','ຢ','ຣ','ລ','ວ','ຫ','ຮ'];
let drawLaoScore = 0;
let drawLaoGameTimer = null;
let drawLaoGameStartTime = 0;
let drawLaoGameFinished = false;
let drawLaoCurrentIdx = 0;

function startDrawLaoABCGame() {
  drawLaoScore = 0;
  drawLaoGameFinished = false;
  drawLaoGameStartTime = Date.now();
  drawLaoCurrentIdx = 0;
  renderDrawLaoChar();
  startDrawLaoTimer();
  document.getElementById('draw-lao-game-result').textContent = '';
}

function renderDrawLaoChar() {
  const area = document.getElementById('draw-lao-game-area');
  area.innerHTML = '';
  if (drawLaoCurrentIdx >= laoChars.length) return;
  const char = laoChars[drawLaoCurrentIdx];
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
  btn.onclick = checkDrawLaoChar;
  area.appendChild(btn);
}

function checkDrawLaoChar() {
  playSound('correct');
  drawLaoScore++;
  drawLaoCurrentIdx++;
  if (drawLaoCurrentIdx < laoChars.length) {
    renderDrawLaoChar();
  } else {
    drawLaoGameFinished = true;
    endDrawLaoTimer();
    playSound('win');
    document.getElementById('draw-lao-game-result').textContent = 'ชนะ! ลากเส้นครบทุกตัวอักษร';
    saveDrawLaoStats(true);
  }
}

function startDrawLaoTimer() {
  drawLaoGameTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - drawLaoGameStartTime) / 1000);
    document.getElementById('draw-lao-game-timer').textContent = 'เวลา: ' + elapsed + ' วินาที';
  }, 500);
}

function endDrawLaoTimer() {
  clearInterval(drawLaoGameTimer);
}

function playSound(type) {
  let audio;
  if (type === 'win') audio = new Audio('assets/sound/win.wav');
  else if (type === 'correct') audio = new Audio('assets/sound/correct.wav');
  else if (type === 'wrong') audio = new Audio('assets/sound/wrong.wav');
  if (audio) audio.play();
}

function saveDrawLaoStats(success) {
  const stats = JSON.parse(localStorage.getItem('drawLaoStats') || '[]');
  stats.push({
    date: new Date().toISOString(),
    success,
    time: Math.floor((Date.now() - drawLaoGameStartTime) / 1000)
  });
  localStorage.setItem('drawLaoStats', JSON.stringify(stats));
}
