export function confetti() {
  const css = getComputedStyle(document.documentElement);
  const colors = [css.getPropertyValue('--a'), css.getPropertyValue('--b'), css.getPropertyValue('--c'), '#ffffff', '#ffd166'];
  for (let i = 0; i < 60; i++) {
    const d = document.createElement('div');
    d.className = 'cf';
    d.style.left = Math.random() * 100 + 'vw';
    d.style.background = colors[i % 5];
    d.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
    d.style.animationDelay = Math.random() * 0.4 + 's';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3800);
  }
}
