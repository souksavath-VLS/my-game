// script.js - หน้าเลือกเกมและระบบพื้นฐาน

document.addEventListener('DOMContentLoaded', () => {
  // ตัวอย่าง: ไปหน้าเกม
  document.getElementById('btn-memory').onclick = () => {
    window.location.href = 'kids-game.html';
  };
  // เพิ่มเกมอื่นๆ ได้ที่นี่
  document.getElementById('btn-color').onclick = () => {
    alert('เร็วๆ นี้!');
  };
  document.getElementById('btn-sound').onclick = () => {
    alert('เร็วๆ นี้!');
  };
  document.getElementById('stats-link').onclick = () => {
    window.location.href = 'stats.html';
  };
});
