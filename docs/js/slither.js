// js/slither.js
// Slither (Snake Multiplayer/Bot) - โครงสร้างเริ่มต้น


let ROWS = 30, COLS = 30;
if (window.innerWidth <= 600) {
  // สำหรับมือถือ: ใช้ 16 แถว 9 คอลัมน์ (9:16)
  ROWS = 16;
  COLS = 9;
}
let board = [], snakes = [], foods = [], score = 0, gameInterval, isGameOver = false;

function createBoard() {
  board = [];
  for(let r=0;r<ROWS;r++) {
    board[r] = [];
    for(let c=0;c<COLS;c++) {
      board[r][c] = 0;
    }
  }
}

function placePlayerSnake() {
  snakes[0] = [
    {row: Math.floor(ROWS/2), col: Math.floor(COLS/2)},
    {row: Math.floor(ROWS/2), col: Math.floor(COLS/2)-1},
    {row: Math.floor(ROWS/2), col: Math.floor(COLS/2)-2}
  ];
}

function placeBotSnake() {
  snakes[1] = [
    {row: 5, col: 5},
    {row: 5, col: 4},
    {row: 5, col: 3}
  ];
}

function placeFood() {
  let r, c;
  do {
    r = Math.floor(Math.random()*ROWS);
    c = Math.floor(Math.random()*COLS);
  } while(snakes.flat().some(s=>s.row===r&&s.col===c));
  foods.push({row:r, col:c});
}

function renderBoard() {
  const el = document.getElementById('slither-board');
  el.innerHTML = '';
  for(let r=0;r<ROWS;r++) {
    for(let c=0;c<COLS;c++) {
      const cell = document.createElement('div');
      cell.className = 'slither-cell';
      el.appendChild(cell);
    }
  }
}

function drawSnakes() {
  snakes.forEach((snake, idx) => {
    snake.forEach((s, i) => {
      const cellIdx = s.row*COLS + s.col;
      const el = document.getElementById('slither-board').children[cellIdx];
      if(el) el.classList.add(idx===0 ? (i===0?'slither-head':'slither-body') : (i===0?'slither-bot-head':'slither-bot-body'));
    });
  });
}

function drawFoods() {
  foods.forEach(f => {
    const idx = f.row*COLS + f.col;
    const el = document.getElementById('slither-board').children[idx];
    if(el) el.classList.add('slither-food');
  });
}

function resetGame() {
  score = 0;
  isGameOver = false;
  snakes = [];
  foods = [];
  playerDir = 'right'; // reset direction
  createBoard();
  renderBoard();
  placePlayerSnake();
  placeBotSnake();
  placeFood();
  drawSnakes();
  drawFoods();
  if(gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, 120);
}

document.getElementById('start-slither-btn').onclick = function() {
  resetGame();
};

// --- Move snakes, AI, eat food, collision ---
let botDir = 'right';
function gameLoop() {
  if(isGameOver) return;
  movePlayerSnake();
  moveBotSnake();
  checkEatFood();
  checkCollision();
  renderBoard();
  drawSnakes();
  drawFoods();
  document.getElementById('slither-score').innerText = score;
}

function movePlayerSnake() {
  let dr=0,dc=0;
  if(playerDir==='up') dr=-1;
  if(playerDir==='down') dr=1;
  if(playerDir==='left') dc=-1;
  if(playerDir==='right') dc=1;
  const head = {row: snakes[0][0].row+dr, col: snakes[0][0].col+dc};
  snakes[0].unshift(head);
  snakes[0].pop();
}

function moveBotSnake() {
  // Simple AI: move toward nearest food (greedy)
  const bot = snakes[1];
  if(!bot || bot.length===0) return;
  let target = foods[0];
  if(!target) return;
  let dr = target.row - bot[0].row;
  let dc = target.col - bot[0].col;
  let move;
  if(Math.abs(dr) > Math.abs(dc)) move = {dr: Math.sign(dr), dc: 0};
  else move = {dr: 0, dc: Math.sign(dc)};
  const head = {row: bot[0].row+move.dr, col: bot[0].col+move.dc};
  bot.unshift(head);
  bot.pop();
}

function checkEatFood() {
  // Player
  let head = snakes[0][0];
  for(let i=0;i<foods.length;i++) {
    if(head.row===foods[i].row && head.col===foods[i].col) {
      score+=10;
      foods.splice(i,1);
      snakes[0].push({...snakes[0][snakes[0].length-1]});
      placeFood();
      break;
    }
  }
  // Bot
  let botHead = snakes[1][0];
  for(let i=0;i<foods.length;i++) {
    if(botHead.row===foods[i].row && botHead.col===foods[i].col) {
      foods.splice(i,1);
      snakes[1].push({...snakes[1][snakes[1].length-1]});
      placeFood();
      break;
    }
  }
}

function checkCollision() {
  // Player hit wall
  let head = snakes[0][0];
  if(head.row<0||head.row>=ROWS||head.col<0||head.col>=COLS) return gameOver();
  // Player hit self
  for(let i=1;i<snakes[0].length;i++) if(head.row===snakes[0][i].row&&head.col===snakes[0][i].col) return gameOver();
  // Player hit bot
  for(let i=0;i<snakes[1].length;i++) if(head.row===snakes[1][i].row&&head.col===snakes[1][i].col) return gameOver();
  // Bot hit wall
  let botHead = snakes[1][0];
  if(botHead.row<0||botHead.row>=ROWS||botHead.col<0||botHead.col>=COLS) return resetBot();
  // Bot hit self
  for(let i=1;i<snakes[1].length;i++) {
    if(botHead.row===snakes[1][i].row&&botHead.col===snakes[1][i].col) return resetBot();
  }
  // Bot hit player
  for(let i=0;i<snakes[0].length;i++) {
    if(botHead.row===snakes[0][i].row&&botHead.col===snakes[0][i].col) return resetBot();
  }
  // ไม่ reset bot เมื่อกิน food
}

function gameOver() {
  isGameOver = true;
  clearInterval(gameInterval);
  alert('Game Over!');
}

function resetBot() {
  // Reset bot snake to start
  snakes[1] = [
    {row: 5, col: 5},
    {row: 5, col: 4},
    {row: 5, col: 3}
  ];
}

// Player controls
let playerDir = 'right';
document.addEventListener('keydown', function(e) {
  if(isGameOver) return;
  if(['ArrowUp','w','W'].includes(e.key) && playerDir!=='down') playerDir = 'up';
  if(['ArrowDown','s','S'].includes(e.key) && playerDir!=='up') playerDir = 'down';
  if(['ArrowLeft','a','A'].includes(e.key) && playerDir!=='right') playerDir = 'left';
  if(['ArrowRight','d','D'].includes(e.key) && playerDir!=='left') playerDir = 'right';
});
