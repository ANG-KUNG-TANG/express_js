/**
 * tasks/list.js — my tasks list with filters, search, delete modal,
 * and teacher-assignment accept / decline flow.
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

let searchTimer = null;
let isLoading   = false;

// ---------------------------------------------------------------------------
// Inline confirm modal — no window.confirm()
// ---------------------------------------------------------------------------
function showDeleteModal(taskId, onConfirm) {
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
                <button id="modal-cancel"  class="btn btn--ghost">Cancel</button>
                <button id="modal-confirm" class="btn btn--danger">Delete</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const cleanup = () => modal.remove();

    document.getElementById('modal-cancel').addEventListener('click', cleanup);
    modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });
    document.getElementById('modal-confirm').addEventListener('click', async () => {
        document.getElementById('modal-confirm').disabled    = true;
        document.getElementById('modal-confirm').textContent = 'Deleting…';
        await onConfirm();
        cleanup();
    });
}

// ---------------------------------------------------------------------------
// Accept / Decline assignment  ← NEW
// Called when a student clicks Accept or Decline on a teacher-assigned task.
// ---------------------------------------------------------------------------
const respondAssignment = async (taskId, action) => {
    // action must be 'accept' or 'decline' (matches respond_assignment.uc.js)
    listEl.querySelectorAll(`[data-respond="${taskId}"]`).forEach(btn => {
        btn.disabled = true;
    });

    if (action === 'decline') {
        // Ask for a reason before declining
        const reason = window.prompt('Please give a reason for declining:');
        if (!reason?.trim()) {
            // Re-enable buttons if cancelled
            listEl.querySelectorAll(`[data-respond="${taskId}"]`).forEach(btn => {
                btn.disabled = false;
            });
            return;
        }
        try {
            await apiFetch(`/api/writing-tasks/${taskId}/respond-assignment`, {
                method: 'POST',
                body: JSON.stringify({ action: 'decline', declineReason: reason.trim() }),
            });
            toast('Assignment declined.', 'info');
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            loadTasks();
        }
        return;
    }

    try {
        await apiFetch(`/api/writing-tasks/${taskId}/respond-assignment`, {
            method: 'POST',
            body: JSON.stringify({ action: 'accept' }),
        });
        toast('✅ Task accepted! You can now start writing.', 'success');
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        loadTasks();
    }
};

// ---------------------------------------------------------------------------
// Load tasks
// ---------------------------------------------------------------------------
const loadTasks = async () => {
    if (isLoading) return;
    isLoading = true;

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

        if (!tasks.length) {
            listEl.innerHTML = '<p class="empty-state">No tasks found.</p>';
            return;
        }

        // Sort: pending-response assignments bubble to the top
        tasks.sort((a, b) => {
            const aNeeds = (a.status ?? a._status) === 'ASSIGNED'
                && (a.taskSource ?? a._taskSource)?.startsWith('teacher');
            const bNeeds = (b.status ?? b._status) === 'ASSIGNED'
                && (b.taskSource ?? b._taskSource)?.startsWith('teacher');
            if (aNeeds && !bNeeds) return -1;
            if (!aNeeds && bNeeds) return  1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        listEl.innerHTML = tasks.map(taskCard).join('');

        // ── Attach delete listeners (existing behaviour) ──
        listEl.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', () => {
                showDeleteModal(btn.dataset.delete, async () => {
                    await deleteTask(btn.dataset.delete);
                });
            });
        });

        // ── Attach accept / decline listeners ──
        // Normalise action values: 'accepted'→'accept', 'declined'→'decline'
        listEl.querySelectorAll('[data-respond]').forEach(btn => {
            btn.addEventListener('click', () => {
                const raw    = btn.dataset.action ?? '';
                const action = raw === 'accepted' ? 'accept'
                             : raw === 'declined' ? 'decline'
                             : raw;   // already 'accept' or 'decline'
                respondAssignment(btn.dataset.respond, action);
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
// Delete task
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