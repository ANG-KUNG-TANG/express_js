/**
 * news/interests.js — manage user's news interest categories (max 5)
 */

import { requireAuth }       from '../../core/router.js';
import { getUser, saveSession, getToken } from '../../core/auth.js';
import { apiFetch }          from '../../core/api.js';
import { initNavbar }        from '../../../components/navbar.js';
import { toast }             from '../../core/toast.js';

requireAuth();
initNavbar();

const gridEl     = document.getElementById('categories-grid');
const saveBtn    = document.getElementById('save-btn');
const countEl    = document.getElementById('selected-count');

const MAX = 5;
let selected = new Set(getUser()?.interests || []);

// ---------------------------------------------------------------------------
// Load categories and render checkboxes
// ---------------------------------------------------------------------------
const loadCategories = async () => {
    try {
        const res        = await apiFetch('/api/news/categories');
        const categories = res?.data?.categories || [];
        renderGrid(categories);
    } catch (err) {
        toast('Failed to load categories', 'error');
    }
};

const renderGrid = (categories) => {
    gridEl.innerHTML = categories.map(c => `
        <label class="interest-chip ${selected.has(c) ? 'interest-chip--selected' : ''}" data-value="${c}">
            <input type="checkbox" value="${c}" ${selected.has(c) ? 'checked' : ''} style="display:none">
            ${c.charAt(0).toUpperCase() + c.slice(1)}
        </label>
    `).join('');

    updateCount();

    gridEl.querySelectorAll('.interest-chip').forEach(chip => {
        chip.addEventListener('click', () => toggleInterest(chip));
    });
};

const toggleInterest = (chip) => {
    const value = chip.dataset.value;

    if (selected.has(value)) {
        selected.delete(value);
        chip.classList.remove('interest-chip--selected');
        chip.querySelector('input').checked = false;
    } else {
        if (selected.size >= MAX) {
            toast(`You can only select up to ${MAX} interests.`, 'error');
            return;
        }
        selected.add(value);
        chip.classList.add('interest-chip--selected');
        chip.querySelector('input').checked = true;
    }

    updateCount();
};

const updateCount = () => {
    countEl.textContent = `${selected.size} / ${MAX} selected`;
    saveBtn.disabled = selected.size === 0;
};

// ---------------------------------------------------------------------------
// Save interests
// ---------------------------------------------------------------------------
saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
        const res = await apiFetch('/api/news/interests', {
            method: 'PATCH',
            body: JSON.stringify({ interests: [...selected] }),
        });

        // Update stored user object with new interests
        const user = getUser();
        user.interests = res?.data?.interests || [...selected];
        saveSession(getToken(), user);

        toast('Interests saved!');
        window.location.href = '/pages/news/feed.html';
    } catch (err) {
        toast(err.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Interests';
    }
});

loadCategories();