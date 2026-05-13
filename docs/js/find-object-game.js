// Find Object — show object name, tap matching emoji from 4-6 options.
// 30+ household items across categories; higher levels pick distractors from same category.

(() => {
  'use strict';

  // ===== Household items grouped by category =====
  // cat: kitchen | furniture | bath | clothing | electronics | misc
  const ITEMS = [
    // Kitchen
    { em:'🍳', cat:'kitchen',     en:'Pan',         th:'กระทะ',          lo:'ກະທະ' },
    { em:'🍴', cat:'kitchen',     en:'Fork',        th:'ส้อม',           lo:'ສ້ອມ' },
    { em:'🥄', cat:'kitchen',     en:'Spoon',       th:'ช้อน',           lo:'ບ່ວງ' },
    { em:'🔪', cat:'kitchen',     en:'Knife',       th:'มีด',            lo:'ມີດ' },
    { em:'🍽️', cat:'kitchen',     en:'Plate',       th:'จาน',            lo:'ຈານ' },
    { em:'🥛', cat:'kitchen',     en:'Glass',       th:'แก้วน้ำ',        lo:'ຈອກ' },
    { em:'☕', cat:'kitchen',     en:'Cup',         th:'ถ้วยกาแฟ',       lo:'ຖ້ວຍກາເຟ' },
    { em:'🫖', cat:'kitchen',     en:'Teapot',      th:'กาน้ำชา',       lo:'ການ້ຳຊາ' },
    // Furniture
    { em:'🪑', cat:'furniture',   en:'Chair',       th:'เก้าอี้',         lo:'ຕັ່ງ' },
    { em:'🛏️', cat:'furniture',   en:'Bed',         th:'เตียง',          lo:'ຕຽງ' },
    { em:'🛋️', cat:'furniture',   en:'Sofa',        th:'โซฟา',           lo:'ໂຊຟາ' },
    { em:'🪞', cat:'furniture',   en:'Mirror',      th:'กระจก',          lo:'ແວ່ນ' },
    { em:'🪟', cat:'furniture',   en:'Window',      th:'หน้าต่าง',       lo:'ປ່ອງຢ້ຽມ' },
    { em:'🚪', cat:'furniture',   en:'Door',        th:'ประตู',          lo:'ປະຕູ' },
    // Bath
    { em:'🛁', cat:'bath',        en:'Bathtub',     th:'อ่างอาบน้ำ',     lo:'ອ່າງອາບນ້ຳ' },
    { em:'🚿', cat:'bath',        en:'Shower',      th:'ฝักบัว',         lo:'ຝັກບົວ' },
    { em:'🧼', cat:'bath',        en:'Soap',        th:'สบู่',           lo:'ສະບູ່' },
    { em:'🪥', cat:'bath',        en:'Toothbrush',  th:'แปรงสีฟัน',     lo:'ແປງສີຟັນ' },
    { em:'🧻', cat:'bath',        en:'Tissue',      th:'กระดาษทิชชู่',  lo:'ເຈ້ຍຊຳລະ' },
    { em:'🪒', cat:'bath',        en:'Razor',       th:'มีดโกน',         lo:'ມີດແຖ' },
    // Clothing
    { em:'👕', cat:'clothing',    en:'Shirt',       th:'เสื้อ',          lo:'ເສື້ອ' },
    { em:'👖', cat:'clothing',    en:'Pants',       th:'กางเกง',         lo:'ໂສ້ງ' },
    { em:'🧦', cat:'clothing',    en:'Socks',       th:'ถุงเท้า',        lo:'ຖົງຕີນ' },
    { em:'👟', cat:'clothing',    en:'Shoes',       th:'รองเท้า',       lo:'ເກີບ' },
    { em:'🧢', cat:'clothing',    en:'Cap',         th:'หมวก',           lo:'ໝວກ' },
    { em:'🎒', cat:'clothing',    en:'Bag',         th:'กระเป๋า',       lo:'ກະເປົ໋າ' },
    // Electronics
    { em:'📺', cat:'electronics', en:'TV',          th:'ทีวี',           lo:'ໂທລະທັດ' },
    { em:'📱', cat:'electronics', en:'Phone',       th:'โทรศัพท์',       lo:'ໂທລະສັບ' },
    { em:'💻', cat:'electronics', en:'Laptop',      th:'แล็ปท็อป',       lo:'ແລັບທັອບ' },
    { em:'💡', cat:'electronics', en:'Light',       th:'หลอดไฟ',        lo:'ຫຼອດໄຟ' },
    { em:'🕰️', cat:'electronics', en:'Clock',       th:'นาฬิกา',        lo:'ໂມງ' },
    { em:'🎧', cat:'electronics', en:'Headphones',  th:'หูฟัง',         lo:'ຫູຟັງ' },
    // Misc
    { em:'🔑', cat:'misc',        en:'Key',         th:'กุญแจ',         lo:'ກະແຈ' },
    { em:'🌱', cat:'misc',        en:'Plant',       th:'ต้นไม้',         lo:'ຕົ້ນໄມ້' },
    { em:'📚', cat:'misc',        en:'Books',       th:'หนังสือ',       lo:'ປຶ້ມ' },
    { em:'🖼️', cat:'misc',        en:'Picture',     th:'รูปภาพ',         lo:'ຮູບພາບ' }
  ];

  // ===== UI strings =====
  const I18N = {
    th: {
      title:'🏠 หาสิ่งของในบ้าน', back:'← หน้าหลัก',
      level:'เลเวล', score:'คะแนน', lives:'หัวใจ', best:'ดีที่สุด',
      targetLbl:'หา',
      gameover:'จบเกม', overLblScore:'คะแนน', overLblLevel:'เลเวล',
      again:'▶ เล่นใหม่', levelUp:'เลเวล '
    },
    en: {
      title:'🏠 Find Object', back:'← Home',
      level:'Level', score:'Score', lives:'Lives', best:'Best',
      targetLbl:'Find',
      gameover:'Game Over', overLblScore:'Score', overLblLevel:'Level',
      again:'▶ Play Again', levelUp:'Level '
    },
    lao: {
      title:'🏠 ຫາສິ່ງຂອງໃນເຮືອນ', back:'← ໜ້າຫຼັກ',
      level:'ລະດັບ', score:'ຄະແນນ', lives:'ຫົວໃຈ', best:'ດີສຸດ',
      targetLbl:'ຫາ',
      gameover:'ຈົບເກມ', overLblScore:'ຄະແນນ', overLblLevel:'ລະດັບ',
      again:'▶ ຫຼິ້ນອີກ', levelUp:'ລະດັບ '
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'find_object_stats_v1';
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
  let target = null;
  let optionItems = [];
  let answering = false;

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const elOptions = $('options');
  const elLevel = $('ui-level');
  const elScore = $('ui-score');
  const elLives = $('ui-lives');
  const elBest = $('ui-best');
  const elFlash = $('flash');
  const elModalOver = $('modal-over');

  function nameFor(it, l) {
    if (l === 'th') return it.th;
    if (l === 'lao') return it.lo;
    return it.en;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function speak(it) {
    const v = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
    const text = nameFor(it, lang);
    if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
      try { window.AndroidTTS.speak(text, v); return; } catch {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = v; u.rate = 0.85;
        window.speechSynthesis.speak(u);
      } catch {}
    }
  }

  // ===== Level config =====
  function levelConfig(lv) {
    // Easier early: 4 options, distractors from any category
    // Higher levels: more options + distractors from SAME category (harder)
    let nOptions, sameCategoryDistractors;
    if (lv <= 2)      { nOptions = 4; sameCategoryDistractors = false; }
    else if (lv <= 5) { nOptions = 4; sameCategoryDistractors = true; }
    else if (lv <= 9) { nOptions = 6; sameCategoryDistractors = true; }
    else              { nOptions = 6; sameCategoryDistractors = true; }
    return { nOptions, sameCategoryDistractors };
  }

  // ===== Build round =====
  function startRound() {
    answering = false;
    const cfg = levelConfig(level);
    target = ITEMS[Math.floor(Math.random() * ITEMS.length)];

    // Distractor pool
    let pool;
    if (cfg.sameCategoryDistractors) {
      pool = ITEMS.filter(x => x.cat === target.cat && x.em !== target.em);
      if (pool.length < cfg.nOptions - 1) {
        // Fall back to mixed if same-category doesn't have enough
        const rest = ITEMS.filter(x => x.em !== target.em && !pool.includes(x));
        pool = pool.concat(shuffle(rest).slice(0, cfg.nOptions - 1 - pool.length));
      }
    } else {
      pool = ITEMS.filter(x => x.em !== target.em);
    }
    const wrong = shuffle(pool).slice(0, cfg.nOptions - 1);
    optionItems = shuffle([target, ...wrong]);

    // Render
    $('target-name').textContent = nameFor(target, lang);
    const others = ['en','th','lao'].filter(k => k !== lang).map(k => nameFor(target, k)).join(' · ');
    $('target-sub').textContent = others;

    elOptions.classList.toggle('three-col', cfg.nOptions === 6);
    elOptions.innerHTML = '';
    for (const opt of optionItems) {
      const btn = document.createElement('button');
      btn.className = 'fo-opt';
      btn.textContent = opt.em;
      btn.dataset.em = opt.em;
      btn.addEventListener('click', () => onAnswer(btn, opt));
      elOptions.appendChild(btn);
    }
    elLevel.textContent = level;
  }

  function onAnswer(btn, opt) {
    if (answering) return;
    answering = true;
    ensureAudio();
    const correct = opt.em === target.em;
    [...elOptions.querySelectorAll('.fo-opt')].forEach(b => {
      if (b.dataset.em === target.em) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    if (correct) {
      score += 10 + level * 2;
      elScore.textContent = score;
      play('correct');
      speak(target);
      const nextLevel = Math.floor(score / 80) + 1;
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

  // ===== Buttons =====
  $('btn-speak').addEventListener('click', () => {
    ensureAudio();
    if (target) speak(target);
  });
  $('btn-again').addEventListener('click', () => {
    ensureAudio();
    elModalOver.classList.remove('show');
    level = 1; score = 0; lives = 5;
    elLevel.textContent = '1';
    elScore.textContent = '0';
    elLives.textContent = '❤❤❤❤❤';
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
    $('target-lbl').textContent = t.targetLbl;
    $('over-title').textContent = t.gameover;
    $('over-lbl-score').textContent = t.overLblScore;
    $('over-lbl-level').textContent = t.overLblLevel;
    $('btn-again').textContent = t.again;
    document.title = t.title;
    if (target) {
      $('target-name').textContent = nameFor(target, lang);
      const others = ['en','th','lao'].filter(k => k !== lang).map(k => nameFor(target, k)).join(' · ');
      $('target-sub').textContent = others;
    }
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
    elBest.textContent = s.bestScore;
  }
  applyLang();
  refreshHud();
  startRound();
})();
