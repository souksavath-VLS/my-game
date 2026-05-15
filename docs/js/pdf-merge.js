// PDF Merge — combine multiple PDFs into one, reorderable.
// Uses pdf-lib (browser).

(() => {
  'use strict';

  const I18N = {
    th: {
      title:'📄+📄 รวม PDF', back:'← หน้าหลัก',
      dropHint:'แตะเลือก หรือ ลาก PDF มาวาง', dropSub:'(หลายไฟล์ได้)',
      btnPick:'เลือก PDF',
      files:'PDF ที่จะรวม',
      total:'รวม',
      pages:'หน้า',
      clear:'ล้าง', gen:'รวมเป็น PDF',
      empty:'ยังไม่มี PDF กดเลือกไฟล์หรือลากมาวาง',
      progress:'กำลังรวม...', done:'✓ รวม PDF เสร็จแล้ว',
      noFiles:'ยังไม่ได้เลือกไฟล์',
      invalid:'ไฟล์ไม่ใช่ PDF ที่ถูกต้อง: ',
      confirmClear:'ล้างไฟล์ทั้งหมด?',
      cancel:'ยกเลิก'
    },
    en: {
      title:'📄+📄 PDF Merge', back:'← Home',
      dropHint:'Tap or drag PDF files here', dropSub:'(multiple OK)',
      btnPick:'Pick PDFs',
      files:'PDFs to merge',
      total:'Total',
      pages:'pages',
      clear:'Clear', gen:'Merge into PDF',
      empty:'No PDFs yet. Pick or drag some files',
      progress:'Merging...', done:'✓ PDF merged',
      noFiles:'No files selected',
      invalid:'Not a valid PDF: ',
      confirmClear:'Remove all files?',
      cancel:'Cancel'
    },
    lao: {
      title:'📄+📄 ລວມ PDF', back:'← ໜ້າຫຼັກ',
      dropHint:'ກົດເລືອກ ຫຼື ລາກ PDF ມາວາງ', dropSub:'(ຫຼາຍໄຟລ໌ໄດ້)',
      btnPick:'ເລືອກ PDF',
      files:'PDF ທີ່ຈະລວມ',
      total:'ລວມ',
      pages:'ໜ້າ',
      clear:'ລ້າງ', gen:'ລວມເປັນ PDF',
      empty:'ຍັງບໍ່ມີ PDF ກົດເລືອກໄຟລ໌ ຫຼື ລາກມາວາງ',
      progress:'ກຳລັງລວມ...', done:'✓ ລວມ PDF ສຳເລັດ',
      noFiles:'ຍັງບໍ່ໄດ້ເລືອກໄຟລ໌',
      invalid:'ໄຟລ໌ບໍ່ແມ່ນ PDF ທີ່ຖືກຕ້ອງ: ',
      confirmClear:'ລ້າງໄຟລ໌ທັງໝົດ?',
      cancel:'ຍົກເລີກ'
    }
  };

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'lao';
  })();
  let files = [];  // [{ id, name, size, bytes (ArrayBuffer), pageCount }]

  const $ = id => document.getElementById(id);
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
    return (n/1024/1024).toFixed(2) + ' MB';
  }
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }

  // ===== Add files =====
  async function addFiles(fileList) {
    if (typeof window.PDFLib === 'undefined') {
      toast('pdf-lib failed to load');
      return;
    }
    const arr = [...fileList].filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (!arr.length) return;
    showProgress(true, 0, I18N[lang].progress);
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      try {
        const bytes = await f.arrayBuffer();
        // Validate by loading
        const pdf = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: false });
        files.push({
          id: uid(),
          name: f.name,
          size: f.size,
          bytes,
          pageCount: pdf.getPageCount()
        });
      } catch (err) {
        toast(I18N[lang].invalid + f.name);
      }
      updateProgress(((i + 1) / arr.length) * 100, `${i + 1}/${arr.length}`);
    }
    showProgress(false);
    render();
  }

  // ===== Drop zone =====
  const drop = $('drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });
  $('file-input').addEventListener('change', (e) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  });

  // ===== Render =====
  function render() {
    const list = $('files');
    list.innerHTML = '';
    $('file-count').textContent = files.length;
    $('empty').style.display = files.length ? 'none' : '';
    $('btn-clear').disabled = files.length === 0;
    $('btn-gen').disabled   = files.length < 1;

    // Total
    const totalPages = files.reduce((acc, f) => acc + f.pageCount, 0);
    const totalSize  = files.reduce((acc, f) => acc + f.size, 0);
    if (files.length) {
      $('total').classList.add('show');
      $('total-val').textContent = `${files.length} ${lang==='en'?'files':lang==='th'?'ไฟล์':'ໄຟລ໌'} · ${totalPages} ${I18N[lang].pages} · ${fmtBytes(totalSize)}`;
    } else {
      $('total').classList.remove('show');
    }

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const card = document.createElement('div');
      card.className = 'pm-file';
      card.innerHTML = `
        <div class="num">${i + 1}</div>
        <div class="body">
          <div class="name">${escapeHtml(f.name)}</div>
          <div class="meta">
            <span>📄 ${f.pageCount} ${I18N[lang].pages}</span>
            <span>💾 ${fmtBytes(f.size)}</span>
          </div>
        </div>
        <div class="actions">
          <button class="up" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="down" ${i === files.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="del">✕</button>
        </div>
      `;
      card.querySelector('.up').addEventListener('click', () => moveFile(i, -1));
      card.querySelector('.down').addEventListener('click', () => moveFile(i, 1));
      card.querySelector('.del').addEventListener('click', () => deleteFile(f.id));
      list.appendChild(card);
    }
  }
  function deleteFile(id) { files = files.filter(f => f.id !== id); render(); }
  function moveFile(idx, delta) {
    const j = idx + delta;
    if (j < 0 || j >= files.length) return;
    const [it] = files.splice(idx, 1);
    files.splice(j, 0, it);
    render();
  }

  // ===== Clear modal =====
  $('btn-clear').addEventListener('click', () => {
    if (!files.length) return;
    $('clear-text').textContent = I18N[lang].confirmClear;
    $('clear-cancel').textContent  = I18N[lang].cancel;
    $('clear-confirm').textContent = I18N[lang].clear;
    $('modal-clear').classList.add('show');
  });
  $('clear-cancel').addEventListener('click', () => $('modal-clear').classList.remove('show'));
  $('clear-confirm').addEventListener('click', () => {
    files = [];
    render();
    $('modal-clear').classList.remove('show');
  });
  $('modal-clear').addEventListener('click', (e) => {
    if (e.target.id === 'modal-clear') e.currentTarget.classList.remove('show');
  });

  // ===== Progress =====
  function showProgress(on, pct, label) {
    $('progress').classList.toggle('show', !!on);
    if (label) $('progress-lbl').textContent = label;
    if (typeof pct === 'number') updateProgress(pct);
  }
  function updateProgress(pct, sub) {
    $('progress-bar').style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (sub) $('progress-lbl').textContent = I18N[lang].progress + ' ' + sub;
  }

  // ===== Merge =====
  async function mergePdfs() {
    if (!files.length) { toast(I18N[lang].noFiles); return; }
    if (typeof window.PDFLib === 'undefined') { toast('pdf-lib failed to load'); return; }

    showProgress(true, 0, I18N[lang].progress);
    try {
      const merged = await PDFLib.PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const src = await PDFLib.PDFDocument.load(f.bytes);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        updateProgress(((i + 1) / files.length) * 100, `${i + 1}/${files.length}`);
        await new Promise(r => setTimeout(r, 0));
      }
      const out = await merged.save();
      const blob = new Blob([out], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const ts = new Date();
      const pad = n => String(n).padStart(2, '0');
      const filename = `merged-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}.pdf`;
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
      showProgress(false);
      toast(I18N[lang].done);
    } catch (err) {
      console.error(err);
      showProgress(false);
      toast('⚠ ' + (err.message || 'merge failed'));
    }
  }
  $('btn-gen').addEventListener('click', mergePdfs);

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ===== i18n =====
  function applyLang() {
    const t = I18N[lang];
    document.title = t.title;
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    $('drop-hint').innerHTML = t.dropHint + '<br><span style="font-size:.75rem;">' + t.dropSub + '</span>';
    $('btn-pick-lbl').textContent = t.btnPick;
    $('lbl-files').textContent = t.files;
    $('lbl-total').textContent = t.total;
    $('btn-clear-lbl').textContent = t.clear;
    $('btn-gen-lbl').textContent   = t.gen;
    $('empty').textContent = t.empty;
    render();
  }
  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });
  applyLang();
})();
