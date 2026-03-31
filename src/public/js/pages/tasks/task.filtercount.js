/* task.filtercount.js
   Active filter highlight + live task count watcher.
   Extracted from list.html inline script.
   Load as regular <script> before list.js module. */

(function () {
  /* Active filter pill highlight */
  document.querySelectorAll('.filter-pill-wrap').forEach(wrap => {
    const sel = wrap.querySelector('select');
    if (!sel) return;
    const update = () => wrap.classList.toggle('is-active', !!sel.value);
    sel.addEventListener('change', update);
    update();
  });

  /* Live task count — watches DOM for card changes */
  const countEl = document.getElementById('tasks-count');
  const gridEl  = document.getElementById('tasks-list');
  if (countEl && gridEl) {
    const refresh = () => {
      const cards = gridEl.querySelectorAll('.task-card');
      countEl.innerHTML = cards.length
        ? `<strong>${cards.length}</strong> task${cards.length !== 1 ? 's' : ''}`
        : '';
    };
    new MutationObserver(refresh).observe(gridEl, { childList: true, subtree: false });
  }
})();