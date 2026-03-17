// js/pages/teacher/review.js
import { requireRole, getParam } from '../../core/router.js';
import { apiFetch }              from '../../core/api.js';
import { initNavbar }            from '../../../components/navbar.js';
import { statusBadge }           from '../../../components/statusBadge.js';
import { toast }                 from '../../core/toast.js';

requireRole('teacher', 'admin');
initNavbar();

const id   = getParam('id');
const mode = getParam('mode') ?? 'view'; // 'view' | 'review'

if (!id) window.location.href = '/pages/teacher/dashboard.html';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const statusEl        = document.getElementById('task-status');
const titleEl         = document.getElementById('task-title');
const typeEl          = document.getElementById('task-type');
const promptEl        = document.getElementById('task-prompt');
const submissionEl    = document.getElementById('task-submission');
const wordCountEl     = document.getElementById('task-wordcount');
const dueDateEl       = document.getElementById('task-duedate');
const studentEl       = document.getElementById('task-student');
const feedbackEl      = document.getElementById('feedback-input');
const feedbackROEl    = document.getElementById('feedback-readonly');
const reviewBtn       = document.getElementById('review-btn');
const reviewSection   = document.getElementById('review-section');
const reviewedSection = document.getElementById('reviewed-section');
const pageModeLabel   = document.getElementById('page-mode-label');

// ── Set page mode label ───────────────────────────────────────────────────────
if (pageModeLabel) {
    pageModeLabel.textContent = mode === 'review' ? 'Review Mode' : 'View Mode';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
    d ? new Date(d).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }) : '—';

const setText = (el, val, fallback = '—') => {
    if (el) el.textContent = (val && String(val).trim()) ? String(val).trim() : fallback;
};

// ── Load task ─────────────────────────────────────────────────────────────────
const loadTask = async () => {
    try {
        const { data: task } = await apiFetch(`/api/teacher/writing-tasks/${id}`);
        if (!task) throw new Error('Task not found');
        renderTask(task);
    } catch (err) {
        toast(err.message, 'error');
        if (titleEl) titleEl.textContent = 'Error loading task';
    }
};

// ── Render ────────────────────────────────────────────────────────────────────
const renderTask = (task) => {
    const status   = task.status    ?? task._status   ?? '';
    const feedback = task.feedback  ?? task._feedback ?? '';
    const student  = task.assignedTo?.name  ?? task.assignedTo?.email  ??
                   task._assignedTo?.name ?? task._assignedTo?.email ?? '—';

    // Header
    setText(titleEl, task.title ?? task._title, 'Untitled');
    setText(typeEl, [
        task.taskType ?? task._taskType,
        task.examType ?? task._examType,
    ].filter(Boolean).join(' | '), '');
    if (statusEl) statusEl.innerHTML = statusBadge(status);

    // Meta
    setText(wordCountEl,
        (task.wordCount ?? task._wordCount)
            ? `${task.wordCount ?? task._wordCount} words`
            : '—'
    );
    setText(dueDateEl, fmtDate(task.dueDate ?? task._dueDate));
    setText(studentEl, student);

    // Prose
    setText(promptEl,     task.questionPrompt ?? task._questionPrompt ?? '', 'No prompt provided.');
    setText(submissionEl, task.submissionText ?? task._submissionText ?? '', 'No submission yet.');

    // ── Decide which panels to show ───────────────────────────────────────────
    //
    // mode=view  → never show editable feedback; show read-only if feedback exists
    // mode=review:
    //   status=SUBMITTED  → show editable feedback form
    //   status=REVIEWED / SCORED → show read-only reviewed notice + saved feedback
    //
    const isSubmitted = status === 'SUBMITTED';
    const isReviewed  = status === 'REVIEWED' || status === 'SCORED';

    const showEditable  = mode === 'review' && isSubmitted;
    const showReadOnly  = (mode === 'view') || (mode === 'review' && isReviewed);

    if (reviewSection)   reviewSection.style.display   = showEditable ? 'block' : 'none';
    if (reviewedSection) reviewedSection.style.display = showReadOnly  ? 'block' : 'none';

    // Pre-fill textareas
    if (feedbackEl  && feedback) feedbackEl.value  = feedback;
    if (feedbackROEl)            feedbackROEl.value = feedback || '';

    if (reviewBtn) reviewBtn.disabled = !showEditable;
};

// ── Save review ───────────────────────────────────────────────────────────────
reviewBtn?.addEventListener('click', async () => {
    const feedback  = feedbackEl?.value.trim();
    const bandScore = document.getElementById('band-score-input')?.value;
    const score     = Number(bandScore);

    if (!feedback) {
        toast('Please enter feedback before saving.', 'error');
        return;
    }
    if (!bandScore || isNaN(score) || score < 0 || score > 9) {
        toast('Please enter a band score between 0 and 9.', 'error');
        return;
    }

    reviewBtn.disabled    = true;
    reviewBtn.textContent = 'Saving…';

    try {
        await apiFetch(`/api/teacher/writing-tasks/${id}/review`, {
            method: 'PATCH',
            body: JSON.stringify({ feedback, bandScore: score }),
        });
        toast('Review saved and task scored!', 'success');
        loadTask();
    } catch (err) {
        toast(err.message, 'error');
        reviewBtn.disabled    = false;
        reviewBtn.textContent = 'Save Review';
    }
});

loadTask();