// Lucky Animal Draw — traditional Lao "huay sat" fortune game.
// User picks 1 card from a face-down deck; card reveals an animal with 3 lucky numbers.

(() => {
  'use strict';

  // ===== Dataset — 40 traditional lottery animals (num 1..40).
  // Lucky numbers follow the classic pattern (n, n+40, n+80) mod 100 (0 → "00").
  const ANIMALS = [
    { num: 1,  lo:'ປາ',       th:'ปลา',     en:'Fish',      emoji:'🐟', bgTop:'#7dd3fc', bgBot:'#0284c7' },
    { num: 2,  lo:'ຫອຍ',      th:'หอย',     en:'Shell',     emoji:'🐚', bgTop:'#fbcfe8', bgBot:'#be185d' },
    { num: 3,  lo:'ຫ່ານ',     th:'ห่าน',    en:'Goose',     emoji:'🦢', bgTop:'#e0f2fe', bgBot:'#0369a1' },
    { num: 4,  lo:'ນົກຍູງ',   th:'นกยูง',  en:'Peacock',   emoji:'🦚', bgTop:'#a5f3fc', bgBot:'#0e7490' },
    { num: 5,  lo:'ເສືອ',     th:'เสือ',    en:'Tiger',     emoji:'🐅', bgTop:'#fde68a', bgBot:'#b45309' },
    { num: 6,  lo:'ໝູ',       th:'หมู',     en:'Pig',       emoji:'🐖', bgTop:'#fbcfe8', bgBot:'#9d174d' },
    { num: 7,  lo:'ຊ້າງ',     th:'ช้าง',    en:'Elephant',  emoji:'🐘', bgTop:'#cbd5e1', bgBot:'#334155' },
    { num: 8,  lo:'ແພະ',      th:'แพะ',     en:'Goat',      emoji:'🐐', bgTop:'#e7e5e4', bgBot:'#57534e' },
    { num: 9,  lo:'ລິງ',      th:'ลิง',     en:'Monkey',    emoji:'🐒', bgTop:'#fed7aa', bgBot:'#78350f' },
    { num:10,  lo:'ແມວ',      th:'แมว',     en:'Cat',       emoji:'🐈', bgTop:'#fde68a', bgBot:'#78350f' },
    { num:11,  lo:'ແຂ້',      th:'จระเข้',  en:'Crocodile', emoji:'🐊', bgTop:'#bbf7d0', bgBot:'#14532d' },
    { num:12,  lo:'ງູ',       th:'งู',       en:'Snake',    emoji:'🐍', bgTop:'#d9f99d', bgBot:'#365314' },
    { num:13,  lo:'ມ້າ',      th:'ม้า',     en:'Horse',     emoji:'🐎', bgTop:'#fef3c7', bgBot:'#78350f' },
    { num:14,  lo:'ໄກ່',      th:'ไก่',     en:'Chicken',   emoji:'🐓', bgTop:'#fecaca', bgBot:'#7f1d1d' },
    { num:15,  lo:'ງົວ',      th:'วัว',     en:'Cow',       emoji:'🐄', bgTop:'#fed7aa', bgBot:'#7c2d12' },
    { num:16,  lo:'ຄວາຍ',     th:'ควาย',    en:'Buffalo',   emoji:'🐃', bgTop:'#cbd5e1', bgBot:'#1e293b' },
    { num:17,  lo:'ໝີ',       th:'หมี',     en:'Bear',      emoji:'🐻', bgTop:'#fef3c7', bgBot:'#78350f' },
    { num:18,  lo:'ກວາງ',     th:'กวาง',    en:'Deer',      emoji:'🦌', bgTop:'#fde68a', bgBot:'#7c2d12' },
    { num:19,  lo:'ໝາ',       th:'สุนัข',   en:'Dog',       emoji:'🐕', bgTop:'#fef3c7', bgBot:'#78350f' },
    { num:20,  lo:'ກະຕ່າຍ',   th:'กระต่าย', en:'Rabbit',    emoji:'🐇', bgTop:'#fce7f3', bgBot:'#831843' },
    { num:21,  lo:'ນົກອິນຊີ', th:'อินทรี',  en:'Eagle',     emoji:'🦅', bgTop:'#e2e8f0', bgBot:'#0f172a' },
    { num:22,  lo:'ກົບ',      th:'กบ',      en:'Frog',      emoji:'🐸', bgTop:'#bbf7d0', bgBot:'#166534' },
    { num:23,  lo:'ຜີເສື້ອ',  th:'ผีเสื้อ', en:'Butterfly', emoji:'🦋', bgTop:'#c4b5fd', bgBot:'#5b21b6' },
    { num:24,  lo:'ເຕົ່າ',    th:'เต่า',    en:'Turtle',    emoji:'🐢', bgTop:'#bbf7d0', bgBot:'#166534' },
    { num:25,  lo:'ປູ',       th:'ปู',      en:'Crab',      emoji:'🦀', bgTop:'#fecaca', bgBot:'#991b1b' },
    { num:26,  lo:'ຫນູ',      th:'หนู',     en:'Mouse',     emoji:'🐁', bgTop:'#e5e7eb', bgBot:'#374151' },
    { num:27,  lo:'ເຜິ້ງ',    th:'ผึ้ง',   en:'Bee',       emoji:'🐝', bgTop:'#fef08a', bgBot:'#854d0e' },
    { num:28,  lo:'ນົກເຄົ້າ', th:'นกฮูก',   en:'Owl',       emoji:'🦉', bgTop:'#d6d3d1', bgBot:'#44403c' },
    { num:29,  lo:'ສິງໂຕ',    th:'สิงโต',   en:'Lion',      emoji:'🦁', bgTop:'#fef3c7', bgBot:'#b45309' },
    { num:30,  lo:'ໂລມາ',     th:'โลมา',    en:'Dolphin',   emoji:'🐬', bgTop:'#bae6fd', bgBot:'#075985' },
    { num:31,  lo:'ອູດ',      th:'อูฐ',     en:'Camel',     emoji:'🐪', bgTop:'#fde68a', bgBot:'#78350f' },
    { num:32,  lo:'ແມງມຸມ',   th:'แมงมุม',  en:'Spider',    emoji:'🕷️', bgTop:'#e5e7eb', bgBot:'#111827' },
    { num:33,  lo:'ແມງງອດ',   th:'แมงป่อง', en:'Scorpion',  emoji:'🦂', bgTop:'#fecaca', bgBot:'#7f1d1d' },
    { num:34,  lo:'ກຸ້ງ',     th:'กุ้ง',    en:'Shrimp',    emoji:'🦐', bgTop:'#fecaca', bgBot:'#9a3412' },
    { num:35,  lo:'ຄ້າງຄາວ',  th:'ค้างคาว', en:'Bat',       emoji:'🦇', bgTop:'#a1a1aa', bgBot:'#18181b' },
    { num:36,  lo:'ນຳຊ້າງ',   th:'ปลาวาฬ',  en:'Whale',     emoji:'🐋', bgTop:'#7dd3fc', bgBot:'#075985' },
    { num:37,  lo:'ມັງກອນ',   th:'มังกร',   en:'Dragon',    emoji:'🐉', bgTop:'#86efac', bgBot:'#14532d' },
    { num:38,  lo:'ຢີຣາຟ',    th:'ยีราฟ',   en:'Giraffe',   emoji:'🦒', bgTop:'#fde68a', bgBot:'#78350f' },
    { num:39,  lo:'ແກະ',      th:'แกะ',     en:'Sheep',     emoji:'🐑', bgTop:'#f5f5f4', bgBot:'#57534e' },
    { num:40,  lo:'ເພັນກວິນ', th:'เพนกวิน', en:'Penguin',   emoji:'🐧', bgTop:'#cbd5e1', bgBot:'#0f172a' }
  ];

  const I18N = {
    th: {
      title:'🔮 สุ่มสัตว์นำโชค ✨',
      sub:'เปิดการ์ดสัตว์นำโชค ลุ้นเลขเสี่ยงประจำวัน!',
      hint:'แตะเลือกการ์ด 1 ใบ เพื่อทำนายสัตว์นำโชคของคุณ',
      shuffle:'สับการ์ด', random:'สุ่มการ์ด',
      heading:'สัตว์นำโชคของคุณคือ...',
      close:'✕ ปิด', again:'🔀 สุ่มใหม่',
      shuffled:'🔀 สับการ์ดเรียบร้อย',
      alreadyOpened:'เลือกได้ 1 ใบต่อรอบ กด "สับการ์ด" เพื่อเริ่มใหม่'
    },
    en: {
      title:'🔮 Lucky Animal Draw ✨',
      sub:'Flip a card to reveal your lucky animal & numbers!',
      hint:'Tap one card to reveal your fortune',
      shuffle:'Shuffle', random:'Random',
      heading:'Your lucky animal is...',
      close:'✕ Close', again:'🔀 Play Again',
      shuffled:'🔀 Cards shuffled',
      alreadyOpened:'One draw per round. Tap Shuffle to play again.'
    },
    lao: {
      title:'🔮 ສຸ່ມສັດນຳໂຊກ ✨',
      sub:'ເປີດການ໌ດສັດນຳໂຊກ ລຸ້ນເລກເສີ່ຍປະຈຳວັນ!',
      hint:'ກົດເລືອກການ໌ດ 1 ໃບ ເພື່ອທຳນາຍສັດນຳໂຊກຂອງທ່ານ',
      shuffle:'ສັບການ໌ດ', random:'ສຸ່ມການ໌ດ',
      heading:'ສັດນຳໂຊກຂອງທ່ານຄື...',
      close:'✕ ປິດ', again:'🔀 ສຸ່ມໃໝ່',
      shuffled:'🔀 ສັບການ໌ດຮຽບຮ້ອຍ',
      alreadyOpened:'ເລືອກໄດ້ 1 ໃບຕໍ່ຮອບ ກົດ "ສັບການ໌ດ" ເພື່ອເລີ່ມໃໝ່'
    }
  };

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'lao';
  })();
  let deck = [];          // shuffled ANIMALS array
  let revealedIdx = null; // index of the currently-revealed card
  let locked = false;     // true = board interactions blocked

  const $ = id => document.getElementById(id);

  // ===== Helpers =====
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function nameFor(a) {
    if (lang === 'th') return a.th;
    if (lang === 'en') return a.en;
    return a.lo;
  }
  function fmt2(n) {
    const v = ((n - 1) % 100 + 100) % 100 + 1;   // normalise 1..100
    return String(v === 100 ? 0 : v).padStart(2, '0');
  }
  function luckyNumbers(num) {
    return [fmt2(num), fmt2(num + 40), fmt2(num + 80)];
  }
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }

  // ===== Audio (Web Audio API synth — no external files) =====
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
    ensureAudio();
    if (!audioCtx) return;
    if (kind === 'flip')    beep(660 + Math.random()*100, 0.08, 'triangle', 0.05);
    if (kind === 'shuffle') {
      for (let i = 0; i < 6; i++) setTimeout(() => beep(220 + Math.random()*400, 0.05, 'square', 0.03), i * 50);
    }
    if (kind === 'reveal') {
      [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.14, 'sine', 0.06), i * 90));
    }
    if (kind === 'sparkle') {
      [1319, 1568, 2093].forEach((f, i) => setTimeout(() => beep(f, 0.08, 'triangle', 0.04), i * 60));
    }
  }

  // ===== Build board =====
  function buildBoard() {
    deck = shuffle(ANIMALS);
    revealedIdx = null;
    locked = false;
    const board = $('board');
    board.innerHTML = '';
    for (let i = 0; i < deck.length; i++) {
      const card = document.createElement('div');
      card.className = 'la-card';
      card.dataset.i = i;
      card.innerHTML = `
        <div class="la-card-inner">
          <div class="la-card-face la-card-back"><span class="la-card-back-ic">☰</span></div>
          <div class="la-card-face la-card-front"><span class="em">${deck[i].emoji}</span></div>
        </div>
      `;
      card.addEventListener('click', () => onCardClick(i));
      board.appendChild(card);
    }
  }

  function onCardClick(i) {
    if (locked) {
      toast(I18N[lang].alreadyOpened);
      return;
    }
    revealCard(i);
  }

  function revealCard(i) {
    if (locked) return;
    locked = true;
    revealedIdx = i;
    const cards = $('board').querySelectorAll('.la-card');
    cards.forEach((el, idx) => {
      if (idx === i) {
        el.classList.add('flipped');
      } else {
        el.classList.add('dim');
      }
    });
    play('flip');
    setTimeout(() => showPrizeModal(deck[i]), 550);
  }

  function showPrizeModal(animal) {
    const t = I18N[lang];
    $('modal-heading').textContent = t.heading;
    $('prize-name').textContent = nameFor(animal);
    $('artwork-emoji').textContent = animal.emoji;
    $('artwork').style.setProperty('--bg-top', animal.bgTop);
    $('artwork').style.setProperty('--bg-bot', animal.bgBot);
    const nums = luckyNumbers(animal.num);
    const numsEl = $('prize-numbers');
    numsEl.innerHTML = '';
    for (const n of nums) {
      const el = document.createElement('div');
      el.className = 'la-num';
      el.textContent = n;
      numsEl.appendChild(el);
    }
    $('modal').classList.add('show');
    play('reveal');
    setTimeout(() => play('sparkle'), 550);
  }

  function hideModal() {
    $('modal').classList.remove('show');
  }

  // ===== Actions =====
  function shuffleAction() {
    ensureAudio();
    play('shuffle');
    const cards = $('board').querySelectorAll('.la-card');
    // Trigger shake animation
    cards.forEach((el, idx) => {
      el.classList.remove('flipped', 'dim');
      setTimeout(() => {
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 550);
      }, idx * 8);
    });
    // Reshuffle deck under the covers once shake finishes
    setTimeout(() => {
      buildBoard();
      toast(I18N[lang].shuffled);
    }, 620 + cards.length * 8);
  }
  function randomAction() {
    ensureAudio();
    if (locked) { hideModal(); }
    // Briefly shuffle visually then reveal a random card
    const cards = $('board').querySelectorAll('.la-card');
    cards.forEach((el) => { el.classList.remove('flipped', 'dim'); });
    locked = false;
    // Rapid "spinning" sequence highlighting random cards
    let ticks = 0;
    const maxTicks = 14;
    const interval = setInterval(() => {
      cards.forEach(el => el.classList.remove('shake'));
      const j = Math.floor(Math.random() * cards.length);
      cards[j].classList.add('shake');
      play('flip');
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        cards.forEach(el => el.classList.remove('shake'));
        const pick = Math.floor(Math.random() * deck.length);
        revealCard(pick);
      }
    }, 60);
  }

  // ===== Wire buttons =====
  $('btn-shuffle').addEventListener('click', shuffleAction);
  $('btn-random').addEventListener('click', randomAction);
  $('modal-close').addEventListener('click', hideModal);
  $('modal-again').addEventListener('click', () => {
    hideModal();
    setTimeout(() => shuffleAction(), 150);
  });
  // Tap backdrop to close
  $('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') hideModal();
  });

  // ===== i18n =====
  function applyLang() {
    const t = I18N[lang];
    document.title = t.title.replace(/^🔮\s*/, '').replace(/\s*✨$/, '');
    $('sub-text').textContent = t.sub;
    $('hint-text').textContent = t.hint;
    $('btn-shuffle-lbl').textContent = t.shuffle;
    $('btn-random-lbl').textContent = t.random;
    $('modal-close').textContent = t.close;
    $('modal-again').textContent = t.again;
    $('modal-heading').textContent = t.heading;
    // Update prize name if modal is currently showing the same card
    if (revealedIdx != null && $('modal').classList.contains('show')) {
      $('prize-name').textContent = nameFor(deck[revealedIdx]);
    }
    // Title (keeping the mystical decoration)
    const titleEl = document.querySelector('.la-title');
    if (titleEl) titleEl.innerHTML = `<span class="la-title-em">🔮</span> ${t.title.replace(/^🔮\s*/, '').replace(/\s*✨$/, '')} ✨`;
  }
  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  applyLang();
  buildBoard();
})();
