/**
 * js/pages/admin/dashboard.js
 * Admin dashboard — stats, pending review queue, recent activity,
 * user management, task management, and audit log widget.
 */

import { requireAdmin }     from '../../core/router.js';
import { apiFetch }         from '../../core/api.js';
import { statusBadge }      from '../../../components/statusBadge.js';
import { toast }            from '../../utils/toast.js';
import { initAdminSidebar } from '../../../components/admin_sidebar.js';

requireAdmin();
initAdminSidebar();

/* global openModal, closeModal */

const fmtTime = d => d ? new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}) : '—';

const fmtTs = d => d
    ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

const roleBadge = r => {
    const cls = { admin: 'badge--admin', teacher: 'badge--teacher', user: 'badge--default', student: 'badge--default' };
    return `<span class="badge ${cls[r] ?? 'badge--default'}">${(r ?? '—').toUpperCase()}</span>`;
};

const setStat = (id, value) => {
    const el = document.querySelector(`#${id} .stat-card__value`);
    if (el) el.textContent = value ?? '—';
};

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// Inline confirm modal
const showConfirm = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm }) => {
    document.getElementById('app-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'app-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;animation:fadeIn .15s ease';
    modal.innerHTML = `
        <div style="background:var(--surface,#fff);border:1px solid var(--border);border-radius:var(--radius-lg,14px);padding:28px 32px;max-width:400px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.15)">
            <h3 style="margin:0 0 8px;font-size:1.1rem">${title}</h3>
            <p style="color:var(--text2,#64748b);font-size:.9rem;margin:0 0 24px;line-height:1.5">${message}</p>
            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button id="mc-cancel"  class="btn btn--ghost">Cancel</button>
                <button id="mc-confirm" class="btn ${danger ? 'btn--danger' : 'btn--primary'}">${confirmLabel}</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    const cleanup = () => modal.remove();
    document.getElementById('mc-cancel').addEventListener('click', cleanup);
    modal.addEventListener('click', e => { if (e.target === modal) cleanup(); });
    document.getElementById('mc-confirm').addEventListener('click', async () => {
        document.getElementById('mc-confirm').disabled = true;
        document.getElementById('mc-confirm').textContent = 'Please wait…';
        await onConfirm();
        cleanup();
    });
};

// ── Stats + Activity ──────────────────────────────────────────────────────────
const loadStatsAndActivity = async () => {
    const actEl = document.getElementById('activity-list');
    if (actEl) actEl.innerHTML = '<p class="loading">Loading…</p>';
    try {
        const { data: stats } = await apiFetch('/api/admin/stats');
        setStat('stat-total-users', stats.users?.total);
        setStat('stat-new-users',   stats.users?.newThisWeek);
        setStat('stat-teachers',    stats.users?.teachers);
        setStat('stat-pending',     stats.tasks?.submitted);
        renderActivity(stats.recent ?? []);
    } catch (err) {
        toast(err.message, 'error');
        if (actEl) actEl.innerHTML = '<p class="error-state">Failed to load stats.</p>';
    }
};

// ── Pending review queue ──────────────────────────────────────────────────────
const loadPendingQueue = async () => {
    const el = document.getElementById('pending-list');
    if (!el) return;
    el.innerHTML = '<p class="loading">Loading…</p>';
    try {
        const { data: tasks } = await apiFetch('/api/admin/writing-tasks?status=SUBMITTED');
        const sorted = (tasks ?? []).sort(
            (a, b) => new Date(a.submittedAt ?? a.createdAt) - new Date(b.submittedAt ?? b.createdAt)
        );
        if (!sorted.length) {
            el.innerHTML = '<p class="empty-state">🎉 No tasks awaiting review.</p>';
            return;
        }
        el.innerHTML = sorted.map(t => {
            const tid = t._id ?? t.id;
            return `
            <div class="queue-row">
                <div class="queue-row__info">
                    <span class="queue-row__title">${t.title ?? t._title ?? '—'}</span>
                    <span class="queue-row__meta">
                        ${t.taskType ?? t._taskType ?? '—'} ·
                        Submitted ${fmtTime(t.submittedAt ?? t._submittedAt ?? t.createdAt)}
                    </span>
                </div>
                <a href="/pages/admin/review.html?id=${tid}" class="btn btn--warning btn--sm">Review</a>
            </div>`;
        }).join('');
    } catch (err) {
        el.innerHTML = '<p class="error-state">Failed to load queue.</p>';
        toast(err.message, 'error');
    }
};

// ── Recent activity ───────────────────────────────────────────────────────────
const renderActivity = (recent = []) => {
    const el = document.getElementById('activity-list');
    if (!el) return;
    if (!recent.length) { el.innerHTML = '<p class="empty-state">No recent activity.</p>'; return; }
    el.innerHTML = `
    <table class="data-table">
        <thead><tr><th>Title</th><th>Status</th><th>Band</th><th>Updated</th><th>Actions</th></tr></thead>
        <tbody>
        ${recent.map(t => `<tr>
            <td class="col-title">${t.title ?? '—'}</td>
            <td>${statusBadge(t.status)}</td>
            <td>${t.bandScore != null ? `Band ${t.bandScore}` : '—'}</td>
            <td class="col-mono">${fmtTime(t.updatedAt)}</td>
            <td class="actions-cell">
                <a href="/pages/admin/review.html?id=${t.id ?? t._id}" class="btn btn--ghost btn--xs">View</a>
            </td>
        </tr>`).join('')}
        </tbody>
    </table>`;
};

// ── Audit log widget ──────────────────────────────────────────────────────────
const AUDIT_OUTCOME_HTML = o => o === 'failure'
    ? `<span style="display:inline-block;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:600;background:rgba(239,68,68,.12);color:#ef4444">FAIL</span>`
    : `<span style="display:inline-block;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:600;background:rgba(34,197,94,.12);color:#16a34a">OK</span>`;

const AUDIT_ACTION_HTML = a =>
    `<span style="font-family:var(--font-mono,monospace);font-size:11px;background:var(--surface2,rgba(0,0,0,.06));padding:2px 6px;border-radius:4px;white-space:nowrap">${esc(a)}</span>`;

export const loadAuditWidget = async () => {
    const el = document.getElementById('audit-widget-list');
    if (!el) return;
    el.innerHTML = '<p class="loading" style="padding:16px;text-align:center">Loading…</p>';
    try {
        const qs  = new URLSearchParams({ page: 1, limit: 8 }).toString();
        const res = await apiFetch(`/api/admin/audit-logs?${qs}`);
        const result = res?.data ?? res ?? {};
        const logs   = result.logs ?? result.data ?? (Array.isArray(result) ? result : []);

        if (!logs.length) {
            el.innerHTML = '<p class="empty-state" style="padding:16px;text-align:center;color:var(--text3)">No audit events yet.</p>';
            return;
        }

        el.innerHTML = `
        <table class="data-table" style="font-size:12px">
            <thead><tr>
                <th>Time</th>
                <th>Action</th>
                <th>Result</th>
                <th>Actor</th>
            </tr></thead>
            <tbody>
            ${logs.map(l => `
                <tr>
                    <td class="col-mono" style="font-size:11px;white-space:nowrap;color:var(--text3)">${fmtTs(l.createdAt)}</td>
                    <td>${AUDIT_ACTION_HTML(l.action)}</td>
                    <td>${AUDIT_OUTCOME_HTML(l.outcome)}</td>
                    <td class="col-mono" style="font-size:11px;color:var(--text3);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(l.requesterId ?? '')}">${esc((l.requesterId ?? '—').slice(-8))}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    } catch (err) {
        el.innerHTML = `<p style="padding:16px;text-align:center;color:var(--red)">Failed to load audit logs.</p>`;
        toast(err.message, 'error');
    }
};

// ── User management ───────────────────────────────────────────────────────────
const loadUsers = async (email = '') => {
    const el = document.getElementById('users-list');
    if (!el) return;
    el.innerHTML = '<p class="loading">Loading…</p>';
    try {
        let users;
        if (email) {
            const { data: user } = await apiFetch(`/api/admin/users/email/${encodeURIComponent(email)}`);
            users = user ? [user] : [];
        } else {
            const { data } = await apiFetch('/api/admin/users');
            users = data ?? [];
        }
        renderUsers(users);
    } catch (err) {
        el.innerHTML = '<p class="error-state">Failed to load users.</p>';
        toast(err.message, 'error');
    }
};

const renderUsers = (users) => {
    const el = document.getElementById('users-list');
    if (!el) return;
    if (!users.length) { el.innerHTML = '<p class="empty-state">No users found.</p>'; return; }
    el.innerHTML = `
    <table class="data-table">
        <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>User ID</th><th>Teacher</th><th>Joined</th><th>Actions</th></tr>
        </thead>
        <tbody>
        ${users.map(u => {
            const uid        = u._id ?? u.id;
            const role       = u.role ?? u._role;
            const isStudent  = role === 'user' || role === 'student';
            const teacherName = u.teacherName ?? u.teacher?.name ?? u.teacher?.username ?? null;
            return `<tr>
                <td>${esc(u.name ?? u.username ?? '—')}</td>
                <td class="col-mono" style="font-size:.8rem">${esc(u.email ?? '—')}</td>
                <td>${roleBadge(role)}</td>
                <td class="col-mono" style="font-size:.75rem;cursor:pointer" onclick="navigator.clipboard.writeText('${uid}');window.__toast?.('ID copied')" title="Click to copy">${uid?.slice(-8) ?? '—'}</td>
                <td style="font-size:.8rem;color:var(--text2)">${teacherName ? esc(teacherName) : '<span style="color:var(--muted)">—</span>'}</td>
                <td class="col-mono" style="font-size:.78rem">${fmtTime(u.createdAt ?? u._createdAt)}</td>
                <td class="actions-cell">
                    ${isStudent ? `<button class="btn btn--ghost btn--xs" onclick="openLinkTeacher('${uid}')">Link teacher</button>` : ''}
                    <button class="btn btn--ghost btn--xs" onclick="openResetPassword('${uid}')">Reset pw</button>
                    <button class="btn btn--danger btn--xs" onclick="deleteUser('${uid}','${esc(u.name ?? u.email ?? '')}')">Delete</button>
                </td>
            </tr>`;
        }).join('')}
        </tbody>
    </table>`;
};

// ── Link teacher modal ────────────────────────────────────────────────────────
let studentId = null;

window.openLinkTeacher = async (uid) => {
    studentId = uid;
    const modal = document.getElementById('modal-link-teacher');
    if (!modal) return;

    const sel = document.getElementById('link-teacher-select');
    if (sel) {
        sel.innerHTML = '<option value="">Loading teachers…</option>';
        try {
            const { data } = await apiFetch('/api/admin/users');
            const teachers = (data ?? []).filter(u => u.role === 'teacher');
            sel.innerHTML = '<option value="">Select a teacher</option>' +
                teachers.map(t => `<option value="${t._id ?? t.id}">${esc(t.name ?? t.username ?? t.email)}</option>`).join('');
        } catch {
            sel.innerHTML = '<option value="">Failed to load teachers</option>';
        }
    }
    modal.classList.add('open');
};

document.getElementById('link-confirm')?.addEventListener('click', async () => {
    const teacherId = document.getElementById('link-teacher-select')?.value;
    if (!teacherId) { toast('Please select a teacher.', 'error'); return; }
    const btn = document.getElementById('link-confirm');
    btn.disabled = true; btn.textContent = 'Linking…';
    try {
        await apiFetch(`/api/admin/users/${studentId}/link-teacher`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherId }),
        });
        toast('Student linked successfully.');
        document.getElementById('modal-link-teacher')?.classList.remove('open');
        loadUsers();
    } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false; btn.textContent = 'Link';
    }
});

// ── Delete user ───────────────────────────────────────────────────────────────
window.deleteUser = (uid, name) => {
    showConfirm({
        title: 'Delete user',
        message: `Permanently delete <strong>${name}</strong>? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
            try {
                await apiFetch(`/api/admin/users/${uid}`, { method: 'DELETE' });
                toast(`${name} deleted.`);
                loadUsers();
                loadStatsAndActivity();
            } catch (err) { toast(err.message, 'error'); }
        },
    });
};

// ── Task management ───────────────────────────────────────────────────────────
let taskTimer = null;

const loadTasks = async () => {
    const el     = document.getElementById('tasks-list');
    if (!el) return;
    const q      = document.getElementById('task-search')?.value.trim() ?? '';
    const status = document.getElementById('task-status-filter')?.value ?? '';
    el.innerHTML = '<p class="loading">Loading…</p>';
    try {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        const url = q
            ? `/api/admin/writing-tasks/search?q=${encodeURIComponent(q)}&${params}`
            : `/api/admin/writing-tasks?${params}`;
        const { data: tasks } = await apiFetch(url);
        if (!(tasks ?? []).length) { el.innerHTML = '<p class="empty-state">No tasks found.</p>'; return; }
        el.innerHTML = `
        <table class="data-table">
            <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
            <tbody>
            ${tasks.map(t => {
                const tid = t._id ?? t.id;
                const st  = t.status ?? t._status;
                const action = st === 'SUBMITTED'
                    ? `<a href="/pages/admin/review.html?id=${tid}" class="btn btn--warning btn--xs">Review</a>`
                    : st === 'REVIEWED'
                    ? `<a href="/pages/admin/review.html?id=${tid}" class="btn btn--info    btn--xs">Score</a>`
                    : `<a href="/pages/admin/review.html?id=${tid}" class="btn btn--ghost   btn--xs">View</a>`;
                return `<tr>
                    <td class="col-title">${t.title ?? t._title ?? '—'}</td>
                    <td>${t.taskType ?? t._taskType ?? '—'}</td>
                    <td>${statusBadge(st)}</td>
                    <td class="col-mono">${fmtTime(t.updatedAt ?? t._updatedAt)}</td>
                    <td class="actions-cell">${action}</td>
                </tr>`;
            }).join('')}
            </tbody>
        </table>`;
    } catch (err) {
        el.innerHTML = '<p class="error-state">Failed to load tasks.</p>';
        toast(err.message, 'error');
    }
};

// ── Listeners ─────────────────────────────────────────────────────────────────
document.getElementById('search-btn')?.addEventListener('click', () =>
    loadUsers(document.getElementById('search-email')?.value.trim() ?? ''));
document.getElementById('search-email')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') loadUsers(document.getElementById('search-email').value.trim());
});
document.getElementById('clear-search-btn')?.addEventListener('click', () => {
    document.getElementById('search-email').value = ''; loadUsers();
});
document.getElementById('task-search')?.addEventListener('input', () => {
    clearTimeout(taskTimer); taskTimer = setTimeout(loadTasks, 400);
});
document.getElementById('task-status-filter')?.addEventListener('change', loadTasks);

// Audit log refresh button
document.getElementById('audit-widget-refresh')?.addEventListener('click', loadAuditWidget);

// Expose toast globally for inline onclick handlers
window.__toast = toast;

// ── Promote user via Roles panel ──────────────────────────────────────────────
document.getElementById('promote-apply-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('promote-email')?.value.trim();
    const role  = window.__selectedPromoteRole;
    if (!email || !role) { toast('Enter an email and select a role.', 'error'); return; }
    try {
        const { data: found } = await apiFetch(`/api/admin/users/email/${encodeURIComponent(email)}`);
        if (!found) { toast('User not found.', 'error'); return; }
        const uid = found._id ?? found.id;
        await apiFetch(`/api/admin/users/${uid}/promote`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        });
        toast(`Role updated to ${role}.`);
        loadUsers();
    } catch (err) { toast(err.message, 'error'); }
});

window.promoteUser = () => document.getElementById('promote-apply-btn')?.click();

// ── Create user ───────────────────────────────────────────────────────────────
window.createUser = async () => {
    const first = document.getElementById('cu-firstname')?.value.trim();
    const last  = document.getElementById('cu-lastname')?.value.trim();
    const email = document.getElementById('cu-email')?.value.trim();
    const uname = document.getElementById('cu-username')?.value.trim();
    const role  = document.getElementById('cu-role')?.value;
    const pw    = document.getElementById('cu-password')?.value;

    if (!first || !email || !uname || !pw) {
        toast('Please fill all required fields.', 'error'); return;
    }
    const btn = document.querySelector('[onclick="createUser()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
    try {
        await apiFetch('/api/admin/users', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name: `${first} ${last}`.trim(), email, username: uname, role, password: pw }),
        });
        toast(`User ${first} ${last} created.`);
        if (typeof closeModal === 'function') closeModal('modal-create-user');
        ['cu-firstname','cu-lastname','cu-email','cu-username','cu-password']
            .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        loadUsers();
        loadStatsAndActivity();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Create user'; }
    }
};

// ── Reset password ────────────────────────────────────────────────────────────
let __resetPasswordUserId = null;

window.openResetPassword = (id) => {
    __resetPasswordUserId = id;
    const input = document.getElementById('reset-pw-input');
    if (input) input.value = '';
    if (typeof openModal === 'function') openModal('modal-reset-password');
};

window.confirmResetPassword = async () => {
    const pw = document.getElementById('reset-pw-input')?.value;
    if (!pw || pw.length < 8) { toast('Password must be 8+ characters.', 'error'); return; }
    if (!__resetPasswordUserId) return;
    const btn = document.querySelector('[onclick="confirmResetPassword()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Resetting…'; }
    try {
        await apiFetch(`/api/admin/users/${__resetPasswordUserId}/reset-password`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ password: pw }),
        });
        toast('Password reset successfully.');
        if (typeof closeModal === 'function') closeModal('modal-reset-password');
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Reset password'; }
    }
};

// ── Boot ──────────────────────────────────────────────────────────────────────
Promise.all([
    loadStatsAndActivity(),
    loadPendingQueue(),
    loadUsers(),
    loadTasks(),
    loadAuditWidget(),
]);