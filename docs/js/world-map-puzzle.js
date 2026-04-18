const COUNTRIES = [
  {
    key: 'thailand',
    label: 'ประเทศไทย',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Flag_of_Thailand.svg',
    color: 'rgb(0, 102, 204)',
    outline: 'https://cdn-icons-png.flaticon.com/512/14093/14093403.png'
  },
  {
    key: 'japan',
    label: 'ญี่ปุ่น',
    flag: 'https://upload.wikimedia.org/wikipedia/en/9/9e/Flag_of_Japan.svg',
    color: 'rgb(220, 0, 0)',
    outline: 'https://cdn-icons-png.flaticon.com/512/12659/12659726.png'
  },
  {
    key: 'france',
    label: 'ฝรั่งเศส',
    flag: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg',
    color: 'rgb(0, 85, 164)',
    outline: 'https://cdn-icons-png.flaticon.com/512/3199/3199868.png'
  },
  {
    key: 'usa',
    label: 'สหรัฐอเมริกา',
    flag: 'https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg',
    color: 'rgb(60, 59, 110)',
    outline: 'https://cdn-icons-png.flaticon.com/512/14421/14421468.png'
  },
  {
    key: 'china',
    label: 'จีน',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_the_People%27s_Republic_of_China.svg',
    color: 'rgb(222, 41, 16)',
    outline: 'https://cdn-icons-png.flaticon.com/512/7715/7715634.png'
  },
  {
    key: 'india',
    label: 'อินเดีย',
    flag: 'https://upload.wikimedia.org/wikipedia/en/4/41/Flag_of_India.svg',
    color: 'rgb(255, 153, 51)',
    outline: 'https://cdn-icons-png.flaticon.com/512/7715/7715692.png'
  },
  // {
  //   key: 'brazil',
  //   label: 'บราซิล',
  //   flag: 'https://upload.wikimedia.org/wikipedia/en/0/05/Flag_of_Brazil.svg',
  //   color: 'rgb(0, 156, 59)',
  //   outline: 'https://cdn-icons-png.flaticon.com/512/474/47442.png'
  // },
  {
    key: 'russia',
    label: 'รัสเซีย',
    flag: 'https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg',
    color: 'rgb(0, 57, 166)',
    outline: 'https://cdn-icons-png.flaticon.com/512/14464/14464748.png'
  },
  {
    key: 'united kingdom',
    label: 'อังกฤษ',
    flag: 'https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg',
    color: 'rgb(0, 36, 125)',
    outline: 'https://cdn-icons-png.flaticon.com/512/5866/5866447.png'
  },
  {
    key: 'germany',
    label: 'เยอรมนี',
    flag: 'https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg',
    color: 'rgb(0, 0, 0)',
    outline: 'https://cdn-icons-png.flaticon.com/512/7715/7715668.png'
  },
  {
    key: 'italy',
    label: 'อิตาลี',
    flag: 'https://upload.wikimedia.org/wikipedia/en/0/03/Flag_of_Italy.svg',
    color: 'rgb(0, 146, 70)',
    outline: 'https://cdn-icons-png.flaticon.com/512/5866/5866539.png'
  },
  {
    key: 'spain',
    label: 'สเปน',
    flag: 'https://upload.wikimedia.org/wikipedia/en/9/9a/Flag_of_Spain.svg',
    color: 'rgb(170, 28, 57)',
    outline: 'https://cdn-icons-png.flaticon.com/512/5880/5880890.png'
  },
  {
    key: 'laos',
    label: 'ลาว',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Flag_of_Laos.svg',
    color: '#002868',
    outline: 'https://cdn-icons-png.flaticon.com/512/7715/7715732.png'
  },
  {
    key: 'vietnam',
    label: 'เวียดนาม',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg',
    color: '#da251d',
    outline: 'https://cdn-icons-png.flaticon.com/512/14464/14464785.png'
  },
  {
    key: 'cambodia',
    label: 'กัมพูชา',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Flag_of_Cambodia.svg',
    color: '#032ea1',
    outline: 'https://cdn-icons-png.flaticon.com/512/7715/7715628.png'
  }
];

let correctCount = 0;
let wrongCount = 0;
let startTime = null;
let timerInterval = null;
let selectedCountryIdx = null;
let gameCount = 0;
let maxGames = 10;
let totalTime = 0;

function renderMapPuzzle() {
    // ปิดปุ่มเริ่มใหม่ถ้ายังไม่ครบ 10 เกม
    const btn = document.querySelector('button[onclick="resetGame()"]');
    if (btn) btn.disabled = gameCount < maxGames;
  const board = document.getElementById('map-board');
  const piecesRow = document.getElementById('pieces-row');
  const outlineImg = document.getElementById('map-outline');
  const countryName = document.getElementById('country-name');
  // ลบ drop zone เดิม
  Array.from(board.querySelectorAll('.drop-zone')).forEach(e => e.remove());
  // ลบชิ้น puzzle เดิม
  piecesRow.innerHTML = '';
  countryName.textContent = '';
  // สุ่มประเทศเป้าหมาย
  if (selectedCountryIdx === null) {
    selectedCountryIdx = Math.floor(Math.random() * COUNTRIES.length);
  }
  const target = COUNTRIES[selectedCountryIdx];
  // แสดง outline ของประเทศเป้าหมาย
  outlineImg.src = target.outline;
  // สร้าง drop zone ใหญ่กลางหน้าจอ พร้อมข้อความ
  const dz = document.createElement('div');
  dz.className = 'drop-zone';
  dz.style.position = 'absolute';
  dz.style.left = '50%';
  dz.style.top = '50%';
  dz.style.transform = 'translate(-50%, -50%)';
  dz.style.width = '300px';
  dz.style.height = '200px';
  dz.style.background = target.color + '22';
  dz.style.border = '3px dashed ' + target.color;
  dz.style.borderRadius = '28px';
  dz.style.display = 'flex';
  dz.style.alignItems = 'center';
  dz.style.justifyContent = 'center';
  dz.style.fontSize = '26px';
  dz.style.fontWeight = 'bold';
  dz.style.color = target.color;
  dz.style.transition = 'background 0.2s, border 0.2s';
  dz.dataset.key = target.key;
  dz.innerHTML = '<span style="opacity:0.7;">ลากธงมาวางที่นี่</span>';
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('active'); dz.style.border = '3px solid ' + target.color; dz.style.background = '#e3f2fd'; };
  dz.ondragleave = e => { dz.classList.remove('active'); dz.style.border = '3px dashed ' + target.color; dz.style.background = target.color + '22'; };
  dz.ondrop = function(e) {
    e.preventDefault();
    dz.classList.remove('active');
    dz.style.border = '3px dashed ' + target.color;
    dz.style.background = target.color + '22';
    const draggedKey = e.dataTransfer.getData('text/plain');
    if (draggedKey === target.key) {
      dz.style.background = target.color;
      dz.innerHTML = `<img src="${target.flag}" alt="flag" style="width:56px;height:38px;vertical-align:middle;margin-right:10px;border:1.5px solid #fff;border-radius:5px;box-shadow:0 2px 8px #0002;"> <span>${target.label}</span>`;
      dz.style.color = '#fff';
      dz.style.opacity = 1;
      correctCount++;
      document.getElementById('correct').textContent = 'ถูก: ' + correctCount;
      document.querySelector(`[data-piece='${draggedKey}']`).remove();
      countryName.textContent = target.label;
      checkWin();
    } else {
      dz.style.background = '#ffcdd2';
      setTimeout(() => { dz.style.background = target.color + '22'; }, 700);
      wrongCount++;
      document.getElementById('wrong').textContent = 'ผิด: ' + wrongCount;
    }
  };
  board.appendChild(dz);
  // สุ่มตัวเลือกธง 3 อัน (รวม target)
  let options = [target];
  // เพิ่มอีก 2 ตัวเลือกที่ไม่ซ้ำ target
  const others = COUNTRIES.filter(c => c.key !== target.key);
  while (options.length < 3 && others.length > 0) {
    const idx = Math.floor(Math.random() * others.length);
    options.push(others[idx]);
    others.splice(idx, 1);
  }
  // สุ่มตำแหน่ง
  const shuffled = options.sort(() => Math.random() - 0.5);
  shuffled.forEach(p => {
    const piece = document.createElement('div');
    piece.className = 'puzzle-piece';
    piece.style.width = '110px';
    piece.style.height = '74px';
    piece.style.display = 'flex';
    piece.style.alignItems = 'center';
    piece.style.justifyContent = 'center';
    piece.style.margin = '0 18px';
    piece.style.background = '#fff';
    piece.style.border = '2.5px solid #1976d2';
    piece.style.borderRadius = '12px';
    piece.style.boxShadow = '0 2px 12px rgba(25,118,210,0.13)';
    piece.style.transition = 'box-shadow 0.2s, border 0.2s';
    piece.innerHTML = `<img src="${p.flag}" alt="flag" style="width:80px;height:52px;object-fit:contain;display:block;">`;
    piece.draggable = true;
    piece.dataset.piece = p.key;
    piece.ondragstart = e => {
      e.dataTransfer.setData('text/plain', p.key);
      piece.style.boxShadow = '0 4px 24px #1976d288';
      piece.style.border = '2.5px solid #388e3c';
    };
    piece.ondragend = e => {
      piece.style.boxShadow = '0 2px 12px rgba(25,118,210,0.13)';
      piece.style.border = '2.5px solid #1976d2';
    };
    piece.onmouseover = () => { piece.style.boxShadow = '0 4px 24px #1976d288'; };
    piece.onmouseout = () => { piece.style.boxShadow = '0 2px 12px rgba(25,118,210,0.13)'; };
    // Touch event support
    let touchDragging = false;
    let touchKey = null;
    piece.addEventListener('touchstart', function(e) {
      touchDragging = true;
      touchKey = p.key;
      piece.style.opacity = 0.6;
    });
    piece.addEventListener('touchmove', function(e) {
      if (!touchDragging) return;
      const touch = e.touches[0];
      piece.style.position = 'absolute';
      piece.style.left = (touch.pageX - 55) + 'px';
      piece.style.top = (touch.pageY - 37) + 'px';
      piece.style.zIndex = 999;
      e.preventDefault();
    });
    piece.addEventListener('touchend', function(e) {
      if (!touchDragging) return;
      piece.style.opacity = 1;
      piece.style.position = '';
      piece.style.left = '';
      piece.style.top = '';
      piece.style.zIndex = '';
      // ตรวจสอบ drop zone
      const dz = document.querySelector('.drop-zone');
      if (dz) {
        const rect = dz.getBoundingClientRect();
        const touch = e.changedTouches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        if (
          x >= rect.left && x <= rect.right &&
          y >= rect.top && y <= rect.bottom
        ) {
          // simulate drop
          onDropZoneTouch(touchKey);
        }
      }
      touchDragging = false;
      touchKey = null;
    });
    piecesRow.appendChild(piece);
  });
  // สำหรับ touch event drop zone
  function onDropZoneTouch(draggedKey) {
    const dz = document.querySelector('.drop-zone');
    if (!dz) return;
    const target = COUNTRIES[selectedCountryIdx];
    if (draggedKey === target.key) {
      dz.style.background = target.color;
      dz.innerHTML = `<img src="${target.flag}" alt="flag" style="width:56px;height:38px;vertical-align:middle;margin-right:10px;border:1.5px solid #fff;border-radius:5px;box-shadow:0 2px 8px #0002;"> <span>${target.label}</span>`;
      dz.style.color = '#fff';
      dz.style.opacity = 1;
      correctCount++;
      document.getElementById('correct').textContent = 'ถูกต้อง: ' + correctCount;
      const piece = document.querySelector(`[data-piece='${draggedKey}']`);
      if (piece) piece.remove();
      document.getElementById('country-name').textContent = target.label;
      checkWin();
    } else {
      dz.style.background = '#ffcdd2';
      setTimeout(() => { dz.style.background = target.color + '22'; }, 700);
      wrongCount++;
      document.getElementById('wrong').textContent = 'ผิด: ' + wrongCount;
    }
  }
  // แสดงชื่อประเทศใต้ drop zone
  countryName.textContent = '';
  // timer (เริ่มใหม่เฉพาะเกมแรก)
  if (gameCount === 0) {
    if (timerInterval) clearInterval(timerInterval);
    startTime = Date.now();
    document.getElementById('timer').textContent = 'เวลา: 0 วินาที';
    timerInterval = setInterval(() => {
      const sec = Math.floor((Date.now() - startTime) / 1000);
      document.getElementById('timer').textContent = 'เวลา: ' + sec + ' วินาที';
    }, 500);
  }
}

function checkWin() {
  if (correctCount === 1) {
    gameCount++;
    totalTime = Date.now() - startTime;
    if (gameCount < maxGames) {
      // ไปเกมถัดไป (สุ่มประเทศใหม่)
      correctCount = 0;
      wrongCount = 0;
      selectedCountryIdx = null;
      setTimeout(() => {
        renderMapPuzzle();
      }, 800);
      document.getElementById('result').textContent = 'ผ่าน ' + gameCount + ' / ' + maxGames + ' เกม';
    } else {
      // จบครบ 10 เกม
      if (timerInterval) clearInterval(timerInterval);
      document.getElementById('result').textContent = 'จบครบ 10 เกม! ใช้เวลา ' + Math.floor(totalTime / 1000) + ' วินาที';
      // เปิดปุ่มเริ่มใหม่
      const btn = document.querySelector('button[onclick="resetGame()"]');
      if (btn) btn.disabled = false;
      // เก็บสถิติใน localStorage
      let stats = JSON.parse(localStorage.getItem('worldMapPuzzleStats') || '[]');
      stats.push({
        time: Math.floor(totalTime / 1000),
        correct: gameCount,
        wrong: wrongCount,
        date: new Date().toISOString()
      });
      localStorage.setItem('worldMapPuzzleStats', JSON.stringify(stats));
    }
  }

}

// ปุ่มเริ่มใหม่ (global)
function resetGame() {
  correctCount = 0;
  wrongCount = 0;
  gameCount = 0;
  totalTime = 0;
  selectedCountryIdx = null;
  document.getElementById('correct').textContent = 'ถูก: 0';
  document.getElementById('wrong').textContent = 'ผิด: 0';
  document.getElementById('result').textContent = '';
  renderMapPuzzle();
}


document.addEventListener('DOMContentLoaded', renderMapPuzzle);
