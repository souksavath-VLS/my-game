// Hide-and-Seek (Shell Game)
// Place object in a box → reveal → close all → shuffle by animated swaps → player taps → reveal all → next round.
// Mobile-first, multi-language, localStorage best score, Web Audio sounds.

(() => {
  'use strict';

  // ===== Objects pool (rotates each round) =====
  const OBJECTS = ['🎁','⚽','🍎','🐶','🐱','🌟','⭐','🍓','🚗','🦋','🍩','🐢','🧸','🎈','🍪','🐧','🌈','🌻','🍕','💎'];

  // ===== UI strings =====
  const I18N = {
    th: {
      title: '🎩 เกมซ่อนหา', back: '← หน้าหลัก',
      level: 'เลเวล', score: 'คะแนน', lives: 'หัวใจ', best: 'ดีที่สุด',
      start: '▶ เริ่ม', skip: '⏭ ข้าม', next: '▶ ถัดไป', restart: '▶ เล่นใหม่',
      ready: 'กดเริ่ม เพื่อเล่น',
      watch: '👀 จำตำแหน่งของ ',
      shuffle: '🔀 กำลังสับ...',
      pick: '🤔 คลิกกล่องที่ของซ่อนอยู่',
      correct: '✅ เก่งมาก!',
      wrong: '❌ เสียใจด้วย',
      gameover: 'จบเกม',
      overScore: 'คะแนน', overLevel: 'ถึงเลเวล'
    },
    en: {
      title: '🎩 Hide & Seek', back: '← Home',
      level: 'Level', score: 'Score', lives: 'Lives', best: 'Best',
      start: '▶ Start', skip: '⏭ Skip', next: '▶ Next', restart: '▶ Play Again',
      ready: 'Press Start to play',
      watch: '👀 Remember where the ',
      shuffle: '🔀 Shuffling...',
      pick: '🤔 Tap the box hiding the object',
      correct: '✅ Great!',
      wrong: '❌ Oh no',
      gameover: 'Game Over',
      overScore: 'Score', overLevel: 'Reached level'
    },
    lao: {
      title: '🎩 ເກມຊ່ອນຫາ', back: '← ໜ້າຫຼັກ',
      level: 'ລະດັບ', score: 'ຄະແນນ', lives: 'ຫົວໃຈ', best: 'ດີສຸດ',
      start: '▶ ເລີ່ມ', skip: '⏭ ຂ້າມ', next: '▶ ຕໍ່ໄປ', restart: '▶ ຫຼິ້ນອີກ',
      ready: 'ກົດເລີ່ມ ເພື່ອຫຼິ້ນ',
      watch: '👀 ຈື່ຕຳແໜ່ງຂອງ ',
      shuffle: '🔀 ກຳລັງສັບ...',
      pick: '🤔 ກົດກ່ອງທີ່ຊ່ອນຂອງ',
      correct: '✅ ເກັ່ງຫຼາຍ!',
      wrong: '❌ ເສຍດາຍ',
      gameover: 'ຈົບເກມ',
      overScore: 'ຄະແນນ', overLevel: 'ເຖິງລະດັບ'
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'hs_stats_v1';
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return {
        bestScore: s.bestScore | 0,
        bestLevel: s.bestLevel | 0,
        muted: !!s.muted
      };
    } catch { return { bestScore: 0, bestLevel: 0, muted: false }; }
  }
  function saveStats(patch) {
    const cur = loadStats();
    const updated = Object.assign({}, cur, patch);
    try { localStorage.setItem(STATS_KEY, JSON.stringify(updated)); } catch {}
    return updated;
  }

  // ===== Web Audio (synth, no file loads) =====
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function beep(freq, dur, type, vol) {
    if (!audioCtx) return;
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
  function playSound(kind) {
    if (!audioCtx) return;
    if (kind === 'tick')    beep(440, 0.06, 'square', 0.04);
    if (kind === 'reveal')  { beep(660, 0.08, 'triangle', 0.06); setTimeout(() => beep(880, 0.1, 'triangle', 0.06), 90); }
    if (kind === 'correct') {
      beep(523, 0.1, 'sine', 0.08);
      setTimeout(() => beep(659, 0.1, 'sine', 0.08), 110);
      setTimeout(() => beep(784, 0.18, 'sine', 0.08), 220);
    }
    if (kind === 'wrong')   { beep(220, 0.18, 'sawtooth', 0.08); setTimeout(() => beep(165, 0.22, 'sawtooth', 0.08), 180); }
    if (kind === 'gameover'){ beep(330, 0.2, 'sawtooth', 0.1); setTimeout(() => beep(220, 0.3, 'sawtooth', 0.1), 200); setTimeout(() => beep(165, 0.5, 'sawtooth', 0.1), 480); }
  }

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'th';
  })();
  let level = 1;
  let score = 0;
  let lives = 3;
  let phase = 'idle'; // 'idle' | 'reveal' | 'shuffle' | 'pick' | 'reveal-all'
  let currentObject = '🎁';
  let positions = [];   // positions[i] = visual slot index of box i
  let objectBoxId = 0;  // which box index hides the object
  let boxes = [];       // DOM refs

  // ===== Level config =====
  function cfg() {
    const boxCount = Math.min(5, 2 + Math.floor((level + 1) / 2));   // L1:3, L2:3, L3:4, L4:4, L5:5, L6+:5
    const shuffleCount = 3 + Math.floor(level * 1.4);                // L1:4 ... L10:17
    const shuffleDur = Math.max(180, 430 - level * 22);              // ms per swap
    const revealDur = Math.max(900, 1700 - level * 60);              // ms to show the object
    return { boxCount, shuffleCount, shuffleDur, revealDur };
  }

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const elTrack = $('track');
  const elStatus = $('status');
  const elStart = $('btn-start');
  const elSkip = $('btn-skip');
  const elLevel = $('ui-level');
  const elScore = $('ui-score');
  const elLives = $('ui-lives');
  const elBest = $('ui-best');
  const elOver = $('overlay-over');
  const elOverScore = $('over-score');
  const elOverLevel = $('over-level');
  const elNewBest = $('newbest');
  const elOverTitle = $('over-title');
  const elBtnRestart = $('btn-restart');

  // ===== Layout =====
  function trackMetrics(n) {
    const trackW = elTrack.clientWidth;
    // Determine box width / gap to fit n boxes within trackW
    // Box width: from CSS — 78px (or 64 on narrow). Re-measure at runtime.
    const probe = document.createElement('div');
    probe.className = 'hs-box';
    probe.style.visibility = 'hidden';
    probe.style.position = 'absolute';
    elTrack.appendChild(probe);
    const bw = probe.offsetWidth;
    probe.remove();
    let gap = 14;
    let totalW = n * bw + (n - 1) * gap;
    if (totalW > trackW) {
      // Shrink gap until it fits (allow overlap minimum gap 4px)
      gap = Math.max(4, (trackW - n * bw) / (n - 1));
      totalW = n * bw + (n - 1) * gap;
    }
    const startX = Math.max(0, (trackW - totalW) / 2);
    return { bw, gap, startX };
  }

  function repositionBoxes() {
    const m = trackMetrics(boxes.length);
    for (let i = 0; i < boxes.length; i++) {
      const slot = positions[i];
      const x = m.startX + slot * (m.bw + m.gap);
      boxes[i].style.transform = `translateX(${x}px)`;
    }
  }

  // ===== Build round =====
  function buildBoxes(n) {
    elTrack.innerHTML = '';
    boxes = [];
    positions = [];
    for (let i = 0; i < n; i++) {
      const b = document.createElement('div');
      b.className = 'hs-box locked';
      b.textContent = '📦';
      b.dataset.id = i;
      b.addEventListener('click', () => onBoxTap(i));
      elTrack.appendChild(b);
      boxes.push(b);
      positions.push(i);
    }
    repositionBoxes();
  }

  // ===== Phase: setup → reveal → shuffle → pick → reveal-all =====
  function startRound() {
    phase = 'reveal';
    elSkip.disabled = false;
    elSkip.style.opacity = '1';
    elStart.disabled = true;
    elStart.style.opacity = '0.5';

    const c = cfg();
    currentObject = OBJECTS[Math.floor(Math.random() * OBJECTS.length)];
    objectBoxId = Math.floor(Math.random() * c.boxCount);
    buildBoxes(c.boxCount);

    // Show watch instruction with object
    elStatus.textContent = I18N[lang].watch + currentObject;
    playSound('reveal');

    // Reveal the box containing the object briefly
    const box = boxes[objectBoxId];
    box.classList.add('revealing');
    box.textContent = currentObject;

    setTimeout(() => {
      // Close it
      box.classList.remove('revealing');
      box.textContent = '📦';
      // Begin shuffle phase
      shufflePhase(c);
    }, c.revealDur);
  }

  async function shufflePhase(c) {
    phase = 'shuffle';
    elStatus.textContent = I18N[lang].shuffle;
    // Sync CSS transition to the configured shuffle duration so the slide finishes before the next swap
    for (const b of boxes) b.style.transition = `transform ${c.shuffleDur}ms cubic-bezier(.4,.2,.3,1.2)`;
    for (let s = 0; s < c.shuffleCount; s++) {
      // Pick two distinct slots
      const a = Math.floor(Math.random() * boxes.length);
      let b = Math.floor(Math.random() * boxes.length);
      while (b === a) b = Math.floor(Math.random() * boxes.length);
      // Find which boxes are currently at those slots
      const boxA = positions.indexOf(a);
      const boxB = positions.indexOf(b);
      // Swap their slots
      [positions[boxA], positions[boxB]] = [positions[boxB], positions[boxA]];
      repositionBoxes();
      playSound('tick');
      await sleep(c.shuffleDur);
    }
    pickPhase();
  }

  function pickPhase() {
    phase = 'pick';
    elStatus.textContent = I18N[lang].pick;
    for (const b of boxes) b.classList.remove('locked');
    elSkip.disabled = false;
    elSkip.style.opacity = '1';
  }

  function onBoxTap(boxId) {
    if (phase !== 'pick') return;
    phase = 'reveal-all';
    for (const b of boxes) b.classList.add('locked');
    const correct = boxId === objectBoxId;
    if (correct) {
      score += 10 * level;
      boxes[boxId].classList.add('correct');
      boxes[boxId].textContent = currentObject;
      elStatus.textContent = I18N[lang].correct;
      playSound('correct');
    } else {
      lives--;
      boxes[boxId].classList.add('wrong');
      boxes[boxId].textContent = '❌';
      boxes[objectBoxId].classList.add('correct');
      boxes[objectBoxId].textContent = currentObject;
      elStatus.textContent = I18N[lang].wrong;
      playSound('wrong');
    }
    updateHud();
    setTimeout(() => {
      if (lives <= 0) {
        gameOver();
      } else {
        if (correct) level++;
        startRound();
      }
    }, 1500);
  }

  function gameOver() {
    phase = 'over';
    playSound('gameover');
    const prev = loadStats();
    const isNewBest = score > prev.bestScore;
    const updated = saveStats({
      bestScore: Math.max(prev.bestScore, score),
      bestLevel: Math.max(prev.bestLevel, level)
    });
    elOverTitle.textContent = I18N[lang].gameover;
    elOverScore.textContent = score;
    elOverLevel.textContent = level;
    elNewBest.style.display = (isNewBest && score > 0) ? 'inline-block' : 'none';
    elOver.classList.add('show');
    updateHud();
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ===== HUD =====
  function updateHud() {
    elLevel.textContent = level;
    elScore.textContent = score;
    elLives.textContent = '❤'.repeat(Math.max(0, lives)) || '·';
    elBest.textContent = loadStats().bestScore;
  }

  // ===== Buttons =====
  elStart.addEventListener('click', () => {
    ensureAudio();
    // Start fresh game when pressed from idle/menu state
    if (phase === 'idle' || phase === 'over') {
      level = 1; score = 0; lives = 3; elOver.classList.remove('show');
      updateHud();
    }
    startRound();
  });

  elSkip.addEventListener('click', () => {
    if (phase === 'pick' || phase === 'reveal-all') {
      // During pick, skip = treat as wrong but don't lose a life (lenient)
      if (phase === 'pick') {
        phase = 'reveal-all';
        for (const b of boxes) b.classList.add('locked');
        boxes[objectBoxId].classList.add('correct');
        boxes[objectBoxId].textContent = currentObject;
        elStatus.textContent = I18N[lang].wrong;
        setTimeout(() => { if (lives > 0) startRound(); }, 1200);
      }
    }
  });

  elBtnRestart.addEventListener('click', () => {
    ensureAudio();
    elOver.classList.remove('show');
    level = 1; score = 0; lives = 3;
    updateHud();
    startRound();
  });

  // ===== Localization =====
  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    $('lbl-level').textContent = t.level;
    $('lbl-score').textContent = t.score;
    $('lbl-lives').textContent = t.lives;
    $('lbl-best').textContent = t.best;
    $('over-lbl-score').textContent = t.overScore;
    $('over-lbl-level').textContent = t.overLevel;
    elStart.textContent = t.start;
    elSkip.textContent = t.skip;
    elBtnRestart.textContent = t.restart;
    if (phase === 'idle') elStatus.textContent = t.ready;
    document.title = t.title;
  }

  // React to language change from index page (other tab)
  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') {
        lang = v;
        applyLang();
      }
    }
  });

  // Resize → reposition
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (boxes.length) repositionBoxes(); }, 100);
  });

  // Init
  applyLang();
  updateHud();
  // Show decorative idle boxes so the stage isn't empty before the player presses Start
  buildBoxes(3);
})();
