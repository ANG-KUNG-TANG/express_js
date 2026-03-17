/**
 * js/pages/admin/review.js
 * Admin review + score a single task.
 */

import { requireRole, getParam } from '../../core/router.js';
import { apiFetch }              from '../../core/api.js';
import { initNavbar }            from '../../../components/navbar.js';
import { statusBadge }           from '../../../components/statusBadge.js';
import { toast }                 from '../../core/toast.js';

requireRole('admin');
initNavbar();

const id = getParam('id');
if (!id) window.location.href = '/pages/admin/tasks.html';

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

// ── Load task — single fetch only ─────────────────────────────────────────────
const loadTask = async () => {
    try {
        const res  = await apiFetch(`/api/writing-tasks/${id}`);
        const task = res?.data ?? res;
        if (!task) throw new Error('Task not found');
        renderTask(task);
    } catch (err) {
        toast(err.message, 'error');
    }
};

const renderTask = (task) => {
    const status   = task.status   ?? task._status;
    const feedback = task.feedback ?? task._feedback;

    titleEl.textContent      = task.title          ?? task._title          ?? '—';
    typeEl.textContent       = `${task.taskType    ?? task._taskType       ?? '—'} | ${task.examType ?? task._examType ?? '—'}`;
    statusEl.innerHTML       = statusBadge(status);
    promptEl.textContent     = task.questionPrompt ?? task._questionPrompt ?? '—';
    submissionEl.textContent = task.submissionText ?? task._submissionText ?? '(No submission yet)';
    wordCountEl.textContent  = (task.wordCount ?? task._wordCount)
        ? `${task.wordCount ?? task._wordCount} words` : '—';

    if (feedback) feedbackEl.value = feedback;

    const canReview = status === 'SUBMITTED';
    const canScore  = status === 'REVIEWED';
    const isScored  = status === 'SCORED';

    reviewSection.style.display = (canReview || feedback) ? 'block' : 'none';
    scoreSection.style.display  = (canScore  || isScored) ? 'block' : 'none';
    reviewBtn.disabled          = !canReview;
    scoreBtn.disabled           = !canScore;

    if (isScored) {
        const score         = task.bandScore ?? task._bandScore;
        scoreInput.value    = score;
        scoreInput.disabled = true;
        const finalEl = document.getElementById('final-score');
        if (finalEl) { finalEl.textContent = `Band ${score}`; finalEl.style.display = 'flex'; }
    }
};

// ── Review ────────────────────────────────────────────────────────────────────
reviewBtn?.addEventListener('click', async () => {
    const feedback = feedbackEl.value.trim();
    if (!feedback) { toast('Please enter feedback before reviewing.', 'error'); return; }
    reviewBtn.disabled    = true;
    reviewBtn.textContent = 'Saving…';
    try {
        await apiFetch(`/api/admin/writing-tasks/${id}/review`, {
            method: 'PATCH',
            body: JSON.stringify({ feedback }),
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
    const bandScore = parseFloat(scoreInput.value);
    if (isNaN(bandScore) || bandScore < 0 || bandScore > 9) {
        toast('Band score must be between 0 and 9.', 'error'); return;
    }
    scoreBtn.disabled    = true;
    scoreBtn.textContent = 'Saving…';
    try {
        await apiFetch(`/api/admin/writing-tasks/${id}/score`, {
            method: 'PATCH',
            body: JSON.stringify({ bandScore }),
        });
        toast(`Task scored: Band ${bandScore}`, 'success');
        loadTask();
    } catch (err) {
        toast(err.message, 'error');
        scoreBtn.disabled    = false;
        scoreBtn.textContent = 'Save Score';
    }
});

loadTask();