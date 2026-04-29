// js/teacher/teacher_student_profile.js
// Renders a read-only profile for a single student assigned to this teacher.
// URL: /pages/teacher/teacher_student_profile.html?studentId=<id>

import { teacherAPI }  from '../../core/api.js';
import { requireRole }        from '../../core/router.js';
import { initTeacherSidebar } from '../../../components/teacher_sidebar.js';
import { toast }              from '../../utils/toast.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
requireRole('teacher', 'admin');
initTeacherSidebar();

const params    = new URLSearchParams(window.location.search);
const studentId = params.get('studentId');

if (!studentId) {
    renderError('No student ID provided.');
} else {
    loadStudent(studentId);
}

// ── Data fetch ────────────────────────────────────────────────────────────────
async function loadStudent(id) {
    try {
        const res     = await teacherAPI.getStudent(id);
        const student = res?.data ?? res;
        renderProfile(student);
    } catch (err) {
        toast(err.message || 'Failed to load student.', 'error');
        renderError(err.message || 'Student not found or not assigned to you.');
    }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderProfile(s) {
    const root   = document.getElementById('sp-root');
    const name   = s.name  ?? s._name  ?? 'Unknown';
    const email  = s.email ?? s._email ?? '—';
    const bio    = s.bio   ?? s._bio;
    const status = s.status ?? 'active';
    const avatar = s.avatarUrl ?? s._avatarUrl;

    const initials    = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const avatarHtml  = avatar
        ? `<img src="${avatar}" alt="${name}" />`
        : initials;

    const statusClass = status === 'suspended' ? 'sp-status-badge--suspended' : 'sp-status-badge--active';
    const statusLabel = status === 'suspended' ? 'Suspended' : 'Active';

    const targetBand = s.targetBand ?? s._targetBand;
    const examDate   = s.examDate   ?? s._examDate;
    const createdAt  = s.createdAt  ?? s._createdAt;

    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    root.innerHTML = `
        <div class="sp-header">
            <a class="sp-back-btn" href="javascript:history.back()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back
            </a>
            <h1 class="adm-page-title" style="margin:0">Student Profile</h1>
        </div>

        <!-- Hero card -->
        <div class="sp-hero adm-card">
            <div class="sp-cover"></div>
            <div class="sp-avatar-wrap">
                <div class="sp-avatar">${avatarHtml}</div>
                <span class="sp-status-badge ${statusClass}">${statusLabel}</span>
            </div>
            <div class="sp-identity">
                <h2 class="sp-name">${name}</h2>
                <p class="sp-email">${email}</p>
                ${bio ? `<p class="sp-bio">${bio}</p>` : ''}
            </div>
        </div>

        <!-- Info grid -->
        <div class="sp-info-grid">
            <div class="sp-info-card">
                <div class="sp-info-card__label">Target Band</div>
                <div class="sp-info-card__value ${targetBand == null ? 'sp-info-card__value--muted' : ''}">
                    ${targetBand != null ? targetBand : 'Not set'}
                </div>
            </div>
            <div class="sp-info-card">
                <div class="sp-info-card__label">Exam Date</div>
                <div class="sp-info-card__value ${!examDate ? 'sp-info-card__value--muted' : ''}">
                    ${examDate ? fmt(examDate) : 'Not set'}
                </div>
            </div>
            <div class="sp-info-card">
                <div class="sp-info-card__label">Joined</div>
                <div class="sp-info-card__value">${fmt(createdAt)}</div>
            </div>
        </div>

        <!-- Quick actions -->
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <a
                href="/pages/teacher/student_tasks.html?studentId=${s.id ?? s._id}"
                class="adm-btn adm-btn--primary"
            >
                View Tasks
            </a>
        </div>
    `;
}

// ── Error state ───────────────────────────────────────────────────────────────
function renderError(message) {
    const root = document.getElementById('sp-root');
    root.innerHTML = `
        <div class="sp-error-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>${message}</p>
            <a class="sp-back-btn" href="javascript:history.back()">Go back</a>
        </div>
    `;
}