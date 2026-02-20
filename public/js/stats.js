
// --- ฟังก์ชันแสดงสถิติแต่ละเกม ---
function showStats(game) {
  document.getElementById('game-menu').style.display = 'none';
  document.getElementById('stats-summary').style.display = 'flex';
  document.getElementById('backToMenuBtn').style.display = '';
  let html = '';
  document.getElementById('chart-container').style.display = 'none';
  if (game === 'memory') {
    let allStats = JSON.parse(localStorage.getItem('kidsGameStatsAll') || '{}');
    if (typeof allStats !== 'object' || allStats === null) allStats = {};
    const memoryStats = Array.isArray(allStats['memory']) ? allStats['memory'] : [];
    if (memoryStats.length) {
      const maxLevel = Math.max(...memoryStats.map(s => s.level || 1));
      const totalPlay = memoryStats.length;
      const bestTime = Math.min(...memoryStats.map(s => s.time));
      const lastReward = memoryStats[memoryStats.length-1].reward;
      html += `<div style='margin-bottom:2.5rem;'>
        <b>เกม:</b> เกมจับคู่ภาพ<br>
        <b>จำนวนครั้งที่เล่น:</b> ${totalPlay}<br>
        <b>เวลาที่ดีที่สุด:</b> ${bestTime === Infinity ? '-' : bestTime + ' วินาที'}<br>
        <b>รางวัลล่าสุด:</b> ${lastReward}<br>
        <b>ระดับสูงสุดที่เล่นถึง:</b> ${maxLevel}<br>
        <details style='margin-top:0.5rem;'>
          <summary>ดูรายละเอียดแต่ละรอบ</summary>
          <ul style='text-align:left;font-size:1rem;'>
            ${memoryStats.map((s,i) => `<li>ครั้งที่ ${i+1}: ระดับ ${s.level} | ${s.time} วินาที | ${s.reward} | ${new Date(s.date).toLocaleString('th-TH')}</li>`).join('')}
          </ul>
        </details>
      </div>`;
      // กราฟ (เฉพาะ memory)
      setTimeout(() => {
        document.getElementById('chart-container').style.display = '';
        const ctx = document.getElementById('statsChart').getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: memoryStats.map((s,i) => `ครั้งที่ ${i+1}`),
            datasets: [{
              label: 'เวลาที่ใช้ (วินาที)',
              data: memoryStats.map(s => s.time),
              borderColor: '#4caf50',
              backgroundColor: 'rgba(76,175,80,0.1)',
              tension: 0.3
            }]
          },
          options: {
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
          }
        });
      }, 100);
    } else {
      html = '<div>ยังไม่มีข้อมูลสถิติสำหรับเกมนี้</div>';
    }
  } else if (game === 'color') {
    const colorStats = JSON.parse(localStorage.getItem('colorGameStats') || '[]');
    if (Array.isArray(colorStats) && colorStats.length) {
      const totalPlay = colorStats.length;
      const bestTime = Math.min(...colorStats.map(s => s.time));
      html += `<div style='margin-bottom:2.5rem;'>
        <b>เกม:</b> เกมเลือกสี<br>
        <b>จำนวนครั้งที่เล่น:</b> ${totalPlay}<br>
        <b>เวลาที่ดีที่สุด:</b> ${bestTime === Infinity ? '-' : bestTime + ' วินาที'}<br>
        <details style='margin-top:0.5rem;'>
          <summary>ดูรายละเอียดแต่ละรอบ</summary>
          <ul style='text-align:left;font-size:1rem;'>
            ${colorStats.map((s,i) => `<li>ครั้งที่ ${i+1}: ${s.time} วินาที | ${new Date(s.date).toLocaleString('th-TH')}</li>`).join('')}
          </ul>
        </details>
      </div>`;
    } else {
      html = '<div>ยังไม่มีข้อมูลสถิติสำหรับเกมนี้</div>';
    }
  } else if (game === 'fruit') {
    const fruitStats = JSON.parse(localStorage.getItem('fruitGameStats') || '[]');
    if (Array.isArray(fruitStats) && fruitStats.length) {
      const totalPlay = fruitStats.length;
      const bestScore = Math.max(...fruitStats.map(s => s.score));
      const bestTime = Math.min(...fruitStats.map(s => s.time || Infinity));
      html += `<div style='margin-bottom:2.5rem;'>
        <b>เกม:</b> เกมนับจำนวนผลไม้<br>
        <b>จำนวนครั้งที่เล่น:</b> ${totalPlay}<br>
        <b>คะแนนสูงสุด:</b> ${bestScore}<br>
        <b>เวลาที่ดีที่สุด:</b> ${bestTime === Infinity ? '-' : bestTime + ' วินาที'}<br>
        <details style='margin-top:0.5rem;'>
          <summary>ดูรายละเอียดแต่ละรอบ</summary>
          <ul style='text-align:left;font-size:1rem;'>
            ${fruitStats.map((s,i) => `<li>ครั้งที่ ${i+1}: ${s.score} คะแนน | ${s.time ? s.time + ' วินาที' : '-'} | ระดับ ${s.level || 1} | ${new Date(s.date).toLocaleString('th-TH')}</li>`).join('')}
          </ul>
        </details>
      </div>`;
    } else {
      html = '<div>ยังไม่มีข้อมูลสถิติสำหรับเกมนี้</div>';
    }
  } else if (game === 'sound') {
    const soundStats = JSON.parse(localStorage.getItem('soundGameStats') || '[]');
    if (Array.isArray(soundStats) && soundStats.length) {
      const totalPlay = soundStats.length;
      const bestTime = Math.min(...soundStats.map(s => s.time));
      html += `<div style='margin-bottom:2.5rem;'>
        <b>เกม:</b> เกมฟังเสียง<br>
        <b>จำนวนครั้งที่เล่น:</b> ${totalPlay}<br>
        <b>เวลาที่ดีที่สุด:</b> ${bestTime === Infinity ? '-' : bestTime + ' วินาที'}<br>
        <details style='margin-top:0.5rem;'>
          <summary>ดูรายละเอียดแต่ละรอบ</summary>
          <ul style='text-align:left;font-size:1rem;'>
            ${soundStats.map((s,i) => `<li>ครั้งที่ ${i+1}: ${s.time} วินาที | ${new Date(s.date).toLocaleString('th-TH')}</li>`).join('')}
          </ul>
        </details>
      </div>`;
    } else {
      html = '<div>ยังไม่มีข้อมูลสถิติสำหรับเกมนี้</div>';
    }
  } else if (game === 'drawnumber') {
    const numberStats = JSON.parse(localStorage.getItem('drawNumberGameStats') || '[]');
    if (Array.isArray(numberStats) && numberStats.length) {
      const totalPlay = numberStats.length;
      const bestTime = Math.min(...numberStats.map(s => s.time || Infinity));
      html += `<div style='margin-bottom:2.5rem;'>
        <b>เกม:</b> เกมลากเส้นตัวเลข 1-10<br>
        <b>จำนวนครั้งที่เล่น:</b> ${totalPlay}<br>
        <b>เวลาที่ดีที่สุด:</b> ${bestTime === Infinity ? '-' : bestTime + ' วินาที'}<br>
        <details style='margin-top:0.5rem;'>
          <summary>ดูรายละเอียดแต่ละรอบ</summary>
          <ul style='text-align:left;font-size:1rem;'>
            ${numberStats.map((s,i) => `<li>ครั้งที่ ${i+1}: ${s.time ? s.time + ' วินาที' : '-'} | ${new Date(s.date).toLocaleString('th-TH')}</li>`).join('')}
          </ul>
        </details>
      </div>`;

    } else {
      html = '<div>ยังไม่มีข้อมูลสถิติสำหรับเกมนี้</div>';
    }
  }
  document.getElementById('stats-summary').innerHTML = html;
}

function backToMenu() {
  document.getElementById('game-menu').style.display = '';
  document.getElementById('stats-summary').style.display = 'none';
  document.getElementById('backToMenuBtn').style.display = 'none';
  document.getElementById('chart-container').style.display = 'none';
  document.getElementById('stats-summary').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
  backToMenu();
});
