/**
 * js/pages/admin/dashboard.js
 * Admin dashboard — stats, pending review queue, recent activity,
 * user management, and task management. All on /api/admin/* endpoints.
 */

import { requireAdmin }  from '../../core/router.js';
import { apiFetch }     from '../../core/api.js';
import { initNavbar }   from '../../../components/navbar.js';
import { statusBadge }  from '../../../components/statusBadge.js';
import { toast }        from '../../core/toast.js';

requireAdmin('admin');
initNavbar();

const fmtTime = d => d ? new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}) : '—';

const roleBadge = r => {
    const cls = { admin: 'badge--admin', teacher: 'badge--teacher', user: 'badge--default', student: 'badge--default' };
    return `<span class="badge ${cls[r] ?? 'badge--default'}">${(r ?? '—').toUpperCase()}</span>`;
};

// Safe stat setter — never throws if a card is missing from DOM
const setStat = (id, value) => {
    const el = document.querySelector(`#${id} .stat-card__value`);
    if (el) el.textContent = value ?? '—';
};

// Inline confirm modal — replaces window.confirm() everywhere
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

// ── Stats + Activity (one /stats call covers both) ────────────────────────────
const loadStatsAndActivity = async () => {
    document.getElementById('activity-list').innerHTML = '<p class="loading">Loading…</p>';
    try {
        const { data: stats } = await apiFetch('/api/admin/stats');
        setStat('stat-total-users', stats.users?.total);
        setStat('stat-new-users',   stats.users?.newThisWeek);
        setStat('stat-teachers',    stats.users?.teachers);
        setStat('stat-pending',     stats.tasks?.submitted);
        renderActivity(stats.recent ?? []);
    } catch (err) {
        toast(err.message, 'error');
        document.getElementById('activity-list').innerHTML = '<p class="error-state">Failed to load stats.</p>';
    }
};

// ── Pending review queue ──────────────────────────────────────────────────────
const loadPendingQueue = async () => {
    const el = document.getElementById('pending-list');
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

// ── User management ───────────────────────────────────────────────────────────
const loadUsers = async (email = '') => {
    const el = document.getElementById('users-list');
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
            // backend may use 'user' or 'student' for the student role
            const isStudent  = role === 'user' || role === 'student';
            const hasTeacher = !!(u.assignedTeacher);
            const joined     = u.createdAt ?? u._createdAt;
            return `<tr data-id="${uid}">
                <td class="col-title">${u.name ?? u._name ?? '—'}</td>
                <td class="col-mono">${u.email ?? '—'}</td>
                <td>${roleBadge(role)}</td>
                <td>
                    <span
                        title="${uid}"
                        style="font-family:var(--font-mono,monospace);font-size:10px;
                               color:var(--text3,#94a3b8);cursor:pointer;
                               border:1px solid var(--border,#e2e8f0);border-radius:4px;
                               padding:2px 6px;white-space:nowrap;display:inline-block;
                               max-width:110px;overflow:hidden;text-overflow:ellipsis"
                        onclick="navigator.clipboard?.writeText('${uid}').then(()=>window.__toast?.('ID copied','success'))"
                    >${uid}</span>
                </td>
                <td style="font-size:.75rem">
                    ${hasTeacher
                        ? `<span style="color:var(--green,#16a34a);font-weight:600">Linked</span>`
                        : `<span style="color:var(--text3,#94a3b8)">—</span>`}
                </td>
                <td class="col-mono">${joined ? new Date(joined).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'}</td>
                <td class="actions-cell">
                    ${role !== 'admin' ? `<button class="btn btn--secondary btn--xs" data-action="promote"        data-id="${uid}">→ Admin</button>` : ''}
                    ${isStudent        ? `<button class="btn btn--info     btn--xs" data-action="assign-teacher" data-id="${uid}">→ Teacher</button>` : ''}
                    ${isStudent        ? `<button class="btn btn--xs" style="background:var(--green-dim,#dcfce7);color:var(--green,#16a34a);border-color:rgba(22,163,74,.3)"
                                            data-action="link-teacher" data-id="${uid}">Link teacher</button>` : ''}
                    ${isStudent && hasTeacher ? `<button class="btn btn--ghost btn--xs" data-action="unlink-teacher" data-id="${uid}">Unlink</button>` : ''}
                    ${role !== 'admin' ? `<button class="btn btn--danger   btn--xs" data-action="delete"         data-id="${uid}">Delete</button>` : ''}
                </td>
            </tr>`;
        }).join('')}
        </tbody>
    </table>`;

    el.querySelectorAll('[data-action]').forEach(btn =>
        btn.addEventListener('click', () => {
            const { action, id } = btn.dataset;
            if (action === 'promote')        promoteUser(id);
            if (action === 'assign-teacher') assignTeacherRole(id);
            if (action === 'link-teacher')   openLinkTeacherModal(id);
            if (action === 'unlink-teacher') unlinkTeacher(id);
            if (action === 'delete')         deleteUser(id);
        })
    );
};

// ── User actions — use modal, not confirm() ───────────────────────────────────
const promoteUser = (id) => {
    showConfirm({
        title: 'Promote to Admin?',
        message: 'This will give the user full admin access. This cannot be undone.',
        confirmLabel: 'Promote',
        onConfirm: async () => {
            try { await apiFetch(`/api/admin/users/${id}/promote`, { method: 'PATCH' }); toast('Promoted to Admin.'); loadUsers(); }
            catch (err) { toast(err.message, 'error'); }
        },
    });
};

const assignTeacherRole = (id) => {
    showConfirm({
        title: 'Assign Teacher role?',
        message: 'This user will be able to assign tasks and review student submissions.',
        confirmLabel: 'Assign',
        onConfirm: async () => {
            try { await apiFetch(`/api/admin/users/${id}/assign-teacher`, { method: 'PATCH' }); toast('Teacher role assigned.'); loadUsers(); }
            catch (err) { toast(err.message, 'error'); }
        },
    });
};

const unlinkTeacher = (studentId) => {
    showConfirm({
        title: 'Remove teacher link?',
        message: 'The student will no longer appear in their teacher\'s student list.',
        confirmLabel: 'Unlink',
        danger: true,
        onConfirm: async () => {
            try { await apiFetch(`/api/admin/users/${studentId}/unlink-teacher`, { method: 'PATCH' }); toast('Student unlinked.'); loadUsers(); }
            catch (err) { toast(err.message, 'error'); }
        },
    });
};

const deleteUser = (id) => {
    showConfirm({
        title: 'Delete this user?',
        message: 'This action cannot be undone. The user and all their data will be permanently removed.',
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
            try { await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }); toast('User deleted.'); loadUsers(); }
            catch (err) { toast(err.message, 'error'); }
        },
    });
};

const openLinkTeacherModal = async (studentId) => {
    document.getElementById('link-modal')?.remove();

    // Load teacher list first so we can show a dropdown
    let teachers = [];
    try {
        const { data } = await apiFetch('/api/admin/users');
        teachers = (data ?? []).filter(u => (u.role ?? u._role) === 'teacher');
    } catch {
        toast('Could not load teacher list.', 'error');
        return;
    }

    if (!teachers.length) {
        toast('No teachers found. Assign the teacher role to a user first.', 'error');
        return;
    }

    const options = teachers.map(t => {
        const tid  = t._id ?? t.id;
        const name = t.name ?? t._name ?? t.email;
        return `<option value="${tid}">${name} — ${t.email}</option>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'link-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = `
        <div style="background:var(--surface,#fff);border-radius:14px;padding:28px;width:100%;max-width:420px;box-shadow:0 8px 32px rgba(0,0,0,.15)">
            <h2 style="font-size:1.1rem;margin:0 0 6px">Link student to a teacher</h2>
            <p style="font-size:.82rem;color:var(--text2,#64748b);margin:0 0 20px">
                Select the teacher. The student will appear in their teacher's student list and
                the teacher can assign tasks to them.
            </p>
            <div class="form-group">
                <label class="form-label" style="display:block;margin-bottom:6px;font-size:12px;font-weight:600">
                    Select Teacher
                </label>
                <select id="link-teacher-select" class="select" style="width:100%;padding:9px 12px;border:1px solid var(--border,#e2e8f0);border-radius:8px;font-size:14px">
                    <option value="">— Choose a teacher —</option>
                    ${options}
                </select>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
                <button id="link-cancel"  class="btn btn--ghost btn--sm">Cancel</button>
                <button id="link-confirm" class="btn btn--primary btn--sm">Link</button>
            </div>
        </div>`;

    document.body.appendChild(modal);
    document.getElementById('link-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('link-confirm').addEventListener('click', async () => {
        const teacherId = document.getElementById('link-teacher-select').value;
        if (!teacherId) { toast('Please select a teacher.', 'error'); return; }
        const btn = document.getElementById('link-confirm');
        btn.disabled = true; btn.textContent = 'Linking…';
        try {
            await apiFetch(`/api/admin/users/${studentId}/link-teacher`, {
                method: 'PATCH', body: JSON.stringify({ teacherId }),
            });
            const name = teachers.find(t => (t._id ?? t.id) === teacherId)?.name ?? 'teacher';
            toast(`Student linked to ${name} successfully.`);
            modal.remove(); loadUsers();
        } catch (err) {
            toast(err.message, 'error');
            btn.disabled = false; btn.textContent = 'Link';
        }
    });
};

// ── Task management ───────────────────────────────────────────────────────────
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
document.getElementById('search-btn').addEventListener('click', () =>
    loadUsers(document.getElementById('search-email').value.trim()));
document.getElementById('search-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') loadUsers(document.getElementById('search-email').value.trim());
});
document.getElementById('clear-search-btn').addEventListener('click', () => {
    document.getElementById('search-email').value = ''; loadUsers();
});
document.getElementById('task-search').addEventListener('input', () => {
    clearTimeout(taskTimer); taskTimer = setTimeout(loadTasks, 400);
});
document.getElementById('task-status-filter').addEventListener('change', loadTasks);

// Expose toast globally for inline onclick handlers (e.g. copy ID)
window.__toast = toast;

// ── Boot ──────────────────────────────────────────────────────────────────────
Promise.all([loadStatsAndActivity(), loadPendingQueue(), loadUsers(), loadTasks()]);