// Solar System Explorer — kids-friendly, mobile-first.
// CSS 3D scene with 8 planets orbiting the Sun. Drag to rotate, tap planet for facts.

// ---------- Planet data ----------
// orbitR (px): visual orbit radius from center
// size (px): planet diameter
// speed (s): seconds per full revolution (visual, not real-time)
const PLANETS = [
  {
    key: 'mercury',
    color: '#a8a29e',
    accent: '#78716c',
    orbitR: 75,
    size: 8,
    speed: 12,
    diameterKm: 4879,
    distanceMkm: 57.9,
    yearDays: 88,
    moons: 0,
    label:   { th: 'ดาวพุธ',  en: 'Mercury', lao: 'ດາວພຸດ' },
    fact: {
      th: 'ดาวเคราะห์ที่เล็กที่สุดและใกล้ดวงอาทิตย์ที่สุด',
      en: 'The smallest planet and closest to the Sun.',
      lao: 'ດາວເຄາະນ້ອຍສຸດ ແລະ ໃກ້ດວງຕາເວັນທີ່ສຸດ'
    }
  },
  {
    key: 'venus',
    color: '#facc15',
    accent: '#ca8a04',
    orbitR: 105,
    size: 14,
    speed: 18,
    diameterKm: 12104,
    distanceMkm: 108.2,
    yearDays: 225,
    moons: 0,
    label:   { th: 'ดาวศุกร์', en: 'Venus', lao: 'ດາວສຸກ' },
    fact: {
      th: 'ดาวที่ร้อนที่สุดในระบบสุริยะ ปกคลุมด้วยเมฆหนา',
      en: 'The hottest planet in our solar system, wrapped in thick clouds.',
      lao: 'ດາວທີ່ຮ້ອນທີ່ສຸດໃນລະບົບສຸລິຍະ ປົກຄຸມດ້ວຍເມກໜາ'
    }
  },
  {
    key: 'earth',
    color: '#3b82f6',
    accent: '#16a34a',
    orbitR: 140,
    size: 15,
    speed: 24,
    diameterKm: 12742,
    distanceMkm: 149.6,
    yearDays: 365,
    moons: 1,
    label:   { th: 'โลก', en: 'Earth', lao: 'ໂລກ' },
    fact: {
      th: 'บ้านของเรา! เป็นดาวเคราะห์เพียงดวงเดียวที่มีสิ่งมีชีวิต',
      en: 'Our home! The only known planet with life.',
      lao: 'ບ້ານຂອງເຮົາ! ດາວເຄາະພຽງດວງດຽວທີ່ມີສິ່ງມີຊີວິດ'
    }
  },
  {
    key: 'mars',
    color: '#dc2626',
    accent: '#7f1d1d',
    orbitR: 180,
    size: 12,
    speed: 36,
    diameterKm: 6779,
    distanceMkm: 227.9,
    yearDays: 687,
    moons: 2,
    label:   { th: 'ดาวอังคาร', en: 'Mars', lao: 'ດາວອັງຄານ' },
    fact: {
      th: 'รู้จักในชื่อ "ดาวสีแดง" มีภูเขาไฟใหญ่ที่สุดในระบบสุริยะ',
      en: 'The "Red Planet" — home to the largest volcano in the solar system.',
      lao: 'ດາວສີແດງ - ມີພູເຂົາໄຟໃຫຍ່ສຸດໃນລະບົບສຸລິຍະ'
    }
  },
  {
    key: 'jupiter',
    color: '#d97706',
    accent: '#92400e',
    orbitR: 235,
    size: 34,
    speed: 60,
    diameterKm: 139820,
    distanceMkm: 778.5,
    yearDays: 4333,
    moons: 95,
    label:   { th: 'ดาวพฤหัสบดี', en: 'Jupiter', lao: 'ດາວພະຫັດ' },
    fact: {
      th: 'ดาวเคราะห์ที่ใหญ่ที่สุด มีพายุยักษ์ "จุดแดงใหญ่"',
      en: 'The biggest planet, with a giant storm called the Great Red Spot.',
      lao: 'ດາວເຄາະທີ່ໃຫຍ່ສຸດ ມີພາຍຸຍັກສ໌ "ຈຸດແດງໃຫຍ່"'
    }
  },
  {
    key: 'saturn',
    color: '#f5deb3',
    accent: '#a16207',
    orbitR: 295,
    size: 28,
    speed: 90,
    diameterKm: 116460,
    distanceMkm: 1434,
    yearDays: 10759,
    moons: 146,
    rings: true,
    label:   { th: 'ดาวเสาร์', en: 'Saturn', lao: 'ດາວເສົາ' },
    fact: {
      th: 'มีวงแหวนสวยงามจากน้ำแข็งและหิน',
      en: 'Famous for its beautiful rings made of ice and rock.',
      lao: 'ມີວົງແຫວນສວຍງາມຈາກນ້ຳກ້ອນແລະຫີນ'
    }
  },
  {
    key: 'uranus',
    color: '#67e8f9',
    accent: '#0e7490',
    orbitR: 345,
    size: 22,
    speed: 130,
    diameterKm: 50724,
    distanceMkm: 2871,
    yearDays: 30687,
    moons: 27,
    label:   { th: 'ดาวยูเรนัส', en: 'Uranus', lao: 'ດາວຢູເຣນັສ' },
    fact: {
      th: 'ดาวเคราะห์เดียวที่หมุนตะแคงข้าง เกือบ 90 องศา',
      en: 'The only planet that spins on its side — tilted almost 90°.',
      lao: 'ດາວເຄາະດຽວທີ່ໝຸນຕະແຄງຂ້າງ ເກືອບ 90 ອົງສາ'
    }
  },
  {
    key: 'neptune',
    color: '#2563eb',
    accent: '#1e3a8a',
    orbitR: 390,
    size: 21,
    speed: 165,
    diameterKm: 49244,
    distanceMkm: 4495,
    yearDays: 60190,
    moons: 14,
    label:   { th: 'ดาวเนปจูน', en: 'Neptune', lao: 'ດາວເນບຈູນ' },
    fact: {
      th: 'ดาวเคราะห์ที่มีลมแรงที่สุด ความเร็วลมเกิน 2,000 กม./ชม.',
      en: 'The windiest planet — wind speeds over 2,000 km/h!',
      lao: 'ດາວເຄາະທີ່ມີລົມແຮງສຸດ ຄວາມໄວລົມເກີນ 2,000 ກມ./ຊມ.'
    }
  }
];

// ---------- State ----------
let lang = 'en';
let rotX = 65;  // tilt (degrees)
let rotZ = 0;   // spin around vertical axis
let zoom = 1;
let paused = false;
let showOrbits = true;

// ---------- Audio (optional, mostly UI clicks) ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.3;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('solarMuted') === '1';
function applyMute() { masterGain.gain.value = muted ? 0 : 0.3; }
applyMute();
function toggleMute() {
  muted = !muted;
  localStorage.setItem('solarMuted', muted ? '1' : '0');
  applyMute();
  const btn = document.getElementById('ss-mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}
window.solarToggleMute = toggleMute;

function beep({ type = 'triangle', freq = 700, freqEnd = null, duration = 0.10, gain = 0.25 }) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (freqEnd !== null) o.frequency.linearRampToValueAtTime(freqEnd, audioCtx.currentTime + duration);
  g.gain.setValueAtTime(gain, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
  o.connect(g); g.connect(masterGain);
  o.start();
  o.stop(audioCtx.currentTime + duration);
}
function sndTap()   { beep({ freq: 800, freqEnd: 1200, duration: 0.08, gain: 0.18 }); }
function sndOpen()  { beep({ freq: 600, freqEnd: 1000, duration: 0.15, gain: 0.25 }); }
function sndClose() { beep({ freq: 800, freqEnd: 500, duration: 0.10, gain: 0.18 }); }

// ---------- Language ----------
function getLang() {
  let l = localStorage.getItem('lang') || 'en';
  if (!['th', 'en', 'lao'].includes(l)) l = 'en';
  return l;
}

// ---------- Build the scene ----------
function buildScene() {
  const world = document.getElementById('ss-world');
  if (!world) return;

  // Clear any existing planets/orbits
  Array.from(world.querySelectorAll('.ss-orbit')).forEach(e => e.remove());

  for (const p of PLANETS) {
    const orbit = document.createElement('div');
    orbit.className = 'ss-orbit';
    orbit.dataset.key = p.key;
    orbit.style.width = (p.orbitR * 2) + 'px';
    orbit.style.height = (p.orbitR * 2) + 'px';
    orbit.style.marginLeft = (-p.orbitR) + 'px';
    orbit.style.marginTop = (-p.orbitR) + 'px';
    orbit.style.animationDuration = p.speed + 's';
    if (!showOrbits) orbit.classList.add('hide-line');

    const planet = document.createElement('button');
    planet.type = 'button';
    planet.className = `ss-planet ${p.key}`;
    planet.dataset.key = p.key;
    planet.style.width = p.size + 'px';
    planet.style.height = p.size + 'px';
    planet.style.background = `radial-gradient(circle at 30% 30%, ${p.color}, ${p.accent})`;
    planet.style.boxShadow = `0 0 ${Math.max(6, p.size * 0.4)}px ${p.color}aa`;
    planet.title = p.label[lang];
    planet.addEventListener('click', (e) => {
      e.stopPropagation();
      showPlanetInfo(p);
    });

    if (p.rings) {
      const ring = document.createElement('span');
      ring.className = 'ss-ring';
      planet.appendChild(ring);
    }

    orbit.appendChild(planet);
    world.appendChild(orbit);
  }
}

// ---------- Apply camera transform ----------
function applyTransform() {
  const world = document.getElementById('ss-world');
  if (!world) return;
  world.style.transform = `scale(${zoom}) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`;
}

// ---------- Planet info modal ----------
function showPlanetInfo(p) {
  sndOpen();
  lang = getLang();
  const modal = document.getElementById('ss-info-modal');
  if (!modal) return;
  document.getElementById('ss-info-name').textContent = p.label[lang];
  document.getElementById('ss-info-fact').textContent = p.fact[lang];

  const t = window.solarLang || {};
  document.getElementById('ss-info-diameter').innerHTML =
    `<span class="ss-info-label">${t.diameter || 'Diameter'}:</span> <strong>${p.diameterKm.toLocaleString()} km</strong>`;
  document.getElementById('ss-info-distance').innerHTML =
    `<span class="ss-info-label">${t.distance || 'Distance from Sun'}:</span> <strong>${p.distanceMkm.toLocaleString()} M km</strong>`;
  document.getElementById('ss-info-year').innerHTML =
    `<span class="ss-info-label">${t.year || 'Year'}:</span> <strong>${formatYear(p.yearDays, t)}</strong>`;
  document.getElementById('ss-info-moons').innerHTML =
    `<span class="ss-info-label">${t.moons || 'Moons'}:</span> <strong>${p.moons}</strong>`;

  // Big preview
  const preview = document.getElementById('ss-info-preview');
  preview.style.background = `radial-gradient(circle at 30% 30%, ${p.color}, ${p.accent})`;
  preview.style.boxShadow = `0 0 30px ${p.color}aa, inset -10px -10px 30px ${p.accent}66`;
  preview.innerHTML = p.rings ? '<span class="ss-preview-ring"></span>' : '';

  modal.style.display = 'flex';
}
function hideInfoModal() {
  const modal = document.getElementById('ss-info-modal');
  if (modal) {
    modal.style.display = 'none';
    sndClose();
  }
}

function formatYear(days, t) {
  if (days < 365) return `${days} ${t.days || 'days'}`;
  const years = Math.round(days / 365 * 10) / 10;
  return `${years} ${t.earthYears || 'Earth years'}`;
}

// ---------- Controls ----------
function togglePause() {
  paused = !paused;
  document.body.classList.toggle('ss-paused', paused);
  const btn = document.getElementById('ss-pause-btn');
  if (btn) btn.textContent = paused ? '▶' : '⏸';
}
function toggleOrbits() {
  showOrbits = !showOrbits;
  document.querySelectorAll('.ss-orbit').forEach(o => o.classList.toggle('hide-line', !showOrbits));
  const btn = document.getElementById('ss-orbit-btn');
  if (btn) btn.classList.toggle('off', !showOrbits);
}
function resetView() {
  rotX = 65; rotZ = 0; zoom = 1;
  applyTransform();
  sndTap();
}
function zoomIn()  { zoom = Math.min(2,    zoom + 0.15); applyTransform(); sndTap(); }
function zoomOut() { zoom = Math.max(0.45, zoom - 0.15); applyTransform(); sndTap(); }

// ---------- Drag to rotate ----------
// Tap detection: don't start drag until movement exceeds threshold, so taps on
// small moving planets reliably trigger their click handlers.
function attachDragRotate() {
  const stage = document.getElementById('ss-stage');
  if (!stage) return;

  let dragging = false;
  let startX = 0, startY = 0;
  let lastX = 0, lastY = 0;
  let pinchStartDist = 0, pinchStartZoom = 1;
  const DRAG_THRESHOLD = 8;

  function isPlanetTarget(el) {
    return el && (el.closest && (el.closest('.ss-planet') || el.id === 'ss-sun'));
  }

  function onMove(x, y) {
    const dx = x - lastX;
    const dy = y - lastY;
    rotZ += dx * 0.4;
    rotX = Math.max(15, Math.min(85, rotX - dy * 0.4));
    lastX = x; lastY = y;
    applyTransform();
  }

  // ----- Mouse -----
  stage.addEventListener('mousedown', (e) => {
    if (isPlanetTarget(e.target)) return; // let planet handle the click
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    lastX = startX; lastY = startY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    onMove(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', () => { dragging = false; });

  // ----- Touch -----
  stage.addEventListener('touchstart', (e) => {
    // Pause orbits while finger is down so planets are easier to tap
    document.body.classList.add('ss-touching');

    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist = Math.hypot(dx, dy);
      pinchStartZoom = zoom;
      dragging = false;
    } else if (e.touches.length === 1) {
      // Record start position; defer drag until movement exceeds threshold
      // so quick taps on planets are preserved.
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      lastX = startX; lastY = startY;
      dragging = false;
    }
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinchStartDist > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      zoom = Math.max(0.45, Math.min(2, pinchStartZoom * (dist / pinchStartDist)));
      applyTransform();
      e.preventDefault();
      return;
    }
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (!dragging) {
      const adx = Math.abs(t.clientX - startX);
      const ady = Math.abs(t.clientY - startY);
      if (adx > DRAG_THRESHOLD || ady > DRAG_THRESHOLD) {
        dragging = true;
        lastX = t.clientX; lastY = t.clientY; // reset to avoid jump
      }
    }
    if (dragging) {
      onMove(t.clientX, t.clientY);
      e.preventDefault();
    }
  }, { passive: false });

  const endTouch = () => {
    dragging = false;
    pinchStartDist = 0;
    // Brief delay before resuming animation so the synthesized click on a
    // planet fires while the planet is still in its tapped position.
    setTimeout(() => document.body.classList.remove('ss-touching'), 80);
  };
  stage.addEventListener('touchend', endTouch);
  stage.addEventListener('touchcancel', endTouch);
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  lang = getLang();
  buildScene();
  applyTransform();
  attachDragRotate();

  const muteBtn = document.getElementById('ss-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  const pauseBtn = document.getElementById('ss-pause-btn');
  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
  const orbitBtn = document.getElementById('ss-orbit-btn');
  if (orbitBtn) orbitBtn.addEventListener('click', toggleOrbits);
  const resetBtn = document.getElementById('ss-reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', resetView);
  const zoomInBtn = document.getElementById('ss-zoom-in');
  if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
  const zoomOutBtn = document.getElementById('ss-zoom-out');
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);

  const infoCloseBtn = document.getElementById('ss-info-close');
  if (infoCloseBtn) infoCloseBtn.addEventListener('click', hideInfoModal);

  // Tap on Sun shows a fun fact too
  const sun = document.getElementById('ss-sun');
  if (sun) sun.addEventListener('click', () => {
    const t = window.solarLang || {};
    sndOpen();
    const modal = document.getElementById('ss-info-modal');
    document.getElementById('ss-info-name').textContent = t.sun || 'Sun';
    document.getElementById('ss-info-fact').textContent = t.sunFact || 'The star at the center of our solar system.';
    document.getElementById('ss-info-diameter').innerHTML =
      `<span class="ss-info-label">${t.diameter || 'Diameter'}:</span> <strong>1,392,700 km</strong>`;
    document.getElementById('ss-info-distance').innerHTML = '';
    document.getElementById('ss-info-year').innerHTML = '';
    document.getElementById('ss-info-moons').innerHTML = '';
    const preview = document.getElementById('ss-info-preview');
    preview.style.background = 'radial-gradient(circle at 35% 35%, #fff8a0, #f59e0b 60%, #b45309)';
    preview.style.boxShadow = '0 0 40px #fbbf24cc, inset -10px -10px 30px #92400e66';
    preview.innerHTML = '';
    modal.style.display = 'flex';
  });
});
