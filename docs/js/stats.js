// Parent-mode stats dashboard.
// Aggregates localStorage stats across all games, renders chart + per-game cards,
// supports export/import/reset. Mirrors the GAMES catalog from index.html.

(() => {
  'use strict';

  // ===== Game catalog (mirror of index.html) =====
  // statsKey + scoreField for v1-stats games, intKey for legacy classic games.
  const GAMES = [
    { key:'color',        cat:'colors',  icon:'🎨', statsKey:'color_stats_v1' },
    { key:'colorOrder',   cat:'colors',  icon:'🌈', statsKey:'color_order_stats_v1' },
    { key:'shape',        cat:'colors',  icon:'🔷', statsKey:'shape_stats_v1' },
    { key:'bigSmall',     cat:'colors',  icon:'📏', statsKey:'compare_stats_v1' },

    { key:'laoNum',       cat:'numbers', icon:'໑',  statsKey:'lao_num_stats_v1' },
    { key:'math',         cat:'numbers', icon:'➕', statsKey:'math_count_stats_v1' },
    { key:'fruit',        cat:'numbers', icon:'🍎', statsKey:'fruit_count_stats_v1' },
    { key:'missingNum',   cat:'numbers', icon:'🔢', statsKey:'missing_num_stats_v1' },
    { key:'drawNum',      cat:'numbers', icon:'✏️', statsKey:'draw_num_stats_v1' },

    { key:'drawAbc',      cat:'letters', icon:'🅰️', statsKey:'draw_abc_stats_v1' },
    { key:'azMatch',      cat:'letters', icon:'🔤', statsKey:'az_stats_v1' },
    { key:'drawLaoAbc',   cat:'letters', icon:'ກ',  statsKey:'lao_abc_stats_v1' },
    { key:'drawLaoVowel', cat:'letters', icon:'ະ',  statsKey:'lao_vowel_stats_v1' },

    { key:'flag',         cat:'world',   icon:'🚩', statsKey:'flag_stats_v1' },
    { key:'matchFlag',    cat:'world',   icon:'🌍' },
    { key:'worldMap',     cat:'world',   icon:'🗺️' },
    { key:'months',       cat:'world',   icon:'📅', statsKey:'months_stats_v1' },
    { key:'weekdays',     cat:'world',   icon:'📆', statsKey:'weekdays_stats_v1' },
    { key:'waterTree',    cat:'world',   icon:'🌳', statsKey:'plantcare_stats_v1' },
    { key:'findObject',   cat:'world',   icon:'🏠', statsKey:'find_object_stats_v1' },
    { key:'humanBody',    cat:'world',   icon:'🦴' },

    { key:'sound',        cat:'skill',   icon:'🔊', statsKey:'sound_stats_v1' },
    { key:'matchIcon',    cat:'skill',   icon:'🎯', statsKey:'find_icon_stats_v1' },
    { key:'memory',       cat:'skill',   icon:'🧠', statsKey:'memory_stats_v1' },
    { key:'hideSeek',     cat:'skill',   icon:'🕵️', statsKey:'hs_stats_v1' },
    { key:'tower',        cat:'skill',   icon:'🏗️', statsKey:'tower_stack_stats_v1' },
    { key:'maze',         cat:'skill',   icon:'🌀', statsKey:'maze_stats_v1' },
    { key:'whack',        cat:'skill',   icon:'🔨', statsKey:'whack_stats_v1' },

    { key:'tetris',       cat:'classic', icon:'🟦', intKey:'tetrisHighScore' },
    { key:'pacman',       cat:'classic', icon:'👻', intKey:'pacmanHighScore' },
    { key:'snake',        cat:'classic', icon:'🐍', intKey:'snakeHighScore' },
    { key:'slither',      cat:'classic', icon:'🪱', intKey:'slitherHighScore' },
    { key:'spaceInv',     cat:'classic', icon:'🛸', statsKey:'si_stats_v1' },
    { key:'fps',          cat:'classic', icon:'🎈', intKey:'fpsHighScore' },
    { key:'piano',        cat:'classic', icon:'🎹' },
    { key:'towerDef',     cat:'classic', icon:'🏰', statsKey:'tdg_stats_v1', scoreField:'bestWave' },

    { key:'freeDraw',     cat:'tools',   icon:'🎨' },
    { key:'stickerChart', cat:'tools',   icon:'⭐', complex:'sticker_chart_v1' },
    { key:'gpsTracker',   cat:'tools',   icon:'📍', complex:'location_trips_v1' },
    { key:'imgPdf',       cat:'tools',   icon:'🖼️' },
    { key:'pdfMerge',     cat:'tools',   icon:'➕' },
    { key:'pdfSplit',     cat:'tools',   icon:'✂️' },
    { key:'pdfWord',      cat:'tools',   icon:'📄' }
  ];

  // Extra localStorage keys to wipe on Reset All (legacy/auxiliary)
  const EXTRA_KEYS = [
    'tetrisMuted','tetrisTheme','pacmanMuted','snakeMuted','snakeTheme',
    'slitherMuted','fpsMuted','fpsGameStats','tetrisStats'
  ];

  // ===== i18n =====
  const I18N = {
    th: {
      title:'📊 สถิติและพัฒนาการ', sub:'โหมดผู้ปกครอง',
      back:'← หน้าหลัก',
      lblPlays:'เล่นแล้ว', lblTop:'ดีที่สุด', lblGames:'เกมที่เล่น', lblFav:'เล่นบ่อยสุด',
      chartTitle:'คะแนนดีที่สุดของแต่ละเกม',
      chartEmpty:'ยังไม่มีข้อมูลให้แสดง — ลองเล่นเกมก่อนนะ',
      export:'💾 ส่งออก', import:'📥 นำเข้า', resetAll:'🗑 ล้างทั้งหมด',
      sections: {
        colors:  { name:'สี & รูปร่าง',      em:'🎨' },
        numbers: { name:'ตัวเลข',             em:'🔢' },
        letters: { name:'ตัวอักษร',           em:'🔤' },
        world:   { name:'ความรู้รอบตัว',     em:'🌍' },
        skill:   { name:'ความจำ & ทักษะ',    em:'🧠' },
        classic: { name:'เกมคลาสสิก',         em:'🕹️' },
        tools:   { name:'เครื่องมือ',         em:'🛠️' }
      },
      games: {
        color:'เลือกสี', colorOrder:'เรียงสี', shape:'วางรูปร่าง', bigSmall:'ใหญ่-เล็ก',
        laoNum:'ตัวเลขลาว ໐-໙', math:'บวก-ลบ', fruit:'นับจำนวน', missingNum:'หาตัวเลขที่ขาด', drawNum:'ลากเส้น 1-10',
        drawAbc:'ลากเส้น A-Z', azMatch:'จับคู่ A-Z', drawLaoAbc:'ลากเส้น ກ-ຮ', drawLaoVowel:'ลากสระลาว',
        flag:'ธงประเทศ', matchFlag:'จับคู่ธง', worldMap:'แผนที่โลก',
        months:'เดือน', weekdays:'วันในสัปดาห์', waterTree:'รดน้ำต้นไม้', findObject:'หาสิ่งของ', humanBody:'ร่างกาย',
        sound:'ฟังเสียง', matchIcon:'Match Icon', memory:'จับคู่ภาพ', hideSeek:'ซ่อนหา', tower:'หอคอย', maze:'เขาวงกต', whack:'ตีตัวตุ่น',
        tetris:'เททริส', pacman:'Pac-Man', snake:'งู', slither:'Slither',
        spaceInv:'Space Invaders', fps:'ยิงลูกโป่ง', piano:'เปียโน', towerDef:'ป้องกันฐาน',
        freeDraw:'วาดอิสระ', stickerChart:'สติกเกอร์รางวัล', gpsTracker:'GPS Tracker', imgPdf:'รูปเป็น PDF', pdfMerge:'รวม PDF', pdfSplit:'แยก PDF', pdfWord:'PDF → Word'
      },
      best:'ดีสุด', level:'เลเวล', plays:'เล่น', noData:'ยังไม่มีข้อมูล',
      tripsCount:'ทริป', stickersCount:'สติกเกอร์', children:'เด็ก',
      confirmResetGame:'ล้างสถิติเกมนี้?',
      confirmResetAll:'ล้างสถิติทั้งหมด? การกระทำนี้ย้อนกลับไม่ได้',
      confirmImport:'นำเข้าข้อมูล? ข้อมูลปัจจุบันจะถูกแทนที่',
      cancel:'ยกเลิก', ok:'ยืนยัน',
      exported:'ส่งออกแล้ว!', imported:'นำเข้าแล้ว ✓', importFailed:'ไฟล์ไม่ถูกต้อง',
      resetDone:'ล้างเรียบร้อย ✓'
    },
    en: {
      title:'📊 Stats & Progress', sub:'Parent Mode',
      back:'← Home',
      lblPlays:'Plays', lblTop:'Top', lblGames:'Played', lblFav:'Favorite',
      chartTitle:'Best score by game',
      chartEmpty:'No data yet — try playing a game first',
      export:'💾 Export', import:'📥 Import', resetAll:'🗑 Reset all',
      sections: {
        colors:  { name:'Colors & Shapes',  em:'🎨' },
        numbers: { name:'Numbers',          em:'🔢' },
        letters: { name:'Letters',          em:'🔤' },
        world:   { name:'World Knowledge',  em:'🌍' },
        skill:   { name:'Memory & Skill',   em:'🧠' },
        classic: { name:'Classic Games',    em:'🕹️' },
        tools:   { name:'Tools',            em:'🛠️' }
      },
      games: {
        color:'Pick Color', colorOrder:'Color Order', shape:'Shape Puzzle', bigSmall:'Big-Small',
        laoNum:'Lao Numerals', math:'Add & Subtract', fruit:'Count Fruits', missingNum:'Missing Number', drawNum:'Draw 1-10',
        drawAbc:'Draw A-Z', azMatch:'Match A-Z', drawLaoAbc:'Draw ກ-ຮ', drawLaoVowel:'Lao Vowels',
        flag:'Country Flags', matchFlag:'Match Flag', worldMap:'World Map',
        months:'Months', weekdays:'Weekdays', waterTree:'Water Plants', findObject:'Find Objects', humanBody:'Human Body',
        sound:'Animal Sounds', matchIcon:'Match Icon', memory:'Memory Match', hideSeek:'Hide & Seek', tower:'Tower Stack', maze:'Maze', whack:'Whack-a-Mole',
        tetris:'Tetris', pacman:'Pac-Man', snake:'Snake', slither:'Slither',
        spaceInv:'Space Invaders', fps:'Balloon Shooter', piano:'Piano', towerDef:'Tower Defense',
        freeDraw:'Free Draw', stickerChart:'Sticker Chart', gpsTracker:'GPS Tracker', imgPdf:'Image → PDF', pdfMerge:'PDF Merge', pdfSplit:'PDF Split', pdfWord:'PDF → Word'
      },
      best:'Best', level:'Lv', plays:'Plays', noData:'No data yet',
      tripsCount:'Trips', stickersCount:'Stickers', children:'Children',
      confirmResetGame:'Reset stats for this game?',
      confirmResetAll:'Reset ALL stats? This cannot be undone.',
      confirmImport:'Import data? Current data will be replaced.',
      cancel:'Cancel', ok:'Confirm',
      exported:'Exported!', imported:'Imported ✓', importFailed:'Invalid file',
      resetDone:'Reset complete ✓'
    },
    lao: {
      title:'📊 ສະຖິຕິ ແລະ ພັດທະນາການ', sub:'ໂຫມດຜູ້ປົກຄອງ',
      back:'← ໜ້າຫຼັກ',
      lblPlays:'ຫຼິ້ນແລ້ວ', lblTop:'ດີສຸດ', lblGames:'ເກມທີ່ຫຼິ້ນ', lblFav:'ຫຼິ້ນຫຼາຍສຸດ',
      chartTitle:'ຄະແນນດີສຸດແຕ່ລະເກມ',
      chartEmpty:'ຍັງບໍ່ມີຂໍ້ມູນ — ລອງຫຼິ້ນເກມກ່ອນເດີ',
      export:'💾 ສົ່ງອອກ', import:'📥 ນຳເຂົ້າ', resetAll:'🗑 ລ້າງທັງໝົດ',
      sections: {
        colors:  { name:'ສີ & ຮູບຮ່າງ',     em:'🎨' },
        numbers: { name:'ຕົວເລກ',           em:'🔢' },
        letters: { name:'ຕົວອັກສອນ',         em:'🔤' },
        world:   { name:'ຄວາມຮູ້ຮອບໂຕ',   em:'🌍' },
        skill:   { name:'ຄວາມຈຳ & ທັກສະ',  em:'🧠' },
        classic: { name:'ເກມຄລາສສິກ',       em:'🕹️' },
        tools:   { name:'ເຄື່ອງມື',          em:'🛠️' }
      },
      games: {
        color:'ເລືອກສີ', colorOrder:'ຮຽງສີ', shape:'ວາງຮູບຮ່າງ', bigSmall:'ໃຫຍ່-ນ້ອຍ',
        laoNum:'ຕົວເລກລາວ ໐-໙', math:'ບວກ-ລົບ', fruit:'ນັບຈຳນວນ', missingNum:'ຫາຕົວເລກທີ່ຂາດ', drawNum:'ລາກເສັ້ນ 1-10',
        drawAbc:'ລາກເສັ້ນ A-Z', azMatch:'ຈັບຄູ່ A-Z', drawLaoAbc:'ລາກເສັ້ນ ກ-ຮ', drawLaoVowel:'ລາກສະຫຼະ',
        flag:'ທຸງປະເທດ', matchFlag:'ຈັບຄູ່ທຸງ', worldMap:'ແຜນທີ່ໂລກ',
        months:'ເດືອນ', weekdays:'ວັນໃນອາທິດ', waterTree:'ລົດນ້ຳຕົ້ນໄມ້', findObject:'ຫາສິ່ງຂອງ', humanBody:'ຮ່າງກາຍ',
        sound:'ຟັງສຽງ', matchIcon:'Match Icon', memory:'ຈັບຄູ່ພາບ', hideSeek:'ຊ່ອນຫາ', tower:'ຫໍຄອຍ', maze:'ເຂົາວົງກົດ', whack:'ຕີໜູ',
        tetris:'ເທັດຣິສ', pacman:'Pac-Man', snake:'ງູ', slither:'Slither',
        spaceInv:'Space Invaders', fps:'ຍິງປູມເປົ້າ', piano:'ເປຍໂນ', towerDef:'ປ້ອງກັນຖານ',
        freeDraw:'ແຕ້ມຮູບ', stickerChart:'ສະຕິກເກີຮາງວັນ', gpsTracker:'GPS Tracker', imgPdf:'ຮູບເປັນ PDF', pdfMerge:'ລວມ PDF', pdfSplit:'ແຍກ PDF', pdfWord:'PDF → Word'
      },
      best:'ດີສຸດ', level:'ລະດັບ', plays:'ຫຼິ້ນ', noData:'ຍັງບໍ່ມີຂໍ້ມູນ',
      tripsCount:'ການເດີນທາງ', stickersCount:'ສະຕິກເກີ', children:'ເດັກ',
      confirmResetGame:'ລ້າງສະຖິຕິເກມນີ້?',
      confirmResetAll:'ລ້າງສະຖິຕິທັງໝົດ? ການກະທຳນີ້ຍ້ອນກັບບໍ່ໄດ້',
      confirmImport:'ນຳເຂົ້າຂໍ້ມູນ? ຂໍ້ມູນປັດຈຸບັນຈະຖືກແທນທີ່',
      cancel:'ຍົກເລີກ', ok:'ຢືນຢັນ',
      exported:'ສົ່ງອອກແລ້ວ!', imported:'ນຳເຂົ້າແລ້ວ ✓', importFailed:'ໄຟລ໌ບໍ່ຖືກຕ້ອງ',
      resetDone:'ລ້າງສຳເລັດ ✓'
    }
  };

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'lao';
  })();
  let chart = null;

  const $ = id => document.getElementById(id);
  const SECTION_ORDER = ['colors','numbers','letters','world','skill','classic','tools'];

  // ===== Read stats =====
  function readGameStats(g) {
    if (g.intKey) {
      const v = parseInt(localStorage.getItem(g.intKey) || '0', 10);
      return { best: v > 0 ? v : null, level: null, plays: null, hasData: v > 0 };
    }
    if (g.statsKey) {
      try {
        const raw = localStorage.getItem(g.statsKey);
        if (!raw) return { best: null, level: null, plays: null, hasData: false };
        const s = JSON.parse(raw);
        const field = g.scoreField || 'bestScore';
        const best  = (s[field] | 0) || (s.bestScore | 0) || 0;
        const level = (s.bestLevel | 0) || (s.bestWave | 0) || 0;
        const plays = s.plays | 0;
        return {
          best:  best  > 0 ? best  : null,
          level: level > 0 ? level : null,
          plays: plays > 0 ? plays : null,
          hasData: best > 0 || level > 0 || plays > 0
        };
      } catch { return { best:null, level:null, plays:null, hasData:false }; }
    }
    if (g.complex) {
      try {
        const raw = localStorage.getItem(g.complex);
        if (!raw) return { best:null, level:null, plays:null, hasData:false, complex:null };
        const s = JSON.parse(raw);
        return { best:null, level:null, plays:null, hasData:true, complex:s };
      } catch { return { best:null, level:null, plays:null, hasData:false, complex:null }; }
    }
    return { best:null, level:null, plays:null, hasData:false };
  }

  function complexSummary(key, complex) {
    const t = I18N[lang];
    if (key === 'sticker_chart_v1' && complex && complex.children) {
      let stickers = 0;
      for (const c of complex.children) {
        for (const d of Object.keys(c.stickers || {})) {
          for (const tid of Object.keys(c.stickers[d])) {
            if (c.stickers[d][tid]) stickers++;
          }
        }
      }
      return `${complex.children.length} ${t.children} · ${stickers} ${t.stickersCount}`;
    }
    if (key === 'location_trips_v1' && complex && Array.isArray(complex.trips)) {
      const n = complex.trips.length;
      const totalKm = complex.trips.reduce((acc, tr) => acc + ((tr.stats && tr.stats.distance) || 0), 0) / 1000;
      return `${n} ${t.tripsCount} · ${totalKm.toFixed(1)} km`;
    }
    return null;
  }

  function aggregate() {
    let totalPlays = 0;
    let topScore = 0;
    let gamesPlayed = 0;
    let favKey = null;
    let favPlays = 0;
    for (const g of GAMES) {
      const s = readGameStats(g);
      if (s.hasData) gamesPlayed++;
      if (s.best && s.best > topScore) topScore = s.best;
      if (s.plays) {
        totalPlays += s.plays;
        if (s.plays > favPlays) { favPlays = s.plays; favKey = g.key; }
      }
    }
    return { totalPlays, topScore, gamesPlayed, favKey, favPlays };
  }

  // ===== Render =====
  function render() {
    const t = I18N[lang];
    document.title = t.title;
    $('hdr-title').textContent = t.title;
    $('hdr-sub').textContent   = t.sub;
    $('hdr-back').textContent  = t.back;
    $('lbl-plays').textContent = t.lblPlays;
    $('lbl-top').textContent   = t.lblTop;
    $('lbl-games').textContent = t.lblGames;
    $('lbl-fav').textContent   = t.lblFav;
    $('chart-title').textContent = t.chartTitle;
    $('btn-export').textContent = t.export;
    $('btn-reset-all').textContent = t.resetAll;
    // Label for import contains an <input> child; update only the leading text node.
    const importLbl = $('btn-import');
    if (importLbl.childNodes[0] && importLbl.childNodes[0].nodeType === 3) {
      importLbl.childNodes[0].nodeValue = t.import + ' ';
    }

    $('flag-lao').classList.toggle('active', lang === 'lao');
    $('flag-th').classList.toggle('active',  lang === 'th');
    $('flag-en').classList.toggle('active',  lang === 'en');

    const agg = aggregate();
    $('agg-plays').textContent = agg.totalPlays.toLocaleString();
    $('agg-top').textContent   = agg.topScore.toLocaleString();
    $('agg-games').textContent = agg.gamesPlayed;
    $('agg-games-sub').textContent = '/ ' + GAMES.filter(g => g.statsKey || g.intKey).length;
    if (agg.favKey) {
      const favGame = GAMES.find(g => g.key === agg.favKey);
      $('agg-fav').textContent = favGame ? favGame.icon : '—';
      $('agg-fav-sub').textContent = (t.games[agg.favKey] || agg.favKey) + ' · ' + agg.favPlays;
    } else {
      $('agg-fav').textContent = '—';
      $('agg-fav-sub').textContent = '';
    }

    renderSections();
    renderChart();
  }

  function renderSections() {
    const t = I18N[lang];
    const sections = $('sections');
    sections.innerHTML = '';
    const groups = {};
    for (const cat of SECTION_ORDER) groups[cat] = [];
    for (const g of GAMES) (groups[g.cat] = groups[g.cat] || []).push(g);

    for (const cat of SECTION_ORDER) {
      const games = groups[cat];
      if (!games || !games.length) continue;
      const meta = t.sections[cat];

      const sec = document.createElement('div');
      sec.className = 'st-section';
      sec.innerHTML = `
        <div class="st-section-hdr">
          <span class="em">${meta.em}</span>
          <span>${escapeHtml(meta.name)}</span>
          <span class="count">${games.length}</span>
        </div>
        <div class="st-grid"></div>
      `;
      const grid = sec.querySelector('.st-grid');

      for (const g of games) {
        const s = readGameStats(g);
        const card = document.createElement('div');
        card.className = 'st-game' + (s.hasData ? '' : ' no-data');
        card.setAttribute('data-cat', g.cat);

        let statsHtml = '';
        if (g.complex) {
          const summary = complexSummary(g.complex, s.complex);
          statsHtml = summary
            ? `<span class="stat best">${escapeHtml(summary)}</span>`
            : `<span class="stat empty">${t.noData}</span>`;
        } else if (s.hasData) {
          const parts = [];
          if (s.best != null)  parts.push(`<span class="stat best">★ ${t.best} ${s.best.toLocaleString()}</span>`);
          if (s.level != null) parts.push(`<span class="stat level">🏆 ${t.level} ${s.level}</span>`);
          if (s.plays != null) parts.push(`<span class="stat plays">🎮 ${s.plays} ${t.plays}</span>`);
          statsHtml = parts.join('');
        } else {
          statsHtml = `<span class="stat empty">${t.noData}</span>`;
        }

        card.innerHTML = `
          <span class="ic">${g.icon}</span>
          <div class="body">
            <div class="name">${escapeHtml(t.games[g.key] || g.key)}</div>
            <div class="stats">${statsHtml}</div>
          </div>
          <button class="reset" title="Reset">🗑</button>
        `;
        const resetBtn = card.querySelector('.reset');
        if (s.hasData) resetBtn.addEventListener('click', () => askResetGame(g));
        grid.appendChild(card);
      }
      sections.appendChild(sec);
    }
  }

  function renderChart() {
    const t = I18N[lang];
    const data = [];
    for (const g of GAMES) {
      const s = readGameStats(g);
      if (s.best && s.best > 0) {
        data.push({ key: g.key, icon: g.icon, label: t.games[g.key] || g.key, best: s.best, cat: g.cat });
      }
    }
    data.sort((a, b) => b.best - a.best);
    const top = data.slice(0, 12);

    const canvas = document.getElementById('bestChart');
    const empty = $('chart-empty');
    if (!top.length || typeof Chart === 'undefined') {
      if (chart) { chart.destroy(); chart = null; }
      canvas.style.display = 'none';
      empty.style.display = '';
      empty.textContent = t.chartEmpty;
      return;
    }
    canvas.style.display = '';
    empty.style.display = 'none';

    const catColor = { colors:'#ec4899', numbers:'#3b82f6', letters:'#8b5cf6',
                       world:'#10b981', skill:'#f59e0b', classic:'#ef4444', tools:'#64748b' };

    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top.map(d => d.icon + ' ' + d.label),
        datasets: [{
          label: t.best,
          data: top.map(d => d.best),
          backgroundColor: top.map(d => catColor[d.cat] || '#94a3b8'),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.parsed.x.toLocaleString() } }
        },
        scales: {
          x: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,.05)' } },
          y: { ticks: { font: { size: 11, family: "'Noto Sans Lao', sans-serif" } }, grid: { display: false } }
        }
      }
    });
  }

  // ===== Actions =====
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }

  function askConfirm(text, onOk) {
    const t = I18N[lang];
    $('confirm-text').textContent = text;
    $('confirm-cancel').textContent = t.cancel;
    $('confirm-ok').textContent = t.ok;
    const modal = $('modal-confirm');
    modal.classList.add('show');
    function cleanup() {
      modal.classList.remove('show');
      $('confirm-ok').removeEventListener('click', okHandler);
      $('confirm-cancel').removeEventListener('click', cancelHandler);
    }
    function okHandler()     { cleanup(); onOk(); }
    function cancelHandler() { cleanup(); }
    $('confirm-ok').addEventListener('click', okHandler);
    $('confirm-cancel').addEventListener('click', cancelHandler);
  }

  function askResetGame(g) {
    const t = I18N[lang];
    askConfirm(t.confirmResetGame + '\n\n' + g.icon + ' ' + (t.games[g.key] || g.key), () => {
      if (g.statsKey) try { localStorage.removeItem(g.statsKey); } catch {}
      if (g.intKey)   try { localStorage.removeItem(g.intKey); } catch {}
      if (g.complex)  try { localStorage.removeItem(g.complex); } catch {}
      render();
      toast(t.resetDone);
    });
  }

  $('btn-reset-all').addEventListener('click', () => {
    const t = I18N[lang];
    askConfirm(t.confirmResetAll, () => {
      for (const g of GAMES) {
        if (g.statsKey) try { localStorage.removeItem(g.statsKey); } catch {}
        if (g.intKey)   try { localStorage.removeItem(g.intKey); } catch {}
        if (g.complex)  try { localStorage.removeItem(g.complex); } catch {}
      }
      for (const k of EXTRA_KEYS) try { localStorage.removeItem(k); } catch {}
      render();
      toast(t.resetDone);
    });
  });

  // Export
  $('btn-export').addEventListener('click', () => {
    const out = {};
    for (const g of GAMES) {
      if (g.statsKey) { const v = localStorage.getItem(g.statsKey); if (v != null) out[g.statsKey] = v; }
      if (g.intKey)   { const v = localStorage.getItem(g.intKey);   if (v != null) out[g.intKey]   = v; }
      if (g.complex)  { const v = localStorage.getItem(g.complex);  if (v != null) out[g.complex]  = v; }
    }
    for (const k of EXTRA_KEYS) { const v = localStorage.getItem(k); if (v != null) out[k] = v; }
    const payload = {
      app: 'my-game', version: 1,
      exportedAt: new Date().toISOString(),
      data: out
    };
    const ts = new Date();
    const pad = n => String(n).padStart(2, '0');
    const filename = `my-game-stats-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast(I18N[lang].exported);
  });

  // Import
  $('import-input').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const payload = JSON.parse(ev.target.result);
        if (!payload || !payload.data || typeof payload.data !== 'object') throw new Error('bad');
        const t = I18N[lang];
        askConfirm(t.confirmImport, () => {
          for (const k of Object.keys(payload.data)) {
            try { localStorage.setItem(k, payload.data[k]); } catch {}
          }
          render();
          toast(t.imported);
        });
      } catch {
        toast(I18N[lang].importFailed);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // ===== Language switching =====
  function setLang(l) {
    lang = l;
    try { localStorage.setItem('lang', l); } catch {}
    render();
  }
  $('flag-lao').addEventListener('click', () => setLang('lao'));
  $('flag-th').addEventListener('click',  () => setLang('th'));
  $('flag-en').addEventListener('click',  () => setLang('en'));

  window.addEventListener('storage', (e) => {
    if (e.key === 'lang' && (e.newValue === 'lao' || e.newValue === 'th' || e.newValue === 'en')) {
      lang = e.newValue;
      render();
    }
  });

  // Re-render on visibility change so stats refresh if user played a game in another tab.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render();
  });

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  render();
})();
