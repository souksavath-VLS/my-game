// js/spaceinvaders.js
// Space Invaders Pro: โครงสร้างเริ่มต้น (UI, กระดาน, Player, Invaders, Bullet, Score)

const ROWS = 20, COLS = 20;
let board = [], player = {}, invaders = [], bullets = [], score = 0, gameInterval, isGameOver = false;

function createBoard() {
  board = [];
  for(let r=0;r<ROWS;r++) {
    board[r] = [];
    for(let c=0;c<COLS;c++) {
      board[r][c] = 0;
    }
  }
}

function renderBoard() {
  const el = document.getElementById('spaceinvaders-board');
  el.innerHTML = '';
  for(let r=0;r<ROWS;r++) {
    for(let c=0;c<COLS;c++) {
      const cell = document.createElement('div');
      cell.className = 'spaceinvaders-cell';
      el.appendChild(cell);
    }
  }
}

function placePlayer() {
  player = { row: ROWS-2, col: Math.floor(COLS/2) };
  drawPlayer();
}

function drawPlayer() {
  const idx = player.row*COLS + player.col;
  const el = document.getElementById('spaceinvaders-board').children[idx];
  if(el) {
    const p = document.createElement('div');
    p.className = 'spaceinvaders-player';
    el.appendChild(p);
  }
}

function placeInvaders() {
  invaders = [];
  for(let r=1;r<4;r++) {
    for(let c=2;c<COLS-2;c+=2) {
      invaders.push({row:r, col:c});
    }
  }
  drawInvaders();
}

function drawInvaders() {
  // ลบ invader เก่าทั้งหมดก่อน
  document.querySelectorAll('.spaceinvader').forEach(e=>e.remove());
  invaders.forEach(inv=>{
    const idx = inv.row*COLS + inv.col;
    const el = document.getElementById('spaceinvaders-board').children[idx];
    if(el) {
      const invader = document.createElement('div');
      invader.className = 'spaceinvader';
      el.appendChild(invader);
    }
  });
}

function resetGame() {
  score = 0;
  isGameOver = false;
  document.getElementById('spaceinvaders-score').innerText = score;
  createBoard();
  renderBoard();
  placePlayer();
  placeInvaders();
  bullets = [];
  if(gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, 120);
  if(window.invaderSpawnInterval) clearInterval(window.invaderSpawnInterval);
  window.invaderSpawnInterval = setInterval(spawnInvader, 2000);
  // timer
  window.spaceinvadersStartTime = Date.now();
  if(window.spaceinvadersTimerInterval) clearInterval(window.spaceinvadersTimerInterval);
  window.spaceinvadersTimerInterval = setInterval(updateTimer, 1000);
  setTimeout(updateTimer, 10);
}
// สุ่มเกิด invader ใหม่เรื่อยๆ
function spawnInvader() {
  if(isGameOver) return;
  // สุ่มตำแหน่งคอลัมน์
  let col = Math.floor(Math.random() * (COLS-4)) + 2;
  invaders.push({row:1, col:col});
  drawInvaders();
}

// ฟังก์ชันจับเวลา
function updateTimer() {
  if(window.spaceinvadersStartTime) {
    const elapsed = Math.floor((Date.now() - window.spaceinvadersStartTime)/1000);
    const min = String(Math.floor(elapsed/60)).padStart(2,'0');
    const sec = String(elapsed%60).padStart(2,'0');
    document.getElementById('spaceinvaders-timer').innerText = `${min}:${sec}`;
  }
}

document.getElementById('start-spaceinvaders-btn').onclick = function() {
  resetGame();
};

function gameLoop() {
  moveBullets();
  checkBulletHit();
  invaderStep++;
  if(invaderStep % 8 === 0) moveInvaders(); // เคลื่อนที่ช้าลงอีก
  // TODO: score, game over
}

let invaderDir = 1; // 1=right, -1=left
let invaderStep = 0;
let invaderDropStep = 0;
function moveInvaders() {
  // ลบ invader เก่า
  document.querySelectorAll('.spaceinvader').forEach(e=>e.remove());
  // เคลื่อนที่ซ้าย-ขวา
  let edge = false;
  for(let i=0;i<invaders.length;i++) {
    invaders[i].col += invaderDir;
    if(invaders[i].col <= 1 || invaders[i].col >= COLS-2) edge = true;
  }
  invaderStep++;
  // ถ้าถึงขอบ ให้เปลี่ยนทิศและเลื่อนลง (ช้าลง)
  if(edge) {
    invaderDir *= -1;
    invaderDropStep++;
    if(invaderDropStep % 2 === 0) { // ปรับค่าตรงนี้ให้ลงช้าหรือเร็วขึ้น
      for(let i=0;i<invaders.length;i++) {
        invaders[i].row += 1;
      }
      invaderDropStep = 0;
    }
  }
  drawInvaders();
}

function checkBulletHit() {
  for(let i=bullets.length-1;i>=0;i--) {
    for(let j=invaders.length-1;j>=0;j--) {
      if(bullets[i].row===invaders[j].row && bullets[i].col===invaders[j].col) {
        // ลบ invader และ bullet
        invaders.splice(j,1);
        bullets.splice(i,1);
        score+=100;
        document.getElementById('spaceinvaders-score').innerText = score;
        break;
      }
    }
  }
  // ลบ invader ที่ถูกยิงออกจากกระดาน
  document.querySelectorAll('.spaceinvader').forEach(e=>e.remove());
  drawInvaders();
}

function moveBullets() {
  // ลบกระสุนเก่า
  document.querySelectorAll('.spaceinvaders-bullet').forEach(b=>b.remove());
  // เคลื่อนที่ขึ้นบน
  for(let i=bullets.length-1;i>=0;i--) {
    bullets[i].row--;
    // ลบกระสุนที่ออกนอกกระดาน
    if(bullets[i].row<0) bullets.splice(i,1);
  }
  drawBullets();
}

// Player controls


document.addEventListener('keydown', function(e) {
  if(isGameOver) return;
  if(['ArrowLeft','a','A'].includes(e.key)) movePlayer(-1);
  if(['ArrowRight','d','D'].includes(e.key)) movePlayer(1);
});

// ยิงอัตโนมัติ
let autoFireInterval = setInterval(()=>{
  if(!isGameOver) shootBullet();
}, 600);

function movePlayer(dir) {
  const newCol = player.col + dir;
  if(newCol>=0 && newCol<COLS) {
    // Clear old player
    const oldIdx = player.row*COLS + player.col;
    const oldCell = document.getElementById('spaceinvaders-board').children[oldIdx];
    if(oldCell) {
      [...oldCell.children].forEach(ch=>{if(ch.classList.contains('spaceinvaders-player')) ch.remove();});
    }
    player.col = newCol;
    drawPlayer();
  }
}

function shootBullet() {
  bullets.push({row: player.row-1, col: player.col});
  drawBullets();
}

function drawBullets() {
  bullets.forEach(b=>{
    const idx = b.row*COLS + b.col;
    const el = document.getElementById('spaceinvaders-board').children[idx];
    if(el) {
      const bullet = document.createElement('div');
      bullet.className = 'spaceinvaders-bullet';
      el.appendChild(bullet);
    }
  });
}
