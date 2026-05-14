// Sticker Reward Chart — parent tool for tracking kids' daily tasks.
// Multi-child profiles, customizable tasks + rewards, weekly view.
// Persists to localStorage. Multi-language UI.

(() => {
  'use strict';

  const STORAGE_KEY = 'sticker_chart_v1';

  const STICKER_OPTIONS = ['⭐', '🌟', '❤️', '🏆', '🦄', '🌈', '🍭', '🎈'];
  const CHILD_AVATARS  = ['👧', '🧒', '👦', '👶', '🐻', '🐰', '🐱', '🐼'];
  const TASK_EMOJIS    = ['🦷', '🛏️', '🧸', '📚', '🍽️', '🎨', '🚿', '👕', '🧹', '🥬', '🌱', '🐕', '🚽', '⚽', '💧', '😊'];
  const REWARD_EMOJIS  = ['🍦', '🎁', '🍕', '🧁', '🎈', '🎮', '📺', '🍿', '🎟️', '🍔', '🚴', '🏊'];

  const I18N = {
    th: {
      title:'⭐ สติกเกอร์รางวัล', sub:'สำหรับผู้ปกครอง',
      back:'← หน้าหลัก',
      week:'สัปดาห์นี้', total:'ทั้งหมด', streak:'ต่อเนื่อง',
      sticker:'สติกเกอร์',
      addChild:'+ เพิ่มเด็ก',
      addTask:'+ เพิ่มงาน',
      addReward:'+ เพิ่มรางวัล',
      rewards:'รางวัล',
      modalChild:'เพิ่มเด็ก', modalTask:'เพิ่มงาน', modalReward:'เพิ่มรางวัล',
      icon:'ไอคอน', name:'ชื่อ', goal:'เป้าหมาย (สติกเกอร์)',
      cancel:'ยกเลิก', save:'บันทึก', delete:'ลบ',
      dow:['จ','อ','พ','พฤ','ศ','ส','อา'],
      months:['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],
      todayLbl:'วันนี้',
      defaultChild:'น้อง',
      defaultTasks:[
        { emoji:'🦷', label:'แปรงฟัน' },
        { emoji:'🧸', label:'เก็บของเล่น' },
        { emoji:'📚', label:'อ่านหนังสือ' }
      ],
      defaultRewards:[ { emoji:'🍦', label:'ไอติม', goal:20 } ],
      rewardAchieved:'ทำสำเร็จ! 🎉',
      confirmDelChild:'ลบโปรไฟล์เด็กนี้?',
      confirmDelTask:'ลบงานนี้?',
      confirmDelReward:'ลบรางวัลนี้?'
    },
    en: {
      title:'⭐ Sticker Chart', sub:'For parents',
      back:'← Home',
      week:'This week', total:'Total', streak:'Streak',
      sticker:'Sticker',
      addChild:'+ Add Child',
      addTask:'+ Add Task',
      addReward:'+ Add Reward',
      rewards:'Rewards',
      modalChild:'Add Child', modalTask:'Add Task', modalReward:'Add Reward',
      icon:'Icon', name:'Name', goal:'Goal (stickers)',
      cancel:'Cancel', save:'Save', delete:'Delete',
      dow:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      months:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      todayLbl:'Today',
      defaultChild:'Kid',
      defaultTasks:[
        { emoji:'🦷', label:'Brush teeth' },
        { emoji:'🧸', label:'Tidy toys' },
        { emoji:'📚', label:'Read book' }
      ],
      defaultRewards:[ { emoji:'🍦', label:'Ice cream', goal:20 } ],
      rewardAchieved:'Achieved! 🎉',
      confirmDelChild:'Delete this child profile?',
      confirmDelTask:'Delete this task?',
      confirmDelReward:'Delete this reward?'
    },
    lao: {
      title:'⭐ ສະຕິກເກີຮາງວັນ', sub:'ສຳລັບພໍ່ແມ່',
      back:'← ໜ້າຫຼັກ',
      week:'ອາທິດນີ້', total:'ທັງໝົດ', streak:'ຕໍ່ເນື່ອງ',
      sticker:'ສະຕິກເກີ',
      addChild:'+ ເພີ່ມເດັກ',
      addTask:'+ ເພີ່ມໜ້າວຽກ',
      addReward:'+ ເພີ່ມຮາງວັນ',
      rewards:'ຮາງວັນ',
      modalChild:'ເພີ່ມເດັກ', modalTask:'ເພີ່ມໜ້າວຽກ', modalReward:'ເພີ່ມຮາງວັນ',
      icon:'ໄອຄອນ', name:'ຊື່', goal:'ເປົ້າໝາຍ (ສະຕິກເກີ)',
      cancel:'ຍົກເລີກ', save:'ບັນທຶກ', delete:'ລົບ',
      dow:['ຈ','ອ','ພ','ພຫ','ສຸ','ສ','ອາ'],
      months:['ມັງກອນ','ກຸມພາ','ມີນາ','ເມສາ','ພຶດສະພາ','ມິຖຸນາ','ກໍລະກົດ','ສິງຫາ','ກັນຍາ','ຕຸລາ','ພະຈິກ','ທັນວາ'],
      todayLbl:'ມື້ນີ້',
      defaultChild:'ນ້ອງ',
      defaultTasks:[
        { emoji:'🦷', label:'ແປງແຂ້ວ' },
        { emoji:'🧸', label:'ເກັບເຄື່ອງຫຼິ້ນ' },
        { emoji:'📚', label:'ອ່ານປຶ້ມ' }
      ],
      defaultRewards:[ { emoji:'🍦', label:'ໄອຕິມ', goal:20 } ],
      rewardAchieved:'ສຳເລັດແລ້ວ! 🎉',
      confirmDelChild:'ລົບໂປຣໄຟລ໌ເດັກນີ້?',
      confirmDelTask:'ລົບໜ້າວຽກນີ້?',
      confirmDelReward:'ລົບຮາງວັນນີ້?'
    }
  };

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'lao';
  })();

  let state = null;
  let weekOffset = 0; // 0 = current week, -1 = last week, etc.
  let modalCfg = null; // { kind, target, save, suggested, fields }

  // ===== Persistence =====
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (s && s.children) return s;
    } catch {}
    return seedState();
  }

  function seedState() {
    const id = uid();
    const t = I18N[lang];
    return {
      stickerStyle: '⭐',
      currentChildId: id,
      children: [{
        id, name: t.defaultChild, avatar: CHILD_AVATARS[0],
        tasks: t.defaultTasks.map(x => ({ id: uid(), ...x })),
        rewards: t.defaultRewards.map(x => ({ id: uid(), ...x })),
        stickers: {}  // { 'YYYY-MM-DD': { taskId: true } }
      }]
    };
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  function uid() { return Math.random().toString(36).slice(2, 10); }

  // ===== Date helpers =====
  function ymd(d) {
    const y = d.getFullYear(), m = (d.getMonth() + 1), x = d.getDate();
    return y + '-' + String(m).padStart(2, '0') + '-' + String(x).padStart(2, '0');
  }
  function weekStartOf(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = x.getDay(); // 0=Sun..6=Sat
    const diff = dow === 0 ? -6 : 1 - dow; // shift to Monday
    x.setDate(x.getDate() + diff);
    return x;
  }
  function weekDays(start) {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }
  function shortMonth(d) { return I18N[lang].months[d.getMonth()]; }

  // ===== Computed =====
  function currentChild() {
    return state.children.find(c => c.id === state.currentChildId) || state.children[0];
  }
  function currentWeekStart() {
    const ws = weekStartOf(new Date());
    ws.setDate(ws.getDate() + weekOffset * 7);
    return ws;
  }
  function weekStickerCount(child) {
    const days = weekDays(currentWeekStart()).map(ymd);
    let n = 0;
    for (const d of days) {
      const day = child.stickers[d];
      if (!day) continue;
      for (const tid of Object.keys(day)) {
        if (day[tid] && child.tasks.find(t => t.id === tid)) n++;
      }
    }
    return n;
  }
  function totalStickers(child) {
    let n = 0;
    for (const d of Object.keys(child.stickers)) {
      const day = child.stickers[d];
      for (const tid of Object.keys(day)) {
        if (day[tid] && child.tasks.find(t => t.id === tid)) n++;
      }
    }
    return n;
  }
  // Streak = consecutive days from today backwards where at least one sticker was awarded
  function currentStreak(child) {
    let n = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const day = child.stickers[ymd(d)];
      if (!day) break;
      let hasOne = false;
      for (const tid of Object.keys(day)) {
        if (day[tid] && child.tasks.find(t => t.id === tid)) { hasOne = true; break; }
      }
      if (!hasOne) break;
      n++;
    }
    return n;
  }

  // ===== DOM =====
  const $ = id => document.getElementById(id);

  // ===== Render =====
  function render() {
    renderChildren();
    renderStickerPicker();
    renderWeek();
    renderTasks();
    renderRewards();
    renderStats();
  }

  function renderChildren() {
    const el = $('children');
    el.innerHTML = '';
    const t = I18N[lang];
    for (const c of state.children) {
      const chip = document.createElement('div');
      chip.className = 'sc-chip' + (c.id === state.currentChildId ? ' active' : '');
      chip.innerHTML = `<span class="ava">${c.avatar}</span><span>${escapeHtml(c.name)}</span>`;
      if (state.children.length > 1 && c.id === state.currentChildId) {
        const del = document.createElement('span');
        del.className = 'sc-chip-del';
        del.textContent = '✕';
        del.title = t.delete;
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(t.confirmDelChild)) deleteChild(c.id);
        });
        chip.appendChild(del);
      }
      chip.addEventListener('click', () => {
        state.currentChildId = c.id;
        saveState();
        render();
      });
      el.appendChild(chip);
    }
    const add = document.createElement('button');
    add.className = 'sc-add-chip';
    add.textContent = t.addChild;
    add.addEventListener('click', openAddChildModal);
    el.appendChild(add);
  }

  function renderStickerPicker() {
    const el = $('sticker-opts');
    el.innerHTML = '';
    for (const s of STICKER_OPTIONS) {
      const b = document.createElement('button');
      b.className = 'sc-sticker-opt' + (s === state.stickerStyle ? ' active' : '');
      b.textContent = s;
      b.addEventListener('click', () => {
        state.stickerStyle = s;
        saveState();
        render();
        play('star');
      });
      el.appendChild(b);
    }
  }

  function renderWeek() {
    const start = currentWeekStart();
    const end = new Date(start); end.setDate(end.getDate() + 6);
    const t = I18N[lang];
    let lbl;
    if (start.getMonth() === end.getMonth()) {
      lbl = `${shortMonth(start)} ${start.getDate()}-${end.getDate()} ${start.getFullYear()}`;
    } else {
      lbl = `${shortMonth(start)} ${start.getDate()} - ${shortMonth(end)} ${end.getDate()}`;
    }
    $('week-lbl').textContent = lbl;
    $('week-next').disabled = weekOffset >= 0;
  }

  function renderTasks() {
    const child = currentChild();
    const el = $('tasks');
    el.innerHTML = '';
    const t = I18N[lang];
    const days = weekDays(currentWeekStart());
    const todayKey = ymd(new Date());

    for (const task of child.tasks) {
      const card = document.createElement('div');
      card.className = 'sc-task';

      const hd = document.createElement('div');
      hd.className = 'sc-task-hd';
      const cnt = days.reduce((acc, d) => acc + (child.stickers[ymd(d)] && child.stickers[ymd(d)][task.id] ? 1 : 0), 0);
      hd.innerHTML = `
        <span class="em">${task.emoji}</span>
        <span class="lbl">${escapeHtml(task.label)}</span>
        <span class="cnt">${cnt}/7</span>
      `;
      const del = document.createElement('button');
      del.className = 'del';
      del.textContent = '✕';
      del.title = t.delete;
      del.addEventListener('click', () => {
        if (confirm(t.confirmDelTask)) deleteTask(task.id);
      });
      hd.appendChild(del);
      card.appendChild(hd);

      const grid = document.createElement('div');
      grid.className = 'sc-days';
      for (let i = 0; i < 7; i++) {
        const d = days[i];
        const key = ymd(d);
        const has = child.stickers[key] && child.stickers[key][task.id];
        const cell = document.createElement('button');
        cell.className = 'sc-day' + (has ? ' has' : '') + (key === todayKey ? ' today' : '');
        cell.innerHTML = `
          <span class="dow">${t.dow[i]}</span>
          <span class="dt">${d.getDate()}</span>
          <span class="stk">${state.stickerStyle}</span>
        `;
        cell.addEventListener('click', () => toggleSticker(task.id, key));
        grid.appendChild(cell);
      }
      card.appendChild(grid);
      el.appendChild(card);
    }
  }

  function renderRewards() {
    const child = currentChild();
    const el = $('rewards');
    el.innerHTML = '';
    const t = I18N[lang];
    const total = totalStickers(child);

    for (const r of child.rewards) {
      const card = document.createElement('div');
      const pct = Math.min(100, Math.round((total / Math.max(1, r.goal)) * 100));
      const achieved = total >= r.goal;
      card.className = 'sc-reward' + (achieved ? ' achieved' : '');
      card.innerHTML = `
        <span class="em">${r.emoji}</span>
        <div class="body">
          <div class="lbl">${escapeHtml(r.label)}</div>
          <div class="bar"><div style="width:${pct}%;"></div></div>
          <div class="pct">${Math.min(total, r.goal)} / ${r.goal} ${state.stickerStyle}</div>
        </div>
      `;
      const del = document.createElement('button');
      del.className = 'del';
      del.textContent = '✕';
      del.title = t.delete;
      del.addEventListener('click', () => {
        if (confirm(t.confirmDelReward)) deleteReward(r.id);
      });
      card.appendChild(del);
      el.appendChild(card);
    }
  }

  function renderStats() {
    const child = currentChild();
    $('stat-week').textContent  = weekStickerCount(child);
    $('stat-total').textContent = totalStickers(child);
    $('stat-streak').textContent = currentStreak(child);
  }

  // ===== Actions =====
  function toggleSticker(taskId, dateKey) {
    const child = currentChild();
    if (!child.stickers[dateKey]) child.stickers[dateKey] = {};
    const before = !!child.stickers[dateKey][taskId];
    if (before) {
      delete child.stickers[dateKey][taskId];
      if (Object.keys(child.stickers[dateKey]).length === 0) delete child.stickers[dateKey];
      play('off');
    } else {
      child.stickers[dateKey][taskId] = true;
      play('star');
    }
    saveState();
    render();

    // Check newly-achieved rewards (only when adding, not when removing)
    if (!before) {
      const total = totalStickers(child);
      for (const r of child.rewards) {
        // Just crossed the goal?
        if (total === r.goal) {
          showFx(`${r.emoji} ${I18N[lang].rewardAchieved}`);
          play('reward');
          break;
        }
      }
    }
  }

  function deleteChild(id) {
    if (state.children.length <= 1) return;
    state.children = state.children.filter(c => c.id !== id);
    if (state.currentChildId === id) state.currentChildId = state.children[0].id;
    saveState();
    render();
  }
  function deleteTask(id) {
    const child = currentChild();
    child.tasks = child.tasks.filter(t => t.id !== id);
    saveState();
    render();
  }
  function deleteReward(id) {
    const child = currentChild();
    child.rewards = child.rewards.filter(r => r.id !== id);
    saveState();
    render();
  }

  // ===== Modal =====
  function openModal(cfg) {
    modalCfg = cfg;
    const t = I18N[lang];
    $('modal-title').textContent = cfg.title;
    $('lbl-emoji').textContent = t.icon;
    $('lbl-name').textContent = t.name;
    $('lbl-goal').textContent = t.goal;
    $('modal-cancel').textContent = t.cancel;
    $('modal-save').textContent = t.save;

    // Build quick-pick emojis
    const q = $('emoji-quick');
    q.innerHTML = '';
    let initialEmoji = cfg.suggested[0];
    for (const em of cfg.suggested) {
      const b = document.createElement('button');
      b.textContent = em;
      if (em === initialEmoji) b.classList.add('active');
      b.addEventListener('click', () => {
        $('in-emoji').value = em;
        [...q.querySelectorAll('button')].forEach(x => x.classList.toggle('active', x === b));
      });
      q.appendChild(b);
    }
    $('in-emoji').value = initialEmoji;
    $('in-emoji').addEventListener('input', () => {
      const v = $('in-emoji').value;
      [...q.querySelectorAll('button')].forEach(x => x.classList.toggle('active', x.textContent === v));
    }, { once: true });
    $('in-label').value = '';
    $('in-label').placeholder = cfg.placeholder || '';
    $('row-goal').style.display = cfg.kind === 'reward' ? '' : 'none';
    $('in-goal').value = 20;

    $('modal').classList.add('show');
    setTimeout(() => $('in-label').focus(), 50);
  }
  function closeModal() {
    $('modal').classList.remove('show');
    modalCfg = null;
  }
  $('modal-cancel').addEventListener('click', closeModal);
  $('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  $('modal-save').addEventListener('click', () => {
    if (!modalCfg) return;
    const emoji = ($('in-emoji').value || modalCfg.suggested[0]).trim();
    const label = $('in-label').value.trim();
    if (!label) { $('in-label').focus(); return; }
    const goal = parseInt($('in-goal').value, 10) || 20;
    modalCfg.save({ emoji, label, goal });
    closeModal();
  });

  function openAddChildModal() {
    const t = I18N[lang];
    openModal({
      kind: 'child',
      title: '👶 ' + t.modalChild,
      suggested: CHILD_AVATARS,
      placeholder: t.defaultChild,
      save: ({ emoji, label }) => {
        const id = uid();
        state.children.push({
          id, name: label, avatar: emoji,
          tasks: t.defaultTasks.map(x => ({ id: uid(), ...x })),
          rewards: t.defaultRewards.map(x => ({ id: uid(), ...x })),
          stickers: {}
        });
        state.currentChildId = id;
        saveState();
        render();
      }
    });
  }
  function openAddTaskModal() {
    const t = I18N[lang];
    openModal({
      kind: 'task',
      title: '✏️ ' + t.modalTask,
      suggested: TASK_EMOJIS,
      placeholder: t.defaultTasks[0].label,
      save: ({ emoji, label }) => {
        const child = currentChild();
        child.tasks.push({ id: uid(), emoji, label });
        saveState();
        render();
      }
    });
  }
  function openAddRewardModal() {
    const t = I18N[lang];
    openModal({
      kind: 'reward',
      title: '🎁 ' + t.modalReward,
      suggested: REWARD_EMOJIS,
      placeholder: t.defaultRewards[0].label,
      save: ({ emoji, label, goal }) => {
        const child = currentChild();
        child.rewards.push({ id: uid(), emoji, label, goal });
        saveState();
        render();
      }
    });
  }
  $('btn-add-task').addEventListener('click', openAddTaskModal);
  $('btn-add-reward').addEventListener('click', openAddRewardModal);

  // ===== Week nav =====
  $('week-prev').addEventListener('click', () => { weekOffset--; renderWeek(); renderTasks(); renderStats(); });
  $('week-next').addEventListener('click', () => { if (weekOffset < 0) { weekOffset++; renderWeek(); renderTasks(); renderStats(); } });

  // ===== Audio synth =====
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
    if (kind === 'star')   { [880, 1175].forEach((f, i) => setTimeout(() => beep(f, 0.08, 'triangle', 0.06), i*60)); }
    if (kind === 'off')    beep(330, 0.06, 'square', 0.04);
    if (kind === 'reward') { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.13, 'sine', 0.07), i*80)); }
  }
  // First user interaction unlocks audio on iOS
  document.body.addEventListener('pointerdown', ensureAudio, { once: true });

  // ===== Effects =====
  function showFx(msg) {
    const el = $('fx');
    el.textContent = msg;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  // ===== HTML escape =====
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ===== Language =====
  function applyLang() {
    const t = I18N[lang];
    document.title = t.title;
    $('hdr-title').textContent = t.title;
    $('hdr-sub').textContent   = t.sub;
    $('hdr-back').textContent  = t.back;
    $('lbl-week').textContent   = t.week;
    $('lbl-total').textContent  = t.total;
    $('lbl-streak').textContent = t.streak;
    $('lbl-sticker').textContent = t.sticker;
    $('lbl-rewards').textContent = t.rewards;
    $('btn-add-task').textContent   = t.addTask;
    $('btn-add-reward').textContent = t.addReward;
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); render(); }
    }
    if (e.key === STORAGE_KEY) {
      // Sync if changed in another tab
      state = loadState();
      render();
    }
  });

  state = loadState();
  applyLang();
  render();
})();
