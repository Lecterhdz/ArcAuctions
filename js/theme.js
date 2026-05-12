// js/theme.js
export function setTheme(theme) {
  // Remover ambas clases primero
  document.body.classList.remove('theme-jarvis', 'theme-ultron');
  // Agregar la clase correspondiente
  document.body.classList.add(`theme-${theme}`);
  // Guardar en localStorage
  localStorage.setItem('arcauctions-theme', theme);
  console.log('🎨 Tema aplicado:', theme);
}

export function initTheme() {
  const saved = localStorage.getItem('arcauctions-theme') || 'jarvis';
  setTheme(saved);
}

export function toggleTheme() {
  const current = document.body.classList.contains('theme-jarvis') ? 'jarvis' : 'ultron';
  const newTheme = current === 'jarvis' ? 'ultron' : 'jarvis';
  setTheme(newTheme);
  return newTheme;
}

export function getCurrentTheme() {
  return document.body.classList.contains('theme-jarvis') ? 'jarvis' : 'ultron';
}
