import { requireAdmin } from '../../core/router.js';
import { apiFetch }     from '../../core/api.js';
import { initNavbar }   from '../../../components/navbar.js';
import { toast }        from '../../core/toast.js';

requireAdmin();
initNavbar();

const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';
const roleBadge = r => {
    const cls = { admin:'badge--admin', teacher:'badge--teacher', user:'badge--default' };
    return `<span class="badge ${cls[r]??'badge--default'}">${r.toUpperCase()}</span>`;
};

const loadUsers = async () => {
    const el = document.getElementById('users-list');
    el.innerHTML = '<p class="loading">Loading…</p>';
    try {
        const { data: users } = await apiFetch('/api/admin/users');
        renderUsers(users ?? []);
    } catch (err) {
        el.innerHTML = '<p class="error-state">Failed to load users.</p>';
        toast(err.message, 'error');
    }
};

const searchByEmail = async () => {
    const email = document.getElementById('search-email').value.trim();
    if (!email) { loadUsers(); return; }
    try {
        const { data: user } = await apiFetch(`/api/admin/users/email/${encodeURIComponent(email)}`);
        renderUsers(user ? [user] : []);
    } catch { document.getElementById('users-list').innerHTML = '<p class="empty-state">No user found with that email.</p>'; }
};

const renderUsers = (users) => {
    const el = document.getElementById('users-list');
    if (!users.length) { el.innerHTML = '<p class="empty-state">No users found.</p>'; return; }
    el.innerHTML = `<table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
        <tbody>${users.map(u => {
            const uid = u.id ?? u._id;
            const role = u.role ?? u._role;
            return `<tr data-id="${uid}">
                <td class="col-title">${u.name ?? u._name}</td>
                <td class="col-mono">${u.email}</td>
                <td>${roleBadge(role)}</td>
                <td class="col-mono">${fmt(u.createdAt ?? u._createdAt)}</td>
                <td class="actions-cell">
                    ${role !== 'admin' ? `<button class="btn btn--secondary btn--xs" data-action="promote"        data-id="${uid}">→ Admin</button>` : ''}
                    ${role === 'user'  ? `<button class="btn btn--info     btn--xs" data-action="assign-teacher" data-id="${uid}">→ Teacher</button>` : ''}
                    ${role !== 'admin' ? `<button class="btn btn--danger   btn--xs" data-action="delete"         data-id="${uid}">Delete</button>` : ''}
                </td>
            </tr>`;
        }).join('')}</tbody></table>`;

    el.querySelectorAll('[data-action]').forEach(btn =>
        btn.addEventListener('click', () => {
            const { action, id } = btn.dataset;
            if (action === 'promote')        promoteUser(id);
            if (action === 'assign-teacher') assignTeacher(id);
            if (action === 'delete')         deleteUser(id);
        })
    );
};

const promoteUser = async (id) => {
    if (!confirm('Promote to Admin?')) return;
    try { await apiFetch(`/api/admin/users/${id}/promote`, { method:'PATCH' }); toast('Promoted to Admin.'); loadUsers(); }
    catch (err) { toast(err.message, 'error'); }
};
const assignTeacher = async (id) => {
    if (!confirm('Assign Teacher role?')) return;
    try { await apiFetch(`/api/admin/users/${id}/assign-teacher`, { method:'PATCH' }); toast('Teacher assigned.'); loadUsers(); }
    catch (err) { toast(err.message, 'error'); }
};
const deleteUser = async (id) => {
    if (!confirm('Delete this user? Cannot be undone.')) return;
    try { await apiFetch(`/api/admin/users/${id}`, { method:'DELETE' }); toast('User deleted.'); loadUsers(); }
    catch (err) { toast(err.message, 'error'); }
};

document.getElementById('search-btn').addEventListener('click', searchByEmail);
document.getElementById('search-email').addEventListener('keydown', e => { if (e.key === 'Enter') searchByEmail(); });
document.getElementById('clear-search-btn').addEventListener('click', () => {
    document.getElementById('search-email').value = '';
    loadUsers();
});

loadUsers();