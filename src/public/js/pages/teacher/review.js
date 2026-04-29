// js/pages/teacher/review.js
import { requireRole, getParam } from '../../core/router.js';
import { apiFetch }              from '../../core/api.js';
import { statusBadge }           from '../../../components/statusBadge.js';
import { toast }                 from '../../utils/toast.js';
import { initSocket }            from '../../core/socket.js';
import { initTeacherSidebar } from '../../../components/teacher_sidebar.js';

// Sidebar + notifications are handled by teacherNav.js loaded in the HTML.
initTeacherSidebar()
requireRole('teacher', 'admin');
initSocket();

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
const bandScoreInput  = document.getElementById('band-score-input');
const reviewSection   = document.getElementById('review-section');
const reviewedSection = document.getElementById('reviewed-section');
const pageModeLabel   = document.getElementById('page-mode-label');

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
    if (el) el.textContent = (val != null && String(val).trim()) ? String(val).trim() : fallback;
};

// ── Load task ─────────────────────────────────────────────────────────────────
const loadTask = async () => {
    try {
        const res  = await apiFetch(`/api/teacher/writing-tasks/${id}`);
        const task = res?.data ?? res;
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

    setText(titleEl, task.title ?? task._title, 'Untitled');
    setText(typeEl, [
        task.taskType ?? task._taskType,
        task.examType ?? task._examType,
    ].filter(Boolean).join(' | '), '');
    if (statusEl) statusEl.innerHTML = statusBadge(status);

    setText(wordCountEl,
        (task.wordCount ?? task._wordCount)
            ? `${task.wordCount ?? task._wordCount} words`
            : '—'
    );
    setText(dueDateEl,    fmtDate(task.dueDate    ?? task._dueDate));
    setText(studentEl,    student);
    setText(promptEl,     task.questionPrompt ?? task._questionPrompt ?? '', 'No prompt provided.');
    setText(submissionEl, task.submissionText  ?? task._submissionText  ?? '', 'No submission yet.');

    // ── Which panels to show ──────────────────────────────────────────────────
    const normStatus  = String(status).toUpperCase();
    const isSubmitted = normStatus === 'SUBMITTED';
    const isReviewed  = normStatus === 'REVIEWED' || normStatus === 'SCORED';

    const showEditable = mode === 'review' && isSubmitted;
    const showReadOnly = mode === 'view' || (mode === 'review' && isReviewed);

    if (reviewSection)   reviewSection.style.display   = showEditable ? 'block' : 'none';
    if (reviewedSection) reviewedSection.style.display = showReadOnly  ? 'block' : 'none';

    if (feedbackEl   && feedback) feedbackEl.value  = feedback;
    if (feedbackROEl)             feedbackROEl.value = feedback || '';
    if (reviewBtn)                reviewBtn.disabled = !showEditable;

    if (isReviewed) {
        // FIX: check both bandScore and score field names (backend may use either)
        const score   = task.bandScore ?? task._bandScore ?? task.score ?? task._score;
        const scoreEl = document.getElementById('reviewed-score');
        if (scoreEl) scoreEl.textContent = score != null ? `Band ${score}` : '';

        // Also pre-fill the input in case teacher wants to update
        if (bandScoreInput && score != null) bandScoreInput.value = score;
    }
};

// ── Save review ───────────────────────────────────────────────────────────────
reviewBtn?.addEventListener('click', async () => {
    const feedback = feedbackEl?.value.trim();
    const rawScore = bandScoreInput?.value;

    if (!feedback) {
        toast('Please enter feedback before saving.', 'error');
        return;
    }

    // FIX: `!rawScore` was blocking valid score of 0.
    // Use `rawScore === ''` instead so 0 is accepted.
    if (rawScore === '' || rawScore == null) {
        toast('Please enter a band score between 0 and 9.', 'error');
        return;
    }
    const score = Number(rawScore);
    if (isNaN(score) || score < 0 || score > 9) {
        toast('Band score must be between 0 and 9.', 'error');
        return;
    }

    reviewBtn.disabled    = true;
    reviewBtn.textContent = 'Saving…';

    try {
        // field name its sanitizer expects — safe to send both.
        await apiFetch(`/api/teacher/writing-tasks/${id}/review`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ feedback, bandScore: score, score }),
        });
        toast('Review saved and task scored!', 'success');
        loadTask();
    } catch (err) {
        toast(err.message, 'error');
        reviewBtn.disabled    = false;
        reviewBtn.textContent = 'Save Review & Score';
    }
});

// ── Real-time: if student resubmits while teacher has page open → auto-refresh ─
window.addEventListener('noti:new', (e) => {
    if (e.detail?.type === 'task_submitted') loadTask();
});

loadTask();