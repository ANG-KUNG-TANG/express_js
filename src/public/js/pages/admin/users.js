/**
 * js/pages/admin/users.js  — self-contained, no broken imports
 */

import { getUser, logOut } from '../../core/auth.js';
import { apiFetch }        from '../../core/api.js';
import { initAdminSidebar } from '../../../components/admin_sidebar.js';

// ── Auth guard ────────────────────────────────────────────────────────────────
const _user = getUser();
if (!_user || _user.role !== 'admin') {
    window.location.replace('/pages/auth/login.html');
}

initAdminSidebar();

// ── Toast ─────────────────────────────────────────────────────────────────────
const toast = (msg, type = 'success') => {
    const t    = document.getElementById('toast');
    const icon = document.querySelector('#toast .t-icon');
    const text = document.getElementById('toast-msg');
    if (!t) return;
    if (text) text.textContent = msg;
    if (icon) { icon.textContent = type === 'error' ? '✕' : '✓'; icon.style.color = type === 'error' ? 'var(--red)' : 'var(--green)'; }
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
};

// ── Confirm modal ─────────────────────────────────────────────────────────────
const showConfirm = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm }) => {
    document.getElementById('_adm-modal')?.remove();
    const m = document.createElement('div');
    m.id = '_adm-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(3px)';
    m.innerHTML = `
        <div style="background:var(--surface);border:1px solid var(--border-hi);border-radius:16px;padding:28px 30px;max-width:420px;width:90%;box-shadow:0 24px 64px rgba(0,0,0,.4)">
            <h3 style="margin:0 0 8px;font-size:1rem;color:var(--text)">${title}</h3>
            <p style="color:var(--text3);font-size:.85rem;margin:0 0 22px;line-height:1.5">${message}</p>
            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button id="_mc-cancel" class="btn btn--ghost btn--sm">Cancel</button>
                <button id="_mc-confirm" class="btn ${danger ? 'btn--danger' : 'btn--primary'} btn--sm">${confirmLabel}</button>
            </div>
        </div>`;
    document.body.appendChild(m);
    const cleanup = () => m.remove();
    document.getElementById('_mc-cancel').onclick = cleanup;
    m.onclick = e => { if (e.target === m) cleanup(); };
    document.getElementById('_mc-confirm').onclick = async () => {
        document.getElementById('_mc-confirm').disabled = true;
        document.getElementById('_mc-confirm').textContent = 'Please wait…';
        await onConfirm();
        cleanup();
    };
};

// ── Input modal ───────────────────────────────────────────────────────────────
const showInputModal = ({ title, message, placeholder = '', confirmLabel = 'Confirm', validate }) =>
    new Promise(resolve => {
        document.getElementById('_adm-modal')?.remove();
        const m = document.createElement('div');
        m.id = '_adm-modal';
        m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(3px)';
        m.innerHTML = `
            <div style="background:var(--surface);border:1px solid var(--border-hi);border-radius:16px;padding:28px 30px;max-width:420px;width:90%;box-shadow:0 24px 64px rgba(0,0,0,.4)">
                <h3 style="margin:0 0 8px;font-size:1rem;color:var(--text)">${title}</h3>
                <p style="color:var(--text3);font-size:.85rem;margin:0 0 14px;line-height:1.5">${message}</p>
                <input id="_modal-input" class="input input--sm" style="width:100%;margin-bottom:6px" placeholder="${placeholder}" />
                <p id="_modal-err" style="font-size:.75rem;color:var(--red);min-height:18px;margin-bottom:14px"></p>
                <div style="display:flex;gap:10px;justify-content:flex-end">
                    <button id="_mc-cancel" class="btn btn--ghost btn--sm">Cancel</button>
                    <button id="_mc-confirm" class="btn btn--primary btn--sm">${confirmLabel}</button>
                </div>
            </div>`;
        document.body.appendChild(m);
        document.getElementById('_mc-cancel').onclick = () => { m.remove(); resolve(null); };
        m.onclick = e => { if (e.target === m) { m.remove(); resolve(null); } };
        document.getElementById('_mc-confirm').onclick = () => {
            const val = document.getElementById('_modal-input').value.trim();
            if (validate) { const err = validate(val); if (err) { document.getElementById('_modal-err').textContent = err; return; } }
            m.remove(); resolve(val);
        };
        setTimeout(() => document.getElementById('_modal-input')?.focus(), 50);
    });

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const roleBadge = r => {
    const cls = { admin: 'badge--admin', teacher: 'badge--teacher', user: 'badge--default', student: 'badge--default' };
    return `<span class="badge ${cls[r] ?? 'badge--default'}">${(r ?? '—').toUpperCase()}</span>`;
};

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── API helpers ───────────────────────────────────────────────────────────────
const api = (path, opts = {}) => apiFetch(path, opts);

// ── Load users ────────────────────────────────────────────────────────────────
const loadUsers = async (email = '') => {
    const el = document.getElementById('users-list');
    if (!el) return;
    el.innerHTML = '<p class="loading" style="text-align:center;padding:32px">Loading…</p>';
    try {
        let users;
        if (email) {
            const res = await api(`/api/admin/users/email/${encodeURIComponent(email)}`);
            const u   = res?.data ?? res;
            users     = u ? [u] : [];
        } else {
            const res = await api('/api/admin/users');
            users     = res?.data ?? res ?? [];
        }
        renderUsers(Array.isArray(users) ? users : []);
    } catch (err) {
        el.innerHTML = `<p class="error-state" style="text-align:center;padding:32px;color:var(--red)">Failed to load users: ${esc(err.message)}</p>`;
    }
};

// ── Render ────────────────────────────────────────────────────────────────────
const renderUsers = (users) => {
    const el = document.getElementById('users-list');
    if (!users.length) {
        el.innerHTML = '<p class="empty-state" style="text-align:center;padding:32px;color:var(--text3)">No users found.</p>';
        return;
    }
    el.innerHTML = `
        <div style="overflow-x:auto">
        <table class="data-table">
            <thead><tr>
                <th>Name</th><th>Email</th><th>Role</th>
                <th>Teacher linked</th><th>Joined</th><th>Actions</th>
            </tr></thead>
            <tbody>
            ${users.map(u => {
                const uid  = u.id ?? u._id;
                const role = u.role ?? u._role ?? 'user';
                const isStudent  = role === 'user' || role === 'student';
                const hasTeacher = !!(u.assignedTeacher ?? u._assignedTeacher);
                return `
                <tr data-id="${esc(uid)}">
                    <td class="col-title">${esc(u.name ?? u._name ?? u.username ?? '—')}</td>
                    <td class="col-mono" style="font-size:12px">${esc(u.email ?? '—')}</td>
                    <td>${roleBadge(role)}</td>
                    <td style="font-size:.8rem">
                        ${hasTeacher
                            ? `<span style="color:var(--green);font-weight:600">✓ Linked</span>`
                            : `<span style="color:var(--text3)">—</span>`}
                    </td>
                    <td class="col-mono" style="font-size:12px">${fmt(u.createdAt ?? u._createdAt)}</td>
                    <td class="actions-cell">
                        ${role !== 'admin'  ? `<button class="btn btn--secondary btn--xs" data-action="promote" data-id="${esc(uid)}">→ Admin</button>` : ''}
                        ${isStudent         ? `<button class="btn btn--info btn--xs" data-action="assign-teacher" data-id="${esc(uid)}">→ Teacher</button>` : ''}
                        ${isStudent         ? `<button class="btn btn--ghost btn--xs" style="color:var(--green);border-color:rgba(5,150,105,.3)" data-action="link-teacher" data-id="${esc(uid)}">Link teacher</button>` : ''}
                        ${isStudent && hasTeacher ? `<button class="btn btn--ghost btn--xs" data-action="unlink-teacher" data-id="${esc(uid)}">Unlink</button>` : ''}
                        ${role !== 'admin'  ? `<button class="btn btn--danger btn--xs" data-action="delete" data-id="${esc(uid)}">Delete</button>` : ''}
                    </td>
                </tr>`;
            }).join('')}
            </tbody>
        </table>
        </div>`;

    el.querySelectorAll('[data-action]').forEach(btn =>
        btn.addEventListener('click', () => {
            const { action, id } = btn.dataset;
            if (action === 'promote')        promoteUser(id);
            if (action === 'assign-teacher') assignTeacherRole(id);
            if (action === 'link-teacher')   linkTeacher(id);
            if (action === 'unlink-teacher') unlinkTeacher(id);
            if (action === 'delete')         deleteUser(id);
        })
    );
};

// ── Actions ───────────────────────────────────────────────────────────────────
const promoteUser = id => showConfirm({
    title: 'Promote to Admin?', danger: true, confirmLabel: 'Promote',
    message: 'This user will have full admin access. This cannot be undone.',
    onConfirm: async () => {
        try { await api(`/api/admin/users/${id}/promote`, { method: 'PATCH' }); toast('User promoted to Admin.'); loadUsers(); }
        catch (e) { toast(e.message, 'error'); }
    },
});

const assignTeacherRole = id => showConfirm({
    title: 'Assign Teacher role?', confirmLabel: 'Assign teacher',
    message: 'This user will become a teacher and can review student submissions.',
    onConfirm: async () => {
        try { await api(`/api/admin/users/${id}/assign-teacher`, { method: 'PATCH' }); toast('Teacher role assigned.'); loadUsers(); }
        catch (e) { toast(e.message, 'error'); }
    },
});

const linkTeacher = async (studentId) => {
    // Load teacher list for a dropdown
    let teachers = [];
    try {
        const res = await api('/api/admin/users');
        teachers  = (res?.data ?? res ?? []).filter(u => (u.role ?? u._role) === 'teacher');
    } catch { toast('Could not load teacher list.', 'error'); return; }

    if (!teachers.length) { toast('No teachers found. Assign a teacher role first.', 'error'); return; }

    const options = teachers.map(t => {
        const tid  = t._id ?? t.id;
        const name = t.name ?? t._name ?? t.email;
        return `<option value="${esc(tid)}">${esc(name)} — ${esc(t.email)}</option>`;
    }).join('');

    document.getElementById('_adm-modal')?.remove();
    const m = document.createElement('div');
    m.id = '_adm-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(3px)';
    m.innerHTML = `
        <div style="background:var(--surface);border:1px solid var(--border-hi);border-radius:16px;padding:28px 30px;max-width:440px;width:90%;box-shadow:0 24px 64px rgba(0,0,0,.4)">
            <h3 style="margin:0 0 8px;font-size:1rem;color:var(--text)">Link student to a teacher</h3>
            <p style="color:var(--text3);font-size:.85rem;margin:0 0 14px;line-height:1.5">
                Select the teacher. The student will appear in their teacher's student list.
            </p>
            <select id="_link-select" class="input input--sm" style="width:100%;margin-bottom:20px">
                <option value="">— Choose a teacher —</option>
                ${options}
            </select>
            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button id="_mc-cancel" class="btn btn--ghost btn--sm">Cancel</button>
                <button id="_mc-confirm" class="btn btn--primary btn--sm">Link</button>
            </div>
        </div>`;
    document.body.appendChild(m);
    document.getElementById('_mc-cancel').onclick = () => m.remove();
    m.onclick = e => { if (e.target === m) m.remove(); };
    document.getElementById('_mc-confirm').onclick = async () => {
        const teacherId = document.getElementById('_link-select').value;
        if (!teacherId) { toast('Please select a teacher.', 'error'); return; }
        const btn = document.getElementById('_mc-confirm');
        btn.disabled = true; btn.textContent = 'Linking…';
        try {
            await api(`/api/admin/users/${studentId}/link-teacher`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherId }),
            });
            toast('Student linked to teacher successfully.');
            m.remove(); loadUsers();
        } catch (e) { toast(e.message, 'error'); btn.disabled = false; btn.textContent = 'Link'; }
    };
};

const unlinkTeacher = id => showConfirm({
    title: 'Unlink student from teacher?', danger: true, confirmLabel: 'Unlink',
    message: 'The student will no longer appear in their teacher\'s student list.',
    onConfirm: async () => {
        try { await api(`/api/admin/users/${id}/unlink-teacher`, { method: 'PATCH' }); toast('Student unlinked.'); loadUsers(); }
        catch (e) { toast(e.message, 'error'); }
    },
});

const deleteUser = id => showConfirm({
    title: 'Delete this user?', danger: true, confirmLabel: 'Delete',
    message: 'All their data will be permanently removed. This cannot be undone.',
    onConfirm: async () => {
        try { await api(`/api/admin/users/${id}`, { method: 'DELETE' }); toast('User deleted.'); loadUsers(); }
        catch (e) { toast(e.message, 'error'); }
    },
});

// ── Search events ─────────────────────────────────────────────────────────────
document.getElementById('search-btn')?.addEventListener('click', () =>
    loadUsers(document.getElementById('search-email')?.value.trim() ?? ''));
document.getElementById('search-email')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') loadUsers(document.getElementById('search-email').value.trim());
});
document.getElementById('clear-search-btn')?.addEventListener('click', () => {
    document.getElementById('search-email').value = ''; loadUsers();
});

loadUsers();