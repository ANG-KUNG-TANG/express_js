/**
 * vocab/browse.js — word search using the dictionary API
 * Matches browse.html: search bar, suggestion chips, result grid.
 */

import { requireAuth } from '../../core/router.js';
import { initNavbar }  from '../../../components/navbar.js';
import { vocabCard }   from '../../../components/vocabCard.js';
import { toast } from "../../core/toast.js";


requireAuth();
initNavbar();

// ── DOM refs ────────────────────────────────────────────────────────────────
const searchInput   = document.getElementById('vocab-search');
const searchBtn     = document.getElementById('search-btn');
const chipsEl       = document.getElementById('suggestion-chips');
const vocabAreaEl   = document.getElementById('vocab-area');
const resultHeader  = document.getElementById('result-header');
const resultQuery   = document.getElementById('result-query');
const resultCount   = document.getElementById('result-count');

// ── Skeleton loader ──────────────────────────────────────────────────────────
const skeletonHTML = () => `
  <div class="skeleton-grid">
    ${Array.from({ length: 6 }, () => `
      <div class="skeleton-card">
        <div class="sk-line sk-line--short"></div>
        <div class="sk-line sk-line--med"></div>
        <div class="sk-line sk-line--full"></div>
        <div class="sk-line sk-line--full"></div>
      </div>
    `).join('')}
  </div>`;

// ── Empty / error states ─────────────────────────────────────────────────────
const stateBox = (icon, title, body) => `
  <div class="vocab-grid">
    <div class="state-box">
      <div class="state-box__icon">${icon}</div>
      <h3>${title}</h3>
      <p>${body}</p>
    </div>
  </div>`;

// ── Search ───────────────────────────────────────────────────────────────────
const search = async (word) => {
    word = word.trim();
    if (!word) return;

    searchInput.value = word;
    vocabAreaEl.innerHTML = skeletonHTML();
    resultHeader.style.display = 'none';

    try {
        // Free Dictionary API — https://dictionaryapi.dev/
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

        if (res.status === 404) {
            resultHeader.style.display = 'none';
            vocabAreaEl.innerHTML = stateBox('📭', 'No results found', `We couldn't find a definition for "${word}". Try a different spelling.`);
            return;
        }

        if (!res.ok) throw new Error('Dictionary service unavailable');

        const entries = await res.json(); // array of entry objects

        resultQuery.innerHTML = `Results for <span>${word}</span>`;
        resultCount.textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
        resultHeader.style.display = 'flex';

        vocabAreaEl.innerHTML = entries.length
            ? `<div class="vocab-grid">${entries.map(vocabCard).join('')}</div>`
            : stateBox('📭', 'No results found', `We couldn't find a definition for "${word}". Try a different spelling.`);

    } catch (err) {
        resultHeader.style.display = 'none';
        vocabAreaEl.innerHTML = stateBox('⚠️', 'Something went wrong', 'Failed to fetch the definition. Please try again.');
        toast(err.message, 'error');
    }
};

// ── Event listeners ──────────────────────────────────────────────────────────

// Search button click
searchBtn.addEventListener('click', () => search(searchInput.value));

// Enter key in input
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') search(searchInput.value);
});

// Suggestion chips
chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) search(chip.dataset.word);
});