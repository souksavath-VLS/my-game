// เสียงตัวอย่าง (ควรแทนที่ด้วยไฟล์จริง)
// clear1.wav, clear2.wav, clear3.wav, rotate.wav, drop.wav, move.wav, gameover.wav, danger.wav, bgm.wav
// วางไฟล์ไว้ที่ public/assets/sound/tetris/

const tetrisSounds = {
  clear1: new Audio('assets/sound/tetris/clear1.wav'),
  clear2: new Audio('assets/sound/tetris/clear2.wav'),
  clear3: new Audio('assets/sound/tetris/clear3.wav'),
  rotate: new Audio('assets/sound/tetris/rotate.wav'),
  drop: new Audio('assets/sound/tetris/drop.wav'),
  move: new Audio('assets/sound/tetris/move.wav'),
  gameover: new Audio('assets/sound/tetris/gameover.wav'),
  danger: new Audio('assets/sound/tetris/danger.wav'),
  bgm: new Audio('assets/sound/tetris/bgm.wav'),
};
tetrisSounds.bgm.loop = true;

function playTetrisSound(name) {
  if(tetrisSounds[name]) {
    tetrisSounds[name].currentTime = 0;
    tetrisSounds[name].play();
  }
}
