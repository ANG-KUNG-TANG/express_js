/**
 * tasks/list.js — my tasks list with filters, search, delete modal,
 * and teacher-assignment accept / decline flow.
 *
 * FIXED: window.prompt() for decline reason replaced with showInputModal()
 * from modal.js for a consistent, styled experience.
 */

import { requireAuth }              from '../../core/router.js';
import { taskAPI }                  from '../../core/api.js';
import { initNavbar }               from '../../../components/navbar.js';
import { taskCard }                 from '../../../components/taskCard.js';
import { toast }                    from '../../utils/toast.js';
import { showModal, showInputModal } from '../../../components/modal.js';

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
// Accept / Decline assignment
// ---------------------------------------------------------------------------
const respondAssignment = async (taskId, action) => {
    // Disable all respond buttons for this task while processing
    listEl.querySelectorAll(`[data-respond="${taskId}"]`).forEach(btn => {
        btn.disabled = true;
    });

    if (action === 'decline') {
        // FIX: was window.prompt() — replaced with styled modal
        const reason = await showInputModal({
            title:        'Decline task',
            message:      'Please give a reason for declining. The teacher will be notified.',
            placeholder:  'Enter your reason…',
            confirmLabel: 'Decline task',
            validate:     (val) => val ? null : 'A reason is required to decline.',
        });

        if (reason === null) {
            // User cancelled — re-enable buttons
            listEl.querySelectorAll(`[data-respond="${taskId}"]`).forEach(btn => {
                btn.disabled = false;
            });
            return;
        }

        try {
            await taskAPI.respond(taskId, { action: 'decline', declineReason: reason });
            toast('Assignment declined.', 'info');
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            loadTasks();
        }
        return;
    }

    // Accept
    try {
        await taskAPI.respond(taskId, { action: 'accept' });
        toast('Task accepted! You can now start writing.', 'success');
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

    const params = {};
    if (statusEl.value) params.status   = statusEl.value;
    if (typeEl.value)   params.taskType = typeEl.value;
    if (examEl.value)   params.examType = examEl.value;

    try {
        const q = searchEl.value.trim();
        const res = q
            ? await taskAPI.search({ ...params, q })
            : await taskAPI.list(params);

        const tasks = res?.data || [];

        if (!tasks.length) {
            listEl.innerHTML = '<p class="empty-state">No tasks found.</p>';
            return;
        }

        // Pending-acceptance assignments bubble to the top
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

        // Delete buttons
        listEl.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', () => {
                showModal({
                    title:        'Delete Task?',
                    message:      'This action cannot be undone. The task and all its content will be permanently removed.',
                    confirmLabel: 'Delete',
                    danger:       true,
                    onConfirm:    async () => deleteTask(btn.dataset.delete),
                });
            });
        });

        // Accept / Decline buttons
        listEl.querySelectorAll('[data-respond]').forEach(btn => {
            btn.addEventListener('click', () => {
                const raw    = btn.dataset.action ?? '';
                const action = raw === 'accepted' ? 'accept'
                             : raw === 'declined' ? 'decline'
                             : raw;
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
        await taskAPI.delete(id);
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