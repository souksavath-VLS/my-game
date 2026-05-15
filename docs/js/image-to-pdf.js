// Image to PDF — combine multiple images into a single PDF.
// Drag/drop + file picker + camera. Reorder, delete, settings.
// Uses jsPDF. Generates entirely in-browser.

(() => {
  'use strict';

  const I18N = {
    th: {
      title:'🖼️ → 📄 รูปเป็น PDF', back:'← หน้าหลัก',
      dropHint:'แตะเลือก หรือ ลากรูปมาวางที่นี่',
      dropSub:'JPG · PNG · WEBP (หลายรูปได้)',
      btnPick:'เลือกไฟล์', btnCam:'กล้อง',
      images:'รูปภาพ',
      page:'ขนาดหน้า', orient:'แนว', margin:'ขอบ', quality:'คุณภาพ',
      fit:'ตามรูป', auto:'อัตโนมัติ', portrait:'ตั้ง', landscape:'นอน',
      low:'ประหยัด', med:'ปานกลาง', high:'สูง',
      clear:'ล้าง', gen:'สร้าง PDF',
      empty:'ยังไม่มีรูป กดเลือกไฟล์หรือลากมาวาง',
      progress:'กำลังสร้าง PDF...',
      done:'✓ สร้าง PDF เสร็จแล้ว',
      noImages:'ยังไม่ได้เลือกรูป',
      tooLarge:'ไฟล์ใหญ่เกินไป ข้ามรูปนี้',
      generating:'กำลังประมวลผล',
      confirmClear:'ล้างรูปทั้งหมด?'
    },
    en: {
      title:'🖼️ → 📄 Image to PDF', back:'← Home',
      dropHint:'Tap or drag images here',
      dropSub:'JPG · PNG · WEBP (multiple OK)',
      btnPick:'Pick files', btnCam:'Camera',
      images:'Images',
      page:'Page size', orient:'Orientation', margin:'Margin', quality:'Quality',
      fit:'Fit image', auto:'Auto', portrait:'Portrait', landscape:'Landscape',
      low:'Low', med:'Medium', high:'High',
      clear:'Clear', gen:'Make PDF',
      empty:'No images yet. Pick or drag some files',
      progress:'Generating PDF...',
      done:'✓ PDF created',
      noImages:'No images selected',
      tooLarge:'Image too large, skipped',
      generating:'Processing',
      confirmClear:'Remove all images?'
    },
    lao: {
      title:'🖼️ → 📄 ຮູບເປັນ PDF', back:'← ໜ້າຫຼັກ',
      dropHint:'ກົດເລືອກ ຫຼື ລາກຮູບມາວາງທີ່ນີ້',
      dropSub:'JPG · PNG · WEBP (ຫຼາຍຮູບໄດ້)',
      btnPick:'ເລືອກໄຟລ໌', btnCam:'ກ້ອງ',
      images:'ຮູບ',
      page:'ຂະໜາດໜ້າ', orient:'ໝຸນ', margin:'ຂອບ', quality:'ຄຸນະພາບ',
      fit:'ຕາມຮູບ', auto:'ອັດຕະໂນມັດ', portrait:'ຕັ້ງ', landscape:'ນອນ',
      low:'ປະຢັດ', med:'ປານກາງ', high:'ສູງ',
      clear:'ລ້າງ', gen:'ສ້າງ PDF',
      empty:'ຍັງບໍ່ມີຮູບ ກົດເລືອກໄຟລ໌ ຫຼື ລາກມາວາງ',
      progress:'ກຳລັງສ້າງ PDF...',
      done:'✓ ສ້າງ PDF ສຳເລັດ',
      noImages:'ຍັງບໍ່ໄດ້ເລືອກຮູບ',
      tooLarge:'ໄຟລ໌ໃຫຍ່ເກີນໄປ ຂ້າມຮູບນີ້',
      generating:'ກຳລັງປະມວນຜົນ',
      confirmClear:'ລ້າງຮູບທັງໝົດ?'
    }
  };

  const MAX_DIM = 2400;   // max longest side after downscale (keeps PDF smaller)
  const MAX_FILE_BYTES = 30 * 1024 * 1024; // 30 MB per file

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'lao';
  })();
  let images = [];   // [{ id, dataUrl, width, height }]
  let settings = { page: 'a4', orient: 'auto', margin: 5, quality: 0.85 };

  const $ = id => document.getElementById(id);

  // ===== Helpers =====
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }

  // Load file → resized JPEG dataUrl
  function loadFile(file, qualityHint) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) return reject(new Error('not image'));
      if (file.size > MAX_FILE_BYTES) return reject(new Error('too large'));
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('decode failed'));
        img.onload = () => {
          // Downscale if larger than MAX_DIM on longest side
          let w = img.naturalWidth, h = img.naturalHeight;
          const longest = Math.max(w, h);
          if (longest > MAX_DIM) {
            const scale = MAX_DIM / longest;
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          // White background for transparent PNGs
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', qualityHint || 0.85);
          resolve({ dataUrl, width: w, height: h });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function addFiles(fileList) {
    const files = [...fileList].filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    showProgress(true, 0);
    for (let i = 0; i < files.length; i++) {
      try {
        const data = await loadFile(files[i], 0.92);  // store at higher quality, recompress on gen
        images.push({ id: uid(), dataUrl: data.dataUrl, width: data.width, height: data.height });
      } catch (err) {
        toast(I18N[lang].tooLarge);
      }
      updateProgress(((i + 1) / files.length) * 100, `${i + 1}/${files.length}`);
    }
    showProgress(false);
    renderThumbs();
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

  // File pickers
  $('file-input').addEventListener('change', (e) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  });
  $('cam-input').addEventListener('change', (e) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  });

  // Paste from clipboard
  document.addEventListener('paste', (e) => {
    if (!e.clipboardData) return;
    const items = e.clipboardData.items;
    const pasted = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const f = items[i].getAsFile();
        if (f) pasted.push(f);
      }
    }
    if (pasted.length) addFiles(pasted);
  });

  // ===== Render =====
  function renderThumbs() {
    const el = $('thumbs');
    el.innerHTML = '';
    $('thumb-count').textContent = images.length;
    $('empty').style.display = images.length ? 'none' : '';
    $('btn-clear').disabled = images.length === 0;
    $('btn-gen').disabled   = images.length === 0;
    for (let i = 0; i < images.length; i++) {
      const im = images[i];
      const card = document.createElement('div');
      card.className = 'ip-thumb';
      card.innerHTML = `
        <span class="num">${i + 1}</span>
        <button class="del" title="Delete">✕</button>
        <div class="img-wrap"><img src="${im.dataUrl}" alt=""></div>
        <div class="moves">
          <button class="up" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="down" ${i === images.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
      `;
      card.querySelector('.del').addEventListener('click', () => deleteImage(im.id));
      card.querySelector('.up').addEventListener('click', () => moveImage(i, -1));
      card.querySelector('.down').addEventListener('click', () => moveImage(i, 1));
      el.appendChild(card);
    }
  }
  function deleteImage(id) {
    images = images.filter(x => x.id !== id);
    renderThumbs();
  }
  function moveImage(idx, delta) {
    const j = idx + delta;
    if (j < 0 || j >= images.length) return;
    const [it] = images.splice(idx, 1);
    images.splice(j, 0, it);
    renderThumbs();
  }

  $('btn-clear').addEventListener('click', () => {
    if (!images.length) return;
    $('clear-text').textContent = I18N[lang].confirmClear;
    $('modal-clear').classList.add('show');
  });
  $('clear-cancel').addEventListener('click', () => $('modal-clear').classList.remove('show'));
  $('clear-confirm').addEventListener('click', () => {
    images = [];
    renderThumbs();
    $('modal-clear').classList.remove('show');
  });
  $('modal-clear').addEventListener('click', (e) => {
    if (e.target.id === 'modal-clear') e.currentTarget.classList.remove('show');
  });

  // ===== Settings =====
  function wireOpts(containerId, settingKey, parser) {
    const opts = $(containerId).querySelectorAll('.ip-opt');
    opts.forEach(o => {
      o.addEventListener('click', () => {
        opts.forEach(x => x.classList.toggle('active', x === o));
        const v = o.dataset.v;
        settings[settingKey] = parser ? parser(v) : v;
      });
    });
  }
  wireOpts('opt-page',    'page');
  wireOpts('opt-orient',  'orient');
  wireOpts('opt-margin',  'margin',  v => parseInt(v, 10));
  wireOpts('opt-quality', 'quality', v => parseFloat(v));

  // ===== Progress =====
  function showProgress(on, pct) {
    $('progress').classList.toggle('show', !!on);
    if (typeof pct === 'number') updateProgress(pct);
  }
  function updateProgress(pct, sub) {
    $('progress-bar').style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (sub) $('progress-lbl').textContent = I18N[lang].progress + ' ' + sub;
    else $('progress-lbl').textContent = I18N[lang].progress;
  }

  // ===== Generate PDF =====
  // Standard page sizes in mm
  const PAGE_SIZES = {
    a4:     { w: 210, h: 297 },
    letter: { w: 215.9, h: 279.4 },
    a5:     { w: 148, h: 210 }
  };

  async function generatePdf() {
    if (!images.length) { toast(I18N[lang].noImages); return; }
    if (typeof window.jspdf === 'undefined') {
      toast('jsPDF failed to load');
      return;
    }
    showProgress(true, 0);

    const { jsPDF } = window.jspdf;
    let doc = null;

    for (let i = 0; i < images.length; i++) {
      const im = images[i];
      updateProgress(((i + 0.5) / images.length) * 100, `${i + 1}/${images.length}`);

      // Choose orientation per image (auto) or global
      let orient = settings.orient;
      if (orient === 'auto') orient = im.width >= im.height ? 'l' : 'p';

      // Compute page size
      let pageW, pageH;
      if (settings.page === 'fit') {
        // Fit-to-image: convert pixels to mm at 96 DPI (1in = 25.4mm, 96px = 25.4mm)
        const mmPerPx = 25.4 / 96;
        pageW = im.width * mmPerPx;
        pageH = im.height * mmPerPx;
        // Limit to reasonable max
        const maxMm = 1000;
        if (pageW > maxMm || pageH > maxMm) {
          const scale = maxMm / Math.max(pageW, pageH);
          pageW *= scale; pageH *= scale;
        }
        orient = pageW >= pageH ? 'l' : 'p';
      } else {
        const sz = PAGE_SIZES[settings.page] || PAGE_SIZES.a4;
        if (orient === 'l') { pageW = sz.h; pageH = sz.w; }
        else                { pageW = sz.w; pageH = sz.h; }
      }

      const format = settings.page === 'fit'
        ? [pageW, pageH]
        : settings.page;

      if (!doc) {
        doc = new jsPDF({ orientation: orient, unit: 'mm', format, compress: true });
      } else {
        doc.addPage(format, orient);
      }

      // Fit image within page minus margin (preserving aspect ratio)
      const margin = settings.margin;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;
      const imgRatio = im.width / im.height;
      const availRatio = availW / availH;
      let drawW, drawH;
      if (imgRatio > availRatio) {
        drawW = availW;
        drawH = availW / imgRatio;
      } else {
        drawH = availH;
        drawW = availH * imgRatio;
      }
      const drawX = (pageW - drawW) / 2;
      const drawY = (pageH - drawH) / 2;

      // Optionally re-encode at chosen quality
      let dataUrl = im.dataUrl;
      if (settings.quality < 0.9) {
        dataUrl = await reencode(im.dataUrl, settings.quality);
      }
      doc.addImage(dataUrl, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');
      updateProgress(((i + 1) / images.length) * 100, `${i + 1}/${images.length}`);
      // Yield to let UI breathe
      await new Promise(r => setTimeout(r, 0));
    }

    const ts = new Date();
    const pad = n => String(n).padStart(2, '0');
    const filename = `images-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}.pdf`;
    doc.save(filename);
    showProgress(false);
    toast(I18N[lang].done);
  }

  function reencode(dataUrl, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const cx = c.getContext('2d');
        cx.fillStyle = '#ffffff';
        cx.fillRect(0, 0, c.width, c.height);
        cx.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  $('btn-gen').addEventListener('click', generatePdf);

  // ===== i18n =====
  function applyLang() {
    const t = I18N[lang];
    document.title = t.title;
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent  = t.back;
    $('drop-hint').innerHTML   = t.dropHint + '<br><span style="font-size:.75rem;">' + t.dropSub + '</span>';
    $('btn-pick-lbl').textContent = t.btnPick;
    $('btn-cam-lbl').textContent  = t.btnCam;
    $('lbl-images').textContent   = t.images;
    $('lbl-page').textContent     = t.page;
    $('lbl-orient').textContent   = t.orient;
    $('lbl-margin').textContent   = t.margin;
    $('lbl-quality').textContent  = t.quality;
    $('opt-fit').textContent       = t.fit;
    $('opt-auto').textContent      = t.auto;
    $('opt-portrait').textContent  = t.portrait;
    $('opt-landscape').textContent = t.landscape;
    $('opt-low').textContent  = t.low;
    $('opt-med').textContent  = t.med;
    $('opt-high').textContent = t.high;
    $('btn-clear-lbl').textContent = t.clear;
    $('btn-gen-lbl').textContent   = t.gen;
    $('empty').textContent = t.empty;
    $('clear-cancel').textContent  = lang === 'lao' ? 'ຍົກເລີກ' : (lang === 'th' ? 'ยกเลิก' : 'Cancel');
    $('clear-confirm').textContent = t.clear;
  }
  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  applyLang();
  renderThumbs();
})();
