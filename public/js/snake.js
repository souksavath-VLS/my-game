window.setSnakePaused = function(p) {
  if(p) {
    window.clearInterval(window.snakeIntervalId);
  } else {
    window.snakeIntervalId = setInterval(moveSnake, window.snakeIntervalSpeed||120);
    gameInterval = window.snakeIntervalId;
  }
};
// js/snake.js
// Snake Pro: โครงสร้างเริ่มต้น (UI, กระดาน, Snake, Food, Score)

const ROWS = 21, COLS = 21;
let board = [], snake = [], food = {}, score = 0, gameInterval, isGameOver = false;
let snakeWebDirection = 'right';
window.setSnakeDirection = function(newDir) {
  const opposite = { up:'down', down:'up', left:'right', right:'left' };
  if(!window.paused && snakeWebDirection!==opposite[newDir]) {
    snakeWebDirection = newDir;
  }
};

function createBoard() {
  board = [];
  for(let r=0;r<ROWS;r++) {
    board[r] = [];
    for(let c=0;c<COLS;c++) {
      board[r][c] = 0;
    }
  }
  // สุ่ม obstacle (wall) 10 จุด
  for(let i=0;i<10;i++) {
    let r, c;
    do {
      r = Math.floor(Math.random()*ROWS);
      c = Math.floor(Math.random()*COLS);
    } while(board[r][c]!==0 || (r===Math.floor(ROWS/2)&&c>=Math.floor(COLS/2)-2&&c<=Math.floor(COLS/2)));
    board[r][c] = 1; // 1 = wall
  }
}

function renderBoard() {
  const el = document.getElementById('snake-board');
  el.innerHTML = '';
  for(let r=0;r<ROWS;r++) {
    for(let c=0;c<COLS;c++) {
      const cell = document.createElement('div');
      cell.className = 'snake-cell';
      if(board[r][c]===1) cell.style.background = '#616161';
      el.appendChild(cell);
    }
  }
}

function placeSnake() {
  snake = [
    {row: Math.floor(ROWS/2), col: Math.floor(COLS/2)},
    {row: Math.floor(ROWS/2), col: Math.floor(COLS/2)-1},
    {row: Math.floor(ROWS/2), col: Math.floor(COLS/2)-2}
  ];
  drawSnake();
}

function drawSnake() {
  snake.forEach((s,i)=>{
    const idx = s.row*COLS + s.col;
    const el = document.getElementById('snake-board').children[idx];
    if(el) el.classList.add(i===0?'snake-head':'snake-body');
  });
  if(window.setSnakeTheme) window.setSnakeTheme(window.snakeTheme||0);
}

function placeFood() {
  let r, c;
  do {
    r = Math.floor(Math.random()*ROWS);
    c = Math.floor(Math.random()*COLS);
  } while(snake.some(s=>s.row===r&&s.col===c) || board[r][c]!==0);
  food = {row:r, col:c};
  drawFood();
}

function drawFood() {
  const idx = food.row*COLS + food.col;
  const el = document.getElementById('snake-board').children[idx];
  if(el) el.classList.add('snake-food');
  drawPowerUp();
  if(window.setSnakeTheme) window.setSnakeTheme(window.snakeTheme||0);

function drawPowerUp() {
  if(window.powerUp) {
    const idx = window.powerUp.row*COLS + window.powerUp.col;
    const el = document.getElementById('snake-board').children[idx];
    if(el) el.style.background = '#ff4081';
  }
}
}

function resetGame() {
  score = 0;
  snakeWebDirection = 'right';
  isGameOver = false;
  document.getElementById('snake-score').innerText = score;
  createBoard();
  renderBoard();
  placeSnake();
  placeFood();
  if(window.setSnakeTheme) window.setSnakeTheme(window.snakeTheme||0);
  if(gameInterval) clearInterval(gameInterval);
  window.snakeIntervalSpeed = 240;
  window.moveSnake = moveSnake;
  window.snakeIntervalId = setInterval(moveSnake, window.snakeIntervalSpeed);
  gameInterval = window.snakeIntervalId;
}

document.getElementById('start-snake-btn').onclick = function() {
  resetGame();
};

resetGame();
// Snake movement controls
document.addEventListener('keydown', function(e) {
  if(isGameOver) return;
  let newDir = snakeWebDirection;
  if(['ArrowUp','w','W'].includes(e.key) && snakeWebDirection!=='down') newDir = 'up';
  if(['ArrowDown','s','S'].includes(e.key) && snakeWebDirection!=='up') newDir = 'down';
  if(['ArrowLeft','a','A'].includes(e.key) && snakeWebDirection!=='right') newDir = 'left';
  if(['ArrowRight','d','D'].includes(e.key) && snakeWebDirection!=='left') newDir = 'right';
  snakeWebDirection = newDir;
});

function moveSnake() {
  if(isGameOver) return;
  //console.log('moveSnake dir:', snakeWebDirection);
  let dr=0,dc=0;
  if(snakeWebDirection==='up') dr=-1;
  if(snakeWebDirection==='down') dr=1;
  if(snakeWebDirection==='left') dc=-1;
  if(snakeWebDirection==='right') dc=1;
  const head = {row: snake[0].row+dr, col: snake[0].col+dc};
  // Check collision wall/obstacle
  if(head.row<0||head.row>=ROWS||head.col<0||head.col>=COLS||board[head.row][head.col]===1) return gameOverSnake();
  // Check collision body
  if(snake.some(s=>s.row===head.row&&s.col===head.col)) return gameOverSnake();
  snake.unshift(head);
  // Eat food
  if(head.row===food.row && head.col===food.col) {
    score+=10;
    document.getElementById('snake-score').innerText = score;
    placeFood();
    updateSnakeSpeed();
  } else if(window.powerUp && head.row===window.powerUp.row && head.col===window.powerUp.col) {
    score+=30;
    document.getElementById('snake-score').innerText = score;
    // ยาวขึ้น 2 ช่อง
    snake.unshift({row: head.row, col: head.col});
    snake.unshift({row: head.row, col: head.col});
    window.powerUp = null;
    updateSnakeSpeed();
  } else {
    snake.pop();
  }
  // Redraw
  renderBoard();
  drawSnake();
  drawFood();

// เพิ่มฟีเจอร์ speed ตามคะแนน
function updateSnakeSpeed() {
  const base = 240;
  const speed = Math.max(100, base - Math.floor(score/50)*20);
  if(window.snakeIntervalSpeed !== speed) {
    window.snakeIntervalSpeed = speed;
    clearInterval(window.snakeIntervalId);
    window.snakeIntervalId = setInterval(moveSnake, speed);
    gameInterval = window.snakeIntervalId;
  }
}
}

function gameOverSnake() {
  isGameOver = true;
  clearInterval(gameInterval);
  saveSnakeStats(score);
  alert('Game Over!');
}

function saveSnakeStats(score) {
  const stats = JSON.parse(localStorage.getItem('snakeStats') || '[]');
  stats.push({ score, date: Date.now() });
  localStorage.setItem('snakeStats', JSON.stringify(stats));
  updateHighScore();
}

function updateHighScore() {
  const stats = JSON.parse(localStorage.getItem('snakeStats') || '[]');
  const high = stats.length ? Math.max(...stats.map(s=>s.score)) : 0;
  document.getElementById('snake-highscore').innerText = high;
}

// Show high score
const scoreDiv = document.querySelector('.snake-score');
scoreDiv.insertAdjacentHTML('afterend', '<div class="snake-score">สูงสุด: <span id="snake-highscore">0</span></div>');
updateHighScore();
