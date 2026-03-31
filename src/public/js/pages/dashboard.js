/**
 * dashboard.js — student dashboard
 *
 * Real-time:
 *  - student: task_assigned / task_reviewed / task_scored → reload student section
 */

import { requireAuth }       from '../core/router.js';
import { getUser }           from '../core/auth.js';
import { apiFetch }          from '../core/api.js';
import { initNavbar }        from '../../components/navbar.js';
import { statusBadge }       from '../../components/statusBadge.js';
import { newsCard }          from '../../components/newsCard.js';
import { toast }             from '../core/toast.js';
import { initSocket }        from '../core/socket.js';

requireAuth();
initNavbar();
initSocket();

const user      = getUser();
const firstName = user?.name?.split(' ')[0] || 'there';

document.getElementById('welcome-name').textContent = `Welcome back, ${firstName} 👋`;

loadUserDashboard();

// ── Real-time refresh ─────────────────────────────────────────────────────────
window.addEventListener('noti:new', (e) => {
    const type = e.detail?.type;
    const STUDENT_REFRESH = new Set(['task_assigned', 'task_reviewed', 'task_scored']);
    if (STUDENT_REFRESH.has(type)) loadUserDashboard();
});

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
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

        const sorted = [...tasks].sort((a, b) => {
            const aNeeds = a.status === 'ASSIGNED' && a.taskSource?.startsWith('teacher');
            const bNeeds = b.status === 'ASSIGNED' && b.taskSource?.startsWith('teacher');
            if (aNeeds && !bNeeds) return -1;
            if (!aNeeds && bNeeds) return  1;
            return new Date(b.updatedAt ?? b.createdAt) - new Date(a.updatedAt ?? a.createdAt);
        });

        renderRecentTasks(sorted.slice(0, 5));
    } catch {
        document.getElementById('recent-tasks').innerHTML =
            emptyState('✍️', 'No tasks yet', 'Start your first writing task.',
                '/pages/tasks/create.html', 'Create a task');
    }
    loadNewsPreview();
}

function renderRecentTasks(tasks) {
    const el = document.getElementById('recent-tasks');
    if (!tasks.length) {
        el.innerHTML = emptyState('✍️', 'No tasks yet',
            'Start your first writing task to begin practising.',
            '/pages/tasks/create.html', 'Create a task');
        return;
    }

    const isTeacherAssigned = t =>
        t.taskSource?.startsWith('teacher') && t.status === 'ASSIGNED';

    el.innerHTML = `<div class="task-list">` +
        tasks.map(t => {
            const tid    = t._id || t.id;
            const prompt = t.questionPrompt || t.prompt || '';
            const banner = isTeacherAssigned(t)
                ? `<div style="font-size:.7rem;color:var(--amber,#d97706);font-weight:600;margin-bottom:4px">
                       📋 Teacher assigned — please accept or decline
                   </div>`
                : '';
            return `
            <div class="task-item animate-in">
                <div class="task-item__body">
                    ${banner}
                    <div class="task-item__title">${esc(t.title || 'Untitled')}</div>
                    ${prompt ? `<div class="task-item__prompt">${esc(prompt)}</div>` : ''}
                    <div class="task-item__meta" style="margin-top:6px">
                        ${statusBadge(t.status)}
                        <span style="font-size:.68rem;color:var(--text3)">
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
    if (!el) return;
    try {
        const data     = await apiFetch('/api/news/feed');
        const articles = data?.articles ?? data?.data ?? [];
        if (!articles.length) {
            el.innerHTML = emptyState('📰', 'No articles yet',
                'Set your interests to get personalised news.',
                '/pages/news/interests.html', 'Set interests');
            return;
        }
        el.innerHTML = articles.slice(0, 3).map(a => newsCard(a)).join('');
    } catch {
        el.innerHTML = emptyState('📰', 'No articles yet',
            'Set your interests to get personalised news.',
            '/pages/news/interests.html', 'Set interests');
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function emptyState(icon, title, desc, href, btnLabel) {
    const btn = href ? `<a href="${href}" class="btn btn--primary btn--sm">${btnLabel}</a>` : '';
    return `
        <div class="empty-state">
            <div style="font-size:2rem;margin-bottom:10px">${icon}</div>
            <h3>${title}</h3>
            <p>${desc}</p>
            ${btn}
        </div>`;
}
