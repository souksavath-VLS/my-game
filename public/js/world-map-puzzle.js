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
    outline: 'https://cdn-icons-png.flaticon.com/512/14093/14093404.png'
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
    outline: 'https://cdn-icons-png.flaticon.com/512/7715/7715635.png'
  },
  {
    key: 'brazil',
    label: 'บราซิล',
    flag: 'https://upload.wikimedia.org/wikipedia/en/0/05/Flag_of_Brazil.svg',
    color: 'rgb(0, 156, 59)',
    outline: 'https://cdn-icons-png.flaticon.com/512/7715/7715636.png'
  },
  {
    key: 'russia',
    label: 'รัสเซีย',
    flag: 'https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg',
    color: 'rgb(0, 57, 166)',
    outline: 'https://cdn-icons-png.flaticon.com/512/7715/7715637.png'
  },
  {
    key: 'uk',
    label: 'อังกฤษ',
    flag: 'https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg',
    color: 'rgb(0, 36, 125)',
    outline: 'https://www.flaticon.com/free-icon/united-kingdom_7715638?term=uk&page=1&position=20&origin=search&related_id=7715638'
  },
  {
    key: 'germany',
    label: 'เยอรมนี',
    flag: 'https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg',
    color: 'rgb(0, 0, 0)',
    outline: 'https://www.flaticon.com/free-icon/germany_7715639?term=germany&page=1&position=21&origin=search&related_id=7715639'
  },
  {
    key: 'italy',
    label: 'อิตาลี',
    flag: 'https://upload.wikimedia.org/wikipedia/en/0/03/Flag_of_Italy.svg',
    color: 'rgb(0, 146, 70)',
    outline: 'https://www.flaticon.com/free-icon/italy_7715640?term=italy&page=1&position=22&origin=search&related_id=7715640'
  },
  {
    key: 'spain',
    label: 'สเปน',
    flag: 'https://upload.wikimedia.org/wikipedia/en/9/9a/Flag_of_Spain.svg',
    color: 'rgb(170, 28, 57)',
    outline: 'https://www.flaticon.com/free-icon/spain_7715641?term=spain&page=1&position=23&origin=search&related_id=7715641'
  }
];

let correctCount = 0;
let wrongCount = 0;
let startTime = null;
let timerInterval = null;
let selectedCountryIdx = null;

function renderMapPuzzle() {
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
  // สร้าง drop zone ใหญ่กลางหน้าจอ
  const dz = document.createElement('div');
  dz.className = 'drop-zone';
  dz.style.position = 'absolute';
  dz.style.left = '50%';
  dz.style.top = '50%';
  dz.style.transform = 'translate(-50%, -50%)';
  dz.style.width = '220px';
  dz.style.height = '140px';
  dz.style.background = target.color + '22';
  dz.style.border = '2px solid ' + target.color;
  dz.style.borderRadius = '16px';
  dz.style.display = 'flex';
  dz.style.alignItems = 'center';
  dz.style.justifyContent = 'center';
  dz.style.fontSize = '22px';
  dz.style.fontWeight = 'bold';
  dz.style.color = target.color;
  dz.dataset.key = target.key;
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('active'); };
  dz.ondragleave = e => dz.classList.remove('active');
  dz.ondrop = function(e) {
    e.preventDefault();
    dz.classList.remove('active');
    const draggedKey = e.dataTransfer.getData('text/plain');
    if (draggedKey === target.key) {
      dz.style.background = target.color;
      dz.innerHTML = `<img src="${target.flag}" alt="flag" style="width:40px;height:28px;vertical-align:middle;margin-right:10px;border:1px solid #ccc;border-radius:3px;"> <span>${target.label}</span>`;
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
    piece.style.width = '90px';
    piece.style.height = '60px';
    piece.style.display = 'flex';
    piece.style.alignItems = 'center';
    piece.style.justifyContent = 'center';
    piece.style.margin = '0 16px';
    piece.style.background = '#fff';
    piece.style.border = '2px solid #1976d2';
    piece.style.borderRadius = '10px';
    piece.style.boxShadow = '0 2px 8px rgba(25,118,210,0.10)';
    piece.innerHTML = `<img src="${p.flag}" alt="flag" style="width:64px;height:40px;object-fit:contain;display:block;">`;
    piece.draggable = true;
    piece.dataset.piece = p.key;
    piece.ondragstart = e => {
      e.dataTransfer.setData('text/plain', p.key);
    };
    piecesRow.appendChild(piece);
  });
  // แสดงชื่อประเทศใต้ drop zone
  countryName.textContent = '';
  // timer
  if (timerInterval) clearInterval(timerInterval);
  startTime = Date.now();
  document.getElementById('timer').textContent = 'เวลา: 0 วินาที';
  timerInterval = setInterval(() => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer').textContent = 'เวลา: ' + sec + ' วินาที';
  }, 500);
}

function checkWin() {
  if (correctCount === 1) {
    clearInterval(timerInterval);
    document.getElementById('result').textContent = 'เก่งมาก! จบเกมใน ' + Math.floor((Date.now() - startTime) / 1000) + ' วินาที';
    // เก็บสถิติใน localStorage
    let stats = JSON.parse(localStorage.getItem('worldMapPuzzleStats') || '[]');
    stats.push({
      time: Math.floor((Date.now() - startTime) / 1000),
      correct: correctCount,
      wrong: wrongCount,
      date: new Date().toISOString()
    });
    localStorage.setItem('worldMapPuzzleStats', JSON.stringify(stats));
  }
}

document.addEventListener('DOMContentLoaded', renderMapPuzzle);
