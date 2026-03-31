// /js/pages/vocab/browse.js
// Vocabulary browse page — handles search, chip clicks, API calls, and card rendering.

const searchInput = document.getElementById('vocab-search');
const searchBtn   = document.getElementById('search-btn');
const vocabArea   = document.getElementById('vocab-area');
const resultHeader = document.getElementById('result-header');
const resultQuery  = document.getElementById('result-query');
const resultCount  = document.getElementById('result-count');

// ── Chip clicks ──────────────────────────────────────────────────────────────
document.getElementById('suggestion-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  searchInput.value = chip.dataset.word;
  runSearch(chip.dataset.word);
});

// ── Search triggers ──────────────────────────────────────────────────────────
searchBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if (q) runSearch(q);
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const q = searchInput.value.trim();
    if (q) runSearch(q);
  }
});

// ── Main search function ─────────────────────────────────────────────────────
async function runSearch(word) {
  showSkeleton();

  try {
    const res  = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    const data = await res.json();

    if (!res.ok || !Array.isArray(data)) {
      showNoResult(word);
      return;
    }

    renderResults(word, data);
  } catch {
    showError();
  }
}

// ── Skeleton loader ──────────────────────────────────────────────────────────
function showSkeleton() {
  resultHeader.style.display = 'none';
  vocabArea.innerHTML = `
    <div class="skeleton-grid">
      ${Array.from({ length: 6 }, () => `
        <div class="skeleton-card">
          <div class="sk-line sk-line--short"></div>
          <div class="sk-line sk-line--med"></div>
          <div class="sk-line sk-line--full"></div>
          <div class="sk-line sk-line--full"></div>
        </div>`).join('')}
    </div>`;
}

// ── Render results ───────────────────────────────────────────────────────────
function renderResults(word, entries) {
  // Flatten all meanings across all entries into individual cards
  const cards = [];

  for (const entry of entries) {
    const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';
    const audioUrl = entry.phonetics?.find(p => p.audio)?.audio || '';

    for (const meaning of entry.meanings) {
      const pos = meaning.partOfSpeech;
      const defs = meaning.definitions;

      cards.push({ word: entry.word, phonetic, audioUrl, pos, defs });
    }
  }

  // Show result header
  resultQuery.innerHTML = `Results for <span>${word}</span>`;
  resultCount.textContent = `${cards.length} meaning${cards.length !== 1 ? 's' : ''}`;
  resultHeader.style.display = 'flex';

  vocabArea.innerHTML = `<div class="vocab-grid">${cards.map(buildCard).join('')}</div>`;

  // Wire audio buttons
  vocabArea.querySelectorAll('.audio-btn[data-audio]').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.audio;
      if (url) new Audio(url).play();
    });
  });

  // Wire meaning toggles
  vocabArea.querySelectorAll('.meanings-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const extra = toggle.nextElementSibling;
      extra.classList.toggle('open');
      toggle.textContent = extra.classList.contains('open')
        ? '▲ Show less'
        : `▼ +${extra.dataset.count} more`;
    });
  });
}

// ── Build a single vocab card ────────────────────────────────────────────────
function buildCard({ word, phonetic, audioUrl, pos, defs }) {
  const primary   = defs[0];
  const extras    = defs.slice(1);
  const audioAttr = audioUrl ? `data-audio="${audioUrl}"` : '';

  const extraHtml = extras.length
    ? `<span class="meanings-toggle">▼ +${extras.length} more</span>
       <div class="meanings-extra" data-count="${extras.length}">
         ${extras.map(d => `
           <div class="vocab-card__def" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-light)">
             ${d.definition}
             ${d.example ? `<div class="vocab-card__eg">${d.example}</div>` : ''}
           </div>`).join('')}
       </div>`
    : '';

  return `
    <div class="vocab-card">
      <div class="vocab-card__head">
        <div>
          <div class="vocab-card__word">${word}</div>
          ${phonetic ? `<div class="vocab-card__phonetic">${phonetic}</div>` : ''}
        </div>
        <span class="vocab-card__pos">${pos}</span>
      </div>

      <div class="vocab-card__def">${primary.definition}</div>
      ${primary.example ? `<div class="vocab-card__eg">${primary.example}</div>` : ''}

      ${extraHtml}

      <div class="vocab-card__foot">
        ${audioUrl ? `<button class="audio-btn" ${audioAttr} title="Play pronunciation">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
        </button>` : ''}
      </div>
    </div>`;
}

// ── Empty / error states ─────────────────────────────────────────────────────
function showNoResult(word) {
  resultHeader.style.display = 'none';
  vocabArea.innerHTML = `
    <div class="vocab-grid">
      <div class="state-box">
        <div class="state-box__icon">🔍</div>
        <h3>No results for "${word}"</h3>
        <p>Try checking the spelling, or search for a different word.</p>
      </div>
    </div>`;
}

function showError() {
  resultHeader.style.display = 'none';
  vocabArea.innerHTML = `
    <div class="vocab-grid">
      <div class="state-box">
        <div class="state-box__icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p>Could not reach the dictionary API. Please try again.</p>
      </div>
    </div>`;
}