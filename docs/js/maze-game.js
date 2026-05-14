// Maze — recursive-backtracking maze generator with mouse 🐭 navigating to cheese 🧀.
// Controls: swipe on canvas, on-screen D-pad, arrow/WASD keys.
// Stars ⭐ for bonus, move budget per level, endless level progression.

(() => {
  'use strict';

  const I18N = {
    th: {
      title:'🌀 เขาวงกต', back:'← หน้าหลัก',
      level:'เลเวล', score:'คะแนน', moves:'ก้าว', best:'ดีที่สุด',
      gameover:'จบเกม', overLblScore:'คะแนน', overLblLevel:'เลเวล',
      again:'▶ เล่นใหม่', levelUp:'เลเวล ',
      success:'เก่งมาก! 🎉', noMoves:'หมดก้าวเดิน 😢'
    },
    en: {
      title:'🌀 Maze', back:'← Home',
      level:'Level', score:'Score', moves:'Moves', best:'Best',
      gameover:'Game Over', overLblScore:'Score', overLblLevel:'Level',
      again:'▶ Play Again', levelUp:'Level ',
      success:'Great job! 🎉', noMoves:'Out of moves 😢'
    },
    lao: {
      title:'🌀 ເຂົາວົງກົດ', back:'← ໜ້າຫຼັກ',
      level:'ລະດັບ', score:'ຄະແນນ', moves:'ໂຕ້', best:'ດີສຸດ',
      gameover:'ຈົບເກມ', overLblScore:'ຄະແນນ', overLblLevel:'ລະດັບ',
      again:'▶ ຫຼິ້ນອີກ', levelUp:'ລະດັບ ',
      success:'ເກັ່ງຫຼາຍ! 🎉', noMoves:'ໝົດໂຕ້ເດີນ 😢'
    }
  };

  const STATS_KEY = 'maze_stats_v1';
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return { bestScore: s.bestScore | 0, bestLevel: s.bestLevel | 0, plays: s.plays | 0 };
    } catch { return { bestScore: 0, bestLevel: 0, plays: 0 }; }
  }
  function saveStats(patch) {
    const cur = loadStats();
    const upd = Object.assign({}, cur, patch);
    try { localStorage.setItem(STATS_KEY, JSON.stringify(upd)); } catch {}
    return upd;
  }

  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function beep(f, d, type, vol) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.connect(g); g.connect(audioCtx.destination);
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f, now);
    g.gain.setValueAtTime(vol || 0.05, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + d);
    osc.start(now); osc.stop(now + d + 0.02);
  }
  function play(kind) {
    if (!audioCtx) return;
    if (kind === 'step')    beep(440 + Math.random()*120, 0.04, 'square', 0.03);
    if (kind === 'bump')    beep(120, 0.08, 'sawtooth', 0.05);
    if (kind === 'star')    { beep(880, 0.08, 'triangle', 0.06); setTimeout(() => beep(1320, 0.1, 'triangle', 0.05), 80); }
    if (kind === 'win')     { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.13, 'sine', 0.07), i*90)); }
    if (kind === 'levelup') { [659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.13, 'sine', 0.07), i*100)); }
    if (kind === 'gameover'){ beep(330, 0.2, 'sawtooth', 0.1); setTimeout(() => beep(220, 0.3, 'sawtooth', 0.1), 200); setTimeout(() => beep(165, 0.5, 'sawtooth', 0.1), 480); }
  }

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'lao';
  })();
  let level = 1;
  let score = 0;
  let movesUsed = 0;
  let movesBudget = 0;
  let grid = null;     // 2D array of cells { walls: [top, right, bottom, left], visited }
  let N = 5;           // grid size
  let player = { x: 0, y: 0 };
  let goal = { x: 0, y: 0 };
  let stars = [];      // [{x, y, taken}]
  let optimal = 0;
  let cellSize = 60;
  let busy = false;

  const $ = id => document.getElementById(id);
  const canvas = $('maze');
  const ctx = canvas.getContext('2d');

  function levelConfig(lv) {
    let n, nStars, budgetMul;
    if (lv <= 2)      { n = 5;  nStars = 1; budgetMul = 4; }
    else if (lv <= 4) { n = 7;  nStars = 2; budgetMul = 3; }
    else if (lv <= 6) { n = 9;  nStars = 3; budgetMul = 2.5; }
    else              { n = 11; nStars = 4; budgetMul = 2.3; }
    return { n, nStars, budgetMul };
  }

  // ===== Maze generation (recursive backtracking) =====
  function makeGrid(n) {
    const g = [];
    for (let y = 0; y < n; y++) {
      const row = [];
      for (let x = 0; x < n; x++) {
        row.push({ walls: [true, true, true, true], visited: false });
      }
      g.push(row);
    }
    return g;
  }
  // dir: 0=top, 1=right, 2=bottom, 3=left
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];
  function generate(g, n) {
    const stack = [];
    g[0][0].visited = true;
    stack.push({ x: 0, y: 0 });
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const neighbors = [];
      for (let d = 0; d < 4; d++) {
        const nx = cur.x + DX[d];
        const ny = cur.y + DY[d];
        if (nx >= 0 && nx < n && ny >= 0 && ny < n && !g[ny][nx].visited) {
          neighbors.push({ d, x: nx, y: ny });
        }
      }
      if (!neighbors.length) { stack.pop(); continue; }
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      g[cur.y][cur.x].walls[pick.d] = false;
      g[pick.y][pick.x].walls[(pick.d + 2) % 4] = false;
      g[pick.y][pick.x].visited = true;
      stack.push({ x: pick.x, y: pick.y });
    }
  }

  // BFS to find shortest path length from start to goal
  function shortestPath(g, n, sx, sy, gx, gy) {
    const dist = Array.from({ length: n }, () => Array(n).fill(-1));
    dist[sy][sx] = 0;
    const q = [{ x: sx, y: sy }];
    while (q.length) {
      const c = q.shift();
      if (c.x === gx && c.y === gy) return dist[c.y][c.x];
      for (let d = 0; d < 4; d++) {
        if (g[c.y][c.x].walls[d]) continue;
        const nx = c.x + DX[d];
        const ny = c.y + DY[d];
        if (nx < 0 || nx >= n || ny < 0 || ny >= n) continue;
        if (dist[ny][nx] !== -1) continue;
        dist[ny][nx] = dist[c.y][c.x] + 1;
        q.push({ x: nx, y: ny });
      }
    }
    return -1;
  }

  // ===== Build level =====
  function buildLevel() {
    const cfg = levelConfig(level);
    N = cfg.n;
    grid = makeGrid(N);
    generate(grid, N);
    player = { x: 0, y: 0 };
    goal = { x: N - 1, y: N - 1 };
    optimal = shortestPath(grid, N, 0, 0, goal.x, goal.y);
    movesBudget = Math.max(N * 2, Math.ceil(optimal * cfg.budgetMul));
    movesUsed = 0;

    // Place stars in random reachable cells (not at player/goal)
    stars = [];
    const used = new Set([`${player.x},${player.y}`, `${goal.x},${goal.y}`]);
    let safety = 0;
    while (stars.length < cfg.nStars && safety++ < 200) {
      const x = Math.floor(Math.random() * N);
      const y = Math.floor(Math.random() * N);
      const key = `${x},${y}`;
      if (used.has(key)) continue;
      used.add(key);
      stars.push({ x, y, taken: false });
    }

    sizeCanvas();
    updateHud();
    render();
  }

  function sizeCanvas() {
    // Use device pixel ratio; CSS size from clientWidth (responsive via CSS width:100%)
    const cssW = canvas.clientWidth || canvas.parentElement.clientWidth || 360;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = canvas.width;
    canvas.style.height = canvas.clientWidth + 'px';
    cellSize = canvas.width / N;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function render() {
    const W = canvas.width;
    ctx.fillStyle = '#f0fdfa';
    ctx.fillRect(0, 0, W, W);

    // Goal highlight
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(goal.x * cellSize, goal.y * cellSize, cellSize, cellSize);

    // Walls
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = Math.max(2, cellSize * 0.08);
    ctx.lineCap = 'round';
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const c = grid[y][x];
        const px = x * cellSize, py = y * cellSize;
        if (c.walls[0]) line(px, py, px + cellSize, py);
        if (c.walls[1]) line(px + cellSize, py, px + cellSize, py + cellSize);
        if (c.walls[2]) line(px, py + cellSize, px + cellSize, py + cellSize);
        if (c.walls[3]) line(px, py, px, py + cellSize);
      }
    }

    // Stars
    ctx.font = `${Math.floor(cellSize * 0.6)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of stars) {
      if (s.taken) continue;
      ctx.fillText('⭐', s.x * cellSize + cellSize / 2, s.y * cellSize + cellSize / 2);
    }

    // Goal emoji
    ctx.font = `${Math.floor(cellSize * 0.7)}px sans-serif`;
    ctx.fillText('🧀', goal.x * cellSize + cellSize / 2, goal.y * cellSize + cellSize / 2);

    // Player
    ctx.fillText('🐭', player.x * cellSize + cellSize / 2, player.y * cellSize + cellSize / 2);
  }
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  function updateHud() {
    $('ui-level').textContent = level;
    $('ui-score').textContent = score;
    $('ui-moves').textContent = (movesBudget - movesUsed);
  }

  function showFlash(msg) {
    const el = $('flash');
    el.textContent = msg;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  // ===== Movement =====
  function tryMove(dir) {
    if (busy) return;
    ensureAudio();
    if (movesUsed >= movesBudget) return;
    const c = grid[player.y][player.x];
    if (c.walls[dir]) { play('bump'); return; }
    player.x += DX[dir];
    player.y += DY[dir];
    movesUsed++;
    play('step');

    // Check star pickup
    for (const s of stars) {
      if (!s.taken && s.x === player.x && s.y === player.y) {
        s.taken = true;
        score += 20;
        play('star');
      }
    }

    updateHud();
    render();

    // Reached goal?
    if (player.x === goal.x && player.y === goal.y) {
      busy = true;
      const left = movesBudget - movesUsed;
      const reachScore = 50 + level * 10 + left * 2;
      score += reachScore;
      play('win');
      setTimeout(() => {
        const prevLevel = level;
        level++;
        if (level > prevLevel) {
          showFlash(I18N[lang].levelUp + level + ' 🎉');
          play('levelup');
        }
        busy = false;
        buildLevel();
      }, 900);
      return;
    }

    // Out of moves?
    if (movesUsed >= movesBudget) {
      busy = true;
      setTimeout(() => gameOver(), 600);
    }
  }

  function gameOver() {
    play('gameover');
    const prev = loadStats();
    const isNewBest = score > prev.bestScore;
    const updated = saveStats({
      bestScore: Math.max(prev.bestScore, score),
      bestLevel: Math.max(prev.bestLevel, level),
      plays: prev.plays + 1
    });
    $('over-score').textContent = score;
    $('over-level').textContent = level;
    $('newbest').style.display = (isNewBest && score > 0) ? 'inline-block' : 'none';
    $('ui-best').textContent = updated.bestScore;
    setTimeout(() => $('modal-over').classList.add('show'), 400);
  }

  // ===== Inputs =====
  // Swipe on canvas
  let ptr = null;
  canvas.addEventListener('pointerdown', (e) => {
    ensureAudio();
    ptr = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!ptr) return;
    const dx = e.clientX - ptr.x;
    const dy = e.clientY - ptr.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    const threshold = 16;
    if (ax < threshold && ay < threshold) { ptr = null; return; }
    if (ax > ay) tryMove(dx > 0 ? 1 : 3);
    else         tryMove(dy > 0 ? 2 : 0);
    ptr = null;
  });
  canvas.addEventListener('pointercancel', () => { ptr = null; });

  // D-pad
  $('pad-u').addEventListener('click', () => tryMove(0));
  $('pad-r').addEventListener('click', () => tryMove(1));
  $('pad-d').addEventListener('click', () => tryMove(2));
  $('pad-l').addEventListener('click', () => tryMove(3));
  $('pad-c').addEventListener('click', () => {
    ensureAudio();
    if (busy) return;
    // Restart current level (no score lost on restart, but moves used reset and budget recomputes)
    buildLevel();
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') { tryMove(0); e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { tryMove(1); e.preventDefault(); }
    if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') { tryMove(2); e.preventDefault(); }
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') { tryMove(3); e.preventDefault(); }
  }, { passive: false });

  $('btn-again').addEventListener('click', () => {
    ensureAudio();
    $('modal-over').classList.remove('show');
    level = 1; score = 0;
    buildLevel();
  });

  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    $('lbl-level').textContent = t.level;
    $('lbl-score').textContent = t.score;
    $('lbl-moves').textContent = t.moves;
    $('lbl-best').textContent = t.best;
    $('over-title').textContent = t.gameover;
    $('over-lbl-score').textContent = t.overLblScore;
    $('over-lbl-level').textContent = t.overLblLevel;
    $('btn-again').textContent = t.again;
    document.title = t.title;
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  window.addEventListener('resize', () => {
    if (!grid) return;
    sizeCanvas();
    render();
  });

  applyLang();
  $('ui-best').textContent = loadStats().bestScore;
  buildLevel();
})();
