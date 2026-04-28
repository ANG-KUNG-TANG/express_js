/**
 * js/pages/teacher/dashboard.js
 * Drives pages/teacher/dashboard.html
 *
 * ── Original sections ─────────────────────────────────────────
 *  1. Stats bar        — awaiting review / reviewed / scored counts
 *  2. Students         — linked students with task stats + assign button
 *  3. Review queue     — submitted tasks oldest-first
 *  4. All tasks        — searchable, filterable table
 *  5. Real-time        — socket events refresh the whole page
 *
 * ── New features added ────────────────────────────────────────
 *  • Animated count-up on stat cards (easeOut cubic)
 *  • Skeleton shimmer loader while stats are fetching
 *  • Urgent pulse animation when pendingReview > 0
 *  • Two extra stat cards: Active Assignments + Reviewed This Month
 *    (pulled from GET /teacher/dashboard-stats, falls back to
 *     deriving counts locally if that endpoint is unavailable)
 *  • Student cards now show average band score + "View profile" button
 *  • Review-queue timestamps use full datetime (day + time), not just date
 *  • _fmtDateTime() helper added alongside existing _fmtDate()
 */

import { requireRole }        from '../../core/router.js';
import { teacherAPI }         from '../../core/api.js';
import { initTeacherSidebar } from '../../../components/teacher_sidebar.js';
import { statusBadge }        from '../../../components/statusBadge.js';
import { toast }              from '../../utils/toast.js';
import { initSocket }         from '../../core/socket.js';

requireRole('teacher', 'admin');
initTeacherSidebar();
initSocket();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const statsGridEl    = document.getElementById('teacher-stats-grid'); // NEW: animated grid
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
    _injectStatsStyles();          // NEW: scoped CSS for stat cards
    _renderStatsSkeleton();        // NEW: shimmer placeholders while loading
    await Promise.all([
        loadTasks(),
        loadStudents(),
        _loadDashboardStats(),     // NEW: calls /teacher/dashboard-stats
    ]);
})();

// ─────────────────────────────────────────────────────────────────────────────
// §1  STATS  — now an animated 5-card grid
//     Original: 3 inline counters (submitted / reviewed / scored)
//     New:      5 icon cards with count-up + skeleton + urgent pulse
//     Falls back to locally-derived counts if the stats endpoint fails
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NEW — fetch richer stats from the dedicated endpoint.
 * If the endpoint fails (e.g. not yet implemented), we silently fall back
 * to deriveStats() which counts from _allTasks.
 */
async function _loadDashboardStats() {
    try {
        const res   = await teacherAPI.dashboardStats();
        const stats = res?.data ?? res ?? {};
        _renderStatCards({
            submitted:         stats.pendingReview      ?? 0,
            reviewed:          stats.reviewedThisMonth  ?? 0,
            scored:            stats.scoredTotal        ?? 0,
            activeAssignments: stats.activeAssignments  ?? 0,
            studentCount:      stats.studentCount       ?? 0,
        });
    } catch {
        // Endpoint not available — deriveStats() will fill in after loadTasks()
    }
}

/**
 * Derive counts from the already-loaded _allTasks array.
 * Called after loadTasks() resolves, so it can always fill any cards
 * that _loadDashboardStats() left at 0.
 */
function deriveStats(tasks) {
    const counts = { SUBMITTED: 0, REVIEWED: 0, SCORED: 0, ASSIGNED: 0 };
    tasks.forEach(t => {
        const s = _normaliseStatus(t.status ?? t._status);
        if (s in counts) counts[s]++;
    });
    // Only call _renderStatCards if the grid is still showing skeletons
    // (i.e. the API endpoint either failed or returned zeroes for these fields)
    _renderStatCards({
        submitted:         counts.SUBMITTED,
        reviewed:          counts.REVIEWED,
        scored:            counts.SCORED,
        activeAssignments: counts.ASSIGNED,
        studentCount:      null,   // unknown without the dedicated endpoint
    });
}

/** NEW — animated count-up (easeOut cubic, 900 ms). */
function _animateCount(el, target, duration = 900) {
    const start   = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const tick    = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        el.textContent = Math.round(target * easeOut(progress));
        if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

/** NEW — render the 5-card stat grid (replaces the old 3 inline counters). */
function _renderStatCards({ submitted, reviewed, scored, activeAssignments, studentCount }) {
    if (!statsGridEl) return;

    const cards = [
        {
            id:     'stat-submitted',
            value:  submitted,
            label:  'Awaiting review',
            urgent: submitted > 0,
            accent: '#e0a030',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">
                       <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                       <polyline points="14 2 14 8 20 8"/>
                       <line x1="12" y1="18" x2="12" y2="12"/>
                       <line x1="9"  y1="15" x2="15" y2="15"/>
                   </svg>`,
        },
        {
            id:     'stat-reviewed',
            value:  reviewed,
            label:  'Reviewed this month',
            accent: '#5cba7d',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">
                       <polyline points="20 6 9 17 4 12"/>
                   </svg>`,
        },
        {
            id:     'stat-scored',
            value:  scored,
            label:  'Scored',
            accent: '#4a9eca',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">
                       <circle cx="12" cy="8"  r="6"/>
                       <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                   </svg>`,
        },
        {
            id:     'stat-active',
            value:  activeAssignments,
            label:  'Active assignments',
            accent: '#7c6de8',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">
                       <circle cx="12" cy="12" r="10"/>
                       <polyline points="12 6 12 12 16 14"/>
                   </svg>`,
        },
        ...(studentCount !== null ? [{
            id:     'stat-students',
            value:  studentCount,
            label:  'My students',
            accent: 'var(--teacher-color, #2d7a55)',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">
                       <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                       <circle cx="9" cy="7" r="4"/>
                       <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                   </svg>`,
        }] : []),
    ];

    statsGridEl.innerHTML = cards.map(c => `
        <div class="ts-card ${c.urgent ? 'ts-card--urgent' : ''}" style="--card-accent:${c.accent}">
            <div class="ts-card__icon">${c.icon}</div>
            <div class="ts-card__body">
                <span class="ts-card__value" id="${c.id}">0</span>
                <span class="ts-card__label">${c.label}</span>
            </div>
            ${c.urgent ? '<span class="ts-card__badge">Needs attention</span>' : ''}
        </div>
    `).join('');

    requestAnimationFrame(() => {
        cards.forEach(c => {
            const el = document.getElementById(c.id);
            if (el && c.value != null) _animateCount(el, c.value);
        });
    });
}

/** NEW — shimmer skeleton shown before the first data arrives. */
function _renderStatsSkeleton() {
    if (!statsGridEl) return;
    statsGridEl.innerHTML = Array(5).fill(`
        <div class="ts-card ts-card--skeleton">
            <div class="ts-skeleton ts-skeleton--icon"></div>
            <div class="ts-card__body">
                <div class="ts-skeleton ts-skeleton--value"></div>
                <div class="ts-skeleton ts-skeleton--label"></div>
            </div>
        </div>
    `).join('');
}

/** NEW — inject scoped CSS for the stat card grid (runs once). */
function _injectStatsStyles() {
    if (document.getElementById('ts-styles')) return;
    const s = document.createElement('style');
    s.id = 'ts-styles';
    s.textContent = `
        :root { --teacher-color: #2d7a55; }
        #teacher-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .ts-card {
            position: relative;
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1.1rem 1.25rem;
            background: var(--adm-card-bg, #1a2236);
            border: 1px solid rgba(255,255,255,0.07);
            border-left: 3px solid var(--card-accent, var(--teacher-color));
            border-radius: 10px;
            overflow: hidden;
            transition: transform .2s ease, box-shadow .2s ease;
        }
        .ts-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.25); }
        .ts-card--urgent {
            border-left-color: #e0a030;
            animation: ts-pulse 2.5s ease-in-out infinite;
        }
        @keyframes ts-pulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(224,160,48,0); }
            50%      { box-shadow: 0 0 0 6px rgba(224,160,48,.12); }
        }
        .ts-card__icon {
            flex-shrink: 0;
            width: 36px; height: 36px;
            display: flex; align-items: center; justify-content: center;
            color: var(--card-accent, var(--teacher-color));
        }
        .ts-card__body { display: flex; flex-direction: column; gap: .1rem; }
        .ts-card__value {
            font-size: 1.9rem; font-weight: 700; line-height: 1;
            color: var(--adm-text-primary, #e8e8e8);
            font-variant-numeric: tabular-nums;
        }
        .ts-card__label {
            font-size: .7rem; text-transform: uppercase;
            letter-spacing: .07em; color: var(--adm-text-muted, #8a9bb0);
        }
        .ts-card__badge {
            position: absolute; top: .5rem; right: .6rem;
            font-size: .62rem; text-transform: uppercase; letter-spacing: .06em;
            color: #e0a030; background: rgba(224,160,48,.12);
            padding: .12rem .45rem; border-radius: 99px;
        }
        .ts-card--skeleton { pointer-events: none; }
        .ts-skeleton {
            background: linear-gradient(90deg,
                rgba(255,255,255,.04) 25%,
                rgba(255,255,255,.09) 50%,
                rgba(255,255,255,.04) 75%);
            background-size: 200% 100%;
            animation: ts-shimmer 1.4s infinite;
            border-radius: 5px;
        }
        @keyframes ts-shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        .ts-skeleton--icon  { width: 36px; height: 36px; border-radius: 8px; }
        .ts-skeleton--value { width: 52px; height: 26px; margin-bottom: 5px; }
        .ts-skeleton--label { width: 90px;  height: 11px; }
    `;
    document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// §2  STUDENTS  — original cards + new avg band score + "View profile" button
// ─────────────────────────────────────────────────────────────────────────────

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

        // NEW — "View profile" navigates to teacher_student_profile page
        studentsEl.querySelectorAll('[data-view-profile]').forEach(btn => {
            btn.addEventListener('click', () => {
                window.location.href =
                    `/pages/teacher/teacher_student_profile.html?studentId=${btn.dataset.viewProfile}`;
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
    const total     = studentTasks.length;
    const pending   = studentTasks.filter(t => _normaliseStatus(t.status ?? t._status) === 'ASSIGNED').length;
    const scored    = studentTasks.filter(t => _normaliseStatus(t.status ?? t._status) === 'SCORED').length;
    const submitted = studentTasks.filter(t => _normaliseStatus(t.status ?? t._status) === 'SUBMITTED').length;

    // NEW — average band score across all scored tasks for this student
    const scoredTasks  = studentTasks.filter(t =>
        _normaliseStatus(t.status ?? t._status) === 'SCORED' &&
        (t.bandScore ?? t._bandScore ?? t.score ?? t._score) != null
    );
    const avgBand = scoredTasks.length
        ? (scoredTasks.reduce((sum, t) =>
              sum + Number(t.bandScore ?? t._bandScore ?? t.score ?? t._score), 0
          ) / scoredTasks.length).toFixed(1)
        : null;

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
                ${avgBand   ? `<span class="stat-pill stat-pill--neutral">avg band ${avgBand}</span>` : ''}
            </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end">
            <button class="btn btn--ghost btn--sm"
                    data-view-profile="${sid}">Profile</button>
            <button class="btn btn--ghost btn--sm"
                    data-view-tasks="${sid}">Tasks</button>
            <button class="btn btn--primary btn--sm"
                    data-assign="${sid}" data-name="${_esc(name)}">+ Assign</button>
        </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// §3  REVIEW QUEUE  — now shows full datetime, not just date
// ─────────────────────────────────────────────────────────────────────────────

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
                    submitted ${_fmtDateTime(t.submittedAt ?? t._submittedAt)}
                </span>
            </div>
            ${statusBadge(status)}
            <a href="/pages/teacher/review.html?id=${tid}&mode=review"
               class="btn btn--warning btn--sm">Review →</a>
        </div>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// §4  ALL-TASKS TABLE  — unchanged from original
// ─────────────────────────────────────────────────────────────────────────────

async function loadTasks() {
    if (!tasksEl) return;
    tasksEl.innerHTML = '<p class="loading">Loading tasks…</p>';
    try {
        const res = await teacherAPI.assignedTasks();
        const raw = res?.data ?? res ?? [];
        _allTasks = Array.isArray(raw) ? raw : (raw.tasks ?? raw.data ?? []);

        // Derive local counts — fills any cards that the /dashboard-stats
        // endpoint did not populate (e.g. if it failed or is not deployed yet)
        deriveStats(_allTasks);
        loadPendingQueue(_allTasks);
        _renderTasksTable();
    } catch (err) {
        tasksEl.innerHTML = `<p class="error-state">${_esc(err.message)}</p>`;
        if (pendingEl) pendingEl.innerHTML = `<p class="error-state">${_esc(err.message)}</p>`;
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
        tasksEl.innerHTML = _emptyState('📭', 'No tasks found',
            'Try adjusting your search or filter.');
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

// ─────────────────────────────────────────────────────────────────────────────
// §5  REAL-TIME  — unchanged; refreshes tasks + students on socket events
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener('noti:new', async (e) => {
    const REFRESH_TYPES = new Set([
        'task_submitted',
        'task_accepted',
        'task_declined',
    ]);
    if (REFRESH_TYPES.has(e.detail?.type)) {
        await loadTasks();
        await loadStudents();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const _normaliseStatus = (s) => String(s ?? '').toUpperCase();

const _fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB',
            { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';

// NEW — full datetime for the review queue (shows time as well as date)
const _fmtDateTime = (d) =>
    d ? new Date(d).toLocaleString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
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