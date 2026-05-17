// Platformer — 2D side-scroller with double-jump, dash, sword combat, coins,
// enemies, particles, parallax background, mobile touch controls.
// All code lives in this file but is organized into logical sections.

// =================================================================
// AUDIO  (shared AudioContext, synthesized SFX, no external files)
// =================================================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.3;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('plfMuted') === '1';
function applyMute() { masterGain.gain.value = muted ? 0 : 0.3; }
applyMute();
function toggleMute() {
  muted = !muted;
  localStorage.setItem('plfMuted', muted ? '1' : '0');
  applyMute();
  const b = document.getElementById('plf-mute-btn');
  if (b) b.textContent = muted ? '🔇' : '🔊';
}
window.platformerToggleMute = toggleMute;

function beep(o) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(o.freq, audioCtx.currentTime);
  if (o.freqEnd != null) osc.frequency.linearRampToValueAtTime(o.freqEnd, audioCtx.currentTime + (o.dur || 0.1));
  gain.gain.setValueAtTime(o.gain || 0.3, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (o.dur || 0.1));
  osc.connect(gain); gain.connect(masterGain);
  osc.start(); osc.stop(audioCtx.currentTime + (o.dur || 0.1));
}
const SFX = {
  jump:     () => beep({ type: 'triangle', freq: 500, freqEnd: 800, dur: 0.12, gain: 0.30 }),
  djump:    () => beep({ type: 'triangle', freq: 700, freqEnd: 1100, dur: 0.12, gain: 0.32 }),
  dash:     () => beep({ type: 'sawtooth', freq: 300, freqEnd: 600, dur: 0.15, gain: 0.28 }),
  attack:   () => beep({ type: 'square', freq: 400, freqEnd: 700, dur: 0.10, gain: 0.30 }),
  hit:      () => beep({ type: 'sawtooth', freq: 200, freqEnd: 100, dur: 0.15, gain: 0.35 }),
  coin:     () => { beep({ type: 'triangle', freq: 880, dur: 0.05, gain: 0.30 });
                    setTimeout(() => beep({ type: 'triangle', freq: 1320, dur: 0.10, gain: 0.30 }), 50); },
  hurt:     () => beep({ type: 'sawtooth', freq: 200, freqEnd: 80, dur: 0.25, gain: 0.35 }),
  death:    () => beep({ type: 'sawtooth', freq: 400, freqEnd: 60, dur: 0.6, gain: 0.4 }),
  check:    () => { [523, 659, 784].forEach((f, i) =>
                      setTimeout(() => beep({ type: 'triangle', freq: f, dur: 0.15, gain: 0.35 }), i * 100)); },
  victory:  () => { [523, 659, 784, 1046].forEach((f, i) =>
                      setTimeout(() => beep({ type: 'triangle', freq: f, dur: 0.18, gain: 0.4 }), i * 130)); }
};

// =================================================================
// CONFIG
// =================================================================
const WORLD_W = 4200, WORLD_H = 480;
const VIEW_W = 800, VIEW_H = 450;            // logical viewport (scaled to fit screen)
const GRAVITY = 0.55;
const JUMP_VEL = -11;
const MOVE_ACCEL = 0.6;
const MOVE_MAX = 4.5;
const FRICTION = 0.82;
const AIR_FRICTION = 0.96;
const DASH_VEL = 9;
const DASH_DUR = 14;       // frames
const DASH_COOLDOWN = 60;  // frames
const ATTACK_DUR = 12;
const ATTACK_COOLDOWN = 24;
const IFRAME_DUR = 60;
const MAX_HP = 5;
const DEATH_FLOOR = 520;

// =================================================================
// INPUT  (keyboard + touch joystick + buttons)
// =================================================================
const keys = { left: false, right: false, up: false, down: false, jump: false, attack: false, dash: false };
let jumpPressed = false, attackPressed = false, dashPressed = false;
let lastJumpFrame = -999, lastAttackFrame = -999, lastDashFrame = -999;

function setKey(k, down) {
  if (k === 'ArrowLeft' || k === 'a' || k === 'A')        keys.left = down;
  else if (k === 'ArrowRight' || k === 'd' || k === 'D')  keys.right = down;
  else if (k === 'ArrowDown' || k === 's' || k === 'S')   keys.down = down;
  else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') {
    if (down && !keys.jump) jumpPressed = true;
    keys.jump = down;
  } else if (k === 'x' || k === 'X' || k === 'j' || k === 'J') {
    if (down && !keys.attack) attackPressed = true;
    keys.attack = down;
  } else if (k === 'c' || k === 'C' || k === 'Shift') {
    if (down && !keys.dash) dashPressed = true;
    keys.dash = down;
  }
}
window.addEventListener('keydown', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  if (e.key === 'p' || e.key === 'P') togglePause();
  if (e.key === 'Escape') togglePause();
  setKey(e.key, true);
});
window.addEventListener('keyup', (e) => setKey(e.key, false));

// Virtual joystick state
const stick = { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0, id: -1 };

// =================================================================
// PARTICLES
// =================================================================
const particles = [];
function spawnParticle(x, y, vx, vy, color, life, size) {
  if (particles.length > 180) particles.shift();
  particles.push({ x, y, vx, vy, color, life, maxLife: life, size: size || 4, gravity: 0.18 });
}
function burst(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random());
    spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s - speed * 0.3, color, 30 + Math.random() * 20, 3 + Math.random() * 3);
  }
}
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
function drawParticles(ctx, cam) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - cam.x, p.y - cam.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// =================================================================
// LEVEL PROGRESSION — 100 levels, procedurally generated; boss every 10.
// =================================================================
const MAX_LEVELS = 100;
let currentLevel = 1;
let progress = (() => {
  try { return JSON.parse(localStorage.getItem('plfProgress') || '{}'); }
  catch { return {}; }
})();
if (!progress.highestUnlocked) progress.highestUnlocked = 1;
if (!progress.completed) progress.completed = {};
function saveProgress() { localStorage.setItem('plfProgress', JSON.stringify(progress)); }

const BOSS_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f97316',
                     '#dc2626', '#0ea5e9', '#8b5cf6', '#facc15', '#1f2937'];

function generateLevel(num) {
  return (num % 10 === 0) ? generateBossArena(num) : generateRegularLevel(num);
}

function pickEnemyVariant(levelNum) {
  const r = Math.random();
  if (levelNum < 10) return 'green';
  if (levelNum < 25) return r < 0.7 ? 'green' : 'blue';
  if (levelNum < 50) {
    if (r < 0.45) return 'green';
    if (r < 0.75) return 'blue';
    return 'red';
  }
  // 50+
  if (r < 0.25) return 'green';
  if (r < 0.55) return 'blue';
  if (r < 0.85) return 'red';
  return 'purple';
}

function generateRegularLevel(num) {
  const diff = Math.min(1, (num - 1) / 90);
  const platforms = [];
  const enemies = [];
  const coins = [];
  const movingPlatforms = [];
  const powerups = [];

  const numSegments = 2 + Math.min(4, Math.floor(diff * 5));
  const minSegLen = Math.max(220, 500 - diff * 280);
  const maxSegLen = Math.max(380, 800 - diff * 320);
  const minGap = 90 + diff * 40;
  const maxGap = 130 + diff * 200;

  let cursor = 0;
  let checkpointPlaced = false;
  let checkpoint = null;

  for (let i = 0; i < numSegments; i++) {
    const segLen = minSegLen + Math.random() * (maxSegLen - minSegLen);
    platforms.push({ x: cursor, y: 400, w: segLen, h: 80 });

    // Coins on ground
    const coinCount = 2 + Math.floor(Math.random() * 3);
    for (let c = 0; c < coinCount; c++) {
      coins.push([cursor + 50 + Math.random() * (segLen - 100), 360]);
    }

    // Floating platforms above
    const numFloats = 1 + Math.floor(diff * 3 + Math.random() * 2);
    for (let f = 0; f < numFloats; f++) {
      const fw = 80 + Math.random() * 50;
      const fx = cursor + 40 + Math.random() * Math.max(20, segLen - fw - 60);
      const fy = 160 + Math.random() * 180;
      platforms.push({ x: fx, y: fy, w: fw, h: 16 });
      if (Math.random() < 0.75) coins.push([fx + fw / 2, fy - 24]);
    }

    // Enemies on this segment
    if (i > 0) {
      const enemyChance = 0.45 + diff * 0.45;
      if (Math.random() < enemyChance) {
        enemies.push({
          x: cursor + 80 + Math.random() * (segLen - 160), y: 380,
          leftBound: cursor + 20, rightBound: cursor + segLen - 20,
          variant: pickEnemyVariant(num)
        });
      }
      // Second enemy on harder levels
      if (diff > 0.35 && segLen > 360 && Math.random() < 0.45) {
        enemies.push({
          x: cursor + 60 + Math.random() * (segLen - 200), y: 380,
          leftBound: cursor + 20, rightBound: cursor + segLen - 20,
          variant: pickEnemyVariant(num)
        });
      }
    }

    // Place checkpoint roughly halfway through long levels
    if (!checkpointPlaced && numSegments >= 3 && i === Math.floor(numSegments / 2)) {
      checkpoint = { x: cursor + 60, y: 360 };
      checkpointPlaced = true;
    }

    // Gap (death pit between segments)
    if (i < numSegments - 1) {
      const gapLen = minGap + Math.random() * (maxGap - minGap);
      // Maybe drop a moving platform over the gap
      if (diff > 0.15 && Math.random() < diff * 0.85) {
        movingPlatforms.push({
          x: cursor + segLen + gapLen * 0.5 - 35, y: 320,
          w: 70, h: 14, yMin: 210, yMax: 380,
          dy: (0.8 + Math.random() * 1.4) * (Math.random() < 0.5 ? 1 : -1)
        });
      }
      cursor += segLen + gapLen;
    } else {
      cursor += segLen;
    }
  }

  // Power-ups
  if (num % 5 === 0 || Math.random() < 0.35) {
    powerups.push({
      x: 200 + Math.random() * Math.max(200, cursor - 400),
      y: 200 + Math.random() * 100,
      type: (num % 10 === 5) ? 'star' : 'heart'
    });
  }
  if (diff > 0.5 && Math.random() < 0.4) {
    powerups.push({
      x: 200 + Math.random() * Math.max(200, cursor - 400),
      y: 200 + Math.random() * 100,
      type: Math.random() < 0.35 ? 'star' : 'heart'
    });
  }

  return {
    num, isBoss: false, isFinalBoss: false, worldW: cursor + 200,
    platforms, enemies, coins, movingPlatforms, powerups,
    checkpoint, goal: { x: cursor + 100, y: 350 },
    spawn: { x: 50, y: 360 }
  };
}

function generateBossArena(num) {
  const isFinal = (num === 100);
  const worldW = isFinal ? 1500 : 1200;
  const platforms = [
    { x: 0, y: 400, w: worldW, h: 80 },
    { x: 180, y: 280, w: 140, h: 16 },
    { x: worldW - 320, y: 280, w: 140, h: 16 }
  ];
  if (isFinal) platforms.push({ x: worldW / 2 - 80, y: 220, w: 160, h: 16 });
  return {
    num, isBoss: true, isFinalBoss: isFinal, worldW,
    platforms, enemies: [], coins: [], movingPlatforms: [], powerups: [],
    checkpoint: null,
    goal: { x: worldW - 60, y: 350 },
    spawn: { x: 60, y: 360 }
  };
}

// =================================================================
// PLAYER
// =================================================================
class Player {
  constructor(spawn) {
    spawn = spawn || { x: 50, y: 360 };
    this.reset(spawn.x, spawn.y);
    this.hp = MAX_HP;
    this.coins = 0;
  }
  reset(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.w = 24; this.h = 36;
    this.facing = 1;
    this.onGround = false;
    this.jumpsLeft = 2;
    this.dashFrames = 0;
    this.dashCdFrames = 0;
    this.attackFrames = 0;
    this.attackCdFrames = 0;
    this.iframes = 0;
    this.starTime = 0;
    this.dead = false;
    this.animFrame = 0;
  }
  update(level) {
    if (this.dead) return;
    this.animFrame++;
    this.dashCdFrames = Math.max(0, this.dashCdFrames - 1);
    this.attackCdFrames = Math.max(0, this.attackCdFrames - 1);
    this.iframes = Math.max(0, this.iframes - 1);
    if (this.starTime > 0) {
      this.starTime--;
      this.iframes = Math.max(this.iframes, 2); // keep invincible
      // Sparkle trail
      if (this.animFrame % 3 === 0) {
        spawnParticle(this.x + this.w / 2 + (Math.random() - 0.5) * 12,
          this.y + this.h * Math.random(),
          (Math.random() - 0.5) * 1, -Math.random() * 1,
          ['#fbbf24', '#a855f7', '#ec4899', '#22d3ee'][Math.floor(Math.random() * 4)],
          20, 3);
      }
    }
    if (this.attackFrames > 0) this.attackFrames--;

    // Horizontal input
    const moving = keys.left || keys.right;
    if (this.dashFrames > 0) {
      // Locked dash velocity
      this.dashFrames--;
    } else {
      if (keys.left)  { this.vx -= MOVE_ACCEL; this.facing = -1; }
      if (keys.right) { this.vx += MOVE_ACCEL; this.facing =  1; }
      if (!moving) {
        this.vx *= this.onGround ? FRICTION : AIR_FRICTION;
        if (Math.abs(this.vx) < 0.1) this.vx = 0;
      }
      this.vx = Math.max(-MOVE_MAX, Math.min(MOVE_MAX, this.vx));
    }

    // Jump
    if (jumpPressed) {
      jumpPressed = false;
      if (this.onGround || this.jumpsLeft > 0) {
        const wasDouble = !this.onGround;
        this.vy = JUMP_VEL;
        this.onGround = false;
        this.jumpsLeft--;
        if (wasDouble) {
          SFX.djump();
          // Double-jump puff
          burst(this.x + this.w / 2, this.y + this.h, '#fff', 8, 2);
        } else {
          SFX.jump();
        }
      }
    }

    // Dash
    if (dashPressed) {
      dashPressed = false;
      if (this.dashCdFrames === 0) {
        this.dashFrames = DASH_DUR;
        this.dashCdFrames = DASH_COOLDOWN;
        this.iframes = Math.max(this.iframes, DASH_DUR);
        this.vx = this.facing * DASH_VEL;
        this.vy = 0;
        SFX.dash();
        burst(this.x + this.w / 2, this.y + this.h / 2, '#7dd3fc', 12, 3);
      }
    }

    // Attack
    if (attackPressed) {
      attackPressed = false;
      if (this.attackCdFrames === 0) {
        this.attackFrames = ATTACK_DUR;
        this.attackCdFrames = ATTACK_COOLDOWN;
        SFX.attack();
      }
    }

    // Gravity
    this.vy += GRAVITY;
    if (this.vy > 14) this.vy = 14;

    // Apply velocity with collision
    this.moveAndCollide(level);

    // Death pit
    if (this.y > DEATH_FLOOR) this.takeDamage(MAX_HP); // instant kill

    // Coins
    for (let i = level.coins.length - 1; i >= 0; i--) {
      const c = level.coins[i];
      if (this.aabb(this.x, this.y, this.w, this.h, c.x - 8, c.y - 8, 16, 16)) {
        this.coins++;
        burst(c.x, c.y, '#fde047', 8, 2);
        SFX.coin();
        level.coins.splice(i, 1);
      }
    }

    // Power-ups
    for (let i = level.powerups.length - 1; i >= 0; i--) {
      const p = level.powerups[i];
      if (this.aabb(this.x, this.y, this.w, this.h, p.x - 14, p.y - 14, 28, 28)) {
        if (p.type === 'heart') {
          this.hp = Math.min(MAX_HP, this.hp + 1);
          burst(p.x, p.y, '#ef4444', 16, 2);
          SFX.check();
        } else if (p.type === 'star') {
          this.starTime = 300; // ~5 seconds at 60fps
          burst(p.x, p.y, '#facc15', 24, 3);
          SFX.victory();
        }
        level.powerups.splice(i, 1);
      }
    }

    // Checkpoint (may not exist on short / boss levels)
    const cp = level.checkpointObj;
    if (cp && !cp.activated && this.aabb(this.x, this.y, this.w, this.h, cp.x - 16, cp.y - 40, 32, 60)) {
      cp.activated = true;
      level.activeCheckpoint = { x: cp.x, y: cp.y - this.h };
      SFX.check();
      burst(cp.x, cp.y - 20, '#22c55e', 16, 2);
    }

    // Goal — on boss levels, only triggers after boss is defeated
    const gl = level.goalObj;
    const bossOK = !level.isBoss || (level.boss && level.boss.dead);
    if (bossOK && this.aabb(this.x, this.y, this.w, this.h, gl.x - 20, gl.y - 60, 40, 80)) {
      win();
    }
  }
  moveAndCollide(level) {
    // Move X then check
    this.x += this.vx;
    for (const p of allPlatforms()) {
      if (this.aabb(this.x, this.y, this.w, this.h, p.x, p.y, p.w, p.h)) {
        if (this.vx > 0) this.x = p.x - this.w;
        else if (this.vx < 0) this.x = p.x + p.w;
        this.vx = 0;
      }
    }
    const ww = (level && level.worldW) || WORLD_W;
    if (this.x < 0) this.x = 0;
    if (this.x + this.w > ww) this.x = ww - this.w;

    // Move Y then check
    this.y += this.vy;
    this.onGround = false;
    for (const p of allPlatforms()) {
      if (this.aabb(this.x, this.y, this.w, this.h, p.x, p.y, p.w, p.h)) {
        if (this.vy > 0) {
          this.y = p.y - this.h;
          if (this.vy > 4) burst(this.x + this.w / 2, this.y + this.h, '#cbd5e1', 6, 1.5);
          this.vy = 0;
          this.onGround = true;
          this.jumpsLeft = 2;
        } else if (this.vy < 0) {
          this.y = p.y + p.h;
          this.vy = 0;
        }
      }
    }
  }
  takeDamage(amount) {
    if (this.iframes > 0 || this.dead) return;
    this.hp -= amount;
    this.iframes = IFRAME_DUR;
    cameraShake(8, 12);
    SFX.hurt();
    burst(this.x + this.w / 2, this.y + this.h / 2, '#ef4444', 14, 3);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      SFX.death();
      setTimeout(() => onPlayerDeath(), 800);
    }
  }
  getAttackBox() {
    if (this.attackFrames <= 0) return null;
    const reach = 28;
    return {
      x: this.facing > 0 ? this.x + this.w : this.x - reach,
      y: this.y + 4, w: reach, h: this.h - 8
    };
  }
  aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }
  draw(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    // Don't flicker during star invincibility (it's its own visual)
    const isHurt = this.starTime <= 0 && this.iframes > 0 && (this.iframes % 8 < 4);
    if (isHurt) return; // flicker

    // Star aura (rainbow glow)
    if (this.starTime > 0) {
      const auraR = 26 + Math.sin(this.animFrame * 0.3) * 3;
      const hue = (this.animFrame * 8) % 360;
      ctx.fillStyle = `hsla(${hue}, 95%, 65%, 0.35)`;
      ctx.beginPath();
      ctx.arc(sx + this.w / 2, sy + this.h / 2, auraR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Trail when dashing
    if (this.dashFrames > 0) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(sx - this.facing * 6, sy + 6, this.w, this.h - 6);
      ctx.globalAlpha = 1;
    }

    // Body
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(sx, sy + 12, this.w, this.h - 12);
    // Head
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(sx + this.w / 2, sy + 10, 11, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#000';
    const eyeOff = this.facing > 0 ? 2 : -2;
    ctx.fillRect(sx + this.w / 2 + eyeOff - 4, sy + 8, 2, 2);
    ctx.fillRect(sx + this.w / 2 + eyeOff + 2, sy + 8, 2, 2);
    // Legs (simple animation)
    ctx.fillStyle = '#3b0764';
    if (this.onGround && Math.abs(this.vx) > 0.5) {
      const phase = Math.sin(this.animFrame * 0.4) * 3;
      ctx.fillRect(sx + 3, sy + this.h - 4, 6, 4 + phase);
      ctx.fillRect(sx + this.w - 9, sy + this.h - 4, 6, 4 - phase);
    } else {
      ctx.fillRect(sx + 3, sy + this.h - 4, 6, 4);
      ctx.fillRect(sx + this.w - 9, sy + this.h - 4, 6, 4);
    }

    // Sword slash
    if (this.attackFrames > 0) {
      const prog = 1 - this.attackFrames / ATTACK_DUR;
      const startA = this.facing > 0 ? -Math.PI / 2 : Math.PI / 2;
      const endA = startA + this.facing * Math.PI * 0.9;
      const ang = startA + (endA - startA) * prog;
      const cx = sx + this.w / 2 + this.facing * 4;
      const cy = sy + this.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      // Slash arc
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 22, -0.4, 0.4);
      ctx.stroke();
      // Sword
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(8, -2, 22, 4);
      ctx.restore();
    }
  }
}

// =================================================================
// ENEMY (slime)
// =================================================================
// Enemy variants: green (default), blue (tank), red (fast), purple (jumper)
const ENEMY_VARIANTS = {
  green:  { hp: 2, speed: 0.8, color: '#16a34a', body: '#22c55e', size: 1.0 },
  blue:   { hp: 4, speed: 0.5, color: '#1d4ed8', body: '#3b82f6', size: 1.2 },
  red:    { hp: 2, speed: 1.6, color: '#991b1b', body: '#ef4444', size: 0.95 },
  purple: { hp: 3, speed: 1.0, color: '#6b21a8', body: '#a855f7', size: 1.05 }
};

class Enemy {
  constructor(opts) {
    const v = ENEMY_VARIANTS[opts.variant || 'green'] || ENEMY_VARIANTS.green;
    this.variant = opts.variant || 'green';
    this.x = opts.x; this.y = opts.y;
    this.w = 28 * v.size; this.h = 22 * v.size;
    this.vx = v.speed * (Math.random() < 0.5 ? -1 : 1);
    this.speed = v.speed;
    this.bodyColor = v.body;
    this.deadColor = v.color;
    this.leftBound = opts.leftBound;
    this.rightBound = opts.rightBound;
    this.hp = v.hp;
    this.maxHp = v.hp;
    this.dead = false;
    this.knockback = 0;
    this.knockbackVy = 0;
    this.deathTimer = 0;
    this.animFrame = 0;
    this.jumpCd = this.variant === 'purple' ? 90 : 0;
    this.vy = 0;
  }
  update() {
    if (this.dead) {
      this.deathTimer--;
      return;
    }
    this.animFrame++;
    if (this.knockback !== 0) {
      this.x += this.knockback;
      this.y += this.knockbackVy;
      this.knockbackVy += GRAVITY;
      this.knockback *= 0.85;
      if (Math.abs(this.knockback) < 0.3) this.knockback = 0;
    } else {
      this.x += this.vx;
      if (this.x < this.leftBound) { this.x = this.leftBound; this.vx = this.speed; }
      else if (this.x + this.w > this.rightBound) { this.x = this.rightBound - this.w; this.vx = -this.speed; }
    }
    // Purple variant occasionally hops
    if (this.variant === 'purple') {
      if (this.jumpCd > 0) this.jumpCd--;
      if (this.jumpCd <= 0 && this.vy === 0) {
        this.vy = -6;
        this.jumpCd = 60 + Math.floor(Math.random() * 60);
      }
      this.vy += GRAVITY * 0.7;
      this.y += this.vy;
      if (this.y >= 380) { this.y = 380; this.vy = 0; }
    }
  }
  takeHit(dx) {
    this.hp--;
    SFX.hit();
    burst(this.x + this.w / 2, this.y + this.h / 2, '#fff', 8, 2);
    if (this.hp <= 0) {
      this.dead = true;
      this.deathTimer = 30;
      burst(this.x + this.w / 2, this.y + this.h / 2, '#22c55e', 16, 3);
    } else {
      this.knockback = dx * 5;
      this.knockbackVy = -3;
    }
  }
  draw(ctx, cam) {
    if (this.dead && this.deathTimer <= 0) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    const squish = this.dead ? Math.max(0, this.deathTimer / 30) : 1;
    const wobbleH = Math.sin(this.animFrame * 0.15) * 1.5;
    ctx.fillStyle = this.dead ? '#fff' : this.bodyColor;
    // Slime body: semicircle on top of rect
    ctx.beginPath();
    ctx.moveTo(sx, sy + this.h);
    ctx.arc(sx + this.w / 2, sy + this.h, this.w / 2, Math.PI, 0, false);
    ctx.lineTo(sx + this.w, sy + this.h);
    ctx.scale(1, squish);
    ctx.fill();
    ctx.scale(1, 1 / Math.max(0.01, squish));
    // Eyes
    if (!this.dead) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx + 9, sy + this.h - 8 + wobbleH, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + this.w - 9, sy + this.h - 8 + wobbleH, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(sx + 9 + (this.vx > 0 ? 1 : -1), sy + this.h - 8 + wobbleH, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + this.w - 9 + (this.vx > 0 ? 1 : -1), sy + this.h - 8 + wobbleH, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// =================================================================
// BOSS  (spawned in boss arenas; stats scale by level/10 tier)
// =================================================================
class Boss {
  constructor(num) {
    this.num = num;
    this.tier = Math.floor(num / 10);            // 1..10
    this.isFinal = (num === 100);
    this.maxHP = this.isFinal ? 50 : (6 + this.tier * 2);
    this.hp = this.maxHP;
    this.scale = this.isFinal ? 2.8 : Math.min(2.5, 1 + this.tier * 0.15);
    this.w = 50 * this.scale;
    this.h = 42 * this.scale;
    this.x = 900; this.y = 400 - this.h;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.actionTimer = 90;
    this.iframes = 0;
    this.onGround = true;
    this.dead = false;
    this.deathTimer = 0;
    this.color = BOSS_COLORS[Math.max(0, this.tier - 1)] || '#1f2937';
    this.phase = 1;                              // final boss multi-phase
  }

  get phaseMult() {
    if (!this.isFinal) return 1;
    if (this.phase === 2) return 1.45;
    if (this.phase === 3) return 1.9;
    return 1;
  }

  update(player) {
    if (this.dead) { this.deathTimer--; return; }

    // Final boss phase transitions
    if (this.isFinal) {
      const pct = this.hp / this.maxHP;
      if (pct < 0.33 && this.phase !== 3) {
        this.phase = 3;
        cameraShake(18, 36);
        burst(this.x + this.w / 2, this.y + this.h / 2, '#facc15', 40, 6);
      } else if (pct < 0.66 && this.phase < 2) {
        this.phase = 2;
        cameraShake(12, 24);
        burst(this.x + this.w / 2, this.y + this.h / 2, '#ef4444', 28, 5);
      }
    }

    this.iframes = Math.max(0, this.iframes - 1);
    this.actionTimer--;
    const mult = this.phaseMult;

    if (this.actionTimer <= 0 && this.onGround) {
      const r = Math.random();
      const jumpVel = -(9 + this.tier * 0.3) * Math.sqrt(mult);
      const moveVel = (2 + this.tier * 0.2) * mult;

      if (r < 0.5) {
        this.vy = jumpVel;
        this.vx = Math.sign(player.x - this.x) * moveVel;
      } else if (this.tier >= 3 && r < 0.8) {
        this.vx = Math.sign(player.x - this.x) * (4 + this.tier * 0.3) * mult;
      } else if (this.tier >= 5) {
        this.vy = jumpVel * 1.3;
        this.vx = Math.sign(player.x - this.x) * moveVel * 1.5;
      } else {
        this.vy = jumpVel;
        this.vx = Math.sign(player.x - this.x) * moveVel;
      }
      this.actionTimer = Math.max(35, 90 - this.tier * 4) / mult;
    }

    this.vy += GRAVITY;
    if (this.vy > 16) this.vy = 16;
    this.x += this.vx;
    this.y += this.vy;

    // Boss arena ground
    this.onGround = false;
    if (this.y + this.h > 400) {
      const justLanded = this.vy > 4;
      this.y = 400 - this.h;
      this.vy = 0;
      this.onGround = true;
      if (justLanded) {
        cameraShake(4, 8);
        burst(this.x + this.w / 2, this.y + this.h, '#94a3b8', 12, 2.5);
      }
      this.vx *= 0.85;
      if (Math.abs(this.vx) < 0.2) this.vx = 0;
    }

    // Wall bounds
    const aw = level.worldW;
    if (this.x < 30) { this.x = 30; this.vx = Math.abs(this.vx); }
    if (this.x + this.w > aw - 30) { this.x = aw - 30 - this.w; this.vx = -Math.abs(this.vx); }

    this.facing = player.x < this.x + this.w / 2 ? -1 : 1;
  }

  takeHit(dx) {
    if (this.iframes > 0 || this.dead) return;
    this.hp--;
    this.iframes = 18;
    SFX.hit();
    burst(this.x + this.w / 2, this.y + this.h / 2, this.color, 18, 3);
    cameraShake(5, 10);
    this.vx = dx * 2.5;
    if (this.hp <= 0) {
      this.dead = true;
      this.deathTimer = 90;
      for (let i = 0; i < 6; i++) {
        setTimeout(() => burst(
          this.x + this.w * (0.2 + Math.random() * 0.6),
          this.y + this.h * Math.random(),
          this.color, 22, 5
        ), i * 100);
      }
      cameraShake(20, 32);
      SFX.victory();
      // Win on a short delay so the death animation can play
      setTimeout(() => win(), 1200);
    }
  }

  draw(ctx, cam) {
    if (this.dead && this.deathTimer <= 0) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    const flicker = this.iframes > 0 && (this.iframes % 6 < 3);
    if (flicker) return;

    // Body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(sx, sy + this.h);
    ctx.arc(sx + this.w / 2, sy + this.h, this.w / 2, Math.PI, 0, false);
    ctx.fill();

    // Crown for final boss
    if (this.isFinal) {
      ctx.fillStyle = '#facc15';
      const cx = sx + this.w / 2, cy = sy + 6, cw = this.w * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx - cw / 2, cy + 16);
      ctx.lineTo(cx - cw / 2, cy + 4);
      ctx.lineTo(cx - cw / 4, cy + 12);
      ctx.lineTo(cx, cy - 4);
      ctx.lineTo(cx + cw / 4, cy + 12);
      ctx.lineTo(cx + cw / 2, cy + 4);
      ctx.lineTo(cx + cw / 2, cy + 16);
      ctx.closePath();
      ctx.fill();
    }

    // Eyes (color by phase for final boss)
    const eyeR = 6 + this.tier * 0.5;
    const eyeColor = this.isFinal
      ? (this.phase === 1 ? '#fff' : this.phase === 2 ? '#fde047' : '#ef4444')
      : '#fff';
    ctx.fillStyle = eyeColor;
    ctx.beginPath(); ctx.arc(sx + this.w * 0.32, sy + this.h * 0.6, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + this.w * 0.68, sy + this.h * 0.6, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(sx + this.w * 0.32 + this.facing * 2, sy + this.h * 0.6, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + this.w * 0.68 + this.facing * 2, sy + this.h * 0.6, 2.6, 0, Math.PI * 2); ctx.fill();

    // Mouth (angrier for higher tier)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (this.tier >= 5) {
      ctx.moveTo(sx + this.w * 0.28, sy + this.h * 0.85);
      ctx.lineTo(sx + this.w * 0.5,  sy + this.h * 0.78);
      ctx.lineTo(sx + this.w * 0.72, sy + this.h * 0.85);
    } else {
      ctx.moveTo(sx + this.w * 0.4, sy + this.h * 0.85);
      ctx.lineTo(sx + this.w * 0.6, sy + this.h * 0.85);
    }
    ctx.stroke();
  }
}

// =================================================================
// CAMERA
// =================================================================
const cam = { x: 0, y: 0, shakeX: 0, shakeY: 0, shakeFrames: 0, shakeMag: 0 };
function cameraShake(magnitude, frames) {
  cam.shakeMag = Math.max(cam.shakeMag, magnitude);
  cam.shakeFrames = Math.max(cam.shakeFrames, frames);
}
function updateCamera(target) {
  const ww = (level && level.worldW) || WORLD_W;
  const desired = target.x + target.w / 2 - VIEW_W / 2;
  cam.x += (desired - cam.x) * 0.1;
  cam.x = Math.max(0, Math.min(Math.max(0, ww - VIEW_W), cam.x));
  cam.y = 0;
  if (cam.shakeFrames > 0) {
    cam.shakeFrames--;
    cam.shakeX = (Math.random() - 0.5) * cam.shakeMag * (cam.shakeFrames / 12);
    cam.shakeY = (Math.random() - 0.5) * cam.shakeMag * (cam.shakeFrames / 12);
    if (cam.shakeFrames <= 0) { cam.shakeX = 0; cam.shakeY = 0; cam.shakeMag = 0; }
  } else {
    cam.shakeX = 0; cam.shakeY = 0;
  }
}

// =================================================================
// LEVEL state
// =================================================================
let level;
function buildLevel() {
  const L = generateLevel(currentLevel);
  level = {
    num: L.num,
    isBoss: L.isBoss,
    isFinalBoss: L.isFinalBoss,
    worldW: L.worldW,
    platforms: L.platforms,
    movingPlatforms: L.movingPlatforms,
    coins: L.coins.map(c => Array.isArray(c) ? { x: c[0], y: c[1] } : c),
    enemies: L.enemies.map(e => new Enemy(e)),
    powerups: L.powerups.map(p => ({ ...p, t: 0 })),
    checkpointObj: L.checkpoint
      ? { x: L.checkpoint.x, y: L.checkpoint.y, activated: false }
      : null,
    goalObj: { x: L.goal.x, y: L.goal.y },
    activeCheckpoint: null,
    spawn: L.spawn,
    boss: L.isBoss ? new Boss(L.num) : null
  };
}
// Treat moving platforms as platforms for collision purposes.
function allPlatforms() { return level.platforms.concat(level.movingPlatforms); }
function updateMovingPlatforms() {
  for (const p of level.movingPlatforms) {
    p.y += p.dy;
    if (p.y < p.yMin) { p.y = p.yMin; p.dy = Math.abs(p.dy); }
    else if (p.y > p.yMax) { p.y = p.yMax; p.dy = -Math.abs(p.dy); }
  }
}

// =================================================================
// RENDER  background + level + entities + UI overlay
// =================================================================
let bgFrame = 0;
function drawBackground(ctx) {
  // Sky gradient
  const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grd.addColorStop(0, '#5eead4');
  grd.addColorStop(0.6, '#a78bfa');
  grd.addColorStop(1, '#fbcfe8');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Far mountains (slow parallax)
  ctx.fillStyle = 'rgba(76, 29, 149, 0.45)';
  const farOffset = -cam.x * 0.15;
  for (let i = -1; i < 6; i++) {
    const baseX = farOffset + i * 320;
    ctx.beginPath();
    ctx.moveTo(baseX, 380);
    ctx.lineTo(baseX + 160, 180);
    ctx.lineTo(baseX + 320, 380);
    ctx.fill();
  }
  // Near hills
  ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
  const nearOffset = -cam.x * 0.4;
  for (let i = -1; i < 8; i++) {
    const baseX = nearOffset + i * 280;
    ctx.beginPath();
    ctx.ellipse(baseX + 140, 410, 180, 100, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 600 - cam.x * 0.25 + bgFrame * 0.2) % (WORLD_W + 400)) - 100;
    const cy = 60 + (i % 3) * 35;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.arc(cx + 22, cy + 4, 18, 0, Math.PI * 2);
    ctx.arc(cx - 22, cy + 4, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlatform(ctx, p) {
  const sx = p.x - cam.x, sy = p.y - cam.y;
  // Body
  ctx.fillStyle = '#854d0e';
  ctx.fillRect(sx, sy, p.w, p.h);
  // Grass top
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(sx, sy, p.w, 6);
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(sx, sy + 6, p.w, 2);
  // Edge highlight
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(sx, sy + p.h - 4, p.w, 4);
}

function drawMovingPlatform(ctx, p) {
  const sx = p.x - cam.x, sy = p.y - cam.y;
  // Body (blue-violet to distinguish from static)
  ctx.fillStyle = '#4338ca';
  ctx.fillRect(sx, sy, p.w, p.h);
  // Top edge (lighter)
  ctx.fillStyle = '#818cf8';
  ctx.fillRect(sx, sy, p.w, 4);
  // Arrow indicators (up/down arrows on the side)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('↕', sx + p.w / 2, sy - 2);
  ctx.fillRect(sx, sy + p.h - 2, p.w, 2); // shadow
}

function drawPowerups(ctx) {
  for (const p of level.powerups) {
    p.t++;
    const sx = p.x - cam.x, sy = p.y - cam.y;
    const bob = Math.sin(p.t * 0.08) * 4;
    if (p.type === 'heart') {
      // Pulse glow
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.beginPath();
      ctx.arc(sx, sy + bob, 16, 0, Math.PI * 2);
      ctx.fill();
      // Heart shape
      ctx.fillStyle = '#ef4444';
      const hx = sx, hy = sy + bob;
      ctx.beginPath();
      ctx.moveTo(hx, hy + 8);
      ctx.bezierCurveTo(hx - 12, hy - 4, hx - 8, hy - 12, hx, hy - 4);
      ctx.bezierCurveTo(hx + 8, hy - 12, hx + 12, hy - 4, hx, hy + 8);
      ctx.fill();
    } else if (p.type === 'star') {
      // Rainbow rotation
      const ang = p.t * 0.04;
      ctx.save();
      ctx.translate(sx, sy + bob);
      ctx.rotate(ang);
      // Glow
      ctx.fillStyle = 'rgba(250, 204, 21, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      // 5-point star
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 11 : 5;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawCoins(ctx) {
  for (const c of level.coins) {
    const sx = c.x - cam.x, sy = c.y - cam.y;
    const r = 7 + Math.sin(bgFrame * 0.12 + c.x * 0.01) * 1.5;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(sx - 2, sy - 2, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCheckpoint(ctx) {
  const cp = level.checkpointObj;
  if (!cp) return;
  const sx = cp.x - cam.x, sy = cp.y - cam.y;
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(sx - 1, sy - 50, 2, 50);
  ctx.fillStyle = cp.activated ? '#22c55e' : '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(sx, sy - 50);
  ctx.lineTo(sx + 22, sy - 42);
  ctx.lineTo(sx, sy - 34);
  ctx.fill();
}

function drawGoal(ctx) {
  const gl = level.goalObj;
  const sx = gl.x - cam.x, sy = gl.y - cam.y;
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(sx - 1, sy - 60, 2, 60);
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(sx, sy - 60);
  ctx.lineTo(sx + 26, sy - 52);
  ctx.lineTo(sx, sy - 44);
  ctx.fill();
  // Sparkle
  if (bgFrame % 30 < 15) {
    ctx.fillStyle = '#fde047';
    ctx.fillRect(sx + 20, sy - 56, 2, 2);
  }
}

// =================================================================
// GAME LOOP / STATE
// =================================================================
const STATE_MENU = 'menu', STATE_PLAYING = 'playing', STATE_PAUSED = 'paused',
      STATE_GAMEOVER = 'gameover', STATE_VICTORY = 'victory';
let gameState = STATE_MENU;
let player;
let canvas, ctx;
let lastTime = 0;

function startLevel(num) {
  if (typeof num === 'number') {
    currentLevel = Math.max(1, Math.min(MAX_LEVELS, num));
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  hideAllMenus();
  buildLevel();
  player = new Player(level.spawn);
  cam.x = 0; cam.shakeFrames = 0;
  particles.length = 0;
  gameState = STATE_PLAYING;
}
function startGame() {
  // Resume from the highest unlocked level
  startLevel(progress.highestUnlocked || 1);
}
window.platformerStart = startGame;
window.platformerStartLevel = startLevel;

function onPlayerDeath() {
  if (level.activeCheckpoint) {
    player.reset(level.activeCheckpoint.x, level.activeCheckpoint.y);
    player.hp = MAX_HP;
    cam.x = Math.max(0, player.x - VIEW_W / 2);
  } else {
    gameOver();
  }
}

function gameOver() {
  gameState = STATE_GAMEOVER;
  saveStats();
  const m = document.getElementById('plf-gameover-modal');
  if (m) m.style.display = 'flex';
  document.getElementById('plf-go-coins').textContent = player.coins;
  document.getElementById('plf-go-level').textContent = level.num;
}

function win() {
  if (gameState === STATE_VICTORY) return;
  gameState = STATE_VICTORY;
  SFX.victory();
  saveStats(true);

  // Save level progress
  const lvl = level.num;
  progress.completed[lvl] = {
    coins: Math.max((progress.completed[lvl]?.coins || 0), player.coins)
  };
  if (lvl + 1 > progress.highestUnlocked) {
    progress.highestUnlocked = Math.min(MAX_LEVELS, lvl + 1);
  }
  saveProgress();

  const isFinal = (lvl === MAX_LEVELS);
  const m = document.getElementById('plf-victory-modal');
  if (m) m.style.display = 'flex';
  document.getElementById('plf-win-coins').textContent = player.coins;
  document.getElementById('plf-win-level').textContent = lvl;

  // Show "Next Level" button only when not final
  const nextBtn = document.getElementById('plf-win-next-btn');
  if (nextBtn) nextBtn.style.display = isFinal ? 'none' : '';
  const ultimateMsg = document.getElementById('plf-win-ultimate');
  if (ultimateMsg) ultimateMsg.style.display = isFinal ? '' : 'none';

  // Confetti
  for (let i = 0; i < (isFinal ? 100 : 40); i++) {
    const colors = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#fff'];
    spawnParticle(
      player.x + player.w / 2 + (Math.random() - 0.5) * 100,
      player.y, (Math.random() - 0.5) * 5, -Math.random() * 7 - 2,
      colors[Math.floor(Math.random() * colors.length)], 90, 4
    );
  }
}
function nextLevel() {
  if (currentLevel >= MAX_LEVELS) { showLevelSelect(); return; }
  startLevel(currentLevel + 1);
}
window.platformerNextLevel = nextLevel;

function togglePause() {
  if (gameState === STATE_PLAYING) {
    gameState = STATE_PAUSED;
    document.getElementById('plf-pause-modal').style.display = 'flex';
  } else if (gameState === STATE_PAUSED) {
    gameState = STATE_PLAYING;
    document.getElementById('plf-pause-modal').style.display = 'none';
  }
}
window.platformerPause = togglePause;

function hideAllMenus() {
  ['plf-menu', 'plf-pause-modal', 'plf-gameover-modal', 'plf-victory-modal', 'plf-select-modal'].forEach(id => {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  });
}

function showLevelSelect() {
  buildLevelSelectGrid();
  const m = document.getElementById('plf-select-modal');
  if (m) m.style.display = 'flex';
}
window.platformerLevelSelect = showLevelSelect;

function buildLevelSelectGrid() {
  const grid = document.getElementById('plf-select-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const highest = progress.highestUnlocked || 1;
  for (let i = 1; i <= MAX_LEVELS; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'plf-level-cell';
    const isBoss = (i % 10 === 0);
    const isFinal = (i === MAX_LEVELS);
    const unlocked = i <= highest;
    const completed = !!progress.completed[i];

    cell.classList.toggle('locked', !unlocked);
    cell.classList.toggle('boss', isBoss);
    cell.classList.toggle('final', isFinal);
    cell.classList.toggle('completed', completed);

    let badge = '';
    if (isFinal) badge = '👑';
    else if (isBoss) badge = '💀';
    else if (completed) badge = '⭐';
    cell.innerHTML = `<span class="num">${i}</span>${badge ? `<span class="badge">${badge}</span>` : ''}`;

    if (unlocked) {
      cell.addEventListener('click', () => startLevel(i));
    } else {
      cell.disabled = true;
    }
    grid.appendChild(cell);
  }
}

function saveStats(victory) {
  const stats = JSON.parse(localStorage.getItem('plfStats') || '{}');
  stats.totalCoins = (stats.totalCoins || 0) + (player ? player.coins : 0);
  stats.totalRuns = (stats.totalRuns || 0) + 1;
  if (victory) stats.victories = (stats.victories || 0) + 1;
  if (player && player.coins > (stats.bestCoins || 0)) stats.bestCoins = player.coins;
  localStorage.setItem('plfStats', JSON.stringify(stats));
}

function update() {
  if (gameState !== STATE_PLAYING) return;
  bgFrame++;
  updateMovingPlatforms();
  player.update(level);

  const attackBox = player.getAttackBox();

  // Enemies
  for (let i = level.enemies.length - 1; i >= 0; i--) {
    const e = level.enemies[i];
    e.update();
    if (e.dead) {
      if (e.deathTimer <= 0) level.enemies.splice(i, 1);
      continue;
    }
    if (player.aabb(player.x, player.y, player.w, player.h, e.x, e.y, e.w, e.h)) {
      player.takeDamage(1);
      const dir = player.x < e.x ? -1 : 1;
      player.vx = dir * 6;
      player.vy = -5;
    }
    if (attackBox && player.aabb(attackBox.x, attackBox.y, attackBox.w, attackBox.h, e.x, e.y, e.w, e.h)) {
      e.takeHit(player.facing);
    }
  }

  // Boss
  if (level.boss) {
    level.boss.update(player);
    if (!level.boss.dead) {
      if (player.aabb(player.x, player.y, player.w, player.h, level.boss.x, level.boss.y, level.boss.w, level.boss.h)) {
        player.takeDamage(level.isFinalBoss ? 2 : 1);
        const dir = player.x < level.boss.x ? -1 : 1;
        player.vx = dir * 8;
        player.vy = -6;
      }
      if (attackBox && player.aabb(attackBox.x, attackBox.y, attackBox.w, attackBox.h, level.boss.x, level.boss.y, level.boss.w, level.boss.h)) {
        level.boss.takeHit(player.facing);
      }
    }
  }

  updateParticles();
  updateCamera(player);
}

function render() {
  ctx.save();
  ctx.translate(cam.shakeX, cam.shakeY);

  drawBackground(ctx);

  if (gameState !== STATE_MENU) {
    // Platforms (static + moving drawn differently)
    for (const p of level.platforms) drawPlatform(ctx, p);
    for (const p of level.movingPlatforms) drawMovingPlatform(ctx, p);
    drawCoins(ctx);
    drawPowerups(ctx);
    drawCheckpoint(ctx);
    drawGoal(ctx);

    // Enemies + Boss
    for (const e of level.enemies) e.draw(ctx, cam);
    if (level.boss) level.boss.draw(ctx, cam);
    // Player
    if (player) player.draw(ctx, cam);
    drawParticles(ctx, cam);

    // HUD
    drawHUD();
    if (level.boss && !level.boss.dead) drawBossHpBar();
  }
  ctx.restore();
}

function drawBossHpBar() {
  const b = level.boss;
  const cx = VIEW_W / 2;
  const barW = VIEW_W * 0.6;
  const barH = 14;
  const y = 50;
  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  const label = b.isFinal ? 'ULTIMATE SLIME KING' : ('Lv ' + b.num + ' BOSS');
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 4;
  ctx.fillText(label, cx, y - 6);
  ctx.shadowBlur = 0;
  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(cx - barW / 2 - 2, y - 2, barW + 4, barH + 4);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(cx - barW / 2, y, barW, barH);
  // HP fill
  const pct = Math.max(0, b.hp / b.maxHP);
  ctx.fillStyle = b.isFinal && b.phase === 3 ? '#fde047'
                : b.isFinal && b.phase === 2 ? '#fb923c'
                : b.color;
  ctx.fillRect(cx - barW / 2, y, barW * pct, barH);
  // HP text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px Segoe UI, sans-serif';
  ctx.fillText(b.hp + ' / ' + b.maxHP, cx, y + barH - 3);
}

function drawHUD() {
  // Hearts
  for (let i = 0; i < MAX_HP; i++) {
    const x = 14 + i * 20, y = 16;
    ctx.fillStyle = i < player.hp ? '#ef4444' : 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 14);
    ctx.bezierCurveTo(x - 4, y + 6, x, y - 4, x + 8, y + 4);
    ctx.bezierCurveTo(x + 16, y - 4, x + 20, y + 6, x + 8, y + 14);
    ctx.fill();
  }
  // Coin counter
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(VIEW_W - 110, 10, 100, 28);
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(VIEW_W - 95, 24, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('× ' + player.coins, VIEW_W - 82, 30);
  // Dash cooldown indicator (bottom-left)
  if (player.dashCdFrames > 0) {
    const pct = 1 - player.dashCdFrames / DASH_COOLDOWN;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(14, VIEW_H - 28, 80, 8);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(14, VIEW_H - 28, 80 * pct, 8);
  }
  // Level number (top-center small)
  if (!level.boss || level.boss.dead) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(VIEW_W / 2 - 50, 8, 100, 22);
    ctx.fillStyle = level.isFinalBoss ? '#facc15' : level.isBoss ? '#ef4444' : '#fff';
    ctx.font = 'bold 13px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Level ' + level.num + ' / 100', VIEW_W / 2, 24);
  }
}

function loop(t) {
  requestAnimationFrame(loop);
  update();
  render();
}

// =================================================================
// CANVAS SCALING + TOUCH CONTROLS
// =================================================================
function resizeCanvas() {
  // Keep the logical resolution VIEW_W × VIEW_H; scale CSS to fit screen.
  const ww = window.innerWidth, wh = window.innerHeight;
  const scale = Math.min(ww / VIEW_W, wh / VIEW_H);
  canvas.style.width  = (VIEW_W * scale) + 'px';
  canvas.style.height = (VIEW_H * scale) + 'px';
}
window.addEventListener('resize', () => { if (canvas) resizeCanvas(); });

function attachTouchControls() {
  // Virtual joystick on left half of overlay, buttons on right half.
  const stickArea = document.getElementById('plf-stick-area');
  const stickThumb = document.getElementById('plf-stick-thumb');
  const stickBase = document.getElementById('plf-stick-base');

  function updateStickVisual(active, cx, cy, dx, dy) {
    stickBase.style.display = active ? 'block' : 'none';
    stickThumb.style.display = active ? 'block' : 'none';
    if (!active) return;
    const r = stickArea.getBoundingClientRect();
    stickBase.style.left = (cx - r.left - 40) + 'px';
    stickBase.style.top  = (cy - r.top - 40) + 'px';
    stickThumb.style.left = (cx - r.left - 20 + dx * 30) + 'px';
    stickThumb.style.top  = (cy - r.top - 20 + dy * 30) + 'px';
  }

  stickArea.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    stick.active = true;
    stick.baseX = t.clientX; stick.baseY = t.clientY;
    stick.id = t.identifier;
    updateStickVisual(true, t.clientX, t.clientY, 0, 0);
    e.preventDefault();
  }, { passive: false });

  stickArea.addEventListener('touchmove', (e) => {
    if (!stick.active) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== stick.id) continue;
      let dx = t.clientX - stick.baseX, dy = t.clientY - stick.baseY;
      const len = Math.hypot(dx, dy);
      const max = 40;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      stick.dx = dx / max; stick.dy = dy / max;
      keys.left  = stick.dx < -0.3;
      keys.right = stick.dx >  0.3;
      keys.down  = stick.dy >  0.5;
      updateStickVisual(true, stick.baseX, stick.baseY, stick.dx, stick.dy);
      e.preventDefault();
    }
  }, { passive: false });

  const endStick = (e) => {
    if (!stick.active) return;
    for (const t of e.changedTouches) {
      if (t.identifier === stick.id) {
        stick.active = false; stick.dx = 0; stick.dy = 0;
        keys.left = keys.right = keys.down = false;
        updateStickVisual(false, 0, 0, 0, 0);
      }
    }
  };
  stickArea.addEventListener('touchend', endStick);
  stickArea.addEventListener('touchcancel', endStick);

  // Action buttons
  const bindBtn = (id, onDown) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => { onDown(); el.classList.add('pressed'); e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend',   (e) => { el.classList.remove('pressed'); e.preventDefault(); }, { passive: false });
    el.addEventListener('touchcancel',(e) => { el.classList.remove('pressed'); });
    el.addEventListener('pointerdown',(e) => { if (e.pointerType !== 'touch') { onDown(); el.classList.add('pressed'); } });
    el.addEventListener('pointerup',  ()  => el.classList.remove('pressed'));
  };
  bindBtn('plf-btn-jump',   () => { jumpPressed = true; });
  bindBtn('plf-btn-attack', () => { attackPressed = true; });
  bindBtn('plf-btn-dash',   () => { dashPressed = true; });
}

// =================================================================
// BOOT
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('plf-canvas');
  ctx = canvas.getContext('2d');
  canvas.width = VIEW_W; canvas.height = VIEW_H;
  resizeCanvas();
  ctx.imageSmoothingEnabled = false;

  const muteBtn = document.getElementById('plf-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  const pauseBtn = document.getElementById('plf-pause-btn');
  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);

  // Menus
  document.getElementById('plf-start-btn').addEventListener('click', startGame);
  document.getElementById('plf-select-btn').addEventListener('click', showLevelSelect);
  document.getElementById('plf-select-close-btn').addEventListener('click', () => {
    document.getElementById('plf-select-modal').style.display = 'none';
    document.getElementById('plf-menu').style.display = 'flex';
  });
  document.getElementById('plf-resume-btn').addEventListener('click', togglePause);
  document.getElementById('plf-pause-restart-btn').addEventListener('click', () => startLevel(currentLevel));
  document.getElementById('plf-pause-select-btn').addEventListener('click', () => {
    document.getElementById('plf-pause-modal').style.display = 'none';
    gameState = STATE_MENU;
    showLevelSelect();
  });
  document.getElementById('plf-go-restart-btn').addEventListener('click', () => startLevel(currentLevel));
  document.getElementById('plf-go-select-btn').addEventListener('click', () => {
    document.getElementById('plf-gameover-modal').style.display = 'none';
    gameState = STATE_MENU;
    showLevelSelect();
  });
  document.getElementById('plf-win-restart-btn').addEventListener('click', () => startLevel(currentLevel));
  document.getElementById('plf-win-next-btn').addEventListener('click', nextLevel);
  document.getElementById('plf-win-select-btn').addEventListener('click', () => {
    document.getElementById('plf-victory-modal').style.display = 'none';
    gameState = STATE_MENU;
    showLevelSelect();
  });

  attachTouchControls();
  requestAnimationFrame(loop);
});
