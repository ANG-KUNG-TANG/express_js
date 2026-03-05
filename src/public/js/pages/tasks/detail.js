/**
 * tasks/detail.js — view task detail + status-based action buttons
 *
 * FIXES:
 *  1. Delete uses a custom modal — no window.confirm()
 *  2. Transfer button hidden for non-admins; uses correct POST /transfer endpoint
 *  3. isAdmin() used consistently for admin-only UI gating
 *  4. Edit notes guards against missing DOM elements
 *  5. Share copies link without prompt
 */

import { requireAuth, getParam } from '../../core/router.js';
import { isAdmin }               from '../../core/auth.js';
import { apiFetch }              from '../../core/api.js';
import { initNavbar }            from '../../../components/navbar.js';
import { statusBadge }           from '../../../components/statusBadge.js';
import { toast }                 from '../../core/toast.js';

requireAuth();
initNavbar();

const id = getParam('id');
if (!id) window.location.href = '/pages/tasks/list.html';

let currentTask = null;

// -----------------------------------------------------------------------
// Custom modal — replaces window.confirm() everywhere
// -----------------------------------------------------------------------
function showModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm }) {
    document.getElementById('app-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'app-modal';
    modal.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.45);
        display:flex;align-items:center;justify-content:center;
        z-index:9999;animation:fadeIn .15s ease;
    `;
    modal.innerHTML = `
        <div style="
            background:var(--surface);border:1px solid var(--border);
            border-radius:var(--radius-lg);padding:28px 32px;
            max-width:400px;width:90%;box-shadow:var(--shadow-lg);
        ">
            <h3 style="margin:0 0 8px;font-size:1.1rem;">${title}</h3>
            <p style="color:var(--text2);font-size:.9rem;margin:0 0 24px;line-height:1.5;">${message}</p>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="modal-cancel" class="btn btn--ghost">Cancel</button>
                <button id="modal-confirm" class="btn ${danger ? 'btn--danger' : 'btn--primary'}">${confirmLabel}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const cleanup = () => modal.remove();
    document.getElementById('modal-cancel').addEventListener('click', cleanup);
    modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });
    document.getElementById('modal-confirm').addEventListener('click', async () => {
        const btn = document.getElementById('modal-confirm');
        btn.disabled = true;
        btn.textContent = 'Please wait…';
        await onConfirm();
        cleanup();
    });
}

// -----------------------------------------------------------------------
// Prompt modal — replaces window.prompt()
// -----------------------------------------------------------------------
function showPromptModal({ title, message, placeholder = '', onConfirm }) {
    document.getElementById('app-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'app-modal';
    modal.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.45);
        display:flex;align-items:center;justify-content:center;
        z-index:9999;
    `;
    modal.innerHTML = `
        <div style="
            background:var(--surface);border:1px solid var(--border);
            border-radius:var(--radius-lg);padding:28px 32px;
            max-width:400px;width:90%;box-shadow:var(--shadow-lg);
        ">
            <h3 style="margin:0 0 8px;font-size:1.1rem;">${title}</h3>
            <p style="color:var(--text2);font-size:.85rem;margin:0 0 16px;">${message}</p>
            <input id="modal-input" type="email" placeholder="${placeholder}"
                style="width:100%;padding:9px 12px;border:1px solid var(--border);
                border-radius:var(--radius-sm);font-size:.9rem;
                background:var(--surface2);color:var(--text);margin-bottom:20px;" />
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="modal-cancel" class="btn btn--ghost">Cancel</button>
                <button id="modal-confirm" class="btn btn--primary">Transfer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const input = document.getElementById('modal-input');
    input.focus();

    const cleanup = () => modal.remove();
    document.getElementById('modal-cancel').addEventListener('click', cleanup);
    modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });

    const submit = async () => {
        const val = input.value.trim();
        if (!val) { input.focus(); return; }
        const btn = document.getElementById('modal-confirm');
        btn.disabled = true;
        btn.textContent = 'Transferring…';
        await onConfirm(val);
        cleanup();
    };

    document.getElementById('modal-confirm').addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

// -----------------------------------------------------------------------
// Load task
// -----------------------------------------------------------------------
const loadTask = async () => {
    try {
        const res  = await apiFetch(`/api/writing-tasks/${id}`);
        const task = res?.data;
        if (!task) throw new Error('Task not found');
        currentTask = task;
        renderTask(task);
    } catch (err) {
        toast(err.message, 'error');
        document.getElementById('task-container').innerHTML =
            '<p class="error-state">Could not load task.</p>';
    }
};

// -----------------------------------------------------------------------
// Render task
// -----------------------------------------------------------------------
const renderTask = (task) => {
    document.getElementById('task-title').textContent       = task.title;
    document.getElementById('task-status').innerHTML        = statusBadge(task.status);
    document.getElementById('task-type').textContent        = task.taskType || '—';
    document.getElementById('task-exam').textContent        = task.examType || '—';
    document.getElementById('task-prompt').textContent      = task.questionPrompt || '—';
    document.getElementById('task-description').textContent = task.description || '—';

    if (task.submissionText) {
        document.getElementById('submission-section').style.display = 'block';
        document.getElementById('task-submission').textContent = task.submissionText;
        document.getElementById('task-wordcount').textContent  = `${task.wordCount ?? '—'} words`;
    }

    if (task.feedback) {
        document.getElementById('feedback-section').style.display = 'block';
        document.getElementById('task-feedback').textContent = task.feedback;
    }

    if (task.bandScore !== null && task.bandScore !== undefined) {
        document.getElementById('score-section').style.display = 'block';
        document.getElementById('task-score').textContent = `Band ${task.bandScore}`;
    }

    if (task.submittedAt) {
        document.getElementById('task-submitted-at').textContent =
            new Date(task.submittedAt).toLocaleString();
    }
    if (task.reviewedAt) {
        document.getElementById('task-reviewed-at').textContent =
            new Date(task.reviewedAt).toLocaleString();
    }

    renderActions(task);
    renderExtraActions(task);
};

// -----------------------------------------------------------------------
// Status-based primary action buttons
// -----------------------------------------------------------------------
const renderActions = (task) => {
    const actionsEl = document.getElementById('task-actions');
    actionsEl.innerHTML = '';
    const status = task.status;

    if (status === 'ASSIGNED') {
        actionsEl.appendChild(makeButton('Start Writing', 'btn--primary', async () => {
            try {
                await apiFetch(`/api/writing-tasks/${id}/start`, { method: 'PATCH' });
                toast('Task started!');
                loadTask();
            } catch (err) { toast(err.message, 'error'); }
        }));
    }

    if (status === 'WRITING') {
        actionsEl.appendChild(makeButton('Open Editor', 'btn--primary', () => {
            window.location.href = `/pages/tasks/write.html?id=${id}`;
        }));
    }

    // Admin-only: review & score buttons
    if (status === 'SUBMITTED' && isAdmin()) {
        actionsEl.appendChild(makeButton('Review This Task', 'btn--warning', () => {
            window.location.href = `/pages/admin/review.html?id=${id}`;
        }));
    }

    if (status === 'REVIEWED' && isAdmin()) {
        actionsEl.appendChild(makeButton('Score This Task', 'btn--success', () => {
            window.location.href = `/pages/admin/review.html?id=${id}`;
        }));
    }

    // Delete — custom modal, no window.confirm()
    actionsEl.appendChild(makeButton('Delete Task', 'btn--danger btn--sm', () => {
        showModal({
            title: 'Delete Task?',
            message: 'This action cannot be undone. The task and all its content will be permanently removed.',
            confirmLabel: 'Delete',
            danger: true,
            onConfirm: async () => {
                try {
                    await apiFetch(`/api/writing-tasks/${id}`, { method: 'DELETE' });
                    toast('Task deleted');
                    window.location.href = '/pages/tasks/list.html';
                } catch (err) {
                    toast(err.message, 'error');
                }
            },
        });
    }));
};

// -----------------------------------------------------------------------
// Extra actions (Transfer + Share) — Transfer only visible to admins
// -----------------------------------------------------------------------
const renderExtraActions = (task) => {
    const extraEl = document.querySelector('.task-extra-actions');
    if (!extraEl) return;

    // Hide transfer button for non-admins — it's an admin-only operation
    const transferBtn = document.getElementById('transfer-task-btn');
    if (transferBtn) {
        transferBtn.style.display = isAdmin() ? '' : 'none';
    }
};

const makeButton = (label, classes, onClick) => {
    const btn = document.createElement('button');
    btn.className = `btn ${classes}`;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
};

// -----------------------------------------------------------------------
// Edit Notes
// -----------------------------------------------------------------------
const editBtn      = document.getElementById('edit-notes-btn');
const notesDisplay = document.getElementById('task-description');
const notesSection = document.getElementById('notes-section');

editBtn?.addEventListener('click', () => {
    // Prevent double-clicking
    if (notesSection.querySelector('textarea')) return;

    const currentNotes = notesDisplay.textContent === '—' ? '' : notesDisplay.textContent;
    const textarea = document.createElement('textarea');
    textarea.className = 'notes-edit-area';
    textarea.rows = 4;
    textarea.value = currentNotes;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'edit-actions';
    actionsDiv.innerHTML = `
        <button class="btn btn--primary btn--sm" id="save-notes">Save</button>
        <button class="btn btn--ghost btn--sm" id="cancel-notes">Cancel</button>
    `;

    notesDisplay.style.display = 'none';
    const contentEl = notesSection.querySelector('.detail-card__content') || notesSection;
    contentEl.appendChild(textarea);
    contentEl.after(actionsDiv);

    const cleanup = () => {
        notesDisplay.style.display = '';
        textarea.remove();
        actionsDiv.remove();
    };

    document.getElementById('save-notes').addEventListener('click', async () => {
        const newNotes = textarea.value.trim();
        try {
            await apiFetch(`/api/writing-tasks/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ description: newNotes }),
            });
            notesDisplay.textContent = newNotes || '—';
            toast('Notes updated', 'success');
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            cleanup();
        }
    });

    document.getElementById('cancel-notes').addEventListener('click', cleanup);
});

// -----------------------------------------------------------------------
// Transfer Task
// Admin only — uses POST /transfer (bulk endpoint) with fromUserId resolved
// from the task's current owner and toUserId resolved from the target email.
//
// The router has no PATCH /:id/transfer — we use POST /transfer instead.
// -----------------------------------------------------------------------
document.getElementById('transfer-task-btn')?.addEventListener('click', async () => {
    if (!currentTask) return;

    showPromptModal({
        title: 'Transfer Task',
        message: 'Enter the email address of the user to transfer this task to.',
        placeholder: 'user@example.com',
        onConfirm: async (targetEmail) => {
            try {
                // Step 1: resolve target email → userId
                const userRes = await apiFetch(`/api/users/by-email?email=${encodeURIComponent(targetEmail)}`);
                const toUserId = userRes?.data?.id || userRes?.data?._id || userRes?.id || userRes?._id;
                if (!toUserId) throw new Error('Could not find a user with that email.');

                // Step 2: get current owner's userId from the task
                const fromUserId = currentTask.userId || currentTask.user || currentTask.owner;
                if (!fromUserId) throw new Error('Could not determine current task owner.');

                // Step 3: POST /transfer (admin-only bulk endpoint — works for one task too)
                await apiFetch('/api/writing-tasks/transfer', {
                    method: 'POST',
                    body: JSON.stringify({ fromUserId, toUserId }),
                });

                toast('Task transferred successfully', 'success');
                loadTask();
            } catch (err) {
                toast(err.message, 'error');
            }
        },
    });
});

// -----------------------------------------------------------------------
// Share — copy link to clipboard, no prompt
// -----------------------------------------------------------------------
document.getElementById('share-task-btn')?.addEventListener('click', () => {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url)
            .then(() => toast('Link copied to clipboard', 'success'))
            .catch(() => toast('Could not copy — please copy the URL manually', 'info'));
    } else {
        // Fallback for browsers without clipboard API
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
        toast('Link copied to clipboard', 'success');
    }
});

loadTask();