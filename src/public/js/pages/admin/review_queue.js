/**
 * js/pages/admin/review_queue.js
 * Lists all SUBMITTED writing tasks, oldest-first, for admin review.
 */

import { getUser }          from '../../core/auth.js';
import { apiFetch }         from '../../core/api.js';
import { initAdminSidebar } from '../../../components/admin_sidebar.js';

initAdminSidebar();

// ── Auth guard ────────────────────────────────────────────────────────────────
const _user = getUser();
if (!_user || _user.role !== 'admin') window.location.replace('/pages/auth/login.html');

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tableBody  = document.getElementById('queue-tbody');
const emptyState = document.getElementById('queue-empty');
const loadingEl  = document.getElementById('queue-loading');
const countEl    = document.getElementById('queue-count');

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (iso) => iso
    ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

const escHtml = (str) =>
    String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Load queue ────────────────────────────────────────────────────────────────
const loadQueue = async () => {
    if (loadingEl)  loadingEl.style.display  = 'block';
    if (tableBody)  tableBody.innerHTML      = '';
    if (emptyState) emptyState.style.display = 'none';

    try {
        const res   = await apiFetch('/api/admin/writing-tasks?status=SUBMITTED&sort=createdAt&order=asc&limit=100');
        const tasks = res?.data ?? res?.tasks ?? res ?? [];

        if (countEl) countEl.textContent = tasks.length;

        if (!tasks.length) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        tableBody.innerHTML = tasks.map((t) => {
            const id        = t._id       ?? t.id;
            const title     = escHtml(t.title     ?? t._title     ?? '—');
            const taskType  = escHtml(t.taskType  ?? t._taskType  ?? '—');
            const examType  = escHtml(t.examType  ?? t._examType  ?? '—');
            const student   = escHtml(t.userId?.name ?? t.studentName ?? t.userId ?? '—');
            const wordCount = t.wordCount ?? t._wordCount;
            const submitted = fmt(t.submittedAt ?? t.updatedAt ?? t.createdAt);

            return `
            <tr>
                <td>${title}</td>
                <td>${taskType} · ${examType}</td>
                <td>${student}</td>
                <td>${wordCount ? `${wordCount} words` : '—'}</td>
                <td>${submitted}</td>
                <td>
                    <a class="btn btn--sm btn--primary" href="/pages/admin/review_detail.html?id=${id}">
                        Review
                    </a>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        if (tableBody) tableBody.innerHTML =
            `<tr><td colspan="6" class="text-danger">Failed to load queue: ${escHtml(err.message)}</td></tr>`;
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
    }
};

loadQueue();