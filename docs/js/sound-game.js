// Animal Sounds — listen to a synthesized animal sound, tap matching emoji.
// 14 animals with distinct synth patterns (no WAV files needed). Multi-lang, lives, audio synth.

(() => {
  'use strict';

  // ===== Animals =====
  // file = optional local MP3/OGG (drop files into docs/assets/sound/animals/ to use real recordings)
  // ono  = onomatopoeia spoken via TTS (fallback when no file)
  // pitch/rate = TTS voice modulation to better distinguish animals
  const ANIMALS = [
    { em:'🐱', en:'Cat',      th:'แมว',      lo:'ແມວ',     file:'cat.mp3',     ono:'Meow! Meow!',     pitch:1.6, rate:0.8 },
    { em:'🐶', en:'Dog',      th:'หมา',      lo:'ໝາ',      file:'dog.mp3',     ono:'Woof! Woof!',     pitch:0.7, rate:1.0 },
    { em:'🐮', en:'Cow',      th:'วัว',      lo:'ງົວ',     file:'cow.mp3',     ono:'Moooo!',          pitch:0.5, rate:0.6 },
    { em:'🦆', en:'Duck',     th:'เป็ด',     lo:'ເປັດ',    file:'duck.mp3',    ono:'Quack quack!',    pitch:1.3, rate:1.1 },
    { em:'🐔', en:'Chicken',  th:'ไก่',      lo:'ໄກ່',     file:'chicken.mp3', ono:'Cluck cluck!',    pitch:1.2, rate:1.2 },
    { em:'🐘', en:'Elephant', th:'ช้าง',     lo:'ຊ້າງ',    file:'elephant.mp3',ono:'Trumpet trumpet!',pitch:0.5, rate:0.7 },
    { em:'🐴', en:'Horse',    th:'ม้า',      lo:'ມ້າ',     file:'horse.mp3',   ono:'Neigh!',          pitch:1.0, rate:0.9 },
    { em:'🐑', en:'Sheep',    th:'แกะ',      lo:'ແກະ',     file:'sheep.mp3',   ono:'Baaaa!',          pitch:1.4, rate:0.6 },
    { em:'🐷', en:'Pig',      th:'หมู',       lo:'ໝູ',     file:'pig.mp3',     ono:'Oink oink!',      pitch:0.8, rate:1.0 },
    { em:'🐦', en:'Bird',     th:'นก',       lo:'ນົກ',     file:'bird.mp3',    ono:'Tweet tweet!',    pitch:1.8, rate:1.3 },
    { em:'🐸', en:'Frog',     th:'กบ',       lo:'ກົບ',     file:'frog.mp3',    ono:'Ribbit ribbit!',  pitch:0.6, rate:0.9 },
    { em:'🦁', en:'Lion',     th:'สิงโต',   lo:'ສິງໂຕ',  file:'lion.mp3',    ono:'Roar!',           pitch:0.4, rate:0.5 },
    { em:'🐺', en:'Wolf',     th:'หมาป่า',   lo:'ໝາປ່າ',  file:'wolf.mp3',    ono:'Howwwwwl!',       pitch:0.8, rate:0.5 },
    { em:'🐝', en:'Bee',      th:'ผึ้ง',     lo:'ເຜິ້ງ',  file:'bee.mp3',     ono:'Bzzzzzz!',        pitch:1.5, rate:0.6 }
  ];

  // Cache of <audio> elements for files that load successfully; null = not yet checked; false = file missing.
  const audioCache = {};
  function tryLoadAudio(file) {
    return new Promise((resolve) => {
      if (audioCache[file] !== undefined) {
        return resolve(audioCache[file] || null);
      }
      const audio = new Audio('assets/sound/animals/' + file);
      audio.preload = 'auto';
      const onLoad = () => { audioCache[file] = audio; cleanup(); resolve(audio); };
      const onErr  = () => { audioCache[file] = false;  cleanup(); resolve(null); };
      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onLoad);
        audio.removeEventListener('error', onErr);
      };
      audio.addEventListener('canplaythrough', onLoad);
      audio.addEventListener('error', onErr);
      // Some browsers fire 'canplay' instead — treat that as success too.
      audio.addEventListener('canplay', onLoad);
      // Timeout safeguard (some hosts hang on missing files)
      setTimeout(() => { if (audioCache[file] === undefined) onErr(); }, 1500);
    });
  }

  const I18N = {
    th: {
      title:'🔊 ฟังเสียงสัตว์', back:'← หน้าหลัก',
      level:'เลเวล', score:'คะแนน', lives:'หัวใจ', best:'ดีที่สุด',
      hint:'กดเพื่อฟังเสียงสัตว์',
      hintAfter:'แตะสัตว์ที่ตรงกับเสียง',
      gameover:'จบเกม', overLblScore:'คะแนน', overLblLevel:'เลเวล',
      again:'▶ เล่นใหม่', levelUp:'เลเวล '
    },
    en: {
      title:'🔊 Animal Sounds', back:'← Home',
      level:'Level', score:'Score', lives:'Lives', best:'Best',
      hint:'Tap to hear the animal',
      hintAfter:'Tap the matching animal',
      gameover:'Game Over', overLblScore:'Score', overLblLevel:'Level',
      again:'▶ Play Again', levelUp:'Level '
    },
    lao: {
      title:'🔊 ຟັງສຽງສັດ', back:'← ໜ້າຫຼັກ',
      level:'ລະດັບ', score:'ຄະແນນ', lives:'ຫົວໃຈ', best:'ດີສຸດ',
      hint:'ກົດເພື່ອຟັງສຽງສັດ',
      hintAfter:'ກົດສັດທີ່ກົງກັບສຽງ',
      gameover:'ຈົບເກມ', overLblScore:'ຄະແນນ', overLblLevel:'ລະດັບ',
      again:'▶ ຫຼິ້ນອີກ', levelUp:'ລະດັບ '
    }
  };

  const STATS_KEY = 'sound_stats_v1';
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
  function beep(ctx, f, d, type, vol) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f, now);
    g.gain.setValueAtTime(vol || 0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + d);
    osc.start(now); osc.stop(now + d + 0.02);
  }
  function uiBeep(kind) {
    if (!audioCtx) return;
    if (kind === 'correct') beep(audioCtx, 660 + Math.random()*200, 0.1, 'triangle', 0.06);
    if (kind === 'wrong')   { beep(audioCtx, 220, 0.18, 'sawtooth', 0.07); setTimeout(() => beep(audioCtx, 160, 0.16, 'sawtooth', 0.06), 150); }
    if (kind === 'levelup') {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(audioCtx, f, 0.13, 'sine', 0.07), i*100));
    }
    if (kind === 'gameover'){ beep(audioCtx, 330, 0.2, 'sawtooth', 0.1); setTimeout(() => beep(audioCtx, 220, 0.3, 'sawtooth', 0.1), 200); setTimeout(() => beep(audioCtx, 165, 0.5, 'sawtooth', 0.1), 480); }
  }

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'th';
  })();
  let level = 1;
  let score = 0;
  let lives = 5;
  let currentAnimal = null;
  let optionItems = [];
  let answering = false;
  let hasPlayed = false;

  const $ = id => document.getElementById(id);
  const elPlay = $('btn-play');
  const elHint = $('hint');
  const elOptions = $('options');
  const elLevel = $('ui-level');
  const elScore = $('ui-score');
  const elLives = $('ui-lives');
  const elBest = $('ui-best');
  const elFlash = $('flash');
  const elModalOver = $('modal-over');

  function nameFor(a, l) {
    if (l === 'th') return a.th;
    if (l === 'lao') return a.lo;
    return a.en;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function speak(a) {
    const v = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
    const text = nameFor(a, lang);
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

  async function playAnimalSound() {
    if (!currentAnimal) return;
    elPlay.classList.add('playing');
    const stopAnim = (ms) => setTimeout(() => elPlay.classList.remove('playing'), ms);

    // 1) Try real MP3 first
    let audio = null;
    if (currentAnimal.file) {
      audio = await tryLoadAudio(currentAnimal.file);
    }
    if (audio) {
      try {
        audio.currentTime = 0;
        audio.volume = 1.0;
        await audio.play();
        stopAnim((audio.duration ? audio.duration * 1000 : 1200) + 100);
        hasPlayed = true;
        elHint.textContent = I18N[lang].hintAfter;
        return;
      } catch (e) {
        // Autoplay block or other error — fall through to TTS
      }
    }

    // 2) Fallback: TTS speaks the onomatopoeia ("Meow!", "Woof!"...) with pitch/rate variation
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(currentAnimal.ono);
        u.lang = 'en-US';
        u.pitch = currentAnimal.pitch || 1.0;
        u.rate  = currentAnimal.rate  || 1.0;
        window.speechSynthesis.speak(u);
      } catch {}
    }
    stopAnim(1500);
    hasPlayed = true;
    elHint.textContent = I18N[lang].hintAfter;
  }

  // ===== Level config =====
  function levelConfig(lv) {
    let nOptions;
    if (lv <= 2) nOptions = 2;       // very easy: 2 options
    else if (lv <= 4) nOptions = 3;
    else if (lv <= 7) nOptions = 4;
    else nOptions = 4;                // capped at 4 (mobile screen)
    return { nOptions };
  }

  function startRound() {
    answering = false;
    hasPlayed = false;
    const cfg = levelConfig(level);
    currentAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const wrong = shuffle(ANIMALS.filter(a => a.em !== currentAnimal.em)).slice(0, cfg.nOptions - 1);
    optionItems = shuffle([currentAnimal, ...wrong]);

    // Layout 2 cols if 2 or 4 options, 3 cols if 3 options
    if (cfg.nOptions === 3) elOptions.style.gridTemplateColumns = 'repeat(3, 1fr)';
    else elOptions.style.gridTemplateColumns = 'repeat(2, 1fr)';

    elOptions.innerHTML = '';
    for (const opt of optionItems) {
      const btn = document.createElement('button');
      btn.className = 'sg-opt';
      btn.dataset.em = opt.em;
      btn.innerHTML = `
        <div class="em">${opt.em}</div>
        <div class="name">${nameFor(opt, lang)}</div>
      `;
      btn.addEventListener('click', () => onAnswer(btn, opt));
      elOptions.appendChild(btn);
    }
    elLevel.textContent = level;
    elHint.textContent = I18N[lang].hint;
    // Auto-play sound after a short pause so it's not jarring
    setTimeout(() => { ensureAudio(); if (audioCtx) playAnimalSound(); }, 350);
  }

  function onAnswer(btn, opt) {
    if (answering) return;
    answering = true;
    ensureAudio();
    const correct = opt.em === currentAnimal.em;
    [...elOptions.querySelectorAll('.sg-opt')].forEach(b => {
      if (b.dataset.em === currentAnimal.em) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    if (correct) {
      score += 10 + level * 2;
      elScore.textContent = score;
      uiBeep('correct');
      speak(currentAnimal);
      const nextLevel = Math.floor(score / 70) + 1;
      const leveledUp = nextLevel > level;
      setTimeout(() => {
        if (leveledUp) {
          level = nextLevel;
          showFlash(I18N[lang].levelUp + level + ' 🎉');
          uiBeep('levelup');
        }
        startRound();
      }, 1000);
    } else {
      lives--;
      elLives.textContent = '❤'.repeat(Math.max(0, lives)) || '·';
      uiBeep('wrong');
      setTimeout(() => {
        if (lives <= 0) gameOver();
        else startRound();
      }, 1200);
    }
  }

  function showFlash(msg) {
    elFlash.textContent = msg;
    elFlash.classList.remove('show');
    void elFlash.offsetWidth;
    elFlash.classList.add('show');
  }

  function gameOver() {
    uiBeep('gameover');
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

  // Wire buttons
  elPlay.addEventListener('click', () => {
    ensureAudio();
    playAnimalSound();
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
    elHint.textContent = hasPlayed ? t.hintAfter : t.hint;
    // Re-render options to update names
    if (optionItems.length) {
      for (const b of elOptions.querySelectorAll('.sg-opt')) {
        const opt = optionItems.find(o => o.em === b.dataset.em);
        if (opt) b.querySelector('.name').textContent = nameFor(opt, lang);
      }
    }
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
