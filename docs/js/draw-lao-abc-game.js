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
  canvas.width = 320;
  canvas.height = 320;
  canvas.className = 'draw-lao-canvas';
  area.appendChild(canvas);
  // วาดเงาตัวอย่างตัวอักษร (ฟังก์ชันแยก)
  function drawShadow() {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.18;
    ctx.font = 'bold 180px Noto Sans Lao, sans-serif';
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
  // Touch events
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }, {passive: false});
  canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    drawing = false;
  }, {passive: false});
  canvas.addEventListener('touchcancel', function(e) {
    e.preventDefault();
    drawing = false;
  }, {passive: false});
  canvas.addEventListener('touchmove', function(e) {
    if (!drawing) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1976d2';
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }, {passive: false});
  // ปุ่มลบเส้นและเสร็จสิ้นใน row เดียวกัน
  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.flexDirection = 'row';
  btnRow.style.justifyContent = 'center';
  btnRow.style.gap = '1rem';
  btnRow.style.margin = '1.2rem 0';
  const clearBtn = document.createElement('button');
  clearBtn.className = 'menu-btn draw-lao-btn';
  clearBtn.textContent = 'ลบเส้น';
  clearBtn.onclick = function() { drawShadow(); };
  btnRow.appendChild(clearBtn);
  const btn = document.createElement('button');
  btn.className = 'menu-btn draw-lao-btn';
  btn.textContent = 'เสร็จสิ้นตัวนี้';
  btn.onclick = checkDrawLaoChar;
  btnRow.appendChild(btn);
  area.appendChild(btnRow);
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
