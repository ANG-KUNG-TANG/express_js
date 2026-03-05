/**
 * news/category.js — browse news by category
 */

import { requireAuth, getParam } from '../../core/router.js';
import { apiFetch }              from '../../core/api.js';
import { initNavbar }            from '../../../components/navbar.js';
import { newsCard }              from '../../../components/newsCard.js';
import { toast }                 from '../../core/toast.js';

requireAuth();
initNavbar();

const gridEl      = document.getElementById('news-grid');
const categoryEl  = document.getElementById('category-select');
const titleEl     = document.getElementById('category-title');
const nextBtn     = document.getElementById('next-page-btn');

let nextPage = null;

// Pre-select from URL ?category=
const preCategory = getParam('category');
if (preCategory) categoryEl.value = preCategory;

// ---------------------------------------------------------------------------
// Load by category
// ---------------------------------------------------------------------------
const loadCategory = async (page = null, append = false) => {
    const category = categoryEl.value;
    if (!category) return;

    titleEl.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    if (!append) gridEl.innerHTML = '<p class="loading">Loading…</p>';

    const params = new URLSearchParams();
    if (page) params.set('page', page);

    try {
        const res      = await apiFetch(`/api/news/category/${category}?${params}`);
        const articles = res?.data?.articles || [];
        nextPage       = res?.data?.nextPage || null;

        if (!append) gridEl.innerHTML = '';
        gridEl.insertAdjacentHTML('beforeend', articles.length
            ? articles.map(newsCard).join('')
            : '<p class="empty-state">No articles found.</p>');

        nextBtn.style.display = nextPage ? 'block' : 'none';
    } catch (err) {
        gridEl.innerHTML = '<p class="error-state">Failed to load news.</p>';
        toast(err.message, 'error');
    }
};

// ---------------------------------------------------------------------------
// Populate dropdown from API
// ---------------------------------------------------------------------------
const loadCategories = async () => {
    try {
        const res = await apiFetch('/api/news/categories');
        const categories = res?.data?.categories || [];
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
            categoryEl.appendChild(opt);
        });
    } catch (err) {
        toast('Failed to load categories', 'error');
    }
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
categoryEl.addEventListener('change', () => loadCategory());
nextBtn.addEventListener('click', () => { if (nextPage) loadCategory(nextPage, true); });

loadCategories();