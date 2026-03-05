/**
 * dashboard.js — WorkFlow-themed IELTS dashboard
 *
 * Bugs fixed:
 *  1. Admin endpoint was '/api/writing-tasks/all' — no such route exists.
 *     The real route is GET /api/writing-tasks (returns all tasks for admin, own tasks for user).
 *  2. task field was t.prompt — real field name is t.questionPrompt.
 *  3. Admin user-count endpoint was '/api/users' — correct route is GET /api/users (kept, verified).
 *  4. t._id used safely with fallback to t.id throughout.
 */

import { requireAuth }     from '../core/router.js';
import { isAdmin, getUser } from '../core/auth.js';
import { apiFetch }        from '../core/api.js';
import { initNavbar } from '../../components/navbar.js';
import { statusBadge }     from '../../components/statusBadge.js';
import { newsCard }        from '../../components/newsCard.js';
import { toast }           from '../core/toast.js';

requireAuth();
initNavbar();

const user = getUser();
const firstName = user?.name?.split(' ')[0] || 'there';
document.getElementById('welcome-name').textContent = `Welcome back, ${firstName} 👋`;

if (isAdmin()) {
    document.getElementById('user-dashboard').style.display  = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    loadAdminDashboard();
} else {
    loadUserDashboard();
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
async function loadUserDashboard() {
    try {
        const data  = await apiFetch('/api/writing-tasks');
        const tasks = data?.data ?? data ?? [];

        // Stats — count every status the task model uses
        const counts = { ASSIGNED: 0, WRITING: 0, SUBMITTED: 0, REVIEWED: 0, SCORED: 0 };
        tasks.forEach(t => { if (t.status in counts) counts[t.status]++; });

        document.getElementById('stat-assigned').textContent  = counts.ASSIGNED;
        document.getElementById('stat-writing').textContent   = counts.WRITING;
        document.getElementById('stat-submitted').textContent = counts.SUBMITTED;
        document.getElementById('stat-scored').textContent    = counts.SCORED;

        // Show most-recent 5 tasks
        renderRecentTasks(tasks.slice(0, 5));

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

    el.innerHTML = `<div class="task-list">` +
        tasks.map(t => {
            const tid = t._id || t.id;
            // ✅ FIX 2: field is questionPrompt, not prompt
            const prompt = t.questionPrompt || t.prompt || '';
            return `
            <div class="task-item animate-in">
                <div class="task-item__body">
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
                    <a href="/pages/tasks/detail.html?id=${tid}" class="btn btn--ghost btn--sm">Open →</a>
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

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
async function loadAdminDashboard() {
    try {
        // ✅ FIX 1: No /all route — GET /api/writing-tasks returns all tasks for admin
        const taskData = await apiFetch('/api/writing-tasks');
        const tasks    = taskData?.data ?? taskData ?? [];

        const submitted = tasks.filter(t => t.status === 'SUBMITTED').length;
        const reviewed  = tasks.filter(t => t.status === 'REVIEWED').length;

        document.getElementById('admin-stat-total').textContent     = tasks.length;
        document.getElementById('admin-stat-submitted').textContent = submitted;
        document.getElementById('admin-stat-reviewed').textContent  = reviewed;

        // Action queue: tasks needing attention
        const queue = tasks
            .filter(t => ['SUBMITTED', 'REVIEWED'].includes(t.status))
            .slice(0, 10);
        renderActionQueue(queue);

    } catch (err) {
        document.getElementById('action-queue').innerHTML =
            `<div class="alert alert--error">${esc(err.message)}</div>`;
    }

    // User count
    try {
        const userData = await apiFetch('/api/users');
        const users    = userData?.data ?? userData ?? [];
        document.getElementById('admin-stat-users').textContent = users.length;
    } catch {
        document.getElementById('admin-stat-users').textContent = '—';
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
        const tid = t._id || t.id;
        return `
        <div class="queue-item animate-in">
            <div class="queue-item__info">
                <div class="queue-item__title">${esc(t.title || 'Untitled')}</div>
                <div class="queue-item__user">by ${esc(t.user?.name || 'Unknown user')}</div>
            </div>
            ${statusBadge(t.status)}
            <div style="display:flex;gap:6px;flex-shrink:0">
                <a href="/pages/admin/review.html?id=${tid}" class="btn btn--primary btn--sm">
                    ${t.status === 'SUBMITTED' ? 'Review' : 'Score'}
                </a>
            </div>
        </div>`;
    }).join('');
}

function esc(s) {
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}