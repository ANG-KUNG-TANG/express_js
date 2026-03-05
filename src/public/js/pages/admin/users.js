/**
 * admin/users.js — list users, search by email, promote, delete
 *
 * Bugs fixed:
 *  1. import '../../../components/...' → '../../components/...' (wrong depth)
 *  2. import from '../../core/toasts.js' → '../../core/toast.js' (wrong filename)
 *  3. Endpoint '/api/list_users' doesn't exist → correct route is GET /api/users
 */

import { requireAdmin } from '../../core/router.js';
import { apiFetch }     from '../../core/api.js';

import { initNavbar }   from '../../components/navbar.js';

import { toast }        from '../../core/toast.js';

requireAdmin();
initNavbar();

const listEl    = document.getElementById('users-list');
const searchEl  = document.getElementById('search-email');
const searchBtn = document.getElementById('search-btn');

const loadUsers = async () => {
    listEl.innerHTML = '<p class="loading">Loading users…</p>';
    try {
        // ✅ FIX 3: correct endpoint is /api/users, not /api/list_users
        const res   = await apiFetch('/api/users');
        const users = res?.data || [];
        renderUsers(users);
    } catch (err) {
        listEl.innerHTML = '<p class="error-state">Failed to load users.</p>';
        toast(err.message, 'error');
    }
};

const searchByEmail = async () => {
    const email = searchEl.value.trim();
    if (!email) { loadUsers(); return; }
    try {
        const res  = await apiFetch(`/api/users/email/${encodeURIComponent(email)}`);
        const user = res?.data;
        renderUsers(user ? [user] : []);
    } catch {
        listEl.innerHTML = '<p class="empty-state">No user found with that email.</p>';
    }
};

const renderUsers = (users) => {
    if (!users.length) {
        listEl.innerHTML = '<p class="empty-state">No users found.</p>';
        return;
    }
    listEl.innerHTML = users.map(u => {
        const uid = u._id || u.id;
        return `
        <div class="user-row card" data-id="${uid}">
            <div class="user-row__info">
                <span class="user-row__name">${u.name}</span>
                <span class="user-row__email">${u.email}</span>
                <span class="badge ${u.role === 'ADMIN' ? 'badge--admin' : 'badge--default'}">${u.role}</span>
            </div>
            <div class="user-row__actions">
                ${u.role !== 'ADMIN'
                    ? `<button class="btn btn--secondary btn--sm" data-action="promote" data-id="${uid}">Promote to Admin</button>`
                    : '<span style="font-size:.75rem;color:var(--text3)">Admin</span>'}
                <button class="btn btn--danger btn--sm" data-action="delete" data-id="${uid}">Delete</button>
            </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.action === 'promote') promoteUser(btn.dataset.id);
            if (btn.dataset.action === 'delete')  deleteUser(btn.dataset.id);
        });
    });
};

const promoteUser = async (userId) => {
    if (!confirm('Promote this user to Admin?')) return;
    try {
        await apiFetch(`/api/users/${userId}/promote`, { method: 'PATCH' });
        toast('User promoted to Admin.');
        loadUsers();
    } catch (err) { toast(err.message, 'error'); }
};

const deleteUser = async (userId) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
        await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
        toast('User deleted.');
        loadUsers();
    } catch (err) { toast(err.message, 'error'); }
};

searchBtn.addEventListener('click', searchByEmail);
searchEl.addEventListener('keydown', e => { if (e.key === 'Enter') searchByEmail(); });

loadUsers();