/**
 * js/pages/admin/review_detail.js
 * Handles reviewing and scoring a single writing task.
 */

import { getUser }          from '../../core/auth.js';
import { apiFetch }         from '../../core/api.js';
import { initAdminSidebar } from '../../../components/admin_sidebar.js';

initAdminSidebar();

// ── Auth guard ────────────────────────────────────────────────────────────────
const _user = getUser();
if (!_user || _user.role !== 'admin') window.location.replace('/pages/auth/login.html');

// ── Toast ─────────────────────────────────────────────────────────────────────
const toast = (msg, type = 'success') => {
    const t    = document.getElementById('toast');
    const icon = document.querySelector('#toast .t-icon');
    const text = document.getElementById('toast-msg');
    if (!t) return;
    if (text) text.textContent = msg;
    if (icon) {
        icon.textContent = type === 'error' ? '✕' : '✓';
        icon.style.color = type === 'error' ? 'var(--red)' : 'var(--green)';
    }
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
};

// ── Status badge ──────────────────────────────────────────────────────────────
const statusBadge = (status) => {
    const map = {
        DRAFT:     'badge--default',
        SUBMITTED: 'badge--warning',
        REVIEWED:  'badge--info',
        SCORED:    'badge--success',
    };
    return `<span class="badge ${map[status] ?? 'badge--default'}">${status ?? '—'}</span>`;
};

// ── Get & validate task ID from URL ───────────────────────────────────────────
// Rejects missing, literal "null"/"undefined", or non-ObjectId strings
// that would cause the API to throw an invalid-id error.
const id = new URLSearchParams(window.location.search).get('id');
if (!id || id === 'null' || id === 'undefined' || !/^[a-f\d]{24}$/i.test(id)) {
    window.location.replace('/pages/admin/review.html');
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const statusEl      = document.getElementById('task-status');
const titleEl       = document.getElementById('task-title');
const typeEl        = document.getElementById('task-type');
const promptEl      = document.getElementById('task-prompt');
const submissionEl  = document.getElementById('task-submission');
const wordCountEl   = document.getElementById('task-wordcount');
const feedbackEl    = document.getElementById('feedback-input');
const reviewBtn     = document.getElementById('review-btn');
const scoreInput    = document.getElementById('score-input');
const scoreBtn      = document.getElementById('score-btn');
const reviewSection = document.getElementById('review-section');
const scoreSection  = document.getElementById('score-section');

// ── Load task ─────────────────────────────────────────────────────────────────
const loadTask = async () => {
    try {
        const res  = await apiFetch(`/api/writing-tasks/${id}`);
        const task = res?.data ?? res;
        if (!task) throw new Error('Task not found');
        renderTask(task);
    } catch (err) {
        toast(err.message, 'error');
        if (titleEl) titleEl.textContent = 'Error loading task';
    }
};

const renderTask = (task) => {
    const status   = task.status   ?? task._status;
    const feedback = task.feedback ?? task._feedback;

    if (titleEl)      titleEl.textContent     = task.title          ?? task._title          ?? '—';
    if (typeEl)       typeEl.textContent       = `${task.taskType   ?? task._taskType       ?? '—'} · ${task.examType ?? task._examType ?? '—'}`;
    if (statusEl)     statusEl.innerHTML       = statusBadge(status);
    if (promptEl)     promptEl.textContent     = task.questionPrompt ?? task._questionPrompt ?? '—';
    if (submissionEl) submissionEl.textContent = task.submissionText ?? task._submissionText ?? '(No submission yet)';

    const wc = task.wordCount ?? task._wordCount;
    if (wordCountEl) wordCountEl.textContent = wc ? `${wc} words` : '';

    if (feedback && feedbackEl) feedbackEl.value = feedback;

    const canReview = status === 'SUBMITTED';
    const canScore  = status === 'REVIEWED';
    const isScored  = status === 'SCORED';

    if (reviewSection) reviewSection.style.display = (canReview || feedback) ? 'block' : 'none';
    if (scoreSection)  scoreSection.style.display  = (canScore  || isScored) ? 'block' : 'none';
    if (reviewBtn)     reviewBtn.disabled           = !canReview;
    if (scoreBtn)      scoreBtn.disabled            = !canScore;

    if (isScored && scoreInput) {
        const score         = task.bandScore ?? task._bandScore;
        scoreInput.value    = score ?? '';
        scoreInput.disabled = true;
        const finalEl = document.getElementById('final-score');
        if (finalEl) { finalEl.textContent = `Band ${score}`; finalEl.style.display = 'inline-flex'; }
    }
};

// ── Review ────────────────────────────────────────────────────────────────────
reviewBtn?.addEventListener('click', async () => {
    const feedback = feedbackEl?.value.trim();
    if (!feedback) { toast('Please enter feedback before reviewing.', 'error'); return; }
    reviewBtn.disabled    = true;
    reviewBtn.textContent = 'Saving…';
    try {
        await apiFetch(`/api/admin/writing-tasks/${id}/review`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ feedback }),
        });
        toast('Review saved! You can now score this task.', 'success');
        loadTask();
    } catch (err) {
        toast(err.message, 'error');
        reviewBtn.disabled    = false;
        reviewBtn.textContent = 'Save Review';
    }
});

// ── Score ─────────────────────────────────────────────────────────────────────
scoreBtn?.addEventListener('click', async () => {
    const bandScore = parseFloat(scoreInput?.value);
    if (isNaN(bandScore) || bandScore < 0 || bandScore > 9) {
        toast('Band score must be between 0 and 9.', 'error'); return;
    }
    scoreBtn.disabled    = true;
    scoreBtn.textContent = 'Saving…';
    try {
        await apiFetch(`/api/admin/writing-tasks/${id}/score`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ bandScore }),
        });
        toast(`Task scored: Band ${bandScore}`, 'success');
        // Return to queue after scoring so admin continues to next task
        setTimeout(() => window.location.replace('/pages/admin/review.html'), 1200);
    } catch (err) {
        toast(err.message, 'error');
        scoreBtn.disabled    = false;
        scoreBtn.textContent = 'Save Score';
    }
});

loadTask();