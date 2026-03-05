/**
 * news/feed.js — personalised news feed
 */

import { requireAuth }  from '../../core/router.js';
import { apiFetch }     from '../../core/api.js';
import { initNavbar }   from '../../../components/navbar.js';
import { newsCard }     from '../../../components/newsCard.js';
import { toast }        from '../../core/toast.js';

requireAuth();
initNavbar();

const gridEl     = document.getElementById('news-grid');
const searchEl   = document.getElementById('search-input');
const nextBtn    = document.getElementById('next-page-btn');
const loadingEl  = document.getElementById('loading-state');

let nextPage     = null;
let searchTimer  = null;

// ---------------------------------------------------------------------------
// Load feed
// ---------------------------------------------------------------------------
const loadFeed = async (page = null, append = false) => {
    if (!append) gridEl.innerHTML = '';
    loadingEl.style.display = 'block';
    nextBtn.style.display   = 'none';

    const q = searchEl.value.trim();
    const params = new URLSearchParams();
    if (q)    params.set('q', q);
    if (page) params.set('page', page);

    try {
        const res      = await apiFetch(`/api/news/feed?${params}`);
        const articles = res?.data?.articles || [];
        nextPage       = res?.data?.nextPage || null;

        if (!append && articles.length === 0) {
            gridEl.innerHTML = `
                <p class="empty-state">
                    No articles found. 
                    <a href="/pages/news/interests.html">Set your interests</a> to personalise your feed.
                </p>`;
        } else {
            gridEl.insertAdjacentHTML('beforeend', articles.map(newsCard).join(''));
        }

        nextBtn.style.display = nextPage ? 'block' : 'none';
    } catch (err) {
        toast(err.message, 'error');
        gridEl.innerHTML = '<p class="error-state">Failed to load news.</p>';
    } finally {
        loadingEl.style.display = 'none';
    }
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadFeed(), 500);
});

nextBtn.addEventListener('click', () => {
    if (nextPage) loadFeed(nextPage, true);
});

loadFeed();