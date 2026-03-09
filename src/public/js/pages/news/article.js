/**
 * news/article.js — in-platform article reader
 *
 * 1. Reads article metadata from sessionStorage (saved by newsCard on click)
 * 2. Immediately renders what we have (title, description, image)
 * 3. Calls POST /api/news/fetch-content to get the full scraped article body
 * 4. Swaps the body in once it arrives
 */

import { requireAuth } from '../../core/router.js';
import { apiFetch }    from '../../core/api.js';
import { initNavbar }  from '../../../components/navbar.js';
import { toast }       from '../../core/toast.js';

requireAuth();
initNavbar();

// ── Helpers ───────────────────────────────────────────────────────────────
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function formatDate(d) {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(d));
  } catch { return d; }
}

// ── Skeleton body while scraping ──────────────────────────────────────────
const skeletonLines = (n = 8) => Array.from({ length: n }, (_, i) => `
  <div style="
    height:14px;
    width:${i % 3 === 2 ? '65%' : '100%'};
    background:linear-gradient(90deg,#e8edf5 25%,#f0f3f8 50%,#e8edf5 75%);
    background-size:200% 100%;
    animation:sk 1.4s infinite;
    border-radius:4px;
    margin-bottom:12px;">
  </div>`).join('');

// ── Error ─────────────────────────────────────────────────────────────────
function renderError(root) {
  root.innerHTML = `
    <div class="empty-state" style="padding:64px 20px;text-align:center;">
      <p style="font-size:1.1rem;margin-bottom:20px;">
        This article could not be loaded. Please go back and try again.
      </p>
      <a href="/pages/news/feed.html" class="btn btn--primary">← Back to Feed</a>
    </div>`;
}

// ── Render shell (instant — uses sessionStorage data) ─────────────────────
function renderShell(root, a) {
  document.title = `${a.title || 'Article'} — IELTS Platform`;

  const category = Array.isArray(a.category) ? a.category[0] : (a.category || '');

  const imageHtml = a.image_url
    ? `<img src="${esc(a.image_url)}" alt="${esc(a.title)}" loading="lazy"/>`
    : `<div class="article-hero__placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
             stroke="#a0adc0" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9l4-4 4 4 4-5 4 5"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
        </svg>
       </div>`;

  root.innerHTML = `
    <style>@keyframes sk{0%{background-position:200% 0}to{background-position:-200% 0}}</style>

    <div class="article-loaded">

      <div class="article-hero">${imageHtml}</div>

      <div class="article-meta">
        ${category      ? `<span class="article-category">${esc(category)}</span>` : ''}
        ${a.pubDate     ? `<span class="article-date">${formatDate(a.pubDate)}</span>` : ''}
        ${a.source_name ? `<span class="article-source">${esc(a.source_name)}</span>` : ''}
      </div>

      <h1 class="article-title">${esc(a.title || 'Untitled')}</h1>

      ${a.description
        ? `<p class="article-summary">${esc(a.description)}</p>
           <hr class="article-divider"/>`
        : ''}

      <!-- Body: skeleton while scraping, replaced with real content -->
      <div id="article-body" class="article-body">
        ${skeletonLines(8)}
      </div>

      ${a.link
        ? `<div class="article-footer">
             <span class="article-footer__label">Continue reading at the source</span>
             <a href="${esc(a.link)}" target="_blank" rel="noopener noreferrer"
                class="article-source-btn">
               <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"
                    stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                 <path d="M9 3h4v4M13 3l-7 7M6 4H3a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1v-3"/>
               </svg>
               ${esc(a.source_name || 'Original Source')}
             </a>
           </div>`
        : ''}

    </div>`;
}

// ── Swap in full content once scraped ────────────────────────────────────
function renderBody(content) {
  const bodyEl = document.getElementById('article-body');
  if (!bodyEl) return;

  // @postlight/parser returns plain text — wrap paragraphs
  const html = content
    .split(/\n{2,}/)
    .filter(p => p.trim())
    .map(p => `<p>${esc(p.trim())}</p>`)
    .join('');

  bodyEl.innerHTML = html || '<p><em>Content could not be extracted.</em></p>';
}

// ── Main ──────────────────────────────────────────────────────────────────
async function init() {
  const root = document.getElementById('article-root');

  // 1. Get article metadata from sessionStorage
  let article;
  try {
    const raw = sessionStorage.getItem('ielts_article');
    if (!raw) { renderError(root); return; }
    article = JSON.parse(raw);
    sessionStorage.removeItem('ielts_article');
    if (!article?.title) { renderError(root); return; }
  } catch {
    renderError(root);
    return;
  }

  // 2. Render shell immediately (no waiting)
  renderShell(root, article);

  // 3. Fetch full content from scraper endpoint
  if (!article.link) {
    renderBody(article.description || '');
    return;
  }

  try {
    const res = await apiFetch('/api/news/fetch-content', {
      method: 'POST',
      body:   JSON.stringify({ url: article.link }),
    });

    const content = res?.data?.content || '';

    if (!content) {
      // Scraper got nothing — fall back to description + link-out message
      renderBody(
        (article.description || '') +
        '\n\nFull content could not be extracted. Please use the link below to read the complete article.'
      );
      return;
    }

    renderBody(content);

  } catch (err) {
    console.error('[article.js] scraper error:', err);
    toast('Could not load full article content.', 'error');
    // Fall back to whatever description we have
    renderBody(article.description || 'Content unavailable.');
  }
}

init();