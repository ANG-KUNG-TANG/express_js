import { requireRole, getParam } from '../../core/router.js';
import { apiFetch }              from '../../core/api.js';
import { initNavbar }            from '../../../components/navbar.js';
import { statusBadge }           from '../../../components/statusBadge.js';
import { toast }                 from '../../core/toast.js';

requireRole('teacher', 'admin');
initNavbar();

const id = getParam('id');
if (!id) window.location.href = '/pages/teacher/dashboard.html';

const statusEl      = document.getElementById('task-status');
const titleEl       = document.getElementById('task-title');
const typeEl        = document.getElementById('task-type');
const promptEl      = document.getElementById('task-prompt');
const submissionEl  = document.getElementById('task-submission');
const wordCountEl   = document.getElementById('task-wordcount');
const feedbackEl    = document.getElementById('feedback-input');
const reviewBtn     = document.getElementById('review-btn');
const reviewSection = document.getElementById('review-section');
const reviewedNotice = document.getElementById('reviewed-notice');

const loadTask = async () => {
    try {
        const { data: task } = await apiFetch(`/api/teacher/writing-tasks/${id}`);
        if (!task) throw new Error('Task not found');
        renderTask(task);
    } catch (err) { toast(err.message, 'error'); }
};

const renderTask = (task) => {
    const status = task._status ?? task.status;
    titleEl.textContent      = task._title    ?? task.title;
    typeEl.textContent       = `${task._taskType ?? task.taskType} | ${task._examType ?? task.examType}`;
    statusEl.innerHTML       = statusBadge(status);
    promptEl.textContent     = task._questionPrompt ?? task.questionPrompt ?? '—';
    submissionEl.textContent = task._submissionText ?? task.submissionText ?? '—';
    wordCountEl.textContent  = (task._wordCount ?? task.wordCount) ? `${task._wordCount ?? task.wordCount} words` : '—';

    if (task._feedback ?? task.feedback) feedbackEl.value = task._feedback ?? task.feedback;

    const canReview = status === 'SUBMITTED';
    const isReviewed = status === 'REVIEWED';

    reviewSection.style.display    = canReview  ? 'block' : 'none';
    reviewedNotice.style.display   = isReviewed ? 'block' : 'none';
    reviewBtn.disabled = !canReview;
};

reviewBtn?.addEventListener('click', async () => {
    const feedback = feedbackEl.value.trim();
    if (!feedback) { toast('Please enter feedback before saving.', 'error'); return; }
    reviewBtn.disabled    = true;
    reviewBtn.textContent = 'Saving…';
    try {
        await apiFetch(`/api/teacher/writing-tasks/${id}/review`, {
            method: 'PATCH', body: JSON.stringify({ feedback }),
        });
        toast('Review saved! An admin will assign the band score.');
        loadTask();
    } catch (err) {
        toast(err.message, 'error');
        reviewBtn.disabled    = false;
        reviewBtn.textContent = 'Save Review';
    }
});

loadTask();