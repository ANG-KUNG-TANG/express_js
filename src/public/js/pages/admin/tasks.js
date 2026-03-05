/**
 * admin/tasks.js — all tasks across all users with filters and transfer
 *
 * Bugs fixed:
 *  1. import '../../../components/...' → '../../components/...' (wrong depth)
 *  2. import from '../../core/toasts.js' → '../../core/toast.js' (wrong filename)
 */

import { requireAdmin } from '../../core/router.js';
import { apiFetch }     from '../../core/api.js';
// ✅ FIX 1: correct depth
import { initNavbar }   from '../../components/navbar.js';
import { taskCard }     from '../../components/taskCard.js';
// ✅ FIX 2: correct filename
import { toast }        from '../../core/toast.js';

requireAdmin();
initNavbar();

const listEl      = document.getElementById('tasks-list');
const searchEl    = document.getElementById('search-input');
const statusEl    = document.getElementById('filter-status');
const transferBtn = document.getElementById('transfer-btn');

let searchTimer = null;

const loadTasks = async () => {
    listEl.innerHTML = '<p class="loading">Loading…</p>';

    const q      = searchEl.value.trim();
    const status = statusEl.value;
    const params = new URLSearchParams();
    if (status) params.set('status', status);

    try {
        let res;
        if (q) {
            res = await apiFetch(`/api/writing-tasks/search?q=${encodeURIComponent(q)}&${params}`);
        } else {
            res = await apiFetch(`/api/writing-tasks?${params}`);
        }

        const tasks = res?.data || [];
        listEl.innerHTML = tasks.length
            ? tasks.map(t => {
                const tid = t._id || t.id;
                return `
                <div class="admin-task-row">
                    ${taskCard(t)}
                    <div class="admin-task-row__actions">
                        ${t.status === 'SUBMITTED' || t.status === 'REVIEWED'
                            ? `<a href="/pages/admin/review.html?id=${tid}" class="btn btn--warning btn--sm">
                                   ${t.status === 'SUBMITTED' ? 'Review' : 'Score'}
                               </a>`
                            : ''}
                    </div>
                </div>`;
              }).join('')
            : '<p class="empty-state">No tasks found.</p>';

    } catch (err) {
        listEl.innerHTML = '<p class="error-state">Failed to load tasks.</p>';
        toast(err.message, 'error');
    }
};

transferBtn?.addEventListener('click', async () => {
    const fromUserId = document.getElementById('transfer-from').value.trim();
    const toUserId   = document.getElementById('transfer-to').value.trim();

    if (!fromUserId || !toUserId) {
        toast('Both user IDs are required for transfer.', 'error');
        return;
    }
    if (!confirm(`Transfer ALL tasks from user ${fromUserId} to ${toUserId}?`)) return;

    try {
        const res = await apiFetch('/api/writing-tasks/transfer', {
            method: 'POST',
            body: JSON.stringify({ fromUserId, toUserId }),
        });
        toast(`Transferred ${res?.data?.transferred || 0} tasks.`);
        loadTasks();
    } catch (err) {
        toast(err.message, 'error');
    }
});

statusEl.addEventListener('change', loadTasks);
searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadTasks, 400);
});

loadTasks();