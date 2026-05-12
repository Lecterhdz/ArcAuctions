// js/theme.js
export function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // Actualiza también los elementos que usan variables CSS
  document.documentElement.style.setProperty('--bg', theme === 'jarvis' ? '#E8E9F3' : '#0A0E17');
  document.documentElement.style.setProperty('--card-bg', theme === 'jarvis' ? '#FFFFFF' : '#1A1E2F');
  document.documentElement.style.setProperty('--accent', theme === 'jarvis' ? '#0057B3' : '#E63946');
}

export function initTheme() {
  const saved = localStorage.getItem('theme') || 'jarvis';
  setTheme(saved);
}

export function toggleTheme() {
  const current = document.body.getAttribute('data-theme') || 'jarvis';
  const newTheme = current === 'jarvis' ? 'ultron' : 'jarvis';
  setTheme(newTheme);
  return newTheme;
}
