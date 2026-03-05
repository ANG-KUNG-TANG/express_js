/**
 * tasks/list.js — my tasks list with filters, search, and proper delete modal
 */

import { requireAuth }  from '../../core/router.js';
import { apiFetch }     from '../../core/api.js';
import { initNavbar }   from '../../../components/navbar.js';
import { taskCard }     from '../../../components/taskCard.js';
import { toast }        from '../../core/toast.js';

requireAuth();
initNavbar();

const listEl   = document.getElementById('tasks-list');
const searchEl = document.getElementById('search-input');
const statusEl = document.getElementById('filter-status');
const typeEl   = document.getElementById('filter-type');
const examEl   = document.getElementById('filter-exam');

let searchTimer  = null;
let isLoading    = false;

// ---------------------------------------------------------------------------
// Inline confirm modal — no window.confirm()
// ---------------------------------------------------------------------------
function showDeleteModal(taskId, onConfirm) {
    // Remove any existing modal
    document.getElementById('delete-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'delete-modal';
    modal.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.45);
        display:flex;align-items:center;justify-content:center;
        z-index:9999;animation:fadeIn .15s ease;
    `;
    modal.innerHTML = `
        <div style="
            background:var(--surface);border:1px solid var(--border);
            border-radius:var(--radius-lg);padding:28px 32px;
            max-width:380px;width:90%;box-shadow:var(--shadow-lg);
        ">
            <h3 style="margin:0 0 8px;font-size:1.1rem;">Delete Task?</h3>
            <p style="color:var(--text2);font-size:.9rem;margin:0 0 24px;line-height:1.5;">
                This action cannot be undone. The task and all its content will be permanently removed.
            </p>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="modal-cancel" class="btn btn--ghost">Cancel</button>
                <button id="modal-confirm" class="btn btn--danger">Delete</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const cleanup = () => modal.remove();

    document.getElementById('modal-cancel').addEventListener('click', cleanup);
    modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });
    document.getElementById('modal-confirm').addEventListener('click', async () => {
        document.getElementById('modal-confirm').disabled = true;
        document.getElementById('modal-confirm').textContent = 'Deleting…';
        await onConfirm();
        cleanup();
    });
}

// ---------------------------------------------------------------------------
// Load tasks
// ---------------------------------------------------------------------------
const loadTasks = async () => {
    if (isLoading) return;
    isLoading = true;

    // Disable filters while loading
    [statusEl, typeEl, examEl, searchEl].forEach(el => el.disabled = true);
    listEl.innerHTML = '<p class="loading">Loading tasks…</p>';

    const params = new URLSearchParams();
    if (statusEl.value) params.set('status',   statusEl.value);
    if (typeEl.value)   params.set('taskType',  typeEl.value);
    if (examEl.value)   params.set('examType',  examEl.value);

    try {
        let res;
        const q = searchEl.value.trim();

        if (q) {
            params.set('q', q);
            res = await apiFetch(`/api/writing-tasks/search?${params}`);
        } else {
            res = await apiFetch(`/api/writing-tasks?${params}`);
        }

        const tasks = res?.data || [];
        listEl.innerHTML = tasks.length
            ? tasks.map(taskCard).join('')
            : '<p class="empty-state">No tasks found.</p>';

        // Attach delete listeners — uses API, no confirm()
        listEl.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', () => {
                showDeleteModal(btn.dataset.delete, async () => {
                    await deleteTask(btn.dataset.delete);
                });
            });
        });

    } catch (err) {
        listEl.innerHTML = '<p class="error-state">Failed to load tasks.</p>';
        toast(err.message, 'error');
    } finally {
        isLoading = false;
        [statusEl, typeEl, examEl, searchEl].forEach(el => el.disabled = false);
    }
};

// ---------------------------------------------------------------------------
// Delete task — calls DELETE API directly
// ---------------------------------------------------------------------------
const deleteTask = async (id) => {
    try {
        await apiFetch(`/api/writing-tasks/${id}`, { method: 'DELETE' });
        toast('Task deleted');
        loadTasks();
    } catch (err) {
        toast(err.message, 'error');
    }
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
statusEl.addEventListener('change', loadTasks);
typeEl.addEventListener('change',   loadTasks);
examEl.addEventListener('change',   loadTasks);

searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadTasks, 400);
});

loadTasks();