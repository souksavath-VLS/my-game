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

// =================================================================
// STATE
// =================================================================
let canvas, ctx;
let tiles = [];           // tiles[y][x] = { type, fire }
const units = [];         // active units
const kingdoms = new Map(); // id -> kingdom
const effects = [];       // visual effects
const eventLog = [];      // string lines
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
  { id: 'a_meteor',        icon: '☄️' }
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
  constructor(x, y, race) {
    this.x = x; this.y = y;
    this.race = race;
    // Wildlife has different stats
    if (race === RACE_SHEEP) { this.maxHp = 10; this.dmg = 0; }
    else if (race === RACE_WOLF)  { this.maxHp = 20; this.dmg = 5; }
    else if (race === RACE_BEAR)  { this.maxHp = 60; this.dmg = 10; }
    else                          { this.maxHp = 30; this.dmg = 4; }
    this.hp = this.maxHp;
    this.age = 0;
    this.maxAge = race >= MORTAL_RACES ? (40 + Math.random() * 40) : (80 + Math.random() * 80);
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
  }
  isAnimal() { return this.race >= MORTAL_RACES; }
  isHostileAnimal() { return this.race === RACE_WOLF || this.race === RACE_BEAR; }

  update() {
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
    let nearestMate = null,  mDist = 50 * 50;
    const isNight = dayPhase > 0.7 && dayPhase < 0.95;
    const huntRange = (this.race === RACE_WOLF && isNight) ? 120*120 :
                      (this.race === RACE_BEAR) ? 100*100 :
                      (this.isHostileAnimal()) ? 70*70 : 80*80;
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
        u.sex !== this.sex &&
        u.matingCd === 0 && this.matingCd === 0 &&
        this.age > 10 && u.age > 10 &&
        this.age < this.maxAge * 0.8 && u.age < u.maxAge * 0.8
      ) {
        if (d < mDist) { mDist = d; nearestMate = u; }
      }
    }

    // Sheep flee from predators instead of attacking
    if (this.race === RACE_SHEEP && nearestEnemy) {
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

    // Movement / action
    if (this.target && !this.target.dead) {
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 1;
      let sp;
      if (this.state === 'flee') {
        sp = 0.65;
        this.vx = -(dx / d) * sp;
        this.vy = -(dy / d) * sp;
      } else {
        sp = this.state === 'attack'
          ? (this.race === RACE_WOLF ? 0.7 : this.race === RACE_BEAR ? 0.45 : 0.55)
          : 0.42;
        this.vx = (dx / d) * sp;
        this.vy = (dy / d) * sp;
      }
      if (this.state === 'attack' && d < 9 && this.attackCd === 0) {
        let baseDmg = this.dmg + Math.floor(Math.random() * 3);
        // Mortal kingdom tech damage bonus
        if (this.kingdom) {
          const k = kingdoms.get(this.kingdom);
          if (k) baseDmg *= techDmgMul(k.tech || 0);
        }
        const dmg = Math.round(baseDmg);
        this.target.hp -= dmg;
        this.attackCd = this.race === RACE_BEAR ? 50 : this.race === RACE_WOLF ? 25 : 30;
        effects.push({ type: 'hit', x: this.target.x, y: this.target.y, life: 10 });
        if (this.target.hp <= 0) {
          // Achievement: bear hunt
          if (this.target.race === RACE_BEAR && this.race < MORTAL_RACES) unlockAch('a_bear_hunt');
          this.target.die('combat');
        }
      } else if (this.state === 'mate' && d < 9 && this.matingCd === 0 && units.length < 1200) {
        const baby = new Unit(this.x + rand(-3, 3), this.y + rand(-3, 3), this.race);
        baby.matingCd = 1200;
        baby.kingdom = this.kingdom || this.target.kingdom;
        units.push(baby);
        this.matingCd = 1500;
        this.target.matingCd = 1500;
        effects.push({ type: 'heart', x: this.x, y: this.y - 6, life: 22 });
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

  die(reason) {
    if (this.dead) return;
    this.dead = true;
    effects.push({ type: 'die', x: this.x, y: this.y, life: 18 });
    if (this.kingdom) {
      const k = kingdoms.get(this.kingdom);
      if (k) k.pop = Math.max(0, k.pop - 1);
    }
  }

  draw(c) {
    // Animals draw differently
    if (this.race === RACE_SHEEP) {
      c.fillStyle = '#f5f5f4';
      c.fillRect(this.x - 3, this.y - 2, 6, 4);
      c.fillStyle = '#1f1d1b';
      c.fillRect(this.x + 2, this.y - 2, 2, 2);  // head
      return;
    }
    if (this.race === RACE_WOLF) {
      c.fillStyle = '#3f3f46';
      c.fillRect(this.x - 3, this.y - 2, 6, 4);
      c.fillStyle = '#71717a';
      c.fillRect(this.x + 2, this.y - 3, 2, 2);  // head
      // glowing eyes at night
      if (dayPhase > 0.7 && dayPhase < 0.95) {
        c.fillStyle = '#facc15';
        c.fillRect(this.x + 3, this.y - 2, 1, 1);
      }
      return;
    }
    if (this.race === RACE_BEAR) {
      c.fillStyle = '#78350f';
      c.fillRect(this.x - 4, this.y - 3, 8, 5);
      c.fillStyle = '#92400e';
      c.fillRect(this.x + 3, this.y - 3, 2, 2);
      return;
    }
    // Kingdom flag (1px line on top)
    if (this.kingdom) {
      const k = kingdoms.get(this.kingdom);
      if (k) {
        c.fillStyle = k.color;
        c.fillRect(this.x - 3, this.y - 4, 6, 1);
        // Tech crown: bigger dot for higher tech
        if (k.tech >= 2) {
          c.fillStyle = '#facc15';
          c.fillRect(this.x - 1, this.y - 5, 2, 1);
        }
      }
    }
    // Body
    c.fillStyle = RACE_BODY[this.race];
    c.fillRect(this.x - 2, this.y - 2, 4, 4);
    // Head
    c.fillStyle = RACE_HEAD[this.race];
    c.fillRect(this.x - 1, this.y - 3, 2, 2);
    // HP bar if damaged
    if (this.hp < this.maxHp * 0.99) {
      c.fillStyle = '#000';
      c.fillRect(this.x - 3, this.y + 3, 6, 1);
      c.fillStyle = this.hp < this.maxHp * 0.3 ? '#dc2626' : '#22c55e';
      c.fillRect(this.x - 3, this.y + 3, Math.max(0, (this.hp / this.maxHp) * 6), 1);
    }
    // Plague tint
    if (this.plague > 0) {
      c.fillStyle = 'rgba(132, 204, 22, 0.45)';
      c.fillRect(this.x - 2, this.y - 3, 4, 6);
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
  }
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
      } else {
        // too small — leave kingdom-less
        for (const m of cluster) m.kingdom = null;
      }
    }
  }

  // Prune dead kingdoms
  for (const [id, k] of kingdoms) {
    if (!stillAlive.has(id)) {
      kingdoms.delete(id);
      log(format(window.wbLang.evtFell, { a: k.name }));
    }
  }

  // Decide wars: any two kingdoms whose capitals are within 200px and have
  // had no war declared yet AND different race AND not at peace right after.
  const ks = Array.from(kingdoms.values());
  for (let i = 0; i < ks.length; i++) {
    for (let j = i + 1; j < ks.length; j++) {
      const a = ks[i], b = ks[j];
      if (a.race === b.race) continue;
      if (a.wars.has(b.id)) continue;
      if (dist2(a.x, a.y, b.x, b.y) < 220 * 220 && Math.random() < 0.10) {
        a.wars.add(b.id); b.wars.add(a.id);
        log(format(window.wbLang.evtWar, { a: a.name, b: b.name }));
      }
    }
  }
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
  // row 3: spawns (mortals + wildlife)
  { id: 'human', icon: '🧑', cat: 'spawn', cost: 4 },
  { id: 'elf',   icon: '🧝', cat: 'spawn', cost: 4 },
  { id: 'dwarf', icon: '🧔', cat: 'spawn', cost: 4 },
  { id: 'orc',   icon: '👹', cat: 'spawn', cost: 4 },
  { id: 'sheep', icon: '🐑', cat: 'wild',  cost: 2 },
  { id: 'wolf',  icon: '🐺', cat: 'wild',  cost: 3 },
  { id: 'bear',  icon: '🐻', cat: 'wild',  cost: 5 }
];

const TERRAIN_TYPE = {
  water: T_WATER, sand: T_SAND, grass: T_GRASS, forest: T_FOREST,
  mountain: T_MOUNTAIN, snow: T_SNOW, lava: T_LAVA
};

function applyTool(toolId, x, y) {
  const def = TOOL_DEFS.find(t => t.id === toolId);
  if (!def) return;
  if (mana < def.cost) {
    // Flash low-mana visual
    effects.push({ type: 'nomana', x, y, life: 14 });
    return;
  }
  mana -= def.cost;
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
    case 'human':     return spawnAt(x, y, RACE_HUMAN);
    case 'elf':       return spawnAt(x, y, RACE_ELF);
    case 'dwarf':     return spawnAt(x, y, RACE_DWARF);
    case 'orc':       return spawnAt(x, y, RACE_ORC);
    case 'sheep':     return spawnAt(x, y, RACE_SHEEP);
    case 'wolf':      return spawnAt(x, y, RACE_WOLF);
    case 'bear':      return spawnAt(x, y, RACE_BEAR);
  }
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
      // damage units inside
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
      ctx.fillStyle = '#f9a8d4';
      ctx.font = '10px serif';
      ctx.fillText('♥', e.x - 3, e.y - (22 - e.life) * 0.4);
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
// BUILDINGS RENDER
// =================================================================
function drawBuildings() {
  for (const [, k] of kingdoms) {
    const kind = k.cityKind();
    if (!kind) continue;
    drawCity(k.x, k.y, kind, k.color, k.tech);
  }
}
function drawCity(x, y, kind, color, tech) {
  ctx.save();
  // Tech level affects size & detail
  const sz = kind === 'city' ? 14 : kind === 'town' ? 11 : kind === 'village' ? 9 : 7;
  // Banner pole
  ctx.fillStyle = '#a3a3a3';
  ctx.fillRect(x - 1, y - sz - 8, 2, 8);
  // Flag
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y - sz - 8, 5, 4);
  // House body
  ctx.fillStyle = tech >= 3 ? '#525252' : tech >= 2 ? '#78716c' : tech >= 1 ? '#a3a3a3' : '#a16207';
  ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
  // Roof (triangle)
  ctx.fillStyle = tech >= 2 ? '#7f1d1d' : '#92400e';
  ctx.beginPath();
  ctx.moveTo(x - sz / 2 - 1, y - sz / 2);
  ctx.lineTo(x, y - sz - 1);
  ctx.lineTo(x + sz / 2 + 1, y - sz / 2);
  ctx.closePath();
  ctx.fill();
  // Window
  if (sz >= 9) {
    ctx.fillStyle = '#fde047';
    const ws = Math.floor(sz / 3);
    ctx.fillRect(x - ws / 2, y - 1, ws, ws);
  }
  // Surrounding small houses for towns/cities
  if (kind === 'town' || kind === 'city') {
    const count = kind === 'city' ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const ox = Math.cos(a) * (sz + 4);
      const oy = Math.sin(a) * (sz + 4);
      ctx.fillStyle = tech >= 2 ? '#78716c' : '#92400e';
      ctx.fillRect(x + ox - 3, y + oy - 3, 6, 6);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(x + ox - 4, y + oy - 4, 8, 2);
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
  // Tile pass — simple full redraw (96×64 = 6144 quads, well within budget)
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const t = tiles[y][x];
      ctx.fillStyle = TILE_COLORS[t.type];
      ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      // Subtle border
      if (t.type === T_FOREST) {
        ctx.fillStyle = '#166534';
        ctx.fillRect(x * TILE_PX + 3, y * TILE_PX + 3, 4, 4);
      } else if (t.type === T_MOUNTAIN) {
        ctx.fillStyle = '#a1a1aa';
        ctx.beginPath();
        ctx.moveTo(x * TILE_PX + 1, y * TILE_PX + TILE_PX - 1);
        ctx.lineTo(x * TILE_PX + TILE_PX / 2, y * TILE_PX + 2);
        ctx.lineTo(x * TILE_PX + TILE_PX - 1, y * TILE_PX + TILE_PX - 1);
        ctx.closePath();
        ctx.fill();
      } else if (t.type === T_LAVA) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x * TILE_PX + 2, y * TILE_PX + 2, 2, 2);
        ctx.fillRect(x * TILE_PX + 6, y * TILE_PX + 5, 2, 2);
      }
      if (t.fire > 0) {
        const a = t.fire / 100;
        ctx.fillStyle = `rgba(239, 68, 68, ${0.45 * a})`;
        ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
        ctx.fillStyle = `rgba(251, 191, 36, ${0.7 * a})`;
        ctx.fillRect(x * TILE_PX + 3, y * TILE_PX + 3, 4, 4);
      }
    }
  }

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
  // GC dead
  for (let i = units.length - 1; i >= 0; i--) if (units[i].dead) units.splice(i, 1);
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
  for (const u of units) if (!u.dead) counts[u.race]++;
  document.getElementById('wb-pop-human').textContent = counts[0];
  document.getElementById('wb-pop-elf').textContent   = counts[1];
  document.getElementById('wb-pop-dwarf').textContent = counts[2];
  document.getElementById('wb-pop-orc').textContent   = counts[3];
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
      if (def) btn.classList.toggle('locked', mana < def.cost);
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
    TOOL_DEFS.filter(t => t.cat === 'disaster' || t.cat === 'bless'),
    TOOL_DEFS.filter(t => t.cat === 'spawn' || t.cat === 'wild')
  ];
  for (const row of rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'wb-tool-row';
    for (const t of row) {
      const btn = document.createElement('button');
      btn.className = 'wb-tool ' + t.cat;
      btn.dataset.id = t.id;
      btn.innerHTML = t.icon + '<span class="wb-tool-cost">' + t.cost + '</span>';
      btn.title = ((window.wbLang && window.wbLang.toolNames && window.wbLang.toolNames[t.id]) || t.id) + ' · ✨' + t.cost;
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
function newWorld() {
  units.length = 0;
  kingdoms.clear();
  effects.length = 0;
  eventLog.length = 0;
  year = 0; frameCount = 0; nextKingdomId = 1; nextColorIdx = 0;
  mana = MAX_MANA;
  deleteSave();
  generateWorld();
  // Seed each race in a different corner
  const seeds = [
    { race: RACE_HUMAN, x: VIEW_W * 0.20, y: VIEW_H * 0.30, count: 8 },
    { race: RACE_ELF,   x: VIEW_W * 0.78, y: VIEW_H * 0.25, count: 8 },
    { race: RACE_DWARF, x: VIEW_W * 0.20, y: VIEW_H * 0.75, count: 8 },
    { race: RACE_ORC,   x: VIEW_W * 0.78, y: VIEW_H * 0.78, count: 8 }
  ];
  for (const s of seeds) {
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
const SAVE_KEY = 'wbSave_v2';
function saveWorld() {
  const tilesFlat = new Array(WORLD_W * WORLD_H);
  for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) {
    tilesFlat[y * WORLD_W + x] = tiles[y][x].type;
  }
  const unitsData = units.filter(u => !u.dead).map(u => [
    Math.round(u.x), Math.round(u.y), u.race, Math.round(u.hp),
    Math.round(u.age * 10), u.kingdom || 0, u.sex === 'F' ? 1 : 0
  ]);
  const kingsData = [];
  for (const [id, k] of kingdoms) {
    kingsData.push([id, k.race, k.name, k.color, Math.round(k.x), Math.round(k.y),
                    k.pop, k.maxPopEver, k.foundedYear, k.tech, Array.from(k.wars)]);
  }
  const save = {
    v: 2, year, mana, frame: frameCount,
    nextKingdomId, nextColorIdx,
    tiles: tilesFlat,
    units: unitsData,
    kingdoms: kingsData
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
  catch (e) { console.warn('Save failed', e); }
}
function loadWorld() {
  let s;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); }
  catch { s = null; }
  if (!s || s.v !== 2) return false;
  year = s.year; mana = s.mana; frameCount = s.frame || 0;
  nextKingdomId = s.nextKingdomId; nextColorIdx = s.nextColorIdx;
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
    const u = new Unit(d[0], d[1], d[2]);
    u.hp = d[3]; u.age = d[4] / 10;
    u.kingdom = d[5] || null;
    u.sex = d[6] ? 'F' : 'M';
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
    kingdoms.set(k.id, k);
  }
  return true;
}
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch {} }
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

  // Try to restore a save; otherwise fresh world
  if (!loadWorld()) {
    newWorld();
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
  });
  document.getElementById('wb-newworld-btn').addEventListener('click', () => {
    document.getElementById('wb-help-modal').style.display = 'none';
    newWorld();
  });
  document.getElementById('wb-help-btn').addEventListener('click', () => {
    document.getElementById('wb-help-modal').style.display = 'flex';
  });
  document.getElementById('wb-reset-btn').addEventListener('click', () => {
    newWorld();
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

  // Show help on first visit
  if (!localStorage.getItem('wbVisited')) {
    document.getElementById('wb-help-modal').style.display = 'flex';
    localStorage.setItem('wbVisited', '1');
  } else {
    document.getElementById('wb-help-modal').style.display = 'none';
  }

  requestAnimationFrame(loop);
});
