
// --- Match Flag Game with timer ---
let matchFlagStartTime = null;
let matchFlagTimerInterval = null;

function shuffle(arr) {
	return arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
}

function pickRandomCountries(n) {
	return shuffle(window.COUNTRIES).slice(0, n);
}

function renderMatchFlagGame() {
	const N = 5;
	const countries = pickRandomCountries(N);
	matchFlagStartTime = Date.now();
	clearInterval(matchFlagTimerInterval);
	updateTimer();
	matchFlagTimerInterval = setInterval(updateTimer, 200);

	const board = document.getElementById('match-flag-board');
	const flagRow = document.getElementById('flag-row');
	const nameRow = document.getElementById('name-row');
	flagRow.innerHTML = '';
	nameRow.innerHTML = '';

	countries.forEach((c, i) => {
		const flagBox = document.createElement('div');
		flagBox.className = 'flag-box';
		flagBox.style.width = '90px';
		flagBox.style.height = '70px';
		flagBox.style.border = '2px solid #1976d2';
		flagBox.style.borderRadius = '8px';
		flagBox.style.background = '#fff';
		flagBox.style.display = 'flex';
		flagBox.style.alignItems = 'center';
		flagBox.style.justifyContent = 'center';
		flagBox.style.transition = 'background 0.3s';
		flagBox.style.position = 'relative';
		flagBox.style.marginBottom = '8px';
		flagBox.dataset.name = c.name_en;
		flagBox.ondragover = e => e.preventDefault();
		flagBox.ondrop = function(e) {
			e.preventDefault();
			const dragged = e.dataTransfer.getData('text/plain');
			const draggedElem = document.getElementById('name-' + dragged);
			if (dragged === c.name_en) {
				flagBox.style.background = '#c8e6c9';
				flagBox.classList.add('matched');
				// ย้ายปุ่มชื่อไปข้างล่างธง (ใน name-row)
				draggedElem.style.order = i;
				nameRow.appendChild(draggedElem);
				checkWin();
			} else {
				flagBox.style.background = '#ffcdd2';
				setTimeout(() => { if (!flagBox.classList.contains('matched')) flagBox.style.background = '#fff'; }, 700);
			}
		};
		const flagImg = document.createElement('img');
		flagImg.src = c.flag;
		flagImg.alt = c.name_en;
		flagImg.style.width = '70px';
		flagImg.style.height = '48px';
		flagImg.style.objectFit = 'contain';
		flagBox.appendChild(flagImg);
		flagRow.appendChild(flagBox);
	});

	const shuffled = countries.slice().sort(() => Math.random() - 0.5);
	shuffled.forEach((c, i) => {
		const nameBtn = document.createElement('button');
		nameBtn.id = 'name-' + c.name_en;
		nameBtn.textContent = c.name_th;
		nameBtn.draggable = true;
		nameBtn.style.padding = '8px 12px';
		nameBtn.style.fontSize = '16px';
		nameBtn.style.borderRadius = '8px';
		nameBtn.style.border = '2px solid #1976d2';
		nameBtn.style.background = '#fff';
		nameBtn.style.cursor = 'grab';
		nameBtn.ondragstart = function(e) {
			e.dataTransfer.setData('text/plain', c.name_en);
		};
		nameRow.appendChild(nameBtn);
	});

	function checkWin() {
		const allFlags = Array.from(flagRow.children);
		const allMatched = allFlags.every(flagBox => flagBox.classList.contains('matched'));
		if (allMatched) {
			document.getElementById('result').textContent = 'ถูกต้องทั้งหมด! 🎉';
			clearInterval(matchFlagTimerInterval);
			matchFlagTimerInterval = null;
			document.getElementById('timer').style.color = '#388e3c';
		}
	}
	document.getElementById('result').textContent = '';
	document.getElementById('timer').style.color = '#1976d2';
}

function updateTimer() {
	if (!matchFlagStartTime) return;
	const timerDiv = document.getElementById('timer');
	if (!timerDiv) return;
	const ms = Date.now() - matchFlagStartTime;
	const sec = Math.floor(ms / 1000);
	const min = Math.floor(sec / 60);
	const s = sec % 60;
	timerDiv.textContent = `เวลา: ${min > 0 ? min + ':' : ''}${s.toString().padStart(2, '0')} วินาที`;
}



document.addEventListener('DOMContentLoaded', () => {
	renderMatchFlagGame();
	document.getElementById('nextBtn').onclick = renderMatchFlagGame;
	document.getElementById('backBtn').onclick = () => { window.location.href = 'index.html'; };
});
