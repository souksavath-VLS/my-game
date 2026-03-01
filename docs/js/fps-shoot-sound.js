// Simple shooting sound (pop)
// You can replace this with a custom sound file if needed
export function playShootSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.value = 600;
  g.gain.value = 0.2;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
  o.stop(ctx.currentTime + 0.15);
}
