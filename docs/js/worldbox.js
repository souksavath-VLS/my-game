// =================================================================
// GOD SANDBOX — WorldBox-style sim
// =================================================================
// Single file, vanilla JS + Canvas
// =================================================================

// =================================================================
// CONFIG
// =================================================================
const WORLD_W = 96;      // tiles wide
const WORLD_H = 64;      // tiles tall
const TILE_PX = 10;      // logical px per tile
const VIEW_W = WORLD_W * TILE_PX;   // 960
const VIEW_H = WORLD_H * TILE_PX;   // 640

// Tile types
const T_WATER = 0, T_SAND = 1, T_GRASS = 2, T_FOREST = 3,
      T_SNOW = 4, T_MOUNTAIN = 5, T_LAVA = 6, T_BURNT = 7;

const TILE_COLORS = {
  0: '#1d4ed8', 1: '#fbbf24', 2: '#22c55e', 3: '#15803d',
  4: '#e0f2fe', 5: '#71717a', 6: '#dc2626', 7: '#27272a'
};
const TILE_COLORS_DARK = {
  0: '#1e3a8a', 1: '#d97706', 2: '#16a34a', 3: '#14532d',
  4: '#cbd5e1', 5: '#52525b', 6: '#991b1b', 7: '#18181b'
};

// Races: 0 human, 1 elf, 2 dwarf, 3 orc, 4 sheep, 5 wolf, 6 bear
const RACE_HUMAN = 0, RACE_ELF = 1, RACE_DWARF = 2, RACE_ORC = 3;
const RACE_SHEEP = 4, RACE_WOLF = 5, RACE_BEAR = 6;
const MORTAL_RACES = 4;  // First 4 races can form kingdoms
const RACE_BODY = ['#ef4444', '#22c55e', '#a16207', '#7e22ce', '#f5f5f4', '#3f3f46', '#78350f'];
const RACE_HEAD = ['#fde68a', '#bef264', '#fed7aa', '#d8b4fe', '#fafaf9', '#52525b', '#92400e'];
const RACE_KEY  = ['human', 'elf', 'dwarf', 'orc', 'sheep', 'wolf', 'bear'];

// Civilization tech ages
const TECH_NAMES = ['stone', 'bronze', 'iron', 'medieval'];
const TECH_LABELS_EMOJI = ['🪨', '⚒️', '⚔️', '🏰'];
function techDmgMul(tech) { return [1.0, 1.2, 1.4, 1.6][tech] || 1.0; }
function techHpMul(tech)  { return [1.0, 1.1, 1.25, 1.5][tech] || 1.0; }

// V3: Character classes (skill specialization)
const CLASS_WARRIOR = 0, CLASS_ARCHER = 1, CLASS_MAGE = 2,
      CLASS_KNIGHT = 3, CLASS_HEALER = 4, CLASS_HERO = 5;
const CLASS_KEYS = ['warrior','archer','mage','knight','healer','hero'];
const CLASS_DEFS = [
  // [maxHp, dmg, atkRange, atkCd, color]
  { hp: 32, dmg: 6,  range: 9,   cd: 28, color: '#dc2626' },  // Warrior
  { hp: 22, dmg: 5,  range: 90,  cd: 60, color: '#16a34a' },  // Archer (ranged)
  { hp: 20, dmg: 9,  range: 75,  cd: 80, color: '#8b5cf6' },  // Mage (ranged)
  { hp: 50, dmg: 4,  range: 9,   cd: 35, color: '#64748b' },  // Knight (tank)
  { hp: 22, dmg: 2,  range: 60,  cd: 70, color: '#06b6d4' },  // Healer (heals allies)
  { hp: 120,dmg: 14, range: 18,  cd: 22, color: '#facc15' }   // Hero (epic)
];
// Class chance distribution for auto-generated populations
const CLASS_WEIGHTS = [
  { c: CLASS_WARRIOR, w: 5 },
  { c: CLASS_ARCHER,  w: 3 },
  { c: CLASS_KNIGHT,  w: 2 },
  { c: CLASS_MAGE,    w: 2 },
  { c: CLASS_HEALER,  w: 1 }
];
function rollClass() {
  const total = CLASS_WEIGHTS.reduce((s, w) => s + w.w, 0);
  let r = Math.random() * total;
  for (const e of CLASS_WEIGHTS) { r -= e.w; if (r <= 0) return e.c; }
  return CLASS_WARRIOR;
}

// V4: King traits — affect war/peace bias
const KING_TRAITS = {
  militaristic: { icon: '⚔️', warBias:  40, color: '#dc2626' },
  bloodlust:    { icon: '🩸', warBias:  60, color: '#b91c1c' },
  evil:         { icon: '😈', warBias:  30, color: '#7c2d12' },
  pacifist:     { icon: '🕊', warBias: -50, color: '#86efac' },
  diplomat:     { icon: '🤝', warBias: -30, color: '#06b6d4' },
  honest:       { icon: '💎', warBias: -20, color: '#22d3ee' }
};
const TRAIT_KEYS = Object.keys(KING_TRAITS);
function rollKingTraits() {
  // 1-2 traits, weighted slightly toward neutral / common ones
  const n = Math.random() < 0.4 ? 2 : 1;
  const out = [];
  while (out.length < n) {
    const t = TRAIT_KEYS[Math.floor(Math.random() * TRAIT_KEYS.length)];
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

// V4: World Laws (player-toggleable)
const worldLaws = {
  diplomacy: true,
  rebellions: true,
  autoWar: true
};

// =================================================================
// STATE
// =================================================================
let canvas, ctx;
let tiles = [];           // tiles[y][x] = { type, fire }
const units = [];         // active units
const kingdoms = new Map(); // id -> kingdom
const effects = [];       // visual effects
const eventLog = [];      // string lines
const buildings = [];     // V5: defensive structures (towers, town halls)
let year = 0;
let frameCount = 0;
let paused = false;
let speed = 1;             // 0, 1, 2, 4
let activeTool = 'lightning';
let brushSize = 2;
let nextKingdomId = 1;
let lastTouch = { x: -1, y: -1, active: false };

// V2: View zoom & pan
const MIN_ZOOM = 1, MAX_ZOOM = 5;
let zoom = 1;
let panX = 0, panY = 0;     // top-left of visible window in world coords
function constrainPan() {
  const viewW = VIEW_W / zoom;
  const viewH = VIEW_H / zoom;
  panX = clamp(panX, 0, Math.max(0, VIEW_W - viewW));
  panY = clamp(panY, 0, Math.max(0, VIEW_H - viewH));
}
function zoomAt(screenX, screenY, newZoom) {
  newZoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
  if (newZoom === zoom) return;
  // World point under the screen anchor
  const wx = panX + screenX / zoom;
  const wy = panY + screenY / zoom;
  zoom = newZoom;
  // Keep that world point under the same screen anchor
  panX = wx - screenX / zoom;
  panY = wy - screenY / zoom;
  constrainPan();
  refreshZoomUI();
}
function resetView() { zoom = 1; panX = 0; panY = 0; refreshZoomUI(); }
function refreshZoomUI() {
  const el = document.getElementById('wb-zoom-label');
  if (el) el.textContent = zoom.toFixed(1).replace('.0','') + 'x';
}

// V2: Divine mana (limits power spam)
const MAX_MANA = 200;
let mana = MAX_MANA;
let manaRegen = 0;  // accumulator

// V2: Day/night cycle
// Each "year" has 240 frames; 0..0.6 = day, 0.6..0.7 dusk, 0.7..0.95 night, 0.95..1 dawn
let dayPhase = 0;  // 0..1

// V2: Achievements (persistent across runs)
const ACH_DEFS = [
  { id: 'a_first_kingdom', icon: '🏰' },
  { id: 'a_pop_100',       icon: '👥' },
  { id: 'a_world_war',     icon: '⚔️' },
  { id: 'a_apocalypse',    icon: '☠️' },
  { id: 'a_500_years',     icon: '⏳' },
  { id: 'a_1000_years',    icon: '🌌' },
  { id: 'a_diversity',     icon: '🌈' },
  { id: 'a_city',          icon: '🏛️' },
  { id: 'a_iron_age',      icon: '⚔️' },
  { id: 'a_medieval',      icon: '👑' },
  { id: 'a_bear_hunt',     icon: '🐻' },
  { id: 'a_peacemaker',    icon: '🕊️' },
  { id: 'a_inferno',       icon: '🔥' },
  { id: 'a_meteor',        icon: '☄️' },
  { id: 'a_capture',       icon: '🏛⇨' }
];
let achievements = (() => {
  try { return JSON.parse(localStorage.getItem('wbAch') || '{}'); }
  catch { return {}; }
})();
function unlockAch(id) {
  if (achievements[id]) return;
  achievements[id] = true;
  localStorage.setItem('wbAch', JSON.stringify(achievements));
  const def = ACH_DEFS.find(a => a.id === id);
  const name = (window.wbLang && window.wbLang.achNames && window.wbLang.achNames[id]) || id;
  effects.push({ type: 'achievement', text: (def ? def.icon : '🏆') + ' ' + name, life: 180 });
  refreshAchUI();
}
function refreshAchUI() {
  const el = document.getElementById('wb-ach-count');
  if (el) el.textContent = Object.keys(achievements).length + ' / ' + ACH_DEFS.length;
  const prog = document.getElementById('wb-ach-progress');
  if (prog) prog.textContent = Object.keys(achievements).length + ' / ' + ACH_DEFS.length;
  const list = document.getElementById('wb-ach-list');
  if (list) {
    const names = (window.wbLang && window.wbLang.achNames) || {};
    const descs = (window.wbLang && window.wbLang.achDescs) || {};
    list.innerHTML = ACH_DEFS.map(a => {
      const unlocked = !!achievements[a.id];
      const name = names[a.id] || a.id;
      const desc = descs[a.id] || '';
      return '<div class="wb-ach-item' + (unlocked ? ' unlocked' : '') + '">' +
        '<span class="wb-ach-icon">' + (unlocked ? a.icon : '🔒') + '</span>' +
        '<div class="wb-ach-text">' +
          '<div class="wb-ach-name">' + name + '</div>' +
          '<div class="wb-ach-desc">' + desc + '</div>' +
        '</div></div>';
    }).join('');
  }
}
function toggleAchModal() {
  const m = document.getElementById('wb-ach-modal');
  if (!m) return;
  const open = m.style.display === 'flex';
  m.style.display = open ? 'none' : 'flex';
  if (!open) refreshAchUI();
}
window.wbRefreshAchUI = refreshAchUI;

// =================================================================
// UTIL
// =================================================================
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist2(x1, y1, x2, y2) { const dx = x2-x1, dy = y2-y1; return dx*dx + dy*dy; }
function key(x, y) { return y * WORLD_W + x; }

// =================================================================
// WORLD GENERATION (smoothed noise → biomes)
// =================================================================
function generateWorld() {
  // Two layered noise maps: elevation + moisture
  const elev = noise2D(4);
  const moist = noise2D(3);
  const newTiles = [];
  for (let y = 0; y < WORLD_H; y++) {
    const row = [];
    for (let x = 0; x < WORLD_W; x++) {
      const e = elev[y][x];
      const m = moist[y][x];
      let type;
      if (e < 0.32) type = T_WATER;
      else if (e < 0.36) type = T_SAND;
      else if (e > 0.78) type = m > 0.5 ? T_SNOW : T_MOUNTAIN;
      else if (m > 0.62) type = T_FOREST;
      else if (m < 0.30) type = T_SAND;
      else type = T_GRASS;
      row.push({ type, fire: 0 });
    }
    newTiles.push(row);
  }
  // Add a few volcanoes
  for (let i = 0; i < 2; i++) {
    const cx = randInt(10, WORLD_W - 10);
    const cy = randInt(8, WORLD_H - 8);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (dx*dx + dy*dy <= 5) {
        const t = newTiles[cy + dy] && newTiles[cy + dy][cx + dx];
        if (t) { t.type = T_LAVA; t.fire = 0; }
      }
    }
  }
  tiles = newTiles;
}

function noise2D(passes) {
  let m = [];
  for (let y = 0; y < WORLD_H; y++) {
    const row = [];
    for (let x = 0; x < WORLD_W; x++) row.push(Math.random());
    m.push(row);
  }
  for (let i = 0; i < passes; i++) {
    const m2 = [];
    for (let y = 0; y < WORLD_H; y++) {
      const row = [];
      for (let x = 0; x < WORLD_W; x++) {
        let s = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy, nx = x + dx;
          if (nx >= 0 && nx < WORLD_W && ny >= 0 && ny < WORLD_H) { s += m[ny][nx]; c++; }
        }
        row.push(s / c);
      }
      m2.push(row);
    }
    m = m2;
  }
  // Stretch contrast
  let mn = 1, mx = 0;
  for (const row of m) for (const v of row) { if (v < mn) mn = v; if (v > mx) mx = v; }
  const rng = mx - mn || 1;
  for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) {
    m[y][x] = (m[y][x] - mn) / rng;
  }
  return m;
}

// =================================================================
// UNIT
// =================================================================
class Unit {
  constructor(x, y, race, charClass) {
    this.x = x; this.y = y;
    this.race = race;
    this.class = (race < MORTAL_RACES)
      ? (charClass != null ? charClass : rollClass())
      : -1;  // animals have no class
    // Wildlife has different stats
    if (race === RACE_SHEEP) { this.maxHp = 10; this.dmg = 0; this.range = 6; this.atkCdMax = 60; }
    else if (race === RACE_WOLF)  { this.maxHp = 22; this.dmg = 5; this.range = 9; this.atkCdMax = 25; }
    else if (race === RACE_BEAR)  { this.maxHp = 70; this.dmg = 11; this.range = 10; this.atkCdMax = 50; }
    else {
      const def = CLASS_DEFS[this.class];
      this.maxHp = def.hp;
      this.dmg = def.dmg;
      this.range = def.range;
      this.atkCdMax = def.cd;
    }
    this.hp = this.maxHp;
    this.age = 0;
    this.maxAge = race >= MORTAL_RACES ? (40 + Math.random() * 40)
                : this.class === CLASS_HERO ? (200 + Math.random() * 100)
                : (80 + Math.random() * 80);
    this.vx = 0; this.vy = 0;
    this.kingdom = null;
    this.target = null;
    this.state = 'wander';
    this.sex = Math.random() < 0.5 ? 'M' : 'F';
    this.matingCd = 200 + Math.random() * 200;
    this.attackCd = 0;
    this.wanderTimer = 0;
    this.plague = 0;
    this.dead = false;
    // V3 additions
    this.isKing = false;
    this.downed = 0;       // unconscious counter (frames left)
    this.facing = 1;       // 1 right, -1 left (for sprite flip)
    this.animFrame = Math.floor(Math.random() * 60);
  }
  isAnimal() { return this.race >= MORTAL_RACES; }
  isHostileAnimal() { return this.race === RACE_WOLF || this.race === RACE_BEAR; }
  isRanged() { return this.class === CLASS_ARCHER || this.class === CLASS_MAGE; }
  isHero()   { return this.class === CLASS_HERO; }

  update() {
    this.animFrame++;
    // Downed (unconscious) state — recovers after ~250 frames to 30% HP
    if (this.downed > 0) {
      this.downed--;
      this.vx *= 0.5; this.vy *= 0.5;
      if (this.downed === 0) {
        this.hp = Math.max(1, Math.floor(this.maxHp * 0.30));
      }
      return;
    }
    // Aging
    this.age += 0.008;
    if (this.age >= this.maxAge) { this.die('age'); return; }
    if (this.plague > 0) {
      this.plague--;
      if (this.plague % 30 === 0) this.hp -= 2;
      if (this.hp <= 0) { this.die('plague'); return; }
    }

    // Tile interaction
    const tx = clamp(Math.floor(this.x / TILE_PX), 0, WORLD_W - 1);
    const ty = clamp(Math.floor(this.y / TILE_PX), 0, WORLD_H - 1);
    const t = tiles[ty][tx];

    if (t.type === T_LAVA)   { this.hp -= 4; }
    if (t.fire > 0)          { this.hp -= 0.8; }
    if (t.type === T_BURNT)  { this.hp -= 0.2; }
    // Snow & dwarves like cold; elves like forest; orcs like grass; humans love grass
    let speedMul = 1;
    if (t.type === T_WATER)    { this.vx = -this.vx * 0.8; this.vy = -this.vy * 0.8; }
    if (t.type === T_MOUNTAIN) { this.vx = -this.vx * 0.6; this.vy = -this.vy * 0.6; }
    if (this.race === RACE_DWARF && t.type === T_MOUNTAIN) speedMul = 0;  // no penalty
    if (this.race === RACE_DWARF && t.type === T_SNOW)     this.hp += 0.05;
    if (this.race === RACE_ELF   && t.type === T_FOREST)   this.hp += 0.08;
    if (this.race === RACE_HUMAN && t.type === T_GRASS)    this.hp += 0.06;
    if (this.race === RACE_ORC   && t.type === T_LAVA)     this.hp += 0.05;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    if (this.hp <= 0) { this.die('tile'); return; }

    // Cooldowns
    if (this.attackCd > 0) this.attackCd--;
    if (this.matingCd > 0) this.matingCd--;

    // Decide action: find nearest enemy or mate
    let nearestEnemy = null, eDist = 80 * 80;
    let nearestMate = null,  mDist = 65 * 65;  // wider range (was 50)
    const isNight = dayPhase > 0.7 && dayPhase < 0.95;
    const isChild = this.age < 10 && this.race < MORTAL_RACES;
    const huntRange = (this.race === RACE_WOLF && isNight) ? 120*120 :
                      (this.race === RACE_BEAR) ? 100*100 :
                      (this.isHostileAnimal()) ? 70*70 :
                      isChild ? 50*50 : 80*80;
    eDist = huntRange;
    // Scan a subset for perf (every 4th frame)
    const startIdx = frameCount % 4;
    for (let i = startIdx; i < units.length; i += 4) {
      const u = units[i];
      if (u === this || u.dead) continue;
      const d = dist2(this.x, this.y, u.x, u.y);

      // Sheep: never attack, only flee from wolves/bears
      if (this.race === RACE_SHEEP) {
        if ((u.race === RACE_WOLF || u.race === RACE_BEAR) && d < 50 * 50) {
          if (d < eDist) { eDist = d; nearestEnemy = u; }  // "enemy" = predator (will flee)
        }
        // Sheep mate with sheep
        else if (u.race === RACE_SHEEP && u.sex !== this.sex && u.matingCd === 0 && this.matingCd === 0) {
          if (d < mDist) { mDist = d; nearestMate = u; }
        }
        continue;
      }
      // Wolves hunt: prefer lone units (no kingdom), or any animal except other wolves
      if (this.race === RACE_WOLF) {
        if (u.race === RACE_WOLF) {
          if (u.sex !== this.sex && u.matingCd === 0 && this.matingCd === 0 && d < mDist) {
            mDist = d; nearestMate = u;
          }
        } else if (u.race === RACE_SHEEP || (!u.kingdom && u.race < MORTAL_RACES) || (isNight && u.race < MORTAL_RACES)) {
          if (d < eDist) { eDist = d; nearestEnemy = u; }
        }
        continue;
      }
      // Bears hunt anything
      if (this.race === RACE_BEAR) {
        if (u.race === RACE_BEAR) {
          if (u.sex !== this.sex && u.matingCd === 0 && this.matingCd === 0 && d < mDist) {
            mDist = d; nearestMate = u;
          }
        } else if (d < eDist) { eDist = d; nearestEnemy = u; }
        continue;
      }
      // Mortals (humans/elves/dwarves/orcs)
      if (u.race !== this.race) {
        // Animals as enemies
        if (u.isHostileAnimal() && d < eDist) {
          eDist = d; nearestEnemy = u;
        } else if (u.race < MORTAL_RACES) {
          if (d < eDist) {
            // Don't attack allies
            if (this.kingdom && u.kingdom) {
              const myK = kingdoms.get(this.kingdom);
              if (myK && myK.allies.has(u.kingdom)) continue;
            }
            if (!this.kingdom || !u.kingdom || isAtWar(this.kingdom, u.kingdom)) {
              eDist = d; nearestEnemy = u;
            } else if (d < 25 * 25) {
              eDist = d; nearestEnemy = u;
            }
          }
        }
        // Hunt sheep for food
        else if (u.race === RACE_SHEEP && d < eDist * 0.6) {
          eDist = d; nearestEnemy = u;
        }
      } else if (
        u.race === this.race &&
        u.sex !== this.sex &&
        u.matingCd === 0 && this.matingCd === 0 &&
        this.age > 10 && u.age > 10 &&
        this.age < this.maxAge * 0.85 && u.age < u.maxAge * 0.85
      ) {
        if (d < mDist) { mDist = d; nearestMate = u; }
      }
    }

    // Sheep + children flee from predators instead of attacking
    if ((this.race === RACE_SHEEP || isChild) && nearestEnemy) {
      this.state = 'flee';
      this.target = nearestEnemy;
    } else if (nearestEnemy) {
      this.state = 'attack';
      this.target = nearestEnemy;
    } else if (nearestMate && units.length < 1200) {
      this.state = 'mate';
      this.target = nearestMate;
    } else {
      this.state = 'wander';
      this.target = null;
    }

    // V5: When at war, target hostile buildings (priority over chasing units)
    if (this.race < MORTAL_RACES && this.kingdom && !isChild) {
      const myK = kingdoms.get(this.kingdom);
      if (myK && myK.wars.size > 0) {
        let bestBld = null, bd = 110 * 110;  // detection range
        for (const b of buildings) {
          if (b.dead || b.kingdom === this.kingdom) continue;
          if (!myK.wars.has(b.kingdom)) continue;
          // Prefer towers slightly (priority targets)
          const dd = dist2(this.x, this.y, b.x, b.y) * (b.type === B_TOWER ? 0.7 : 1.0);
          if (dd < bd) { bd = dd; bestBld = b; }
        }
        if (bestBld) {
          // Override target — move toward and attack the building
          this.target = bestBld;
          this.state = 'siege';
          const dx = bestBld.x - this.x, dy = bestBld.y - this.y;
          const d = Math.sqrt(dx*dx + dy*dy) || 1;
          if (Math.abs(dx) > 0.2) this.facing = dx > 0 ? 1 : -1;
          const sp = 0.55;
          this.vx = (dx / d) * sp;
          this.vy = (dy / d) * sp;
          if (d < 14 && this.attackCd === 0) {
            const dmg = Math.round((this.dmg + Math.floor(Math.random() * 3)) * techDmgMul(myK.tech || 0));
            bestBld.takeDamage(dmg, this.kingdom);
            this.attackCd = this.atkCdMax;
            effects.push({ type: 'hit', x: bestBld.x + rand(-4, 4), y: bestBld.y + rand(-4, 4), life: 10 });
          }
          this.x += this.vx; this.y += this.vy;
          if (this.x < 1) { this.x = 1; this.vx *= -1; }
          if (this.y < 1) { this.y = 1; this.vy *= -1; }
          if (this.x > VIEW_W - 1) { this.x = VIEW_W - 1; this.vx *= -1; }
          if (this.y > VIEW_H - 1) { this.y = VIEW_H - 1; this.vy *= -1; }
          return;  // skip normal AI this frame
        }
      }
    }

    // Healer: find a wounded ally instead of an enemy if no enemy nearby
    if (this.class === CLASS_HEALER && !nearestEnemy && this.attackCd === 0) {
      for (let i = frameCount % 4; i < units.length; i += 4) {
        const u = units[i];
        if (u === this || u.dead || u.downed > 0) continue;
        if (u.race !== this.race || u.hp >= u.maxHp * 0.7) continue;
        const d = dist2(this.x, this.y, u.x, u.y);
        if (d < 60 * 60) { this.target = u; this.state = 'heal'; break; }
      }
    }

    // Movement / action
    if (this.target && !this.target.dead) {
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 1;
      // Update facing
      if (Math.abs(dx) > 0.2) this.facing = dx > 0 ? 1 : -1;
      let sp;
      if (this.state === 'flee') {
        sp = 0.65;
        this.vx = -(dx / d) * sp;
        this.vy = -(dy / d) * sp;
      } else if (this.state === 'attack' && this.isRanged() && d < this.range) {
        // Ranged: stop and shoot
        sp = 0;
        this.vx *= 0.5; this.vy *= 0.5;
      } else {
        sp = this.state === 'attack'
          ? (this.race === RACE_WOLF ? 0.7 : this.race === RACE_BEAR ? 0.45 : (this.isHero() ? 0.7 : 0.55))
          : 0.42;
        this.vx = (dx / d) * sp;
        this.vy = (dy / d) * sp;
      }

      // Attack (melee or ranged)
      if (this.state === 'attack' && this.attackCd === 0 && d < this.range) {
        let baseDmg = this.dmg + Math.floor(Math.random() * 3);
        if (this.kingdom) {
          const k = kingdoms.get(this.kingdom);
          if (k) baseDmg *= techDmgMul(k.tech || 0);
        }
        const dmg = Math.round(baseDmg);
        if (this.isRanged()) {
          // Spawn projectile (effect)
          const isMagic = this.class === CLASS_MAGE;
          effects.push({
            type: isMagic ? 'magic' : 'arrow',
            x: this.x, y: this.y - 2,
            tx: this.target.x, ty: this.target.y,
            target: this.target, dmg,
            shooter: this,
            life: 40
          });
          this.attackCd = this.atkCdMax;
        } else {
          this.target.hp -= dmg;
          this.attackCd = this.atkCdMax;
          effects.push({ type: 'hit', x: this.target.x, y: this.target.y, life: 10 });
          this.checkKill(this.target);
        }
      }
      // Heal action (healer)
      else if (this.state === 'heal' && d < 60 && this.attackCd === 0) {
        const amt = 6;
        this.target.hp = Math.min(this.target.maxHp, this.target.hp + amt);
        this.attackCd = this.atkCdMax;
        effects.push({ type: 'healspark', x: this.target.x, y: this.target.y - 4, life: 18 });
      }
      // Mate
      else if (this.state === 'mate' && d < 9 && this.matingCd === 0 && units.length < 1200) {
        // Baby inherits kingdom + race; randomize sex 50/50
        const baby = new Unit(this.x + rand(-3, 3), this.y + rand(-3, 3), this.race);
        baby.matingCd = 800;
        baby.kingdom = this.kingdom || this.target.kingdom;
        baby.age = 0;
        units.push(baby);
        // Pacifist / Diplomat kings boost their kingdom's birth rate
        let cd = 900;
        const myK = this.kingdom && kingdoms.get(this.kingdom);
        if (myK) {
          if (myK.kingTraits.includes('pacifist')) cd = Math.floor(cd * 0.65);
          else if (myK.kingTraits.includes('diplomat')) cd = Math.floor(cd * 0.80);
          else if (myK.kingTraits.includes('honest')) cd = Math.floor(cd * 0.85);
          else if (myK.kingTraits.includes('evil')) cd = Math.floor(cd * 1.25);
        }
        this.matingCd = cd;
        this.target.matingCd = cd;
        // Big celebratory burst — multiple hearts + halo
        for (let h = 0; h < 4; h++) {
          effects.push({
            type: 'heart',
            x: this.x + rand(-3, 3),
            y: this.y - 4 + rand(-2, 2),
            life: 28 + h * 4
          });
        }
        effects.push({ type: 'matehalo', x: (this.x + this.target.x) / 2, y: (this.y + this.target.y) / 2, life: 30 });
      }
    } else {
      // wander
      if (this.wanderTimer <= 0) {
        const a = Math.random() * Math.PI * 2;
        this.vx = Math.cos(a) * 0.28;
        this.vy = Math.sin(a) * 0.28;
        this.wanderTimer = 60 + Math.random() * 80;
      }
      this.wanderTimer--;
    }

    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 1) { this.x = 1; this.vx *= -1; }
    if (this.y < 1) { this.y = 1; this.vy *= -1; }
    if (this.x > VIEW_W - 1) { this.x = VIEW_W - 1; this.vx *= -1; }
    if (this.y > VIEW_H - 1) { this.y = VIEW_H - 1; this.vy *= -1; }
  }

  // Called by attackers when they deal a killing blow — decides downed vs dead
  checkKill(target) {
    if (target.hp > 0 || target.dead) return;
    // Combat deaths → downed (heroes, kings less likely to die)
    if (target.race < MORTAL_RACES) {
      // Heroes and kings have higher survival
      let survive = 0.55;
      if (target.isHero()) survive = 0.85;
      if (target.isKing)   survive = 0.75;
      if (Math.random() < survive) {
        target.downed = 250 + Math.floor(Math.random() * 100);
        target.hp = 1;
        effects.push({ type: 'downed', x: target.x, y: target.y - 4, life: 22 });
        return;
      }
    }
    // Achievement: bear hunt
    if (target.race === RACE_BEAR && this.race < MORTAL_RACES) unlockAch('a_bear_hunt');
    target.die('combat');
  }

  die(reason) {
    if (this.dead) return;
    this.dead = true;
    effects.push({ type: 'die', x: this.x, y: this.y, life: 18 });
    if (this.kingdom) {
      const k = kingdoms.get(this.kingdom);
      if (k) {
        k.pop = Math.max(0, k.pop - 1);
        if (reason === 'combat') k.warLosses += 1;
        if (this.isKing) {
          k.needsNewKing = true;
          log('👑✖ ' + (k.name || 'A kingdom') + ' — ' + (window.wbLang && window.wbLang.evtKingDied || 'the king has fallen'));
        }
      }
    }
  }

  draw(c) {
    const x = this.x, y = this.y, f = this.facing;
    // ANIMALS
    if (this.race === RACE_SHEEP) {
      const bob = Math.sin(this.animFrame * 0.05) * 0.5;
      // Body fluff (3 dots cluster)
      c.fillStyle = '#f5f5f4';
      c.beginPath();
      c.arc(x - 1, y + bob, 2.4, 0, Math.PI * 2);
      c.arc(x + 1, y - 1 + bob, 2.2, 0, Math.PI * 2);
      c.arc(x + 3 * f, y + bob, 2, 0, Math.PI * 2);
      c.fill();
      // Head
      c.fillStyle = '#1f1d1b';
      c.fillRect(x + 3 * f - 1, y - 2 + bob, 2.5, 2.5);
      // Eye
      c.fillStyle = '#fff';
      c.fillRect(x + 3 * f + 0.2 * f, y - 1.5 + bob, 0.6, 0.6);
      return;
    }
    if (this.race === RACE_WOLF) {
      const trot = Math.sin(this.animFrame * 0.2) * 0.6;
      // Body
      c.fillStyle = '#3f3f46';
      c.fillRect(x - 4, y - 2 + trot * 0.3, 7, 4);
      // Tail
      c.fillStyle = '#52525b';
      c.fillRect(x - 5 * f - (f > 0 ? 1 : 0), y - 2, 2, 2);
      // Legs
      c.fillStyle = '#27272a';
      c.fillRect(x - 3, y + 2, 1.5, 2 + trot);
      c.fillRect(x + 1, y + 2, 1.5, 2 - trot);
      // Head
      c.fillStyle = '#52525b';
      c.fillRect(x + 2 * f, y - 3, 2.5, 2.5);
      // Snout
      c.fillStyle = '#3f3f46';
      c.fillRect(x + 4 * f, y - 2, 1, 1);
      // Eyes
      const eyeColor = (dayPhase > 0.7 && dayPhase < 0.95) ? '#facc15' : '#fef3c7';
      c.fillStyle = eyeColor;
      c.fillRect(x + 3 * f, y - 2.5, 0.6, 0.6);
      return;
    }
    if (this.race === RACE_BEAR) {
      const stomp = Math.sin(this.animFrame * 0.13) * 0.5;
      // Body
      c.fillStyle = '#78350f';
      c.fillRect(x - 5, y - 3, 9, 6);
      // Belly
      c.fillStyle = '#92400e';
      c.fillRect(x - 3, y - 1, 6, 3);
      // Head
      c.fillStyle = '#78350f';
      c.beginPath();
      c.arc(x + 3 * f, y - 3, 2.5, 0, Math.PI * 2);
      c.fill();
      // Ears
      c.fillStyle = '#451a03';
      c.fillRect(x + 2 * f, y - 5, 1.5, 1.5);
      c.fillRect(x + 4 * f, y - 5, 1.5, 1.5);
      // Snout
      c.fillStyle = '#fed7aa';
      c.fillRect(x + 4 * f, y - 3, 1.5, 1.5);
      // Legs
      c.fillStyle = '#451a03';
      c.fillRect(x - 4, y + 3, 2, 2 + stomp);
      c.fillRect(x + 2, y + 3, 2, 2 - stomp);
      return;
    }

    // MORTAL: detailed sprite
    const walking = (Math.abs(this.vx) + Math.abs(this.vy)) > 0.05;
    const step = walking ? Math.sin(this.animFrame * 0.35) : 0;
    const isChild = this.age < 10;
    const isFemale = this.sex === 'F';
    // Sex-specific colors
    const hairColor = isFemale
      ? (this.race === RACE_HUMAN ? '#fbbf24'
        : this.race === RACE_ELF ? '#fbcfe8'
        : this.race === RACE_DWARF ? '#fb923c'
        : '#d8b4fe')
      : '#1e293b';
    const lipColor = isFemale ? '#ec4899' : null;
    // Child scale (smaller proportional sprite)
    const sc = isChild ? 0.6 : 1.0;

    // Cape (Hero) — drawn behind body
    if (this.isHero() && !isChild) {
      c.fillStyle = '#facc15';
      c.fillRect(x - 3 * f, y - 3, 3, 6);
      c.fillStyle = '#ca8a04';
      c.fillRect(x - 3 * f, y - 2, 1, 5);
    }

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.30)';
    c.beginPath();
    c.ellipse(x, y + 4 * sc, 3.4 * sc, 1.2 * sc, 0, 0, Math.PI * 2);
    c.fill();

    // Downed state — lie flat
    if (this.downed > 0) {
      c.fillStyle = RACE_BODY[this.race];
      c.fillRect(x - 3, y, 6, 2);
      c.fillStyle = RACE_HEAD[this.race];
      c.fillRect(x + 3, y, 2, 2);
      // ZZZ
      c.fillStyle = '#fde68a';
      c.font = '6px sans-serif';
      c.fillText('z', x - 4, y - 2 + Math.sin(this.animFrame * 0.2));
      return;
    }

    // Legs (animated)
    const legColor = '#1e293b';
    c.fillStyle = legColor;
    c.fillRect(x - 1.5 * sc, y + 2 * sc, 1.4 * sc, (2 + step) * sc);
    c.fillRect(x + 0.1 * sc, y + 2 * sc, 1.4 * sc, (2 - step) * sc);

    // Body — narrower for females
    const bodyColor = (this.class >= 0 && this.class < CLASS_DEFS.length && !isChild)
      ? CLASS_DEFS[this.class].color
      : RACE_BODY[this.race];
    c.fillStyle = bodyColor;
    if (isFemale && !isChild) {
      // Slightly tapered body (dress/tunic shape)
      c.fillRect(x - 1.7, y - 2, 3.4, 3);
      c.fillStyle = bodyColor;
      // Hem flare
      c.beginPath();
      c.moveTo(x - 1.9, y + 1);
      c.lineTo(x + 1.9, y + 1);
      c.lineTo(x + 2.3, y + 2);
      c.lineTo(x - 2.3, y + 2);
      c.closePath();
      c.fill();
    } else {
      c.fillRect(x - 2 * sc, y - 2 * sc, 4 * sc, 4 * sc);
    }
    // Belt
    if (!isChild) {
      c.fillStyle = '#1f2937';
      c.fillRect(x - 2, y + 1, 4, 0.8);
    }

    // Head (skin)
    c.fillStyle = RACE_HEAD[this.race];
    c.fillRect(x - 1.5 * sc, y - 5 * sc, 3 * sc, 3 * sc);

    // Hair — sex-distinct styles
    c.fillStyle = hairColor;
    if (isFemale) {
      // Top hair
      c.fillRect(x - 1.7, y - 5.6, 3.4, 1.4);
      // Long hair flowing down behind shoulders
      c.fillRect(x - 2.2, y - 4.5, 0.8, 4.5 * sc);
      c.fillRect(x + 1.4, y - 4.5, 0.8, 4.5 * sc);
      // Fringe
      c.fillRect(x - 1.4, y - 4.5, 2.8, 0.6);
    } else {
      // Short male hair cap
      c.fillRect(x - 1.5 * sc, y - 5.5 * sc, 3 * sc, 1.2 * sc);
    }

    // Race-specific tweaks (skip for children for cleanliness)
    if (!isChild) {
      if (this.race === RACE_ELF) {
        c.fillStyle = '#86efac';
        c.fillRect(x - 2, y - 4, 0.6, 0.6);  // pointed ear
        c.fillRect(x + 1.4, y - 4, 0.6, 0.6);
      } else if (this.race === RACE_DWARF && !isFemale) {
        c.fillStyle = '#fde68a';
        c.fillRect(x - 1.5, y - 3, 3, 1.4);  // beard (males only)
      } else if (this.race === RACE_ORC) {
        c.fillStyle = '#f5f5f4';
        c.fillRect(x - 1.5, y - 2.5, 0.6, 0.8); // tusks
        c.fillRect(x + 0.9, y - 2.5, 0.6, 0.8);
      }
    }
    // Eyes — slightly larger for females
    const eyeSize = isFemale ? 0.7 : 0.6;
    c.fillStyle = '#000';
    c.fillRect(x - 1, y - 4 * sc, eyeSize, eyeSize);
    c.fillRect(x + 0.4, y - 4 * sc, eyeSize, eyeSize);
    // Female lips
    if (isFemale && !isChild && lipColor) {
      c.fillStyle = lipColor;
      c.fillRect(x - 0.4, y - 3, 0.9, 0.4);
    }

    // Weapon — class-specific (no weapon for children)
    if (!isChild) this._drawWeapon(c);

    // Baby/child indicator
    if (isChild) {
      c.fillStyle = 'rgba(244, 114, 182, 0.8)';
      c.font = '5px sans-serif';
      c.fillText('👶', x - 3, y - 6);
    }

    // Crown (King)
    if (this.isKing && !isChild) {
      c.fillStyle = '#facc15';
      // 3-spike crown
      c.fillRect(x - 2, y - 7, 4, 1.2);
      c.fillRect(x - 2, y - 8, 0.8, 1);
      c.fillRect(x - 0.4, y - 8.5, 0.8, 1.4);
      c.fillRect(x + 1.2, y - 8, 0.8, 1);
      // Gem
      c.fillStyle = '#ef4444';
      c.fillRect(x - 0.2, y - 8, 0.6, 0.6);
    }

    // Kingdom flag (small banner above)
    if (this.kingdom) {
      const k = kingdoms.get(this.kingdom);
      if (k) {
        // Banner pole
        c.fillStyle = '#a3a3a3';
        c.fillRect(x - 4, y - 6, 0.5, 4);
        c.fillStyle = k.color;
        c.fillRect(x - 4, y - 6, 3, 1.6);
        if (k.tech >= 2) {
          c.fillStyle = '#facc15';
          c.fillRect(x - 3.5, y - 5.5, 0.6, 0.6);
        }
      }
    }

    // HP bar (when damaged)
    if (this.hp < this.maxHp * 0.99) {
      c.fillStyle = 'rgba(0,0,0,0.7)';
      c.fillRect(x - 4, y + 5, 8, 1.2);
      const ratio = Math.max(0, this.hp / this.maxHp);
      c.fillStyle = ratio < 0.3 ? '#dc2626' : ratio < 0.6 ? '#facc15' : '#22c55e';
      c.fillRect(x - 4, y + 5, 8 * ratio, 1.2);
    }
    // Plague tint
    if (this.plague > 0) {
      c.fillStyle = 'rgba(132, 204, 22, 0.35)';
      c.fillRect(x - 2.5, y - 5.5, 5, 8);
    }
    // Hero glow
    if (this.isHero()) {
      c.strokeStyle = 'rgba(250, 204, 21, ' + (0.4 + 0.25 * Math.sin(this.animFrame * 0.1)) + ')';
      c.lineWidth = 0.5;
      c.beginPath();
      c.arc(x, y - 1, 6, 0, Math.PI * 2);
      c.stroke();
    }
  }

  _drawWeapon(c) {
    const x = this.x, y = this.y, f = this.facing;
    if (this.class === CLASS_WARRIOR) {
      // Sword
      c.fillStyle = '#cbd5e1';
      c.fillRect(x + 1.5 * f, y - 4, 0.8, 5);
      c.fillStyle = '#92400e';
      c.fillRect(x + 1.2 * f, y - 1, 1.4, 0.6);
    } else if (this.class === CLASS_ARCHER) {
      // Bow (curve)
      c.strokeStyle = '#78350f';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(x + 1.6 * f, y - 4);
      c.quadraticCurveTo(x + 3.2 * f, y, x + 1.6 * f, y + 3);
      c.stroke();
      // String
      c.strokeStyle = '#e5e7eb';
      c.lineWidth = 0.4;
      c.beginPath();
      c.moveTo(x + 1.6 * f, y - 4);
      c.lineTo(x + 1.6 * f, y + 3);
      c.stroke();
    } else if (this.class === CLASS_MAGE) {
      // Staff with glowing orb
      c.fillStyle = '#7c2d12';
      c.fillRect(x + 1.4 * f, y - 5, 0.7, 7);
      c.fillStyle = '#a855f7';
      c.beginPath();
      c.arc(x + 1.75 * f, y - 5.4, 1.4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#f0abfc';
      c.beginPath();
      c.arc(x + 1.5 * f, y - 5.6, 0.5, 0, Math.PI * 2);
      c.fill();
    } else if (this.class === CLASS_KNIGHT) {
      // Shield
      c.fillStyle = '#94a3b8';
      c.fillRect(x - 3 * f, y - 2.5, 1.4, 4.5);
      c.fillStyle = '#facc15';
      c.fillRect(x - 2.7 * f, y - 1.5, 0.8, 2);
      // Sword
      c.fillStyle = '#e5e7eb';
      c.fillRect(x + 1.5 * f, y - 4, 0.8, 5);
    } else if (this.class === CLASS_HEALER) {
      // Staff
      c.fillStyle = '#15803d';
      c.fillRect(x + 1.4 * f, y - 5, 0.7, 7);
      // Holy symbol
      c.fillStyle = '#22d3ee';
      c.fillRect(x + 1.1 * f, y - 6, 1.4, 0.6);
      c.fillRect(x + 1.4 * f, y - 6.5, 0.6, 1.6);
    } else if (this.class === CLASS_HERO) {
      // Greatsword
      c.fillStyle = '#fef3c7';
      c.fillRect(x + 1.6 * f, y - 6, 1.0, 7);
      c.fillStyle = '#facc15';
      c.fillRect(x + 1.2 * f, y - 1, 1.8, 0.8);
      c.fillStyle = '#92400e';
      c.fillRect(x + 1.6 * f, y, 1.0, 1.4);
    }
  }
}

// =================================================================
// KINGDOMS (clustering)
// =================================================================
class Kingdom {
  constructor(race) {
    this.id = nextKingdomId++;
    this.race = race;
    this.name = randomKingdomName();
    this.color = randomKingdomColor();
    this.pop = 0;
    this.maxPopEver = 0;
    this.wars = new Set();   // kingdom ids
    this.foundedYear = year;
    this.x = 0; this.y = 0;  // capital (centroid)
    this.tech = 0;            // 0=Stone, 1=Bronze, 2=Iron, 3=Medieval
    this.needsNewKing = true;
    this.kingId = null;        // unit reference (assigned via flag)
    this.territorySize = 0;
    // V4: Diplomacy
    this.kingTraits = [];      // assigned when first king crowned
    this.relations = new Map(); // kingdom_id -> -100..+100
    this.warPlots   = new Map(); // kingdom_id -> { countdown }
    this.peacePlots = new Map(); // kingdom_id -> { countdown }
    this.allies = new Set();
    this.warLosses = 0;         // counter; decays
    this.loyalty = 100;         // for rebellion check (decreased by evil king / overcrowding)
  }
  // Sum of war biases from king traits (positive = warlike, negative = peaceful)
  warBias() {
    let s = 0;
    for (const t of this.kingTraits) {
      const def = KING_TRAITS[t];
      if (def) s += def.warBias;
    }
    return s;
  }
  isWarlike() { return this.warBias() > 0; }
  ageOfKingdom() { return year - this.foundedYear; }
  updateTech() {
    const a = this.ageOfKingdom();
    const p = this.maxPopEver;
    let t = 0;
    if (a >= 25  && p >= 12) t = 1;
    if (a >= 70  && p >= 25) t = 2;
    if (a >= 150 && p >= 40) t = 3;
    if (t !== this.tech) {
      this.tech = t;
      log('⚒️ ' + this.name + ' → ' + (window.wbLang && window.wbLang.techNames ? window.wbLang.techNames[TECH_NAMES[t]] : TECH_NAMES[t]));
      if (t === 2) unlockAch('a_iron_age');
      if (t === 3) unlockAch('a_medieval');
    }
  }
  cityKind() {
    if (this.pop >= 50) return 'city';
    if (this.pop >= 25) return 'town';
    if (this.pop >= 10) return 'village';
    if (this.pop >= 4)  return 'tent';
    return null;
  }
}
// =================================================================
// V5: BUILDINGS — Watchtowers + Town Halls (capturable centers)
// =================================================================
const B_TOWER = 'tower', B_HALL = 'hall';
const TOWER_STATS_BY_TECH = [
  { range:  78, dmg:  6,  cd: 60, maxHp:  60, maxPerPop: 18 },  // Stone
  { range:  96, dmg:  9,  cd: 50, maxHp:  90, maxPerPop: 14 },  // Bronze
  { range: 118, dmg: 12,  cd: 42, maxHp: 130, maxPerPop: 11 },  // Iron
  { range: 140, dmg: 16,  cd: 34, maxHp: 180, maxPerPop:  9 }   // Medieval
];
const HALL_HP_BY_TECH = [240, 380, 540, 720];

class Building {
  constructor(type, x, y, kingdomId) {
    this.type = type;          // 'tower' or 'hall'
    this.x = x; this.y = y;
    this.kingdom = kingdomId;
    this.dead = false;
    this.attackCd = 0;
    this.repairCd = 0;
    this.constructProg = type === B_TOWER ? 0 : 100;  // towers build over time
    const k = kingdoms.get(kingdomId);
    const tech = k ? k.tech : 0;
    this.maxHp = type === B_TOWER ? TOWER_STATS_BY_TECH[tech].maxHp : HALL_HP_BY_TECH[tech];
    this.hp = type === B_TOWER ? Math.floor(this.maxHp * 0.3) : this.maxHp;
  }
  stats() {
    const k = kingdoms.get(this.kingdom);
    const tech = k ? k.tech : 0;
    return TOWER_STATS_BY_TECH[tech];
  }
  isDamaged() { return !this.dead && this.hp < this.maxHp; }
  isComplete() { return this.constructProg >= 100; }
  takeDamage(amount, attackerKingdom) {
    if (this.dead) return;
    this.hp -= amount;
    effects.push({ type: 'hit', x: this.x, y: this.y, life: 10 });
    if (this.hp <= 0) {
      this.dead = true;
      this.hp = 0;
      effects.push({ type: 'rubble', x: this.x, y: this.y, life: 90 });
      const k = kingdoms.get(this.kingdom);
      if (k) {
        log('💥 ' + format(window.wbLang.evtBuildingDestroyed || '{a}\'s {b} destroyed', {
          a: k.name, b: this.type === B_TOWER ? '🗼' : '🏛'
        }));
        // Hall destroyed → capture chance
        if (this.type === B_HALL) attemptCapture(this, attackerKingdom);
      }
    }
  }
  update() {
    if (this.dead) return;
    // Construction progress for new towers
    if (!this.isComplete()) {
      this.constructProg += 0.4;
      this.hp = Math.min(this.maxHp, this.hp + 0.5);
      return;
    }
    const k = kingdoms.get(this.kingdom);
    if (!k) { this.dead = true; return; }

    // Auto-repair (slow)
    if (this.isDamaged()) {
      this.repairCd++;
      if (this.repairCd >= 60) {
        this.repairCd = 0;
        this.hp = Math.min(this.maxHp, this.hp + (this.type === B_TOWER ? 2 : 3));
      }
    }

    // Watchtower combat
    if (this.type === B_TOWER) {
      if (this.attackCd > 0) { this.attackCd--; return; }
      // Throttle: only scan every 3rd frame, with a phase offset so towers stagger
      if (!this._scanOffset) this._scanOffset = Math.floor(Math.random() * 3);
      if (((frameCount + this._scanOffset) % 3) !== 0) return;
      const s = this.stats();
      let target = null, td = s.range * s.range;
      // Use grid pattern: scan a subset of units each frame
      const startIdx = frameCount % 2;
      for (let i = startIdx; i < units.length; i += 2) {
        const u = units[i];
        if (u.dead || u.downed > 0) continue;
        if (u.kingdom === this.kingdom) continue;
        if (u.kingdom && k.allies.has(u.kingdom)) continue;
        let hostile = false;
        if (u.isHostileAnimal()) hostile = true;
        else if (u.race < MORTAL_RACES) {
          if (!u.kingdom) hostile = true;
          else if (k.wars.has(u.kingdom)) hostile = true;
        }
        if (!hostile) continue;
        const d = dist2(u.x, u.y, this.x, this.y);
        if (d < td) { td = d; target = u; }
      }
      if (target) {
        effects.push({
          type: 'arrow', x: this.x, y: this.y - 8,
          tx: target.x, ty: target.y,
          target, dmg: s.dmg, shooter: null,
          life: 60
        });
        this.attackCd = s.cd;
      }
    }
  }
}

// Try to capture the kingdom whose town hall just fell
function attemptCapture(hall, attackerKingdomId) {
  const losingKing = kingdoms.get(hall.kingdom);
  if (!losingKing) return;
  // Find an aggressor: any kingdom at war with the loser whose units are nearby
  let captor = attackerKingdomId ? kingdoms.get(attackerKingdomId) : null;
  if (!captor) {
    let best = null, bestCount = 0;
    for (const [id, k] of kingdoms) {
      if (id === losingKing.id) continue;
      if (!k.wars.has(losingKing.id)) continue;
      // Count this kingdom's soldiers near the fallen hall
      let near = 0;
      for (const u of units) {
        if (!u.dead && u.kingdom === id && dist2(u.x, u.y, hall.x, hall.y) < 120 * 120) near++;
      }
      if (near > bestCount) { bestCount = near; best = k; }
    }
    captor = best;
  }
  if (!captor) {
    // No captor — kingdom just collapses
    log('🏛✖ ' + format(window.wbLang.evtKingdomCollapse || '{a} has collapsed', { a: losingKing.name }));
    return;
  }
  // Transfer only units within 150px of the fallen hall (defenders surrendered)
  // Far-flung units stay loyal to the old kingdom (which will collapse if no hall remains)
  const CAPTURE_R2 = 150 * 150;
  let captured = 0, escaped = 0;
  for (const u of units) {
    if (u.dead) continue;
    if (u.kingdom !== losingKing.id) continue;
    const inRange = dist2(u.x, u.y, hall.x, hall.y) < CAPTURE_R2;
    if (inRange) {
      u.kingdom = captor.id;
      u.isKing = false;
      captured++;
    } else {
      // Refugees / hold-outs — become kingdom-less wanderers
      u.kingdom = null;
      u.isKing = false;
      escaped++;
    }
  }
  // Transfer surviving buildings within capture radius; others become rubble
  for (const b of buildings) {
    if (b.kingdom !== losingKing.id || b.dead) continue;
    if (dist2(b.x, b.y, hall.x, hall.y) < CAPTURE_R2) b.kingdom = captor.id;
    else { b.dead = true; b.hp = 0; effects.push({ type: 'rubble', x: b.x, y: b.y, life: 60 }); }
  }
  captor.pop += captured;
  log('🏛⇨ ' + format(window.wbLang.evtCapture || '{b} captures {a}!', { a: losingKing.name, b: captor.name })
      + (escaped > 0 ? ` (+${escaped} ${window.wbLang.refugees || 'refugees'})` : ''));
  unlockAch('a_capture');
  losingKing.pop = 0;
}

const KINGDOM_PALETTE = [
  '#fbbf24', '#22d3ee', '#a855f7', '#ec4899', '#84cc16', '#f97316',
  '#06b6d4', '#f43f5e', '#facc15', '#10b981', '#8b5cf6', '#0ea5e9'
];
let nextColorIdx = 0;
function randomKingdomColor() {
  const c = KINGDOM_PALETTE[nextColorIdx % KINGDOM_PALETTE.length];
  nextColorIdx++;
  return c;
}
function randomKingdomName() {
  const names = (window.wbLang && window.wbLang.kingdomNames) || ['Aurora','Star','Sun','Forest','Stone','Iron'];
  return pick(names);
}
function isAtWar(a, b) {
  if (a === b) return false;
  const k = kingdoms.get(a);
  return k && k.wars.has(b);
}

function updateKingdoms() {
  // Reset kingdom membership / form clusters per race (mortals only)
  const aliveUnits = units.filter(u => !u.dead && u.race < MORTAL_RACES);
  if (aliveUnits.length === 0) {
    // Prune all kingdoms
    for (const [id, k] of kingdoms) { kingdoms.delete(id); log(format(window.wbLang.evtFell, { a: k.name })); }
    return;
  }

  // bucket units into grid for fast lookup
  const CELL = 40;
  const cols = Math.ceil(VIEW_W / CELL), rows = Math.ceil(VIEW_H / CELL);
  const grid = new Map();
  for (const u of aliveUnits) {
    const gx = Math.floor(u.x / CELL), gy = Math.floor(u.y / CELL);
    const k = gy * cols + gx;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(u);
  }

  // Process each race
  const oldKingdoms = new Map(kingdoms);
  // Track which old kingdoms still have members
  const stillAlive = new Set();

  for (let race = 0; race < MORTAL_RACES; race++) {
    const racial = aliveUnits.filter(u => u.race === race);
    if (racial.length < 3) {
      // dissolve: clear kingdom membership for this race
      for (const u of racial) u.kingdom = null;
      continue;
    }
    const visited = new Set();
    for (const seed of racial) {
      if (visited.has(seed)) continue;
      const cluster = [];
      const queue = [seed];
      visited.add(seed);
      while (queue.length) {
        const cur = queue.pop();
        cluster.push(cur);
        const gx = Math.floor(cur.x / CELL), gy = Math.floor(cur.y / CELL);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const cell = grid.get((gy + dy) * cols + (gx + dx));
          if (!cell) continue;
          for (const o of cell) {
            if (visited.has(o)) continue;
            if (o.race !== race) continue;
            if (dist2(cur.x, cur.y, o.x, o.y) < 60 * 60) {
              visited.add(o); queue.push(o);
            }
          }
        }
      }

      if (cluster.length >= 4) {
        // Reuse existing kingdom id if any unit already had one of this race
        let existingId = null;
        for (const m of cluster) if (m.kingdom != null) {
          const k = oldKingdoms.get(m.kingdom);
          if (k && k.race === race) { existingId = m.kingdom; break; }
        }
        let king;
        if (existingId != null && kingdoms.has(existingId)) {
          king = kingdoms.get(existingId);
        } else {
          king = new Kingdom(race);
          kingdoms.set(king.id, king);
          log(format(window.wbLang.evtFound, { a: king.name, race: raceLabel(race) }));
          unlockAch('a_first_kingdom');
        }
        king.pop = cluster.length;
        if (cluster.length > king.maxPopEver) king.maxPopEver = cluster.length;
        let sx = 0, sy = 0;
        for (const m of cluster) { m.kingdom = king.id; sx += m.x; sy += m.y; }
        king.x = sx / cluster.length;
        king.y = sy / cluster.length;
        king.updateTech();
        if (king.cityKind() === 'city') unlockAch('a_city');
        stillAlive.add(king.id);
        // V5: auto-build watchtowers and town hall
        manageBuildings(king);
        // King succession: ensure someone wears the crown
        // Clear isKing from anyone not in this cluster anymore
        let currentKing = null;
        for (const m of cluster) {
          if (m.isKing) {
            if (currentKing) m.isKing = false;  // dedupe
            else currentKing = m;
          }
        }
        if (!currentKing || currentKing.downed > 0) {
          if (currentKing) currentKing.isKing = false;
          // Pick new king: prefer hero, then highest age (eldest)
          let next = null;
          for (const m of cluster) {
            if (m.downed > 0 || m.dead) continue;
            if (!next) { next = m; continue; }
            // Prefer hero, then knight, then highest age
            const score = (u) =>
              (u.isHero() ? 1000 : 0) +
              (u.class === CLASS_KNIGHT ? 200 : 0) +
              u.age;
            if (score(m) > score(next)) next = m;
          }
          if (next) {
            next.isKing = true;
            king.needsNewKing = false;
            // Roll fresh personality on every coronation (new + succession)
            king.kingTraits = rollKingTraits();
            const traitStr = king.kingTraits.map(t => KING_TRAITS[t].icon).join('');
            log('👑 ' + king.name + ' ' + traitStr + ' — ' + (window.wbLang && window.wbLang.evtKingCrowned || 'a new king is crowned'));
          }
        }
      } else {
        // too small — leave kingdom-less
        for (const m of cluster) m.kingdom = null;
      }
    }
  }

  // Prune dead kingdoms — and remove dangling references in other kingdoms
  for (const [id, k] of kingdoms) {
    if (!stillAlive.has(id)) {
      kingdoms.delete(id);
      log(format(window.wbLang.evtFell, { a: k.name }));
      // Cleanup: strip orphan id from every other kingdom's diplomacy state
      for (const [, other] of kingdoms) {
        other.wars.delete(id);
        other.allies.delete(id);
        other.relations.delete(id);
        other.warPlots.delete(id);
        other.peacePlots.delete(id);
      }
      // Buildings of that dead kingdom become rubble
      for (const b of buildings) {
        if (b.kingdom === id && !b.dead) { b.dead = true; b.hp = 0; }
      }
    }
  }

  // V3: Expand territory — each unit claims its tile + a small radius for its kingdom
  // Decay un-occupied territory slowly
  const decay = 0.02;
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const t = tiles[y][x];
      if (!t.influence) continue;
      // Decay influence
      for (const id in t.influence) {
        t.influence[id] -= decay;
        if (t.influence[id] <= 0) delete t.influence[id];
      }
    }
  }
  // Add influence from each living mortal unit
  for (const u of units) {
    if (u.dead || u.downed > 0 || u.race >= MORTAL_RACES || !u.kingdom) continue;
    const tx = Math.floor(u.x / TILE_PX), ty = Math.floor(u.y / TILE_PX);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (dx*dx + dy*dy > 9) continue;
      const t = tiles[ty + dy] && tiles[ty + dy][tx + dx];
      if (!t) continue;
      if (!t.influence) t.influence = {};
      const id = u.kingdom;
      t.influence[id] = Math.min(2, (t.influence[id] || 0) + 0.5);
    }
  }
  // Assign owner = highest influence
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const t = tiles[y][x];
      t.owner = null;
      if (!t.influence) continue;
      let bestId = null, bestVal = 0.2;
      for (const id in t.influence) {
        if (t.influence[id] > bestVal) { bestVal = t.influence[id]; bestId = parseInt(id); }
      }
      t.owner = bestId;
    }
  }
  // Count territory per kingdom
  for (const [, k] of kingdoms) k.territorySize = 0;
  for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) {
    const t = tiles[y][x];
    if (t.owner && kingdoms.has(t.owner)) kingdoms.get(t.owner).territorySize++;
  }

  // V4: Replace simple war declaration with diplomacy/plot system
  if (worldLaws.diplomacy) updateDiplomacy();

  // V4: Rebellion check — overcrowded/evil-king kingdoms can splinter
  if (worldLaws.rebellions) checkRebellions();

  // V4: Victory check — only 1 kingdom alive ⇒ win
  checkVictory();
}

// =================================================================
// V5: BUILDING MANAGEMENT
// =================================================================
function manageBuildings(k) {
  const tech = k.tech || 0;
  // Town hall — ensure exactly one per kingdom
  let hall = buildings.find(b => b.kingdom === k.id && b.type === B_HALL && !b.dead);
  if (!hall) {
    buildings.push(new Building(B_HALL, k.x, k.y, k.id));
  } else {
    // Slide the hall toward the new centroid (gentle pursuit)
    hall.x = hall.x * 0.9 + k.x * 0.1;
    hall.y = hall.y * 0.9 + k.y * 0.1;
    // Upgrade max HP if tech advanced
    const desired = HALL_HP_BY_TECH[tech];
    if (hall.maxHp < desired) {
      const gain = desired - hall.maxHp;
      hall.maxHp = desired; hall.hp += gain;
    }
  }
  // Watchtowers — number scales with pop and tech
  const popPerTower = TOWER_STATS_BY_TECH[tech].maxPerPop;
  const maxTowers = Math.min(2 + tech * 2, Math.floor(k.pop / popPerTower));
  const myTowers = buildings.filter(b => b.kingdom === k.id && b.type === B_TOWER && !b.dead);
  if (myTowers.length < maxTowers) {
    // Try to place a new tower in territory
    for (let attempt = 0; attempt < 8; attempt++) {
      const ang = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 90;
      const tx = k.x + Math.cos(ang) * radius;
      const ty = k.y + Math.sin(ang) * radius;
      if (tx < 12 || ty < 12 || tx > VIEW_W - 12 || ty > VIEW_H - 12) continue;
      // Tile must be land
      const tile = tiles[Math.floor(ty / TILE_PX)] && tiles[Math.floor(ty / TILE_PX)][Math.floor(tx / TILE_PX)];
      if (!tile || tile.type === T_WATER || tile.type === T_LAVA) continue;
      // Tile should be claimed by this kingdom (or at least no other)
      if (tile.owner && tile.owner !== k.id) continue;
      // Not too close to existing buildings
      let tooClose = false;
      for (const b of buildings) {
        if (b.dead) continue;
        if (dist2(b.x, b.y, tx, ty) < 50 * 50) { tooClose = true; break; }
      }
      if (tooClose) continue;
      buildings.push(new Building(B_TOWER, tx, ty, k.id));
      log('🏗 ' + format(window.wbLang.evtTowerBuilt || '{a} built a watchtower', { a: k.name }));
      break;
    }
  }
}

// =================================================================
// V4: DIPLOMACY (relations, plots, alliances)
// =================================================================
function updateDiplomacy() {
  const ks = Array.from(kingdoms.values());
  if (ks.length < 2) return;
  for (let i = 0; i < ks.length; i++) {
    for (let j = i + 1; j < ks.length; j++) {
      const a = ks[i], b = ks[j];
      let rel = a.relations.get(b.id) || 0;
      let delta = 0;
      // Race baseline
      delta += (a.race === b.race) ? 0.6 : -0.3;
      // Capital proximity (territory pressure)
      const d = Math.sqrt(dist2(a.x, a.y, b.x, b.y));
      if (d < 180) delta -= 0.8;
      else if (d > 400) delta += 0.3;
      // King trait war-bias drags relations down (warlike) or up (peaceful)
      delta -= a.warBias() * 0.012;
      delta -= b.warBias() * 0.012;
      // Common enemy bonus
      for (const c of ks) {
        if (c === a || c === b) continue;
        if (a.wars.has(c.id) && b.wars.has(c.id)) delta += 0.4;
      }
      // Alliance maintains positive
      if (a.allies.has(b.id)) delta += 0.6;
      // At war: relations pull toward hatred
      if (a.wars.has(b.id)) delta -= 0.8;
      // Power asymmetry — strong picks on weak
      const sizeRatio = (a.pop + 1) / (b.pop + 1);
      if (sizeRatio > 2.5 && a.isWarlike()) delta -= 0.4;
      if (sizeRatio < 0.4 && b.isWarlike()) delta -= 0.4;

      rel = clamp(rel + delta, -100, 100);
      a.relations.set(b.id, rel);
      b.relations.set(a.id, rel);

      // Decay war losses
      a.warLosses = Math.max(0, a.warLosses - 0.3);
      b.warLosses = Math.max(0, b.warLosses - 0.3);

      // -- WAR PLOT --
      if (!a.wars.has(b.id) && !a.allies.has(b.id) && worldLaws.autoWar) {
        if (rel < -45 && !a.warPlots.has(b.id) && !a.peacePlots.has(b.id)) {
          const cd = 4 + Math.floor(Math.random() * 6);
          a.warPlots.set(b.id, { countdown: cd });
          b.warPlots.set(a.id, { countdown: cd });
          log('⚔ ' + format(window.wbLang.evtPlotWar || '{a} begins plotting war on {b}', { a: a.name, b: b.name }));
        }
        if (a.warPlots.has(b.id)) {
          const plot = a.warPlots.get(b.id);
          plot.countdown--;
          if (plot.countdown <= 0) {
            // Declare war
            a.wars.add(b.id); b.wars.add(a.id);
            a.warPlots.delete(b.id); b.warPlots.delete(a.id);
            log('⚔ ' + format(window.wbLang.evtWar, { a: a.name, b: b.name }));
            // Allies join
            for (const allyId of a.allies) {
              const al = kingdoms.get(allyId);
              if (al && al.id !== b.id && !al.wars.has(b.id) && !al.allies.has(b.id)) {
                al.wars.add(b.id); b.wars.add(al.id);
                log('🛡 ' + format(window.wbLang.evtAllyJoin || '{a} joins the war (ally of {b})', { a: al.name, b: a.name }));
              }
            }
            for (const allyId of b.allies) {
              const al = kingdoms.get(allyId);
              if (al && al.id !== a.id && !al.wars.has(a.id) && !al.allies.has(a.id)) {
                al.wars.add(a.id); a.wars.add(al.id);
                log('🛡 ' + format(window.wbLang.evtAllyJoin || '{a} joins the war (ally of {b})', { a: al.name, b: b.name }));
              }
            }
          }
        }
      }

      // -- ALLIANCE FORMATION --
      if (!a.wars.has(b.id) && !a.allies.has(b.id) && !a.warPlots.has(b.id)) {
        if (rel > 55 && Math.random() < 0.08) {
          a.allies.add(b.id); b.allies.add(a.id);
          log('🤝 ' + format(window.wbLang.evtAlliance || '{a} forms an alliance with {b}', { a: a.name, b: b.name }));
        }
      }

      // -- PEACE PLOT --
      if (a.wars.has(b.id) && !a.peacePlots.has(b.id)) {
        // Heavy losses or relations improving — start peace negotiations
        const losses = a.warLosses + b.warLosses;
        const trigger = (losses > 8 && Math.random() < 0.12) || rel > -10;
        if (trigger) {
          const cd = 3 + Math.floor(Math.random() * 4);
          a.peacePlots.set(b.id, { countdown: cd });
          b.peacePlots.set(a.id, { countdown: cd });
          log('🕊 ' + format(window.wbLang.evtPlotPeace || '{a} and {b} begin peace negotiations', { a: a.name, b: b.name }));
        }
      }
      if (a.peacePlots.has(b.id)) {
        a.peacePlots.get(b.id).countdown--;
        if (a.peacePlots.get(b.id).countdown <= 0) {
          a.wars.delete(b.id); b.wars.delete(a.id);
          a.peacePlots.delete(b.id); b.peacePlots.delete(a.id);
          a.warLosses = 0; b.warLosses = 0;
          // Reset relations a bit toward neutral
          a.relations.set(b.id, Math.max(rel, 0));
          b.relations.set(a.id, Math.max(rel, 0));
          log('🕊 ' + format(window.wbLang.evtPeaceTreaty || '{a} and {b} sign a peace treaty', { a: a.name, b: b.name }));
          unlockAch('a_peacemaker');
        }
      }
    }
  }
}

// =================================================================
// V4: REBELLION
// =================================================================
function checkRebellions() {
  for (const k of Array.from(kingdoms.values())) {
    // Loyalty drops if king is evil or kingdom is too big
    if (k.kingTraits.includes('evil')) k.loyalty -= 1;
    if (k.kingTraits.includes('bloodlust')) k.loyalty -= 0.5;
    if (k.kingTraits.includes('honest') || k.kingTraits.includes('diplomat')) k.loyalty = Math.min(100, k.loyalty + 0.4);
    if (k.pop > 60) k.loyalty -= 0.3;
    // Recover slowly
    if (!k.kingTraits.includes('evil') && !k.kingTraits.includes('bloodlust')) k.loyalty = Math.min(100, k.loyalty + 0.2);
    k.loyalty = clamp(k.loyalty, 0, 100);

    if (k.loyalty < 30 && k.pop > 12 && Math.random() < 0.08) {
      // Splinter a faction: half the members defect & form a new kingdom
      const members = units.filter(u => !u.dead && u.kingdom === k.id && !u.isKing);
      if (members.length < 6) continue;
      const splinters = members.slice(0, Math.floor(members.length / 2));
      const splinterKing = new Kingdom(k.race);
      splinterKing.name = randomKingdomName() + ' (Rebel)';
      splinterKing.kingTraits = ['militaristic'];  // rebels are militant by default
      kingdoms.set(splinterKing.id, splinterKing);
      let sx = 0, sy = 0;
      for (const m of splinters) { m.kingdom = splinterKing.id; m.isKing = false; sx += m.x; sy += m.y; }
      splinterKing.pop = splinters.length;
      splinterKing.x = sx / splinters.length;
      splinterKing.y = sy / splinters.length;
      splinters[0].isKing = true;
      // Immediate hostility
      splinterKing.relations.set(k.id, -100);
      k.relations.set(splinterKing.id, -100);
      k.loyalty = 60;  // remaining people feel relieved
      log('🔥 ' + format(window.wbLang.evtRebellion || '{a} rebels and breaks away from {b}!', { a: splinterKing.name, b: k.name }));
    }
  }
}

// =================================================================
// V4: VICTORY CHECK
// =================================================================
let victoryFired = false;
function checkVictory() {
  if (victoryFired) return;
  // Count surviving kingdoms with population > 0
  const alive = Array.from(kingdoms.values()).filter(k => k.pop > 0);
  if (kingdoms.size === 0 || alive.length === 0) return;
  if (alive.length === 1 && year > 5) {
    victoryFired = true;
    const winner = alive[0];
    showVictory(winner);
  }
}
function showVictory(winner) {
  const m = document.getElementById('wb-victory-modal');
  if (!m) return;
  const nameEl = document.getElementById('wb-victory-name');
  if (nameEl) {
    const traitStr = winner.kingTraits.map(t => KING_TRAITS[t].icon).join(' ');
    nameEl.textContent = winner.name + ' ' + traitStr;
    nameEl.style.color = winner.color;
  }
  const detailEl = document.getElementById('wb-victory-detail');
  if (detailEl) {
    const raceName = raceLabel(winner.race);
    detailEl.textContent = `${raceName} · ${winner.pop} pop · ${winner.territorySize} tiles · ${TECH_NAMES[winner.tech]}`;
  }
  m.style.display = 'flex';
  paused = true;
  refreshSpeedUI();
}
function raceLabel(r) {
  const n = window.wbLang && window.wbLang.toolNames;
  if (!n) return RACE_KEY[r];
  return n[RACE_KEY[r]] || RACE_KEY[r];
}
function format(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : '?');
}

// =================================================================
// EVENT LOG
// =================================================================
function log(text) {
  eventLog.unshift({ year, text });
  if (eventLog.length > 30) eventLog.pop();
  const el = document.getElementById('wb-log');
  if (!el) return;
  el.innerHTML = eventLog.slice(0, 12).map(e =>
    `<div class="wb-log-entry"><span class="wb-year">Y${e.year}</span> ${e.text}</div>`
  ).join('');
}

// =================================================================
// GOD POWERS (TOOLS)
// =================================================================
const TOOL_DEFS = [
  // row 1: terrain (cost 1 each)
  { id: 'water',    icon: '💧', cat: 'terrain', cost: 1 },
  { id: 'sand',     icon: '🏖️', cat: 'terrain', cost: 1 },
  { id: 'grass',    icon: '🌱', cat: 'terrain', cost: 1 },
  { id: 'forest',   icon: '🌳', cat: 'terrain', cost: 1 },
  { id: 'mountain', icon: '🏔️', cat: 'terrain', cost: 1 },
  { id: 'snow',     icon: '❄️', cat: 'terrain', cost: 1 },
  { id: 'lava',     icon: '🌋', cat: 'terrain', cost: 1 },
  // row 2: disasters + bless
  { id: 'lightning', icon: '⚡', cat: 'disaster', cost: 6 },
  { id: 'fire',      icon: '🔥', cat: 'disaster', cost: 4 },
  { id: 'tornado',   icon: '🌪️', cat: 'disaster', cost: 15 },
  { id: 'plague',    icon: '🦠', cat: 'disaster', cost: 22 },
  { id: 'finger',    icon: '💀', cat: 'disaster', cost: 5 },
  { id: 'meteor',    icon: '☄️', cat: 'disaster', cost: 40 },
  { id: 'acidstorm', icon: '🌀', cat: 'disaster', cost: 28 },
  { id: 'nuke',      icon: '☢️', cat: 'disaster', cost: 90 },
  { id: 'rain',      icon: '🌧️', cat: 'bless',    cost: 8 },
  { id: 'heal',      icon: '💚', cat: 'bless',    cost: 10 },
  { id: 'peace',     icon: '🛐', cat: 'bless',    cost: 35 },
  { id: 'spite',     icon: '💢', cat: 'diplo',   cost: 25 },
  { id: 'friendship',icon: '💞', cat: 'diplo',   cost: 25 },
  { id: 'inspect',   icon: '🔍', cat: 'view',    cost: 0  },
  // row 3: spawns (mortals + wildlife)
  { id: 'human', icon: '🧑', cat: 'spawn', cost: 4 },
  { id: 'elf',   icon: '🧝', cat: 'spawn', cost: 4 },
  { id: 'dwarf', icon: '🧔', cat: 'spawn', cost: 4 },
  { id: 'orc',   icon: '👹', cat: 'spawn', cost: 4 },
  { id: 'sheep', icon: '🐑', cat: 'wild',  cost: 2 },
  { id: 'wolf',  icon: '🐺', cat: 'wild',  cost: 3 },
  { id: 'bear',  icon: '🐻', cat: 'wild',  cost: 5 },
  // Heroes (one per race) — expensive
  { id: 'hero_human', icon: '🦸', cat: 'hero', cost: 60 },
  { id: 'hero_elf',   icon: '🧚', cat: 'hero', cost: 60 },
  { id: 'hero_dwarf', icon: '🛡️', cat: 'hero', cost: 60 },
  { id: 'hero_orc',   icon: '👺', cat: 'hero', cost: 60 }
];

const TERRAIN_TYPE = {
  water: T_WATER, sand: T_SAND, grass: T_GRASS, forest: T_FOREST,
  mountain: T_MOUNTAIN, snow: T_SNOW, lava: T_LAVA
};

function applyTool(toolId, x, y) {
  const def = TOOL_DEFS.find(t => t.id === toolId);
  if (!def) return;
  // Free tools (view) skip the cost check entirely
  if (def.cost > 0) {
    if (mana < def.cost) {
      effects.push({ type: 'nomana', x, y, life: 14 });
      return;
    }
    mana -= def.cost;
  }
  if (TERRAIN_TYPE[toolId] !== undefined) {
    paintTile(x, y, brushSize, TERRAIN_TYPE[toolId]);
    return;
  }
  switch (toolId) {
    case 'lightning': return doLightning(x, y);
    case 'fire':      return doFire(x, y, brushSize);
    case 'tornado':   return doTornado(x, y);
    case 'plague':    return doPlague(x, y, brushSize);
    case 'finger':    return doFinger(x, y);
    case 'meteor':    return doMeteor(x, y);
    case 'acidstorm': return doAcidStorm(x, y);
    case 'nuke':      return doNuke(x, y);
    case 'rain':      return doRain(x, y, brushSize);
    case 'heal':      return doHeal(x, y, brushSize);
    case 'peace':     return doPeace();
    case 'spite':     return doSpite(x, y);
    case 'friendship':return doFriendship(x, y);
    case 'inspect':   return doInspect(x, y);
    case 'human':     return spawnAt(x, y, RACE_HUMAN);
    case 'elf':       return spawnAt(x, y, RACE_ELF);
    case 'dwarf':     return spawnAt(x, y, RACE_DWARF);
    case 'orc':       return spawnAt(x, y, RACE_ORC);
    case 'sheep':     return spawnAt(x, y, RACE_SHEEP);
    case 'wolf':      return spawnAt(x, y, RACE_WOLF);
    case 'bear':      return spawnAt(x, y, RACE_BEAR);
    case 'hero_human': return spawnHero(x, y, RACE_HUMAN);
    case 'hero_elf':   return spawnHero(x, y, RACE_ELF);
    case 'hero_dwarf': return spawnHero(x, y, RACE_DWARF);
    case 'hero_orc':   return spawnHero(x, y, RACE_ORC);
  }
}

function spawnHero(x, y, race) {
  const tx = Math.floor(x / TILE_PX), ty = Math.floor(y / TILE_PX);
  const t = tiles[ty] && tiles[ty][tx];
  if (t && (t.type === T_WATER || t.type === T_MOUNTAIN || t.type === T_LAVA)) t.type = T_GRASS;
  const h = new Unit(x, y, race, CLASS_HERO);
  units.push(h);
  effects.push({ type: 'achievement', text: '🦸 ' + (window.wbLang && window.wbLang.evtHeroBorn || 'A hero is born'), life: 180 });
}

// =================================================================
// V2 POWER IMPLEMENTATIONS
// =================================================================
function doMeteor(x, y) {
  effects.push({ type: 'meteor', x, y, life: 60 });
  // After impact: huge crater + fire ring + heavy damage
  // Apply immediately for simplicity
  for (const u of units) {
    if (u.dead) continue;
    const d2 = dist2(u.x, u.y, x, y);
    if (d2 < 60 * 60) u.hp -= 80;
    else if (d2 < 110 * 110) u.hp -= 30;
  }
  const cx = Math.floor(x / TILE_PX), cy = Math.floor(y / TILE_PX);
  const R = 8;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const d = dx*dx + dy*dy;
    if (d > R*R) continue;
    const ny = cy + dy, nx = cx + dx;
    const t = tiles[ny] && tiles[ny][nx];
    if (!t) continue;
    if (d < 9) t.type = T_LAVA;
    else if (d < 25) { t.type = T_BURNT; t.fire = 100; }
    else if (t.type === T_GRASS || t.type === T_FOREST) t.fire = 100;
  }
  cameraShake(20);
  unlockAch('a_meteor');
}

function doAcidStorm(x, y) {
  // Damages all units, corrupts grass→burnt and forests→grass
  for (const u of units) {
    if (u.dead) continue;
    if (dist2(u.x, u.y, x, y) < 130 * 130) {
      u.hp -= 12;
      if (Math.random() < 0.25) u.plague = 400;
    }
  }
  const cx = Math.floor(x / TILE_PX), cy = Math.floor(y / TILE_PX);
  const R = 14;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    if (dx*dx + dy*dy > R*R) continue;
    const ny = cy + dy, nx = cx + dx;
    const t = tiles[ny] && tiles[ny][nx];
    if (!t) continue;
    if (t.type === T_FOREST) t.type = T_GRASS;
    else if (t.type === T_GRASS && Math.random() < 0.3) t.type = T_BURNT;
  }
  effects.push({ type: 'acidstorm', x, y, life: 60 });
}

function doNuke(x, y) {
  // Massive AOE: burn everything in 25-tile radius
  for (const u of units) {
    if (u.dead) continue;
    const d2 = dist2(u.x, u.y, x, y);
    if (d2 < 250 * 250) { u.hp = -999; u.die('nuke'); }
  }
  const cx = Math.floor(x / TILE_PX), cy = Math.floor(y / TILE_PX);
  const R = 24;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const d = dx*dx + dy*dy;
    if (d > R*R) continue;
    const ny = cy + dy, nx = cx + dx;
    const t = tiles[ny] && tiles[ny][nx];
    if (!t) continue;
    if (d < 36) t.type = T_LAVA;
    else if (d < 200) { t.type = T_BURNT; t.fire = 100; }
    else if (t.type === T_GRASS || t.type === T_FOREST) t.fire = 100;
  }
  cameraShake(40);
  effects.push({ type: 'nuke', x, y, life: 80 });
  log('☢️ A divine sun was unleashed.');
}

function doRain(x, y, brush) {
  // Puts out fires + slowly converts sand→grass, lava→mountain in area
  const R = 100 + brush * 20;
  const cx = Math.floor(x / TILE_PX), cy = Math.floor(y / TILE_PX);
  const tr = Math.ceil(R / TILE_PX);
  for (let dy = -tr; dy <= tr; dy++) for (let dx = -tr; dx <= tr; dx++) {
    if (dx*dx + dy*dy > tr*tr) continue;
    const ny = cy + dy, nx = cx + dx;
    const t = tiles[ny] && tiles[ny][nx];
    if (!t) continue;
    t.fire = 0;
    if (t.type === T_LAVA && Math.random() < 0.4) t.type = T_MOUNTAIN;
    if (t.type === T_BURNT && Math.random() < 0.6) t.type = T_GRASS;
    if (t.type === T_SAND && Math.random() < 0.15) t.type = T_GRASS;
  }
  effects.push({ type: 'rain', x, y, r: R, life: 50 });
}

let cameraShakeAmt = 0;
function cameraShake(amt) { cameraShakeAmt = Math.max(cameraShakeAmt, amt); }

// V4: Pick the kingdom whose tile/unit is under (x, y)
function pickKingdomAt(x, y) {
  // Prefer tile ownership
  const tx = Math.floor(x / TILE_PX), ty = Math.floor(y / TILE_PX);
  const t = tiles[ty] && tiles[ty][tx];
  if (t && t.owner && kingdoms.has(t.owner)) return kingdoms.get(t.owner);
  // Fallback: nearest unit's kingdom
  let best = null, bd = 50 * 50;
  for (const u of units) {
    if (u.dead || !u.kingdom) continue;
    const d = dist2(u.x, u.y, x, y);
    if (d < bd) { bd = d; best = u; }
  }
  return best && best.kingdom ? kingdoms.get(best.kingdom) : null;
}
function doSpite(x, y) {
  const k = pickKingdomAt(x, y);
  if (!k) { effects.push({ type: 'nomana', x, y, life: 14 }); return; }
  // This kingdom becomes hated by all
  for (const [, other] of kingdoms) {
    if (other === k) continue;
    other.relations.set(k.id, -100);
    k.relations.set(other.id, -100);
    other.allies.delete(k.id); k.allies.delete(other.id);
    // Immediately declare war
    if (!other.wars.has(k.id)) {
      other.wars.add(k.id); k.wars.add(other.id);
    }
    // Cancel any peace plots
    other.peacePlots.delete(k.id); k.peacePlots.delete(other.id);
    other.warPlots.delete(k.id); k.warPlots.delete(other.id);
  }
  log('💢 ' + format(window.wbLang.evtSpite || '{a} is despised by all kingdoms!', { a: k.name }));
  effects.push({ type: 'spite', x: k.x, y: k.y, life: 60 });
}
function doInspect(x, y) {
  const k = pickKingdomAt(x, y);
  if (!k) { effects.push({ type: 'nomana', x, y, life: 14 }); return; }
  showKingdomInfo(k);
}

function showKingdomInfo(k) {
  const m = document.getElementById('wb-info-modal');
  if (!m) return;
  const t = window.wbLang || {};
  // Title
  const titleEl = document.getElementById('wb-info-title');
  if (titleEl) {
    const traits = k.kingTraits.map(tr => KING_TRAITS[tr].icon).join(' ');
    titleEl.innerHTML = `<span style="color:${k.color};">⬛</span> ${k.name} ${traits}`;
  }
  // Body
  const body = document.getElementById('wb-info-body');
  if (!body) { m.style.display = 'flex'; return; }
  const techName = (t.techNames && t.techNames[TECH_NAMES[k.tech]]) || TECH_NAMES[k.tech];
  const raceName = raceLabel(k.race);
  const ageK = year - k.foundedYear;
  // Wars
  const warList = Array.from(k.wars).map(id => {
    const o = kingdoms.get(id); return o ? `<span style="color:${o.color}">⬛</span> ${o.name}` : '?';
  }).join(', ') || '—';
  // Allies
  const allyList = Array.from(k.allies).map(id => {
    const o = kingdoms.get(id); return o ? `<span style="color:${o.color}">⬛</span> ${o.name}` : '?';
  }).join(', ') || '—';
  // Plots
  const warPlots = Array.from(k.warPlots.keys()).map(id => {
    const o = kingdoms.get(id); return o ? `${o.name} (${k.warPlots.get(id).countdown}y)` : '?';
  }).join(', ') || '—';
  const peacePlots = Array.from(k.peacePlots.keys()).map(id => {
    const o = kingdoms.get(id); return o ? `${o.name} (${k.peacePlots.get(id).countdown}y)` : '?';
  }).join(', ') || '—';
  // Top relations (≥3 strongest by |value|)
  const rels = Array.from(k.relations.entries())
    .filter(([id]) => kingdoms.has(id))
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 6);
  const relRows = rels.map(([id, v]) => {
    const o = kingdoms.get(id);
    const color = v > 30 ? '#86efac' : v < -30 ? '#fca5a5' : '#cbd5e1';
    return `<tr><td><span style="color:${o.color}">⬛</span> ${o.name}</td><td style="color:${color};text-align:right;">${Math.round(v)}</td></tr>`;
  }).join('') || '<tr><td colspan="2">—</td></tr>';
  // Buildings count
  const towerCount = buildings.filter(b => b.kingdom === k.id && b.type === B_TOWER && !b.dead).length;
  const hallStatus = buildings.find(b => b.kingdom === k.id && b.type === B_HALL && !b.dead);
  const hallHpStr = hallStatus ? `${Math.round(hallStatus.hp)}/${hallStatus.maxHp}` : '✖';

  body.innerHTML = `
    <div class="wb-info-grid">
      <div class="wb-info-row"><b>${t.race || 'Race'}:</b> <span>${raceName}</span></div>
      <div class="wb-info-row"><b>${t.tech || 'Tech'}:</b> <span>${TECH_LABELS_EMOJI[k.tech]} ${techName}</span></div>
      <div class="wb-info-row"><b>${t.kingdomAge || 'Age'}:</b> <span>${ageK}y</span></div>
      <div class="wb-info-row"><b>👥 ${t.population || 'Pop'}:</b> <span>${k.pop} (max ever ${k.maxPopEver})</span></div>
      <div class="wb-info-row"><b>🗺 ${t.territory || 'Territory'}:</b> <span>${k.territorySize} ${t.tiles || 'tiles'}</span></div>
      <div class="wb-info-row"><b>🏛 ${t.townhall || 'Town Hall'}:</b> <span>${hallHpStr}</span></div>
      <div class="wb-info-row"><b>🗼 ${t.towers || 'Towers'}:</b> <span>${towerCount}</span></div>
      <div class="wb-info-row"><b>❤️ ${t.loyalty || 'Loyalty'}:</b> <span>${Math.round(k.loyalty)}%</span></div>
    </div>
    <div class="wb-info-section"><b>⚔ ${t.atWar || 'At war with'}:</b> ${warList}</div>
    <div class="wb-info-section"><b>🤝 ${t.alliedWith || 'Allied with'}:</b> ${allyList}</div>
    <div class="wb-info-section"><b>📜 ${t.warPlots || 'Plotting war on'}:</b> ${warPlots}</div>
    <div class="wb-info-section"><b>🕊 ${t.peacePlots || 'Negotiating peace'}:</b> ${peacePlots}</div>
    <div class="wb-info-section"><b>📊 ${t.relations || 'Relations'}:</b>
      <table class="wb-info-table">${relRows}</table>
    </div>
  `;
  m.style.display = 'flex';
  // Highlight on map
  window._inspectedKingdomId = k.id;
}

function doFriendship(x, y) {
  const k = pickKingdomAt(x, y);
  if (!k) { effects.push({ type: 'nomana', x, y, life: 14 }); return; }
  // This kingdom becomes loved by all — clear wars, form alliances
  for (const [, other] of kingdoms) {
    if (other === k) continue;
    other.relations.set(k.id, 100);
    k.relations.set(other.id, 100);
    other.wars.delete(k.id); k.wars.delete(other.id);
    other.warPlots.delete(k.id); k.warPlots.delete(other.id);
    other.peacePlots.delete(k.id); k.peacePlots.delete(other.id);
    other.allies.add(k.id); k.allies.add(other.id);
  }
  log('💞 ' + format(window.wbLang.evtFriendship || '{a} is loved by all kingdoms', { a: k.name }));
  effects.push({ type: 'friendship', x: k.x, y: k.y, life: 60 });
}

function paintTile(px, py, brush, type) {
  const r = brush;
  const cx = Math.floor(px / TILE_PX);
  const cy = Math.floor(py / TILE_PX);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx*dx + dy*dy > r*r + 0.2) continue;
    const ny = cy + dy, nx = cx + dx;
    if (ny >= 0 && ny < WORLD_H && nx >= 0 && nx < WORLD_W) {
      tiles[ny][nx].type = type;
      tiles[ny][nx].fire = 0;
    }
  }
}

function doLightning(x, y) {
  effects.push({ type: 'lightning', x, y, life: 22 });
  for (const u of units) {
    if (u.dead) continue;
    if (dist2(u.x, u.y, x, y) < 28 * 28) u.hp -= 18;
  }
  const tx = Math.floor(x / TILE_PX), ty = Math.floor(y / TILE_PX);
  const t = tiles[ty] && tiles[ty][tx];
  if (t && (t.type === T_GRASS || t.type === T_FOREST)) t.fire = 100;
}

function doFire(x, y, brush) {
  const r = Math.max(1, brush);
  const cx = Math.floor(x / TILE_PX), cy = Math.floor(y / TILE_PX);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx*dx + dy*dy > r*r + 0.2) continue;
    const ny = cy + dy, nx = cx + dx;
    if (ny >= 0 && ny < WORLD_H && nx >= 0 && nx < WORLD_W) {
      const t = tiles[ny][nx];
      if (t.type === T_GRASS || t.type === T_FOREST || t.type === T_SAND) t.fire = 100;
    }
  }
  effects.push({ type: 'firepoint', x, y, life: 14 });
}

function doTornado(x, y) {
  effects.push({ type: 'tornado', x, y, vx: rand(-1, 1), vy: rand(-1, 1), life: 220 });
}

function doPlague(x, y, brush) {
  const R = 70 + brush * 10;
  for (const u of units) {
    if (u.dead) continue;
    if (dist2(u.x, u.y, x, y) < R * R && Math.random() < 0.45) {
      u.plague = 500 + Math.random() * 400;
    }
  }
  effects.push({ type: 'plague', x, y, r: R, life: 40 });
}

function doFinger(x, y) {
  let best = null, bd = 36 * 36;
  for (const u of units) {
    if (u.dead) continue;
    const d = dist2(u.x, u.y, x, y);
    if (d < bd) { bd = d; best = u; }
  }
  if (best) {
    best.hp = -999; best.die('finger');
    effects.push({ type: 'finger', x: best.x, y: best.y, life: 20 });
  }
}

function doHeal(x, y, brush) {
  const R = 50 + brush * 10;
  for (const u of units) {
    if (u.dead) continue;
    if (dist2(u.x, u.y, x, y) < R * R) {
      u.hp = Math.min(u.maxHp, u.hp + 18);
      u.plague = 0;
    }
  }
  effects.push({ type: 'heal', x, y, r: R, life: 26 });
}

function doPeace() {
  for (const [, k] of kingdoms) k.wars.clear();
  log(window.wbLang.evtPeace);
  effects.push({ type: 'peace', x: VIEW_W / 2, y: VIEW_H / 2, life: 60 });
  unlockAch('a_peacemaker');
}

function spawnAt(x, y, race) {
  // Don't spawn on water/mountain — nudge to nearest passable tile
  const tx = Math.floor(x / TILE_PX), ty = Math.floor(y / TILE_PX);
  const t = tiles[ty] && tiles[ty][tx];
  if (!t) return;
  if (t.type === T_WATER || t.type === T_MOUNTAIN || t.type === T_LAVA) {
    t.type = T_GRASS;
  }
  const count = brushSize === 1 ? 1 : brushSize === 2 ? 3 : 6;
  for (let i = 0; i < count; i++) {
    units.push(new Unit(x + rand(-8, 8), y + rand(-8, 8), race));
  }
}

// =================================================================
// TILE UPDATES (fire spread, regrowth)
// =================================================================
function updateTiles() {
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const t = tiles[y][x];
      if (t.fire > 0) {
        t.fire -= 2;
        if (t.fire === 50) {
          if (t.type === T_FOREST) t.type = T_GRASS;
          else if (t.type === T_GRASS) t.type = T_BURNT;
        }
        if (t.fire <= 0 && t.type === T_GRASS) t.type = T_BURNT;
        // Spread
        if (Math.random() < 0.08) {
          for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const n = tiles[y + dy] && tiles[y + dy][x + dx];
            if (n && (n.type === T_GRASS || n.type === T_FOREST) && n.fire === 0) {
              n.fire = 80; break;
            }
          }
        }
      }
      // Burnt soil slowly regrows to grass
      if (t.type === T_BURNT && Math.random() < 0.0008) t.type = T_GRASS;
      // Grass occasionally grows forest nearby
      if (t.type === T_GRASS && Math.random() < 0.0003) {
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          const n = tiles[y + dy] && tiles[y + dy][x + dx];
          if (n && n.type === T_FOREST) { t.type = T_FOREST; break; }
        }
      }
      // Lava cools to mountain at edges
      if (t.type === T_LAVA && Math.random() < 0.0005) {
        let hasNonLavaNeighbor = false;
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          const n = tiles[y + dy] && tiles[y + dy][x + dx];
          if (n && n.type !== T_LAVA) hasNonLavaNeighbor = true;
        }
        if (hasNonLavaNeighbor) t.type = T_MOUNTAIN;
      }
    }
  }
}

// =================================================================
// EFFECTS
// =================================================================
function updateEffects() {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life--;
    if (e.type === 'tornado') {
      e.x += e.vx; e.y += e.vy;
      for (const u of units) {
        if (u.dead) continue;
        const d = dist2(u.x, u.y, e.x, e.y);
        if (d < 20 * 20) {
          u.hp -= 0.6;
          const a = Math.atan2(u.y - e.y, u.x - e.x);
          u.vx += Math.cos(a) * 0.6;
          u.vy += Math.sin(a) * 0.6;
        }
      }
      if (e.x < 0 || e.x > VIEW_W || e.y < 0 || e.y > VIEW_H) e.life = 0;
    } else if (e.type === 'arrow' || e.type === 'magic') {
      // Travel toward target
      const tgt = e.target;
      if (!tgt || tgt.dead) { e.life = 0; }
      else {
        const dx = tgt.x - e.x, dy = tgt.y - e.y;
        const d = Math.sqrt(dx*dx + dy*dy) || 1;
        const sp = e.type === 'arrow' ? 4 : 3;
        e.x += (dx / d) * sp;
        e.y += (dy / d) * sp;
        if (d < 5) {
          // Impact
          tgt.hp -= e.dmg;
          effects.push({ type: 'hit', x: tgt.x, y: tgt.y, life: 10 });
          if (e.shooter && tgt.hp <= 0 && !tgt.dead) e.shooter.checkKill(tgt);
          e.life = 0;
        }
      }
    }
    if (e.life <= 0) effects.splice(i, 1);
  }
}

function drawEffects() {
  for (const e of effects) {
    if (e.type === 'hit') {
      ctx.fillStyle = 'rgba(239, 68, 68, ' + (e.life / 10) + ')';
      ctx.fillRect(e.x - 3, e.y - 3, 6, 6);
    } else if (e.type === 'die') {
      ctx.fillStyle = 'rgba(248, 113, 113, ' + (e.life / 18) + ')';
      ctx.beginPath();
      ctx.arc(e.x, e.y, (18 - e.life) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'heart') {
      const t = e.life / 28;
      ctx.fillStyle = 'rgba(244, 114, 182, ' + t + ')';
      ctx.font = '10px serif';
      const rise = (28 - e.life) * 0.5;
      ctx.fillText('♥', e.x - 3, e.y - rise);
    } else if (e.type === 'matehalo') {
      const t = (30 - e.life) / 30;
      ctx.strokeStyle = 'rgba(244, 114, 182, ' + (1 - t) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 4 + t * 14, 0, Math.PI * 2);
      ctx.stroke();
      // Pink particles
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + e.life * 0.1;
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(e.x + Math.cos(a) * (4 + t * 12), e.y + Math.sin(a) * (4 + t * 12), 1.4, 1.4);
      }
    } else if (e.type === 'lightning') {
      // jagged line
      ctx.strokeStyle = 'rgba(254, 240, 138, ' + (e.life / 22) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x + rand(-2, 2), 0);
      let ly = 0;
      while (ly < e.y) {
        ly += 8;
        ctx.lineTo(e.x + rand(-6, 6), ly);
      }
      ctx.stroke();
      // ground flash
      ctx.fillStyle = 'rgba(254, 240, 138, ' + (e.life / 30) + ')';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 16, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'firepoint') {
      ctx.fillStyle = 'rgba(249, 115, 22, ' + (e.life / 14) + ')';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'tornado') {
      ctx.strokeStyle = 'rgba(229, 231, 235, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.3) {
        const rr = 4 + a * 2;
        const px = e.x + Math.cos(a + e.life * 0.4) * rr;
        const py = e.y + Math.sin(a + e.life * 0.4) * rr - a * 1.2;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (e.type === 'plague') {
      ctx.strokeStyle = 'rgba(132, 204, 22, ' + (e.life / 40) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * (1 - e.life / 40), 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.type === 'heal') {
      ctx.strokeStyle = 'rgba(34, 197, 94, ' + (e.life / 26) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * (1 - e.life / 26), 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.type === 'finger') {
      ctx.strokeStyle = 'rgba(15, 23, 42, ' + (e.life / 20) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 15 - e.life * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.type === 'peace') {
      ctx.strokeStyle = 'rgba(248, 250, 252, ' + (e.life / 60) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(e.x, e.y, (60 - e.life) * 8, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.type === 'meteor') {
      // Falling streak
      const prog = (60 - e.life) / 60;
      if (prog < 0.8) {
        const start = -100, stop = e.y;
        const py = start + (stop - start) * (prog / 0.8);
        const px = e.x + 60 * (1 - prog / 0.8);
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.85)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(px + 30, py - 30);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Impact flash
        const t = (e.life) / 12;
        ctx.fillStyle = 'rgba(254, 240, 138, ' + Math.max(0, t) + ')';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 70 - e.life * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(239, 68, 68, ' + Math.max(0, t * 0.6) + ')';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 110 - e.life * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'acidstorm') {
      ctx.strokeStyle = 'rgba(132, 204, 22, ' + (e.life / 60) + ')';
      ctx.lineWidth = 3;
      for (let a = 0; a < 3; a++) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, 130 * (1 - (e.life + a * 6) / 60), 0, Math.PI * 2);
        ctx.stroke();
      }
      // raindrop bits
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.random() * 130;
        ctx.fillStyle = 'rgba(190, 242, 100, 0.7)';
        ctx.fillRect(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr, 2, 4);
      }
    } else if (e.type === 'nuke') {
      const t = (80 - e.life) / 80;
      const R = t * 280;
      // Mushroom flash core
      const grd = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, R);
      grd.addColorStop(0, 'rgba(254, 243, 199, 0.9)');
      grd.addColorStop(0.4, 'rgba(249, 115, 22, 0.7)');
      grd.addColorStop(0.8, 'rgba(127, 29, 29, 0.5)');
      grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(e.x, e.y, R, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'rain') {
      ctx.strokeStyle = 'rgba(56, 189, 248, ' + (e.life / 50) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * (1 - e.life / 50), 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.random() * e.r;
        ctx.fillStyle = 'rgba(96, 165, 250, 0.6)';
        ctx.fillRect(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr - 2, 1, 4);
      }
    } else if (e.type === 'nomana') {
      ctx.fillStyle = 'rgba(127, 29, 29, ' + (e.life / 14) + ')';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('✖', e.x - 4, e.y + 4);
    } else if (e.type === 'arrow') {
      const dx = (e.tx - e.x), dy = (e.ty - e.y);
      const ang = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(ang);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(-3, -0.5, 6, 1);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-3, -1, 1.5, 2);  // fletching
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(3, 0); ctx.lineTo(1.5, -1); ctx.lineTo(1.5, 1); ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (e.type === 'magic') {
      const pulse = 1 + 0.2 * Math.sin(e.life * 0.4);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.85)';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 2.4 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(240, 171, 252, 0.9)';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 1.0 * pulse, 0, Math.PI * 2);
      ctx.fill();
      // sparkle trail
      ctx.fillStyle = 'rgba(192, 132, 252, 0.5)';
      for (let k = 1; k < 4; k++) {
        const t = k * 2;
        ctx.fillRect(e.x - t * 0.4, e.y - t * 0.2, 1, 1);
      }
    } else if (e.type === 'healspark') {
      ctx.fillStyle = 'rgba(34, 197, 94, ' + (e.life / 18) + ')';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + e.life * 0.1;
        const r = 4 + (18 - e.life) * 0.4;
        ctx.fillRect(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 1.2, 1.2);
      }
      ctx.fillStyle = '#bbf7d0';
      ctx.font = 'bold 7px sans-serif';
      ctx.fillText('+', e.x - 2, e.y - 4);
    } else if (e.type === 'downed') {
      ctx.fillStyle = 'rgba(250, 204, 21, ' + (e.life / 22) + ')';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('💤', e.x - 4, e.y);
    } else if (e.type === 'rubble') {
      // Dust burst on building destruction
      const t = (90 - e.life) / 90;
      ctx.fillStyle = 'rgba(120, 113, 108, ' + (1 - t) + ')';
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const r = 4 + t * 24;
        ctx.beginPath();
        ctx.arc(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r - t * 6, 2 - t * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Debris
      if (e.life > 60) {
        ctx.fillStyle = '#52525b';
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          ctx.fillRect(e.x + Math.cos(a) * (e.life - 60) * 0.6, e.y + Math.sin(a) * (e.life - 60) * 0.4, 1.5, 1.5);
        }
      }
    } else if (e.type === 'spite') {
      const t = (60 - e.life) / 60;
      ctx.strokeStyle = 'rgba(220, 38, 38, ' + (1 - t) + ')';
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, 12 + t * 60 + k * 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('💢', e.x - 5, e.y + 3);
    } else if (e.type === 'friendship') {
      const t = (60 - e.life) / 60;
      ctx.strokeStyle = 'rgba(236, 72, 153, ' + (1 - t) + ')';
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, 12 + t * 60 + k * 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('💞', e.x - 5, e.y + 3);
    }
  }
}

function drawScreenEffects() {
  for (const e of effects) {
    if (e.type !== 'achievement') continue;
    const t = e.life > 160 ? (180 - e.life) / 20 : e.life < 30 ? e.life / 30 : 1;
    ctx.font = 'bold 14px sans-serif';
    const w = ctx.measureText(e.text).width + 40;
    ctx.fillStyle = 'rgba(15, 23, 42, ' + 0.9 * t + ')';
    ctx.fillRect(VIEW_W / 2 - w / 2, 18, w, 28);
    ctx.strokeStyle = 'rgba(250, 204, 21, ' + t + ')';
    ctx.lineWidth = 2;
    ctx.strokeRect(VIEW_W / 2 - w / 2, 18, w, 28);
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.fillText(e.text, VIEW_W / 2, 37);
    ctx.textAlign = 'start';
  }
}

// =================================================================
// TERRITORY OVERLAY
// =================================================================
function drawTerritory() {
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const t = tiles[y][x];
      if (!t.owner) continue;
      const k = kingdoms.get(t.owner);
      if (!k) continue;
      // Tinted overlay
      ctx.fillStyle = k.color;
      ctx.globalAlpha = 0.16;
      ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      ctx.globalAlpha = 1;
      // Border: if neighbor isn't same owner, draw a line
      const top = tiles[y - 1] && tiles[y - 1][x];
      const bot = tiles[y + 1] && tiles[y + 1][x];
      const left = tiles[y] && tiles[y][x - 1];
      const right = tiles[y] && tiles[y][x + 1];
      ctx.strokeStyle = k.color;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (!top || top.owner !== t.owner) { ctx.moveTo(x * TILE_PX, y * TILE_PX); ctx.lineTo((x+1) * TILE_PX, y * TILE_PX); }
      if (!bot || bot.owner !== t.owner) { ctx.moveTo(x * TILE_PX, (y+1) * TILE_PX); ctx.lineTo((x+1) * TILE_PX, (y+1) * TILE_PX); }
      if (!left || left.owner !== t.owner) { ctx.moveTo(x * TILE_PX, y * TILE_PX); ctx.lineTo(x * TILE_PX, (y+1) * TILE_PX); }
      if (!right || right.owner !== t.owner) { ctx.moveTo((x+1) * TILE_PX, y * TILE_PX); ctx.lineTo((x+1) * TILE_PX, (y+1) * TILE_PX); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

// =================================================================
// DIPLOMACY VISUALIZATION
// =================================================================
function drawDiplomacy() {
  const ks = Array.from(kingdoms.values());
  if (ks.length < 2) return;
  const t = frameCount;
  for (let i = 0; i < ks.length; i++) {
    for (let j = i + 1; j < ks.length; j++) {
      const a = ks[i], b = ks[j];
      if (a.allies.has(b.id)) {
        // Alliance line — pulsing blue
        ctx.strokeStyle = 'rgba(56, 189, 248, ' + (0.5 + 0.2 * Math.sin(t * 0.04)) + ')';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (a.wars.has(b.id)) {
        // War line — solid red with skull midpoint
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.8)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 6px sans-serif';
        ctx.fillStyle = '#fef3c7';
        ctx.fillText('⚔', (a.x + b.x) / 2 - 3, (a.y + b.y) / 2 + 2);
      } else if (a.warPlots.has(b.id)) {
        // Plotting war — dashed amber
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (a.peacePlots.has(b.id)) {
        // Peace negotiation — dashed green
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
  // Draw king trait icons above each capital
  for (const k of ks) {
    if (!k.kingTraits.length) continue;
    ctx.font = 'bold 6px sans-serif';
    const off = k.cityKind() === 'city' ? 22 : k.cityKind() === 'town' ? 18 : 14;
    let dx = -k.kingTraits.length * 3.5;
    for (const tr of k.kingTraits) {
      const def = KING_TRAITS[tr];
      ctx.fillStyle = def.color;
      ctx.fillText(def.icon, k.x + dx, k.y - off);
      dx += 7;
    }
  }
  // Highlight inspected kingdom
  if (window._inspectedKingdomId) {
    const k = kingdoms.get(window._inspectedKingdomId);
    if (k) {
      const pulse = 0.5 + 0.4 * Math.sin(frameCount * 0.1);
      ctx.strokeStyle = `rgba(34, 211, 238, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(k.x, k.y, 28, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// =================================================================
// BUILDINGS RENDER
// =================================================================
function drawBuildings() {
  // Sort by y for depth
  const sorted = buildings.slice().sort((a, b) => a.y - b.y);
  for (const b of sorted) {
    if (b.type === B_HALL) drawTownHall(b);
    else if (b.type === B_TOWER) drawTower(b);
  }
}

function drawTownHall(b) {
  const k = kingdoms.get(b.kingdom);
  if (!k) return;
  if (b.dead) { drawRubble(b.x, b.y, 14); return; }
  // Forward to existing drawCity, sized by kingdom population for backward compatibility
  const kind = k.cityKind() || 'tent';
  drawCity(b.x, b.y, kind, k.color, k.tech || 0);
  // Damage cracks overlay
  if (b.isDamaged()) drawDamageOverlay(b.x, b.y, 16, b.hp / b.maxHp);
  // HP bar
  if (b.hp < b.maxHp * 0.99 || !b.isComplete()) drawBuildingHpBar(b, 18);
}

function drawTower(b) {
  const k = kingdoms.get(b.kingdom);
  const color = k ? k.color : '#a3a3a3';
  const tech = k ? k.tech : 0;
  const x = b.x, y = b.y;
  if (b.dead) { drawRubble(x, y, 8); return; }
  // Construction stage
  const prog = Math.max(0, Math.min(100, b.constructProg));
  if (prog < 100) {
    // Scaffolding / partial tower
    const heightPct = prog / 100;
    ctx.fillStyle = 'rgba(120, 113, 108, ' + (0.5 + heightPct * 0.5) + ')';
    ctx.fillRect(x - 4, y + 4 - (16 * heightPct), 8, 16 * heightPct);
    // Scaffold lines
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 4); ctx.lineTo(x + 5, y + 4);
    ctx.stroke();
    return;
  }
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 6, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stone color by tech
  const stone = tech >= 3 ? '#52525b' : tech >= 2 ? '#71717a' : tech >= 1 ? '#a3a3a3' : '#a16207';
  // Tower base
  ctx.fillStyle = stone;
  ctx.fillRect(x - 4, y - 4, 8, 10);
  // Stone block lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y);
  ctx.moveTo(x, y - 4); ctx.lineTo(x, y);
  ctx.moveTo(x - 2, y); ctx.lineTo(x - 2, y + 6);
  ctx.moveTo(x + 2, y); ctx.lineTo(x + 2, y + 6);
  ctx.stroke();
  // Arrow slits
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(x - 1, y - 3, 0.8, 2.4);
  ctx.fillRect(x + 0.2, y - 3, 0.8, 2.4);
  // Battlements (top)
  ctx.fillStyle = stone;
  ctx.fillRect(x - 5, y - 6, 2, 2);
  ctx.fillRect(x - 1, y - 6, 2, 2);
  ctx.fillRect(x + 3, y - 6, 2, 2);
  // Conical roof (Iron+)
  if (tech >= 2) {
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 5);
    ctx.lineTo(x, y - 11);
    ctx.lineTo(x + 4, y - 5);
    ctx.closePath();
    ctx.fill();
    // Flag pole on roof
    ctx.fillStyle = '#a3a3a3';
    ctx.fillRect(x - 0.4, y - 14, 0.8, 4);
    // Flag
    const wave = Math.sin(frameCount * 0.1 + x * 0.1) * 0.5;
    ctx.fillStyle = color;
    ctx.fillRect(x + 0.4, y - 14, 3 + wave, 2);
  } else {
    // Simple flag for Stone/Bronze
    ctx.fillStyle = '#a3a3a3';
    ctx.fillRect(x - 0.4, y - 9, 0.8, 4);
    ctx.fillStyle = color;
    ctx.fillRect(x + 0.4, y - 9, 2.5, 1.6);
  }
  // Damaged overlay
  if (b.isDamaged()) drawDamageOverlay(x, y, 7, b.hp / b.maxHp);
  // HP bar
  if (b.hp < b.maxHp * 0.99) drawBuildingHpBar(b, 10);
  // Range ring while shooting (subtle pulse)
  if (b.attackCd > 0 && b.attackCd > 40) {
    const s = b.stats();
    const pulse = 0.3 + 0.2 * Math.sin(frameCount * 0.4);
    ctx.strokeStyle = 'rgba(254, 240, 138, ' + pulse + ')';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(x, y, s.range, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawDamageOverlay(x, y, sz, ratio) {
  // Cracks proportional to damage
  const dmg = 1 - ratio;
  ctx.strokeStyle = 'rgba(0, 0, 0, ' + (0.3 + 0.5 * dmg) + ')';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x - sz * 0.4, y - sz * 0.3);
  ctx.lineTo(x - sz * 0.1, y);
  ctx.lineTo(x - sz * 0.2, y + sz * 0.3);
  ctx.stroke();
  if (dmg > 0.5) {
    ctx.beginPath();
    ctx.moveTo(x + sz * 0.3, y - sz * 0.2);
    ctx.lineTo(x + sz * 0.1, y + sz * 0.1);
    ctx.lineTo(x + sz * 0.3, y + sz * 0.4);
    ctx.stroke();
  }
  if (dmg > 0.7) {
    // Smoke
    ctx.fillStyle = 'rgba(115, 115, 115, 0.6)';
    const sp = (frameCount * 0.1) % 8;
    ctx.beginPath();
    ctx.arc(x + sz * 0.2, y - sz * 0.8 - sp, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawRubble(x, y, sz) {
  ctx.fillStyle = '#52525b';
  ctx.fillRect(x - sz * 0.5, y, sz, sz * 0.4);
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(x - sz * 0.3, y - 2, sz * 0.4, sz * 0.3);
  ctx.fillRect(x + sz * 0.1, y - 1, sz * 0.3, sz * 0.4);
  // Smoke
  for (let i = 0; i < 3; i++) {
    const off = (frameCount * 0.1 + i * 4) % 10;
    ctx.fillStyle = 'rgba(120, 113, 108, ' + (0.5 - off * 0.04) + ')';
    ctx.beginPath();
    ctx.arc(x + Math.sin(off * 0.5) * 2, y - 2 - off, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawBuildingHpBar(b, w) {
  const ratio = Math.max(0, b.hp / b.maxHp);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(b.x - w / 2, b.y - (b.type === B_TOWER ? 18 : 22), w, 1.6);
  ctx.fillStyle = ratio < 0.3 ? '#dc2626' : ratio < 0.6 ? '#facc15' : '#22c55e';
  ctx.fillRect(b.x - w / 2, b.y - (b.type === B_TOWER ? 18 : 22), w * ratio, 1.6);
  if (!b.isComplete()) {
    // Construction progress bar (yellow)
    const prog = b.constructProg / 100;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(b.x - w / 2, b.y + 8, w, 1.4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(b.x - w / 2, b.y + 8, w * prog, 1.4);
  }
}
function drawCity(x, y, kind, color, tech) {
  ctx.save();
  const sz = kind === 'city' ? 14 : kind === 'town' ? 11 : kind === 'village' ? 9 : 7;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + sz / 2 + 1, sz * 0.7, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Banner pole
  ctx.fillStyle = '#a3a3a3';
  ctx.fillRect(x - 0.6, y - sz - 8, 1.2, 8);
  // Flag (waving)
  const wave = Math.sin(frameCount * 0.08 + x * 0.1) * 0.6;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + 0.6, y - sz - 8);
  ctx.lineTo(x + 5.5 + wave, y - sz - 7);
  ctx.lineTo(x + 5.5 - wave, y - sz - 5);
  ctx.lineTo(x + 0.6, y - sz - 4);
  ctx.closePath();
  ctx.fill();
  // House body — stone-by-tech
  const bodyColor = tech >= 3 ? '#525252' : tech >= 2 ? '#78716c' : tech >= 1 ? '#a16207' : '#92400e';
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
  // Stone block lines for higher tech
  if (tech >= 1) {
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x - sz / 2, y - 1); ctx.lineTo(x + sz / 2, y - 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 0.5, y - sz / 2); ctx.lineTo(x - 0.5, y + sz / 2);
    ctx.stroke();
  }
  // Door
  ctx.fillStyle = '#451a03';
  ctx.fillRect(x - 1.5, y + sz / 2 - 4, 3, 4);
  // Roof
  ctx.fillStyle = tech >= 2 ? '#7f1d1d' : '#92400e';
  ctx.beginPath();
  ctx.moveTo(x - sz / 2 - 1, y - sz / 2);
  ctx.lineTo(x, y - sz - 1);
  ctx.lineTo(x + sz / 2 + 1, y - sz / 2);
  ctx.closePath();
  ctx.fill();
  // Roof shading
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.moveTo(x, y - sz - 1);
  ctx.lineTo(x + sz / 2 + 1, y - sz / 2);
  ctx.lineTo(x + 1, y - sz / 2);
  ctx.closePath();
  ctx.fill();
  // Window
  if (sz >= 9) {
    ctx.fillStyle = '#fde047';
    const ws = Math.floor(sz / 3);
    ctx.fillRect(x - ws / 2, y - 1, ws, ws);
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y - 1); ctx.lineTo(x, y - 1 + ws);
    ctx.moveTo(x - ws / 2, y - 1 + ws / 2); ctx.lineTo(x - ws / 2 + ws, y - 1 + ws / 2);
    ctx.stroke();
  }
  // Chimney + smoke for towns and bigger
  if (kind === 'town' || kind === 'city') {
    ctx.fillStyle = '#525252';
    ctx.fillRect(x + sz / 3, y - sz - 1, 1.4, 3);
    // Smoke
    for (let s = 0; s < 3; s++) {
      const phase = (frameCount * 0.05 + s * 6) % 20;
      const sy = y - sz - 3 - phase * 0.6;
      const sx = x + sz / 3 + 0.5 + Math.sin(phase * 0.4) * 1;
      ctx.fillStyle = `rgba(180, 180, 180, ${0.6 - phase * 0.03})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2 + phase * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Surrounding small houses for towns/cities
  if (kind === 'town' || kind === 'city') {
    const count = kind === 'city' ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const ox = Math.cos(a) * (sz + 5);
      const oy = Math.sin(a) * (sz + 5);
      ctx.fillStyle = tech >= 2 ? '#78716c' : '#92400e';
      ctx.fillRect(x + ox - 3, y + oy - 3, 6, 6);
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(x + ox - 4, y + oy - 3);
      ctx.lineTo(x + ox, y + oy - 6);
      ctx.lineTo(x + ox + 4, y + oy - 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.fillRect(x + ox - 0.5, y + oy - 1, 1, 1.5);
    }
  }
  // Castle walls for cities
  if (kind === 'city' && tech >= 3) {
    ctx.strokeStyle = '#525252';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, sz + 8, 0, Math.PI * 2);
    ctx.stroke();
    // Crenellations
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.fillStyle = '#525252';
      ctx.fillRect(x + Math.cos(a) * (sz + 8) - 0.8, y + Math.sin(a) * (sz + 8) - 0.8, 1.6, 1.6);
    }
  }
  ctx.restore();
}

// =================================================================
// DAY/NIGHT TINT
// =================================================================
function drawDayNightTint() {
  // dayPhase: 0..1 within each year
  // 0..0.55 day, 0.55..0.65 dusk, 0.65..0.95 night, 0.95..1 dawn
  let alpha = 0, color = '#000';
  if (dayPhase >= 0.55 && dayPhase < 0.65) {
    const t = (dayPhase - 0.55) / 0.10;
    alpha = t * 0.45; color = '#f97316'; // orange dusk
  } else if (dayPhase >= 0.65 && dayPhase < 0.95) {
    alpha = 0.45; color = '#1e293b'; // night blue
  } else if (dayPhase >= 0.95 && dayPhase < 1.0) {
    const t = (1.0 - dayPhase) / 0.05;
    alpha = t * 0.30; color = '#fb923c'; // dawn orange
  }
  if (alpha > 0) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;
  }
}

// =================================================================
// RENDER
// =================================================================
function render() {
  // Reset, then apply camera shake + zoom + pan
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let sx = 0, sy = 0;
  if (cameraShakeAmt > 0) {
    sx = (Math.random() - 0.5) * cameraShakeAmt * 0.4;
    sy = (Math.random() - 0.5) * cameraShakeAmt * 0.4;
  }
  // World transform: screen = (worldPoint - pan) * zoom + shake
  ctx.setTransform(zoom, 0, 0, zoom, sx - panX * zoom, sy - panY * zoom);
  // Cull: only redraw tiles that are visible
  // Tile pass — full redraw (96×64 = 6144 quads, well within budget)
  const time = frameCount;
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const t = tiles[y][x];
      const px = x * TILE_PX, py = y * TILE_PX;
      // Base
      ctx.fillStyle = TILE_COLORS[t.type];
      ctx.fillRect(px, py, TILE_PX, TILE_PX);
      // Per-tile detail (deterministic by coords for stability)
      const seed = (x * 73856093 ^ y * 19349663) & 0xFFFF;
      const rnd = (seed / 0xFFFF);
      if (t.type === T_GRASS) {
        // Random little flowers / tufts
        if (rnd > 0.85) {
          ctx.fillStyle = '#fde68a';  // yellow flower
          ctx.fillRect(px + 2 + (seed % 4), py + 2 + ((seed >> 4) % 4), 1.2, 1.2);
        } else if (rnd > 0.70) {
          ctx.fillStyle = '#16a34a';  // grass tuft
          ctx.fillRect(px + 3, py + 7, 1, 2);
        }
        // Wind shimmer
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(px, py + ((time * 0.1 + x + y) % TILE_PX), TILE_PX, 1);
      } else if (t.type === T_FOREST) {
        // Trees — vary size by seed
        const tx = px + 2 + (seed % 3);
        const ty = py + 1 + ((seed >> 3) % 3);
        // Trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(tx + 1.5, ty + 4, 1, 3);
        // Leaves
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(tx + 2, ty + 3, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(tx + 1.5, ty + 2.5, 1.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (t.type === T_MOUNTAIN) {
        // Triangle peak with snow cap
        ctx.fillStyle = '#a1a1aa';
        ctx.beginPath();
        ctx.moveTo(px + 1, py + TILE_PX - 1);
        ctx.lineTo(px + TILE_PX / 2, py + 1);
        ctx.lineTo(px + TILE_PX - 1, py + TILE_PX - 1);
        ctx.closePath();
        ctx.fill();
        // Snow cap
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.moveTo(px + TILE_PX / 2 - 1.5, py + 3);
        ctx.lineTo(px + TILE_PX / 2, py + 1);
        ctx.lineTo(px + TILE_PX / 2 + 1.5, py + 3);
        ctx.closePath();
        ctx.fill();
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.moveTo(px + TILE_PX / 2, py + 1);
        ctx.lineTo(px + TILE_PX / 2 + 0.8, py + 1.5);
        ctx.lineTo(px + TILE_PX - 1, py + TILE_PX - 1);
        ctx.lineTo(px + TILE_PX / 2, py + TILE_PX - 1);
        ctx.closePath();
        ctx.fill();
      } else if (t.type === T_LAVA) {
        // Bubbling pattern
        const phase = (time * 0.06 + seed) % 20;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(px + 3, py + 3, 1.4 + Math.sin(phase * 0.6) * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(px + 7, py + 6, 1.0 + Math.cos(phase * 0.7) * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (t.type === T_SNOW) {
        // Sparkle dots
        ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
        ctx.fillRect(px + 2 + (seed % 4), py + 2 + ((seed >> 4) % 4), 1, 1);
        if (rnd > 0.8) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(px + 6, py + 6, 1.2, 1.2);
        }
      } else if (t.type === T_SAND) {
        // dotted texture
        ctx.fillStyle = 'rgba(217, 119, 6, 0.4)';
        ctx.fillRect(px + 2 + (seed % 4), py + 2 + ((seed >> 4) % 4), 1, 1);
      } else if (t.type === T_WATER) {
        // ripples
        ctx.fillStyle = 'rgba(96, 165, 250, 0.35)';
        const yoff = (time * 0.05 + x * 0.5) % TILE_PX;
        ctx.fillRect(px, py + yoff, TILE_PX, 1);
      } else if (t.type === T_BURNT) {
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(px + (seed % 5), py + ((seed >> 4) % 5), 1, 1);
        ctx.fillRect(px + 5 + (seed % 3), py + 6, 1, 1);
      }
      // Fire overlay
      if (t.fire > 0) {
        const a = t.fire / 100;
        ctx.fillStyle = `rgba(239, 68, 68, ${0.45 * a})`;
        ctx.fillRect(px, py, TILE_PX, TILE_PX);
        // Flickering flame shape
        const fh = 4 + Math.sin(time * 0.5 + x + y) * 1.5;
        ctx.fillStyle = `rgba(251, 146, 60, ${0.9 * a})`;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + TILE_PX - 1);
        ctx.lineTo(px + TILE_PX / 2, py + TILE_PX - 1 - fh);
        ctx.lineTo(px + TILE_PX - 2, py + TILE_PX - 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(254, 240, 138, ${0.9 * a})`;
        ctx.beginPath();
        ctx.arc(px + TILE_PX / 2, py + TILE_PX - 2 - fh * 0.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Territory overlay (tinted tiles by kingdom)
  drawTerritory();

  // Diplomacy lines (war / peace plots / alliances)
  drawDiplomacy();

  // Buildings (kingdom centers) — drawn between tiles and units
  drawBuildings();

  // Units
  for (const u of units) if (!u.dead) u.draw(ctx);

  // Effects (world-space)
  drawEffects();

  // Brush preview (world-space)
  if (lastTouch.active && lastTouch.x >= 0) {
    const t = TOOL_DEFS.find(t => t.id === activeTool);
    const isTerrain = t && t.cat === 'terrain';
    const r = (isTerrain || activeTool === 'fire' || activeTool === 'plague' || activeTool === 'heal')
      ? brushSize * TILE_PX
      : 18;
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
    ctx.lineWidth = 1.5 / zoom;  // keep visually consistent
    ctx.beginPath();
    ctx.arc(lastTouch.x, lastTouch.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // === Back to screen space for overlays ===
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Day/night tint covers the whole canvas regardless of zoom
  drawDayNightTint();
  // Screen-space effects (achievement banner)
  drawScreenEffects();
}

// =================================================================
// UPDATE LOOP
// =================================================================
function tickWorld() {
  frameCount++;
  // Mana regen — 1 per 60 frames (1/s)
  manaRegen++;
  if (manaRegen >= 60) {
    manaRegen = 0;
    mana = Math.min(MAX_MANA, mana + 1);
  }
  // Day/night phase: 1 full cycle per game-year (240 frames)
  dayPhase = (frameCount % 240) / 240;
  // Tile updates every 30 frames
  if (frameCount % 30 === 0) updateTiles();
  // Year tick + kingdom recompute every 240 frames (1 year = 1 day cycle)
  if (frameCount % 240 === 0 && frameCount > 0) {
    year++;
    updateKingdoms();
    checkYearAchievements();
  }
  // Units
  for (const u of units) if (!u.dead) u.update();
  // V5: Buildings
  for (const b of buildings) if (!b.dead) b.update();
  // GC dead
  for (let i = units.length - 1; i >= 0; i--) if (units[i].dead) units.splice(i, 1);
  // Keep dead buildings briefly (rubble visual), then remove
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];
    if (b.dead) {
      b.deadTimer = (b.deadTimer || 0) + 1;
      if (b.deadTimer > 600) buildings.splice(i, 1);  // ~10 sec at x1
    }
  }
  updateEffects();
  // Camera shake decays
  if (cameraShakeAmt > 0) cameraShakeAmt = Math.max(0, cameraShakeAmt - 1);
}

function checkYearAchievements() {
  if (year >= 500) unlockAch('a_500_years');
  if (year >= 1000) unlockAch('a_1000_years');
  if (units.length >= 100) unlockAch('a_pop_100');
  if (kingdoms.size >= 5) unlockAch('a_world_war');
  // Diversity: all 4 mortal races have at least 5 alive
  const counts = [0,0,0,0];
  for (const u of units) if (!u.dead && u.race < MORTAL_RACES) counts[u.race]++;
  if (counts.every(c => c >= 5)) unlockAch('a_diversity');
  // Apocalypse: zero life on a populated world that previously had pop
  if (units.length === 0 && year > 5) unlockAch('a_apocalypse');
  // Inferno: 50+ tiles on fire
  let fireCount = 0;
  for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) if (tiles[y][x].fire > 0) fireCount++;
  if (fireCount >= 50) unlockAch('a_inferno');
}

function loop() {
  if (!paused) {
    for (let i = 0; i < speed; i++) tickWorld();
  }
  render();
  updateHUD();
  requestAnimationFrame(loop);
}

// =================================================================
// HUD
// =================================================================
function updateHUD() {
  document.getElementById('wb-year').textContent = year;
  document.getElementById('wb-pop').textContent = units.length;
  document.getElementById('wb-kingdoms').textContent = kingdoms.size;
  const counts = [0, 0, 0, 0, 0, 0, 0];
  let males = 0, females = 0, children = 0;
  for (const u of units) {
    if (u.dead) continue;
    counts[u.race]++;
    if (u.race < MORTAL_RACES) {
      if (u.age < 10) children++;
      if (u.sex === 'M') males++; else females++;
    }
  }
  document.getElementById('wb-pop-human').textContent = counts[0];
  document.getElementById('wb-pop-elf').textContent   = counts[1];
  document.getElementById('wb-pop-dwarf').textContent = counts[2];
  document.getElementById('wb-pop-orc').textContent   = counts[3];
  const maleEl = document.getElementById('wb-pop-male');   if (maleEl)   maleEl.textContent   = males;
  const femaleEl = document.getElementById('wb-pop-female'); if (femaleEl) femaleEl.textContent = females;
  const childEl = document.getElementById('wb-pop-child'); if (childEl) childEl.textContent = children;
  const sheepEl = document.getElementById('wb-pop-sheep'); if (sheepEl) sheepEl.textContent = counts[4];
  const wolfEl  = document.getElementById('wb-pop-wolf');  if (wolfEl)  wolfEl.textContent  = counts[5];
  const bearEl  = document.getElementById('wb-pop-bear');  if (bearEl)  bearEl.textContent  = counts[6];

  // Mana bar
  const manaFill = document.getElementById('wb-mana-fill');
  const manaText = document.getElementById('wb-mana-text');
  if (manaFill) manaFill.style.width = (mana / MAX_MANA) * 100 + '%';
  if (manaText) manaText.textContent = Math.floor(mana);
  const manaWrap = document.querySelector('.wb-mana');
  if (manaWrap) manaWrap.classList.toggle('low', mana < 20);

  // Day icon
  const dayIcon = document.getElementById('wb-day-icon');
  if (dayIcon) {
    if (dayPhase < 0.55) dayIcon.textContent = '☀️';
    else if (dayPhase < 0.65) dayIcon.textContent = '🌇';
    else if (dayPhase < 0.95) dayIcon.textContent = '🌙';
    else dayIcon.textContent = '🌅';
  }

  // Lock/unlock tool buttons by mana cost
  if (frameCount % 6 === 0) {
    document.querySelectorAll('.wb-tool').forEach(btn => {
      const id = btn.dataset.id;
      const def = TOOL_DEFS.find(t => t.id === id);
      if (def) btn.classList.toggle('locked', def.cost > 0 && mana < def.cost);
    });
  }
}

// =================================================================
// CANVAS RESIZE
// =================================================================
function resizeCanvas() {
  const wrap = document.getElementById('wb-canvas-wrap');
  if (!wrap) return;
  const maxW = wrap.clientWidth;
  const maxH = wrap.clientHeight;
  const scale = Math.min(maxW / VIEW_W, maxH / VIEW_H);
  canvas.style.width = (VIEW_W * scale) + 'px';
  canvas.style.height = (VIEW_H * scale) + 'px';
}
window.addEventListener('resize', () => { if (canvas) resizeCanvas(); });

// =================================================================
// INPUT
// =================================================================
// Map client → canvas-screen coords (0..VIEW_W, 0..VIEW_H)
function canvasScreenPos(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * VIEW_W,
    y: ((clientY - r.top) / r.height) * VIEW_H
  };
}
// Map client → world coords (accounting for zoom/pan)
function canvasPos(clientX, clientY) {
  const s = canvasScreenPos(clientX, clientY);
  const x = panX + s.x / zoom;
  const y = panY + s.y / zoom;
  return { x: clamp(x, 0, VIEW_W - 1), y: clamp(y, 0, VIEW_H - 1) };
}

function attachInput() {
  let dragging = false;
  let dragTimer = 0;
  // Pinch / two-finger state
  const pinch = { active: false, startDist: 0, startZoom: 1, centerX: 0, centerY: 0, lastCenterX: 0, lastCenterY: 0 };
  // PC right/middle-click pan
  const panDrag = { active: false, lastX: 0, lastY: 0 };

  const handleStart = (cx, cy) => {
    const p = canvasPos(cx, cy);
    lastTouch.x = p.x; lastTouch.y = p.y; lastTouch.active = true;
    dragging = true;
    applyTool(activeTool, p.x, p.y);
  };
  const handleMove = (cx, cy) => {
    const p = canvasPos(cx, cy);
    lastTouch.x = p.x; lastTouch.y = p.y; lastTouch.active = true;
    if (!dragging) return;
    const t = TOOL_DEFS.find(t => t.id === activeTool);
    if (t && (t.cat === 'terrain' || activeTool === 'fire' || activeTool === 'heal' || activeTool === 'plague' || t.cat === 'spawn' || t.cat === 'wild')) {
      dragTimer++;
      if (dragTimer % 4 === 0) applyTool(activeTool, p.x, p.y);
    }
  };
  const handleEnd = () => {
    dragging = false;
    setTimeout(() => { lastTouch.active = false; }, 200);
  };

  // --- Touch ---
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length >= 2) {
      // Begin pinch+pan
      dragging = false;
      const t0 = e.touches[0], t1 = e.touches[1];
      const s0 = canvasScreenPos(t0.clientX, t0.clientY);
      const s1 = canvasScreenPos(t1.clientX, t1.clientY);
      pinch.active = true;
      pinch.startDist = Math.hypot(s1.x - s0.x, s1.y - s0.y) || 1;
      pinch.startZoom = zoom;
      pinch.centerX = (s0.x + s1.x) / 2;
      pinch.centerY = (s0.y + s1.y) / 2;
      pinch.lastCenterX = pinch.centerX;
      pinch.lastCenterY = pinch.centerY;
      return;
    }
    const t = e.touches[0];
    if (t) handleStart(t.clientX, t.clientY);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (pinch.active && e.touches.length >= 2) {
      const t0 = e.touches[0], t1 = e.touches[1];
      const s0 = canvasScreenPos(t0.clientX, t0.clientY);
      const s1 = canvasScreenPos(t1.clientX, t1.clientY);
      const newDist = Math.hypot(s1.x - s0.x, s1.y - s0.y) || 1;
      const newCenterX = (s0.x + s1.x) / 2;
      const newCenterY = (s0.y + s1.y) / 2;
      // Zoom around the gesture center
      const targetZoom = pinch.startZoom * (newDist / pinch.startDist);
      zoomAt(newCenterX, newCenterY, targetZoom);
      // Pan by the center delta (in world coords)
      const dx = (newCenterX - pinch.lastCenterX) / zoom;
      const dy = (newCenterY - pinch.lastCenterY) / zoom;
      panX -= dx; panY -= dy;
      constrainPan();
      pinch.lastCenterX = newCenterX;
      pinch.lastCenterY = newCenterY;
      return;
    }
    const t = e.touches[0];
    if (t) handleMove(t.clientX, t.clientY);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (pinch.active && e.touches.length < 2) {
      pinch.active = false;
      dragging = false;  // don't apply tool when releasing pinch
      lastTouch.active = false;
    } else {
      handleEnd();
    }
  }, { passive: false });

  canvas.addEventListener('touchcancel', () => {
    pinch.active = false;
    handleEnd();
  });

  // --- Mouse ---
  let mouseDown = false;
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1 || e.button === 2) {
      // Middle / right click = pan
      panDrag.active = true;
      panDrag.lastX = e.clientX;
      panDrag.lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }
    mouseDown = true;
    handleStart(e.clientX, e.clientY);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (panDrag.active) {
      const dxScreen = (e.clientX - panDrag.lastX) * (VIEW_W / canvas.getBoundingClientRect().width);
      const dyScreen = (e.clientY - panDrag.lastY) * (VIEW_H / canvas.getBoundingClientRect().height);
      panX -= dxScreen / zoom;
      panY -= dyScreen / zoom;
      constrainPan();
      panDrag.lastX = e.clientX;
      panDrag.lastY = e.clientY;
      return;
    }
    if (mouseDown) handleMove(e.clientX, e.clientY);
    else {
      const p = canvasPos(e.clientX, e.clientY);
      lastTouch.x = p.x; lastTouch.y = p.y; lastTouch.active = true;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (panDrag.active) {
      panDrag.active = false;
      canvas.style.cursor = '';
      return;
    }
    mouseDown = false;
    handleEnd();
  });
  canvas.addEventListener('mouseleave', () => { lastTouch.active = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // --- Mouse wheel: zoom around cursor ---
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const s = canvasScreenPos(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.2 : (1 / 1.2);
    zoomAt(s.x, s.y, zoom * factor);
  }, { passive: false });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      paused = !paused;
      refreshSpeedUI();
    } else if (e.key === '+' || e.key === '=') {
      zoomAt(VIEW_W / 2, VIEW_H / 2, zoom + 0.5);
    } else if (e.key === '-' || e.key === '_') {
      zoomAt(VIEW_W / 2, VIEW_H / 2, zoom - 0.5);
    } else if (e.key === '0') {
      resetView();
    } else if (e.key >= '1' && e.key <= '7') {
      const idx = parseInt(e.key) - 1;
      if (TOOL_DEFS[idx]) selectTool(TOOL_DEFS[idx].id);
    } else if (e.key === 'ArrowLeft')  { panX -= 30 / zoom; constrainPan(); }
    else if (e.key === 'ArrowRight')   { panX += 30 / zoom; constrainPan(); }
    else if (e.key === 'ArrowUp')      { panY -= 30 / zoom; constrainPan(); }
    else if (e.key === 'ArrowDown')    { panY += 30 / zoom; constrainPan(); }
  });
}

// =================================================================
// TOOL BUTTONS
// =================================================================
function buildToolsUI() {
  const wrap = document.getElementById('wb-tool-rows');
  if (!wrap) return;
  wrap.innerHTML = '';
  // 3 rows
  const rows = [
    TOOL_DEFS.filter(t => t.cat === 'terrain'),
    TOOL_DEFS.filter(t => t.cat === 'disaster' || t.cat === 'bless' || t.cat === 'diplo' || t.cat === 'view'),
    TOOL_DEFS.filter(t => t.cat === 'spawn' || t.cat === 'wild' || t.cat === 'hero')
  ];
  for (const row of rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'wb-tool-row';
    for (const t of row) {
      const btn = document.createElement('button');
      btn.className = 'wb-tool ' + t.cat;
      btn.dataset.id = t.id;
      btn.innerHTML = t.icon + (t.cost > 0 ? ('<span class="wb-tool-cost">' + t.cost + '</span>') : '');
      const heroName = window.wbLang && window.wbLang.toolNamesHero && window.wbLang.toolNamesHero[t.id];
      const baseName = (window.wbLang && window.wbLang.toolNames && window.wbLang.toolNames[t.id]) || heroName || t.id;
      btn.title = baseName + (t.cost > 0 ? (' · ✨' + t.cost) : '');
      btn.addEventListener('click', () => selectTool(t.id));
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); selectTool(t.id); });
      rowEl.appendChild(btn);
    }
    wrap.appendChild(rowEl);
  }
  refreshToolsUI();
}
function refreshToolsUI() {
  document.querySelectorAll('.wb-tool').forEach(b => {
    b.classList.toggle('active', b.dataset.id === activeTool);
    const id = b.dataset.id;
    if (window.wbLang && window.wbLang.toolNames && window.wbLang.toolNames[id]) {
      b.title = window.wbLang.toolNames[id];
    }
  });
}
window.refreshToolsUI = refreshToolsUI;
function selectTool(id) {
  activeTool = id;
  refreshToolsUI();
}

// =================================================================
// SPEED / BRUSH UI
// =================================================================
function refreshSpeedUI() {
  document.querySelectorAll('.wb-speed-btn[data-speed]').forEach(b => {
    const s = parseInt(b.dataset.speed, 10);
    b.classList.toggle('active', paused ? s === 0 : s === speed);
  });
}
function refreshBrushUI() {
  document.querySelectorAll('.wb-brush-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.brush, 10) === brushSize);
  });
}

// =================================================================
// NEW WORLD
// =================================================================
function newWorld(setup) {
  setup = setup || { human: 8, elf: 8, dwarf: 8, orc: 8, heroes: 1 };
  units.length = 0;
  kingdoms.clear();
  buildings.length = 0;
  effects.length = 0;
  eventLog.length = 0;
  year = 0; frameCount = 0; nextKingdomId = 1; nextColorIdx = 0;
  mana = MAX_MANA;
  victoryFired = false;
  deleteSave();
  generateWorld();
  // Seed each race in a different corner
  const seeds = [
    { race: RACE_HUMAN, x: VIEW_W * 0.20, y: VIEW_H * 0.30, count: setup.human },
    { race: RACE_ELF,   x: VIEW_W * 0.78, y: VIEW_H * 0.25, count: setup.elf },
    { race: RACE_DWARF, x: VIEW_W * 0.20, y: VIEW_H * 0.75, count: setup.dwarf },
    { race: RACE_ORC,   x: VIEW_W * 0.78, y: VIEW_H * 0.78, count: setup.orc }
  ];
  for (const s of seeds) {
    if (s.count <= 0) continue;
    // Clear water around seed
    const tx = Math.floor(s.x / TILE_PX), ty = Math.floor(s.y / TILE_PX);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const t = tiles[ty + dy] && tiles[ty + dy][tx + dx];
      if (t && (t.type === T_WATER || t.type === T_LAVA || t.type === T_MOUNTAIN)) t.type = T_GRASS;
    }
    for (let i = 0; i < s.count; i++) {
      units.push(new Unit(s.x + rand(-20, 20), s.y + rand(-20, 20), s.race));
    }
  }
  // Spawn requested heroes (one per active race, up to N)
  const heroSeeds = seeds.filter(s => s.count > 0);
  for (let i = 0; i < (setup.heroes || 0) && i < heroSeeds.length; i++) {
    const s = heroSeeds[i];
    units.push(new Unit(s.x, s.y, s.race, CLASS_HERO));
  }
  // Seed wildlife: random sheep / wolves / a bear in safe biomes
  for (let i = 0; i < 12; i++) {
    const x = rand(40, VIEW_W - 40), y = rand(40, VIEW_H - 40);
    const tx = Math.floor(x / TILE_PX), ty = Math.floor(y / TILE_PX);
    const t = tiles[ty] && tiles[ty][tx];
    if (!t) continue;
    if (t.type === T_GRASS) units.push(new Unit(x, y, RACE_SHEEP));
  }
  for (let i = 0; i < 4; i++) {
    const x = rand(40, VIEW_W - 40), y = rand(40, VIEW_H - 40);
    const tx = Math.floor(x / TILE_PX), ty = Math.floor(y / TILE_PX);
    const t = tiles[ty] && tiles[ty][tx];
    if (!t) continue;
    if (t.type === T_FOREST || t.type === T_SNOW) units.push(new Unit(x, y, RACE_WOLF));
  }
  for (let i = 0; i < 2; i++) {
    const x = rand(40, VIEW_W - 40), y = rand(40, VIEW_H - 40);
    const tx = Math.floor(x / TILE_PX), ty = Math.floor(y / TILE_PX);
    const t = tiles[ty] && tiles[ty][tx];
    if (!t) continue;
    if (t.type === T_FOREST || t.type === T_MOUNTAIN) units.push(new Unit(x, y, RACE_BEAR));
  }
  log('🌱 A new world was born.');
}

function clearAll() {
  units.length = 0;
  kingdoms.clear();
  log('💨 All life vanished.');
}

// =================================================================
// SAVE / LOAD
// =================================================================
const SAVE_KEY = 'wbSave_v5';
function saveWorld() {
  const tilesFlat = new Array(WORLD_W * WORLD_H);
  for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) {
    tilesFlat[y * WORLD_W + x] = tiles[y][x].type;
  }
  const unitsData = units.filter(u => !u.dead).map(u => [
    Math.round(u.x), Math.round(u.y), u.race, Math.round(u.hp),
    Math.round(u.age * 10), u.kingdom || 0, u.sex === 'F' ? 1 : 0,
    u.class, u.isKing ? 1 : 0, u.downed
  ]);
  const kingsData = [];
  for (const [id, k] of kingdoms) {
    kingsData.push([
      id, k.race, k.name, k.color, Math.round(k.x), Math.round(k.y),
      k.pop, k.maxPopEver, k.foundedYear, k.tech,
      Array.from(k.wars), k.kingTraits || [],
      Array.from(k.relations.entries()), Array.from(k.allies),
      Math.round(k.loyalty), Math.round(k.warLosses)
    ]);
  }
  const bldsData = buildings.filter(b => !b.dead).map(b => [
    b.type, Math.round(b.x), Math.round(b.y), b.kingdom,
    Math.round(b.hp), Math.round(b.maxHp), Math.round(b.constructProg)
  ]);
  const save = {
    v: 5, year, mana, frame: frameCount,
    nextKingdomId, nextColorIdx,
    tiles: tilesFlat,
    units: unitsData,
    kingdoms: kingsData,
    buildings: bldsData,
    worldLaws
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
  catch (e) { console.warn('Save failed', e); }
}
function loadWorld() {
  let s;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); }
  catch { s = null; }
  if (!s || s.v !== 5) return false;
  year = s.year; mana = s.mana; frameCount = s.frame || 0;
  nextKingdomId = s.nextKingdomId; nextColorIdx = s.nextColorIdx;
  if (s.worldLaws) Object.assign(worldLaws, s.worldLaws);
  // Tiles
  tiles = [];
  for (let y = 0; y < WORLD_H; y++) {
    const row = [];
    for (let x = 0; x < WORLD_W; x++) {
      row.push({ type: s.tiles[y * WORLD_W + x], fire: 0 });
    }
    tiles.push(row);
  }
  // Units
  units.length = 0;
  for (const d of s.units) {
    const u = new Unit(d[0], d[1], d[2], d[7] != null ? d[7] : undefined);
    u.hp = d[3]; u.age = d[4] / 10;
    u.kingdom = d[5] || null;
    u.sex = d[6] ? 'F' : 'M';
    u.isKing = !!d[8];
    u.downed = d[9] || 0;
    units.push(u);
  }
  // Kingdoms
  kingdoms.clear();
  for (const d of s.kingdoms) {
    const k = new Kingdom(d[1]);
    k.id = d[0]; k.race = d[1]; k.name = d[2]; k.color = d[3];
    k.x = d[4]; k.y = d[5]; k.pop = d[6]; k.maxPopEver = d[7];
    k.foundedYear = d[8]; k.tech = d[9];
    k.wars = new Set(d[10] || []);
    k.kingTraits = d[11] || [];
    k.relations = new Map(d[12] || []);
    k.allies = new Set(d[13] || []);
    k.loyalty = d[14] != null ? d[14] : 100;
    k.warLosses = d[15] || 0;
    kingdoms.set(k.id, k);
  }
  // V5: Buildings
  buildings.length = 0;
  if (s.buildings) {
    for (const d of s.buildings) {
      const b = new Building(d[0], d[1], d[2], d[3]);
      b.hp = d[4]; b.maxHp = d[5]; b.constructProg = d[6];
      buildings.push(b);
    }
  }
  victoryFired = false;
  return true;
}
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch {} }
function openSetupModal() {
  const m = document.getElementById('wb-setup-modal');
  if (m) m.style.display = 'flex';
}
window.addEventListener('beforeunload', () => { saveWorld(); });
window.addEventListener('blur', () => { saveWorld(); });

// =================================================================
// BOOT
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('wb-canvas');
  ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  ctx.imageSmoothingEnabled = false;

  // Try to restore a save; otherwise generate a fresh world (will be configured via setup modal)
  if (!loadWorld()) {
    generateWorld();
    // Empty world — defer seeding to user clicking "Begin World"
  } else {
    log('💾 World restored.');
  }
  refreshAchUI();
  resizeCanvas();
  buildToolsUI();
  selectTool('lightning');
  refreshBrushUI();
  refreshSpeedUI();
  attachInput();

  // Speed buttons
  document.querySelectorAll('.wb-speed-btn[data-speed]').forEach(b => {
    b.addEventListener('click', () => {
      const s = parseInt(b.dataset.speed, 10);
      if (s === 0) { paused = true; }
      else { paused = false; speed = s; }
      refreshSpeedUI();
    });
  });
  // Brush buttons
  document.querySelectorAll('.wb-brush-btn').forEach(b => {
    b.addEventListener('click', () => {
      brushSize = parseInt(b.dataset.brush, 10);
      refreshBrushUI();
    });
  });
  // Help/start
  document.getElementById('wb-start-btn').addEventListener('click', () => {
    document.getElementById('wb-help-modal').style.display = 'none';
    if (units.length === 0) openSetupModal();
  });
  document.getElementById('wb-newworld-btn').addEventListener('click', () => {
    document.getElementById('wb-help-modal').style.display = 'none';
    openSetupModal();
  });
  document.getElementById('wb-help-btn').addEventListener('click', () => {
    document.getElementById('wb-help-modal').style.display = 'flex';
  });
  document.getElementById('wb-reset-btn').addEventListener('click', () => {
    openSetupModal();
  });

  // Setup modal
  const setupModal = document.getElementById('wb-setup-modal');
  const setupVals = ['human','elf','dwarf','orc','heroes'];
  for (const k of setupVals) {
    const r = document.getElementById('wb-setup-' + k);
    const v = document.getElementById('wb-setup-' + k + '-val');
    if (r && v) {
      r.addEventListener('input', () => { v.textContent = r.value; });
    }
  }
  document.getElementById('wb-setup-start').addEventListener('click', () => {
    const setup = {
      human: parseInt(document.getElementById('wb-setup-human').value, 10),
      elf:   parseInt(document.getElementById('wb-setup-elf').value, 10),
      dwarf: parseInt(document.getElementById('wb-setup-dwarf').value, 10),
      orc:   parseInt(document.getElementById('wb-setup-orc').value, 10),
      heroes:parseInt(document.getElementById('wb-setup-heroes').value, 10)
    };
    setupModal.style.display = 'none';
    newWorld(setup);
  });
  document.getElementById('wb-setup-cancel').addEventListener('click', () => {
    setupModal.style.display = 'none';
  });

  // World Laws modal
  const lawsModal = document.getElementById('wb-laws-modal');
  const lawsBtn = document.getElementById('wb-laws-btn');
  if (lawsBtn) lawsBtn.addEventListener('click', () => { lawsModal.style.display = 'flex'; });
  const lawsClose = document.getElementById('wb-laws-close');
  if (lawsClose) lawsClose.addEventListener('click', () => { lawsModal.style.display = 'none'; });
  // Sync checkboxes with worldLaws state
  function syncLaws() {
    const d = document.getElementById('wb-law-diplo');
    const r = document.getElementById('wb-law-rebel');
    const w = document.getElementById('wb-law-war');
    if (d) d.checked = worldLaws.diplomacy;
    if (r) r.checked = worldLaws.rebellions;
    if (w) w.checked = worldLaws.autoWar;
  }
  syncLaws();
  const lawD = document.getElementById('wb-law-diplo');
  const lawR = document.getElementById('wb-law-rebel');
  const lawW = document.getElementById('wb-law-war');
  if (lawD) lawD.addEventListener('change', e => { worldLaws.diplomacy = e.target.checked; });
  if (lawR) lawR.addEventListener('change', e => { worldLaws.rebellions = e.target.checked; });
  if (lawW) lawW.addEventListener('change', e => { worldLaws.autoWar = e.target.checked; });

  // Kingdom info modal
  const infoClose = document.getElementById('wb-info-close');
  if (infoClose) infoClose.addEventListener('click', () => {
    document.getElementById('wb-info-modal').style.display = 'none';
    window._inspectedKingdomId = null;
  });

  // Victory modal
  const victoryNew = document.getElementById('wb-victory-new');
  const victoryWatch = document.getElementById('wb-victory-watch');
  if (victoryNew) victoryNew.addEventListener('click', () => {
    document.getElementById('wb-victory-modal').style.display = 'none';
    openSetupModal();
  });
  if (victoryWatch) victoryWatch.addEventListener('click', () => {
    document.getElementById('wb-victory-modal').style.display = 'none';
    paused = false;
    refreshSpeedUI();
  });
  document.getElementById('wb-clear-btn').addEventListener('click', () => {
    clearAll();
  });
  const achStat = document.getElementById('wb-ach-stat');
  if (achStat) achStat.addEventListener('click', toggleAchModal);
  const achClose = document.getElementById('wb-ach-close');
  if (achClose) achClose.addEventListener('click', toggleAchModal);

  // Zoom buttons
  document.getElementById('wb-zoom-in').addEventListener('click',
    () => zoomAt(VIEW_W / 2, VIEW_H / 2, zoom + 0.5));
  document.getElementById('wb-zoom-out').addEventListener('click',
    () => zoomAt(VIEW_W / 2, VIEW_H / 2, zoom - 0.5));
  document.getElementById('wb-zoom-reset').addEventListener('click', resetView);
  refreshZoomUI();

  // Show help on first visit, then setup modal (if no save)
  const hasSave = units.length > 0 || kingdoms.size > 0;
  if (!localStorage.getItem('wbVisited')) {
    document.getElementById('wb-help-modal').style.display = 'flex';
    localStorage.setItem('wbVisited', '1');
  } else {
    document.getElementById('wb-help-modal').style.display = 'none';
    if (!hasSave) openSetupModal();
  }

  requestAnimationFrame(loop);
});
