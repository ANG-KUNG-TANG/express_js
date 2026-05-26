// /js/components/newsCard.js
// Shared news card component used by feed.js, category.js, search.js.
//
// Usage:  articles.map(newsCard).join('')
//        initNewsCardGrid(gridEl)   ← call ONCE after injecting cards
//
// On click → saves full article object to sessionStorage → opens article.html
// No new backend endpoint needed. newsdata.io already returns full content.
//
// FIX: removed inline onclick/onkeydown handlers — they violated the
//      CSP `script-src-attr 'none'` directive. Replaced with a single
//      event-delegation listener attached in initNewsCardGrid().

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function formatDate(d) {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    }).format(new Date(d));
  } catch { return ''; }
}

// ── Card template ─────────────────────────────────────────────────────────
export const newsCard = (article) => {
  const category = Array.isArray(article.category)
    ? article.category[0]
    : (article.category || 'News');

  const imgHtml = article.image_url
    ? `<div class="news-card__img">
         <img src="${esc(article.image_url)}" alt="${esc(article.title)}" loading="lazy"/>
       </div>`
    : '';

  // Encode article as base64 so it survives as a data attribute
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(article))));

  // No onclick/onkeydown — handled by initNewsCardGrid() delegation
  return `
    <div class="news-card js-news-card" role="button" tabindex="0"
         data-article="${esc(encoded)}">
      ${imgHtml}
      <div class="news-card__body">
        <p class="news-card__tag">${esc(category)}</p>
        <p class="news-card__title">${esc(article.title || 'Untitled')}</p>
        ${article.description
          ? `<p class="news-card__summary">${esc(article.description)}</p>`
          : ''}
      </div>
      <div class="news-card__foot">
        <span style="font-size:.75rem;color:var(--text-secondary)">
          ${formatDate(article.pubDate)}
        </span>
        <span class="news-card__read-more">
          Read
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               width="11" height="11">
            <path d="M3 8h10M9 4l4 4-4 4"/>
          </svg>
        </span>
      </div>
    </div>`;
};

// ── Article opener ────────────────────────────────────────────────────────
const openArticle = (cardEl) => {
  try {
    const encoded = cardEl.dataset.article;
    const article = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    sessionStorage.setItem('ielts_article', JSON.stringify(article));
    window.location.href = '/pages/news/article.html';
  } catch (err) {
    console.error('[newsCard] failed to open article', err);
  }
};

// ── Event delegation ──────────────────────────────────────────────────────
// Call once after the grid container exists. Handles click + keyboard for
// all current and future cards — works even after "Load More" appends cards.
//
// Usage in feed.js / category.js / search.js:
//   import { newsCard, initNewsCardGrid } from '../../../components/newsCard.js';
//   initNewsCardGrid(document.getElementById('news-grid'));
//
export const initNewsCardGrid = (gridEl) => {
  if (!gridEl || gridEl.dataset.newsGridInit) return; // guard against double-init
  gridEl.dataset.newsGridInit = '1';

  gridEl.addEventListener('click', (e) => {
    const card = e.target.closest('.js-news-card');
    if (card) openArticle(card);
  });

  gridEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.js-news-card');
    if (card) { e.preventDefault(); openArticle(card); }
  });
};