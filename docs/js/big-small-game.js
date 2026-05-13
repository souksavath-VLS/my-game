// Compare game — show 2 objects with size/position difference, tap matching one.
// Concepts: big/small, tall/short, top/bottom, left/right. Endless levels, lives, multi-lang.

(() => {
  'use strict';

  // ===== Emoji pool — used as the object in each round (random) =====
  const POOL = ['🍎','🐱','🐶','⚽','🚗','🐘','🦁','🦋','🍓','🌳','⭐','🎈','🍩','🐝','🐢','🦄','🌻','🎁','🐧','🐰'];

  // ===== Concepts =====
  // Each concept defines: id, question keys (multi-lang), and how to render the two objects.
  // 'layout' = 'h' (side by side) or 'v' (stacked). 'render(a, b)' takes the 2 obj DOM elements
  // and applies CSS to make the visual difference (size or position).
  const CONCEPTS = [
    {
      id:'big', th:'ใหญ่', en:'biggest', lo:'ໃຫຍ່ສຸດ',
      layout:'h',
      render: (a, b, diff) => {
        // Bigger one is the answer. Sizes scale with level (smaller diff at higher levels)
        const bigPx = 4.5 - diff * 0.5; // rem
        const smallPx = 2.0 + diff * 0.4;
        a.style.fontSize = bigPx + 'rem';
        b.style.fontSize = smallPx + 'rem';
      }
    },
    {
      id:'small', th:'เล็ก', en:'smallest', lo:'ນ້ອຍສຸດ',
      layout:'h',
      render: (a, b, diff) => {
        // a is the small (correct) one
        const smallPx = 2.0 + diff * 0.4;
        const bigPx = 4.5 - diff * 0.5;
        a.style.fontSize = smallPx + 'rem';
        b.style.fontSize = bigPx + 'rem';
      }
    },
    {
      id:'tall', th:'สูง', en:'tallest', lo:'ສູງສຸດ',
      layout:'h',
      render: (a, b, diff) => {
        // Same width, different height via scaleY
        const tallY = 2.0 - diff * 0.15;
        const shortY = 1.0;
        a.style.fontSize = '3.4rem';
        b.style.fontSize = '3.4rem';
        a.style.transform = `scaleY(${tallY})`;
        b.style.transform = `scaleY(${shortY})`;
        // Add a label to make 'tall' clearer
        a.style.minHeight = '180px';
        b.style.minHeight = '180px';
        a.style.alignItems = 'flex-end';
        b.style.alignItems = 'flex-end';
      }
    },
    {
      id:'short', th:'เตี้ย', en:'shortest', lo:'ເຕັ້ຍສຸດ',
      layout:'h',
      render: (a, b, diff) => {
        const shortY = 1.0;
        const tallY = 2.0 - diff * 0.15;
        a.style.fontSize = '3.4rem';
        b.style.fontSize = '3.4rem';
        a.style.transform = `scaleY(${shortY})`;
        b.style.transform = `scaleY(${tallY})`;
        a.style.minHeight = '180px';
        b.style.minHeight = '180px';
        a.style.alignItems = 'flex-end';
        b.style.alignItems = 'flex-end';
      }
    },
    {
      id:'top', th:'อยู่บน', en:'on top', lo:'ຢູ່ເທິງ',
      layout:'v',
      render: (a, b, diff) => {
        // a is on top (correct). Stage is vertical.
        a.style.fontSize = '3.6rem';
        b.style.fontSize = '3.6rem';
      }
    },
    {
      id:'bottom', th:'อยู่ล่าง', en:'at bottom', lo:'ຢູ່ລຸ່ມ',
      layout:'v',
      render: (a, b, diff) => {
        a.style.fontSize = '3.6rem';
        b.style.fontSize = '3.6rem';
      }
    },
    {
      id:'left', th:'อยู่ซ้าย', en:'on left', lo:'ຢູ່ຊ້າຍ',
      layout:'h',
      render: (a, b, diff) => {
        a.style.fontSize = '3.6rem';
        b.style.fontSize = '3.6rem';
      }
    },
    {
      id:'right', th:'อยู่ขวา', en:'on right', lo:'ຢູ່ຂວາ',
      layout:'h',
      render: (a, b, diff) => {
        a.style.fontSize = '3.6rem';
        b.style.fontSize = '3.6rem';
      }
    }
  ];

  const I18N = {
    th: {
      title:'↕️ เปรียบเทียบ', back:'← หน้าหลัก',
      level:'เลเวล', score:'คะแนน', lives:'หัวใจ', best:'ดีที่สุด',
      qPick: (concept) => `เลือกตัวที่ ${concept}`,
      gameover:'จบเกม', overLblScore:'คะแนน', overLblLevel:'เลเวล',
      again:'▶ เล่นใหม่', levelUp:'เลเวล '
    },
    en: {
      title:'↕️ Compare', back:'← Home',
      level:'Level', score:'Score', lives:'Lives', best:'Best',
      qPick: (concept) => `Pick the ${concept}`,
      gameover:'Game Over', overLblScore:'Score', overLblLevel:'Level',
      again:'▶ Play Again', levelUp:'Level '
    },
    lao: {
      title:'↕️ ປຽບທຽບ', back:'← ໜ້າຫຼັກ',
      level:'ລະດັບ', score:'ຄະແນນ', lives:'ຫົວໃຈ', best:'ດີສຸດ',
      qPick: (concept) => `ເລືອກອັນທີ່ ${concept}`,
      gameover:'ຈົບເກມ', overLblScore:'ຄະແນນ', overLblLevel:'ລະດັບ',
      again:'▶ ຫຼິ້ນອີກ', levelUp:'ລະດັບ '
    }
  };

  const STATS_KEY = 'compare_stats_v1';
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
    g.gain.setValueAtTime(vol || 0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + d);
    osc.start(now); osc.stop(now + d + 0.02);
  }
  function play(kind) {
    if (!audioCtx) return;
    if (kind === 'correct') beep(660 + Math.random()*200, 0.1, 'triangle', 0.06);
    if (kind === 'wrong')   { beep(220, 0.16, 'sawtooth', 0.07); setTimeout(() => beep(160, 0.16, 'sawtooth', 0.06), 130); }
    if (kind === 'levelup') {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.13, 'sine', 0.07), i*100));
    }
    if (kind === 'gameover'){ beep(330, 0.2, 'sawtooth', 0.1); setTimeout(() => beep(220, 0.3, 'sawtooth', 0.1), 200); setTimeout(() => beep(165, 0.5, 'sawtooth', 0.1), 480); }
  }

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'th';
  })();
  let level = 1;
  let score = 0;
  let lives = 5;
  let currentConcept = null;
  let correctEl = null;
  let answering = false;

  const $ = id => document.getElementById(id);
  const elStage = $('stage');
  const elQuestion = $('question');
  const elLevel = $('ui-level');
  const elScore = $('ui-score');
  const elLives = $('ui-lives');
  const elBest = $('ui-best');
  const elFlash = $('flash');
  const elModalOver = $('modal-over');

  function conceptLabel(c, l) {
    if (l === 'th') return c.th;
    if (l === 'lao') return c.lo;
    return c.en;
  }
  function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function levelDiff(lv) {
    // 0..7+ → at higher levels the visual difference shrinks (harder to tell)
    if (lv <= 2) return 0;
    if (lv <= 4) return 1;
    if (lv <= 6) return 2;
    if (lv <= 9) return 3;
    return 4;
  }

  function startRound() {
    answering = false;
    currentConcept = randomChoice(CONCEPTS);
    elQuestion.textContent = I18N[lang].qPick(conceptLabel(currentConcept, lang));

    const emoji = randomChoice(POOL);
    // Build 2 objects
    elStage.className = 'bs-stage layout-' + currentConcept.layout;
    elStage.innerHTML = '';
    elStage.style.flexDirection = currentConcept.layout === 'h' ? 'row' : 'column';

    const correctFirst = Math.random() < 0.5; // randomize which side has correct
    const a = document.createElement('div');
    a.className = 'bs-obj';
    a.textContent = emoji;
    const b = document.createElement('div');
    b.className = 'bs-obj';
    b.textContent = emoji;

    // For concepts that depend purely on position (top/bottom/left/right):
    // the FIRST element in flex order is the "first" — top in column, left in row.
    // We need the correct one to be on the right side per concept id.
    // For size/tall/short concepts, the render() function knows which is "a" (correct).
    // We always put the CORRECT element as `correctEl`.
    let firstEl, secondEl;
    if (correctFirst) {
      firstEl = a; secondEl = b;
      correctEl = a;
    } else {
      firstEl = b; secondEl = a;
      correctEl = a;
    }
    // For position concepts, "correct" means matching the layout position:
    // 'top' / 'left' → correct should be first element in flex order
    // 'bottom' / 'right' → correct should be second element
    // So override:
    const pos = currentConcept.id;
    if (pos === 'top' || pos === 'left') {
      firstEl = a; secondEl = b;
      correctEl = a;
    } else if (pos === 'bottom' || pos === 'right') {
      firstEl = b; secondEl = a;
      correctEl = a;
    }

    // Reset inline styles before render
    [a, b].forEach(el => {
      el.style.transform = '';
      el.style.fontSize = '';
      el.style.minHeight = '';
      el.style.alignItems = '';
    });

    // Apply concept-specific rendering (a is "correct" for size/tall/short concepts)
    currentConcept.render(a, b, levelDiff(level));

    a.addEventListener('click', () => onAnswer(a));
    b.addEventListener('click', () => onAnswer(b));
    elStage.appendChild(firstEl);
    elStage.appendChild(secondEl);

    elLevel.textContent = level;
  }

  function onAnswer(picked) {
    if (answering) return;
    answering = true;
    ensureAudio();
    const correct = picked === correctEl;
    [...elStage.querySelectorAll('.bs-obj')].forEach(el => {
      if (el === correctEl) el.classList.add('correct');
      else if (el === picked) el.classList.add('wrong');
      else el.classList.add('dim');
    });
    if (correct) {
      score += 10 + level * 2;
      elScore.textContent = score;
      play('correct');
      const nextLevel = Math.floor(score / 70) + 1;
      const leveledUp = nextLevel > level;
      setTimeout(() => {
        if (leveledUp) {
          level = nextLevel;
          showFlash(I18N[lang].levelUp + level + ' 🎉');
          play('levelup');
        }
        startRound();
      }, 700);
    } else {
      lives--;
      elLives.textContent = '❤'.repeat(Math.max(0, lives)) || '·';
      play('wrong');
      setTimeout(() => {
        if (lives <= 0) gameOver();
        else startRound();
      }, 1100);
    }
  }

  function showFlash(msg) {
    elFlash.textContent = msg;
    elFlash.classList.remove('show');
    void elFlash.offsetWidth;
    elFlash.classList.add('show');
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
    elBest.textContent = updated.bestScore;
    setTimeout(() => elModalOver.classList.add('show'), 500);
  }

  $('btn-again').addEventListener('click', () => {
    ensureAudio();
    elModalOver.classList.remove('show');
    level = 1; score = 0; lives = 5;
    elLevel.textContent = '1';
    elScore.textContent = '0';
    elLives.textContent = '❤❤❤❤❤';
    startRound();
  });

  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    $('lbl-level').textContent = t.level;
    $('lbl-score').textContent = t.score;
    $('lbl-lives').textContent = t.lives;
    $('lbl-best').textContent = t.best;
    $('over-title').textContent = t.gameover;
    $('over-lbl-score').textContent = t.overLblScore;
    $('over-lbl-level').textContent = t.overLblLevel;
    $('btn-again').textContent = t.again;
    document.title = t.title;
    if (currentConcept) elQuestion.textContent = t.qPick(conceptLabel(currentConcept, lang));
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  function refreshHud() {
    const s = loadStats();
    elBest.textContent = s.bestScore;
  }
  applyLang();
  refreshHud();
  startRound();
})();
