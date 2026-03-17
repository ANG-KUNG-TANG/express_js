/**
 * dashboard.js — main dashboard, role-aware
 * Roles: student → user dashboard
 *        teacher → teacher dashboard
 *        admin   → admin dashboard
 */

import { requireAuth }       from '../core/router.js';
import { isAdmin, getUser }  from '../core/auth.js';
import { apiFetch }          from '../core/api.js';
import { initNavbar }        from '../../components/navbar.js';
import { statusBadge }       from '../../components/statusBadge.js';
import { newsCard }          from '../../components/newsCard.js';
import { toast }             from '../core/toast.js';

requireAuth();
initNavbar();

const user      = getUser();
const firstName = user?.name?.split(' ')[0] || 'there';
const role      = user?.role ?? user?._role ?? 'user';

document.getElementById('welcome-name').textContent = `Welcome back, ${firstName} 👋`;

// ── Route by role ─────────────────────────────────────────────────────────────
if (role === 'admin') {
    document.getElementById('user-dashboard').style.display    = 'none';
    document.getElementById('admin-dashboard').style.display   = 'block';
    loadAdminDashboard();
} else if (role === 'teacher') {
    document.getElementById('user-dashboard').style.display    = 'none';
    document.getElementById('teacher-dashboard').style.display = 'block';
    loadTeacherDashboard();
} else {
    // student / default — user-dashboard visible by default, nothing to toggle
    loadUserDashboard();
}

// ═════════════════════════════════════════════════════════════════════════════
// STUDENT DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
async function loadUserDashboard() {
    try {
        const data  = await apiFetch('/api/writing-tasks');
        const tasks = data?.data ?? data ?? [];

        const counts = { ASSIGNED: 0, WRITING: 0, SUBMITTED: 0, REVIEWED: 0, SCORED: 0 };
        tasks.forEach(t => { if (t.status in counts) counts[t.status]++; });

        document.getElementById('stat-assigned').textContent  = counts.ASSIGNED;
        document.getElementById('stat-writing').textContent   = counts.WRITING;
        document.getElementById('stat-submitted').textContent = counts.SUBMITTED;
        document.getElementById('stat-scored').textContent    = counts.SCORED;

        // Sort: teacher-assigned + ASSIGNED status first, then by date
        const sorted = [...tasks].sort((a, b) => {
            const aNeeds = a.status === 'ASSIGNED' && a.taskSource?.startsWith('teacher');
            const bNeeds = b.status === 'ASSIGNED' && b.taskSource?.startsWith('teacher');
            if (aNeeds && !bNeeds) return -1;
            if (!aNeeds && bNeeds) return  1;
            return new Date(b.updatedAt ?? b.createdAt) - new Date(a.updatedAt ?? a.createdAt);
        });

        renderRecentTasks(sorted.slice(0, 5));
    } catch (err) {
        document.getElementById('recent-tasks').innerHTML =
            `<div class="alert alert--error">${esc(err.message)}</div>`;
    }

    loadNewsPreview();
}

function renderRecentTasks(tasks) {
    const el = document.getElementById('recent-tasks');
    if (!tasks.length) {
        el.innerHTML = `
            <div class="empty-state">
                <div style="font-size:2rem;margin-bottom:10px">✍️</div>
                <h3>No tasks yet</h3>
                <p>Start your first writing task to begin practising.</p>
                <a href="/pages/tasks/create.html" class="btn btn--primary btn--sm">Create a task</a>
            </div>`;
        return;
    }

    const isTeacherAssigned = t =>
        t.taskSource?.startsWith('teacher') && t.status === 'ASSIGNED';

    el.innerHTML = `<div class="task-list">` +
        tasks.map(t => {
            const tid    = t._id || t.id;
            const prompt = t.questionPrompt || t.prompt || '';
            const assignedBanner = isTeacherAssigned(t)
                ? `<div style="font-size:.7rem;color:var(--amber,#d97706);font-weight:600;margin-bottom:4px">
                     📋 Teacher assigned — please accept or decline
                   </div>`
                : '';
            return `
            <div class="task-item animate-in">
                <div class="task-item__body">
                    ${assignedBanner}
                    <div class="task-item__title">${esc(t.title || 'Untitled')}</div>
                    ${prompt ? `<div class="task-item__prompt">${esc(prompt)}</div>` : ''}
                    <div class="task-item__meta" style="margin-top:6px">
                        ${statusBadge(t.status)}
                        <span class="task-item__date" style="font-size:.68rem;color:var(--text3)">
                            ${t.taskType || ''} ${t.examType ? '· ' + t.examType : ''}
                        </span>
                    </div>
                </div>
                <div class="task-item__actions">
                    <a href="/pages/tasks/${isTeacherAssigned(t) ? 'list' : 'detail'}.html${isTeacherAssigned(t) ? '' : '?id=' + tid}"
                       class="btn btn--ghost btn--sm">
                        ${isTeacherAssigned(t) ? 'Respond →' : 'Open →'}
                    </a>
                </div>
            </div>`;
        }).join('') + `</div>`;
}

async function loadNewsPreview() {
    const el = document.getElementById('news-preview');
    try {
        const data     = await apiFetch('/api/news?limit=3');
        const articles = data?.articles ?? data?.data ?? [];
        if (!articles.length) {
            el.innerHTML = `
                <div class="empty-state">
                    <div style="font-size:2rem;margin-bottom:10px">📰</div>
                    <h3>No articles yet</h3>
                    <p>Set your interests to get personalised news.</p>
                    <a href="/pages/news/interests.html" class="btn btn--primary btn--sm">Set interests</a>
                </div>`;
            return;
        }
        el.innerHTML = articles.map(a => newsCard(a)).join('');
    } catch {
        el.innerHTML = `<p class="loading">Could not load news.</p>`;
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// TEACHER DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
async function loadTeacherDashboard() {
    try {
        const [submittedRes, reviewedRes] = await Promise.all([
            apiFetch('/api/teacher/writing-tasks?status=SUBMITTED'),
            apiFetch('/api/teacher/writing-tasks?status=REVIEWED'),
        ]);

        const submitted = submittedRes?.data ?? [];
        const reviewed  = reviewedRes?.data  ?? [];

        document.getElementById('teacher-stat-submitted').textContent = submitted.length;
        document.getElementById('teacher-stat-reviewed').textContent  = reviewed.length;

        renderTeacherQueue(submitted);
    } catch (err) {
        document.getElementById('teacher-queue').innerHTML =
            `<div class="alert alert--error">${esc(err.message)}</div>`;
        toast(err.message, 'error');
    }
}

function renderTeacherQueue(tasks) {
    const el = document.getElementById('teacher-queue');
    if (!tasks.length) {
        el.innerHTML = `
            <div class="empty-state">
                <div style="font-size:2rem;margin-bottom:10px">🎉</div>
                <h3>All clear!</h3>
                <p>No tasks waiting for your review.</p>
            </div>`;
        return;
    }

    const sorted = [...tasks].sort(
        (a, b) => new Date(a.submittedAt ?? a.createdAt) - new Date(b.submittedAt ?? b.createdAt)
    );

    el.innerHTML = sorted.map(t => {
        const tid = t._id || t.id;
        return `
        <div class="queue-item animate-in">
            <div class="queue-item__info">
                <div class="queue-item__title">${esc(t.title ?? t._title ?? 'Untitled')}</div>
                <div class="queue-item__user" style="font-size:.75rem;color:var(--text3)">
                    ${t.taskType ?? t._taskType ?? '—'} · submitted ${fmtTime(t.submittedAt ?? t._submittedAt)}
                </div>
            </div>
            ${statusBadge(t.status ?? t._status)}
            <a href="/pages/teacher/review.html?id=${tid}" class="btn btn--warning btn--sm">Review</a>
        </div>`;
    }).join('');
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
async function loadAdminDashboard() {
    try {
        // Single call to /api/admin/stats covers all 4 stat cards + action queue
        const { data: stats } = await apiFetch('/api/admin/stats');

        document.getElementById('admin-stat-total').textContent     = stats.tasks.total     ?? '—';
        document.getElementById('admin-stat-submitted').textContent = stats.tasks.submitted ?? '—';
        document.getElementById('admin-stat-reviewed').textContent  = stats.tasks.reviewed  ?? '—';
        document.getElementById('admin-stat-users').textContent     = stats.users.total     ?? '—';

        // recent comes from the stats response — no extra fetch needed
        const queue = (stats.recent ?? []).filter(t =>
            t.status === 'SUBMITTED' || t.status === 'REVIEWED'
        );
        renderActionQueue(queue);
    } catch (err) {
        document.getElementById('action-queue').innerHTML =
            `<div class="alert alert--error">${esc(err.message)}</div>`;
        toast(err.message, 'error');
    }
}

function renderActionQueue(tasks) {
    const el = document.getElementById('action-queue');
    if (!tasks.length) {
        el.innerHTML = `
            <div class="empty-state">
                <div style="font-size:2rem;margin-bottom:10px">🎉</div>
                <h3>All clear!</h3>
                <p>No tasks are waiting for review or scoring.</p>
            </div>`;
        return;
    }

    el.innerHTML = tasks.map(t => {
        const tid = t.id ?? t._id;
        return `
        <div class="queue-item animate-in">
            <div class="queue-item__info">
                <div class="queue-item__title">${esc(t.title ?? '—')}</div>
            </div>
            ${statusBadge(t.status)}
            <a href="/pages/admin/review.html?id=${tid}" class="btn btn--primary btn--sm">
                ${t.status === 'SUBMITTED' ? 'Review' : 'Score'}
            </a>
        </div>`;
    }).join('');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = d => d ? new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}) : '—';

function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}