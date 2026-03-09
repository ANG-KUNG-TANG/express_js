/**
 * news/feed.js — personalised news feed
 * Same pattern as category.js and search.js.
 */

import { requireAuth }  from '../../core/router.js';
import { apiFetch }     from '../../core/api.js';
import { initNavbar }   from '../../../components/navbar.js';
import { newsCard }     from '../../../components/newsCard.js';
import { toast }        from '../../core/toast.js';

requireAuth();
initNavbar();

const gridEl    = document.getElementById('news-grid');
const loadingEl = document.getElementById('loading-state');
const nextBtn   = document.getElementById('next-page-btn');
const searchEl  = document.getElementById('search-input');

let nextPage  = null;
let lastQuery = '';

// ---------------------------------------------------------------------------
// Load feed
// ---------------------------------------------------------------------------
const loadFeed = async (page = null, append = false) => {
    if (!append) {
        gridEl.innerHTML = '';
        if (loadingEl) loadingEl.style.display = 'block';
    }

    const params = new URLSearchParams();
    if (lastQuery) params.set('q', lastQuery);
    if (page)      params.set('page', page);

    try {
        const res      = await apiFetch(`/api/news/feed?${params}`);
        const articles = res?.data?.articles || [];
        nextPage       = res?.data?.nextPage  || null;

        if (loadingEl) loadingEl.style.display = 'none';
        if (!append)   gridEl.innerHTML = '';

        gridEl.insertAdjacentHTML('beforeend', articles.length
            ? articles.map(newsCard).join('')
            : '<p class="empty-state">No articles found for your interests.</p>');

        nextBtn.style.display = nextPage ? 'block' : 'none';

    } catch (err) {
        if (loadingEl) loadingEl.style.display = 'none';
        gridEl.innerHTML = '<p class="error-state">Failed to load feed.</p>';
        toast(err.message, 'error');
    }
};

// ---------------------------------------------------------------------------
// Search within feed — debounced
// ---------------------------------------------------------------------------
let t;
searchEl?.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
        lastQuery = searchEl.value.trim();
        nextPage  = null;
        loadFeed();
    }, 380);
});

nextBtn?.addEventListener('click', () => {
    if (nextPage) loadFeed(nextPage, true);
});

loadFeed();