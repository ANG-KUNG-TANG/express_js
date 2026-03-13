/**
 * admin/dashboard.js
 *
 * Powers all 5 panels of the admin dashboard:
 *   1. Stats bar          — GET /api/admin/stats
 *   2. Pending queue      — GET /api/admin/writing-tasks?status=SUBMITTED
 *   3. Recent activity    — from stats response (recent[])
 *   4. User management    — GET /api/admin/users  +  email search
 *   5. Task management    — GET /api/admin/writing-tasks  +  search + filter
 */

import { requireAdmin } from '../../core/router.js';
import { apiFetch }     from '../../core/api.js';
import { initNavbar }   from '../../components/navbar.js';
import { toast }        from '../../core/toast.js';

requireAdmin();
initNavbar();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (date) => date
    ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

const fmtTime = (date) => date
    ? new Date(date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

const statusBadge = (status) => {
    const map = {
        DRAFT:     'badge--default',
        SUBMITTED: 'badge--warning',
        REVIEWED:  'badge--info',
        SCORED:    'badge--success',
    };
    return `<span class="badge ${map[status] ?? 'badge--default'}">${status}</span>`;
};

const roleBadge = (role) => {
    const map = {
        admin:   'badge--admin',
        teacher: 'badge--teacher',
        user:    'badge--default',
    };
    return `<span class="badge ${map[role] ?? 'badge--default'}">${role.toUpperCase()}</span>`;
};

// ---------------------------------------------------------------------------
// Panel 1 — Stats Bar
// ---------------------------------------------------------------------------

const loadStats = async () => {
    try {
        const res   = await apiFetch('/api/admin/stats');
        const stats = res?.data;
        if (!stats) return;

        document.querySelector('#stat-total-users .stat-card__value').textContent = stats.users.total;
        document.querySelector('#stat-new-users  .stat-card__value').textContent = `+${stats.users.newThisWeek}`;
        document.querySelector('#stat-teachers   .stat-card__value').textContent = stats.users.teachers;
        document.querySelector('#stat-pending    .stat-card__value').textContent = stats.tasks.submitted;

        // Panel 3 — recent activity lives inside the stats response
        renderActivity(stats.recent ?? []);

    } catch (err) {
        toast(err.message, 'error');
    }
};

// ---------------------------------------------------------------------------
// Panel 2 — Pending Work Queue (SUBMITTED, oldest first)
// ---------------------------------------------------------------------------

const loadPendingQueue = async () => {
    const el = document.getElementById('pending-list');
    el.innerHTML = '<p class="loading">Loading…</p>';

    try {
        const res   = await apiFetch('/api/admin/writing-tasks?status=SUBMITTED');
        const tasks = res?.data ?? [];

        // Oldest first — most urgent at the top
        tasks.sort((a, b) => new Date(a.submittedAt ?? a.createdAt) - new Date(b.submittedAt ?? b.createdAt));

        if (!tasks.length) {
            el.innerHTML = '<p class="empty-state">🎉 No tasks pending review.</p>';
            return;
        }

        el.innerHTML = tasks.map(t => {
            const tid = t.id ?? t._id;
            return `
            <div class="queue-row">
                <div class="queue-row__info">
                    <span class="queue-row__title">${t._title ?? t.title}</span>
                    <span class="queue-row__meta">
                        ${t._taskType ?? t.taskType ?? '—'} &middot;
                        Submitted ${fmtTime(t._submittedAt ?? t.submittedAt ?? t.createdAt)}
                    </span>
                </div>
                <a href="/pages/admin/review.html?id=${tid}" class="btn btn--warning btn--sm">
                    Review
                </a>
            </div>`;
        }).join('');

    } catch (err) {
        el.innerHTML = '<p class="error-state">Failed to load pending tasks.</p>';
        toast(err.message, 'error');
    }
};

// ---------------------------------------------------------------------------
// Panel 3 — Recent Activity (rendered from stats response)
// ---------------------------------------------------------------------------

const renderActivity = (recent) => {
    const el = document.getElementById('activity-list');

    if (!recent.length) {
        el.innerHTML = '<p class="empty-state">No recent activity.</p>';
        return;
    }

    el.innerHTML = recent.map(t => `
        <div class="activity-row">
            <div class="activity-row__info">
                <span class="activity-row__title">${t.title}</span>
                <span class="activity-row__time">${fmtTime(t.updatedAt)}</span>
            </div>
            ${statusBadge(t.status)}
        </div>
    `).join('');
};

// ---------------------------------------------------------------------------
// Panel 4 — User Management
// ---------------------------------------------------------------------------

const loadUsers = async () => {
    const el = document.getElementById('users-list');
    el.innerHTML = '<p class="loading">Loading users…</p>';
    try {
        const res   = await apiFetch('/api/admin/users');
        const users = res?.data ?? [];
        renderUsers(users);
    } catch (err) {
        el.innerHTML = '<p class="error-state">Failed to load users.</p>';
        toast(err.message, 'error');
    }
};

const searchUserByEmail = async () => {
    const email = document.getElementById('search-email').value.trim();
    if (!email) { loadUsers(); return; }

    try {
        const res  = await apiFetch(`/api/admin/users/email/${encodeURIComponent(email)}`);
        const user = res?.data;
        renderUsers(user ? [user] : []);
    } catch {
        document.getElementById('users-list').innerHTML =
            '<p class="empty-state">No user found with that email.</p>';
    }
};

const renderUsers = (users) => {
    const el = document.getElementById('users-list');

    if (!users.length) {
        el.innerHTML = '<p class="empty-state">No users found.</p>';
        return;
    }

    el.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => {
                    const uid  = u.id ?? u._id;
                    const role = u.role ?? u._role;
                    return `
                    <tr data-id="${uid}">
                        <td>${u.name ?? u._name}</td>
                        <td>${u.email}</td>
                        <td>${roleBadge(role)}</td>
                        <td>${fmt(u.createdAt ?? u._createdAt)}</td>
                        <td class="actions-cell">
                            ${role !== 'admin' ? `
                                <button class="btn btn--secondary btn--xs"
                                    data-action="promote" data-id="${uid}">
                                    → Admin
                                </button>` : ''}
                            ${role === 'user' ? `
                                <button class="btn btn--info btn--xs"
                                    data-action="assign-teacher" data-id="${uid}">
                                    → Teacher
                                </button>` : ''}
                            ${role !== 'admin' ? `
                                <button class="btn btn--danger btn--xs"
                                    data-action="delete" data-id="${uid}">
                                    Delete
                                </button>` : ''}
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;

    el.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const { action, id } = btn.dataset;
            if (action === 'promote')        promoteUser(id);
            if (action === 'assign-teacher') assignTeacher(id);
            if (action === 'delete')         deleteUser(id);
        });
    });
};

const promoteUser = async (userId) => {
    if (!confirm('Promote this user to Admin? This cannot be undone.')) return;
    try {
        await apiFetch(`/api/admin/users/${userId}/promote`, { method: 'PATCH' });
        toast('User promoted to Admin.');
        loadUsers();
        loadStats();
    } catch (err) { toast(err.message, 'error'); }
};

const assignTeacher = async (userId) => {
    if (!confirm('Assign Teacher role to this user?')) return;
    try {
        await apiFetch(`/api/admin/users/${userId}/assign-teacher`, { method: 'PATCH' });
        toast('User assigned as Teacher.');
        loadUsers();
        loadStats();
    } catch (err) { toast(err.message, 'error'); }
};

const deleteUser = async (userId) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
        await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        toast('User deleted.');
        loadUsers();
        loadStats();
    } catch (err) { toast(err.message, 'error'); }
};

// ---------------------------------------------------------------------------
// Panel 5 — Task Management
// ---------------------------------------------------------------------------

let taskSearchTimer = null;

const loadTasks = async () => {
    const el     = document.getElementById('tasks-list');
    const q      = document.getElementById('task-search').value.trim();
    const status = document.getElementById('task-status-filter').value;

    el.innerHTML = '<p class="loading">Loading…</p>';

    try {
        let res;
        if (q) {
            const params = new URLSearchParams({ q });
            if (status) params.set('status', status);
            res = await apiFetch(`/api/admin/writing-tasks/search?${params}`);
        } else {
            const params = new URLSearchParams();
            if (status) params.set('status', status);
            res = await apiFetch(`/api/admin/writing-tasks?${params}`);
        }

        const tasks = res?.data ?? [];

        if (!tasks.length) {
            el.innerHTML = '<p class="empty-state">No tasks found.</p>';
            return;
        }

        el.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(t => {
                        const tid    = t.id ?? t._id;
                        const title  = t._title    ?? t.title;
                        const type   = t._taskType ?? t.taskType ?? '—';
                        const status = t._status   ?? t.status;
                        const upd    = t._updatedAt ?? t.updatedAt;

                        const actionBtn =
                            status === 'SUBMITTED' ? `<a href="/pages/admin/review.html?id=${tid}" class="btn btn--warning btn--xs">Review</a>` :
                            status === 'REVIEWED'  ? `<a href="/pages/admin/review.html?id=${tid}" class="btn btn--info btn--xs">Score</a>`    :
                            '';

                        return `
                        <tr>
                            <td>${title}</td>
                            <td>${type}</td>
                            <td>${statusBadge(status)}</td>
                            <td>${fmtTime(upd)}</td>
                            <td class="actions-cell">${actionBtn}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>`;

    } catch (err) {
        el.innerHTML = '<p class="error-state">Failed to load tasks.</p>';
        toast(err.message, 'error');
    }
};

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

// Panel 4 — user search
document.getElementById('search-btn').addEventListener('click', searchUserByEmail);
document.getElementById('search-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchUserByEmail();
});
document.getElementById('clear-search-btn').addEventListener('click', () => {
    document.getElementById('search-email').value = '';
    loadUsers();
});

// Panel 5 — task search + filter
document.getElementById('task-search').addEventListener('input', () => {
    clearTimeout(taskSearchTimer);
    taskSearchTimer = setTimeout(loadTasks, 400);
});
document.getElementById('task-status-filter').addEventListener('change', loadTasks);

// ---------------------------------------------------------------------------
// Initial load — all panels in parallel
// ---------------------------------------------------------------------------

Promise.all([
    loadStats(),        // panels 1 + 3
    loadPendingQueue(), // panel 2
    loadUsers(),        // panel 4
    loadTasks(),        // panel 5
]);