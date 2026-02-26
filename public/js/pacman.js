// js/pacman.js
// Pac-Man Pro: โครงสร้างเริ่มต้น (UI, กระดาน, Pac-Man, ผี, ดอท, power-up)

const ROWS = 21, COLS = 21;
let board = [], pacman = {}, ghosts = [], score = 0, lives = 3, gameInterval, isGameOver = false;

const WALL = 1, DOT = 2, POWER = 3, EMPTY = 0;

// ตัวอย่าง map (ขอบเป็น wall)
function createBoard() {
  board = [];
  for(let r=0;r<ROWS;r++) {
    board[r] = [];
    for(let c=0;c<COLS;c++) {
      if(r===0||r===ROWS-1||c===0||c===COLS-1) board[r][c]=WALL;
      else if((r%2===0 && c%2===0) && Math.random()<0.2) board[r][c]=WALL;
      else if((r===1||r===ROWS-2||c===1||c===COLS-2) && Math.random()<0.1) board[r][c]=POWER;
      else board[r][c]=DOT;
    }
  }
}

function renderBoard() {
  const el = document.getElementById('pacman-board');
  el.innerHTML = '';
  for(let r=0;r<ROWS;r++) {
    for(let c=0;c<COLS;c++) {
      const cell = document.createElement('div');
      cell.className = 'pacman-cell';
      if(board[r][c]===WALL) cell.classList.add('wall');
      if(board[r][c]===DOT) cell.classList.add('dot');
      if(board[r][c]===POWER) cell.classList.add('power');
      cell.style.position = 'relative';
      cell.dataset.row = r;
      cell.dataset.col = c;
      el.appendChild(cell);
    }
  }
}

function placePacman() {
  pacman = { row: Math.floor(ROWS/2), col: Math.floor(COLS/2), dir: 'left' };
  drawPacman();
}

function drawPacman() {
  const idx = pacman.row*COLS + pacman.col;
  const el = document.getElementById('pacman-board').children[idx];
  if(el) {
    const p = document.createElement('div');
    p.className = 'pacman';
    el.appendChild(p);
  }
}

function placeGhosts() {
  ghosts = [
    {row:1,col:1,color:'red'},
    {row:1,col:COLS-2,color:'blue'},
    {row:ROWS-2,col:1,color:'orange'},
    {row:ROWS-2,col:COLS-2,color:'green'}
  ];
  drawGhosts();
}

function drawGhosts() {
  ghosts.forEach(g=>{
    const idx = g.row*COLS + g.col;
    const el = document.getElementById('pacman-board').children[idx];
    if(el) {
      const ghost = document.createElement('div');
      ghost.className = 'ghost '+g.color;
      el.appendChild(ghost);
    }
  });
}

function resetGame() {
  score = 0;
  lives = 3;
  isGameOver = false;
  document.getElementById('pacman-score').innerText = score;
  document.getElementById('pacman-lives').innerText = lives;
  createBoard();
  renderBoard();
  placePacman();
  placeGhosts();
  if(gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(moveGhosts, 300);
}

document.getElementById('start-pacman-btn').onclick = function() {
  resetGame();
};

// Auto init board
resetGame();

function moveGhosts() {
  if(isGameOver) return;
  ghosts.forEach((ghost, idx)=>{
    // Clear old ghost
    const oldIdx = ghost.row*COLS + ghost.col;
    const oldCell = document.getElementById('pacman-board').children[oldIdx];
    if(oldCell) {
      [...oldCell.children].forEach(ch=>{if(ch.classList.contains('ghost')) ch.remove();});
    }
    // AI: move toward Pac-Man (basic)
    let dirs = [
      {dr:-1,dc:0,dir:'up'},
      {dr:1,dc:0,dir:'down'},
      {dr:0,dc:-1,dir:'left'},
      {dr:0,dc:1,dir:'right'}
    ];
    let best = null, minDist = Infinity;
    dirs.forEach(d=>{
      const nr = ghost.row+d.dr, nc = ghost.col+d.dc;
      if(board[nr][nc]!==WALL) {
        const dist = Math.abs(nr-pacman.row)+Math.abs(nc-pacman.col);
        if(dist<minDist) { minDist=dist; best=d; }
      }
    });
    if(best) {
      ghost.row += best.dr;
      ghost.col += best.dc;
    }
    // Check collision Pac-Man
    if(ghost.row===pacman.row && ghost.col===pacman.col) {
      lives--;
      document.getElementById('pacman-lives').innerText = lives;
      if(lives<=0) {
        gameOverPacman();
      } else {
        // Reset Pac-Man/ghosts
        placePacman();
        placeGhosts();
      }
    }
  });
  drawGhosts();
}

// --- Save Pac-Man stats to localStorage ---
function savePacmanStats(score) {
  const stats = JSON.parse(localStorage.getItem('pacmanStats') || '[]');
  stats.push({ score, date: Date.now() });
  localStorage.setItem('pacmanStats', JSON.stringify(stats));
}

// --- Call savePacmanStats when game over ---
function gameOverPacman() {
  if (isGameOver) return;
  isGameOver = true;
  clearInterval(gameInterval);
  savePacmanStats(score);
  alert('Game Over!');
}

// Pac-Man movement
document.addEventListener('keydown', function(e) {
  if(isGameOver) return;
  let dir = null;
  if(['ArrowUp','w','W'].includes(e.key)) dir = 'up';
  if(['ArrowDown','s','S'].includes(e.key)) dir = 'down';
  if(['ArrowLeft','a','A'].includes(e.key)) dir = 'left';
  if(['ArrowRight','d','D'].includes(e.key)) dir = 'right';
  if(dir) movePacman(dir);
});

function movePacman(dir) {
  let dr=0,dc=0;
  if(dir==='up') dr=-1;
  if(dir==='down') dr=1;
  if(dir==='left') dc=-1;
  if(dir==='right') dc=1;
  const nr = pacman.row+dr, nc = pacman.col+dc;
  if(board[nr][nc]===WALL) return;
  // Clear old Pac-Man
  const oldIdx = pacman.row*COLS + pacman.col;
  const oldCell = document.getElementById('pacman-board').children[oldIdx];
  if(oldCell) {
    [...oldCell.children].forEach(ch=>{if(ch.classList.contains('pacman')) ch.remove();});
  }
  pacman.row = nr;
  pacman.col = nc;
  pacman.dir = dir;
  // Eat dot
  if(board[nr][nc]===DOT) {
    board[nr][nc]=EMPTY;
    score+=10;
    document.getElementById('pacman-score').innerText = score;
    updateCell(nr, nc);
  }
  // Eat power-up
  if(board[nr][nc]===POWER) {
    board[nr][nc]=EMPTY;
    score+=50;
    document.getElementById('pacman-score').innerText = score;
    updateCell(nr, nc);
    // TODO: power-up effect (ghost vulnerable)
  }
  drawPacman();

// อัปเดต cell เดี่ยวหลัง dot/power-up หาย
function updateCell(r, c) {
  const idx = r*COLS + c;
  const cell = document.getElementById('pacman-board').children[idx];
  if(cell) {
    cell.classList.remove('dot','power');
  }
}
}
