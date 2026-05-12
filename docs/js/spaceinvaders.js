// Space Invaders Pro — canvas-based rewrite
// Features: lives, waves, invader return fire, high score, sound, pause, mute, mobile + keyboard

(() => {
  'use strict';

  // ===== DOM refs =====
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');
  const uiScore = document.getElementById('ui-score');
  const uiLives = document.getElementById('ui-lives');
  const uiWave = document.getElementById('ui-wave');
  const uiBest = document.getElementById('ui-best');
  const overlayStart = document.getElementById('overlay-start');
  const overlayGameover = document.getElementById('overlay-gameover');
  const overlayPaused = document.getElementById('overlay-paused');
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const btnResume = document.getElementById('btn-resume');
  const btnPause = document.getElementById('btn-pause');
  const btnMute = document.getElementById('btn-mute');
  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');
  const btnFire = document.getElementById('btn-fire');
  const btnAuto = document.getElementById('btn-auto');
  const startBest = document.getElementById('start-best');
  const startWave = document.getElementById('start-wave');
  const goScore = document.getElementById('go-score');
  const goBest = document.getElementById('go-best');
  const goWave = document.getElementById('go-wave');
  const goKills = document.getElementById('go-kills');
  const goNewBest = document.getElementById('go-newbest');
  const goTitle = document.getElementById('go-title');

  // ===== Persistent stats =====
  const STATS_KEY = 'si_stats_v1';
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return {
        bestScore: s.bestScore | 0,
        maxWave: s.maxWave | 0,
        totalKills: s.totalKills | 0,
        muted: !!s.muted,
        // Default ON for new players since this is mobile-first
        autoFire: s.autoFire === undefined ? true : !!s.autoFire
      };
    } catch { return { bestScore: 0, maxWave: 0, totalKills: 0, muted: false, autoFire: true }; }
  }
  function saveStats(patch) {
    const cur = loadStats();
    const updated = Object.assign({}, cur, patch);
    try { localStorage.setItem(STATS_KEY, JSON.stringify(updated)); } catch {}
    return updated;
  }

  // ===== Audio =====
  let audioCtx = null;
  const _initialStats = loadStats();
  let isMuted = _initialStats.muted;
  let autoFire = _initialStats.autoFire;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function playSound(type) {
    if (isMuted || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === 'shoot') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'hit') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now); osc.stop(now + 0.16);
    } else if (type === 'explode') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now); osc.stop(now + 0.36);
    } else if (type === 'enemy_shoot') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.15);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now); osc.stop(now + 0.16);
    } else if (type === 'levelup') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.25);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now); osc.stop(now + 0.31);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.7);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.start(now); osc.stop(now + 0.72);
    }
  }

  // ===== Emoji sprite cache (drawImage is much faster than fillText) =====
  const spriteCache = new Map();
  function getSprite(emoji, size) {
    const key = emoji + '|' + size;
    let sp = spriteCache.get(key);
    if (!sp) {
      sp = document.createElement('canvas');
      const pad = Math.ceil(size * 0.2);
      sp.width = size + pad * 2; sp.height = size + pad * 2;
      const sctx = sp.getContext('2d');
      sctx.font = `${size}px Arial`;
      sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
      sctx.fillText(emoji, sp.width / 2, sp.height / 2);
      spriteCache.set(key, sp);
    }
    return sp;
  }

  // ===== Game state =====
  const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, GAMEOVER: 3 };
  let state = STATE.MENU;

  let score = 0, wave = 1, sessionKills = 0;
  let lives = 3;

  // Player
  const player = {
    x: 0, y: 0, w: 40, h: 32,
    speed: 360,         // px/sec
    cooldown: 0,
    cooldownBase: 0.26, // baseline fire rate (~3.8 shots/sec)
    invul: 0,           // invulnerability timer after hit
    alive: true,
    // Power-up timers (seconds remaining)
    rapidT: 0,
    tripleT: 0,
    shieldT: 0
  };
  const STARTING_LIVES = 4;

  // Invaders
  let invaders = [];     // {x, y, w, h, type, alive, points, emoji}
  let invaderDir = 1;
  let invaderDropPending = false;
  const INVADER_TYPES = [
    { emoji: '👾', points: 30, color: '#ff4d6d' },
    { emoji: '👽', points: 20, color: '#00eaff' },
    { emoji: '🛸', points: 40, color: '#fff700' },
    { emoji: '🦠', points: 10, color: '#b388ff' }
  ];

  // Bullets
  const playerBullets = [];  // {x, y, w, h, vy, vx?}
  const invaderBullets = [];

  // Particles
  const particles = [];

  // Bunkers (destructible shields)
  let bunkers = [];          // {x, y, w, h, alive}   — many tiny blocks per bunker

  // UFO bonus
  let ufo = null;            // {x, y, w, h, vx, points}
  let ufoTimer = 18;         // seconds until next UFO

  // Power-ups (falling pickups)
  const powerups = [];       // {x, y, w, h, vy, kind}
  const POWERUP_KINDS = [
    { kind: 'rapid',  emoji: '⚡', color: '#fff700', duration: 8 },
    { kind: 'triple', emoji: '🔱', color: '#00eaff', duration: 10 },
    { kind: 'shield', emoji: '🛡️', color: '#b388ff', duration: 8 },
    { kind: 'life',   emoji: '❤️', color: '#ff4d6d', duration: 0 }
  ];

  // Starfield (parallax background)
  let stars = [];

  // ===== Input =====
  const keys = Object.create(null);
  const held = { left: false, right: false, fire: false };

  // ===== Sizing =====
  const STARS_PER_SCREEN = 60;
  function resize() {
    canvas.width = stage.clientWidth;
    canvas.height = stage.clientHeight;
    // Regenerate starfield to canvas size
    stars = Array.from({ length: STARS_PER_SCREEN }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random() * 1.5 + 0.3,
      v: Math.random() * 20 + 8
    }));
    // Place player at bottom-center
    player.y = canvas.height - player.h - 18;
    if (state === STATE.MENU || state === STATE.GAMEOVER) {
      player.x = (canvas.width - player.w) / 2;
    } else {
      player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    }
    spriteCache.clear();
    if (state === STATE.PLAYING || state === STATE.PAUSED) buildBunkers();
  }
  window.addEventListener('resize', resize);

  // ===== Invader formation =====
  function buildWave(n) {
    invaders.length = 0;
    invaderDir = 1;
    // Difficulty scaling — gentler so early waves feel manageable on mobile
    const rows = Math.min(6, 2 + Math.floor((n - 1) / 3));
    const cols = Math.min(10, 5 + Math.floor((n - 1) / 2));
    const cellW = 44;
    const cellH = 36;
    const totalW = cols * cellW;
    const startX = Math.max(20, (canvas.width - totalW) / 2);
    const startY = 60;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const typeIdx = r % INVADER_TYPES.length;
        const t = INVADER_TYPES[typeIdx];
        invaders.push({
          x: startX + c * cellW,
          y: startY + r * cellH,
          w: 32, h: 28,
          type: t,
          alive: true
        });
      }
    }
  }

  // Build 3-4 bunkers as a grid of small destructible blocks.
  // Each block is independent — bullets eat them away pixel-by-pixel (classic feel).
  function buildBunkers() {
    bunkers = [];
    const count = canvas.width < 480 ? 3 : 4;
    const blockSize = canvas.width < 480 ? 6 : 8;
    const cols = 7, rows = 4;
    const bunkerW = cols * blockSize;
    const totalW = count * bunkerW;
    const gap = (canvas.width - totalW) / (count + 1);
    const yBase = player.y - rows * blockSize - 30;
    for (let b = 0; b < count; b++) {
      const baseX = gap + b * (bunkerW + gap);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Carve out a U-shape from the bottom-center so the bunker has an opening
          if (r >= rows - 1 && c >= 2 && c <= cols - 3) continue;
          bunkers.push({
            x: baseX + c * blockSize,
            y: yBase + r * blockSize,
            w: blockSize,
            h: blockSize,
            alive: true
          });
        }
      }
    }
  }

  function spawnUFO() {
    const fromLeft = Math.random() < 0.5;
    const h = 28, w = 44;
    ufo = {
      x: fromLeft ? -w : canvas.width + w,
      y: 20,
      w, h,
      vx: (fromLeft ? 1 : -1) * (90 + Math.random() * 60),
      points: 100 + Math.floor(Math.random() * 4) * 50  // 100/150/200/250
    };
  }

  function spawnPowerup(x, y, kind) {
    powerups.push({
      x: x - 14, y: y - 14, w: 28, h: 28,
      vy: 90,
      kind
    });
  }

  // Pick a power-up kind; "life" is rare, others equal-weighted (life slightly more common now)
  function rollPowerupKind() {
    const r = Math.random();
    if (r < 0.06) return 'life';      // 6% extra life
    if (r < 0.37) return 'rapid';
    if (r < 0.70) return 'triple';
    return 'shield';
  }

  function applyPowerup(kind) {
    const def = POWERUP_KINDS.find(p => p.kind === kind);
    if (!def) return;
    if (kind === 'life') {
      lives = Math.min(7, lives + 1);
    } else if (kind === 'rapid') {
      player.rapidT = Math.max(player.rapidT, def.duration);
    } else if (kind === 'triple') {
      player.tripleT = Math.max(player.tripleT, def.duration);
    } else if (kind === 'shield') {
      player.shieldT = Math.max(player.shieldT, def.duration);
    }
    playSound('levelup');
    updateHud();
  }

  function invaderBaseSpeed() {
    // Speeds up as fewer invaders remain (classic effect) — gentler curve for casual play
    const total = invaders.length;
    const alive = invaders.reduce((s, i) => s + (i.alive ? 1 : 0), 0);
    const ratio = total > 0 ? alive / total : 1;
    return 22 + (1 - ratio) * 65 + (wave - 1) * 4;
  }

  function invaderShootCooldown() {
    // Less aggressive: at wave 5 ≈ 1.4s, wave 10 ≈ 1.1s, wave 20 ≈ 0.6s
    return Math.max(0.55, 1.65 - wave * 0.055);
  }
  let invaderShootTimer = 1.0;

  // ===== Particles =====
  function spawnExplosion(x, y, color) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 2 + Math.random() * 2.5,
        color
      });
    }
  }
  function spawnSparks(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.15,
        maxLife: 0.4,
        size: 1.5 + Math.random(),
        color
      });
    }
  }

  // ===== Game flow =====
  function newGame() {
    score = 0;
    wave = 1;
    sessionKills = 0;
    lives = STARTING_LIVES;
    player.invul = 0;
    player.alive = true;
    player.cooldown = 0;
    player.rapidT = 0;
    player.tripleT = 0;
    player.shieldT = 0;
    playerBullets.length = 0;
    invaderBullets.length = 0;
    particles.length = 0;
    powerups.length = 0;
    ufo = null;
    ufoTimer = 12;
    invaderShootTimer = 1.0;
    buildWave(wave);
    buildBunkers();
    updateHud();
  }

  function nextWave() {
    wave++;
    invaderBullets.length = 0;
    invaderShootTimer = 0.8;
    buildWave(wave);
    // Repair bunkers every 3 waves so they don't stay gone forever
    if (wave % 3 === 1) buildBunkers();
    playSound('levelup');
    updateHud();
  }

  function gameOver() {
    state = STATE.GAMEOVER;
    playSound('gameover');
    const prev = loadStats();
    const isNewBest = score > prev.bestScore;
    const updated = saveStats({
      bestScore: Math.max(prev.bestScore, score),
      maxWave: Math.max(prev.maxWave, wave),
      totalKills: prev.totalKills + sessionKills
    });
    goScore.textContent = score;
    goBest.textContent = updated.bestScore;
    goWave.textContent = wave;
    goKills.textContent = sessionKills;
    goTitle.textContent = 'GAME OVER';
    goNewBest.classList.toggle('hidden', !(isNewBest && score > 0));
    overlayGameover.classList.remove('hidden');
  }

  function pause() {
    if (state !== STATE.PLAYING) return;
    state = STATE.PAUSED;
    overlayPaused.classList.remove('hidden');
  }
  function resume() {
    if (state !== STATE.PAUSED) return;
    state = STATE.PLAYING;
    overlayPaused.classList.add('hidden');
    lastTime = performance.now();
  }

  // ===== Update =====
  function update(dt) {
    // Starfield scroll
    for (const s of stars) {
      s.y += s.v * dt;
      if (s.y > canvas.height) { s.y = -2; s.x = Math.random() * canvas.width; }
    }

    if (state !== STATE.PLAYING) return;

    // ===== Player movement =====
    const dir = (held.left || keys['ArrowLeft'] || keys['a'] || keys['A'] ? -1 : 0)
              + (held.right || keys['ArrowRight'] || keys['d'] || keys['D'] ? 1 : 0);
    player.x += dir * player.speed * dt;
    player.x = Math.max(8, Math.min(canvas.width - player.w - 8, player.x));

    // Power-up timers tick down
    if (player.rapidT > 0) player.rapidT -= dt;
    if (player.tripleT > 0) player.tripleT -= dt;
    if (player.shieldT > 0) player.shieldT -= dt;

    // Player shoot
    player.cooldown -= dt;
    const wantsFire = autoFire || held.fire || keys[' '] || keys['Spacebar'] || keys['ArrowUp'];
    if (wantsFire && player.cooldown <= 0) {
      const cx = player.x + player.w / 2;
      const cy = player.y;
      if (player.tripleT > 0) {
        playerBullets.push({ x: cx - 2, y: cy, w: 4, h: 14, vx: 0,    vy: -640 });
        playerBullets.push({ x: cx - 2, y: cy, w: 4, h: 14, vx: -180, vy: -620 });
        playerBullets.push({ x: cx - 2, y: cy, w: 4, h: 14, vx: 180,  vy: -620 });
      } else {
        playerBullets.push({ x: cx - 2, y: cy, w: 4, h: 14, vx: 0, vy: -640 });
      }
      player.cooldown = player.rapidT > 0 ? player.cooldownBase * 0.4 : player.cooldownBase;
      playSound('shoot');
    }

    if (player.invul > 0) player.invul -= dt;

    // ===== Invaders =====
    const speed = invaderBaseSpeed();
    let edge = false;
    for (const inv of invaders) {
      if (!inv.alive) continue;
      inv.x += invaderDir * speed * dt;
      if (inv.x < 6 || inv.x + inv.w > canvas.width - 6) edge = true;
    }
    if (edge) {
      invaderDir *= -1;
      for (const inv of invaders) {
        if (!inv.alive) continue;
        inv.y += 14;
      }
    }

    // Invaders eat bunker blocks they overlap (so descending invaders carve through shields)
    if (bunkers.length) {
      for (const inv of invaders) {
        if (!inv.alive) continue;
        for (const bk of bunkers) {
          if (!bk.alive) continue;
          if (inv.x < bk.x + bk.w && inv.x + inv.w > bk.x &&
              inv.y < bk.y + bk.h && inv.y + inv.h > bk.y) {
            bk.alive = false;
          }
        }
      }
    }

    // Invader shooting
    invaderShootTimer -= dt;
    if (invaderShootTimer <= 0) {
      // Pick a random alive invader on the bottom of its column
      const aliveCols = new Map();
      for (const inv of invaders) {
        if (!inv.alive) continue;
        const col = Math.round(inv.x);
        const prev = aliveCols.get(col);
        if (!prev || inv.y > prev.y) aliveCols.set(col, inv);
      }
      const shooters = Array.from(aliveCols.values());
      if (shooters.length) {
        const pick = shooters[Math.floor(Math.random() * shooters.length)];
        invaderBullets.push({
          x: pick.x + pick.w / 2 - 2,
          y: pick.y + pick.h,
          w: 4, h: 12,
          vy: 190 + wave * 8
        });
        playSound('enemy_shoot');
      }
      invaderShootTimer = invaderShootCooldown();
    }

    // ===== UFO bonus =====
    if (ufo) {
      ufo.x += ufo.vx * dt;
      if ((ufo.vx > 0 && ufo.x > canvas.width + ufo.w) ||
          (ufo.vx < 0 && ufo.x + ufo.w < 0)) {
        ufo = null;
      }
    } else {
      ufoTimer -= dt;
      if (ufoTimer <= 0) {
        spawnUFO();
        ufoTimer = 13 + Math.random() * 12;
      }
    }

    // ===== Power-ups falling =====
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.vy * dt;
      if (p.y > canvas.height) { powerups.splice(i, 1); continue; }
      // Catch
      if (p.x < player.x + player.w && p.x + p.w > player.x &&
          p.y < player.y + player.h && p.y + p.h > player.y) {
        applyPowerup(p.kind);
        powerups.splice(i, 1);
        spawnSparks(p.x + p.w / 2, p.y + p.h / 2, '#fff700');
      }
    }

    // ===== Bullets: player =====
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      const b = playerBullets[i];
      b.y += b.vy * dt;
      if (b.vx) b.x += b.vx * dt;
      if (b.y + b.h < 0 || b.x < -10 || b.x > canvas.width + 10) {
        playerBullets.splice(i, 1); continue;
      }
      // Bunker hit (eat block)
      let hitBunker = false;
      for (const bk of bunkers) {
        if (!bk.alive) continue;
        if (b.x < bk.x + bk.w && b.x + b.w > bk.x &&
            b.y < bk.y + bk.h && b.y + b.h > bk.y) {
          bk.alive = false;
          spawnSparks(b.x + b.w / 2, b.y + b.h / 2, '#22c55e');
          hitBunker = true;
          break;
        }
      }
      if (hitBunker) { playerBullets.splice(i, 1); continue; }
      // UFO hit
      if (ufo && b.x < ufo.x + ufo.w && b.x + b.w > ufo.x &&
          b.y < ufo.y + ufo.h && b.y + b.h > ufo.y) {
        score += ufo.points;
        sessionKills++;
        spawnExplosion(ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, '#fff700');
        playSound('explode');
        // UFO always drops a power-up
        spawnPowerup(ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, rollPowerupKind());
        ufo = null;
        playerBullets.splice(i, 1);
        updateHud();
        continue;
      }
      // Invader hit
      for (const inv of invaders) {
        if (!inv.alive) continue;
        if (b.x < inv.x + inv.w && b.x + b.w > inv.x &&
            b.y < inv.y + inv.h && b.y + b.h > inv.y) {
          inv.alive = false;
          playerBullets.splice(i, 1);
          score += inv.type.points;
          sessionKills++;
          spawnExplosion(inv.x + inv.w / 2, inv.y + inv.h / 2, inv.type.color);
          playSound('hit');
          // 20% chance to drop a power-up (was 12%) — keep the player powered up more often
          if (Math.random() < 0.20) {
            spawnPowerup(inv.x + inv.w / 2, inv.y + inv.h / 2, rollPowerupKind());
          }
          updateHud();
          break;
        }
      }
    }

    // ===== Bullets: invader =====
    for (let i = invaderBullets.length - 1; i >= 0; i--) {
      const b = invaderBullets[i];
      b.y += b.vy * dt;
      if (b.y > canvas.height) { invaderBullets.splice(i, 1); continue; }
      // Bunker hit
      let hitBunker = false;
      for (const bk of bunkers) {
        if (!bk.alive) continue;
        if (b.x < bk.x + bk.w && b.x + b.w > bk.x &&
            b.y < bk.y + bk.h && b.y + b.h > bk.y) {
          bk.alive = false;
          spawnSparks(b.x + b.w / 2, b.y + b.h / 2, '#ff4d6d');
          hitBunker = true;
          break;
        }
      }
      if (hitBunker) { invaderBullets.splice(i, 1); continue; }
      // Player hit (shield power-up acts like invul)
      const hasShield = player.shieldT > 0;
      if (player.invul <= 0 && !hasShield &&
          b.x < player.x + player.w && b.x + b.w > player.x &&
          b.y < player.y + player.h && b.y + b.h > player.y) {
        invaderBullets.splice(i, 1);
        lives--;
        player.invul = 2.0;
        spawnExplosion(player.x + player.w / 2, player.y + player.h / 2, '#ff4d6d');
        playSound('explode');
        updateHud();
        if (lives <= 0) { gameOver(); return; }
      } else if (hasShield &&
          b.x < player.x + player.w && b.x + b.w > player.x &&
          b.y < player.y + player.h && b.y + b.h > player.y) {
        // Shield absorbs the bullet
        invaderBullets.splice(i, 1);
        spawnSparks(b.x + b.w / 2, b.y + b.h / 2, '#b388ff');
      }
    }

    // ===== Particles =====
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.96; p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // ===== Win wave =====
    if (invaders.every(i => !i.alive)) {
      nextWave();
      return;
    }

    // ===== Lose: invader reaches player line =====
    for (const inv of invaders) {
      if (inv.alive && inv.y + inv.h >= player.y) {
        lives = 0;
        updateHud();
        gameOver();
        return;
      }
    }
  }

  // ===== Render =====
  function draw() {
    // Background
    ctx.fillStyle = '#050714';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Starfield
    ctx.fillStyle = '#ffffff';
    for (const s of stars) {
      ctx.globalAlpha = 0.3 + s.s * 0.4;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // Invaders
    for (const inv of invaders) {
      if (!inv.alive) continue;
      const sp = getSprite(inv.type.emoji, inv.h);
      ctx.drawImage(sp, inv.x + inv.w / 2 - sp.width / 2, inv.y + inv.h / 2 - sp.height / 2);
    }

    // UFO bonus
    if (ufo) {
      const sp = getSprite('🛸', ufo.h);
      ctx.drawImage(sp, ufo.x + ufo.w / 2 - sp.width / 2, ufo.y + ufo.h / 2 - sp.height / 2);
      // Glow trail
      ctx.fillStyle = 'rgba(255, 247, 0, 0.25)';
      const trailDir = ufo.vx > 0 ? -1 : 1;
      for (let k = 1; k <= 3; k++) {
        ctx.fillRect(ufo.x + ufo.w / 2 + trailDir * k * 10 - 3, ufo.y + ufo.h / 2 - 2, 6, 4);
      }
    }

    // Bunkers (green blocks)
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 4;
    for (const bk of bunkers) {
      if (bk.alive) ctx.fillRect(bk.x, bk.y, bk.w, bk.h);
    }
    ctx.shadowBlur = 0;

    // Power-ups falling
    for (const p of powerups) {
      const def = POWERUP_KINDS.find(k => k.kind === p.kind);
      if (!def) continue;
      // Glow
      ctx.fillStyle = def.color;
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(performance.now() / 120);
      ctx.fillRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
      ctx.globalAlpha = 1;
      const sp = getSprite(def.emoji, p.h);
      ctx.drawImage(sp, p.x + p.w / 2 - sp.width / 2, p.y + p.h / 2 - sp.height / 2);
    }

    // Player bullets
    ctx.fillStyle = '#fff700';
    ctx.shadowColor = '#fff700'; ctx.shadowBlur = 8;
    for (const b of playerBullets) ctx.fillRect(b.x, b.y, b.w, b.h);

    // Invader bullets
    ctx.fillStyle = '#ff4d6d';
    ctx.shadowColor = '#ff4d6d';
    for (const b of invaderBullets) ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;

    // Player (blink if invulnerable, glow if shield)
    if (state !== STATE.MENU && lives > 0) {
      // Shield aura
      if (player.shieldT > 0) {
        const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 120);
        ctx.save();
        ctx.globalAlpha = 0.5 * pulse;
        ctx.strokeStyle = '#b388ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x + player.w / 2, player.y + player.h / 2, player.w * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      const blink = player.invul > 0 && Math.floor(player.invul * 12) % 2 === 0;
      if (!blink) {
        const sp = getSprite('🚀', player.h);
        ctx.save();
        ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
        ctx.rotate(-Math.PI / 4);
        ctx.drawImage(sp, -sp.width / 2, -sp.height / 2);
        ctx.restore();
      }
    }

    // Active power-up indicators (small icons + timer bars, top-left of stage)
    drawPowerupIndicators();

    // Particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawPowerupIndicators() {
    const items = [];
    if (player.rapidT > 0)  items.push({ emoji: '⚡',  t: player.rapidT,  max: 6,  color: '#fff700' });
    if (player.tripleT > 0) items.push({ emoji: '🔱', t: player.tripleT, max: 8,  color: '#00eaff' });
    if (player.shieldT > 0) items.push({ emoji: '🛡️', t: player.shieldT, max: 6,  color: '#b388ff' });
    if (!items.length) return;
    const iconSize = 22;
    const barW = 40;
    const padding = 6;
    const startX = 10;
    const startY = 10;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const y = startY + i * (iconSize + 6);
      const sp = getSprite(it.emoji, iconSize);
      ctx.drawImage(sp, startX - (sp.width - iconSize) / 2, y - (sp.height - iconSize) / 2);
      // Timer bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(startX + iconSize + padding, y + iconSize / 2 - 3, barW, 6);
      ctx.fillStyle = it.color;
      ctx.fillRect(startX + iconSize + padding, y + iconSize / 2 - 3, barW * Math.max(0, Math.min(1, it.t / it.max)), 6);
    }
  }

  // ===== HUD =====
  function updateHud() {
    uiScore.textContent = score;
    uiLives.textContent = '❤'.repeat(Math.max(0, lives)) || '·';
    uiWave.textContent = wave;
    uiBest.textContent = loadStats().bestScore;
  }

  function refreshStartScreen() {
    const s = loadStats();
    startBest.textContent = s.bestScore;
    startWave.textContent = s.maxWave;
  }

  // ===== Loop =====
  let lastTime = 0;
  function loop(ts) {
    let dt = (ts - lastTime) / 1000;
    lastTime = ts;
    if (dt > 0.05) dt = 0.05; // clamp big frame skips
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ===== Input wiring =====
  document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'p' || e.key === 'P') {
      state === STATE.PLAYING ? pause() : (state === STATE.PAUSED ? resume() : null);
    }
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });

  function bindHold(btn, key) {
    const set = (v) => { held[key] = v; btn.classList.toggle('holding', v); };
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); ensureAudio(); set(true); });
    btn.addEventListener('pointerup', () => set(false));
    btn.addEventListener('pointerleave', () => set(false));
    btn.addEventListener('pointercancel', () => set(false));
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }
  bindHold(btnLeft, 'left');
  bindHold(btnRight, 'right');
  bindHold(btnFire, 'fire');

  btnStart.addEventListener('click', () => {
    ensureAudio();
    state = STATE.PLAYING;
    newGame();
    overlayStart.classList.add('hidden');
    overlayGameover.classList.add('hidden');
    overlayPaused.classList.add('hidden');
    lastTime = performance.now();
  });
  btnRestart.addEventListener('click', () => {
    ensureAudio();
    state = STATE.PLAYING;
    newGame();
    overlayGameover.classList.add('hidden');
    overlayPaused.classList.add('hidden');
    lastTime = performance.now();
  });
  btnResume.addEventListener('click', resume);
  btnPause.addEventListener('click', () => state === STATE.PLAYING ? pause() : resume());
  btnMute.addEventListener('click', () => {
    isMuted = !isMuted;
    btnMute.textContent = isMuted ? '🔇' : '🔊';
    btnMute.style.opacity = isMuted ? '0.5' : '1';
    saveStats({ muted: isMuted });
  });

  // Initial mute icon reflects saved state
  btnMute.textContent = isMuted ? '🔇' : '🔊';
  btnMute.style.opacity = isMuted ? '0.5' : '1';

  // Auto-fire toggle
  function refreshAutoBtn() {
    btnAuto.classList.toggle('on', autoFire);
    btnAuto.title = autoFire ? 'Auto Fire: ON' : 'Auto Fire: OFF';
    // Also reflect on the FIRE button so player can see it's automated
    btnFire.textContent = autoFire ? '🅰️ AUTO' : '🔥 FIRE';
  }
  btnAuto.addEventListener('click', () => {
    autoFire = !autoFire;
    saveStats({ autoFire });
    refreshAutoBtn();
  });
  refreshAutoBtn();

  // Disable context menu inside game area (prevents long-press hold menus on mobile)
  stage.addEventListener('contextmenu', e => e.preventDefault());

  // ===== Boot =====
  resize();
  refreshStartScreen();
  updateHud();
  requestAnimationFrame(loop);
})();
