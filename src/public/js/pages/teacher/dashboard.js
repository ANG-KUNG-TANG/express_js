/**
 * js/pages/teacher/dashboard.js
 * Drives pages/teacher/dashboard.html
 *
 * Sections:
 *  1. Stats bar   — awaiting review / reviewed / scored counts
 *  2. Students    — linked students with task stats + assign button
 *  3. Review queue — submitted tasks oldest-first
 *  4. All tasks   — searchable, filterable table
 *
 * Real-time:
 *  - task_submitted  → refresh tasks + students (new item in queue)
 *  - task_accepted   → refresh tasks + students (status changed)
 *  - task_declined   → refresh tasks + students (status changed)
 */

import { requireRole }  from '../../core/router.js';
import { teacherAPI }   from '../../core/api.js';
import { initTeacherSidebar } from '../../../components/teacher_sidebar.js';
import { statusBadge }  from '../../../components/statusBadge.js';
import { toast }        from '../../core/toast.js';
import { initSocket }   from '../../core/socket.js';

requireRole('teacher', 'admin');
initTeacherSidebar();
initSocket();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const statSubmitted  = document.getElementById('stat-submitted');
const statReviewed   = document.getElementById('stat-reviewed');
const statScored     = document.getElementById('stat-scored');
const studentsEl     = document.getElementById('students-list');
const pendingEl      = document.getElementById('pending-list');
const tasksEl        = document.getElementById('tasks-list');
const searchEl       = document.getElementById('task-search');
const statusFilterEl = document.getElementById('task-status-filter');

// ── State ─────────────────────────────────────────────────────────────────────
let _allTasks    = [];
let _searchTimer = null;

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
    await loadTasks();
    await loadStudents();
})();

// ── 1. Stats ──────────────────────────────────────────────────────────────────
function deriveStats(tasks) {
    const counts = { SUBMITTED: 0, REVIEWED: 0, SCORED: 0 };
    tasks.forEach(t => {
        const s = _normaliseStatus(t.status ?? t._status);
        if (s in counts) counts[s]++;
    });
    _setStatCard(statSubmitted, counts.SUBMITTED);
    _setStatCard(statReviewed,  counts.REVIEWED);
    _setStatCard(statScored,    counts.SCORED);
}

function _setStatCard(el, val) {
    if (!el) return;
    const valEl = el.querySelector('.stat-card__value');
    if (valEl) valEl.textContent = val;
    else el.textContent = val;
}

// ── 2. Students ───────────────────────────────────────────────────────────────
async function loadStudents() {
    if (!studentsEl) return;
    studentsEl.innerHTML = '<p class="loading">Loading students…</p>';
    try {
        const res      = await teacherAPI.listStudents();
        const raw      = res?.data ?? res ?? [];
        const students = Array.isArray(raw) ? raw : (raw.students ?? raw.users ?? raw.data ?? []);

        if (!students.length) {
            studentsEl.innerHTML = _emptyState('👩‍🎓', 'No students yet',
                'Ask an admin to link students to your account.');
            return;
        }

        studentsEl.innerHTML = students.map(s => _studentCard(s)).join('');

        studentsEl.querySelectorAll('[data-assign]').forEach(btn => {
            btn.addEventListener('click', () => {
                const sid   = btn.dataset.assign;
                const sname = btn.dataset.name ?? '';
                window.location.href =
                    `/pages/teacher/assign.html?studentId=${sid}&name=${encodeURIComponent(sname)}`;
            });
        });

        studentsEl.querySelectorAll('[data-view-tasks]').forEach(btn => {
            btn.addEventListener('click', () => {
                window.location.href =
                    `/pages/teacher/student_tasks.html?studentId=${btn.dataset.viewTasks}`;
            });
        });

    } catch (err) {
        studentsEl.innerHTML = `<p class="error-state">${_esc(err.message)}</p>`;
        toast(err.message, 'error');
    }
}

function _studentCard(s) {
    const sid     = s._id  ?? s.id;
    const name    = s.name ?? s.email ?? 'Unknown';
    const initial = name[0]?.toUpperCase() ?? '?';

    const studentTasks = _allTasks.filter(t =>
        String(t.assignedTo?._id ?? t.assignedTo?.id ?? t.assignedTo) === String(sid)
    );
    const total   = studentTasks.length;
    const pending = studentTasks.filter(t =>
        _normaliseStatus(t.status ?? t._status) === 'ASSIGNED'
    ).length;
    const scored  = studentTasks.filter(t =>
        _normaliseStatus(t.status ?? t._status) === 'SCORED'
    ).length;
    const submitted = studentTasks.filter(t =>
        _normaliseStatus(t.status ?? t._status) === 'SUBMITTED'
    ).length;

    return `
    <div class="student-card">
        <div class="student-card__avatar">${_esc(initial)}</div>
        <div class="student-card__info">
            <span class="student-card__name">${_esc(name)}</span>
            <span class="student-card__email">${_esc(s.email ?? '')}</span>
            <div class="student-card__stats" style="margin-top:6px">
                <span class="stat-pill">${total} tasks</span>
                ${pending   ? `<span class="stat-pill stat-pill--warning">${pending} pending</span>`   : ''}
                ${submitted ? `<span class="stat-pill stat-pill--info">${submitted} to review</span>` : ''}
                ${scored    ? `<span class="stat-pill stat-pill--success">${scored} scored</span>`    : ''}
            </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
            <button class="btn btn--ghost btn--sm"
                    data-view-tasks="${sid}">View tasks</button>
            <button class="btn btn--primary btn--sm"
                    data-assign="${sid}" data-name="${_esc(name)}">+ Assign task</button>
        </div>
    </div>`;
}

// ── 3. Review queue ───────────────────────────────────────────────────────────
function loadPendingQueue(tasks) {
    if (!pendingEl) return;

    const submitted = tasks
        .filter(t => _normaliseStatus(t.status ?? t._status) === 'SUBMITTED')
        .sort((a, b) =>
            new Date(a.submittedAt ?? a.createdAt) - new Date(b.submittedAt ?? b.createdAt));

    if (!submitted.length) {
        pendingEl.innerHTML = _emptyState('🎉', 'All clear!', 'No tasks waiting for review.');
        return;
    }

    pendingEl.innerHTML = submitted.map(t => {
        const tid     = t._id ?? t.id;
        const student = t.assignedTo?.name ?? t.assignedTo?.email ?? '—';
        const status  = t.status ?? t._status;
        return `
        <div class="queue-row">
            <div class="queue-row__info">
                <span class="queue-row__title">${_esc(t.title ?? t._title ?? 'Untitled')}</span>
                <span class="queue-row__meta">
                    ${_esc(student)} · ${_esc(t.taskType ?? t._taskType ?? '')} ·
                    submitted ${_fmtDate(t.submittedAt ?? t._submittedAt)}
                </span>
            </div>
            ${statusBadge(status)}
            <a href="/pages/teacher/review.html?id=${tid}&mode=review"
               class="btn btn--warning btn--sm">Review →</a>
        </div>`;
    }).join('');
}

// ── 4. All tasks table ────────────────────────────────────────────────────────
async function loadTasks() {
    if (!tasksEl) return;
    tasksEl.innerHTML = '<p class="loading">Loading tasks…</p>';
    try {
        const res = await teacherAPI.assignedTasks();
        const raw = res?.data ?? res ?? [];
        _allTasks = Array.isArray(raw) ? raw : (raw.tasks ?? raw.data ?? []);

        deriveStats(_allTasks);
        loadPendingQueue(_allTasks);
        _renderTasksTable();
    } catch (err) {
        tasksEl.innerHTML = `<p class="error-state">${_esc(err.message)}</p>`;
        if (pendingEl) pendingEl.innerHTML = `<p class="error-state">${_esc(err.message)}</p>`;
        [statSubmitted, statReviewed, statScored].forEach(el => _setStatCard(el, '—'));
        toast(err.message, 'error');
    }
}

function _renderTasksTable() {
    if (!tasksEl) return;

    const q            = searchEl?.value.trim().toLowerCase() ?? '';
    const statusFilter = statusFilterEl?.value ?? '';

    const filtered = _allTasks.filter(t => {
        const title  = (t.title ?? t._title ?? '').toLowerCase();
        const status = _normaliseStatus(t.status ?? t._status ?? '');
        return (!q || title.includes(q)) && (!statusFilter || status === statusFilter);
    });

    if (!filtered.length) {
        tasksEl.innerHTML = _emptyState('📭', 'No tasks found', 'Try adjusting your search or filter.');
        return;
    }

    tasksEl.innerHTML = `
    <table class="data-table">
        <thead>
            <tr>
                <th>Title</th>
                <th>Student</th>
                <th>Type</th>
                <th>Status</th>
                <th>Due</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${filtered.map(t => {
                const tid       = t._id ?? t.id;
                const student   = t.assignedTo?.name ?? t.assignedTo?.email ?? '—';
                const rawStatus = t.status ?? t._status;
                const status    = _normaliseStatus(rawStatus);
                const canReview = status === 'SUBMITTED';
                return `
                <tr>
                    <td class="col-title">${_esc(t.title ?? t._title ?? 'Untitled')}</td>
                    <td>${_esc(student)}</td>
                    <td class="col-mono">${_esc(t.taskType ?? t._taskType ?? '—')}</td>
                    <td>${statusBadge(rawStatus)}</td>
                    <td class="col-mono">${_fmtDate(t.dueDate ?? t._dueDate)}</td>
                    <td class="actions-cell">
                        <a href="/pages/teacher/review.html?id=${tid}&mode=${canReview ? 'review' : 'view'}"
                           class="btn btn--${canReview ? 'warning' : 'ghost'} btn--sm">
                            ${canReview ? 'Review →' : 'View'}
                        </a>
                    </td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>`;
}

// ── Filter / search events ────────────────────────────────────────────────────
searchEl?.addEventListener('input', () => {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(_renderTasksTable, 300);
});
statusFilterEl?.addEventListener('change', _renderTasksTable);

// ── Real-time notifications → refresh dashboard ───────────────────────────────
// When a student submits, accepts, or declines — refresh tasks + students
// so stats, queue, and student cards all update without a page reload.
window.addEventListener('noti:new', async (e) => {
    const type = e.detail?.type;
    const REFRESH_TYPES = new Set([
        'task_submitted',   // student submitted essay → appears in review queue
        'task_accepted',    // student accepted assignment → status change
        'task_declined',    // student declined assignment → status change
    ]);
    if (REFRESH_TYPES.has(type)) {
        await loadTasks();
        await loadStudents();
    }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const _normaliseStatus = (s) => String(s ?? '').toUpperCase();

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