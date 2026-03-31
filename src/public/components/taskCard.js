/**
 * taskCard.js — renders a single writing task card
 *
 * FIXED: socket listener used uppercase noti type keys ('TASK_SCORED')
 * but backend sends lowercase ('task_scored'). Live badge updates never fired.
 * Changed to lowercase to match backend noti_enums.js.
 */

import { statusBadge } from './statusBadge.js';

// ── Live status updates via socket ────────────────────────────────────────────
window.addEventListener('noti:new', (e) => {
    const noti = e.detail;
    // FIX: was 'TASK_SCORED' / 'TASK_REVIEWED' — backend sends lowercase
    if (noti.type !== 'task_scored' && noti.type !== 'task_reviewed') return;
    if (!noti.metadata?.refId && !noti.refId) return;

    const refId = noti.metadata?.refId ?? noti.refId;
    const card  = document.querySelector(`.task-card[data-id="${refId}"]`);
    if (!card) return;

    const newStatus = noti.type === 'task_scored' ? 'SCORED' : 'REVIEWED';
    const badgeEl   = card.querySelector('.badge');
    if (badgeEl) badgeEl.outerHTML = statusBadge(newStatus);

    // Show band score tag if included in the notification message
    const scoreMatch = noti.message?.match(/score of (\d+(\.\d+)?)/);
    if (scoreMatch && newStatus === 'SCORED') {
        const meta = card.querySelector('.card__meta');
        if (meta && !meta.querySelector('.tag--score')) {
            meta.insertAdjacentHTML('beforeend',
                `<span class="tag tag--score">Band ${scoreMatch[1]}</span>`);
        }
    }
});

export const taskCard = (task) => {
    const tid              = task._id || task.id;
    const status           = task.status ?? task._status;
    const source           = task.taskSource ?? task._taskSource ?? '';
    const assignmentStatus = task.assignmentStatus ?? task._assignmentStatus ?? '';

    const dueDate = task.dueDate ?? task._dueDate;
    let dateLabel;
    if (dueDate) {
        const formatted = new Date(dueDate).toLocaleDateString(undefined, {
            day: 'numeric', month: 'short', year: 'numeric',
        });
        const hoursLeft = (new Date(dueDate) - Date.now()) / 3_600_000;
        const urgent    = hoursLeft > 0 && hoursLeft < 48;
        dateLabel = `<span${urgent ? ' style="color:var(--red,#dc2626);font-weight:600"' : ''}>Due: ${formatted}</span>`;
    } else if (task.submittedAt) {
        dateLabel = `Submitted: ${new Date(task.submittedAt).toLocaleDateString()}`;
    } else {
        dateLabel = `Created: ${new Date(task.createdAt).toLocaleDateString()}`;
    }

    const isPendingAcceptance =
        source.startsWith('teacher') &&
        status === 'ASSIGNED' &&
        assignmentStatus === 'pending_acceptance';

    const actions = isPendingAcceptance
        ? `<button class="btn btn--success btn--sm" data-respond="${tid}" data-action="accepted">Accept</button>
           <button class="btn btn--danger  btn--sm" data-respond="${tid}" data-action="declined">Decline</button>`
        : `<a href="/pages/tasks/detail.html?id=${tid}" class="btn btn--primary btn--sm">View</a>`;

    const assignedLabel = source.startsWith('teacher')
        ? `<span class="tag tag--assigned">Assigned by teacher</span>`
        : '';

    return `
        <div class="card task-card" data-id="${tid}">
            <div class="card__header">
                <h3 class="card__title">${task.title ?? task._title}</h3>
                ${statusBadge(status)}
            </div>
            <div class="card__meta">
                <span class="tag tag--type">${task.taskType ?? task._taskType}</span>
                <span class="tag tag--exam">${task.examType ?? task._examType}</span>
                ${assignedLabel}
                ${task.wordCount > 0 ? `<span class="tag">${task.wordCount} words</span>` : ''}
                ${task.bandScore != null ? `<span class="tag tag--score">Band ${task.bandScore}</span>` : ''}
            </div>
            <p class="card__date">${dateLabel}</p>
            <div class="card__actions">${actions}</div>
        </div>`;
};

// ── setupTaskCardListeners ────────────────────────────────────────────────────
export const setupTaskCardListeners = (containerEl, onRespond) => {
    if (!containerEl || typeof onRespond !== 'function') return;

    containerEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-respond]');
        if (!btn) return;

        const taskId = btn.dataset.respond;
        const action = btn.dataset.action;

        if (action === 'accepted') {
            onRespond(taskId, 'accepted');
            return;
        }

        if (action === 'declined') {
            const card = btn.closest('.task-card');
            if (!card) { onRespond(taskId, 'declined', ''); return; }
            if (card.querySelector('.decline-reason-row')) return;

            const row = document.createElement('div');
            row.className = 'decline-reason-row';
            row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap;';
            row.innerHTML = `
                <input type="text" class="input input--sm decline-reason-input"
                       placeholder="Reason for declining…"
                       style="flex:1;min-width:160px;padding:6px 10px;
                              border:1px solid var(--border,#d1d5db);border-radius:7px;font-size:13px;" />
                <button class="btn btn--danger btn--sm decline-confirm">Confirm decline</button>
                <button class="btn btn--ghost  btn--sm decline-cancel">Cancel</button>`;

            card.querySelector('.card__actions').after(row);
            row.querySelector('.decline-reason-input').focus();

            const cleanup = () => row.remove();
            row.querySelector('.decline-cancel').addEventListener('click', cleanup);

            const confirm = () => {
                const reason = row.querySelector('.decline-reason-input').value.trim();
                cleanup();
                onRespond(taskId, 'declined', reason);
            };

            row.querySelector('.decline-confirm').addEventListener('click', confirm);
            row.querySelector('.decline-reason-input').addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter')  confirm();
                if (ev.key === 'Escape') cleanup();
            });
        }
    });
};