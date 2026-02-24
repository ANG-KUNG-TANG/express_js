// public/js/pages/dashboard.js
import { taskAPI, userAPI, authAPI } from '../api.js';
import { store } from '../store.js';

// ── Auth guard ────────────────────────────────────────────────────────────────
store.rehydrate();
if (!store.isLoggedIn()) {
    window.location.replace('/pages/login.html');
}

// ── Normalise API response shape ──────────────────────────────────────────────
// Backend wraps in { success, data: ... } via sendSuccess()
function unwrap(res) {
    const d = res.data ?? res;
    return Array.isArray(d) ? d : d;
}
function unwrapArray(res) {
    const d = res.data ?? res;
    return Array.isArray(d) ? d : (d.items ?? d.tasks ?? d.users ?? []);
}

// ── State ─────────────────────────────────────────────────────────────────────
let allTasks     = [];
let allUsers     = [];
let activeFilter = 'all';
const token      = () => store.get('accessToken');

// ── DOM ───────────────────────────────────────────────────────────────────────
const modalOverlay = document.getElementById('modal-overlay');
const modal        = document.getElementById('modal');
const alertEl      = document.getElementById('task-alert');
const searchInput  = document.getElementById('task-search');
const countLabel   = document.getElementById('task-count-label');
const emptyState   = document.getElementById('empty-tasks');
const loadingSkel  = document.getElementById('task-loading');
const kanbanBoard  = document.getElementById('kanban-board');
const colCards     = { pending: document.getElementById('col-pending'), in_progress: document.getElementById('col-in_progress'), done: document.getElementById('col-done') };
const colCounts    = { pending: document.getElementById('count-pending'), in_progress: document.getElementById('count-in_progress'), done: document.getElementById('count-done') };

// ── User info ─────────────────────────────────────────────────────────────────
function renderUserInfo() {
    const user = store.get('user');
    if (!user) return;
    const initials = (user.name || user.email || 'U').slice(0, 2).toUpperCase();
    document.getElementById('user-avatar').textContent       = initials;
    document.getElementById('user-name').textContent         = user.name || user.email || 'User';
    document.getElementById('user-role').textContent         = user.role || '';
    document.getElementById('profile-avatar-lg').textContent = initials;
    document.getElementById('profile-name').value            = user.name  || '';
    document.getElementById('profile-email').value           = user.email || '';
    document.getElementById('profile-role-field').value      = user.role  || '';
}
renderUserInfo();

// ── View switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.view').forEach(v => {
            const match = v.id === `view-${item.dataset.view}`;
            v.classList.toggle('active', match);
            v.classList.toggle('hidden', !match);
        });
    });
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', async () => {
    try { await authAPI.logout(token()); } catch (_) {}
    // refreshToken cookie cleared by server; we clear accessToken from localStorage
    store.clearSession();
    window.location.replace('/pages/login.html');
});

// ── Alerts ────────────────────────────────────────────────────────────────────
function showAlert(msg, type = 'error') {
    alertEl.textContent = msg;
    alertEl.className   = `alert alert-${type}`;
    alertEl.classList.remove('hidden');
    if (type !== 'error') setTimeout(() => alertEl.classList.add('hidden'), 3500);
}

// ── XSS escape ───────────────────────────────────────────────────────────────
function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Task helpers ──────────────────────────────────────────────────────────────
function tid(t) { return t._id || t.id; }

function statusBadge(s) {
    const cls   = { pending:'badge-pending', in_progress:'badge-progress', done:'badge-done', completed:'badge-done' };
    const label = { pending:'Pending', in_progress:'In Progress', done:'Done', completed:'Done' };
    return `<span class="badge ${cls[s]||'badge-pending'}">${label[s]||s||'Pending'}</span>`;
}
function priorityBadge(p) {
    return p ? `<span class="badge badge-${p}">${p}</span>` : '';
}
function dueLabel(d) {
    if (!d) return '';
    const date = new Date(d);
    const over = date < new Date();
    return `<span class="task-due${over?' overdue':''}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${date.toLocaleDateString(undefined,{month:'short',day:'numeric'})}
    </span>`;
}

function taskCardHTML(task) {
    const id     = tid(task);
    const status = task.status === 'completed' ? 'done' : (task.status || 'pending');
    return `
    <div class="task-card" data-id="${esc(id)}">
        <div class="task-card-top"><h3 class="task-title">${esc(task.title)}</h3></div>
        ${task.description ? `<p class="task-desc">${esc(task.description)}</p>` : ''}
        <div class="task-meta">
            ${statusBadge(status)}${priorityBadge(task.priority)}${dueLabel(task.dueDate)}
        </div>
        <div class="task-card-actions">
            ${status==='pending'     ? `<button class="btn btn-sm btn-outline" data-action="start"    data-id="${esc(id)}">▶ Start</button>`   : ''}
            ${status==='in_progress' ? `<button class="btn btn-sm btn-primary" data-action="complete" data-id="${esc(id)}">✓ Done</button>`    : ''}
            <button class="btn btn-sm btn-ghost"  data-action="edit"     data-id="${esc(id)}">Edit</button>
            <button class="btn btn-sm btn-ghost"  data-action="transfer" data-id="${esc(id)}">Transfer</button>
            <button class="btn btn-sm btn-danger" data-action="delete"   data-id="${esc(id)}">Delete</button>
        </div>
    </div>`;
}

// ── Render board ──────────────────────────────────────────────────────────────
function renderBoard(tasks) {
    const normalized = tasks.map(t => ({
        ...t, status: t.status === 'completed' ? 'done' : (t.status || 'pending')
    }));
    const filtered = activeFilter === 'all' ? normalized : normalized.filter(t => t.status === activeFilter);

    Object.values(colCards).forEach(el  => { el.innerHTML = ''; });
    Object.values(colCounts).forEach(el => { el.textContent = '0'; });

    if (!filtered.length) {
        emptyState.classList.remove('hidden');
        kanbanBoard.classList.add('hidden');
        countLabel.textContent = 'No tasks';
        return;
    }
    emptyState.classList.add('hidden');
    kanbanBoard.classList.remove('hidden');

    const buckets = { pending:[], in_progress:[], done:[] };
    filtered.forEach(t => (buckets[t.status] || buckets.pending).push(t));

    ['pending','in_progress','done'].forEach(s => {
        colCards[s].innerHTML    = buckets[s].map(taskCardHTML).join('');
        colCounts[s].textContent = buckets[s].length;
    });
    countLabel.textContent = `${filtered.length} task${filtered.length !== 1 ? 's' : ''}`;
}

// ── Load data ─────────────────────────────────────────────────────────────────
async function loadTasks() {
    loadingSkel.classList.remove('hidden');
    kanbanBoard.classList.add('hidden');
    emptyState.classList.add('hidden');
    try {
        const res = await taskAPI.listAll(token());
        allTasks  = unwrapArray(res);
        renderBoard(allTasks);
    } catch (err) {
        showAlert(err.message || 'Failed to load tasks.');
    } finally {
        loadingSkel.classList.add('hidden');
    }
}

async function loadUsers() {
    try {
        const res = await userAPI.list(token());
        allUsers  = unwrapArray(res);
    } catch (_) { allUsers = []; }
}

loadTasks();
loadUsers();

// ── Search ────────────────────────────────────────────────────────────────────
let searchTimer;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
        const q = searchInput.value.trim();
        if (!q) return renderBoard(allTasks);
        try {
            const res = await taskAPI.search(q, token());
            renderBoard(unwrapArray(res));
        } catch (_) {}
    }, 350);
});

// ── Filter ────────────────────────────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderBoard(allTasks);
    });
});

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(html) {
    modal.innerHTML = html;
    modalOverlay.classList.remove('hidden');
    setTimeout(() => modal.querySelector('input,textarea,select')?.focus(), 50);
}
function closeModal() {
    modalOverlay.classList.add('hidden');
    modal.innerHTML = '';
}
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown',   e => { if (e.key === 'Escape') closeModal(); });

function showModalError(msg) {
    const el = modal.querySelector('#modal-error');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}
function setModalBtnLoading(btn, on) {
    btn.disabled = on;
    btn.querySelector('.btn-label')?.classList.toggle('hidden', on);
    btn.querySelector('.btn-loader')?.classList.toggle('hidden', !on);
}

// ── Task form template ────────────────────────────────────────────────────────
function taskFormHTML(label, task = {}) {
    return `
    <div class="modal-header">
        <h2>${esc(label)}</h2>
        <button class="modal-close" id="modal-close-btn">✕</button>
    </div>
    <div id="modal-error" class="alert alert-error hidden"></div>
    <form id="modal-task-form">
        <div class="field">
            <label>Title *</label>
            <input type="text" name="title" value="${esc(task.title||'')}" placeholder="What needs to be done?" required>
        </div>
        <div class="field">
            <label>Description</label>
            <textarea name="description" placeholder="Optional details…">${esc(task.description||'')}</textarea>
        </div>
        <div class="field">
            <label>Due Date</label>
            <input type="date" name="dueDate" value="${task.dueDate?task.dueDate.split('T')[0]:''}">
        </div>
        <div class="field">
            <label>Priority</label>
            <select name="priority">
                <option value="">— No priority —</option>
                <option value="LOW"    ${task.priority==='LOW'    ?'selected':''}>Low</option>
                <option value="MEDIUM" ${task.priority==='MEDIUM' ?'selected':''}>Medium</option>
                <option value="HIGH"   ${task.priority==='HIGH'   ?'selected':''}>High</option>
            </select>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-ghost" id="modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">
                <span class="btn-label">${esc(label)}</span>
                <span class="btn-loader hidden"></span>
            </button>
        </div>
    </form>`;
}

function bindModalClose() {
    modal.querySelector('#modal-close-btn')?.addEventListener('click', closeModal);
    modal.querySelector('#modal-cancel')?.addEventListener('click',    closeModal);
}

// ── Create ────────────────────────────────────────────────────────────────────
function openCreateModal() {
    openModal(taskFormHTML('Create Task'));
    bindModalClose();
    modal.querySelector('#modal-task-form').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        const payload = {
            title:       f.title.value.trim(),
            description: f.description.value.trim() || undefined,
            dueDate:     f.dueDate.value || undefined,
            priority:    f.priority.value || undefined,
        };
        if (!payload.title) return showModalError('Title is required.');
        const sb = f.querySelector('button[type=submit]');
        setModalBtnLoading(sb, true);
        try {
            const res  = await taskAPI.create(payload, token());
            const task = unwrap(res);
            allTasks.unshift(Array.isArray(task) ? task[0] : task);
            renderBoard(allTasks);
            closeModal();
            showAlert('Task created!', 'success');
        } catch (err) {
            showModalError(err.message || 'Failed to create task.');
        } finally {
            setModalBtnLoading(sb, false);
        }
    });
}

// ── Edit ──────────────────────────────────────────────────────────────────────
function openEditModal(id) {
    const task = allTasks.find(t => tid(t) === id);
    if (!task) return;
    openModal(taskFormHTML('Save Changes', task));
    bindModalClose();
    modal.querySelector('#modal-task-form').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        const payload = {
            title:       f.title.value.trim(),
            description: f.description.value.trim() || undefined,
            dueDate:     f.dueDate.value || undefined,
            priority:    f.priority.value || undefined,
        };
        if (!payload.title) return showModalError('Title is required.');
        const sb = f.querySelector('button[type=submit]');
        setModalBtnLoading(sb, true);
        try {
            const res     = await taskAPI.update(id, payload, token());
            const updated = unwrap(res);
            allTasks      = allTasks.map(t => tid(t) === id ? (Array.isArray(updated)?updated[0]:updated) : t);
            renderBoard(allTasks);
            closeModal();
            showAlert('Task updated!', 'success');
        } catch (err) {
            showModalError(err.message || 'Failed to update.');
        } finally {
            setModalBtnLoading(sb, false);
        }
    });
}

// ── Delete ────────────────────────────────────────────────────────────────────
function openDeleteModal(id) {
    const task = allTasks.find(t => tid(t) === id);
    openModal(`
    <div class="modal-header">
        <h2>Delete Task</h2>
        <button class="modal-close" id="modal-close-btn">✕</button>
    </div>
    <p style="color:var(--c-text-2);margin-bottom:var(--space-5)">
        Delete <strong>${esc(task?.title||'this task')}</strong>? This cannot be undone.
    </p>
    <div id="modal-error" class="alert alert-error hidden"></div>
    <div class="modal-footer">
        <button type="button" class="btn btn-ghost" id="modal-cancel">Cancel</button>
        <button type="button" id="confirm-delete" class="btn btn-primary" style="background:var(--c-red);border-color:var(--c-red)">
            <span class="btn-label">Delete</span><span class="btn-loader hidden"></span>
        </button>
    </div>`);
    bindModalClose();
    modal.querySelector('#confirm-delete').addEventListener('click', async e => {
        setModalBtnLoading(e.currentTarget, true);
        try {
            await taskAPI.delete(id, token());
            allTasks = allTasks.filter(t => tid(t) !== id);
            renderBoard(allTasks);
            closeModal();
            showAlert('Task deleted.', 'info');
        } catch (err) {
            showModalError(err.message || 'Delete failed.');
            setModalBtnLoading(e.currentTarget, false);
        }
    });
}

// ── Transfer ──────────────────────────────────────────────────────────────────
function openTransferModal(id) {
    const task    = allTasks.find(t => tid(t) === id);
    const me      = store.get('user');
    const options = allUsers
        .filter(u => (u._id||u.id) !== (me?._id||me?.id))
        .map(u => `<option value="${esc(u._id||u.id)}">${esc(u.name||u.email)}</option>`)
        .join('');

    openModal(`
    <div class="modal-header">
        <h2>Transfer Task</h2>
        <button class="modal-close" id="modal-close-btn">✕</button>
    </div>
    <p class="text-muted" style="margin-bottom:var(--space-5)">
        Transferring: <strong>${esc(task?.title||'')}</strong>
    </p>
    <div id="modal-error" class="alert alert-error hidden"></div>
    <div class="field">
        <label>Assign to</label>
        <select id="transfer-select">
            <option value="">— Select a user —</option>
            ${options || '<option disabled>No other users found</option>'}
        </select>
    </div>
    <div class="modal-footer">
        <button type="button" class="btn btn-ghost" id="modal-cancel">Cancel</button>
        <button type="button" id="confirm-transfer" class="btn btn-primary">
            <span class="btn-label">Transfer</span><span class="btn-loader hidden"></span>
        </button>
    </div>`);
    bindModalClose();
    modal.querySelector('#confirm-transfer').addEventListener('click', async e => {
        const toUserId = modal.querySelector('#transfer-select').value;
        if (!toUserId) return showModalError('Please select a user.');
        setModalBtnLoading(e.currentTarget, true);
        try {
            // transferTaskController expects { fromUserId, toUserId }
            const me = store.get('user');
            const res = await taskAPI.transfer({ fromUserId: me?._id||me?.id, toUserId }, token());
            closeModal();
            await loadTasks(); // reload — transfer moves ALL tasks between users
            showAlert('Task transferred!', 'success');
        } catch (err) {
            showModalError(err.message || 'Transfer failed.');
            setModalBtnLoading(e.currentTarget, false);
        }
    });
}

// ── Card action buttons (delegated) ──────────────────────────────────────────
kanbanBoard.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === 'edit')     return openEditModal(id);
    if (action === 'delete')   return openDeleteModal(id);
    if (action === 'transfer') return openTransferModal(id);

    if (action === 'start' || action === 'complete') {
        btn.disabled = true;
        try {
            const res     = action === 'start'
                ? await taskAPI.start(id, token())
                : await taskAPI.complete(id, token());
            const updated = unwrap(res);
            allTasks      = allTasks.map(t => tid(t) === id ? (Array.isArray(updated)?updated[0]:updated) : t);
            renderBoard(allTasks);
        } catch (err) {
            showAlert(err.message || `Failed to ${action} task.`);
            btn.disabled = false;
        }
    }
});

// ── New task buttons ──────────────────────────────────────────────────────────
document.getElementById('btn-new-task').addEventListener('click', openCreateModal);
document.getElementById('btn-empty-create').addEventListener('click', openCreateModal);

// ── Profile form ──────────────────────────────────────────────────────────────
document.getElementById('profile-form').addEventListener('submit', async e => {
    e.preventDefault();
    const profileAlert = document.getElementById('profile-alert');
    const submitBtn    = e.target.querySelector('button[type=submit]');
    const user         = store.get('user');
    const payload      = { name: e.target.name.value.trim() };
    if (!payload.name) return;

    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-label').classList.add('hidden');
    submitBtn.querySelector('.btn-loader').classList.remove('hidden');
    profileAlert.classList.add('hidden');

    try {
        // PUT /api/users/:id
        const res     = await userAPI.update(user._id || user.id, payload, token());
        const updated = unwrap(res);
        const newUser = Array.isArray(updated) ? updated[0] : updated;
        store.setSession({ user: { ...user, ...newUser }, accessToken: token() });
        renderUserInfo();
        profileAlert.textContent = '✓ Profile updated.';
        profileAlert.className   = 'alert alert-success';
        profileAlert.classList.remove('hidden');
        setTimeout(() => profileAlert.classList.add('hidden'), 3000);
    } catch (err) {
        profileAlert.textContent = err.message || 'Update failed.';
        profileAlert.className   = 'alert alert-error';
        profileAlert.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-label').classList.remove('hidden');
        submitBtn.querySelector('.btn-loader').classList.add('hidden');
    }
});