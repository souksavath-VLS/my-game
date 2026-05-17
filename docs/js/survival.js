// Survival — top-down 2D survival game with crafting, day/night, combat.
// Organized in sections below. Pure vanilla JS, Canvas API, no libs.

// =================================================================
// CONFIG
// =================================================================
const VIEW_W = 800, VIEW_H = 500;
const TILE = 32;
const WORLD_TILES = 80;
const WORLD_W = WORLD_TILES * TILE;
const WORLD_H = WORLD_TILES * TILE;

const DAY_LENGTH_MS = 4 * 60 * 1000;   // 4 minutes per cycle
const DAY_RATIO = 0.7;                 // 70% day, 30% night

const T_WATER = 0, T_SAND = 1, T_GRASS = 2, T_FOREST = 3, T_STONE = 4, T_SNOW = 5;
const TILE_BASE = {
  [T_WATER]: '#1e40af', [T_SAND]:  '#fde68a',
  [T_GRASS]: '#65a30d', [T_FOREST]:'#3f6212',
  [T_STONE]: '#6b7280', [T_SNOW]:  '#e5e7eb'
};
const TILE_ACCENT = {
  [T_WATER]: '#3b82f6', [T_SAND]:  '#fbbf24',
  [T_GRASS]: '#84cc16', [T_FOREST]:'#4d7c0f',
  [T_STONE]: '#9ca3af', [T_SNOW]:  '#f8fafc'
};
const PASSABLE = { [T_WATER]: false, [T_SAND]: true, [T_GRASS]: true,
                   [T_FOREST]: true, [T_STONE]: true, [T_SNOW]: true };

const MAX_HP = 100, MAX_HUNGER = 100, MAX_THIRST = 100, MAX_STAMINA = 100;

const SPEED_WALK = 2.4, SPEED_SPRINT = 4.0;
const DODGE_VEL = 8, DODGE_DUR = 12, DODGE_COOLDOWN = 50, DODGE_STAMINA = 25;
const SPRINT_DRAIN = 0.30, STAMINA_REGEN = 0.32;
const HUNGER_DRAIN = 0.0015, THIRST_DRAIN = 0.0022, STARVE_HP = 0.04;

const INV_SLOTS = 24, HOTBAR_SLOTS = 6;

// =================================================================
// ITEMS + RECIPES
// =================================================================
const ITEMS = {
  wood:     { name: 'Wood',     icon: '🪵', stack: 99, type: 'mat' },
  stone:    { name: 'Stone',    icon: '🪨', stack: 99, type: 'mat' },
  fiber:    { name: 'Fiber',    icon: '🌿', stack: 99, type: 'mat' },
  berry:    { name: 'Berry',    icon: '🍓', stack: 99, type: 'food', hunger: 18 },
  water:    { name: 'Water',    icon: '💧', stack: 99, type: 'drink', thirst: 30 },
  meat:     { name: 'Raw Meat', icon: '🥩', stack: 99, type: 'food', hunger: 25 },
  scrap:    { name: 'Scrap',    icon: '⚙️', stack: 99, type: 'mat' },
  axe:      { name: 'Axe',      icon: '🪓', stack: 1,  type: 'tool',   tool: 'axe',  power: 3, dmg: 5 },
  pickaxe:  { name: 'Pickaxe',  icon: '⛏️', stack: 1,  type: 'tool',   tool: 'pick', power: 3, dmg: 4 },
  sword:    { name: 'Sword',    icon: '⚔️', stack: 1,  type: 'weapon', dmg: 10 },
  spear:    { name: 'Spear',    icon: '🔱', stack: 1,  type: 'weapon', dmg: 14, range: 1.5 },
  campfire: { name: 'Campfire', icon: '🔥', stack: 99, type: 'build',  build: 'campfire' },
  bag:      { name: 'Bedroll',  icon: '🛏️', stack: 99, type: 'build',  build: 'bag' },
  wall:     { name: 'Wall',     icon: '🟫', stack: 99, type: 'build',  build: 'wall' },
  iron:     { name: 'Iron',     icon: '🔩', stack: 99, type: 'mat' },
  crystal:  { name: 'Crystal',  icon: '💎', stack: 99, type: 'mat' },
  iron_pick:{ name: 'Iron Pickaxe', icon: '⛏️', stack: 1, type: 'tool',   tool: 'pick', power: 5, dmg: 7,  tier: 2 },
  iron_axe: { name: 'Iron Axe',     icon: '🪓', stack: 1, type: 'tool',   tool: 'axe',  power: 5, dmg: 9,  tier: 2 },
  iron_sword:{name: 'Iron Sword',   icon: '⚔️', stack: 1, type: 'weapon', dmg: 18, tier: 2 },
  bow:      { name: 'Bow',          icon: '🏹', stack: 1,  type: 'bow',    dmg: 12, ammo: 'arrow' },
  arrow:    { name: 'Arrow',        icon: '🪶', stack: 99, type: 'ammo' },
  crystal_sword: { name: 'Crystal Sword', icon: '⚔️', stack: 1, type: 'weapon', dmg: 28, tier: 3 },
  seed_berry: { name: 'Berry Seed', icon: '🌱', stack: 99, type: 'seed', grow: 'bush' },
  seed_tree:  { name: 'Tree Seed',  icon: '🌰', stack: 99, type: 'seed', grow: 'tree' },
  crystal_key: { name: 'Crystal Key', icon: '🗝️', stack: 1, type: 'key' },
  fish:       { name: 'Fish', icon: '🐟', stack: 99, type: 'food', hunger: 22 },
  workbench:  { name: 'Workbench',   icon: '🪚', stack: 99, type: 'build', build: 'workbench' },
  turret:     { name: 'Arrow Turret',icon: '🗼', stack: 99, type: 'build', build: 'turret' }
};
const RECIPES = [
  { out: 'axe',      amt: 1, req: { wood: 3, fiber: 2 } },
  { out: 'pickaxe',  amt: 1, req: { wood: 3, stone: 2 } },
  { out: 'sword',    amt: 1, req: { wood: 4, stone: 3 } },
  { out: 'spear',    amt: 1, req: { wood: 5, fiber: 2, stone: 1 } },
  { out: 'campfire', amt: 1, req: { wood: 5, stone: 3 } },
  { out: 'bag',      amt: 1, req: { fiber: 5, wood: 2 } },
  { out: 'wall',     amt: 4, req: { wood: 4 } },
  { out: 'workbench', amt: 1, req: { wood: 8, stone: 3 } },
  { out: 'iron_pick', amt: 1, req: { wood: 3, stone: 5, iron: 3 }, tier: 2 },
  { out: 'iron_axe',  amt: 1, req: { wood: 3, stone: 4, iron: 3 }, tier: 2 },
  { out: 'iron_sword',amt: 1, req: { wood: 3, stone: 4, iron: 5 }, tier: 2 },
  { out: 'bow',       amt: 1, req: { wood: 4, fiber: 3 } },
  { out: 'arrow',     amt: 5, req: { wood: 2, fiber: 1 } },
  { out: 'crystal_sword', amt: 1, req: { wood: 3, iron: 5, crystal: 3 }, tier: 2 },
  { out: 'crystal_key',   amt: 1, req: { crystal: 2, iron: 3 }, tier: 2 },
  { out: 'turret',    amt: 1, req: { wood: 6, stone: 4, iron: 3 }, tier: 2 }
];

// =================================================================
// XP / LEVEL / SKILL TREE
// =================================================================
const SKILLS = {
  dmgBoost:    { name: 'Damage Boost',  icon: '⚔️', max: 3, desc: '+25% weapon damage per rank' },
  critChance:  { name: 'Critical Hit',  icon: '💢', max: 3, desc: '+10% crit chance (×2 dmg) per rank' },
  maxHpBoost:  { name: 'Tough Skin',    icon: '❤️', max: 3, desc: '+25 max HP per rank' },
  slowDrain:   { name: 'Endurance',     icon: '🥗', max: 3, desc: '-15% hunger/thirst drain per rank' },
  speedBoost:  { name: 'Fleet Foot',    icon: '👟', max: 3, desc: '+8% movement speed per rank' },
  dodgeCheap:  { name: 'Acrobat',       icon: '🤸', max: 3, desc: '-20% dodge stamina cost per rank' }
};
const SKILL_ORDER = ['dmgBoost','critChance','maxHpBoost','slowDrain','speedBoost','dodgeCheap'];
const XP_PER_LEVEL = 100;

const prog = {
  xp: 0,
  level: 1,
  points: 0,
  skills: { dmgBoost: 0, critChance: 0, maxHpBoost: 0, slowDrain: 0, speedBoost: 0, dodgeCheap: 0 }
};
function gainXp(amount) {
  prog.xp += amount;
  while (prog.xp >= XP_PER_LEVEL * prog.level) {
    prog.xp -= XP_PER_LEVEL * prog.level;
    prog.level++;
    prog.points++;
    floatText('LEVEL UP!', player.x, player.y - 30, '#facc15');
    SFX.craft();
  }
}
function applySkill(key) {
  const s = SKILLS[key];
  if (!s || prog.skills[key] >= s.max) return false;
  if (prog.points <= 0) return false;
  prog.skills[key]++;
  prog.points--;
  SFX.pick();
  refreshSkillTreeUI();
  return true;
}
window.survivalApplySkill = applySkill;

// Skill multipliers used elsewhere
function skillMaxHp()   { return MAX_HP + prog.skills.maxHpBoost * 25; }
function skillSpeedMul(){ return 1 + prog.skills.speedBoost * 0.08; }
function skillDmgMul()  { return 1 + prog.skills.dmgBoost * 0.25; }
function skillDrainMul(){ return Math.max(0.1, 1 - prog.skills.slowDrain * 0.15); }
function skillDodgeCost(){ return Math.max(5, DODGE_STAMINA * (1 - prog.skills.dodgeCheap * 0.20)); }
function skillCritRoll() { return Math.random() < prog.skills.critChance * 0.10; }

// Floating text effect (level up, +XP, crit)
const floaters = [];
function floatText(text, x, y, color) {
  floaters.push({ text, x, y, color: color || '#fff', life: 60, maxLife: 60 });
}
function updateFloaters() {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.y -= 0.6; f.life--;
    if (f.life <= 0) floaters.splice(i, 1);
  }
}
function drawFloaters(ctx) {
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(f.text, f.x - cam.x, f.y - cam.y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

// =================================================================
// QUESTS  (auto-tracked objectives with rewards)
// =================================================================
const QUEST_DEFS = [
  { id: 'q_chop',        event: 'tree_chop',     target: 10, reward: { xp: 50 } },
  { id: 'q_mine',        event: 'rock_mine',     target: 10, reward: { xp: 50 } },
  { id: 'q_kill_zomb',   event: 'kill_zombie',   target: 5,  reward: { xp: 30 } },
  { id: 'q_kill_wolf',   event: 'kill_wolf',     target: 5,  reward: { xp: 60 } },
  { id: 'q_craft_sword', event: 'craft_sword',   target: 1,  reward: { xp: 30 } },
  { id: 'q_camp',        event: 'build_campfire',target: 1,  reward: { xp: 30 } },
  { id: 'q_survive_2',   event: 'day_survived',  target: 2,  reward: { xp: 80, points: 1 } },
  { id: 'q_iron',        event: 'iron_mine',     target: 3,  reward: { xp: 80 } },
  { id: 'q_titan',       event: 'boss_defeated', target: 1,  reward: { xp: 500, points: 2 } }
];
const quests = QUEST_DEFS.map(q => ({ ...q, progress: 0, completed: false }));
function emit(type, n) {
  n = n || 1;
  for (const q of quests) {
    if (q.completed) continue;
    if (q.event === type) {
      q.progress = Math.min(q.target, q.progress + n);
      if (q.progress >= q.target) {
        q.completed = true;
        if (q.reward.xp) gainXp(q.reward.xp);
        if (q.reward.points) prog.points += q.reward.points;
        floatText('QUEST DONE!', player ? player.x : 0, player ? player.y - 36 : 0, '#facc15');
        SFX.craft();
        refreshQuestUI();
      }
    }
  }
  trackAchievement(type);
}

// =================================================================
// PROJECTILES (arrows)
// =================================================================
const projectiles = [];
class Projectile {
  constructor(x, y, vx, vy, dmg) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.dmg = dmg;
    this.life = 100;
    this.dead = false;
  }
  update() {
    if (this.dead) return;
    this.x += this.vx; this.y += this.vy;
    this.life--;
    if (this.life <= 0) { this.dead = true; return; }
    const tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE);
    if (tx < 0 || ty < 0 || tx >= WORLD_TILES || ty >= WORLD_TILES) { this.dead = true; return; }
    if (!isPassable(tx, ty)) { this.dead = true; return; }
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      if (dx * dx + dy * dy < (e.r + 4) * (e.r + 4)) {
        const sp = Math.sqrt(this.vx*this.vx + this.vy*this.vy) || 1;
        const wasAlive = !e.dead;
        e.takeHit(this.dmg, this.vx / sp, this.vy / sp);
        // Track bow kill achievement
        if (wasAlive && e.dead) {
          inc('bowKills');
          if (achievCounters.bowKills >= 5) unlockAchievement('a_bow');
        }
        this.dead = true;
        return;
      }
    }
    if (boss && !boss.dead) {
      const dx = boss.x - this.x, dy = boss.y - this.y;
      if (dx * dx + dy * dy < (boss.r + 4) * (boss.r + 4)) {
        const sp = Math.sqrt(this.vx*this.vx + this.vy*this.vy) || 1;
        boss.takeHit(this.dmg, this.vx / sp, this.vy / sp);
        this.dead = true;
        return;
      }
    }
  }
  draw(ctx, cam) {
    if (this.dead) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - this.vx * 0.6, sy - this.vy * 0.6);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
  }
}
function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    projectiles[i].update();
    if (projectiles[i].dead) projectiles.splice(i, 1);
  }
}
function drawProjectiles(ctx, cam) {
  for (const p of projectiles) p.draw(ctx, cam);
}

// =================================================================
// PET (tamed wolf — follows player, attacks enemies)
// =================================================================
let pet = null;
class Pet {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.r = 10;
    this.hp = 40; this.maxHp = 40;
    this.speed = 1.7;
    this.attackCd = 0;
    this.animFrame = 0;
    this.dead = false;
    this.deathTimer = 0;
  }
  update() {
    if (this.dead) { this.deathTimer--; return; }
    this.animFrame++;
    this.attackCd = Math.max(0, this.attackCd - 1);
    // Find nearest enemy in range
    let target = null, tD = 220 * 220;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = dist2(this.x, this.y, e.x, e.y);
      if (d < tD) { tD = d; target = e; }
    }
    if (boss && !boss.dead) {
      const d = dist2(this.x, this.y, boss.x, boss.y);
      if (d < tD) { tD = d; target = boss; }
    }
    let tx, ty;
    if (target) { tx = target.x; ty = target.y; }
    else { tx = player.x; ty = player.y; }
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const stopDist = target ? (target.r + this.r + 2) : 60;
    if (d > stopDist) {
      this.vx = (dx / d) * this.speed;
      this.vy = (dy / d) * this.speed;
    } else {
      this.vx *= 0.6; this.vy *= 0.6;
      if (target && this.attackCd === 0) {
        target.takeHit(7, dx / d, dy / d);
        burst(target.x, target.y, '#fff', 8, 2);
        this.attackCd = 35;
      }
    }
    this.x += this.vx;
    if (isBlocked(this.x, this.y, this.r)) { this.x -= this.vx; this.vx = 0; }
    this.y += this.vy;
    if (isBlocked(this.x, this.y, this.r)) { this.y -= this.vy; this.vy = 0; }
    this.x = clamp(this.x, this.r, WORLD_W - this.r);
    this.y = clamp(this.y, this.r, WORLD_H - this.r);
  }
  takeHit(dmg) {
    this.hp -= dmg;
    burst(this.x, this.y, '#fff', 6, 2);
    if (this.hp <= 0) {
      this.dead = true; this.deathTimer = 30;
      burst(this.x, this.y, '#7c2d12', 18, 3);
      floatText('PET LOST', this.x, this.y - 20, '#ef4444');
    }
  }
  draw(ctx, cam) {
    if (this.dead && this.deathTimer <= 0) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 8, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(sx - 9, sy - 4, 18, 9);
    // Head
    ctx.beginPath();
    ctx.arc(sx + (this.vx >= 0 ? 8 : -8), sy - 2, 6, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.fillStyle = '#57534e';
    ctx.fillRect(sx + (this.vx >= 0 ? 5 : -9), sy - 9, 3, 3);
    ctx.fillRect(sx + (this.vx >= 0 ? 10 : -4), sy - 9, 3, 3);
    // Eye (friendly blue)
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(sx + (this.vx >= 0 ? 8 : -8), sy - 3, 2, 2);
    // BLUE COLLAR (signature)
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(sx - 6, sy + 1, 12, 2);
    ctx.fillRect(sx - 1, sy + 1, 2, 4); // tag
    // Legs (run anim)
    const phase = Math.sin(this.animFrame * 0.35) * 2;
    ctx.fillStyle = '#57534e';
    ctx.fillRect(sx - 6, sy + 4, 3, 5 + phase);
    ctx.fillRect(sx - 1, sy + 4, 3, 5 - phase);
    ctx.fillRect(sx + 4, sy + 4, 3, 5 + phase);
    // HP bar (small)
    const pct = this.hp / this.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(sx - 10, sy - 18, 20, 3);
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : '#facc15';
    ctx.fillRect(sx - 10, sy - 18, 20 * pct, 3);
  }
}

// =================================================================
// FARMING — planted seeds grow over time into bushes / trees
// =================================================================
const PLANT_GROW_MS = 28000;  // 28 seconds real time
const farmland = [];          // { tx, ty, x, y, type:'bush'|'tree', plantedAt }
function tryPlantSeed(seedId) {
  const t = facingTile();
  if (!t) return false;
  const tile = world.tiles[t.ty][t.tx];
  if (tile !== T_GRASS && tile !== T_FOREST) return false;
  if (farmland.some(f => f.tx === t.tx && f.ty === t.ty)) return false;
  if (world.objects.some(o => o.alive && o.tx === t.tx && o.ty === t.ty)) return false;
  if (world.structures.some(s => s.tx === t.tx && s.ty === t.ty)) return false;
  const def = ITEMS[seedId];
  if (!def || def.type !== 'seed') return false;
  farmland.push({ tx: t.tx, ty: t.ty, x: t.x, y: t.y, type: def.grow, plantedAt: Date.now() });
  burst(t.x, t.y, '#86efac', 8, 1.5);
  SFX.build();
  return true;
}
function updateFarmland() {
  for (let i = farmland.length - 1; i >= 0; i--) {
    const f = farmland[i];
    if (Date.now() - f.plantedAt >= PLANT_GROW_MS) {
      // Sprout into object
      const id = world.objects.length;
      const o = { id, type: f.type, tx: f.tx, ty: f.ty, x: f.x, y: f.y,
                  hp: f.type === 'tree' ? 3 : 1, maxHp: f.type === 'tree' ? 3 : 1, alive: true };
      world.objects.push(o);
      farmland.splice(i, 1);
      burst(f.x, f.y, '#22c55e', 16, 2);
      inc('plants');
      if (achievCounters.plants >= 10) unlockAchievement('a_farm');
    }
  }
}
function drawFarmland(ctx, cam) {
  for (const f of farmland) {
    const sx = f.x - cam.x, sy = f.y - cam.y;
    if (sx < -20 || sx > VIEW_W + 20 || sy < -20 || sy > VIEW_H + 20) continue;
    const age = (Date.now() - f.plantedAt) / PLANT_GROW_MS; // 0..1
    const size = 3 + age * 9;
    ctx.fillStyle = age < 0.5 ? '#a3e635' : '#22c55e';
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
    // Tiny stem
    ctx.fillStyle = '#4d7c0f';
    ctx.fillRect(sx - 1, sy, 2, size);
  }
}

// =================================================================
// TRADER NPC  (peaceful wanderer; exchange scrap for goods)
// =================================================================
let trader = null;
let traderSpawnDay = -1;
const TRADER_TRADES = [
  { give: { scrap: 15 }, get: { id: 'crystal', amt: 1 } },
  { give: { scrap: 8  }, get: { id: 'iron',    amt: 3 } },
  { give: { scrap: 3  }, get: { id: 'wood',    amt: 10 } },
  { give: { scrap: 3  }, get: { id: 'stone',   amt: 10 } },
  { give: { scrap: 2  }, get: { id: 'arrow',   amt: 5 } },
  { give: { scrap: 4  }, get: { id: 'berry',   amt: 8 } }
];
class Trader {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.r = 11;
    this.vx = 0; this.vy = 0;
    this.dead = false;
    this.animFrame = 0;
    this.wanderTimer = 0;
    this.dx = 0; this.dy = 0;
  }
  update() {
    this.animFrame++;
    this.wanderTimer--;
    if (this.wanderTimer <= 0) {
      // Pick random direction or idle
      if (Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2;
        this.dx = Math.cos(a) * 0.3;
        this.dy = Math.sin(a) * 0.3;
      } else {
        this.dx = 0; this.dy = 0;
      }
      this.wanderTimer = 90 + Math.floor(Math.random() * 90);
    }
    this.x += this.dx;
    if (isBlocked(this.x, this.y, this.r)) { this.x -= this.dx; this.dx = 0; }
    this.y += this.dy;
    if (isBlocked(this.x, this.y, this.r)) { this.y -= this.dy; this.dy = 0; }
  }
  draw(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 9, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Robe (purple)
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(sx - 8, sy - 4, 16, 14);
    // Head
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(sx, sy - 9, 8, 0, Math.PI * 2); ctx.fill();
    // Wizard hat
    ctx.fillStyle = '#3730a3';
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy - 13);
    ctx.lineTo(sx + 8, sy - 13);
    ctx.lineTo(sx, sy - 24);
    ctx.closePath();
    ctx.fill();
    // Star on hat
    ctx.fillStyle = '#facc15';
    ctx.fillRect(sx - 2, sy - 18, 4, 4);
    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(sx - 3, sy - 9, 2, 2);
    ctx.fillRect(sx + 1, sy - 9, 2, 2);
    // Bouncing "!" prompt when player is nearby
    if (player && dist2(player.x, player.y, this.x, this.y) < 60 * 60) {
      const bob = Math.sin(this.animFrame * 0.18) * 3;
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 16px Segoe UI';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
      ctx.fillText('!', sx, sy - 28 + bob);
      ctx.shadowBlur = 0;
    }
  }
}
function tryRespawnTrader() {
  const day = Math.floor(world.time / DAY_LENGTH_MS);
  if (day === traderSpawnDay && trader) return;
  if (day !== traderSpawnDay) {
    traderSpawnDay = day;
    // Spawn near player on a grass tile during day
    if (timeOfDay() === 'day') {
      for (let tries = 0; tries < 30; tries++) {
        const a = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 200;
        const x = clamp(player.x + Math.cos(a) * dist, 60, WORLD_W - 60);
        const y = clamp(player.y + Math.sin(a) * dist, 60, WORLD_H - 60);
        const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
        const t = world.tiles[ty]?.[tx];
        if (t === T_GRASS || t === T_FOREST) {
          trader = new Trader(x, y);
          floatText('TRADER NEARBY', x, y - 30, '#facc15');
          break;
        }
      }
    }
  }
  // Despawn at night
  if (trader && timeOfDay() === 'night') trader = null;
}
function tryOpenTrader() {
  if (!trader) return false;
  if (dist2(player.x, player.y, trader.x, trader.y) > 50 * 50) return false;
  const m = document.getElementById('srv-trade-modal');
  if (!m) return false;
  refreshTradeUI();
  m.style.display = 'flex';
  return true;
}
function refreshTradeUI() {
  const list = document.getElementById('srv-trade-list');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < TRADER_TRADES.length; i++) {
    const tr = TRADER_TRADES[i];
    const canAfford = Object.entries(tr.give).every(([id, n]) => inventory.count(id) >= n);
    const get = tr.get;
    const getItem = ITEMS[get.id];
    const giveText = Object.entries(tr.give).map(([id, n]) => {
      const have = inventory.count(id);
      return `<span class="srv-req ${have >= n ? 'ok' : 'bad'}">${ITEMS[id].icon} ${have}/${n}</span>`;
    }).join(' ');
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'srv-recipe' + (canAfford ? '' : ' disabled');
    el.disabled = !canAfford;
    el.innerHTML = `
      <div class="srv-recipe-head">
        <span class="srv-recipe-icon">${getItem.icon}</span>
        <span class="srv-recipe-name">${getItem.name}${get.amt > 1 ? ' ×' + get.amt : ''}</span>
      </div>
      <div class="srv-recipe-req">${giveText}</div>`;
    el.addEventListener('click', () => doTrade(i));
    list.appendChild(el);
  }
}
function doTrade(i) {
  const tr = TRADER_TRADES[i];
  if (!tr) return;
  for (const [id, n] of Object.entries(tr.give)) {
    if (inventory.count(id) < n) return;
  }
  for (const [id, n] of Object.entries(tr.give)) inventory.remove(id, n);
  inventory.add(tr.get.id, tr.get.amt);
  SFX.craft();
  burst(player.x, player.y - 16, '#facc15', 10, 2);
  inc('trades');
  if (achievCounters.trades >= 5) unlockAchievement('a_trade');
  refreshTradeUI();
}

// =================================================================
// DUNGEON  (locked region — Crystal Key required; chests + mini-boss)
// =================================================================
let dungeonGenerated = false;
let dungeonCleared = false;
let dungeonBoss = null;
const chests = [];  // { x, y, tx, ty, opened, loot:[{id,amt}] }
const DOOR = { tx: -1, ty: -1, x: 0, y: 0, locked: true };

function generateDungeon() {
  // Region 13x13 at top-left of stone biome (tx 60..72, ty 4..16)
  const x0 = 62, y0 = 4;
  const w = 12, h = 12;

  // Find a stone region near top-left of map; force tiles + walls
  for (let r = y0; r < y0 + h; r++) {
    for (let c = x0; c < x0 + w; c++) {
      if (r >= WORLD_TILES || c >= WORLD_TILES) continue;
      world.tiles[r][c] = T_STONE;
      // Remove any objects in this region
      for (const o of world.objects) {
        if (o.tx === c && o.ty === r) o.alive = false;
      }
    }
  }
  // Wall perimeter (skip middle of bottom edge for door)
  const doorC = x0 + Math.floor(w / 2);
  const doorR = y0 + h - 1;
  for (let c = x0; c < x0 + w; c++) {
    // Top + bottom walls
    addWall(c, y0, true);
    if (c !== doorC) addWall(c, doorR, true);
  }
  for (let r = y0 + 1; r < y0 + h - 1; r++) {
    addWall(x0, r, true);
    addWall(x0 + w - 1, r, true);
  }
  // Locked door
  DOOR.tx = doorC; DOOR.ty = doorR;
  DOOR.x = doorC * TILE + TILE/2; DOOR.y = doorR * TILE + TILE/2;
  DOOR.locked = true;

  // Chests at 3 corners
  const chestSpots = [
    { x: x0 + 1, y: y0 + 1 },
    { x: x0 + w - 2, y: y0 + 1 },
    { x: x0 + 1, y: y0 + h - 2 },
    { x: x0 + w - 2, y: y0 + h - 2 }
  ];
  for (const sp of chestSpots) {
    chests.push({
      tx: sp.x, ty: sp.y, x: sp.x * TILE + TILE/2, y: sp.y * TILE + TILE/2,
      opened: false,
      loot: rollChestLoot()
    });
  }
  dungeonGenerated = true;
}
function addWall(tx, ty, blocks) {
  world.structures.push({
    type: 'wall', tx, ty,
    x: tx * TILE + TILE/2, y: ty * TILE + TILE/2,
    blocks: !!blocks
  });
}
function rollChestLoot() {
  const loot = [];
  loot.push({ id: 'iron', amt: 3 + Math.floor(Math.random() * 4) });
  if (Math.random() < 0.7) loot.push({ id: 'crystal', amt: 1 + Math.floor(Math.random() * 2) });
  if (Math.random() < 0.5) loot.push({ id: 'scrap', amt: 3 + Math.floor(Math.random() * 4) });
  if (Math.random() < 0.4) loot.push({ id: 'arrow', amt: 5 });
  if (Math.random() < 0.25) loot.push({ id: 'meat', amt: 3 });
  return loot;
}

function drawDoorAndChests(ctx, cam) {
  // Door
  if (DOOR.tx >= 0) {
    const sx = DOOR.x - cam.x, sy = DOOR.y - cam.y;
    if (sx > -40 && sx < VIEW_W + 40 && sy > -40 && sy < VIEW_H + 40) {
      ctx.fillStyle = DOOR.locked ? '#7c2d12' : '#22c55e';
      ctx.fillRect(sx - 14, sy - 16, 28, 32);
      ctx.fillStyle = DOOR.locked ? '#facc15' : '#86efac';
      // Lock or arrow
      ctx.font = 'bold 16px Segoe UI';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(DOOR.locked ? '🔒' : '✓', sx, sy);
    }
  }
  for (const c of chests) {
    const sx = c.x - cam.x, sy = c.y - cam.y;
    if (sx < -20 || sx > VIEW_W + 20 || sy < -20 || sy > VIEW_H + 20) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 6, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.opened ? '#52525b' : '#a16207';
    ctx.fillRect(sx - 12, sy - 6, 24, 14);
    ctx.fillStyle = c.opened ? '#3f3f46' : '#78350f';
    ctx.fillRect(sx - 12, sy - 8, 24, 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(sx - 2, sy - 2, 4, 4);
    if (!c.opened) {
      const bob = Math.sin(globalFrame * 0.1 + c.tx) * 1.5;
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(sx + 8, sy - 8 + bob, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

class CrystalGolem {
  constructor() {
    // Spawn in the center of the dungeon
    const x = (62 + 6) * TILE + TILE / 2;
    const y = (4 + 6) * TILE + TILE / 2;
    this.x = x; this.y = y;
    this.r = 18;
    this.maxHp = 40;
    this.hp = this.maxHp;
    this.dmg = 12;
    this.vx = 0; this.vy = 0;
    this.attackCd = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.iframes = 0;
    this.animFrame = 0;
    this.spawned = false;
  }
  update() {
    if (this.dead) { this.deathTimer--; return; }
    this.animFrame++;
    this.attackCd = Math.max(0, this.attackCd - 1);
    this.iframes = Math.max(0, this.iframes - 1);
    // Only active when player is inside dungeon area
    const insideDungeon = player.x >= 62 * TILE && player.x <= 74 * TILE
                       && player.y >= 4 * TILE && player.y <= 16 * TILE;
    if (!insideDungeon) return;
    if (!this.spawned) {
      this.spawned = true;
      floatText('CRYSTAL GOLEM!', this.x, this.y - 28, '#a855f7');
      cameraShake(10, 18);
    }
    // Chase
    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.sqrt(dx*dx + dy*dy) || 1;
    this.vx = (dx / d) * 0.9;
    this.vy = (dy / d) * 0.9;
    this.x += this.vx;
    if (isBlocked(this.x, this.y, this.r)) { this.x -= this.vx; this.vx = 0; }
    this.y += this.vy;
    if (isBlocked(this.x, this.y, this.r)) { this.y -= this.vy; this.vy = 0; }
    // Attack
    if (d < this.r + player.r + 6 && this.attackCd === 0) {
      player.takeDamage(this.dmg, 'golem');
      this.attackCd = 50;
      cameraShake(6, 12);
    }
  }
  takeHit(dmg, fx, fy) {
    if (this.iframes > 0 || this.dead) return;
    this.hp -= dmg;
    this.iframes = 14;
    SFX.hit();
    burst(this.x, this.y, '#a855f7', 10, 2.5);
    cameraShake(4, 8);
    this.x += fx * 2; this.y += fy * 2;
    if (this.hp <= 0) {
      this.dead = true;
      this.deathTimer = 60;
      cameraShake(18, 28);
      burst(this.x, this.y, '#a855f7', 40, 5);
      inventory.add('crystal', 3 + Math.floor(Math.random() * 3));
      inventory.add('iron', 6 + Math.floor(Math.random() * 4));
      gainXp(150);
      dungeonCleared = true;
      floatText('DUNGEON CLEARED!', this.x, this.y - 30, '#facc15');
      SFX.victory ? SFX.victory() : SFX.craft();
      unlockAchievement('a_golem');
    }
  }
  draw(ctx, cam) {
    if (this.dead && this.deathTimer <= 0) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    const flicker = this.iframes > 0 && (this.iframes % 6 < 3);
    if (flicker) return;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + this.r * 0.8, this.r, this.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body — crystal cluster
    const pulse = Math.sin(this.animFrame * 0.12) * 2;
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = this.r + pulse;
      const px = sx + Math.cos(a) * r;
      const py = sy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // Core
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function tryUseDoor() {
  if (DOOR.tx < 0 || !DOOR.locked) return false;
  if (dist2(player.x, player.y, DOOR.x, DOOR.y) > 40 * 40) return false;
  if (inventory.count('crystal_key') <= 0) {
    floatText('NEEDS CRYSTAL KEY', player.x, player.y - 30, '#ef4444');
    return false;
  }
  inventory.remove('crystal_key', 1);
  DOOR.locked = false;
  // Remove the wall structure at the door tile (so player can pass)
  const idx = world.structures.findIndex(s => s.tx === DOOR.tx && s.ty === DOOR.ty);
  if (idx >= 0) world.structures.splice(idx, 1);
  burst(DOOR.x, DOOR.y, '#facc15', 22, 3);
  floatText('UNLOCKED!', DOOR.x, DOOR.y - 30, '#22c55e');
  SFX.craft();
  // Spawn the mini-boss the first time the door opens
  if (!dungeonBoss) dungeonBoss = new CrystalGolem();
  return true;
}

function tryOpenChest() {
  for (const c of chests) {
    if (c.opened) continue;
    if (dist2(player.x, player.y, c.x, c.y) > 38 * 38) continue;
    c.opened = true;
    for (const it of c.loot) inventory.add(it.id, it.amt);
    burst(c.x, c.y, '#facc15', 24, 3);
    floatText('CHEST!', c.x, c.y - 20, '#facc15');
    SFX.pick();
    return true;
  }
  return false;
}

// =================================================================
// MINIMAP
// =================================================================
let minimapCanvas, minimapCtx;
const MINIMAP_SIZE = 96;
function drawMinimap() {
  if (!minimapCanvas || !minimapCtx) return;
  const c = minimapCtx;
  c.fillStyle = '#020617';
  c.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  const scale = MINIMAP_SIZE / WORLD_TILES;
  // Tile colors (simpler palette for minimap)
  const MAP_COLOR = {
    [T_WATER]: '#1e40af', [T_SAND]: '#fbbf24',
    [T_GRASS]: '#65a30d', [T_FOREST]: '#3f6212',
    [T_STONE]: '#78716c', [T_SNOW]: '#e5e7eb'
  };
  for (let r = 0; r < WORLD_TILES; r++) {
    for (let cc = 0; cc < WORLD_TILES; cc++) {
      c.fillStyle = MAP_COLOR[world.tiles[r][cc]] || '#000';
      c.fillRect(cc * scale, r * scale, scale + 0.5, scale + 0.5);
    }
  }
  // Markers
  // Dungeon
  if (dungeonGenerated && DOOR.tx >= 0) {
    c.fillStyle = DOOR.locked ? '#f97316' : '#22c55e';
    c.fillRect(DOOR.tx * scale - 1, DOOR.ty * scale - 1, 3, 3);
  }
  // Campfires
  for (const s of world.structures) {
    if (s.type === 'campfire') {
      c.fillStyle = '#f97316';
      c.fillRect(s.tx * scale, s.ty * scale, 2, 2);
    }
  }
  // Trader
  if (trader) {
    c.fillStyle = '#facc15';
    c.fillRect(Math.floor(trader.x / TILE) * scale - 1,
               Math.floor(trader.y / TILE) * scale - 1, 3, 3);
  }
  // Boss
  if (boss && !boss.dead) {
    c.fillStyle = '#ef4444';
    c.fillRect(Math.floor(boss.x / TILE) * scale - 1,
               Math.floor(boss.y / TILE) * scale - 1, 4, 4);
  }
  // Pet
  if (pet && !pet.dead) {
    c.fillStyle = '#06b6d4';
    c.fillRect(Math.floor(pet.x / TILE) * scale, Math.floor(pet.y / TILE) * scale, 2, 2);
  }
  // Player (always on top)
  if (player) {
    c.fillStyle = '#fff';
    c.fillRect(Math.floor(player.x / TILE) * scale - 1,
               Math.floor(player.y / TILE) * scale - 1, 4, 4);
  }
}

// =================================================================
// WORKBENCH proximity (unlocks T2 recipes)
// =================================================================
function nearWorkbench() {
  if (!world) return false;
  for (const s of world.structures) {
    if (s.type === 'workbench' && dist2(player.x, player.y, s.x, s.y) < 90 * 90) return true;
  }
  return false;
}

// =================================================================
// ARROW TURRET (auto-fires arrows at enemies)
// =================================================================
const turrets = [];
class Turret {
  constructor(x, y, tx, ty) {
    this.x = x; this.y = y; this.tx = tx; this.ty = ty;
    this.r = 12;
    this.hp = 40; this.maxHp = 40;
    this.attackCd = 0;
    this.range = 180;
    this.dmg = 7;
    this.animFrame = 0;
    this.dead = false;
    this.deathTimer = 0;
  }
  update() {
    if (this.dead) { this.deathTimer--; return; }
    this.animFrame++;
    this.attackCd = Math.max(0, this.attackCd - 1);
    if (this.attackCd > 0) return;
    // Find nearest enemy / boss within range
    let target = null, tD = this.range * this.range;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = dist2(this.x, this.y, e.x, e.y);
      if (d < tD) { tD = d; target = e; }
    }
    if (boss && !boss.dead) {
      const d = dist2(this.x, this.y, boss.x, boss.y);
      if (d < tD) { tD = d; target = boss; }
    }
    if (dungeonBoss && !dungeonBoss.dead) {
      const d = dist2(this.x, this.y, dungeonBoss.x, dungeonBoss.y);
      if (d < tD) { tD = d; target = dungeonBoss; }
    }
    if (!target) return;
    const dx = target.x - this.x, dy = target.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const sp = 8;
    projectiles.push(new Projectile(this.x, this.y - 6, (dx / d) * sp, (dy / d) * sp, this.dmg));
    this.attackCd = 70;
  }
  draw(ctx, cam) {
    if (this.dead && this.deathTimer <= 0) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    if (sx < -30 || sx > VIEW_W + 30 || sy < -30 || sy > VIEW_H + 30) return;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 10, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Wooden base
    ctx.fillStyle = '#78350f';
    ctx.fillRect(sx - 10, sy - 4, 20, 14);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(sx - 10, sy - 4, 20, 3);
    // Top tower
    ctx.fillStyle = '#52525b';
    ctx.fillRect(sx - 8, sy - 14, 16, 10);
    // Arrow tip (animated rotation toward target)
    const r = (this.attackCd > 50 ? '#fbbf24' : '#facc15');
    ctx.fillStyle = r;
    const bob = Math.sin(this.animFrame * 0.12) * 1;
    ctx.fillRect(sx - 2, sy - 18 + bob, 4, 6);
    // HP bar
    if (this.hp < this.maxHp) {
      const pct = this.hp / this.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(sx - 10, sy - 22, 20, 3);
      ctx.fillStyle = pct > 0.5 ? '#22c55e' : '#facc15';
      ctx.fillRect(sx - 10, sy - 22, 20 * pct, 3);
    }
  }
}

// =================================================================
// HUNGER / THIRST STATES (buffs/debuffs)
// =================================================================
function getHungerState() {
  if (player.hunger > 80) return 'well_fed';
  if (player.hunger < 25) return 'hungry';
  return null;
}
function getThirstState() {
  if (player.thirst < 25) return 'thirsty';
  return null;
}
function hungerSpeedMul() {
  const h = getHungerState();
  if (h === 'well_fed') return 1.05;
  if (h === 'hungry') return 0.85;
  return 1;
}
function hungerDmgMul() {
  return getHungerState() === 'hungry' ? 0.8 : 1;
}

// =================================================================
// ACHIEVEMENTS (persistent across runs)
// =================================================================
const ACHIEVEMENTS = [
  { id: 'a_first_day', icon: '🌅' },
  { id: 'a_5_days',    icon: '⭐' },
  { id: 'a_iron',      icon: '🔩' },
  { id: 'a_50_trees',  icon: '🪵' },
  { id: 'a_titan',     icon: '💀' },
  { id: 'a_golem',     icon: '💎' },
  { id: 'a_pet',       icon: '🐺' },
  { id: 'a_farm',      icon: '🌱' },
  { id: 'a_trade',     icon: '💰' },
  { id: 'a_bow',       icon: '🏹' },
  { id: 'a_cozy',      icon: '🔥' },
  { id: 'a_turret',    icon: '🗼' }
];
let achievements = (() => {
  try { return JSON.parse(localStorage.getItem('srvAchievements') || '{}'); }
  catch { return {}; }
})();
let achievCounters = (() => {
  try { return JSON.parse(localStorage.getItem('srvAchCounters') || '{}'); }
  catch { return {}; }
})();
function saveAchievements() {
  localStorage.setItem('srvAchievements', JSON.stringify(achievements));
  localStorage.setItem('srvAchCounters', JSON.stringify(achievCounters));
}
function unlockAchievement(id) {
  if (achievements[id]) return;
  achievements[id] = true;
  saveAchievements();
  const lang = window.srvAchLang || {};
  const name = lang[id + '_n'] || id;
  if (player) floatText('🏆 ' + name, player.x, player.y - 50, '#facc15');
  SFX.craft();
  refreshAchievementsUI();
}
function inc(counter, amount) {
  achievCounters[counter] = (achievCounters[counter] || 0) + (amount || 1);
}
function trackAchievement(event) {
  if (event === 'tree_chop') {
    inc('trees');
    if (achievCounters.trees >= 50) unlockAchievement('a_50_trees');
  } else if (event === 'day_survived') {
    const d = Math.floor(world.time / DAY_LENGTH_MS) + 1;
    if (d >= 1) unlockAchievement('a_first_day');
    if (d >= 5) unlockAchievement('a_5_days');
  } else if (event === 'boss_defeated') {
    unlockAchievement('a_titan');
  }
  saveAchievements();
}

// =================================================================
// AUDIO  (shared context, synthesized SFX)
// =================================================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.3;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('srvMuted') === '1';
function applyMute() { masterGain.gain.value = muted ? 0 : 0.3; }
applyMute();
function toggleMute() {
  muted = !muted;
  localStorage.setItem('srvMuted', muted ? '1' : '0');
  applyMute();
  const b = document.getElementById('srv-mute-btn');
  if (b) b.textContent = muted ? '🔇' : '🔊';
}
window.survivalToggleMute = toggleMute;
function beep(o) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(o.freq, audioCtx.currentTime);
  if (o.freqEnd != null) osc.frequency.linearRampToValueAtTime(o.freqEnd, audioCtx.currentTime + (o.dur || 0.1));
  gain.gain.setValueAtTime(o.gain || 0.25, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (o.dur || 0.1));
  osc.connect(gain); gain.connect(masterGain);
  osc.start(); osc.stop(audioCtx.currentTime + (o.dur || 0.1));
}
const SFX = {
  hit:     () => beep({ type: 'square',  freq: 220, freqEnd: 110, dur: 0.10, gain: 0.30 }),
  chop:    () => beep({ type: 'square',  freq: 180, freqEnd: 90,  dur: 0.12, gain: 0.30 }),
  mine:    () => beep({ type: 'sawtooth',freq: 140, freqEnd: 70,  dur: 0.14, gain: 0.30 }),
  pick:    () => { beep({ type: 'triangle', freq: 700, dur: 0.05, gain: 0.25 });
                   setTimeout(()=>beep({ type: 'triangle', freq: 1000, dur: 0.06, gain: 0.25 }),40); },
  craft:   () => { [600, 800, 1100].forEach((f,i)=>setTimeout(()=>beep({ type:'triangle', freq:f, dur:0.08, gain:0.3 }), i*60)); },
  attack:  () => beep({ type: 'square',   freq: 500, freqEnd: 250, dur: 0.10, gain: 0.30 }),
  dodge:   () => beep({ type: 'triangle', freq: 800, freqEnd: 400, dur: 0.10, gain: 0.25 }),
  eat:     () => beep({ type: 'sine',     freq: 300, dur: 0.15, gain: 0.30 }),
  drink:   () => beep({ type: 'sine',     freq: 350, dur: 0.18, gain: 0.30 }),
  build:   () => beep({ type: 'square',   freq: 350, freqEnd: 500, dur: 0.10, gain: 0.30 }),
  hurt:    () => beep({ type: 'sawtooth', freq: 200, freqEnd: 80, dur: 0.20, gain: 0.35 }),
  death:   () => beep({ type: 'sawtooth', freq: 400, freqEnd: 60, dur: 0.6, gain: 0.4 }),
  night:   () => { [600, 400, 300].forEach((f,i)=>setTimeout(()=>beep({ type:'sine', freq:f, dur:0.4, gain:0.18 }), i*200)); },
  day:     () => { [400, 600, 800].forEach((f,i)=>setTimeout(()=>beep({ type:'triangle', freq:f, dur:0.3, gain:0.2 }), i*150)); }
};

// =================================================================
// INPUT  (keyboard + virtual joystick + buttons)
// =================================================================
const inputKeys = { up: false, down: false, left: false, right: false, sprint: false };
let attackPressed = false, dodgePressed = false, usePressed = false, blockPressed = false;
let autoTarget = localStorage.getItem('srvAutoTarget') === '1';
let blockHeld = false; // while block button is pressed
let hotbarSelect = -1;          // 0..5 if user selected hotbar by number
const touchStick = { active: false, dx: 0, dy: 0, baseX: 0, baseY: 0, id: -1 };

window.addEventListener('keydown', (e) => {
  if (gameState === STATE_PAUSED && e.key !== 'Escape' && e.key !== 'p' && e.key !== 'P') return;
  const k = e.key;
  if (['ArrowUp','w','W'].includes(k))    inputKeys.up = true;
  else if (['ArrowDown','s','S'].includes(k))  inputKeys.down = true;
  else if (['ArrowLeft','a','A'].includes(k))  inputKeys.left = true;
  else if (['ArrowRight','d','D'].includes(k)) inputKeys.right = true;
  else if (k === 'Shift') inputKeys.sprint = true;
  else if (k === ' ' || k === 'Spacebar') dodgePressed = true;
  else if (k === 'j' || k === 'J' || k === 'f' || k === 'F') attackPressed = true;
  else if (k === 'e' || k === 'E')        usePressed = true;
  else if (k === 'b' || k === 'B') { blockPressed = true; blockHeld = true; }
  else if (k === 'r' || k === 'R') {
    autoTarget = !autoTarget;
    localStorage.setItem('srvAutoTarget', autoTarget ? '1' : '0');
    if (player) floatText(autoTarget ? '🎯 AUTO ON' : '🎯 AUTO OFF', player.x, player.y - 28, '#facc15');
  }
  else if (k === 'i' || k === 'I')        toggleInventory();
  else if (k === 'c' || k === 'C')        toggleCrafting();
  else if (k === 'p' || k === 'P' || k === 'Escape') togglePause();
  else if (k >= '1' && k <= '6') hotbarSelect = parseInt(k, 10) - 1;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  const k = e.key;
  if (['ArrowUp','w','W'].includes(k))    inputKeys.up = false;
  else if (['ArrowDown','s','S'].includes(k))  inputKeys.down = false;
  else if (['ArrowLeft','a','A'].includes(k))  inputKeys.left = false;
  else if (['ArrowRight','d','D'].includes(k)) inputKeys.right = false;
  else if (k === 'Shift') inputKeys.sprint = false;
  else if (k === 'b' || k === 'B') blockHeld = false;
});

// =================================================================
// UTIL
// =================================================================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
function dist2(ax, ay, bx, by) { const dx = ax-bx, dy = ay-by; return dx*dx + dy*dy; }

function isPassable(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= WORLD_TILES || ty >= WORLD_TILES) return false;
  const t = world.tiles[ty][tx];
  if (!PASSABLE[t]) return false;
  // Structures with collision
  for (const s of world.structures) {
    if (s.tx === tx && s.ty === ty && s.blocks) return false;
  }
  return true;
}
function isBlocked(x, y, r) {
  // Check the 4 corners of bounding box
  const points = [
    { x: x - r, y: y - r }, { x: x + r, y: y - r },
    { x: x - r, y: y + r }, { x: x + r, y: y + r }
  ];
  for (const p of points) {
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    if (!isPassable(tx, ty)) return true;
  }
  return false;
}

// =================================================================
// PARTICLES
// =================================================================
const particles = [];
function spawnParticle(x, y, vx, vy, color, life, size, gravity) {
  if (particles.length > 200) particles.shift();
  particles.push({ x, y, vx, vy, color, life, maxLife: life,
                   size: size || 4, gravity: gravity || 0 });
}
function burst(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random());
    spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, 30 + Math.random() * 20, 3 + Math.random() * 3, 0.1);
  }
}
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.95; p.vy *= 0.95;
    p.vy += p.gravity;
    p.life--;
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
// WORLD GEN
// =================================================================
let world = null;
function generateWorld() {
  const tiles = [];
  const objects = [];
  const structures = [];
  const cx = WORLD_TILES / 2, cy = WORLD_TILES / 2;

  for (let r = 0; r < WORLD_TILES; r++) {
    tiles[r] = [];
    for (let c = 0; c < WORLD_TILES; c++) {
      const dx = c - cx, dy = r - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const noise = Math.sin(c * 0.45 + r * 0.31) * 2.2 +
                    Math.cos(c * 0.18 - r * 0.4) * 1.5 +
                    Math.sin((c + r) * 0.22) * 1.2;
      const d = distance + noise;
      let t;
      if (d > 38) t = T_WATER;
      else if (d > 33) t = T_SAND;
      else if (d > 25) t = T_STONE;
      else if (d > 11) t = T_FOREST;
      else t = T_GRASS;
      if (t === T_STONE && Math.random() < 0.18) t = T_SNOW;
      if (t === T_GRASS && Math.random() < 0.03) t = T_SAND;
      if (t === T_FOREST && Math.random() < 0.06) t = T_GRASS;
      tiles[r][c] = t;
    }
  }

  // Spawn objects
  for (let r = 1; r < WORLD_TILES - 1; r++) {
    for (let c = 1; c < WORLD_TILES - 1; c++) {
      const dx = c - cx, dy = r - cy;
      if (Math.sqrt(dx * dx + dy * dy) < 4) continue; // safe spawn area
      const t = tiles[r][c];
      const ax = c * TILE + TILE / 2;
      const ay = r * TILE + TILE / 2;
      if (t === T_FOREST && Math.random() < 0.45) {
        objects.push({ id: objects.length, type: 'tree', tx: c, ty: r, x: ax, y: ay, hp: 3, maxHp: 3, alive: true });
      } else if (t === T_GRASS && Math.random() < 0.07) {
        objects.push({ id: objects.length, type: 'tree', tx: c, ty: r, x: ax, y: ay, hp: 3, maxHp: 3, alive: true });
      } else if (t === T_GRASS && Math.random() < 0.12) {
        objects.push({ id: objects.length, type: 'bush', tx: c, ty: r, x: ax, y: ay, hp: 1, maxHp: 1, alive: true });
      } else if (t === T_STONE && Math.random() < 0.35) {
        const isIron = Math.random() < 0.08; // 8% chance for iron in stone
        objects.push({ id: objects.length, type: 'rock', tx: c, ty: r, x: ax, y: ay,
                       hp: isIron ? 6 : 4, maxHp: isIron ? 6 : 4, alive: true,
                       scrap: !isIron && Math.random() < 0.15, iron: isIron });
      } else if (t === T_SAND && Math.random() < 0.05) {
        objects.push({ id: objects.length, type: 'rock', tx: c, ty: r, x: ax, y: ay, hp: 4, maxHp: 4, alive: true });
      }
    }
  }

  return { tiles, objects, structures, time: 0 };
}

function drawWorld(ctx, cam) {
  const startCol = Math.max(0, Math.floor(cam.x / TILE));
  const startRow = Math.max(0, Math.floor(cam.y / TILE));
  const endCol = Math.min(WORLD_TILES, Math.ceil((cam.x + VIEW_W) / TILE) + 1);
  const endRow = Math.min(WORLD_TILES, Math.ceil((cam.y + VIEW_H) / TILE) + 1);

  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      const t = world.tiles[r][c];
      const sx = c * TILE - cam.x, sy = r * TILE - cam.y;
      ctx.fillStyle = TILE_BASE[t];
      ctx.fillRect(sx, sy, TILE, TILE);
      // Subtle accent pattern (deterministic via tile coords)
      const hash = (c * 73 + r * 131) & 0xff;
      if (t === T_GRASS || t === T_FOREST) {
        ctx.fillStyle = TILE_ACCENT[t];
        ctx.fillRect(sx + (hash & 15) + 2, sy + ((hash >> 4) & 15) + 2, 3, 3);
        if (t === T_FOREST && (hash & 1)) {
          ctx.fillRect(sx + ((hash * 3) & 15) + 4, sy + ((hash * 5) & 15) + 6, 2, 2);
        }
      } else if (t === T_SAND) {
        ctx.fillStyle = TILE_ACCENT[t];
        ctx.fillRect(sx + (hash & 15), sy + ((hash >> 4) & 15), 2, 2);
      } else if (t === T_STONE) {
        ctx.fillStyle = TILE_ACCENT[t];
        ctx.fillRect(sx + (hash & 7), sy + ((hash >> 3) & 7), 4, 3);
      } else if (t === T_WATER) {
        if ((Math.floor(globalFrame / 24) + hash) & 1) {
          ctx.fillStyle = TILE_ACCENT[t];
          ctx.fillRect(sx + (hash & 15), sy + ((hash >> 4) & 15), 3, 1);
        }
      } else if (t === T_SNOW) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + (hash & 15), sy + ((hash >> 4) & 15), 2, 2);
      }
    }
  }
}

function drawObjects(ctx, cam) {
  // Sort by y so closer-to-camera draws on top
  const visibleObjects = world.objects.filter(o => o.alive &&
    o.x >= cam.x - TILE && o.x <= cam.x + VIEW_W + TILE &&
    o.y >= cam.y - TILE && o.y <= cam.y + VIEW_H + TILE);
  visibleObjects.sort((a, b) => a.y - b.y);
  for (const o of visibleObjects) drawObject(ctx, o, cam);
  // Structures
  for (const s of world.structures) {
    if (s.x >= cam.x - TILE && s.x <= cam.x + VIEW_W + TILE &&
        s.y >= cam.y - TILE && s.y <= cam.y + VIEW_H + TILE) {
      drawStructure(ctx, s, cam);
    }
  }
}

function drawObject(ctx, o, cam) {
  const sx = o.x - cam.x, sy = o.y - cam.y;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 4, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (o.type === 'tree') {
    // Trunk
    ctx.fillStyle = '#78350f';
    ctx.fillRect(sx - 3, sy - 4, 6, 12);
    // Canopy (multiple circles)
    ctx.fillStyle = '#15803d';
    ctx.beginPath(); ctx.arc(sx, sy - 14, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.arc(sx - 5, sy - 18, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + 6, sy - 16, 6, 0, Math.PI * 2); ctx.fill();
  } else if (o.type === 'rock') {
    const base = o.iron ? '#9a3412' : (o.scrap ? '#a16207' : '#52525b');
    const accent = o.iron ? '#fb923c' : (o.scrap ? '#fde047' : '#a1a1aa');
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.moveTo(sx - 11, sy + 4);
    ctx.lineTo(sx - 7, sy - 8);
    ctx.lineTo(sx + 2, sy - 11);
    ctx.lineTo(sx + 10, sy - 4);
    ctx.lineTo(sx + 8, sy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(sx - 5, sy - 5, 4, 3);
    ctx.fillRect(sx + 2, sy - 2, 3, 2);
    if (o.iron) {
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(sx + 4, sy - 7, 3, 3);
      ctx.fillRect(sx - 3, sy + 1, 2, 2);
    } else if (o.scrap) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(sx + 4, sy - 7, 3, 3);
    }
  } else if (o.type === 'bush') {
    ctx.fillStyle = '#166534';
    ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.arc(sx - 4, sy - 3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + 4, sy - 1, 5, 0, Math.PI * 2); ctx.fill();
    // Berries
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(sx - 3, sy + 1, 2, 2);
    ctx.fillRect(sx + 3, sy - 1, 2, 2);
    ctx.fillRect(sx, sy - 4, 2, 2);
  }
  // HP indicator if damaged
  if (o.hp < o.maxHp) {
    const pct = o.hp / o.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(sx - 12, sy - 26, 24, 3);
    ctx.fillStyle = pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#facc15' : '#ef4444';
    ctx.fillRect(sx - 12, sy - 26, 24 * pct, 3);
  }
}

function drawStructure(ctx, s, cam) {
  const sx = s.x - cam.x, sy = s.y - cam.y;
  if (s.type === 'campfire') {
    // Stones
    ctx.fillStyle = '#52525b';
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26;
      ctx.beginPath();
      ctx.arc(sx + Math.cos(a) * 10, sy + Math.sin(a) * 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fire (animated)
    const fp = (globalFrame * 0.2) % (Math.PI * 2);
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 4 + Math.sin(fp) * 1, 8, 11 + Math.sin(fp * 1.7) * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 2 + Math.sin(fp + 1) * 1, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Embers
    if (globalFrame % 6 === 0) {
      spawnParticle(s.x + (Math.random() - 0.5) * 8, s.y - 10,
        (Math.random() - 0.5) * 0.5, -Math.random() * 1.5 - 0.5,
        Math.random() < 0.5 ? '#facc15' : '#ef4444',
        30, 2, -0.05);
    }
  } else if (s.type === 'bag') {
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(sx - 12, sy - 6, 24, 12);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(sx - 10, sy - 4, 20, 4);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sx + 9, sy, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (s.type === 'wall') {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(sx - 16, sy - 16, 32, 32);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(sx - 14, sy - 14, 28, 6);
    ctx.fillRect(sx - 14, sy + 2, 28, 6);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(sx - 14, sy - 6, 28, 2);
    ctx.fillRect(sx - 14, sy + 10, 28, 2);
  } else if (s.type === 'workbench') {
    // Wooden workbench (top-down view)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 8, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(sx - 14, sy - 8, 28, 16);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(sx - 14, sy - 8, 28, 4);
    ctx.fillStyle = '#fed7aa';
    // Tools on top (hammer + saw outlines)
    ctx.fillRect(sx - 11, sy - 4, 8, 2);  // hammer
    ctx.fillRect(sx - 4,  sy - 4, 2, 4);
    ctx.fillRect(sx + 3,  sy - 5, 9, 2);  // saw
    ctx.fillRect(sx + 3,  sy - 3, 9, 1);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(sx - 14, sy + 6, 28, 2);
  }
}

// =================================================================
// PLAYER
// =================================================================
class Player {
  constructor() {
    this.x = WORLD_W / 2;
    this.y = WORLD_H / 2;
    this.vx = 0; this.vy = 0;
    this.r = 11;
    this.facing = 'down';
    this.facingX = 0; this.facingY = 1;
    this.hp = skillMaxHp();
    this.hunger = MAX_HUNGER;
    this.thirst = MAX_THIRST;
    this.stamina = MAX_STAMINA;
    this.iframes = 0;
    this.dodgeFrames = 0; this.dodgeCdFrames = 0;
    this.attackFrames = 0; this.attackCdFrames = 0;
    this.useCdFrames = 0;
    this.blockFrames = 0; this.blockCdFrames = 0;
    this.animFrame = 0;
    this.dead = false;
    this.effects = { bleeding: 0, burning: 0 };
  }

  get equipped() {
    const slot = inventory.hotbar[inventory.hotbarSelected];
    if (slot && slot.id) return ITEMS[slot.id];
    return null;
  }
  get weapon() {
    const eq = this.equipped;
    if (!eq) return { dmg: 1, range: 1 };
    if (eq.type === 'weapon' || eq.type === 'tool') return eq;
    return { dmg: 1, range: 1 };
  }

  update() {
    if (this.dead) return;
    this.animFrame++;
    this.iframes = Math.max(0, this.iframes - 1);
    this.dodgeCdFrames = Math.max(0, this.dodgeCdFrames - 1);
    this.attackCdFrames = Math.max(0, this.attackCdFrames - 1);
    this.useCdFrames = Math.max(0, this.useCdFrames - 1);
    this.blockCdFrames = Math.max(0, this.blockCdFrames - 1);
    if (this.blockFrames > 0) this.blockFrames--;
    if (this.attackFrames > 0) this.attackFrames--;
    if (this.dodgeFrames > 0) this.dodgeFrames--;

    // Status effects tick
    if (this.effects.bleeding > 0) {
      this.effects.bleeding--;
      this.hp = Math.max(0, this.hp - 0.18);
      if (this.animFrame % 8 === 0) burst(this.x, this.y, '#dc2626', 3, 1);
    }
    if (this.effects.burning > 0) {
      this.effects.burning--;
      this.hp = Math.max(0, this.hp - 0.28);
      if (weather.cold) weather.cold = false; // burning cancels cold
      if (this.animFrame % 6 === 0) burst(this.x, this.y - 8, '#f97316', 3, 1);
    }

    // Survival drain (modulated by Endurance skill)
    const drainMul = skillDrainMul();
    this.hunger = Math.max(0, this.hunger - HUNGER_DRAIN * drainMul);
    this.thirst = Math.max(0, this.thirst - THIRST_DRAIN * drainMul);
    // Cold drain in snow biome
    if (weather.cold) this.hp = Math.max(0, this.hp - 0.012);
    if (this.hunger <= 0 || this.thirst <= 0) {
      this.hp = Math.max(0, this.hp - STARVE_HP);
    }
    // Rain refills thirst slowly when outdoors
    if (weather.rain && !nearShelter(this.x, this.y)) {
      this.thirst = Math.min(skillMaxHp() === skillMaxHp() ? MAX_THIRST : MAX_THIRST, this.thirst + 0.04);
    }
    if (this.hp <= 0) {
      this.dead = true; SFX.death();
      setTimeout(() => gameOver(), 800);
      return;
    }

    // Input
    let dx = 0, dy = 0;
    if (inputKeys.up)    dy -= 1;
    if (inputKeys.down)  dy += 1;
    if (inputKeys.left)  dx -= 1;
    if (inputKeys.right) dx += 1;
    if (touchStick.active) {
      dx = touchStick.dx;
      dy = touchStick.dy;
    }
    const moving = (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) && this.dodgeFrames === 0;
    const wantSprint = (inputKeys.sprint || touchStick.sprint) && moving && this.stamina > 0;
    let speed = (wantSprint ? SPEED_SPRINT : SPEED_WALK) * skillSpeedMul() * hungerSpeedMul();
    // Snow biome slows you down
    if (weather.cold) speed *= 0.75;
    // Well Fed: regen HP slowly
    if (getHungerState() === 'well_fed' && this.hp < skillMaxHp() && this.animFrame % 30 === 0) {
      this.hp = Math.min(skillMaxHp(), this.hp + 1);
    }

    if (wantSprint) {
      this.stamina = Math.max(0, this.stamina - SPRINT_DRAIN);
    } else if (this.dodgeFrames === 0) {
      this.stamina = Math.min(MAX_STAMINA, this.stamina + STAMINA_REGEN);
    }

    if (this.dodgeFrames > 0) {
      // velocity locked from dodge start
    } else if (moving) {
      const len = Math.sqrt(dx * dx + dy * dy);
      this.vx = (dx / len) * speed;
      this.vy = (dy / len) * speed;
      // Update facing (dominant axis)
      if (Math.abs(dx) > Math.abs(dy)) {
        this.facing = dx > 0 ? 'right' : 'left';
        this.facingX = dx > 0 ? 1 : -1; this.facingY = 0;
      } else {
        this.facing = dy > 0 ? 'down' : 'up';
        this.facingX = 0; this.facingY = dy > 0 ? 1 : -1;
      }
    } else {
      this.vx *= 0.7; this.vy *= 0.7;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
      if (Math.abs(this.vy) < 0.05) this.vy = 0;
    }

    // Move and clamp
    this.x += this.vx;
    if (isBlocked(this.x, this.y, this.r)) { this.x -= this.vx; this.vx = 0; }
    this.y += this.vy;
    if (isBlocked(this.x, this.y, this.r)) { this.y -= this.vy; this.vy = 0; }
    this.x = clamp(this.x, this.r, WORLD_W - this.r);
    this.y = clamp(this.y, this.r, WORLD_H - this.r);

    // Dodge
    const dodgeCost = skillDodgeCost();
    if (dodgePressed && this.dodgeCdFrames === 0 && this.stamina >= dodgeCost) {
      this.dodgeFrames = DODGE_DUR;
      this.dodgeCdFrames = DODGE_COOLDOWN;
      this.iframes = Math.max(this.iframes, DODGE_DUR + 4);
      this.stamina -= dodgeCost;
      const ddx = (dx || this.facingX);
      const ddy = (dy || this.facingY);
      const llen = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      this.vx = (ddx / llen) * DODGE_VEL;
      this.vy = (ddy / llen) * DODGE_VEL;
      SFX.dodge();
      burst(this.x, this.y, '#7dd3fc', 8, 1.5);
    }
    dodgePressed = false;

    // Block (hold to raise shield, halves damage, drains stamina)
    if (blockHeld && this.blockCdFrames === 0 && this.stamina > 2) {
      this.blockFrames = 6;
      this.stamina = Math.max(0, this.stamina - 0.5);
      if (this.stamina <= 0) {
        this.blockFrames = 0;
        this.blockCdFrames = 60;
      }
    } else if (blockPressed && this.blockCdFrames === 0 && this.stamina > 4) {
      // Tap to parry-block briefly
      this.blockFrames = 18;
      this.blockCdFrames = 30;
      this.stamina = Math.max(0, this.stamina - 4);
    }
    blockPressed = false;

    // Auto-target: snap facing to nearest enemy in range when attack is pressed
    if (autoTarget && attackPressed) {
      const tgt = findNearestEnemy(this.x, this.y, 220);
      if (tgt) {
        const tdx = tgt.x - this.x, tdy = tgt.y - this.y;
        const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        this.facingX = tdx / tlen; this.facingY = tdy / tlen;
        if (Math.abs(tdx) > Math.abs(tdy)) {
          this.facing = tdx > 0 ? 'right' : 'left';
        } else {
          this.facing = tdy > 0 ? 'down' : 'up';
        }
      }
    }

    // Attack
    if (attackPressed && this.attackCdFrames === 0) {
      this.attackFrames = 14;
      this.attackCdFrames = 26;
      SFX.attack();
      doAttack();
    }
    attackPressed = false;

    // Use (E or USE button)
    if (usePressed && this.useCdFrames === 0) {
      this.useCdFrames = 12;
      tryUseAction();
    }
    usePressed = false;

    // Campfire restoration (warm + slow heal)
    for (const s of world.structures) {
      if (s.type !== 'campfire') continue;
      if (dist2(this.x, this.y, s.x, s.y) < 64 * 64) {
        if (this.animFrame % 30 === 0 && this.hp < MAX_HP) this.hp = Math.min(MAX_HP, this.hp + 1);
        break;
      }
    }
  }

  takeDamage(amount, source) {
    if (this.iframes > 0 || this.dead) return;
    // Block: halves damage and short iframes
    if (this.blockFrames > 0) {
      amount = Math.max(1, Math.round(amount * 0.4));
      burst(this.x, this.y, '#fde68a', 6, 1.5);
      floatText('BLOCK', this.x, this.y - 26, '#facc15');
      this.iframes = Math.max(this.iframes, 12);
    }
    this.hp -= amount;
    this.iframes = 50;
    SFX.hurt();
    cameraShake(8, 12);
    burst(this.x, this.y, '#ef4444', 12, 2.5);
    // Apply status effects from source
    if (source === 'wolf' && Math.random() < 0.3) this.effects.bleeding = 300;
    else if (source === 'zombie' && Math.random() < 0.10) this.effects.bleeding = 240;
    else if (source === 'boss_fire' && Math.random() < 0.5) this.effects.burning = 240;
  }

  draw(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    if (this.iframes > 0 && this.iframes % 8 < 4) return;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + this.r * 0.75, this.r * 0.9, this.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(sx - 8, sy - 4, 16, 14);
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(sx - 8, sy + 8, 16, 2);

    // Head
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(sx, sy - 9, 8, 0, Math.PI * 2);
    ctx.fill();
    // Hair
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(sx - 8, sy - 16, 16, 4);

    // Eyes (face direction)
    ctx.fillStyle = '#000';
    if (this.facing === 'down') {
      ctx.fillRect(sx - 3, sy - 8, 2, 2);
      ctx.fillRect(sx + 1, sy - 8, 2, 2);
    } else if (this.facing === 'left') {
      ctx.fillRect(sx - 5, sy - 9, 2, 2);
      ctx.fillRect(sx - 1, sy - 9, 2, 2);
    } else if (this.facing === 'right') {
      ctx.fillRect(sx + 3, sy - 9, 2, 2);
      ctx.fillRect(sx - 1, sy - 9, 2, 2);
    }
    // 'up' = back of head, no eyes

    // Legs
    ctx.fillStyle = '#1e293b';
    const stepPhase = Math.abs(this.vx) + Math.abs(this.vy) > 0.5
      ? Math.sin(this.animFrame * 0.4) * 2 : 0;
    ctx.fillRect(sx - 6, sy + 10, 4, 4 + stepPhase);
    ctx.fillRect(sx + 2, sy + 10, 4, 4 - stepPhase);

    // Equipped item in hand
    const eq = this.equipped;
    if (eq && (eq.type === 'tool' || eq.type === 'weapon')) {
      drawEquipped(ctx, sx, sy, this.facing, eq);
    }

    // Attack swing
    if (this.attackFrames > 0) {
      const prog = 1 - this.attackFrames / 14;
      drawAttackSwing(ctx, sx, sy, this.facingX, this.facingY, prog);
    }
  }
}

function drawEquipped(ctx, sx, sy, facing, item) {
  const handOffsetX = facing === 'right' ? 8 : facing === 'left' ? -8 : 0;
  const handOffsetY = facing === 'down' ? 8 : facing === 'up' ? -8 : 0;
  ctx.save();
  ctx.translate(sx + handOffsetX, sy + handOffsetY);
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.icon, 0, 0);
  ctx.restore();
}

function drawAttackSwing(ctx, sx, sy, fx, fy, prog) {
  const angle = Math.atan2(fy, fx);
  const startA = angle - Math.PI * 0.6;
  const endA = angle + Math.PI * 0.6;
  const ang = startA + (endA - startA) * prog;
  const reach = 26;
  const x1 = sx + Math.cos(ang) * reach;
  const y1 = sy + Math.sin(ang) * reach;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx, sy, reach, ang - 0.3, ang + 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx + Math.cos(ang) * 8, sy + Math.sin(ang) * 8);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

// =================================================================
// ENEMIES
// =================================================================
class Enemy {
  constructor(type, x, y) {
    this.type = type;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.animFrame = Math.floor(Math.random() * 30);
    this.dead = false;
    this.deathTimer = 0;
    this.iframes = 0;
    this.attackCd = 0;
    if (type === 'zombie') {
      this.r = 11; this.hp = 8; this.maxHp = 8;
      this.speed = 0.6; this.dmg = 8;
      this.color = '#16a34a'; this.color2 = '#365314';
    } else { // wolf
      this.r = 10; this.hp = 5; this.maxHp = 5;
      this.speed = 1.5; this.dmg = 10;
      this.color = '#78716c'; this.color2 = '#44403c';
    }
  }
  update() {
    if (this.dead) { this.deathTimer--; return; }
    this.animFrame++;
    this.iframes = Math.max(0, this.iframes - 1);
    this.attackCd = Math.max(0, this.attackCd - 1);
    // Chase player
    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0 && d < 600) {
      this.vx = (dx / d) * this.speed;
      this.vy = (dy / d) * this.speed;
    } else {
      this.vx *= 0.9; this.vy *= 0.9;
    }
    // Move with collision
    this.x += this.vx;
    if (isBlocked(this.x, this.y, this.r)) { this.x -= this.vx; this.vx = 0; }
    this.y += this.vy;
    if (isBlocked(this.x, this.y, this.r)) { this.y -= this.vy; this.vy = 0; }
    this.x = clamp(this.x, this.r, WORLD_W - this.r);
    this.y = clamp(this.y, this.r, WORLD_H - this.r);
    // Damage player on contact
    if (d < this.r + player.r + 4 && this.attackCd === 0) {
      player.takeDamage(this.dmg, this.type);
      this.attackCd = 60;
    }
  }
  takeHit(dmg, fx, fy) {
    if (this.iframes > 0 || this.dead) return;
    this.hp -= dmg;
    this.iframes = 16;
    SFX.hit();
    burst(this.x, this.y, '#fff', 10, 2.5);
    cameraShake(3, 6);
    // Knockback
    this.x += fx * 8;
    this.y += fy * 8;
    if (this.hp <= 0) {
      this.dead = true;
      this.deathTimer = 30;
      burst(this.x, this.y, this.color, 20, 4);
      // Drops + XP
      if (this.type === 'zombie') {
        inventory.add('fiber', 1);
        if (Math.random() < 0.4) inventory.add('meat', 1);
        gainXp(10);
        emit('kill_zombie');
      } else {
        inventory.add('fiber', 1);
        if (Math.random() < 0.7) inventory.add('meat', 1);
        gainXp(15);
        emit('kill_wolf');
      }
    }
  }
  draw(ctx, cam) {
    if (this.dead && this.deathTimer <= 0) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    if (this.iframes > 0 && this.iframes % 6 < 3) return;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + this.r * 0.7, this.r * 0.9, this.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.type === 'zombie') {
      // Body
      ctx.fillStyle = this.color2;
      ctx.fillRect(sx - 8, sy - 4, 16, 12);
      // Head
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(sx, sy - 9, 7, 0, Math.PI * 2);
      ctx.fill();
      // Glowing eyes
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx - 3, sy - 9, 2, 2);
      ctx.fillRect(sx + 1, sy - 9, 2, 2);
      // Arms reaching out (animation)
      const sway = Math.sin(this.animFrame * 0.18) * 2;
      ctx.fillStyle = this.color2;
      ctx.fillRect(sx - 11, sy - 2 + sway, 4, 8);
      ctx.fillRect(sx + 7,  sy - 2 - sway, 4, 8);
      // Legs
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(sx - 5, sy + 8, 3, 4);
      ctx.fillRect(sx + 2, sy + 8, 3, 4);
    } else { // wolf
      // Body
      ctx.fillStyle = this.color;
      ctx.fillRect(sx - 9, sy - 4, 18, 9);
      // Head
      ctx.beginPath();
      ctx.arc(sx + (this.vx > 0 ? 8 : -8), sy - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      // Ears
      ctx.fillStyle = this.color2;
      ctx.fillRect(sx + (this.vx > 0 ? 5 : -9), sy - 9, 3, 3);
      ctx.fillRect(sx + (this.vx > 0 ? 10 : -4), sy - 9, 3, 3);
      // Eye (red glow)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(sx + (this.vx > 0 ? 8 : -8), sy - 3, 2, 2);
      // Legs (run anim)
      const phase = Math.sin(this.animFrame * 0.35) * 3;
      ctx.fillStyle = this.color2;
      ctx.fillRect(sx - 6, sy + 4, 3, 5 + phase);
      ctx.fillRect(sx - 1, sy + 4, 3, 5 - phase);
      ctx.fillRect(sx + 4, sy + 4, 3, 5 + phase);
    }

    // HP bar above
    const pct = this.hp / this.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(sx - 11, sy - 22, 22, 3);
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#facc15' : '#ef4444';
    ctx.fillRect(sx - 11, sy - 22, 22 * pct, 3);
  }
}

const enemies = [];
let enemySpawnTimer = 0;

function spawnEnemy(type) {
  // Spawn just outside view
  const angle = Math.random() * Math.PI * 2;
  const dist = 350;
  const ex = clamp(player.x + Math.cos(angle) * dist, 30, WORLD_W - 30);
  const ey = clamp(player.y + Math.sin(angle) * dist, 30, WORLD_H - 30);
  // Don't spawn in water
  const tx = Math.floor(ex / TILE), ty = Math.floor(ey / TILE);
  if (tx < 0 || ty < 0 || tx >= WORLD_TILES || ty >= WORLD_TILES) return;
  if (world.tiles[ty][tx] === T_WATER) return;
  enemies.push(new Enemy(type, ex, ey));
}

function updateEnemies() {
  // Spawn logic
  enemySpawnTimer--;
  if (enemySpawnTimer <= 0) {
    const isNight = (timeOfDay() === 'night');
    const dayCount = Math.floor(world.time / DAY_LENGTH_MS);
    const targetCount = isNight ? 6 + dayCount * 2 : 2 + dayCount;
    if (enemies.length < targetCount) {
      // 70% zombie at night, mostly wolf during day
      const r = Math.random();
      const type = isNight
        ? (r < 0.65 ? 'zombie' : 'wolf')
        : (r < 0.3 ? 'zombie' : 'wolf');
      spawnEnemy(type);
    }
    enemySpawnTimer = isNight ? 80 : 200;
  }
  // Update
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.update();
    if (e.dead && e.deathTimer <= 0) enemies.splice(i, 1);
  }
}

// =================================================================
// COMBAT / HARVEST
// =================================================================
function findNearestEnemy(x, y, maxRange) {
  let best = null, bestD = (maxRange || 9999) * (maxRange || 9999);
  for (const e of enemies) {
    if (e.dead) continue;
    const d2 = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
    if (d2 < bestD) { bestD = d2; best = e; }
  }
  if (boss && !boss.dead) {
    const d2 = (boss.x - x) * (boss.x - x) + (boss.y - y) * (boss.y - y);
    if (d2 < bestD) { bestD = d2; best = boss; }
  }
  return best;
}
function doAttack() {
  const eq = player.equipped;
  const baseDmg = eq ? (eq.dmg || 1) : 1;
  const isCrit = skillCritRoll();
  const dmg = Math.round(baseDmg * skillDmgMul() * hungerDmgMul() * (isCrit ? 2 : 1));
  if (isCrit) floatText('CRIT!', player.x, player.y - 24, '#ef4444');

  // Ranged: bow shoots arrow projectile (consumes 1 arrow)
  if (eq && eq.type === 'bow') {
    const arrows = inventory.count('arrow');
    if (arrows <= 0) {
      floatText('NO ARROWS', player.x, player.y - 24, '#ef4444');
      return;
    }
    inventory.remove('arrow', 1);
    const sp = 7;
    const px = player.x + player.facingX * 14;
    const py = player.y + player.facingY * 14;
    projectiles.push(new Projectile(px, py, player.facingX * sp, player.facingY * sp, dmg));
    SFX.attack();
    return;
  }

  const range = (eq && eq.range ? eq.range : 1) * 30;
  // Hit enemies in front arc
  const ax = player.x + player.facingX * 16;
  const ay = player.y + player.facingY * 16;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - ax, dy = e.y - ay;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < range + e.r) {
      const dot = (dx / (d || 1)) * player.facingX + (dy / (d || 1)) * player.facingY;
      if (dot > 0.3) {
        e.takeHit(dmg, player.facingX, player.facingY);
      }
    }
  }
  // Boss hit
  if (boss && !boss.dead) {
    const dx = boss.x - ax, dy = boss.y - ay;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < range + boss.r) {
      const dot = (dx / (d || 1)) * player.facingX + (dy / (d || 1)) * player.facingY;
      if (dot > 0.2) boss.takeHit(dmg, player.facingX, player.facingY);
    }
  }
  // Hit objects in front
  for (const o of world.objects) {
    if (!o.alive) continue;
    const dx = o.x - ax, dy = o.y - ay;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < range + 12) {
      const dot = d > 0 ? (dx / d) * player.facingX + (dy / d) * player.facingY : 1;
      if (dot > 0.2) {
        const correctTool = (o.type === 'tree' && eq && eq.tool === 'axe') ||
                            (o.type === 'rock' && eq && eq.tool === 'pick');
        const power = correctTool ? eq.power : 1;
        damageObject(o, power);
      }
    }
  }
}

function damageObject(o, power) {
  o.hp -= power;
  cameraShake(2, 4);
  if (o.type === 'tree') {
    SFX.chop();
    burst(o.x, o.y - 8, '#92400e', 8, 1.5);
  } else if (o.type === 'rock') {
    SFX.mine();
    burst(o.x, o.y, '#a1a1aa', 8, 1.5);
  } else {
    SFX.hit();
    burst(o.x, o.y, '#16a34a', 6, 1.2);
  }
  if (o.hp <= 0) {
    o.alive = false;
    if (o.type === 'tree') {
      inventory.add('wood', 2 + Math.floor(Math.random() * 2));
      if (Math.random() < 0.4) inventory.add('fiber', 1);
      if (Math.random() < 0.15) inventory.add('seed_tree', 1);
      burst(o.x, o.y - 14, '#22c55e', 20, 2);
      gainXp(2);
      emit('tree_chop');
    } else if (o.type === 'rock') {
      if (o.iron) {
        inventory.add('iron', 1 + Math.floor(Math.random() * 2));
        inventory.add('stone', 1);
        burst(o.x, o.y, '#fb923c', 18, 2);
        gainXp(5);
        emit('iron_mine');
      } else {
        inventory.add('stone', 2 + Math.floor(Math.random() * 2));
        if (o.scrap) inventory.add('scrap', 1 + Math.floor(Math.random() * 2));
        burst(o.x, o.y, '#9ca3af', 16, 2);
        gainXp(3);
        emit('rock_mine');
      }
    } else if (o.type === 'bush') {
      inventory.add('berry', 1 + Math.floor(Math.random() * 2));
      if (Math.random() < 0.7) inventory.add('fiber', 1);
      if (Math.random() < 0.30) inventory.add('seed_berry', 1);
      burst(o.x, o.y, '#dc2626', 10, 1.5);
    }
    SFX.pick();
  }
}

// E / USE action: eat, drink, place build, or interact with nearby
function tryUseAction() {
  // 1) Open trader if close
  if (tryOpenTrader()) return;
  // 2) Unlock dungeon door if facing it
  if (tryUseDoor()) return;
  // 3) Open chest if close
  if (tryOpenChest()) return;

  const eq = player.equipped;
  if (!eq) {
    // Try interact with adjacent water tile to drink OR fish
    const front = facingTile();
    if (front && world.tiles[front.ty][front.tx] === T_WATER) {
      player.thirst = Math.min(MAX_THIRST, player.thirst + 12);
      SFX.drink();
      // Small chance to fish
      if (Math.random() < 0.18) {
        inventory.add('fish', 1);
        floatText('+FISH', player.x, player.y - 18, '#22d3ee');
      }
      burst(player.x + player.facingX * 16, player.y + player.facingY * 16, '#3b82f6', 8, 1);
      return;
    }
    return;
  }
  if (eq.type === 'food') {
    // Special: raw meat can tame a nearby low-HP wolf
    const eqId = inventory.hotbar[inventory.hotbarSelected]?.id;
    if (eqId === 'meat' && !pet) {
      const target = enemies.find(e => !e.dead && e.type === 'wolf'
        && e.hp <= 2 && dist2(player.x, player.y, e.x, e.y) < 70 * 70);
      if (target) {
        target.dead = true;
        target.deathTimer = 0;
        pet = new Pet(target.x, target.y);
        inventory.consumeHotbar();
        floatText('TAMED!', target.x, target.y - 20, '#06b6d4');
        burst(target.x, target.y, '#06b6d4', 24, 3);
        SFX.craft();
        unlockAchievement('a_pet');
        return;
      }
    }
    inventory.consumeHotbar();
    player.hunger = Math.min(MAX_HUNGER, player.hunger + eq.hunger);
    SFX.eat();
    burst(player.x, player.y - 14, '#f59e0b', 8, 1.5);
  } else if (eq.type === 'drink') {
    inventory.consumeHotbar();
    player.thirst = Math.min(MAX_THIRST, player.thirst + eq.thirst);
    SFX.drink();
    burst(player.x, player.y - 14, '#3b82f6', 8, 1.5);
  } else if (eq.type === 'build') {
    tryPlaceBuild(eq.build);
  } else if (eq.type === 'seed') {
    const id = inventory.hotbar[inventory.hotbarSelected]?.id;
    if (tryPlantSeed(id)) {
      inventory.consumeHotbar();
    } else {
      floatText('PLANT ON GRASS', player.x, player.y - 20, '#ef4444');
    }
  }
}

function facingTile() {
  const fx = player.x + player.facingX * 30;
  const fy = player.y + player.facingY * 30;
  const tx = Math.floor(fx / TILE), ty = Math.floor(fy / TILE);
  if (tx < 0 || ty < 0 || tx >= WORLD_TILES || ty >= WORLD_TILES) return null;
  return { tx, ty, x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function tryPlaceBuild(buildType) {
  const t = facingTile();
  if (!t) return;
  // Can't place on water; can't stack on existing structure
  if (world.tiles[t.ty][t.tx] === T_WATER) return;
  if (world.structures.some(s => s.tx === t.tx && s.ty === t.ty)) return;
  if (world.objects.some(o => o.alive && o.tx === t.tx && o.ty === t.ty)) return;
  const s = { type: buildType, tx: t.tx, ty: t.ty, x: t.x, y: t.y };
  if (buildType === 'wall') s.blocks = true;
  world.structures.push(s);
  inventory.consumeHotbar();
  SFX.build();
  burst(t.x, t.y, '#a16207', 10, 2);
  if (buildType === 'campfire') {
    emit('build_campfire');
    inc('campfires');
    if (achievCounters.campfires >= 3) unlockAchievement('a_cozy');
  }
  if (buildType === 'turret') {
    turrets.push(new Turret(t.x, t.y, t.tx, t.ty));
    unlockAchievement('a_turret');
  }
}

// =================================================================
// INVENTORY + HOTBAR
// =================================================================
const inventory = {
  slots: new Array(INV_SLOTS).fill(null),       // each: { id, count } or null
  hotbar: new Array(HOTBAR_SLOTS).fill(null),
  hotbarSelected: 0,

  count(id) {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.count;
    for (const s of this.hotbar) if (s && s.id === id) n += s.count;
    return n;
  },
  add(id, n) {
    if (!ITEMS[id] || n <= 0) return 0;
    const max = ITEMS[id].stack;
    let remaining = n;
    // Fill existing stacks first (hotbar + inv)
    const all = this.hotbar.concat(this.slots);
    for (let i = 0; i < all.length && remaining > 0; i++) {
      const s = all[i];
      if (s && s.id === id && s.count < max) {
        const add = Math.min(max - s.count, remaining);
        s.count += add; remaining -= add;
      }
    }
    // Then empty slots (hotbar first for QoL)
    for (let i = 0; i < this.hotbar.length && remaining > 0; i++) {
      if (!this.hotbar[i]) {
        const add = Math.min(max, remaining);
        this.hotbar[i] = { id, count: add };
        remaining -= add;
      }
    }
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      if (!this.slots[i]) {
        const add = Math.min(max, remaining);
        this.slots[i] = { id, count: add };
        remaining -= add;
      }
    }
    return n - remaining;
  },
  remove(id, n) {
    let remaining = n;
    const all = [...this.hotbar.map((s,i)=>({s, where:'h', i})),
                 ...this.slots.map((s,i)=>({s, where:'s', i}))];
    for (const e of all) {
      if (remaining <= 0) break;
      if (!e.s || e.s.id !== id) continue;
      const take = Math.min(e.s.count, remaining);
      e.s.count -= take; remaining -= take;
      if (e.s.count <= 0) {
        if (e.where === 'h') this.hotbar[e.i] = null;
        else this.slots[e.i] = null;
      }
    }
    return n - remaining;
  },
  consumeHotbar() {
    const i = this.hotbarSelected;
    const s = this.hotbar[i];
    if (!s) return;
    s.count--;
    if (s.count <= 0) this.hotbar[i] = null;
  },
  selectHotbar(i) {
    if (i < 0 || i >= HOTBAR_SLOTS) return;
    this.hotbarSelected = i;
  },
  swap(aType, aIdx, bType, bIdx) {
    const aArr = aType === 'h' ? this.hotbar : this.slots;
    const bArr = bType === 'h' ? this.hotbar : this.slots;
    const tmp = aArr[aIdx];
    aArr[aIdx] = bArr[bIdx];
    bArr[bIdx] = tmp;
  }
};

// =================================================================
// CRAFTING
// =================================================================
function canCraft(recipe) {
  if (recipe.tier && recipe.tier >= 2 && !nearWorkbench()) return false;
  for (const [id, n] of Object.entries(recipe.req)) {
    if (inventory.count(id) < n) return false;
  }
  return true;
}
function tryCraft(recipeIndex) {
  const r = RECIPES[recipeIndex];
  if (!r || !canCraft(r)) return;
  for (const [id, n] of Object.entries(r.req)) inventory.remove(id, n);
  inventory.add(r.out, r.amt);
  SFX.craft();
  // Quest + achievement tracking
  if (r.out === 'sword' || r.out === 'iron_sword' || r.out === 'crystal_sword') emit('craft_sword');
  if (r.out === 'iron_axe' || r.out === 'iron_pick' || r.out === 'iron_sword') unlockAchievement('a_iron');
  refreshCraftingUI();
  refreshInventoryUI();
}

// =================================================================
// DAY / NIGHT
// =================================================================
function timeOfDay() {
  const t = world.time % DAY_LENGTH_MS;
  const dayMs = DAY_LENGTH_MS * DAY_RATIO;
  return t < dayMs ? 'day' : 'night';
}
function dayProgress() {
  return (world.time % DAY_LENGTH_MS) / DAY_LENGTH_MS;
}
let lastTimePhase = 'day';
let lastDayCounter = 0;
function updateDayNight(dt) {
  world.time += dt;
  const cur = timeOfDay();
  if (cur !== lastTimePhase) {
    lastTimePhase = cur;
    if (cur === 'night') SFX.night();
    else {
      SFX.day();
      // New day started — emit quest event
      const d = Math.floor(world.time / DAY_LENGTH_MS);
      if (d > lastDayCounter) {
        lastDayCounter = d;
        emit('day_survived');
      }
    }
  }
}
function drawDayNightOverlay(ctx) {
  // Get a darkness factor based on time of day
  const dayMs = DAY_LENGTH_MS * DAY_RATIO;
  const t = world.time % DAY_LENGTH_MS;
  let dark = 0;
  if (t < dayMs * 0.85) dark = 0;
  else if (t < dayMs) dark = ((t - dayMs * 0.85) / (dayMs * 0.15)) * 0.65;
  else if (t < DAY_LENGTH_MS * 0.95) dark = 0.65;
  else dark = 0.65 * (1 - (t - DAY_LENGTH_MS * 0.95) / (DAY_LENGTH_MS * 0.05));
  if (dark > 0) {
    ctx.fillStyle = `rgba(15, 23, 42, ${dark})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  // Campfire light circles cut through the dark
  if (dark > 0.3) {
    ctx.globalCompositeOperation = 'lighter';
    for (const s of world.structures) {
      if (s.type !== 'campfire') continue;
      const sx = s.x - cam.x, sy = s.y - cam.y;
      if (sx < -100 || sx > VIEW_W + 100 || sy < -100 || sy > VIEW_H + 100) continue;
      const r = 90 + Math.sin(globalFrame * 0.1) * 8;
      const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      grd.addColorStop(0, 'rgba(251, 146, 60, 0.6)');
      grd.addColorStop(0.5, 'rgba(251, 146, 60, 0.2)');
      grd.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

// =================================================================
// CAMERA
// =================================================================
const cam = { x: 0, y: 0, shakeX: 0, shakeY: 0, shakeFrames: 0, shakeMag: 0 };
function cameraShake(mag, frames) {
  cam.shakeMag = Math.max(cam.shakeMag, mag);
  cam.shakeFrames = Math.max(cam.shakeFrames, frames);
}
function updateCamera(t) {
  const desiredX = t.x - VIEW_W / 2;
  const desiredY = t.y - VIEW_H / 2;
  cam.x += (desiredX - cam.x) * 0.12;
  cam.y += (desiredY - cam.y) * 0.12;
  cam.x = clamp(cam.x, 0, WORLD_W - VIEW_W);
  cam.y = clamp(cam.y, 0, WORLD_H - VIEW_H);
  if (cam.shakeFrames > 0) {
    cam.shakeFrames--;
    cam.shakeX = (Math.random() - 0.5) * cam.shakeMag * (cam.shakeFrames / 14);
    cam.shakeY = (Math.random() - 0.5) * cam.shakeMag * (cam.shakeFrames / 14);
    if (cam.shakeFrames === 0) { cam.shakeX = 0; cam.shakeY = 0; cam.shakeMag = 0; }
  }
}

// =================================================================
// WEATHER  (rain/snow/storm; affects gameplay + visuals)
// =================================================================
const weather = {
  state: 'clear',   // 'clear' | 'rain' | 'snow' | 'storm'
  rain: false, cold: false, storm: false,
  timer: 0,          // ms until next change
  particles: []      // weather drops
};
function rollNextWeather() {
  const r = Math.random();
  if (r < 0.45) weather.state = 'clear';
  else if (r < 0.75) weather.state = 'rain';
  else if (r < 0.92) weather.state = 'snow';
  else weather.state = 'storm';
  weather.rain  = (weather.state === 'rain'  || weather.state === 'storm');
  weather.storm = (weather.state === 'storm');
  // Cold only applies in snow biome OR snow weather
  weather.timer = 45000 + Math.random() * 60000;
  if (weather.state === 'storm' || weather.state === 'snow') {
    floatText(weather.state.toUpperCase(), player ? player.x : 0, player ? player.y - 40 : 0,
              weather.state === 'storm' ? '#facc15' : '#e0f2fe');
  }
}
function updateWeather(dt) {
  weather.timer -= dt;
  if (weather.timer <= 0) rollNextWeather();

  // Snow biome cold check (only when player on snow tile)
  if (player) {
    const ptx = Math.floor(player.x / TILE), pty = Math.floor(player.y / TILE);
    const onSnowTile = (ptx >= 0 && pty >= 0 && ptx < WORLD_TILES && pty < WORLD_TILES
                       && world.tiles[pty][ptx] === T_SNOW);
    weather.cold = onSnowTile || weather.state === 'snow';
  }

  // Spawn weather particles
  if (weather.rain || weather.state === 'snow') {
    const count = weather.storm ? 6 : (weather.rain ? 3 : 2);
    for (let i = 0; i < count; i++) {
      weather.particles.push({
        x: cam.x + Math.random() * VIEW_W,
        y: cam.y - 20,
        vx: weather.storm ? -3 + Math.random() * 1.5 : (weather.rain ? -1 : -0.5),
        vy: weather.rain ? 9 + Math.random() * 3 : 2 + Math.random(),
        kind: weather.state === 'snow' ? 'snow' : 'rain',
        life: 80
      });
    }
  }
  // Update particles
  for (let i = weather.particles.length - 1; i >= 0; i--) {
    const p = weather.particles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0 || p.y > cam.y + VIEW_H + 20) weather.particles.splice(i, 1);
  }
  // Cap
  if (weather.particles.length > 250) weather.particles.splice(0, weather.particles.length - 250);
}
function drawWeather(ctx) {
  for (const p of weather.particles) {
    const sx = p.x - cam.x, sy = p.y - cam.y;
    if (p.kind === 'rain') {
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + p.vx * 1.2, sy + p.vy * 1.2);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Storm overlay tint
  if (weather.storm) {
    ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  } else if (weather.rain) {
    ctx.fillStyle = 'rgba(71, 85, 105, 0.15)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  } else if (weather.state === 'snow') {
    ctx.fillStyle = 'rgba(241, 245, 249, 0.10)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
// Is the player under shelter (near campfire or wall)? Used so rain doesn't refill.
function nearShelter(x, y) {
  for (const s of world.structures) {
    if (s.type === 'wall' && Math.abs(s.x - x) < TILE && Math.abs(s.y - y) < TILE) return true;
  }
  return false;
}

// =================================================================
// BOSS — Stone Titan (3 phases, spawns after surviving 3 days)
// =================================================================
let boss = null;
let bossWarned = false;
let bossDefeated = false;

class StoneTitan {
  constructor() {
    // Spawn near player but offset
    const angle = Math.random() * Math.PI * 2;
    this.x = clamp(player.x + Math.cos(angle) * 200, 60, WORLD_W - 60);
    this.y = clamp(player.y + Math.sin(angle) * 200, 60, WORLD_H - 60);
    this.vx = 0; this.vy = 0;
    this.r = 28;
    this.maxHp = 80;
    this.hp = this.maxHp;
    this.dmg = 14;
    this.attackCd = 0;
    this.actionTimer = 90;
    this.phase = 1;
    this.iframes = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.animFrame = 0;
    this.summonsLeft = 0;
  }
  get speedMul() {
    return this.phase === 3 ? 1.7 : (this.phase === 2 ? 1.3 : 1);
  }
  update() {
    if (this.dead) { this.deathTimer--; return; }
    this.animFrame++;
    this.iframes = Math.max(0, this.iframes - 1);
    this.attackCd = Math.max(0, this.attackCd - 1);
    this.actionTimer--;

    // Phase transitions
    const pct = this.hp / this.maxHp;
    if (pct < 0.33 && this.phase !== 3) {
      this.phase = 3;
      cameraShake(20, 30);
      burst(this.x, this.y, '#facc15', 30, 5);
      this.summonsLeft = 0;
    } else if (pct < 0.66 && this.phase < 2) {
      this.phase = 2;
      cameraShake(14, 22);
      burst(this.x, this.y, '#ef4444', 22, 4);
      this.summonsLeft = 2;
    }

    // Phase 2: summon zombies
    if (this.phase === 2 && this.summonsLeft > 0 && this.actionTimer % 90 === 0) {
      spawnEnemy('zombie');
      this.summonsLeft--;
    }

    // Chase player
    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const baseSpeed = 0.7 * this.speedMul;
    this.vx = (dx / d) * baseSpeed;
    this.vy = (dy / d) * baseSpeed;

    this.x += this.vx;
    if (isBlocked(this.x, this.y, this.r)) { this.x -= this.vx; this.vx = 0; }
    this.y += this.vy;
    if (isBlocked(this.x, this.y, this.r)) { this.y -= this.vy; this.vy = 0; }
    this.x = clamp(this.x, this.r, WORLD_W - this.r);
    this.y = clamp(this.y, this.r, WORLD_H - this.r);

    // Slam attack on contact
    if (d < this.r + player.r + 6 && this.attackCd === 0) {
      const isFire = this.phase === 3;
      player.takeDamage(this.dmg + (this.phase - 1) * 4, isFire ? 'boss_fire' : 'boss');
      this.attackCd = 60;
      cameraShake(8, 16);
      burst(player.x, player.y, '#ef4444', 18, 3);
    }
    // Phase 3: periodic AOE
    if (this.phase === 3 && this.actionTimer % 120 === 0) {
      // Shockwave: damage if close
      if (d < 80) {
        player.takeDamage(8);
      }
      // Visual ring
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        spawnParticle(this.x, this.y, Math.cos(a) * 5, Math.sin(a) * 5, '#facc15', 30, 4, 0);
      }
      cameraShake(10, 18);
    }
  }
  takeHit(dmg, fx, fy) {
    if (this.iframes > 0 || this.dead) return;
    this.hp -= dmg;
    this.iframes = 14;
    SFX.hit();
    burst(this.x, this.y, this.phase === 3 ? '#facc15' : '#fb923c', 12, 2.5);
    cameraShake(6, 10);
    this.x += fx * 3;
    this.y += fy * 3;
    if (this.hp <= 0) {
      this.dead = true;
      this.deathTimer = 90;
      // Massive explosion
      for (let i = 0; i < 8; i++) {
        setTimeout(() => burst(
          this.x + (Math.random() - 0.5) * 40,
          this.y + (Math.random() - 0.5) * 40,
          ['#facc15','#fb923c','#ef4444','#fff'][i % 4], 30, 6
        ), i * 110);
      }
      cameraShake(25, 40);
      SFX.death();
      // Drops
      inventory.add('crystal', 1 + Math.floor(Math.random() * 2));
      inventory.add('iron', 5 + Math.floor(Math.random() * 5));
      inventory.add('stone', 20);
      inventory.add('wood', 20);
      gainXp(200);
      bossDefeated = true;
      emit('boss_defeated');
      setTimeout(() => { boss = null; }, 1500);
    }
  }
  draw(ctx, cam) {
    if (this.dead && this.deathTimer <= 0) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    const flicker = this.iframes > 0 && (this.iframes % 6 < 3);
    if (flicker) return;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + this.r * 0.8, this.r * 1.1, this.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body — chunky stone
    const tint = this.phase === 3 ? '#facc15' : (this.phase === 2 ? '#ef4444' : '#475569');
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.arc(sx, sy + 6, this.r, 0, Math.PI * 2);
    ctx.fill();
    // Cracks
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(sx - 8, sy + 4, 6, 2);
    ctx.fillRect(sx + 2, sy + 8, 5, 2);
    ctx.fillRect(sx - 4, sy + 14, 4, 2);
    // Head
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.arc(sx, sy - 12, this.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    // Glowing eyes (red on phase, brighter higher phase)
    const eyeColor = this.phase === 3 ? '#fef08a' : '#ef4444';
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(sx - 8, sy - 14, 4, 4);
    ctx.fillRect(sx + 4, sy - 14, 4, 4);
    ctx.shadowBlur = 0;
    // Phase 3 aura
    if (this.phase === 3) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(sx, sy, this.r * 1.6 + Math.sin(this.animFrame * 0.2) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function tryBossSpawn() {
  if (boss || bossDefeated) return;
  const days = Math.floor(world.time / DAY_LENGTH_MS);
  if (days >= 3 && !bossWarned) {
    bossWarned = true;
    floatText('A BOSS APPROACHES!', player.x, player.y - 50, '#ef4444');
    setTimeout(() => {
      if (!boss && !bossDefeated && gameState === STATE_PLAYING) {
        boss = new StoneTitan();
        SFX.night();
      }
    }, 4000);
  }
}

// =================================================================
// GAME STATE / LOOP
// =================================================================
const STATE_MENU = 'menu', STATE_PLAYING = 'playing', STATE_PAUSED = 'paused',
      STATE_DEAD = 'dead';
let gameState = STATE_MENU;
let canvas, ctx, player;
let globalFrame = 0;
let lastTimestamp = 0;

function startGame() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!tryLoad()) {
    world = generateWorld();
    player = new Player();
    inventory.slots.fill(null);
    inventory.hotbar.fill(null);
    inventory.hotbarSelected = 0;
    enemies.length = 0;
    particles.length = 0;
    chests.length = 0;
    farmland.length = 0;
    DOOR.tx = -1; DOOR.ty = -1; DOOR.locked = true;
    dungeonGenerated = false; dungeonCleared = false; dungeonBoss = null;
    trader = null; traderSpawnDay = -1;
    generateDungeon();
    inventory.add('berry', 3);
    inventory.add('water', 2);
  }
  cam.x = player.x - VIEW_W / 2;
  cam.y = player.y - VIEW_H / 2;
  hideAllMenus();
  refreshInventoryUI();
  refreshCraftingUI();
  gameState = STATE_PLAYING;
}
window.survivalStart = startGame;

function newGame() {
  localStorage.removeItem('srvSave');
  world = generateWorld();
  player = new Player();
  inventory.slots.fill(null);
  inventory.hotbar.fill(null);
  inventory.hotbarSelected = 0;
  enemies.length = 0;
  particles.length = 0;
  floaters.length = 0;
  weather.particles.length = 0;
  weather.state = 'clear'; weather.rain = false; weather.storm = false; weather.timer = 60000;
  boss = null; bossWarned = false; bossDefeated = false;
  prog.xp = 0; prog.level = 1; prog.points = 0;
  for (const k of Object.keys(prog.skills)) prog.skills[k] = 0;
  for (const q of quests) { q.progress = 0; q.completed = false; }
  pet = null;
  projectiles.length = 0;
  lastDayCounter = 0;
  chests.length = 0;
  farmland.length = 0;
  DOOR.tx = -1; DOOR.ty = -1; DOOR.locked = true;
  dungeonGenerated = false; dungeonCleared = false; dungeonBoss = null;
  trader = null; traderSpawnDay = -1;
  turrets.length = 0;
  generateDungeon();
  inventory.add('berry', 3);
  inventory.add('water', 2);
  cam.x = player.x - VIEW_W / 2;
  cam.y = player.y - VIEW_H / 2;
  hideAllMenus();
  refreshInventoryUI();
  refreshCraftingUI();
  gameState = STATE_PLAYING;
}
window.survivalNewGame = newGame;

function togglePause() {
  if (gameState === STATE_PLAYING) {
    gameState = STATE_PAUSED;
    document.getElementById('srv-pause-modal').style.display = 'flex';
  } else if (gameState === STATE_PAUSED) {
    gameState = STATE_PLAYING;
    document.getElementById('srv-pause-modal').style.display = 'none';
  }
}
window.survivalPause = togglePause;

function gameOver() {
  gameState = STATE_DEAD;
  document.getElementById('srv-gameover-modal').style.display = 'flex';
  const days = Math.floor(world.time / DAY_LENGTH_MS) + 1;
  document.getElementById('srv-gameover-days').textContent = days;
  localStorage.removeItem('srvSave');
  // Update best
  const stats = JSON.parse(localStorage.getItem('srvStats') || '{}');
  if (days > (stats.bestDays || 0)) stats.bestDays = days;
  localStorage.setItem('srvStats', JSON.stringify(stats));
}

function hideAllMenus() {
  ['srv-menu', 'srv-pause-modal', 'srv-gameover-modal',
   'srv-inventory-modal', 'srv-crafting-modal', 'srv-skill-modal',
   'srv-quest-modal', 'srv-trade-modal', 'srv-ach-modal'].forEach(id => {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  });
}

function toggleInventory() {
  if (gameState !== STATE_PLAYING && gameState !== STATE_PAUSED) return;
  const m = document.getElementById('srv-inventory-modal');
  const open = m.style.display === 'flex';
  m.style.display = open ? 'none' : 'flex';
  if (!open) refreshInventoryUI();
}
window.survivalToggleInventory = toggleInventory;

function toggleCrafting() {
  if (gameState !== STATE_PLAYING && gameState !== STATE_PAUSED) return;
  const m = document.getElementById('srv-crafting-modal');
  const open = m.style.display === 'flex';
  m.style.display = open ? 'none' : 'flex';
  if (!open) refreshCraftingUI();
}
window.survivalToggleCrafting = toggleCrafting;

function toggleSkillTree() {
  if (gameState !== STATE_PLAYING && gameState !== STATE_PAUSED) return;
  const m = document.getElementById('srv-skill-modal');
  if (!m) return;
  const open = m.style.display === 'flex';
  m.style.display = open ? 'none' : 'flex';
  if (!open) refreshSkillTreeUI();
}
window.survivalToggleSkillTree = toggleSkillTree;

function toggleQuests() {
  if (gameState !== STATE_PLAYING && gameState !== STATE_PAUSED) return;
  const m = document.getElementById('srv-quest-modal');
  if (!m) return;
  const open = m.style.display === 'flex';
  m.style.display = open ? 'none' : 'flex';
  if (!open) refreshQuestUI();
}
window.survivalToggleQuests = toggleQuests;

function toggleAchievements() {
  const m = document.getElementById('srv-ach-modal');
  if (!m) return;
  const open = m.style.display === 'flex';
  m.style.display = open ? 'none' : 'flex';
  if (!open) refreshAchievementsUI();
}
window.survivalToggleAchievements = toggleAchievements;

function refreshAchievementsUI() {
  const list = document.getElementById('srv-ach-list');
  if (!list) return;
  list.innerHTML = '';
  const lang = window.srvAchLang || {};
  const unlocked = ACHIEVEMENTS.filter(a => achievements[a.id]).length;
  const totalEl = document.getElementById('srv-ach-progress');
  if (totalEl) totalEl.textContent = unlocked + ' / ' + ACHIEVEMENTS.length;
  for (const a of ACHIEVEMENTS) {
    const unlockedAch = !!achievements[a.id];
    const el = document.createElement('div');
    el.className = 'srv-ach' + (unlockedAch ? ' unlocked' : '');
    const name = lang[a.id + '_n'] || a.id;
    const desc = lang[a.id + '_d'] || '';
    el.innerHTML = `
      <span class="srv-ach-icon">${unlockedAch ? a.icon : '🔒'}</span>
      <div class="srv-ach-text">
        <div class="srv-ach-name">${name}</div>
        <div class="srv-ach-desc">${desc}</div>
      </div>`;
    list.appendChild(el);
  }
}
window.refreshAchievementsUI = refreshAchievementsUI;

function refreshQuestUI() {
  const list = document.getElementById('srv-quest-list');
  if (!list) return;
  list.innerHTML = '';
  const t = window.srvQuestLang || {};
  for (const q of quests) {
    const el = document.createElement('div');
    el.className = 'srv-quest' + (q.completed ? ' done' : '');
    const name = t[q.id + '_n'] || q.id;
    const desc = t[q.id + '_d'] || '';
    const rewardStr = (q.reward.xp ? `+${q.reward.xp} XP` : '') +
                      (q.reward.points ? ` +${q.reward.points} 🌟` : '');
    const pct = (q.progress / q.target) * 100;
    el.innerHTML = `
      <div class="srv-quest-head">
        <span class="srv-quest-name">${q.completed ? '✓ ' : ''}${name}</span>
        <span class="srv-quest-reward">${rewardStr}</span>
      </div>
      <div class="srv-quest-desc">${desc}</div>
      <div class="srv-quest-bar">
        <div class="srv-quest-bar-fill" style="width:${pct}%;"></div>
        <span class="srv-quest-prog">${q.progress} / ${q.target}</span>
      </div>`;
    list.appendChild(el);
  }
}

// Hotbar selection from key 1..6
function applyHotbarSelect() {
  if (hotbarSelect >= 0 && hotbarSelect < HOTBAR_SLOTS) {
    inventory.hotbarSelected = hotbarSelect;
    hotbarSelect = -1;
    refreshHotbarUI();
  }
}

let saveTimer = 0;
function update(dt) {
  if (gameState !== STATE_PLAYING) return;
  globalFrame++;
  applyHotbarSelect();
  updateDayNight(dt);
  updateWeather(dt);
  tryBossSpawn();
  player.update();
  updateEnemies();
  if (boss) boss.update();
  if (pet) {
    pet.update();
    if (pet.dead && pet.deathTimer <= 0) pet = null;
  }
  if (trader) trader.update();
  if (dungeonBoss) dungeonBoss.update();
  tryRespawnTrader();
  updateFarmland();
  for (let i = turrets.length - 1; i >= 0; i--) {
    turrets[i].update();
    if (turrets[i].dead && turrets[i].deathTimer <= 0) turrets.splice(i, 1);
  }
  updateProjectiles();
  updateParticles();
  updateFloaters();
  updateCamera(player);

  // Auto-save every 30s
  saveTimer += dt;
  if (saveTimer > 30000) { saveTimer = 0; saveGame(); }
}

function render() {
  if (gameState === STATE_MENU) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return;
  }
  ctx.save();
  ctx.translate(cam.shakeX, cam.shakeY);
  drawWorld(ctx, cam);
  drawObjects(ctx, cam);
  drawFarmland(ctx, cam);
  drawDoorAndChests(ctx, cam);
  // Entities sorted by y (top-down)
  const ents = [];
  for (const e of enemies) ents.push({ y: e.y, draw: () => e.draw(ctx, cam) });
  for (const t of turrets) ents.push({ y: t.y, draw: () => t.draw(ctx, cam) });
  if (boss) ents.push({ y: boss.y, draw: () => boss.draw(ctx, cam) });
  if (dungeonBoss) ents.push({ y: dungeonBoss.y, draw: () => dungeonBoss.draw(ctx, cam) });
  if (trader) ents.push({ y: trader.y, draw: () => trader.draw(ctx, cam) });
  if (pet) ents.push({ y: pet.y, draw: () => pet.draw(ctx, cam) });
  if (player) ents.push({ y: player.y, draw: () => player.draw(ctx, cam) });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) e.draw();
  drawProjectiles(ctx, cam);
  drawParticles(ctx, cam);
  drawFloaters(ctx);
  drawDayNightOverlay(ctx);
  drawWeather(ctx);
  ctx.restore();
  // UI overlays drawn in screen space
  if (boss && !boss.dead) drawBossHpBar();
}

function drawBossHpBar() {
  const barW = VIEW_W * 0.55;
  const barH = 16;
  const cx = VIEW_W / 2;
  const y = 12;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
  const name = 'STONE TITAN' + (boss.phase >= 2 ? ' · Phase ' + boss.phase : '');
  ctx.fillText(name, cx, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(cx - barW/2 - 2, y + 4, barW + 4, barH + 4);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(cx - barW/2, y + 6, barW, barH);
  const pct = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = boss.phase === 3 ? '#facc15' : (boss.phase === 2 ? '#fb923c' : '#ef4444');
  ctx.fillRect(cx - barW/2, y + 6, barW * pct, barH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px Segoe UI';
  ctx.fillText(boss.hp + ' / ' + boss.maxHp, cx, y + 18);
}

function loop(t) {
  requestAnimationFrame(loop);
  const dt = lastTimestamp ? Math.min(100, t - lastTimestamp) : 16;
  lastTimestamp = t;
  update(dt);
  render();
  updateHUD();
}

// =================================================================
// HUD UPDATES (DOM-based for HP/Hunger/Thirst/Stamina + clock)
// =================================================================
function updateHUD() {
  if (gameState !== STATE_PLAYING && gameState !== STATE_PAUSED) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.style.width = v + '%'; };
  set('srv-hp-fill',      (player.hp / MAX_HP) * 100);
  set('srv-hunger-fill',  (player.hunger / MAX_HUNGER) * 100);
  set('srv-thirst-fill',  (player.thirst / MAX_THIRST) * 100);
  set('srv-stamina-fill', (player.stamina / MAX_STAMINA) * 100);

  // Unit frame text: HP and portrait level
  const hpTxt = document.getElementById('srv-hp-text');
  if (hpTxt) hpTxt.textContent = Math.max(0, Math.round(player.hp)) + ' / ' + MAX_HP;
  const portLv = document.getElementById('srv-portrait-lv');
  if (portLv) portLv.textContent = prog.level;
  // Low-state hunger/thirst chips
  const hChip = document.getElementById('srv-hunger-chip');
  if (hChip) hChip.classList.toggle('low', player.hunger < 25);
  const tChip = document.getElementById('srv-thirst-chip');
  if (tChip) tChip.classList.toggle('low', player.thirst < 25);

  // Action button cooldown rings (0..100 = remaining %)
  const cdRing = (id, ratio) => {
    const el = document.getElementById(id);
    if (!el) return;
    const ring = el.querySelector('.srv-cd-ring');
    if (ring) ring.style.setProperty('--cd', Math.max(0, Math.min(100, ratio * 100)));
  };
  cdRing('srv-btn-attack', player.attackCdFrames / 26);
  cdRing('srv-btn-dodge',  player.dodgeCdFrames / DODGE_COOLDOWN);
  cdRing('srv-btn-use',    player.useCdFrames / 12);
  cdRing('srv-btn-block',  player.blockCdFrames / 60);

  // Glow attack button when an enemy is in range
  const atkBtn = document.getElementById('srv-btn-attack');
  if (atkBtn) {
    const tgt = findNearestEnemy(player.x, player.y, 60);
    atkBtn.classList.toggle('has-target', !!tgt);
  }

  // Auto-target button active state
  const autoBtn = document.getElementById('srv-btn-auto');
  if (autoBtn) autoBtn.classList.toggle('active', autoTarget);

  // Day/night indicator
  const isNight = timeOfDay() === 'night';
  const day = Math.floor(world.time / DAY_LENGTH_MS) + 1;
  document.getElementById('srv-day').textContent = day;
  document.getElementById('srv-time-icon').textContent = isNight ? '🌙' : '☀️';
  const dpPct = Math.floor(dayProgress() * 100);
  document.getElementById('srv-day-bar-fill').style.width = dpPct + '%';

  // Weather icon
  const wxIcon = document.getElementById('srv-weather-icon');
  if (wxIcon) {
    wxIcon.textContent = weather.state === 'rain'  ? '🌧️'
                       : weather.state === 'snow'  ? '❄️'
                       : weather.state === 'storm' ? '⛈️'
                       : '';
  }

  // Status effects icons
  const fx = document.getElementById('srv-status-fx');
  if (fx) {
    let html = '';
    if (player.effects.bleeding > 0) html += `<span class="srv-fx bleed" title="Bleeding">🩸</span>`;
    if (player.effects.burning > 0)  html += `<span class="srv-fx burn"  title="Burning">🔥</span>`;
    if (weather.cold && player.effects.burning === 0) html += `<span class="srv-fx cold" title="Cold">🥶</span>`;
    // Hunger states
    const hs = getHungerState();
    if (hs === 'well_fed') html += `<span class="srv-fx fed"   title="Well Fed">😋</span>`;
    if (hs === 'hungry')   html += `<span class="srv-fx hungry" title="Hungry">🍖</span>`;
    if (getThirstState() === 'thirsty') html += `<span class="srv-fx thirsty" title="Thirsty">💧</span>`;
    if (nearWorkbench())  html += `<span class="srv-fx wb"     title="Workbench Active">🪚</span>`;
    if (pet && !pet.dead) html += `<span class="srv-fx pet"    title="Pet alive">🐺</span>`;
    fx.innerHTML = html;
  }

  // Level + XP
  const lvEl = document.getElementById('srv-level');
  const xpFill = document.getElementById('srv-xp-fill');
  const ptEl = document.getElementById('srv-points-badge');
  if (lvEl) lvEl.textContent = prog.level;
  if (xpFill) xpFill.style.width = Math.floor((prog.xp / (XP_PER_LEVEL * prog.level)) * 100) + '%';
  if (ptEl) {
    ptEl.style.display = prog.points > 0 ? 'inline-block' : 'none';
    ptEl.textContent = prog.points;
  }
  // Side-menu skill button badge
  const sidePts = document.getElementById('srv-side-points');
  if (sidePts) {
    sidePts.style.display = prog.points > 0 ? 'flex' : 'none';
    sidePts.textContent = prog.points;
  }

  refreshHotbarUI();
  drawMinimap();
}

let hotbarBuilt = false;
function refreshHotbarUI() {
  const row = document.getElementById('srv-hotbar');
  if (!row) return;
  if (!hotbarBuilt) {
    row.innerHTML = '';
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'srv-hotbar-slot';
      slot.dataset.idx = i;
      slot.innerHTML = `<span class="srv-key">${i + 1}</span>
        <span class="srv-slot-icon"></span>
        <span class="srv-slot-count"></span>`;
      slot.addEventListener('click', () => {
        inventory.selectHotbar(i);
        refreshHotbarUI();
      });
      row.appendChild(slot);
    }
    hotbarBuilt = true;
  }
  for (let i = 0; i < HOTBAR_SLOTS; i++) {
    const el = row.children[i];
    if (!el) continue;
    el.classList.toggle('selected', i === inventory.hotbarSelected);
    const s = inventory.hotbar[i];
    el.querySelector('.srv-slot-icon').textContent = s ? ITEMS[s.id].icon : '';
    el.querySelector('.srv-slot-count').textContent = s && s.count > 1 ? s.count : '';
  }
}

function refreshInventoryUI() {
  const grid = document.getElementById('srv-inv-grid');
  if (!grid) return;
  grid.innerHTML = '';
  // First row: hotbar
  for (let i = 0; i < HOTBAR_SLOTS; i++) {
    const slot = inventory.hotbar[i];
    grid.appendChild(makeInvSlot('h', i, slot, true));
  }
  // Then inventory
  for (let i = 0; i < INV_SLOTS; i++) {
    const slot = inventory.slots[i];
    grid.appendChild(makeInvSlot('s', i, slot, false));
  }
}

let invSelection = null; // { where, idx }
function makeInvSlot(where, idx, slot, isHotbar) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'srv-inv-slot' + (isHotbar ? ' hotbar' : '');
  if (slot) {
    const item = ITEMS[slot.id];
    el.innerHTML = `<span class="srv-slot-icon">${item.icon}</span>
      ${slot.count > 1 ? `<span class="srv-slot-count">${slot.count}</span>` : ''}`;
    el.title = item.name;
  }
  if (invSelection && invSelection.where === where && invSelection.idx === idx) {
    el.classList.add('selected');
  }
  el.addEventListener('click', () => {
    if (!invSelection) {
      if (slot) invSelection = { where, idx };
    } else {
      // Swap source and target
      inventory.swap(invSelection.where, invSelection.idx, where, idx);
      invSelection = null;
    }
    refreshInventoryUI();
  });
  // Right click / long-press: use/drop
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    invSelection = null;
    refreshInventoryUI();
  });
  return el;
}

function refreshSkillTreeUI() {
  const list = document.getElementById('srv-skill-list');
  if (!list) return;
  // Header info
  const xpEl = document.getElementById('srv-skill-xp');
  const lvEl = document.getElementById('srv-skill-level');
  const ptEl = document.getElementById('srv-skill-points');
  if (xpEl) xpEl.textContent = prog.xp + ' / ' + (XP_PER_LEVEL * prog.level);
  if (lvEl) lvEl.textContent = prog.level;
  if (ptEl) ptEl.textContent = prog.points;
  list.innerHTML = '';
  for (const key of SKILL_ORDER) {
    const s = SKILLS[key];
    const rank = prog.skills[key];
    const maxed = rank >= s.max;
    const affordable = prog.points > 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'srv-skill' + (maxed ? ' maxed' : (affordable ? '' : ' disabled'));
    btn.disabled = maxed || !affordable;
    let dots = '';
    for (let i = 0; i < s.max; i++) dots += `<span class="srv-rank-dot ${i < rank ? 'on' : ''}"></span>`;
    btn.innerHTML = `
      <div class="srv-skill-head">
        <span class="srv-skill-icon">${s.icon}</span>
        <span class="srv-skill-name">${s.name}</span>
        <span class="srv-skill-rank">${dots}</span>
      </div>
      <div class="srv-skill-desc">${s.desc}</div>`;
    btn.addEventListener('click', () => applySkill(key));
    list.appendChild(btn);
  }
}

function refreshCraftingUI() {
  const list = document.getElementById('srv-craft-list');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < RECIPES.length; i++) {
    const r = RECIPES[i];
    const item = ITEMS[r.out];
    const can = canCraft(r);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'srv-recipe' + (can ? '' : ' disabled');
    el.disabled = !can;
    const reqText = Object.entries(r.req)
      .map(([id, n]) => {
        const have = inventory.count(id);
        const okCls = have >= n ? 'ok' : 'bad';
        return `<span class="srv-req ${okCls}">${ITEMS[id].icon} ${have}/${n}</span>`;
      }).join(' ');
    el.innerHTML = `
      <div class="srv-recipe-head">
        <span class="srv-recipe-icon">${item.icon}</span>
        <span class="srv-recipe-name">${item.name}${r.amt > 1 ? ' ×' + r.amt : ''}</span>
      </div>
      <div class="srv-recipe-req">${reqText}</div>`;
    el.addEventListener('click', () => tryCraft(i));
    list.appendChild(el);
  }
}

// =================================================================
// SAVE / LOAD
// =================================================================
function saveGame() {
  if (!player) return;
  try {
    const data = {
      player: {
        x: player.x, y: player.y,
        hp: player.hp, hunger: player.hunger,
        thirst: player.thirst, stamina: player.stamina,
        facing: player.facing, facingX: player.facingX, facingY: player.facingY
      },
      world: {
        time: world.time,
        deadObjects: world.objects.filter(o => !o.alive).map(o => o.id),
        structures: world.structures
      },
      inventory: {
        slots: inventory.slots,
        hotbar: inventory.hotbar,
        hotbarSelected: inventory.hotbarSelected
      },
      prog: prog,
      bossDefeated: bossDefeated,
      quests: quests.map(q => ({ id: q.id, progress: q.progress, completed: q.completed })),
      pet: pet ? { x: pet.x, y: pet.y, hp: pet.hp } : null,
      effects: player.effects,
      farmland: farmland,
      door: { tx: DOOR.tx, ty: DOOR.ty, x: DOOR.x, y: DOOR.y, locked: DOOR.locked },
      chests: chests.map(c => ({ tx: c.tx, ty: c.ty, x: c.x, y: c.y, opened: c.opened, loot: c.loot })),
      dungeonGenerated, dungeonCleared,
      dungeonBoss: dungeonBoss ? { hp: dungeonBoss.hp, x: dungeonBoss.x, y: dungeonBoss.y, spawned: dungeonBoss.spawned, dead: dungeonBoss.dead } : null,
      trader: trader ? { x: trader.x, y: trader.y } : null,
      traderSpawnDay,
      turrets: turrets.filter(t => !t.dead).map(t => ({ x: t.x, y: t.y, tx: t.tx, ty: t.ty, hp: t.hp, attackCd: t.attackCd }))
    };
    localStorage.setItem('srvSave', JSON.stringify(data));
  } catch (e) {}
}
function tryLoad() {
  try {
    const raw = localStorage.getItem('srvSave');
    if (!raw) return false;
    const data = JSON.parse(raw);
    world = generateWorld();
    world.time = data.world.time || 0;
    if (Array.isArray(data.world.deadObjects)) {
      for (const id of data.world.deadObjects) {
        if (world.objects[id]) world.objects[id].alive = false;
      }
    }
    if (Array.isArray(data.world.structures)) {
      world.structures = data.world.structures;
    }
    player = new Player();
    Object.assign(player, data.player);
    inventory.slots = data.inventory.slots || new Array(INV_SLOTS).fill(null);
    inventory.hotbar = data.inventory.hotbar || new Array(HOTBAR_SLOTS).fill(null);
    inventory.hotbarSelected = data.inventory.hotbarSelected || 0;
    if (data.prog) Object.assign(prog, data.prog);
    bossDefeated = !!data.bossDefeated;
    bossWarned = false;
    boss = null;
    // Restore quest progress
    if (Array.isArray(data.quests)) {
      for (const sq of data.quests) {
        const q = quests.find(qq => qq.id === sq.id);
        if (q) { q.progress = sq.progress; q.completed = sq.completed; }
      }
    }
    // Restore pet
    if (data.pet) { pet = new Pet(data.pet.x, data.pet.y); pet.hp = data.pet.hp; }
    else pet = null;
    // Restore status effects
    if (data.effects) Object.assign(player.effects, data.effects);
    projectiles.length = 0;
    enemies.length = 0;
    particles.length = 0;
    floaters.length = 0;
    weather.particles.length = 0;
    // V4 state
    farmland.length = 0;
    if (Array.isArray(data.farmland)) data.farmland.forEach(f => farmland.push(f));
    chests.length = 0;
    if (Array.isArray(data.chests)) data.chests.forEach(c => chests.push(c));
    if (data.door) Object.assign(DOOR, data.door);
    dungeonGenerated = !!data.dungeonGenerated;
    dungeonCleared = !!data.dungeonCleared;
    if (data.dungeonBoss && !data.dungeonBoss.dead) {
      dungeonBoss = new CrystalGolem();
      Object.assign(dungeonBoss, data.dungeonBoss);
    } else dungeonBoss = null;
    trader = data.trader ? new Trader(data.trader.x, data.trader.y) : null;
    traderSpawnDay = data.traderSpawnDay ?? -1;
    turrets.length = 0;
    if (Array.isArray(data.turrets)) {
      for (const t of data.turrets) {
        const tr = new Turret(t.x, t.y, t.tx, t.ty);
        tr.hp = t.hp; tr.attackCd = t.attackCd || 0;
        turrets.push(tr);
      }
    }
    // If save predates dungeon, generate now
    if (!dungeonGenerated) generateDungeon();
    return true;
  } catch (e) {
    console.warn('Load failed:', e);
    return false;
  }
}

// =================================================================
// CANVAS SCALING + TOUCH CONTROLS
// =================================================================
function resizeCanvas() {
  const ww = window.innerWidth, wh = window.innerHeight;
  const scale = Math.min(ww / VIEW_W, wh / VIEW_H);
  canvas.style.width  = (VIEW_W * scale) + 'px';
  canvas.style.height = (VIEW_H * scale) + 'px';
}
window.addEventListener('resize', () => { if (canvas) resizeCanvas(); });

function attachTouchControls() {
  const stickArea = document.getElementById('srv-stick-area');
  const stickBase = document.getElementById('srv-stick-base');
  const stickThumb = document.getElementById('srv-stick-thumb');
  function updateStickVis(active, cx, cy, dx, dy) {
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
    touchStick.active = true;
    touchStick.baseX = t.clientX; touchStick.baseY = t.clientY;
    touchStick.id = t.identifier;
    touchStick.dx = 0; touchStick.dy = 0; touchStick.sprint = false;
    updateStickVis(true, t.clientX, t.clientY, 0, 0);
    e.preventDefault();
  }, { passive: false });
  stickArea.addEventListener('touchmove', (e) => {
    if (!touchStick.active) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== touchStick.id) continue;
      let dx = t.clientX - touchStick.baseX, dy = t.clientY - touchStick.baseY;
      const len = Math.hypot(dx, dy);
      const max = 40;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      touchStick.dx = dx / max; touchStick.dy = dy / max;
      // Sprint when joystick is fully pushed
      touchStick.sprint = len > max * 0.9;
      updateStickVis(true, touchStick.baseX, touchStick.baseY, touchStick.dx, touchStick.dy);
      e.preventDefault();
    }
  }, { passive: false });
  const endStick = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchStick.id) {
        touchStick.active = false; touchStick.dx = 0; touchStick.dy = 0;
        touchStick.sprint = false;
        updateStickVis(false, 0, 0, 0, 0);
      }
    }
  };
  stickArea.addEventListener('touchend', endStick);
  stickArea.addEventListener('touchcancel', endStick);

  // Action buttons
  const bindBtn = (id, action) => {
    const el = document.getElementById(id);
    if (!el) return;
    const down = (e) => { action(); el.classList.add('pressed'); e.preventDefault(); };
    const up   = (e) => { el.classList.remove('pressed'); };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend',   up,   { passive: false });
    el.addEventListener('touchcancel',up);
    el.addEventListener('pointerdown',(e) => { if (e.pointerType !== 'touch') down(e); });
    el.addEventListener('pointerup',  up);
  };
  bindBtn('srv-btn-attack', () => { attackPressed = true; });
  bindBtn('srv-btn-use',    () => { usePressed = true; });
  bindBtn('srv-btn-dodge',  () => { dodgePressed = true; });

  // Block: hold = sustained block, tap = parry-block
  const blockBtn = document.getElementById('srv-btn-block');
  if (blockBtn) {
    const blockDown = (e) => { blockPressed = true; blockHeld = true; blockBtn.classList.add('pressed'); e && e.preventDefault && e.preventDefault(); };
    const blockUp   = ()  => { blockHeld = false; blockBtn.classList.remove('pressed'); };
    blockBtn.addEventListener('touchstart', blockDown, { passive: false });
    blockBtn.addEventListener('touchend',   blockUp,   { passive: false });
    blockBtn.addEventListener('touchcancel',blockUp);
    blockBtn.addEventListener('pointerdown',(e) => { if (e.pointerType !== 'touch') blockDown(e); });
    blockBtn.addEventListener('pointerup',  blockUp);
    blockBtn.addEventListener('pointerleave', blockUp);
  }

  // Auto-target toggle
  const autoBtn = document.getElementById('srv-btn-auto');
  if (autoBtn) {
    const toggleAuto = (e) => {
      e && e.preventDefault && e.preventDefault();
      autoTarget = !autoTarget;
      localStorage.setItem('srvAutoTarget', autoTarget ? '1' : '0');
      autoBtn.classList.toggle('active', autoTarget);
      if (player) floatText(autoTarget ? '🎯 AUTO ON' : '🎯 AUTO OFF', player.x, player.y - 28, '#facc15');
    };
    autoBtn.addEventListener('touchstart', toggleAuto, { passive: false });
    autoBtn.addEventListener('click', toggleAuto);
    autoBtn.classList.toggle('active', autoTarget);
  }
}

// =================================================================
// BOOT
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('srv-canvas');
  ctx = canvas.getContext('2d');
  canvas.width = VIEW_W; canvas.height = VIEW_H;
  resizeCanvas();
  ctx.imageSmoothingEnabled = false;

  // PC: left-click on canvas = attack, right-click = use
  canvas.addEventListener('mousedown', (e) => {
    if (gameState !== STATE_PLAYING) return;
    if (e.button === 0) attackPressed = true;
    else if (e.button === 2) { usePressed = true; e.preventDefault(); }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const muteBtn = document.getElementById('srv-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  const pauseBtn = document.getElementById('srv-pause-btn');
  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);

  document.getElementById('srv-start-btn').addEventListener('click', startGame);
  document.getElementById('srv-newgame-btn').addEventListener('click', newGame);
  document.getElementById('srv-resume-btn').addEventListener('click', togglePause);
  document.getElementById('srv-pause-new-btn').addEventListener('click', newGame);
  document.getElementById('srv-pause-save-btn').addEventListener('click', () => { saveGame(); togglePause(); });
  document.getElementById('srv-go-restart-btn').addEventListener('click', newGame);

  document.getElementById('srv-btn-inv').addEventListener('click', toggleInventory);
  document.getElementById('srv-btn-craft').addEventListener('click', toggleCrafting);
  const skillBtn = document.getElementById('srv-btn-skill');
  if (skillBtn) skillBtn.addEventListener('click', toggleSkillTree);
  const questBtn = document.getElementById('srv-btn-quest');
  if (questBtn) questBtn.addEventListener('click', toggleQuests);
  const questClose = document.getElementById('srv-quest-close');
  if (questClose) questClose.addEventListener('click', () => {
    document.getElementById('srv-quest-modal').style.display = 'none';
  });
  const tradeClose = document.getElementById('srv-trade-close');
  if (tradeClose) tradeClose.addEventListener('click', () => {
    document.getElementById('srv-trade-modal').style.display = 'none';
  });
  const achBtn = document.getElementById('srv-btn-ach');
  if (achBtn) achBtn.addEventListener('click', toggleAchievements);
  const achClose = document.getElementById('srv-ach-close');
  if (achClose) achClose.addEventListener('click', () => {
    document.getElementById('srv-ach-modal').style.display = 'none';
  });
  // Minimap setup
  minimapCanvas = document.getElementById('srv-minimap');
  if (minimapCanvas) minimapCtx = minimapCanvas.getContext('2d');
  // Q shortcut for quests
  window.addEventListener('keydown', (e) => {
    if (e.key === 'q' || e.key === 'Q') toggleQuests();
  });
  document.getElementById('srv-inv-close').addEventListener('click', () => {
    document.getElementById('srv-inventory-modal').style.display = 'none';
  });
  document.getElementById('srv-craft-close').addEventListener('click', () => {
    document.getElementById('srv-crafting-modal').style.display = 'none';
  });
  const skillClose = document.getElementById('srv-skill-close');
  if (skillClose) skillClose.addEventListener('click', () => {
    document.getElementById('srv-skill-modal').style.display = 'none';
  });
  // K shortcut for skill tree
  window.addEventListener('keydown', (e) => {
    if (e.key === 'k' || e.key === 'K') toggleSkillTree();
  });

  // Show "Continue" if save exists
  if (localStorage.getItem('srvSave')) {
    document.getElementById('srv-start-btn').textContent = '▶ Continue';
  }

  attachTouchControls();
  requestAnimationFrame(loop);

  // Save on unload
  window.addEventListener('beforeunload', () => { if (gameState === STATE_PLAYING) saveGame(); });
});
