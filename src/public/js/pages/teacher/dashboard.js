import { requireRole, getParam } from '../../core/router.js';
import { apiFetch }              from '../../core/api.js';
import { initNavbar }            from '../../../components/navbar.js';
import { toast }                 from '../../core/toast.js';

requireRole('teacher', 'admin');
initNavbar();

const fmtTime = d => d ? new Date(d).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
const statusBadge = s => {
    const cls = { SUBMITTED:'badge--warning', REVIEWED:'badge--info' };
    return `<span class="badge ${cls[s]??'badge--default'}">${s}</span>`;
};

// ── Stats ─────────────────────────────────────────────────────────────────
const loadStats = async () => {
    try {
        const [submittedRes, reviewedRes] = await Promise.all([
            apiFetch('/api/teacher/writing-tasks?status=SUBMITTED'),
            apiFetch('/api/teacher/writing-tasks?status=REVIEWED'),
        ]);
        const submitted = submittedRes?.data ?? [];
        const reviewed  = reviewedRes?.data  ?? [];

        document.querySelector('#stat-submitted .stat-card__value').textContent = submitted.length;
        document.querySelector('#stat-reviewed  .stat-card__value').textContent = reviewed.length;
    } catch (err) { toast(err.message, 'error'); }
};

// ── Pending Queue ─────────────────────────────────────────────────────────
const loadPendingQueue = async () => {
    const el = document.getElementById('pending-list');
    el.innerHTML = '<p class="loading">Loading…</p>';
    try {
        const { data: tasks } = await apiFetch('/api/teacher/writing-tasks?status=SUBMITTED');
        const sorted = (tasks ?? []).sort((a,b) =>
            new Date(a.submittedAt ?? a.createdAt) - new Date(b.submittedAt ?? b.createdAt));

        if (!sorted.length) { el.innerHTML = '<p class="empty-state">🎉 No tasks awaiting review.</p>'; return; }

        el.innerHTML = sorted.map(t => {
            const tid = t.id ?? t._id;
            return `
            <div class="queue-row">
                <div class="queue-row__info">
                    <span class="queue-row__title">${t._title ?? t.title}</span>
                    <span class="queue-row__meta">${t._taskType ?? t.taskType ?? '—'} · Submitted ${fmtTime(t._submittedAt ?? t.submittedAt ?? t.createdAt)}</span>
                </div>
                <a href="/pages/teacher/review.html?id=${tid}" class="btn btn--warning btn--sm">Review</a>
            </div>`;
        }).join('');
    } catch (err) {
        el.innerHTML = '<p class="error-state">Failed to load queue.</p>';
        toast(err.message, 'error');
    }
};

// ── All Tasks ─────────────────────────────────────────────────────────────
let taskTimer = null;

const loadTasks = async () => {
    const el     = document.getElementById('tasks-list');
    const q      = document.getElementById('task-search').value.trim();
    const status = document.getElementById('task-status-filter').value;
    el.innerHTML = '<p class="loading">Loading…</p>';
    try {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        const url = q
            ? `/api/teacher/writing-tasks/search?q=${encodeURIComponent(q)}`
            : `/api/teacher/writing-tasks?${params}`;
        const { data: tasks } = await apiFetch(url);

        if (!(tasks ?? []).length) { el.innerHTML = '<p class="empty-state">No tasks found.</p>'; return; }

        el.innerHTML = `<table class="data-table">
            <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
            <tbody>${tasks.map(t => {
                const tid = t.id ?? t._id;
                const st  = t._status ?? t.status;
                const action = st === 'SUBMITTED'
                    ? `<a href="/pages/teacher/review.html?id=${tid}" class="btn btn--warning btn--xs">Review</a>`
                    : `<a href="/pages/teacher/review.html?id=${tid}" class="btn btn--ghost   btn--xs">View</a>`;
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

document.getElementById('task-search').addEventListener('input', () => {
    clearTimeout(taskTimer);
    taskTimer = setTimeout(loadTasks, 400);
});
document.getElementById('task-status-filter').addEventListener('change', loadTasks);

Promise.all([ loadStats(), loadPendingQueue(), loadTasks() ]);