/**
 * js/pages/teacher/student_tasks.js
 * Drives pages/teacher/student_tasks.html
 *
 * Shows all tasks for one specific student linked to this teacher.
 * Teacher can view, review, or navigate to assign another task.
 *
 * URL params:
 *   ?studentId=xxx   → required
 */

import { requireRole, getParam } from '../../core/router.js';
import { teacherAPI }            from '../../core/api.js';
import { statusBadge }           from '../../../components/statusBadge.js';
import { toast }                 from '../../utils/toast.js';
import { initTeacherSidebar } from '../../../components/teacher_sidebar.js';

// Sidebar + notifications are handled by teacherNav.js loaded in the HTML.
initTeacherSidebar();
requireRole('teacher', 'admin');

const studentId = getParam('studentId');
if (!studentId) window.location.href = '/pages/teacher/dashboard.html';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const pageTitle       = document.getElementById('page-title');
const studentInfoEl   = document.getElementById('student-info');
const tasksEl         = document.getElementById('tasks-list');
const statusFilterEl  = document.getElementById('filter-status');
const assignBtn       = document.getElementById('assign-btn');
const backBtn         = document.getElementById('back-btn');

// ── State ─────────────────────────────────────────────────────────────────────
let _allTasks = [];
let _student  = null;

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
    await loadStudentTasks();
})();

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadStudentTasks() {
    if (tasksEl) tasksEl.innerHTML = '<p class="loading">Loading…</p>';
    try {
        const res   = await teacherAPI.studentTasks(studentId);
        const data  = res?.data ?? res ?? {};

        // Backend may return { student, tasks } or just tasks[]
        _student   = data.student ?? null;
        _allTasks  = Array.isArray(data) ? data : (data.tasks ?? []);

        _renderHeader();
        _renderTasks(_allTasks);
    } catch (err) {
        if (tasksEl) tasksEl.innerHTML = `<p class="error-state">${_esc(err.message)}</p>`;
        toast(err.message, 'error');
    }
}

// ── Header ────────────────────────────────────────────────────────────────────
function _renderHeader() {
    const name  = _student?.name  ?? _student?.email ?? `Student`;
    const email = _student?.email ?? '';

    if (pageTitle)    pageTitle.textContent    = `${name}'s Tasks`;
    if (document.title) document.title = `${name} — Tasks`;

    if (studentInfoEl) {
        const initial = name[0]?.toUpperCase() ?? '?';
        const total   = _allTasks.length;
        const scored  = _allTasks.filter(t => (t.status ?? t._status) === 'SCORED').length;
        const pending = _allTasks.filter(t => (t.status ?? t._status) === 'SUBMITTED').length;

        studentInfoEl.innerHTML = `
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
                <div style="width:48px;height:48px;border-radius:50%;
                            background:linear-gradient(135deg,#3a7d5a,#c8a84b);
                            color:#fff;font-size:20px;font-weight:700;
                            display:flex;align-items:center;justify-content:center">
                    ${_esc(initial)}
                </div>
                <div>
                    <div style="font-size:16px;font-weight:600;color:var(--text1)">${_esc(name)}</div>
                    <div style="font-size:13px;color:var(--text3)">${_esc(email)}</div>
                    <div style="display:flex;gap:6px;margin-top:6px">
                        <span class="stat-pill">${total} total</span>
                        ${pending ? `<span class="stat-pill stat-pill--warning">${pending} awaiting review</span>` : ''}
                        ${scored  ? `<span class="stat-pill stat-pill--success">${scored} scored</span>`           : ''}
                    </div>
                </div>
            </div>`;
    }

    // Wire buttons
    assignBtn?.addEventListener('click', () => {
        window.location.href =
            `/pages/teacher/assign.html?studentId=${studentId}&name=${encodeURIComponent(_student?.name ?? '')}`;
    });
    backBtn?.addEventListener('click', () => {
        window.location.href = '/pages/teacher/dashboard.html';
    });
}

// ── Render tasks table ────────────────────────────────────────────────────────
function _renderTasks(tasks) {
    if (!tasksEl) return;
    const statusFilter = statusFilterEl?.value ?? '';
    const filtered = statusFilter
        ? tasks.filter(t => (t.status ?? t._status) === statusFilter)
        : tasks;

    if (!filtered.length) {
        tasksEl.innerHTML = _emptyState('📭', 'No tasks found',
            statusFilter ? 'Try a different filter.' : 'No tasks have been assigned yet.');
        return;
    }

    // Sort: submitted first (need review), then newest
    const sorted = [...filtered].sort((a, b) => {
        const aUrgent = (a.status ?? a._status) === 'SUBMITTED';
        const bUrgent = (b.status ?? b._status) === 'SUBMITTED';
        if (aUrgent && !bUrgent) return -1;
        if (!aUrgent && bUrgent) return  1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    tasksEl.innerHTML = `
    <table class="data-table">
        <thead>
            <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Words</th>
                <th>Due</th>
                <th>Submitted</th>
                <th>Score</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${sorted.map(t => {
                const tid      = t._id ?? t.id;
                const status   = t.status ?? t._status;
                const canReview = status === 'SUBMITTED';
                const score     = t.bandScore ?? t._bandScore;
                return `
                <tr>
                    <td class="col-title">${_esc(t.title ?? t._title ?? 'Untitled')}</td>
                    <td class="col-mono">${_esc(t.taskType ?? t._taskType ?? '—')}</td>
                    <td>${statusBadge(status)}</td>
                    <td class="col-mono">${t.wordCount ?? t._wordCount ?? '—'}</td>
                    <td class="col-mono">${_fmtDate(t.dueDate ?? t._dueDate)}</td>
                    <td class="col-mono">${_fmtDate(t.submittedAt ?? t._submittedAt)}</td>
                    <td class="col-mono">${score != null ? `Band ${score}` : '—'}</td>
                    <td class="actions-cell">
                        <a href="/pages/teacher/review.html?id=${tid}&mode=${canReview ? 'review' : 'view'}"
                           class="btn btn--${canReview ? 'warning' : 'ghost'} btn--sm">
                            ${canReview ? 'Review' : 'View'}
                        </a>
                    </td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>`;
}

// ── Filter event ──────────────────────────────────────────────────────────────
statusFilterEl?.addEventListener('change', () => _renderTasks(_allTasks));

// ── Helpers ───────────────────────────────────────────────────────────────────
const _fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

const _esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function _emptyState(icon, title, desc) {
    return `<div class="empty-state">
        <div style="font-size:2rem;margin-bottom:8px">${icon}</div>
        <strong>${title}</strong>
        <p style="font-size:13px;color:var(--text3);margin:4px 0 0">${desc}</p>
    </div>`;
}