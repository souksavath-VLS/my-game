// Plant Care game — plant tells you what it needs (water/sun/soil), tap matching button to grow it
// through stages. Endless: harvest → next plant. Multi-language, TTS, audio, localStorage.

(() => {
  'use strict';

  // ===== Plants: each has 4 growth stages (seed → small → medium → fully grown) =====
  const PLANTS = [
    { stages:['🌱','🌿','🌷','💐'], en:'Flower',       th:'ดอกไม้',     lo:'ດອກໄມ້' },
    { stages:['🌱','🌿','🌳','🍎'], en:'Apple Tree',  th:'ต้นแอปเปิ้ล', lo:'ຕົ້ນແອັບເປິ້ນ' },
    { stages:['🌱','🌿','🥬','🥕'], en:'Carrot',       th:'แครอท',      lo:'ການລົດ' },
    { stages:['🌱','🌿','🌳','🍊'], en:'Orange',       th:'ส้ม',        lo:'ໝາກກ້ຽງ' },
    { stages:['🌱','🌿','🍓','🍓'], en:'Strawberry',   th:'สตรอเบอรี่', lo:'ສະຕໍເບີຣີ' },
    { stages:['🌱','🌿','🌻','🌻'], en:'Sunflower',    th:'ทานตะวัน',   lo:'ດອກຕາເວັນ' },
    { stages:['🌱','🌿','🌽','🌽'], en:'Corn',         th:'ข้าวโพด',    lo:'ສາລີ' },
    { stages:['🌱','🌿','🌳','🥭'], en:'Mango',        th:'มะม่วง',     lo:'ໝາກມ່ວງ' },
    { stages:['🌱','🌿','🌳','🥥'], en:'Coconut',      th:'มะพร้าว',    lo:'ໝາກພ້າວ' },
    { stages:['🌱','🌿','🍅','🍅'], en:'Tomato',       th:'มะเขือเทศ',  lo:'ໝາກເລັ່ນ' }
  ];

  // ===== Needs and their UI strings =====
  const NEEDS = ['water', 'sun', 'soil'];
  const NEED_EMOJI = { water:'💧', sun:'☀️', soil:'🌱' };

  // ===== UI strings =====
  const I18N = {
    th: {
      title:'🌱 รดน้ำต้นไม้', back:'← หน้าหลัก',
      grown:'โตแล้ว', streak:'ติดต่อ', best:'ดีที่สุด',
      water:'รดน้ำ', sun:'ให้แดด', soil:'ใส่ปุ๋ย',
      stages:['เมล็ด','ต้นอ่อน','โต','โตเต็มที่'],
      seedNm:'เมล็ดพืช',
      good:'เก่งมาก!', wrong:'อุ๊ปส์', harvested:'🎉 เก็บผลแล้ว!'
    },
    en: {
      title:'🌱 Plant Care', back:'← Home',
      grown:'Grown', streak:'Streak', best:'Best',
      water:'Water', sun:'Sun', soil:'Soil',
      stages:['Seed','Sprout','Growing','Full grown'],
      seedNm:'Seed',
      good:'Great!', wrong:'Oops', harvested:'🎉 Harvested!'
    },
    lao: {
      title:'🌱 ລົດນ້ຳຕົ້ນໄມ້', back:'← ໜ້າຫຼັກ',
      grown:'ໂຕແລ້ວ', streak:'ຕໍ່ກັນ', best:'ດີສຸດ',
      water:'ລົດນ້ຳ', sun:'ໃຫ້ແສງ', soil:'ໃສ່ປຸ໋ຍ',
      stages:['ແກ່ນ','ໜໍ່','ກຳລັງໂຕ','ໂຕເຕັມທີ່'],
      seedNm:'ແກ່ນພືດ',
      good:'ເກັ່ງຫຼາຍ!', wrong:'ໂອ້ຍ', harvested:'🎉 ເກັບແລ້ວ!'
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'plantcare_stats_v1';
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return { bestStreak: s.bestStreak || 0, totalGrown: s.totalGrown || 0 };
    } catch { return { bestStreak: 0, totalGrown: 0 }; }
  }
  function saveStats(patch) {
    const cur = loadStats();
    const upd = Object.assign({}, cur, patch);
    try { localStorage.setItem(STATS_KEY, JSON.stringify(upd)); } catch {}
    return upd;
  }

  // ===== Audio =====
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
    g.gain.setValueAtTime(vol || 0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + d);
    osc.start(now); osc.stop(now + d + 0.02);
  }
  function play(kind) {
    if (!audioCtx) return;
    if (kind === 'grow')    { beep(550, 0.1, 'triangle', 0.06); setTimeout(() => beep(750, 0.12, 'triangle', 0.06), 90); }
    if (kind === 'wrong')   { beep(220, 0.18, 'sawtooth', 0.06); }
    if (kind === 'harvest') {
      [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.12, 'sine', 0.07), i*90));
    }
  }

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'th';
  })();
  let currentPlant = null;
  let stageIdx = 0;       // 0 = seed, last = fully grown
  let currentNeed = null; // 'water' | 'sun' | 'soil'
  let grown = 0;
  let streak = 0;
  let busy = false;

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const elPlant = $('plant');
  const elBubble = $('bubble');
  const elBubbleIcon = $('bubble-icon');
  const elArena = $('arena');
  const elPlantLabel = $('plant-label');
  const elStages = $('stages');
  const elGrown = $('ui-grown');
  const elStreak = $('ui-streak');
  const elBest = $('ui-best');
  const elToast = $('toast');

  function nameFor(p, l) {
    if (l === 'th') return p.th;
    if (l === 'lao') return p.lo;
    return p.en;
  }

  // ===== Render =====
  function renderStages() {
    elStages.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('div');
      d.className = 'pc-stage-dot';
      if (i < stageIdx) d.classList.add('done');
      else if (i === stageIdx) d.classList.add('current');
      elStages.appendChild(d);
    }
  }
  function renderPlantLabel() {
    if (!currentPlant) {
      elPlantLabel.textContent = '🌱 ' + I18N[lang].seedNm;
      return;
    }
    const stageName = I18N[lang].stages[Math.min(stageIdx, 3)] || '';
    elPlantLabel.textContent = `${currentPlant.stages[stageIdx]} ${nameFor(currentPlant, lang)} · ${stageName}`;
  }

  function showBubble() {
    if (!currentNeed) { elBubble.classList.add('hidden'); return; }
    elBubbleIcon.textContent = NEED_EMOJI[currentNeed];
    elBubble.classList.remove('hidden');
  }

  function pickNewPlant() {
    currentPlant = PLANTS[Math.floor(Math.random() * PLANTS.length)];
    stageIdx = 0;
    elPlant.classList.remove('harvest');
    elPlant.textContent = currentPlant.stages[stageIdx];
    renderPlantLabel();
    renderStages();
    setNewNeed();
  }

  function setNewNeed() {
    currentNeed = NEEDS[Math.floor(Math.random() * NEEDS.length)];
    showBubble();
  }

  function growStage() {
    stageIdx++;
    elPlant.textContent = currentPlant.stages[stageIdx];
    elPlant.classList.remove('growing');
    void elPlant.offsetWidth;
    elPlant.classList.add('growing');
    renderStages();
    renderPlantLabel();
  }

  function showToast(emoji, color) {
    elToast.textContent = emoji;
    if (color) elToast.style.background = color;
    elToast.classList.remove('show');
    void elToast.offsetWidth;
    elToast.classList.add('show');
  }

  // Spawn falling-effect emoji around the plant
  function spawnFx(emoji) {
    const rect = elArena.getBoundingClientRect();
    const count = 5;
    for (let i = 0; i < count; i++) {
      const fx = document.createElement('div');
      fx.className = 'pc-fx';
      fx.textContent = emoji;
      const cx = rect.width / 2 + (Math.random() - 0.5) * 80;
      const cy = rect.height * 0.3 + (Math.random() - 0.5) * 20;
      fx.style.left = cx + 'px';
      fx.style.top = cy + 'px';
      fx.style.animationDuration = (0.8 + Math.random() * 0.4) + 's';
      elArena.appendChild(fx);
      setTimeout(() => fx.remove(), 1200);
    }
  }

  function spawnConfetti() {
    const rect = elArena.getBoundingClientRect();
    const emojis = ['🎉','⭐','✨','🌟','💫'];
    for (let i = 0; i < 14; i++) {
      const c = document.createElement('div');
      c.className = 'pc-confetti';
      c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      c.style.left = (rect.width / 2) + 'px';
      c.style.top = (rect.height * 0.45) + 'px';
      c.style.setProperty('--tx', ((Math.random() - 0.5) * 280) + 'px');
      c.style.setProperty('--ty', (-100 - Math.random() * 200) + 'px');
      c.style.animationDuration = (1.2 + Math.random() * 0.6) + 's';
      elArena.appendChild(c);
      setTimeout(() => c.remove(), 1900);
    }
  }

  // ===== Click handling =====
  function onActionTap(kind) {
    if (busy) return;
    ensureAudio();
    if (kind !== currentNeed) {
      streak = 0;
      elStreak.textContent = '0';
      showToast('❌');
      play('wrong');
      return;
    }
    // Correct action
    spawnFx(NEED_EMOJI[kind]);
    streak++;
    elStreak.textContent = streak;
    play('grow');
    showToast('✅');
    if (stageIdx < currentPlant.stages.length - 1) {
      growStage();
      setNewNeed();
    } else {
      // Plant is at final stage → harvest!
      finishPlant();
    }
  }

  function finishPlant() {
    busy = true;
    currentNeed = null;
    elBubble.classList.add('hidden');
    elPlant.classList.add('harvest');
    spawnConfetti();
    play('harvest');
    showToast('🎉');
    grown++;
    elGrown.textContent = grown;
    const prev = loadStats();
    const updated = saveStats({
      bestStreak: Math.max(prev.bestStreak, streak),
      totalGrown: prev.totalGrown + 1
    });
    elBest.textContent = updated.bestStreak;
    setTimeout(() => {
      busy = false;
      pickNewPlant();
    }, 1400);
  }

  // ===== Buttons =====
  document.querySelectorAll('.pc-btn').forEach(b => {
    b.addEventListener('click', () => onActionTap(b.dataset.kind));
  });

  // ===== Localization =====
  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    $('lbl-grown').textContent = t.grown;
    $('lbl-streak').textContent = t.streak;
    $('lbl-best').textContent = t.best;
    $('lbl-water').textContent = t.water;
    $('lbl-sun').textContent = t.sun;
    $('lbl-soil').textContent = t.soil;
    document.title = t.title;
    renderPlantLabel();
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  // ===== Init =====
  function refreshHud() {
    const s = loadStats();
    elBest.textContent = s.bestStreak;
  }
  applyLang();
  refreshHud();
  pickNewPlant();
})();
