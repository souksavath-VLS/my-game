// Theme switcher
const themes = ['theme-default','theme-wood','theme-galaxy'];
let themeIdx = 0;
document.getElementById('theme-btn').onclick = function() {
  // ลบธีมเก่าออกก่อน
  document.body.classList.remove('theme-default','theme-wood','theme-galaxy');
  themeIdx = (themeIdx+1)%themes.length;
  if(themes[themeIdx] !== 'theme-default') {
    document.body.classList.add(themes[themeIdx]);
  }
};
// js/tetris.js
// Simple Tetris core logic

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;
const board = [];
let current, next, score = 0, gameInterval, isGameOver = false;
let timerInterval, startTime = 0;

const SHAPES = [
  [[1,1,1,1]], // I
  [[1,1],[1,1]], // O
  [[0,1,0],[1,1,1]], // T
  [[1,1,0],[0,1,1]], // S
  [[0,1,1],[1,1,0]], // Z
  [[1,0,0],[1,1,1]], // J
  [[0,0,1],[1,1,1]]  // L
];
const COLORS = ["#00bcd4","#ffeb3b","#e040fb","#4caf50","#f44336","#1976d2","#ff9800"];

function resetBoard() {
  for(let r=0;r<ROWS;r++) {
    board[r] = [];
    for(let c=0;c<COLS;c++) board[r][c]=0;
  }
  // Ensure board is always ROWS x COLS
  while(board.length < ROWS) board.push(Array(COLS).fill(0));
  for(let r=0;r<ROWS;r++) {
    if(!board[r] || board[r].length !== COLS) board[r] = Array(COLS).fill(0);
  }
}

function drawBoard() {
  const el = document.getElementById('tetris-board');
  el.innerHTML = '';
  for(let r=0;r<ROWS;r++) {
    for(let c=0;c<COLS;c++) {
      const cell = document.createElement('div');
      cell.className = 'tetris-cell'+(board[r][c]?' fixed':'');
      cell.style.background = board[r][c] ? board[r][c] : '';
      el.appendChild(cell);
    }
  }
  if(current) drawShape(current);
  drawNextPreview();
}

function drawNextPreview() {
  const preview = document.getElementById('next-preview');
  preview.innerHTML = '';
  if(!next) return;
  const shape = next.shape;
  const color = next.color;
  // สร้าง grid preview
  const rows = shape.length;
  const cols = shape[0].length;
  preview.style.display = 'grid';
  preview.style.gridTemplateRows = `repeat(${rows}, 18px)`;
  preview.style.gridTemplateColumns = `repeat(${cols}, 18px)`;
  for(let r=0;r<rows;r++) {
    for(let c=0;c<cols;c++) {
      const cell = document.createElement('div');
      cell.style.width = '18px';
      cell.style.height = '18px';
      cell.style.borderRadius = '4px';
      cell.style.margin = '1px';
      cell.style.background = shape[r][c] ? color : 'transparent';
      cell.style.boxShadow = shape[r][c] ? '0 2px 8px '+color+'88' : 'none';
      preview.appendChild(cell);
    }
  }
}

function randomShape() {
  const idx = Math.floor(Math.random()*SHAPES.length);
  return {
    shape: SHAPES[idx],
    color: COLORS[idx],
    row: 0,
    col: Math.floor(COLS/2)-2
  };
}

function drawShape(piece) {
  const el = document.getElementById('tetris-board');
  for(let r=0;r<piece.shape.length;r++) {
    for(let c=0;c<piece.shape[r].length;c++) {
      if(piece.shape[r][c]) {
        const idx = (piece.row+r)*COLS + (piece.col+c);
        if(idx>=0 && idx<ROWS*COLS) {
          el.children[idx].classList.add('active');
          el.children[idx].style.background = piece.color;
        }
      }
    }
  }
}

function validMove(piece, dr, dc, rot) {
  let shape = piece.shape;
  if(rot) shape = rotate(shape);
  for(let r=0;r<shape.length;r++) {
    for(let c=0;c<shape[r].length;c++) {
      if(shape[r][c]) {
        let nr = piece.row + r + dr;
        let nc = piece.col + c + dc;
        if(nr<0||nr>=ROWS||nc<0||nc>=COLS||board[nr][nc]) return false;
      }
    }
  }
  return true;
}

function rotate(shape) {
  return shape[0].map((_,i)=>shape.map(row=>row[i]).reverse());
}

function merge(piece) {
  for(let r=0;r<piece.shape.length;r++) {
    for(let c=0;c<piece.shape[r].length;c++) {
      if(piece.shape[r][c]) {
        let nr = piece.row + r;
        let nc = piece.col + c;
        if(nr>=0 && nr<ROWS && nc>=0 && nc<COLS) {
          board[nr][nc] = piece.color;
        }
      }
    }
  }
}

function clearLines() {
  let lines = 0;
  for(let r=ROWS-1;r>=0;r--) {
    if(board[r].every(cell=>cell)) {
      board.splice(r,1);
      board.unshift(Array(COLS).fill(0));
      lines++;
      r++;
    }
  }
  if(lines) {
    score += lines*100;
    document.getElementById('score').innerText = score;
    // เปลี่ยนสีคะแนนแบบสุ่ม
    const colors = ['#ff9800','#4caf50','#e040fb','#00bcd4','#f44336','#ffeb3b','#1976d2','#ff4081','#00e676','#ffd600'];
    const color = colors[Math.floor(Math.random()*colors.length)];
    document.getElementById('score').parentElement.style.color = color;
    // เล่นเสียงเคลียร์ไลน์
    if(lines>=4) playTetrisSound('clear3');
    else if(lines===3) playTetrisSound('clear2');
    else playTetrisSound('clear1');
  }
}

function drop() {
  if(!current) return;
  if(validMove(current,1,0)) {
    current.row++;
  } else {
    merge(current);
    clearLines();
    current = next;
    next = randomShape();
    if(!validMove(current,0,0)) {
      isGameOver = true;
      clearInterval(gameInterval);
      clearInterval(timerInterval);
      tetrisSounds.bgm.pause();
      playTetrisSound('gameover');
      // save stats
      const t = Math.floor((Date.now()-startTime)/1000);
      saveTetrisStats(score, t);
      setTimeout(function(){
        alert('Game Over! คะแนน: '+score);
      }, 200);
    }
  }
  drawBoard();
}

function move(dx) {
  if(current && validMove(current,0,dx)) {
    current.col += dx;
    playTetrisSound('move');
    drawBoard();
  }
}

function rotateCurrent() {
  if(current && validMove(current,0,0,true)) {
    current.shape = rotate(current.shape);
    playTetrisSound('rotate');
    drawBoard();
  }
}

function hardDrop() {
  while(current && validMove(current,1,0)) current.row++;
  playTetrisSound('drop');
  drop();
}

function saveTetrisStats(score, time) {
  const stats = JSON.parse(localStorage.getItem('tetrisStats') || '[]');
  stats.push({ score, time, date: new Date().toISOString() });
  localStorage.setItem('tetrisStats', JSON.stringify(stats));
}

document.getElementById('start-btn').onclick = function() {
  resetBoard();
  score = 0;
  isGameOver = false;
  current = randomShape();
  next = randomShape();
  document.getElementById('score').innerText = score;
  drawBoard();
  clearInterval(gameInterval);
  gameInterval = setInterval(drop, 500);
  tetrisSounds.bgm.currentTime = 0;
  tetrisSounds.bgm.play();
  drawNextPreview();
  // จับเวลา
  clearInterval(timerInterval);
  startTime = Date.now();
  document.getElementById('time').innerText = '0:00';
  timerInterval = setInterval(function() {
    const t = Math.floor((Date.now()-startTime)/1000);
    const m = Math.floor(t/60);
    const s = t%60;
    document.getElementById('time').innerText = m+':' + (s<10?'0':'')+s;
  }, 1000);
};

document.addEventListener('keydown', function(e) {
  if(isGameOver) return;
  if(e.key==='ArrowLeft') move(-1);
  else if(e.key==='ArrowRight') move(1);
  else if(e.key==='ArrowDown') drop();
  else if(e.key==='ArrowUp') rotateCurrent();
  else if(e.key===' ') hardDrop();
});

// Auto init board
resetBoard();
drawBoard();

// Touch/click arrow buttons
document.getElementById('left-btn').onclick = function() { if(!isGameOver) move(-1); };
document.getElementById('right-btn').onclick = function() { if(!isGameOver) move(1); };
document.getElementById('down-btn').onclick = function() { if(!isGameOver) { playTetrisSound('move'); drop(); } };
document.getElementById('rotate-btn').onclick = function() { if(!isGameOver) rotateCurrent(); };
document.getElementById('drop-btn').onclick = function() { if(!isGameOver) hardDrop(); };
