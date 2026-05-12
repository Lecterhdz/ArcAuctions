export function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

export function initTheme() {
  const saved = localStorage.getItem('theme') || 'jarvis';
  setTheme(saved);
}
