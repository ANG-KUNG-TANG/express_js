/**
 * js/pages/admin/moderation.js  — self-contained, no broken imports
 */

import { getUser } from '../../core/auth.js';
import { apiFetch } from '../../core/api.js';
import { initAdminSidebar } from '../../../components/admin_sidebar.js';

// ── Auth guard ────────────────────────────────────────────────────────────────
const _user = getUser();
if (!_user || _user.role !== 'admin') window.location.replace('/pages/auth/login.html');

initAdminSidebar();

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

// ── State ─────────────────────────────────────────────────────────────────────
let currentPage = 1;
const LIMIT = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const severityBadge = sev => {
    const map = { high: 'badge--high', medium: 'badge--medium', low: 'badge--low' };
    return `<span class="badge ${map[sev] ?? 'badge--low'}">${esc(sev?.toUpperCase() ?? '—')}</span>`;
};

const statusBadge = resolved => resolved
    ? `<span class="badge badge--success">RESOLVED</span>`
    : `<span class="badge badge--warning">OPEN</span>`;

// ── Filters ───────────────────────────────────────────────────────────────────
const getFilters = () => {
    const rawStatus = document.getElementById('flag-status-filter')?.value ?? 'open';
    const params = { page: currentPage, limit: LIMIT };
    if (rawStatus === 'open')     params.status = 'open';
    if (rawStatus === 'resolved') params.status = 'resolved';
    return params;
};

// ── Load flags ────────────────────────────────────────────────────────────────
const loadFlags = async () => {
    const el = document.getElementById('flags-table-body');
    if (!el) return;
    el.innerHTML = `<tr><td colspan="6" class="loading" style="text-align:center;padding:28px">Loading…</td></tr>`;
    try {
        const qs  = new URLSearchParams(getFilters()).toString();
        const res = await apiFetch(`/api/admin/flags?${qs}`);
        const result = res?.data ?? res ?? {};
        const flags  = result.flags ?? result.data ?? (Array.isArray(result) ? result : []);
        const total  = result.total ?? flags.length;
        const pages  = result.pages ?? (Math.ceil(total / LIMIT) || 1);

        renderFlags(flags);
        renderPagination(pages);
    } catch (err) {
        el.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--red)">Failed to load flags: ${esc(err.message)}</td></tr>`;
        toast(err.message, 'error');
    }
};

// ── Render rows ───────────────────────────────────────────────────────────────
const renderFlags = (flags) => {
    const el = document.getElementById('flags-table-body');
    if (!flags.length) {
        el.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text3)">No flags found.</td></tr>`;
        return;
    }
    el.innerHTML = flags.map(f => {
        const flagId   = f.id ?? f._id;
        const taskId   = f.taskId ?? f._taskId;
        const resolved = !!(f.resolved ?? f.resolvedAt);
        return `
        <tr data-flag-id="${esc(flagId)}">
            <td class="col-title" style="max-width:180px">${esc(f.taskTitle ?? f.title ?? taskId ?? '—')}</td>
            <td class="col-mono" style="font-size:.72rem">${esc(f.flaggedBy ?? f.reportedBy ?? f.requesterId ?? '—')}</td>
            <td style="font-size:.75rem;color:var(--text2);max-width:200px">${esc(f.reason ?? '—')}</td>
            <td>${severityBadge(f.severity)}</td>
            <td>${statusBadge(resolved)}</td>
            <td class="actions-cell">
                ${!resolved ? `<button class="btn btn--ghost btn--xs" data-action="resolve" data-flag-id="${esc(flagId)}">Resolve</button>` : ''}
                <button class="btn btn--danger btn--xs" data-action="delete-content"
                    data-task-id="${esc(taskId)}"
                    data-title="${esc(f.taskTitle ?? f.title ?? 'this task')}">
                    Delete task
                </button>
            </td>
        </tr>`;
    }).join('');

    el.querySelectorAll('[data-action]').forEach(btn =>
        btn.addEventListener('click', () => {
            const { action, flagId, taskId, title } = btn.dataset;
            if (action === 'resolve')        resolveFlag(flagId, btn);
            if (action === 'delete-content') deleteContent(taskId, title, btn);
        })
    );
};

// ── Pagination ────────────────────────────────────────────────────────────────
const renderPagination = (pages) => {
    const el = document.getElementById('moderation-pagination');
    if (!el || pages <= 1) { if (el) el.innerHTML = ''; return; }
    const makeBtn = (label, page, disabled = false) => {
        const btn = document.createElement('button');
        btn.className = `btn btn--ghost btn--sm${page === currentPage ? ' btn--active' : ''}`;
        btn.textContent = label; btn.disabled = disabled;
        btn.addEventListener('click', () => { currentPage = page; loadFlags(); });
        return btn;
    };
    el.innerHTML = '';
    el.appendChild(makeBtn('←', currentPage - 1, currentPage === 1));
    for (let i = 1; i <= pages; i++) {
        if (pages > 7 && Math.abs(i - currentPage) > 2 && i !== 1 && i !== pages) {
            if (i === 2 || i === pages - 1) { const d = document.createElement('span'); d.textContent = '…'; d.style.cssText = 'padding:0 4px;color:var(--text3)'; el.appendChild(d); }
            continue;
        }
        el.appendChild(makeBtn(String(i), i));
    }
    el.appendChild(makeBtn('→', currentPage + 1, currentPage === pages));
};

// ── Resolve ───────────────────────────────────────────────────────────────────
const resolveFlag = async (flagId, btn) => {
    if (!flagId) return;
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
        await apiFetch(`/api/admin/flags/${flagId}/resolve`, { method: 'PATCH' });
        toast('Flag marked as resolved.'); currentPage = 1; loadFlags();
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'Resolve'; }
};

// ── Delete content ────────────────────────────────────────────────────────────
const deleteContent = (taskId, title, btn) => {
    if (!taskId) return;
    document.getElementById('_adm-modal')?.remove();
    const m = document.createElement('div');
    m.id = '_adm-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(3px)';
    m.innerHTML = `
        <div style="background:var(--surface);border:1px solid var(--border-hi);border-radius:16px;padding:28px 30px;max-width:420px;width:90%;box-shadow:0 24px 64px rgba(0,0,0,.4)">
            <h3 style="margin:0 0 8px;font-size:1rem;color:var(--text)">Delete task?</h3>
            <p style="color:var(--text3);font-size:.85rem;margin:0 0 22px;line-height:1.5">
                Permanently delete <strong style="color:var(--text)">"${esc(title)}"</strong>? This cannot be undone.
            </p>
            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button id="_mc-cancel" class="btn btn--ghost btn--sm">Cancel</button>
                <button id="_mc-confirm" class="btn btn--danger btn--sm">Delete task</button>
            </div>
        </div>`;
    document.body.appendChild(m);
    document.getElementById('_mc-cancel').onclick = () => m.remove();
    m.onclick = e => { if (e.target === m) m.remove(); };
    document.getElementById('_mc-confirm').onclick = async () => {
        const confirmBtn = document.getElementById('_mc-confirm');
        confirmBtn.disabled = true; confirmBtn.textContent = 'Deleting…';
        try {
            await apiFetch(`/api/admin/writing-tasks/${taskId}`, { method: 'DELETE' });
            toast('Task deleted.'); m.remove(); loadFlags();
        } catch (err) { toast(err.message, 'error'); m.remove(); }
    };
};

// ── Submit flag ───────────────────────────────────────────────────────────────
const submitFlag = async () => {
    const taskId   = document.getElementById('flag-task-id')?.value.trim();
    const severity = document.getElementById('flag-severity')?.value ?? 'medium';
    const reason   = document.getElementById('flag-reason')?.value.trim();

    if (!taskId)  { toast('Task ID is required.', 'error'); return; }
    if (!reason)  { toast('Reason is required.', 'error'); return; }

    const btn = document.getElementById('flag-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Flagging…'; }

    try {
        await apiFetch('/api/admin/flags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, severity, reason }),
        });
        toast('Content flagged successfully.');
        const tid = document.getElementById('flag-task-id'); if (tid) tid.value = '';
        const fre = document.getElementById('flag-reason');  if (fre) fre.value = '';
        currentPage = 1; loadFlags();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Flag content'; }
    }
};
window.submitFlag = submitFlag;

// ── Events ────────────────────────────────────────────────────────────────────
document.getElementById('flag-status-filter')?.addEventListener('change', () => { currentPage = 1; loadFlags(); });
document.getElementById('flag-btn')?.addEventListener('click', submitFlag);
document.getElementById('refresh-btn')?.addEventListener('click', () => { currentPage = 1; loadFlags(); });

loadFlags();