import { requireAdmin } from '../../core/router.js';
import { apiFetch }     from '../../core/api.js';
import { initNavbar }   from '../../../components/navbar.js';
import { toast }        from '../../core/toast.js';

requireAdmin();
initNavbar();

const fmtTime = d => d ? new Date(d).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
const statusBadge = s => {
    const cls = { DRAFT:'badge--default', SUBMITTED:'badge--warning', REVIEWED:'badge--info', SCORED:'badge--success' };
    return `<span class="badge ${cls[s]??'badge--default'}">${s}</span>`;
};

let searchTimer = null;

const loadTasks = async () => {
    const el     = document.getElementById('tasks-list');
    const q      = document.getElementById('search-input').value.trim();
    const status = document.getElementById('filter-status').value;
    el.innerHTML = '<p class="loading">Loading…</p>';
    try {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        const url = q
            ? `/api/admin/writing-tasks/search?q=${encodeURIComponent(q)}&${params}`
            : `/api/admin/writing-tasks?${params}`;
        const { data: tasks } = await apiFetch(url);

        if (!(tasks ?? []).length) { el.innerHTML = '<p class="empty-state">No tasks found.</p>'; return; }

        el.innerHTML = `<table class="data-table">
            <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
            <tbody>${tasks.map(t => {
                const tid   = t.id ?? t._id;
                const st    = t._status ?? t.status;
                const action = st === 'SUBMITTED'
                    ? `<a href="/pages/admin/review.html?id=${tid}" class="btn btn--warning btn--xs">Review</a>`
                    : st === 'REVIEWED'
                    ? `<a href="/pages/admin/review.html?id=${tid}" class="btn btn--info btn--xs">Score</a>`
                    : '';
                return `<tr>
                    <td class="col-title">${t._title ?? t.title}</td>
                    <td>${t._taskType ?? t.taskType ?? '—'}</td>
                    <td>${statusBadge(st)}</td>
                    <td class="col-mono">${fmtTime(t._updatedAt ?? t.updatedAt)}</td>
                    <td class="actions-cell">${action}</td>
                </tr>`;
            }).join('')}</tbody></table>`;
    } catch (err) {
        el.innerHTML = '<p class="error-state">Failed to load tasks.</p>';
        toast(err.message, 'error');
    }
};

document.getElementById('filter-status').addEventListener('change', loadTasks);
document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadTasks, 400);
});
document.getElementById('transfer-btn').addEventListener('click', async () => {
    const fromUserId = document.getElementById('transfer-from').value.trim();
    const toUserId   = document.getElementById('transfer-to').value.trim();
    if (!fromUserId || !toUserId) { toast('Both user IDs are required.', 'error'); return; }
    if (!confirm(`Transfer ALL tasks from ${fromUserId} → ${toUserId}?`)) return;
    try {
        const { data } = await apiFetch('/api/admin/writing-tasks/transfer', {
            method: 'POST',
            body: JSON.stringify({ fromUserId, toUserId }),
        });
        toast(`Transferred ${data?.transferred ?? 0} tasks.`);
        loadTasks();
    } catch (err) { toast(err.message, 'error'); }
});

loadTasks();