/* theme.js — drop into /public/js/theme.js and load it in every page <head>
   Reads/writes localStorage('theme') = 'dark' | 'light' | null (OS default)
   Apply [data-theme] to <html> BEFORE paint to prevent flash of wrong theme. */

(function () {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') {
    document.documentElement.setAttribute('data-theme', stored);
  }
  // If nothing stored, leave <html> with no data-theme → OS preference wins.
})();

/* Call this after DOM is ready to wire up your toggle button */
function initThemeToggle(btnSelector = '.theme-toggle') {
  const btn = document.querySelector(btnSelector);
  if (!btn) return;

  function getEffective() {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function updateIcon() {
    const isDark = getEffective() === 'dark';
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('aria-label', btn.getAttribute('title'));
  }

  btn.addEventListener('click', () => {
    const current = getEffective();
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
    updateIcon();
  });

  // Sync if OS preference changes while page is open (and no manual override)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!localStorage.getItem('theme')) updateIcon();
  });

  updateIcon();
}

// Auto-init if DOM is already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initThemeToggle());
} else {
  initThemeToggle();
}