// Personal GPS Tracker — watchPosition + Leaflet map.
// Records walking/running trails, distance/duration/speed, saves to localStorage.
// All data stays on device — nothing is sent anywhere.

(() => {
  'use strict';

  const TRIPS_KEY = 'location_trips_v1';

  const I18N = {
    th: {
      title:'📍 ติดตาม GPS', back:'← หน้าหลัก',
      dist:'ระยะ', dur:'เวลา', spd:'ความเร็ว', avg:'เฉลี่ย',
      start:'เริ่ม', pause:'หยุดชั่วคราว', resume:'เล่นต่อ',
      stop:'หยุด', save:'บันทึก', discard:'ทิ้ง',
      trips:'ทริปที่บันทึก', close:'ปิด',
      saveTitle:'💾 บันทึกการเดินทาง', name:'ชื่อ',
      tripsTitle:'📋 ทริปที่บันทึก',
      gps:'GPS', gpsWait:'รอสัญญาณ...', gpsGood:'แม่นยำ', gpsPoor:'ปานกลาง', gpsBad:'อ่อน',
      rec:'กำลังบันทึก', recPaused:'หยุดชั่วคราว',
      emptyTrips:'ยังไม่มีทริปที่บันทึก',
      defaultName:'ทริปวันที่',
      view:'ดู', delete:'ลบ',
      summaryTitle:'สรุปการเดินทาง',
      summaryDist:'ระยะ', summaryDur:'เวลา', summaryAvg:'ความเร็วเฉลี่ย', summaryPts:'จำนวนจุด',
      errPermDenied:'ไม่อนุญาตให้ใช้ GPS — กรุณาเปิดสิทธิ์ใน Settings',
      errUnavailable:'ไม่สามารถหาตำแหน่งได้',
      errTimeout:'หมดเวลารอ GPS',
      errUnsupported:'อุปกรณ์ไม่รองรับ GPS',
      confirmDel:'ลบทริปนี้?',
      privacy:'ข้อมูลเก็บไว้ในเครื่องเท่านั้น ไม่ส่งออกที่ไหน'
    },
    en: {
      title:'📍 GPS Tracker', back:'← Home',
      dist:'Distance', dur:'Duration', spd:'Speed', avg:'Avg',
      start:'Start', pause:'Pause', resume:'Resume',
      stop:'Stop', save:'Save', discard:'Discard',
      trips:'Saved trips', close:'Close',
      saveTitle:'💾 Save trip', name:'Name',
      tripsTitle:'📋 Saved trips',
      gps:'GPS', gpsWait:'waiting…', gpsGood:'good', gpsPoor:'fair', gpsBad:'weak',
      rec:'Recording', recPaused:'Paused',
      emptyTrips:'No saved trips yet',
      defaultName:'Trip on',
      view:'View', delete:'Delete',
      summaryTitle:'Trip summary',
      summaryDist:'Distance', summaryDur:'Duration', summaryAvg:'Avg speed', summaryPts:'Points',
      errPermDenied:'Location permission denied — please enable in Settings',
      errUnavailable:'Cannot determine location',
      errTimeout:'GPS timeout',
      errUnsupported:'GPS not supported on this device',
      confirmDel:'Delete this trip?',
      privacy:'Data is kept on your device only — nothing is sent anywhere'
    },
    lao: {
      title:'📍 ຕິດຕາມ GPS', back:'← ໜ້າຫຼັກ',
      dist:'ໄລຍະ', dur:'ເວລາ', spd:'ໄວ', avg:'ສະເລ່ຍ',
      start:'ເລີ່ມ', pause:'ຢຸດຊົ່ວຄາວ', resume:'ສືບຕໍ່',
      stop:'ຢຸດ', save:'ບັນທຶກ', discard:'ຍົກເລີກ',
      trips:'ການເດີນທາງ', close:'ປິດ',
      saveTitle:'💾 ບັນທຶກການເດີນທາງ', name:'ຊື່',
      tripsTitle:'📋 ການເດີນທາງທີ່ບັນທຶກ',
      gps:'GPS', gpsWait:'ກຳລັງລໍຖ້າ...', gpsGood:'ແມ່ນຍຳ', gpsPoor:'ປານກາງ', gpsBad:'ອ່ອນ',
      rec:'ກຳລັງບັນທຶກ', recPaused:'ຢຸດຊົ່ວຄາວ',
      emptyTrips:'ຍັງບໍ່ມີການເດີນທາງທີ່ບັນທຶກ',
      defaultName:'ການເດີນທາງມື້ທີ',
      view:'ເບິ່ງ', delete:'ລົບ',
      summaryTitle:'ສະຫຼຸບການເດີນທາງ',
      summaryDist:'ໄລຍະ', summaryDur:'ເວລາ', summaryAvg:'ໄວສະເລ່ຍ', summaryPts:'ຈຳນວນຈຸດ',
      errPermDenied:'ບໍ່ອະນຸຍາດໃຫ້ໃຊ້ GPS — ກະລຸນາເປີດສິດໃນ Settings',
      errUnavailable:'ບໍ່ສາມາດຫາຕຳແໜ່ງໄດ້',
      errTimeout:'ໝົດເວລາລໍຖ້າ GPS',
      errUnsupported:'ອຸປະກອນບໍ່ຮອງຮັບ GPS',
      confirmDel:'ລົບການເດີນທາງນີ້?',
      privacy:'ຂໍ້ມູນຖືກເກັບໄວ້ໃນເຄື່ອງເທົ່ານັ້ນ ບໍ່ສົ່ງອອກໃສ່ບ່ອນໃດ'
    }
  };

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'lao';
  })();
  let mode = 'idle';     // 'idle' | 'tracking' | 'paused' | 'stopped'
  let watchId = null;
  let map = null;
  let tileLayer = null;
  let trailLayer = null;
  let startMarker = null;
  let currentMarker = null;
  let endMarker = null;
  let followMode = true;
  let lastFixAccuracy = null;

  // Current trip in-progress
  let trip = null;       // { startedAt, points, distance, pausedAt, pausedTotal, lastTs }
  let durationTimer = null;
  let viewingSavedTrip = false;

  const $ = id => document.getElementById(id);

  // ===== Helpers =====
  function toRad(d) { return d * Math.PI / 180; }
  function haversine(a, b) {
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function fmtDuration(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
  }
  function fmtDate(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function uid() { return Math.random().toString(36).slice(2, 10); }

  // ===== Saved trips =====
  function loadSavedTrips() {
    try {
      const s = JSON.parse(localStorage.getItem(TRIPS_KEY) || 'null');
      if (s && Array.isArray(s.trips)) return s.trips;
    } catch {}
    return [];
  }
  function saveTripsList(trips) {
    try { localStorage.setItem(TRIPS_KEY, JSON.stringify({ trips })); } catch {}
  }

  // ===== Map =====
  function initMap() {
    map = L.map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([0, 0], 2);
    L.control.attribution({ prefix: false }).addAttribution('© OpenStreetMap');
    tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    trailLayer = L.polyline([], { color: '#2563eb', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }).addTo(map);

    // Detect user-initiated pan to disable follow mode
    map.on('dragstart', () => {
      followMode = false;
      $('btn-follow').classList.remove('active');
    });
  }

  function setCurrentMarker(latlng) {
    const icon = L.divIcon({
      className: 'lt-current-marker',
      html: '<div class="dot"></div><div class="pulse"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    if (currentMarker) currentMarker.setLatLng(latlng);
    else currentMarker = L.marker(latlng, { icon, interactive: false }).addTo(map);
  }
  function setStartMarker(latlng) {
    if (startMarker) startMarker.setLatLng(latlng);
    else startMarker = L.marker(latlng, {
      icon: L.divIcon({ className: 'lt-flag-marker', html: '🚩', iconSize: [24, 24], iconAnchor: [4, 22] }),
      interactive: false
    }).addTo(map);
  }
  function setEndMarker(latlng) {
    if (endMarker) endMarker.setLatLng(latlng);
    else endMarker = L.marker(latlng, {
      icon: L.divIcon({ className: 'lt-flag-marker', html: '🏁', iconSize: [24, 24], iconAnchor: [4, 22] }),
      interactive: false
    }).addTo(map);
  }
  function clearMarkers() {
    if (startMarker)   { map.removeLayer(startMarker);   startMarker = null; }
    if (endMarker)     { map.removeLayer(endMarker);     endMarker = null; }
    trailLayer.setLatLngs([]);
  }

  // ===== Geolocation =====
  function startWatch() {
    if (!('geolocation' in navigator)) {
      showError(I18N[lang].errUnsupported);
      return false;
    }
    watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000
    });
    return true;
  }
  function stopWatch() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }
  function onPositionError(err) {
    const t = I18N[lang];
    let msg = t.errUnavailable;
    if (err.code === err.PERMISSION_DENIED)    msg = t.errPermDenied;
    else if (err.code === err.POSITION_UNAVAILABLE) msg = t.errUnavailable;
    else if (err.code === err.TIMEOUT)         msg = t.errTimeout;
    showError(msg);
    updateGpsIndicator('bad', t.errTimeout);
  }
  function onPosition(pos) {
    const { latitude: lat, longitude: lng, accuracy, speed, altitude } = pos.coords;
    const ts = pos.timestamp;
    lastFixAccuracy = accuracy;
    updateGpsIndicator(
      accuracy <= 15 ? 'good' : accuracy <= 35 ? 'poor' : 'bad',
      `${I18N[lang].gps} ±${Math.round(accuracy)}m`
    );
    const ll = { lat, lng };

    setCurrentMarker([lat, lng]);
    if (followMode) map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });

    if (mode !== 'tracking') return;

    // Filter noise: skip very inaccurate fixes
    if (accuracy > 60) return;

    if (!trip.points.length) {
      trip.points.push({ lat, lng, ts, acc: accuracy, alt: altitude, speed });
      trip.lastTs = ts;
      setStartMarker([lat, lng]);
      trailLayer.setLatLngs([[lat, lng]]);
      return;
    }
    const last = trip.points[trip.points.length - 1];
    const d = haversine(last, ll);
    // Skip if moved less than ~3m AND we already have several points (avoid GPS jitter at rest)
    if (d < 3 && accuracy > 10) return;
    trip.distance += d;
    trip.points.push({ lat, lng, ts, acc: accuracy, alt: altitude, speed });
    trip.lastTs = ts;
    trailLayer.addLatLng([lat, lng]);

    // Update speed from coords if available, otherwise calc from last pair
    let kmh = 0;
    if (typeof speed === 'number' && !isNaN(speed) && speed >= 0) {
      kmh = speed * 3.6;
    } else if (trip.points.length >= 2) {
      const prev = trip.points[trip.points.length - 2];
      const dt = (ts - prev.ts) / 1000;
      if (dt > 0) kmh = (d / dt) * 3.6;
    }
    trip.lastSpeedKmh = kmh;
    updateStats();
  }

  function updateGpsIndicator(quality, text) {
    const el = $('gps-ind');
    el.classList.remove('good', 'poor', 'bad', 'live');
    el.classList.add(quality);
    if (mode === 'tracking') el.classList.add('live');
    $('gps-text').textContent = text || I18N[lang].gps;
  }

  // ===== Stats =====
  function tripDurationMs() {
    if (!trip) return 0;
    if (mode === 'tracking') return Date.now() - trip.startedAt - trip.pausedTotal;
    if (mode === 'paused')   return trip.pausedAt - trip.startedAt - trip.pausedTotal;
    if (mode === 'stopped')  return trip.stoppedAt - trip.startedAt - trip.pausedTotal;
    return 0;
  }
  function updateStats() {
    if (!trip) {
      $('stat-dist').textContent = '0.00';
      $('stat-dur').textContent  = '00:00';
      $('stat-spd').textContent  = '0.0';
      $('stat-avg').textContent  = '0.0';
      return;
    }
    const distKm = trip.distance / 1000;
    const durMs  = tripDurationMs();
    const avg    = durMs > 0 ? (distKm / (durMs / 3600000)) : 0;
    $('stat-dist').textContent = distKm.toFixed(2);
    $('stat-dur').textContent  = fmtDuration(durMs);
    $('stat-spd').textContent  = (trip.lastSpeedKmh || 0).toFixed(1);
    $('stat-avg').textContent  = avg.toFixed(1);
  }
  function startDurationTimer() {
    stopDurationTimer();
    durationTimer = setInterval(() => {
      if (mode === 'tracking') updateStats();
    }, 1000);
  }
  function stopDurationTimer() {
    if (durationTimer) { clearInterval(durationTimer); durationTimer = null; }
  }

  // ===== Mode transitions =====
  function setMode(m) {
    mode = m;
    renderActions();
    renderRecBadge();
    updateGpsIndicator(
      lastFixAccuracy == null ? 'bad' : (lastFixAccuracy <= 15 ? 'good' : lastFixAccuracy <= 35 ? 'poor' : 'bad'),
      lastFixAccuracy == null ? I18N[lang].gpsWait : `${I18N[lang].gps} ±${Math.round(lastFixAccuracy)}m`
    );
  }

  function startTracking() {
    if (viewingSavedTrip) {
      // Clear the displayed saved trip first
      clearMarkers();
      viewingSavedTrip = false;
    }
    hideError();
    trip = {
      startedAt: Date.now(),
      points: [],
      distance: 0,
      pausedAt: null,
      pausedTotal: 0,
      stoppedAt: null,
      lastSpeedKmh: 0,
      lastTs: null
    };
    clearMarkers();
    if (!startWatch()) return;
    setMode('tracking');
    startDurationTimer();
    updateStats();
  }
  function pauseTracking() {
    if (mode !== 'tracking') return;
    trip.pausedAt = Date.now();
    setMode('paused');
    stopDurationTimer();
  }
  function resumeTracking() {
    if (mode !== 'paused') return;
    trip.pausedTotal += Date.now() - trip.pausedAt;
    trip.pausedAt = null;
    setMode('tracking');
    startDurationTimer();
  }
  function stopTracking() {
    if (mode !== 'tracking' && mode !== 'paused') return;
    if (mode === 'paused') trip.pausedTotal += Date.now() - trip.pausedAt;
    trip.stoppedAt = Date.now();
    stopWatch();
    stopDurationTimer();
    if (trip.points.length) {
      const last = trip.points[trip.points.length - 1];
      setEndMarker([last.lat, last.lng]);
    }
    setMode('stopped');
    fitTrail();
  }
  function discardTrip() {
    trip = null;
    clearMarkers();
    stopWatch();
    stopDurationTimer();
    setMode('idle');
    updateStats();
  }

  function fitTrail() {
    if (!trip || trip.points.length < 2) return;
    const bounds = L.latLngBounds(trip.points.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }

  // ===== Render actions =====
  function renderActions() {
    const t = I18N[lang];
    const el = $('actions');
    el.innerHTML = '';

    const tripsBtn = document.createElement('button');
    tripsBtn.className = 'lt-btn trips';
    tripsBtn.title = t.trips;
    tripsBtn.textContent = '📋';
    tripsBtn.addEventListener('click', openTrips);

    if (mode === 'idle') {
      const start = document.createElement('button');
      start.className = 'lt-btn start';
      start.innerHTML = `▶ ${t.start}`;
      start.addEventListener('click', startTracking);
      el.appendChild(start);
      el.appendChild(tripsBtn);
    } else if (mode === 'tracking') {
      const pause = document.createElement('button');
      pause.className = 'lt-btn pause';
      pause.innerHTML = `⏸ ${t.pause}`;
      pause.addEventListener('click', pauseTracking);
      const stop = document.createElement('button');
      stop.className = 'lt-btn stop';
      stop.innerHTML = `⏹ ${t.stop}`;
      stop.addEventListener('click', stopTracking);
      el.appendChild(pause);
      el.appendChild(stop);
    } else if (mode === 'paused') {
      const resume = document.createElement('button');
      resume.className = 'lt-btn resume';
      resume.innerHTML = `▶ ${t.resume}`;
      resume.addEventListener('click', resumeTracking);
      const stop = document.createElement('button');
      stop.className = 'lt-btn stop';
      stop.innerHTML = `⏹ ${t.stop}`;
      stop.addEventListener('click', stopTracking);
      el.appendChild(resume);
      el.appendChild(stop);
    } else if (mode === 'stopped') {
      const save = document.createElement('button');
      save.className = 'lt-btn save';
      save.innerHTML = `💾 ${t.save}`;
      save.disabled = !trip || trip.points.length < 2;
      save.addEventListener('click', openSaveModal);
      const discard = document.createElement('button');
      discard.className = 'lt-btn discard';
      discard.innerHTML = `🗑 ${t.discard}`;
      discard.addEventListener('click', discardTrip);
      el.appendChild(save);
      el.appendChild(discard);
    }
  }

  function renderRecBadge() {
    const el = $('rec-badge');
    el.classList.remove('show', 'paused');
    const t = I18N[lang];
    if (mode === 'tracking') {
      el.classList.add('show');
      $('rec-text').textContent = t.rec;
    } else if (mode === 'paused') {
      el.classList.add('show', 'paused');
      $('rec-text').textContent = t.recPaused;
    }
  }

  // ===== Save modal =====
  function openSaveModal() {
    const t = I18N[lang];
    const distKm = (trip.distance / 1000).toFixed(2);
    const durMs = tripDurationMs();
    const avg = durMs > 0 ? (trip.distance / 1000) / (durMs / 3600000) : 0;
    $('save-title').textContent = t.saveTitle;
    $('save-name-lbl').textContent = t.name;
    $('save-cancel').textContent = t.discard;
    $('save-confirm').textContent = t.save;
    $('save-summary').innerHTML = `
      <div class="lt-summary-title">${t.summaryTitle}</div>
      <div class="lt-summary-stats">
        <div class="lt-summary-stat">${t.summaryDist}: <b>${distKm} km</b></div>
        <div class="lt-summary-stat">${t.summaryDur}: <b>${fmtDuration(durMs)}</b></div>
        <div class="lt-summary-stat">${t.summaryAvg}: <b>${avg.toFixed(1)} km/h</b></div>
        <div class="lt-summary-stat">${t.summaryPts}: <b>${trip.points.length}</b></div>
      </div>
    `;
    const now = new Date();
    $('save-name').value = `${t.defaultName} ${fmtDate(now)}`;
    $('modal-save').classList.add('show');
    setTimeout(() => $('save-name').focus(), 50);
  }
  $('save-cancel').addEventListener('click', () => $('modal-save').classList.remove('show'));
  $('save-confirm').addEventListener('click', () => {
    const name = $('save-name').value.trim() || I18N[lang].defaultName;
    const durMs = tripDurationMs();
    const distKm = trip.distance / 1000;
    const avg = durMs > 0 ? distKm / (durMs / 3600000) : 0;
    const trips = loadSavedTrips();
    trips.unshift({
      id: uid(),
      name,
      savedAt: Date.now(),
      points: trip.points.map(p => ({ lat: p.lat, lng: p.lng, ts: p.ts })),
      stats: { distance: trip.distance, duration: durMs, avgSpeed: avg }
    });
    saveTripsList(trips);
    $('modal-save').classList.remove('show');
    discardTrip();
  });

  // ===== Trips modal =====
  function openTrips() {
    const t = I18N[lang];
    $('trips-title').textContent = t.tripsTitle;
    $('trips-close').textContent = t.close;
    const list = $('trips-list');
    const trips = loadSavedTrips();
    list.innerHTML = '';
    if (!trips.length) {
      const empty = document.createElement('div');
      empty.className = 'lt-empty';
      empty.textContent = t.emptyTrips;
      list.appendChild(empty);
    }
    for (const tr of trips) {
      const item = document.createElement('div');
      item.className = 'lt-trip';
      const distKm = (tr.stats.distance / 1000).toFixed(2);
      const dur = fmtDuration(tr.stats.duration);
      const date = fmtDate(new Date(tr.savedAt));
      item.innerHTML = `
        <div class="lt-trip-body">
          <div class="lt-trip-name">${escapeHtml(tr.name)}</div>
          <div class="lt-trip-meta">${date} · ${distKm} km · ${dur}</div>
        </div>
        <div class="lt-trip-actions">
          <button class="lt-trip-btn view" title="${t.view}">👁️</button>
          <button class="lt-trip-btn del"  title="${t.delete}">🗑️</button>
        </div>
      `;
      item.querySelector('.view').addEventListener('click', () => {
        $('modal-trips').classList.remove('show');
        showSavedTrip(tr);
      });
      item.querySelector('.del').addEventListener('click', () => {
        if (confirm(t.confirmDel)) {
          const remaining = trips.filter(x => x.id !== tr.id);
          saveTripsList(remaining);
          openTrips();
        }
      });
      list.appendChild(item);
    }
    $('modal-trips').classList.add('show');
  }
  $('trips-close').addEventListener('click', () => $('modal-trips').classList.remove('show'));
  $('modal-trips').addEventListener('click', (e) => {
    if (e.target.id === 'modal-trips') $('modal-trips').classList.remove('show');
  });
  $('modal-save').addEventListener('click', (e) => {
    if (e.target.id === 'modal-save') $('modal-save').classList.remove('show');
  });

  function showSavedTrip(tr) {
    if (mode === 'tracking' || mode === 'paused') {
      // Don't interrupt a live recording
      return;
    }
    viewingSavedTrip = true;
    clearMarkers();
    const latlngs = tr.points.map(p => [p.lat, p.lng]);
    trailLayer.setLatLngs(latlngs);
    if (latlngs.length) {
      setStartMarker(latlngs[0]);
      setEndMarker(latlngs[latlngs.length - 1]);
      map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
    }
    // Show summary in stats area
    const distKm = (tr.stats.distance / 1000).toFixed(2);
    $('stat-dist').textContent = distKm;
    $('stat-dur').textContent  = fmtDuration(tr.stats.duration);
    $('stat-spd').textContent  = '—';
    $('stat-avg').textContent  = tr.stats.avgSpeed.toFixed(1);
    // Reset state so Start can be pressed
    trip = null;
    mode = 'idle';
    renderActions();
    renderRecBadge();
  }

  // ===== Map overlay buttons =====
  $('btn-follow').addEventListener('click', () => {
    followMode = !followMode;
    $('btn-follow').classList.toggle('active', followMode);
    if (followMode && currentMarker) {
      map.setView(currentMarker.getLatLng(), Math.max(map.getZoom(), 16), { animate: true });
    }
  });
  $('btn-fit').addEventListener('click', () => {
    if (viewingSavedTrip) {
      const ll = trailLayer.getLatLngs();
      if (ll.length) map.fitBounds(L.latLngBounds(ll), { padding: [30, 30] });
    } else if (trip && trip.points.length >= 2) {
      fitTrail();
    } else if (currentMarker) {
      map.setView(currentMarker.getLatLng(), 16);
    }
  });

  // ===== Error UI =====
  function showError(msg) {
    const el = $('error-banner');
    el.textContent = '⚠ ' + msg;
    el.classList.add('show');
  }
  function hideError() {
    $('error-banner').classList.remove('show');
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ===== Language =====
  function applyLang() {
    const t = I18N[lang];
    document.title = t.title;
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent  = t.back;
    $('lbl-dist').textContent = t.dist;
    $('lbl-dur').textContent  = t.dur;
    $('lbl-spd').textContent  = t.spd;
    $('lbl-avg').textContent  = t.avg;
    $('gps-text').textContent = t.gpsWait;
    renderActions();
    renderRecBadge();
  }
  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') { lang = v; applyLang(); }
    }
  });

  // ===== Init =====
  if (typeof L === 'undefined') {
    showError('Leaflet failed to load');
    return;
  }
  initMap();
  applyLang();
  updateStats();

  // Try to get initial position to center map
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        lastFixAccuracy = accuracy;
        map.setView([latitude, longitude], 16);
        setCurrentMarker([latitude, longitude]);
        updateGpsIndicator(
          accuracy <= 15 ? 'good' : accuracy <= 35 ? 'poor' : 'bad',
          `${I18N[lang].gps} ±${Math.round(accuracy)}m`
        );
      },
      (err) => {
        // Silent — user hasn't started tracking yet; we'll surface errors on Start
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 }
    );
  }
})();
