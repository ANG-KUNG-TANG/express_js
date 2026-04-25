/**
 * news/search.js — search news by keyword with optional category filter
 */
import { requireAuth }  from '../../core/router.js';
import { apiFetch }     from '../../core/api.js';
import { initNavbar }   from '../../../components/navbar.js';
import { newsCard }     from '../../../components/newsCard.js';
import { toast }        from '../../core/toast.js';

requireAuth();
initNavbar();

const formEl      = document.getElementById('search-form');
const inputEl     = document.getElementById('search-input');
const categoryEl  = document.getElementById('filter-category');
const gridEl      = document.getElementById('news-grid');
const nextBtn     = document.getElementById('next-page-btn');
const resultInfoEl = document.getElementById('result-info');

let nextPage = null;
let lastQuery = '';
let lastCategory = '';

// ---------------------------------------------------------------------------
// Load categories from API
// ---------------------------------------------------------------------------
const loadCategories = async () => {
    try {
        const res = await apiFetch('/api/news/categories');
        const categories = res?.data?.categories || [];
        categoryEl.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
            categoryEl.appendChild(opt);
        });
    } catch {
        toast('Failed to load categories', 'error');
    }
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
const search = async (page = null, append = false) => {
    // When paginating (append), use the frozen query/category from the original search
    // so a mid-pagination edit to the inputs doesn't corrupt the result set.
    const q        = append ? lastQuery    : inputEl.value.trim();
    const category = append ? lastCategory : categoryEl.value;

    if (!q) {
        gridEl.innerHTML = '<p class="empty-state">Enter a keyword to search.</p>';
        return;
    }

    lastQuery    = q;
    lastCategory = category;
    if (!append) gridEl.innerHTML = '<p class="loading">Searching…</p>';

    const params = new URLSearchParams({ q });
    if (category) params.set('category', category);
    if (page)     params.set('page', page);

    try {
        const res      = await apiFetch(`/api/news/search?${params}`);
        const articles = res?.data?.articles || [];
        nextPage       = res?.data?.nextPage || null;

        resultInfoEl.textContent = `${res?.data?.totalResults || 0} results for "${q}"`;

        if (!append) gridEl.innerHTML = '';
        gridEl.insertAdjacentHTML('beforeend', articles.length
            ? articles.map(newsCard).join('')
            : '<p class="empty-state">No results found.</p>');

        nextBtn.style.display = nextPage ? 'block' : 'none';
    } catch (err) {
        gridEl.innerHTML = '<p class="error-state">Search failed.</p>';
        toast(err.message, 'error');
    }
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
formEl.addEventListener('submit', (e) => { e.preventDefault(); search(); });
categoryEl.addEventListener('change', () => { if (lastQuery) search(); });
nextBtn.addEventListener('click', () => { if (nextPage) search(nextPage, true); });

// Pre-fill from URL ?q=
const preQ = new URLSearchParams(window.location.search).get('q');
if (preQ) { inputEl.value = preQ; search(); }

// Load categories on page load
loadCategories();