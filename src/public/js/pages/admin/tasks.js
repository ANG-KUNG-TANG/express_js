/**
 * js/pages/admin/tasks.js  — self-contained, no broken imports
 */

import { getUser } from '../../core/auth.js';
import { apiFetch } from '../../core/api.js';
import { initAdminSidebar}  from '../../../components/admin_sidebar.js';

initAdminSidebar();

// ── Auth guard ────────────────────────────────────────────────────────────────
// Sidebar is injected by admin_nav.js (loaded via <script type="module"> in HTML).
const _user = getUser();
if (!_user || _user.role !== 'admin') window.location.replace('/pages/auth/login.html');

// ── Toast ─────────────────────────────────────────────────────────────────────
const toast = (msg, type = 'success') => {
    const t = document.getElementById('toast');
    const icon = document.querySelector('#toast .t-icon');
    const text = document.getElementById('toast-msg');
    if (!t) return;
    if (text) text.textContent = msg;
    if (icon) { icon.textContent = type === 'error' ? '✕' : '✓'; icon.style.color = type === 'error' ? 'var(--red)' : 'var(--green)'; }
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
};

// ── Status badge ──────────────────────────────────────────────────────────────
const statusBadge = (status) => {
    const map = { DRAFT: 'badge--default', SUBMITTED: 'badge--warning', REVIEWED: 'badge--info', SCORED: 'badge--success' };
    return `<span class="badge ${map[status] ?? 'badge--default'}">${status ?? '—'}</span>`;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const fmtTime = d => d ? new Date(d).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';

// ── Load tasks ────────────────────────────────────────────────────────────────
let taskTimer = null;

const loadTasks = async () => {
    const el     = document.getElementById('tasks-list');
    if (!el) return;
    const q      = document.getElementById('search-input')?.value.trim() ?? '';
    const status = document.getElementById('filter-status')?.value ?? '';
    el.innerHTML = '<p class="loading" style="text-align:center;padding:32px">Loading…</p>';
    try {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        const url = q
            ? `/api/admin/writing-tasks/search?q=${encodeURIComponent(q)}&${params}`
            : `/api/admin/writing-tasks?${params}`;
        const res   = await apiFetch(url);
        const tasks = res?.data ?? res ?? [];
        const list  = Array.isArray(tasks) ? tasks : [];

        if (!list.length) { el.innerHTML = '<p style="text-align:center;padding:32px;color:var(--text3)">No tasks found.</p>'; return; }

        el.innerHTML = `
            <div style="overflow-x:auto">
            <table class="data-table">
                <thead><tr>
                    <th>Title</th><th>Type</th><th>Status</th><th>Words</th><th>Updated</th><th>Actions</th>
                </tr></thead>
                <tbody>
                ${list.map(t => {
                    const tid = t._id ?? t.id;
                    const st  = t.status ?? t._status;
                    const action = st === 'SUBMITTED'
                        ? `<a href="/pages/admin/review.html?id=${tid}" class="btn btn--warning btn--xs">Review</a>`
                        : st === 'REVIEWED'
                        ? `<a href="/pages/admin/review.html?id=${tid}" class="btn btn--info btn--xs">Score</a>`
                        : `<a href="/pages/admin/review.html?id=${tid}" class="btn btn--ghost btn--xs">View</a>`;
                    return `<tr>
                        <td class="col-title">${esc(t.title ?? t._title ?? '—')}</td>
                        <td style="font-size:.8rem;color:var(--text2)">${esc(t.taskType ?? t._taskType ?? '—')}</td>
                        <td>${statusBadge(st)}</td>
                        <td class="col-mono" style="font-size:.8rem">${t.wordCount ?? t._wordCount ?? '—'}</td>
                        <td class="col-mono" style="font-size:.8rem">${fmtTime(t.updatedAt ?? t._updatedAt)}</td>
                        <td class="actions-cell">${action}</td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>
            </div>`;
    } catch (err) {
        el.innerHTML = `<p style="text-align:center;padding:32px;color:var(--red)">Failed to load tasks: ${esc(err.message)}</p>`;
        toast(err.message, 'error');
    }
};

// ── Transfer tasks ────────────────────────────────────────────────────────────
const transferTasks = async () => {
    const fromId = document.getElementById('transfer-from')?.value.trim();
    const toId   = document.getElementById('transfer-to')?.value.trim();
    if (!fromId || !toId)  { toast('Both user IDs are required.', 'error'); return; }
    if (fromId === toId)   { toast('Source and destination must differ.', 'error'); return; }
    const btn = document.getElementById('transfer-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Transferring…'; }
    try {
        const res   = await apiFetch('/api/admin/writing-tasks/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromUserId: fromId, toUserId: toId }),
        });
        const moved = res?.data?.moved ?? res?.moved ?? '?';
        toast(`${moved} task(s) transferred successfully.`);
        const f = document.getElementById('transfer-from'); if (f) f.value = '';
        const t = document.getElementById('transfer-to');   if (t) t.value = '';
        loadTasks();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Transfer All'; }
    }
};

// ── Events ────────────────────────────────────────────────────────────────────
document.getElementById('search-input')?.addEventListener('input', () => {
    clearTimeout(taskTimer); taskTimer = setTimeout(loadTasks, 350);
});
document.getElementById('filter-status')?.addEventListener('change', loadTasks);
document.getElementById('transfer-btn')?.addEventListener('click', transferTasks);

loadTasks();