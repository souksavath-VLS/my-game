// PDF Split — split a PDF into multiple PDFs.
// Modes: select pages (tap thumbs), range expression ("1-3, 5"), or every page.
// Uses pdf.js for thumbnails, pdf-lib for splitting, JSZip for multi-output zipping.

(() => {
  'use strict';

  const I18N = {
    th: {
      title:'📄✂️ แยก PDF', back:'← หน้าหลัก',
      dropHint:'แตะเลือก หรือ ลาก PDF มาวาง', dropSub:'(1 ไฟล์)',
      btnPick:'เลือก PDF',
      tabSelect:'เลือกหน้า', tabRange:'ระบุช่วง', tabAll:'ทุกหน้า',
      selectText:'แตะหน้าที่ต้องการ — จะบันทึกเป็น PDF ไฟล์เดียว',
      rangeText:'พิมพ์ช่วงหน้า แต่ละชุดจะแยกไฟล์',
      rangeHintTxt:'ตัวอย่าง:',
      allText:'แยกทุกหน้าเป็นไฟล์แยก — รวมไว้ใน .zip',
      pagesHdr:'หน้าต่างๆ',
      selAll:'เลือกหมด', selNone:'ยกเลิกหมด', selInvert:'กลับกัน',
      clear:'ล้าง', gen:'แยก PDF',
      empty:'กดเลือก PDF ก่อน',
      progress:'กำลังแยก...', done:'✓ แยก PDF เสร็จแล้ว',
      noFile:'ยังไม่ได้เลือกไฟล์',
      noSelection:'ยังไม่ได้เลือกหน้า',
      invalidRange:'รูปแบบช่วงไม่ถูกต้อง',
      outOfRange:'หมายเลขหน้าเกิน',
      invalid:'ไฟล์ไม่ใช่ PDF ที่ถูกต้อง',
      confirmClear:'ล้าง PDF ปัจจุบัน?',
      cancel:'ยกเลิก',
      pagesUnit:'หน้า', filesUnit:'ไฟล์',
      summarySelected:'เลือก',
      summaryRanges:'จะได้',
      summaryAll:'จะได้'
    },
    en: {
      title:'📄✂️ PDF Split', back:'← Home',
      dropHint:'Tap or drag a PDF here', dropSub:'(single file)',
      btnPick:'Pick PDF',
      tabSelect:'Pick pages', tabRange:'Ranges', tabAll:'Every page',
      selectText:'Tap pages to include — saved as one PDF',
      rangeText:'Type page ranges, each set becomes a file',
      rangeHintTxt:'Example:',
      allText:'Each page becomes its own file — bundled into .zip',
      pagesHdr:'Pages',
      selAll:'Select all', selNone:'Clear', selInvert:'Invert',
      clear:'Clear', gen:'Split PDF',
      empty:'Pick a PDF first',
      progress:'Splitting...', done:'✓ PDF split complete',
      noFile:'No file selected',
      noSelection:'No pages selected',
      invalidRange:'Invalid range format',
      outOfRange:'Page number out of range',
      invalid:'Not a valid PDF',
      confirmClear:'Clear the current PDF?',
      cancel:'Cancel',
      pagesUnit:'pages', filesUnit:'files',
      summarySelected:'Selected',
      summaryRanges:'Output',
      summaryAll:'Output'
    },
    lao: {
      title:'📄✂️ ແຍກ PDF', back:'← ໜ້າຫຼັກ',
      dropHint:'ກົດເລືອກ ຫຼື ລາກ PDF ມາວາງ', dropSub:'(1 ໄຟລ໌)',
      btnPick:'ເລືອກ PDF',
      tabSelect:'ເລືອກໜ້າ', tabRange:'ໄລຍະ', tabAll:'ທຸກໜ້າ',
      selectText:'ກົດໜ້າທີ່ຕ້ອງການ — ຈະບັນທຶກເປັນ PDF ດຽວ',
      rangeText:'ພິມໄລຍະໜ້າ ແຕ່ລະຊຸດແຍກໄຟລ໌',
      rangeHintTxt:'ຕົວຢ່າງ:',
      allText:'ແຍກທຸກໜ້າເປັນໄຟລ໌ແຍກ — ບີບໄວ້ໃນ .zip',
      pagesHdr:'ໜ້າຕ່າງໆ',
      selAll:'ເລືອກໝົດ', selNone:'ຍົກເລີກໝົດ', selInvert:'ກັບກັນ',
      clear:'ລ້າງ', gen:'ແຍກ PDF',
      empty:'ກົດເລືອກ PDF ກ່ອນ',
      progress:'ກຳລັງແຍກ...', done:'✓ ແຍກ PDF ສຳເລັດ',
      noFile:'ຍັງບໍ່ໄດ້ເລືອກໄຟລ໌',
      noSelection:'ຍັງບໍ່ໄດ້ເລືອກໜ້າ',
      invalidRange:'ຮູບແບບໄລຍະບໍ່ຖືກຕ້ອງ',
      outOfRange:'ໝາຍເລກໜ້າເກີນ',
      invalid:'ໄຟລ໌ບໍ່ແມ່ນ PDF ທີ່ຖືກຕ້ອງ',
      confirmClear:'ລ້າງ PDF ປັດຈຸບັນ?',
      cancel:'ຍົກເລີກ',
      pagesUnit:'ໜ້າ', filesUnit:'ໄຟລ໌',
      summarySelected:'ເລືອກ',
      summaryRanges:'ຈະໄດ້',
      summaryAll:'ຈະໄດ້'
    }
  };

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'lao';
  })();
  let currentFile = null;     // { name, bytes, pageCount }
  let mode = 'select';        // 'select' | 'range' | 'all'
  let selected = new Set();   // 0-based page indices

  const $ = id => document.getElementById(id);
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
    return (n/1024/1024).toFixed(2) + ' MB';
  }

  // Configure pdf.js worker
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // ===== Load file =====
  async function loadFile(file) {
    if (typeof window.PDFLib === 'undefined') { toast('pdf-lib failed to load'); return; }
    if (typeof window.pdfjsLib === 'undefined') { toast('pdf.js failed to load'); return; }
    showProgress(true, 0);
    try {
      const bytes = await file.arrayBuffer();
      // Validate via pdf-lib (use a copy — pdf-lib doesn't detach but be defensive)
      const doc = await PDFLib.PDFDocument.load(bytes.slice(0));
      const pageCount = doc.getPageCount();
      // Keep the original buffer for later split operations.
      currentFile = { name: file.name, size: file.size, bytes, pageCount };
      selected = new Set();
      renderInfo();
      $('tabs').style.display = '';
      setMode('select');
      $('btn-clear').disabled = false;
      $('btn-gen').disabled = false;
      // pdf.js's worker transfers (detaches) the ArrayBuffer it's given,
      // so pass it a COPY — otherwise currentFile.bytes becomes unusable for splitting.
      await renderThumbs(bytes.slice(0), pageCount);
    } catch (err) {
      console.error(err);
      toast(I18N[lang].invalid);
      currentFile = null;
    }
    showProgress(false);
  }

  function renderInfo() {
    if (!currentFile) {
      $('info').classList.remove('show');
      return;
    }
    $('info').classList.add('show');
    $('info-name').textContent = currentFile.name;
    $('info-meta').textContent = `${currentFile.pageCount} ${I18N[lang].pagesUnit} · ${fmtBytes(currentFile.size)}`;
  }

  async function renderThumbs(bytes, pageCount) {
    const list = $('thumbs');
    list.innerHTML = '';
    $('list-hdr').style.display = '';
    $('pages-count').textContent = pageCount;
    $('empty').style.display = 'none';

    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;

    for (let i = 1; i <= pageCount; i++) {
      const thumb = document.createElement('div');
      thumb.className = 'ps-thumb';
      thumb.dataset.idx = i - 1;
      thumb.innerHTML = `
        <span class="num">${i}</span>
        <span class="check">✓</span>
        <div class="img"></div>
      `;
      thumb.addEventListener('click', () => onThumbClick(i - 1));
      list.appendChild(thumb);

      // Render page async
      pdf.getPage(i).then(page => {
        const targetW = 160;
        const vp1 = page.getViewport({ scale: 1 });
        const scale = targetW / vp1.width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        thumb.querySelector('.img').appendChild(canvas);
        page.render({ canvasContext: ctx, viewport });
      }).catch(() => {});

      // Yield every 4 pages to avoid blocking UI
      if (i % 4 === 0) await new Promise(r => setTimeout(r, 0));
    }
    updateModeUI();
  }

  function onThumbClick(idx) {
    if (mode !== 'select') return;
    if (selected.has(idx)) selected.delete(idx);
    else selected.add(idx);
    updateThumbClasses();
    updateModeUI();
  }

  function updateThumbClasses() {
    const thumbs = $('thumbs').querySelectorAll('.ps-thumb');
    const inRange = mode === 'range' ? parseRange($('range-input').value, currentFile ? currentFile.pageCount : 0).flat : new Set();
    thumbs.forEach(el => {
      const idx = parseInt(el.dataset.idx, 10);
      el.classList.toggle('selected', mode === 'select' && selected.has(idx));
      el.classList.toggle('in-range', mode === 'range' && inRange.has(idx));
    });
  }

  // ===== Mode =====
  function setMode(m) {
    mode = m;
    $('tab-select').classList.toggle('active', m === 'select');
    $('tab-range').classList.toggle('active',  m === 'range');
    $('tab-all').classList.toggle('active',    m === 'all');
    $('ctrl-select').classList.toggle('show',  m === 'select');
    $('ctrl-range').classList.toggle('show',   m === 'range');
    $('ctrl-all').classList.toggle('show',     m === 'all');
    updateThumbClasses();
    updateModeUI();
  }
  $('tab-select').addEventListener('click', () => setMode('select'));
  $('tab-range').addEventListener('click',  () => setMode('range'));
  $('tab-all').addEventListener('click',    () => setMode('all'));

  function updateModeUI() {
    if (!currentFile) return;
    const t = I18N[lang];
    if (mode === 'select') {
      $('select-summary').textContent = `${t.summarySelected}: ${selected.size} / ${currentFile.pageCount} ${t.pagesUnit}`;
      $('select-summary').classList.remove('error');
    } else if (mode === 'range') {
      const parsed = parseRange($('range-input').value, currentFile.pageCount);
      const sum = $('range-summary');
      if ($('range-input').value.trim() === '') {
        sum.classList.remove('show');
      } else if (parsed.error) {
        sum.classList.add('show', 'error');
        sum.textContent = '⚠ ' + (parsed.error === 'out' ? t.outOfRange : t.invalidRange);
      } else {
        sum.classList.add('show');
        sum.classList.remove('error');
        const totalPages = parsed.ranges.reduce((a, r) => a + r.length, 0);
        sum.textContent = `${t.summaryRanges}: ${parsed.ranges.length} ${t.filesUnit} · ${totalPages} ${t.pagesUnit}`;
      }
      updateThumbClasses();
    } else if (mode === 'all') {
      $('all-summary').textContent = `${t.summaryAll}: ${currentFile.pageCount} ${t.filesUnit} (.zip)`;
    }
  }

  $('range-input').addEventListener('input', updateModeUI);

  // Selection helpers
  $('sel-all').addEventListener('click', () => {
    if (!currentFile) return;
    selected = new Set();
    for (let i = 0; i < currentFile.pageCount; i++) selected.add(i);
    updateThumbClasses(); updateModeUI();
  });
  $('sel-none').addEventListener('click', () => {
    selected = new Set();
    updateThumbClasses(); updateModeUI();
  });
  $('sel-invert').addEventListener('click', () => {
    if (!currentFile) return;
    const next = new Set();
    for (let i = 0; i < currentFile.pageCount; i++) if (!selected.has(i)) next.add(i);
    selected = next;
    updateThumbClasses(); updateModeUI();
  });

  // ===== Range parser =====
  // Input: "1-3, 5, 7-9"
  // Returns: { ranges: [[0,1,2], [4], [6,7,8]], flat: Set(0..8), error: null | 'syntax' | 'out' }
  function parseRange(expr, maxPages) {
    if (!expr || !expr.trim()) return { ranges: [], flat: new Set(), error: null };
    const parts = expr.split(/[,;\s]+/).filter(Boolean);
    const ranges = [];
    const flat = new Set();
    for (const p of parts) {
      const m = p.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!m) return { ranges: [], flat: new Set(), error: 'syntax' };
      const a = parseInt(m[1], 10);
      const b = m[2] ? parseInt(m[2], 10) : a;
      if (a < 1 || b < 1 || a > maxPages || b > maxPages) return { ranges: [], flat: new Set(), error: 'out' };
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const arr = [];
      for (let i = lo; i <= hi; i++) { arr.push(i - 1); flat.add(i - 1); }
      ranges.push(arr);
    }
    return { ranges, flat, error: null };
  }

  // ===== Drop zone =====
  const drop = $('drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('dragover');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });
  $('file-input').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) loadFile(f);
    e.target.value = '';
  });

  // ===== Clear =====
  $('btn-clear').addEventListener('click', () => {
    if (!currentFile) return;
    $('clear-text').textContent  = I18N[lang].confirmClear;
    $('clear-cancel').textContent  = I18N[lang].cancel;
    $('clear-confirm').textContent = I18N[lang].clear;
    $('modal-clear').classList.add('show');
  });
  $('clear-cancel').addEventListener('click', () => $('modal-clear').classList.remove('show'));
  $('clear-confirm').addEventListener('click', () => {
    currentFile = null;
    selected = new Set();
    $('thumbs').innerHTML = '';
    $('info').classList.remove('show');
    $('tabs').style.display = 'none';
    $('list-hdr').style.display = 'none';
    $('ctrl-select').classList.remove('show');
    $('ctrl-range').classList.remove('show');
    $('ctrl-all').classList.remove('show');
    $('btn-clear').disabled = true;
    $('btn-gen').disabled = true;
    $('modal-clear').classList.remove('show');
  });
  $('modal-clear').addEventListener('click', (e) => {
    if (e.target.id === 'modal-clear') e.currentTarget.classList.remove('show');
  });

  // ===== Progress =====
  function showProgress(on, pct, label) {
    $('progress').classList.toggle('show', !!on);
    if (label) $('progress-lbl').textContent = label;
    else $('progress-lbl').textContent = I18N[lang].progress;
    if (typeof pct === 'number') updateProgress(pct);
  }
  function updateProgress(pct, sub) {
    $('progress-bar').style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (sub) $('progress-lbl').textContent = I18N[lang].progress + ' ' + sub;
  }

  // ===== Generate split =====
  async function buildSplitPdf(pageIndices) {
    // Always pass a fresh copy — repeated loads + any library quirks won't detach our source.
    const src = await PDFLib.PDFDocument.load(currentFile.bytes.slice(0));
    const out = await PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, pageIndices);
    pages.forEach(p => out.addPage(p));
    return out.save();
  }

  function baseName(name) {
    return name.replace(/\.pdf$/i, '');
  }

  function tsStamp() {
    const ts = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  async function generate() {
    if (!currentFile) { toast(I18N[lang].noFile); return; }
    const t = I18N[lang];
    showProgress(true, 0);

    try {
      if (mode === 'select') {
        if (!selected.size) { showProgress(false); toast(t.noSelection); return; }
        const idxs = [...selected].sort((a, b) => a - b);
        const bytes = await buildSplitPdf(idxs);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        downloadBlob(blob, `${baseName(currentFile.name)}-selection-${tsStamp()}.pdf`);
        showProgress(false);
        toast(t.done);

      } else if (mode === 'range') {
        const parsed = parseRange($('range-input').value, currentFile.pageCount);
        if (parsed.error || !parsed.ranges.length) { showProgress(false); toast(parsed.error === 'out' ? t.outOfRange : t.invalidRange); return; }
        // If single range → single PDF; otherwise → zip
        if (parsed.ranges.length === 1) {
          const bytes = await buildSplitPdf(parsed.ranges[0]);
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const r = parsed.ranges[0];
          const rangeLbl = r.length === 1 ? (r[0]+1) : (r[0]+1) + '-' + (r[r.length-1]+1);
          downloadBlob(blob, `${baseName(currentFile.name)}-pages-${rangeLbl}.pdf`);
        } else {
          if (typeof window.JSZip === 'undefined') { showProgress(false); toast('JSZip failed to load'); return; }
          const zip = new JSZip();
          for (let i = 0; i < parsed.ranges.length; i++) {
            const r = parsed.ranges[i];
            const bytes = await buildSplitPdf(r);
            const rangeLbl = r.length === 1 ? (r[0]+1) : (r[0]+1) + '-' + (r[r.length-1]+1);
            zip.file(`${baseName(currentFile.name)}-pages-${rangeLbl}.pdf`, bytes);
            updateProgress(((i + 1) / parsed.ranges.length) * 100, `${i + 1}/${parsed.ranges.length}`);
            await new Promise(r => setTimeout(r, 0));
          }
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          downloadBlob(zipBlob, `${baseName(currentFile.name)}-split-${tsStamp()}.zip`);
        }
        showProgress(false);
        toast(t.done);

      } else if (mode === 'all') {
        if (typeof window.JSZip === 'undefined') { showProgress(false); toast('JSZip failed to load'); return; }
        const zip = new JSZip();
        const n = currentFile.pageCount;
        for (let i = 0; i < n; i++) {
          const bytes = await buildSplitPdf([i]);
          const idxLbl = String(i + 1).padStart(String(n).length, '0');
          zip.file(`${baseName(currentFile.name)}-page-${idxLbl}.pdf`, bytes);
          updateProgress(((i + 1) / n) * 100, `${i + 1}/${n}`);
          await new Promise(r => setTimeout(r, 0));
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${baseName(currentFile.name)}-pages-${tsStamp()}.zip`);
        showProgress(false);
        toast(t.done);
      }
    } catch (err) {
      console.error(err);
      showProgress(false);
      toast('⚠ ' + (err.message || 'split failed'));
    }
  }
  $('btn-gen').addEventListener('click', generate);

  // ===== i18n =====
  function applyLang() {
    const t = I18N[lang];
    document.title = t.title;
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent  = t.back;
    $('drop-hint').innerHTML   = t.dropHint + '<br><span style="font-size:.75rem;">' + t.dropSub + '</span>';
    $('btn-pick-lbl').textContent = t.btnPick;
    $('tab-select-lbl').textContent = t.tabSelect;
    $('tab-range-lbl').textContent  = t.tabRange;
    $('tab-all-lbl').textContent    = t.tabAll;
    $('lbl-select-text').textContent = t.selectText;
    $('lbl-range-text').textContent  = t.rangeText;
    $('lbl-all-text').textContent    = t.allText;
    $('range-hint-text').textContent = t.rangeHintTxt;
    $('lbl-pages-hdr').textContent   = t.pagesHdr;
    $('sel-all-lbl').textContent     = t.selAll;
    $('sel-none-lbl').textContent    = t.selNone;
    $('sel-invert-lbl').textContent  = t.selInvert;
    $('btn-clear-lbl').textContent   = t.clear;
    $('btn-gen-lbl').textContent     = t.gen;
    $('empty').textContent           = t.empty;
    renderInfo();
    updateModeUI();
  }
  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  applyLang();
})();
