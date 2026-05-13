// Stack Tower — mobile-first canvas game.
// Each round: a block slides left/right above the tower top. Tap to drop. Overlap with the block below
// becomes the new block; the off-tower piece falls away. Total miss = game over.

(() => {
  'use strict';

  // ===== UI strings =====
  const I18N = {
    th: {
      title: '🏗️ Stack Tower', sub: 'แตะเพื่อวาง · ทำให้ตรงกันให้ได้นานที่สุด',
      score: 'คะแนน', best: 'ดีที่สุด', played: 'เล่นทั้งหมด',
      start: '▶ เริ่ม', restart: '▶ เล่นใหม่',
      over: 'จบเกม', tap: '👆 แตะหน้าจอเพื่อวาง',
      perfect: 'PERFECT!', combo: 'COMBO!'
    },
    en: {
      title: '🏗️ Stack Tower', sub: 'Tap to drop · Stack as high as you can',
      score: 'Score', best: 'Best', played: 'Played',
      start: '▶ Start', restart: '▶ Play Again',
      over: 'Game Over', tap: '👆 Tap to drop',
      perfect: 'PERFECT!', combo: 'COMBO!'
    },
    lao: {
      title: '🏗️ Stack Tower', sub: 'ກົດເພື່ອວາງ · ກອງໃຫ້ສູງສຸດ',
      score: 'ຄະແນນ', best: 'ດີສຸດ', played: 'ຫຼິ້ນທັງໝົດ',
      start: '▶ ເລີ່ມ', restart: '▶ ຫຼິ້ນອີກ',
      over: 'ຈົບເກມ', tap: '👆 ກົດເພື່ອວາງ',
      perfect: 'ດີຫຼາຍ!', combo: 'ຕໍ່ກັນ!'
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'tower_stack_stats_v1';
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return {
        bestScore: s.bestScore | 0,
        gamesPlayed: s.gamesPlayed | 0,
        muted: !!s.muted
      };
    } catch { return { bestScore: 0, gamesPlayed: 0, muted: false }; }
  }
  function saveStats(patch) {
    const cur = loadStats();
    const upd = Object.assign({}, cur, patch);
    try { localStorage.setItem(STATS_KEY, JSON.stringify(upd)); } catch {}
    return upd;
  }

  // ===== Web Audio (synth, no file loads) =====
  let audioCtx = null;
  let isMuted = loadStats().muted;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function beep(freq, dur, type, vol) {
    if (isMuted || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol || 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now); osc.stop(now + dur + 0.02);
  }
  function play(kind, combo) {
    if (kind === 'place')   beep(440 + (combo||0) * 30, 0.08, 'triangle', 0.07);
    if (kind === 'perfect') { beep(880, 0.08, 'sine', 0.08); setTimeout(() => beep(1320, 0.12, 'sine', 0.07), 70); }
    if (kind === 'gameover'){ beep(220, 0.2, 'sawtooth', 0.1); setTimeout(() => beep(110, 0.5, 'sawtooth', 0.1), 200); }
  }

  // ===== Canvas =====
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');

  function resize() {
    canvas.width = stage.clientWidth;
    canvas.height = stage.clientHeight;
  }
  window.addEventListener('resize', () => { resize(); });

  // ===== State =====
  const BLOCK_H = 28;
  const STATE = { MENU: 0, PLAYING: 1, OVER: 2 };
  let state = STATE.MENU;
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'th';
  })();

  let blocks = [];     // {x, y, w, color}
  let moving = null;   // {x, y, w, color, dir, speed}
  let fragments = [];  // {x, y, w, color, vx, vy, rot, vRot}
  let cameraY = 0;
  let cameraTarget = 0;
  let score = 0;
  let combo = 0;

  // ===== DOM refs =====
  const $ = id => document.getElementById(id);
  const elScore = $('ui-score');
  const elBest = $('ui-best');
  const elOverlayStart = $('overlay-start');
  const elOverlayOver = $('overlay-over');
  const elHint = $('hint');
  const elCombo = $('combo');
  const elOverScore = $('over-score');
  const elOverBest = $('over-best');
  const elNewBest = $('newbest');
  const elStartStats = $('start-stats');
  const elStartBest = $('start-best');
  const elStartPlayed = $('start-played');
  const elMute = $('btn-mute');

  // ===== Color palette =====
  function colorFor(i) {
    const hue = (200 + i * 14) % 360;
    return `hsl(${hue}, 70%, 62%)`;
  }
  function shadeOf(color, dl) {
    // Quick hack: produce a slightly darker variant by appending lightness override
    const m = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!m) return color;
    const h = m[1], s = m[2], l = Math.max(0, Math.min(100, +m[3] + dl));
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  // ===== Game flow =====
  function newGame() {
    blocks = []; fragments = []; cameraY = 0; cameraTarget = 0;
    score = 0; combo = 0;
    updateScore();
    // Base block
    const baseW = Math.min(canvas.width * 0.62, 240);
    const baseX = (canvas.width - baseW) / 2;
    const baseY = canvas.height - 40;
    blocks.push({ x: baseX, y: baseY, w: baseW, color: colorFor(0) });
    spawnMoving();
    state = STATE.PLAYING;
    elHint.classList.remove('hidden');
    setTimeout(() => elHint.classList.add('hidden'), 1700);
  }

  function spawnMoving() {
    const last = blocks[blocks.length - 1];
    const fromLeft = Math.random() < 0.5;
    const w = last.w;
    const y = last.y - BLOCK_H;
    moving = {
      x: fromLeft ? -w - 4 : canvas.width + 4,
      y, w,
      color: colorFor(blocks.length),
      dir: fromLeft ? 1 : -1,
      // Speed ramps up; cap so it stays playable
      speed: Math.min(7.2, 2.1 + blocks.length * 0.075)
    };
    // Camera target = keep the moving block around y ≈ canvas.height * 0.32
    cameraTarget = Math.max(0, canvas.height * 0.32 - y);
  }

  function drop() {
    if (state !== STATE.PLAYING || !moving) return;
    const last = blocks[blocks.length - 1];
    const left = Math.max(moving.x, last.x);
    const right = Math.min(moving.x + moving.w, last.x + last.w);
    const overlap = right - left;
    if (overlap <= 0) {
      // Total miss — block tumbles, game over
      fragments.push({
        x: moving.x, y: moving.y, w: moving.w, h: BLOCK_H, color: moving.color,
        vx: moving.dir * -1, vy: 0, gravity: .5, rot: 0, vRot: (Math.random() - .5) * 0.1
      });
      moving = null;
      gameOver();
      return;
    }
    const dxLeft = moving.x - last.x;     // how much the new block is offset
    // Perfect match if alignment is very tight
    const perfect = Math.abs(dxLeft) <= 3 && Math.abs(moving.w - last.w) <= 3;
    let newX, newW;
    if (perfect) {
      newX = last.x;
      newW = last.w;
      combo++;
      score += 2 + combo;
      showCombo(combo >= 3 ? `${combo}× ${I18N[lang].combo}` : I18N[lang].perfect);
      play('perfect', combo);
    } else {
      // Trim to the overlap area; cast off the part that fell
      newX = left;
      newW = overlap;
      if (dxLeft < 0) {
        // Left side falls
        fragments.push({
          x: moving.x, y: moving.y, w: last.x - moving.x, h: BLOCK_H, color: moving.color,
          vx: -1.2, vy: 0, gravity: .55, rot: 0, vRot: -0.08
        });
      } else if (dxLeft > 0) {
        // Right side falls
        fragments.push({
          x: last.x + last.w, y: moving.y, w: (moving.x + moving.w) - (last.x + last.w),
          h: BLOCK_H, color: moving.color, vx: 1.2, vy: 0, gravity: .55, rot: 0, vRot: 0.08
        });
      }
      combo = 0;
      score += 1;
      play('place');
    }
    blocks.push({ x: newX, y: moving.y, w: newW, color: moving.color });
    updateScore();
    spawnMoving();
  }

  function gameOver() {
    state = STATE.OVER;
    play('gameover');
    const prev = loadStats();
    const isNewBest = score > prev.bestScore;
    const updated = saveStats({
      bestScore: Math.max(prev.bestScore, score),
      gamesPlayed: prev.gamesPlayed + 1
    });
    elOverScore.textContent = score;
    elOverBest.textContent = updated.bestScore;
    elNewBest.classList.toggle('hidden', !(isNewBest && score > 0));
    elBest.textContent = updated.bestScore;
    setTimeout(() => { elOverlayOver.classList.remove('hidden'); }, 700);
  }

  function showCombo(text) {
    elCombo.textContent = text;
    const last = blocks[blocks.length - 1];
    if (last) {
      const sx = last.x + last.w / 2;
      const sy = last.y + cameraY;
      elCombo.style.left = (sx - 50) + 'px';
      elCombo.style.top = (sy - 10) + 'px';
    }
    elCombo.classList.remove('show');
    void elCombo.offsetWidth;
    elCombo.classList.add('show');
  }

  // ===== Update + draw =====
  function update() {
    if (state === STATE.PLAYING && moving) {
      moving.x += moving.dir * moving.speed;
      if (moving.x < -moving.w - 4) moving.dir = 1;
      else if (moving.x > canvas.width + 4) moving.dir = -1;
      // Bounce when reaching edges (no off-screen drift on slow phones)
      if (moving.x < 0 && moving.dir < 0) moving.dir = 1;
      if (moving.x + moving.w > canvas.width && moving.dir > 0) moving.dir = -1;
    }
    // Smooth camera
    cameraY += (cameraTarget - cameraY) * 0.08;
    // Fragments physics
    for (let i = fragments.length - 1; i >= 0; i--) {
      const f = fragments[i];
      f.vy += f.gravity || .5;
      f.y += f.vy;
      f.x += f.vx;
      f.rot += f.vRot;
      if (f.y > canvas.height + 80 + cameraY) fragments.splice(i, 1);
    }
  }

  function drawBlock(b, withCamera) {
    const x = b.x;
    const y = b.y + (withCamera ? cameraY : 0);
    // Body
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, b.w, BLOCK_H);
    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x, y, b.w, 4);
    // Bottom shadow
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(x, y + BLOCK_H - 3, b.w, 3);
    // Side bevels
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(x + b.w - 2, y, 2, BLOCK_H);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Sky gradient already on body via CSS — but canvas needs its own bg
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#93c5fd');
    sky.addColorStop(1, '#fbcfe8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sun
    ctx.fillStyle = 'rgba(252, 211, 77, 0.55)';
    ctx.beginPath();
    ctx.arc(canvas.width * 0.85, 60, 30, 0, Math.PI * 2);
    ctx.fill();

    // Ground line (only if camera not scrolled too far)
    const groundScreenY = canvas.height - 18 + cameraY;
    if (groundScreenY < canvas.height + 20) {
      ctx.fillStyle = '#86efac';
      ctx.fillRect(0, groundScreenY, canvas.width, canvas.height - groundScreenY + 4);
    }

    // Stacked blocks
    for (const b of blocks) drawBlock(b, true);
    // Moving block (no camera offset — moving block lives in world coords already)
    if (moving) drawBlock(moving, true);
    // Fragments
    for (const f of fragments) {
      ctx.save();
      const cx = f.x + f.w / 2;
      const cy = f.y + f.h / 2 + cameraY;
      ctx.translate(cx, cy);
      ctx.rotate(f.rot || 0);
      ctx.fillStyle = f.color;
      ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
      ctx.restore();
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // ===== Input =====
  function onTap(e) {
    if (state === STATE.PLAYING) {
      e.preventDefault();
      drop();
    }
  }
  canvas.addEventListener('pointerdown', onTap);

  // Spacebar = drop (desktop)
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      if (state === STATE.PLAYING) {
        e.preventDefault();
        drop();
      }
    }
  });

  // ===== Buttons =====
  $('btn-start').addEventListener('click', () => {
    ensureAudio();
    resize();
    newGame();
    elOverlayStart.classList.add('hidden');
    elOverlayOver.classList.add('hidden');
  });
  $('btn-restart').addEventListener('click', () => {
    ensureAudio();
    resize();
    newGame();
    elOverlayOver.classList.add('hidden');
  });
  elMute.addEventListener('click', () => {
    isMuted = !isMuted;
    elMute.textContent = isMuted ? '🔇' : '🔊';
    elMute.style.opacity = isMuted ? '0.5' : '1';
    saveStats({ muted: isMuted });
  });
  elMute.textContent = isMuted ? '🔇' : '🔊';
  elMute.style.opacity = isMuted ? '0.5' : '1';

  // ===== HUD =====
  function updateScore() {
    elScore.textContent = score;
    const best = loadStats().bestScore;
    elBest.textContent = best;
  }

  // ===== Localization =====
  function applyLang() {
    const t = I18N[lang];
    $('lbl-score').textContent = t.score;
    $('lbl-best').textContent = t.best;
    $('start-title').textContent = t.title;
    $('start-sub').textContent = t.sub;
    $('start-lbl-best').textContent = t.best;
    $('start-lbl-played').textContent = t.played;
    $('btn-start').textContent = t.start;
    $('btn-restart').textContent = t.restart;
    $('over-title').textContent = t.over;
    $('over-lbl-score').textContent = t.score;
    $('over-lbl-best').textContent = t.best;
    elHint.textContent = t.tap;
    document.title = t.title;
  }

  function refreshStartStats() {
    const s = loadStats();
    if (s.gamesPlayed > 0) {
      elStartStats.classList.remove('hidden');
      elStartBest.textContent = s.bestScore;
      elStartPlayed.textContent = s.gamesPlayed;
    }
    elBest.textContent = s.bestScore;
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  // ===== Init =====
  resize();
  applyLang();
  refreshStartStats();
  updateScore();
  requestAnimationFrame(loop);
})();
