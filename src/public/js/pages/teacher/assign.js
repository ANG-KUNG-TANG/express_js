/**
 * js/pages/teacher/assign.js
 * Drives pages/teacher/assign.html
 *
 * Supports all 3 assign modes from POST /teacher/assign:
 *   teacher_new      → create a brand-new task and assign it
 *   teacher_existing → assign an already-existing task by ID
 *   teacher_topic    → assign by topic keyword
 *
 * URL params:
 *   ?studentId=xxx   → pre-select a single student
 *   ?name=xxx        → pre-fill student name label
 *   ?groupId=xxx     → pre-select a group (future use)
 */

import { requireRole, getParam } from '../../core/router.js';
import { teacherAPI, taskAPI }   from '../../core/api.js';
import { toast }                 from '../../utils/toast.js';
import { initTeacherSidebar } from '../../../components/teacher_sidebar.js';

// Sidebar + notifications are handled by teacherNav.js loaded in the HTML.
initTeacherSidebar();
requireRole('teacher', 'admin');

// ── Pre-fill from URL params ──────────────────────────────────────────────────
const preStudentId = getParam('studentId');
const preName      = getParam('name');

// ── DOM refs ──────────────────────────────────────────────────────────────────
const modeSelect      = document.getElementById('assign-mode');
const studentSelect   = document.getElementById('student-select');
const assignAllToggle = document.getElementById('assign-all');
const assignAllLabel  = document.getElementById('assign-all-label');

const sectionNew      = document.getElementById('section-new');
const sectionExisting = document.getElementById('section-existing');
const sectionTopic    = document.getElementById('section-topic');

const form            = document.getElementById('assign-form');   // ✅ now finds the <form>
const submitBtn       = document.getElementById('submit-btn');
const submitLabel     = document.getElementById('submit-label');

// New task fields
const titleEl         = document.getElementById('new-title');
const promptEl        = document.getElementById('new-prompt');
const taskTypeEl      = document.getElementById('new-task-type');
const examTypeEl      = document.getElementById('new-exam-type');

// Existing task fields
const existingIdEl    = document.getElementById('existing-task-id');
const existingPreview = document.getElementById('existing-preview');

// Topic field
const topicEl         = document.getElementById('topic-keyword');

// Shared
const dueDateEl       = document.getElementById('due-date');
const reminderEl      = document.getElementById('reminder-hours');

// ── Load students into select ─────────────────────────────────────────────────
(async () => {
    try {
        const res      = await teacherAPI.listStudents();
        const students = res?.data ?? res ?? [];

        if (!students.length) {
            if (studentSelect) {
                studentSelect.innerHTML = '<option value="">No students linked yet</option>';
                studentSelect.disabled  = true;
            }
            toast('No students are linked to your account yet. Ask an admin to link them.', 'info');
            return;
        }

        if (studentSelect) {
            studentSelect.innerHTML =
                '<option value="">— Select a student —</option>' +
                students.map(s =>
                    `<option value="${s._id ?? s.id}" ${(s._id ?? s.id) === preStudentId ? 'selected' : ''}>
                        ${_esc(s.name ?? s.email)}
                    </option>`
                ).join('');
        }

        if (preStudentId && preName && assignAllLabel) {
            assignAllLabel.textContent = `Assign to all my students (not just ${_esc(preName)})`;
        }

    } catch (err) {
        toast('Could not load students: ' + err.message, 'error');
    }
})();

// ── Mode switcher — show/hide sections ───────────────────────────────────────
modeSelect?.addEventListener('change', _updateModeUI);
_updateModeUI();

function _updateModeUI() {
    const mode = modeSelect?.value ?? 'teacher_new';
    if (sectionNew)      sectionNew.style.display      = mode === 'teacher_new'      ? 'block' : 'none';
    if (sectionExisting) sectionExisting.style.display = mode === 'teacher_existing' ? 'block' : 'none';
    if (sectionTopic)    sectionTopic.style.display    = mode === 'teacher_topic'    ? 'block' : 'none';
    if (submitLabel)     submitLabel.textContent        = _submitLabel(mode);
}

function _submitLabel(mode) {
    const labels = {
        teacher_new:      'Create & assign task',
        teacher_existing: 'Assign existing task',
        teacher_topic:    'Assign by topic',
    };
    return labels[mode] ?? 'Assign';
}

// ── Existing task preview ─────────────────────────────────────────────────────
let _previewTimer = null;
existingIdEl?.addEventListener('input', () => {
    clearTimeout(_previewTimer);
    _previewTimer = setTimeout(_loadTaskPreview, 600);
});

async function _loadTaskPreview() {
    const id = existingIdEl?.value.trim();
    if (!existingPreview) return;
    if (!id) { existingPreview.innerHTML = ''; return; }

    existingPreview.innerHTML = '<p style="font-size:12px;color:var(--text3)">Loading…</p>';
    try {
        const res  = await taskAPI.getById(id);
        const task = res?.data ?? res;
        if (!task) throw new Error('Task not found');
        existingPreview.innerHTML = `
            <div style="padding:10px 14px;background:var(--surface2);border:1px solid var(--border);
                        border-radius:var(--radius-md);font-size:13px;margin-top:8px">
                <strong>${_esc(task.title ?? 'Untitled')}</strong>
                <span style="margin-left:8px;color:var(--text3)">
                    ${_esc(task.taskType ?? '')} · ${_esc(task.examType ?? '')}
                </span>
                ${task.questionPrompt
                    ? `<p style="color:var(--text3);font-size:12px;margin:4px 0 0">${_esc(task.questionPrompt)}</p>`
                    : ''}
            </div>`;
    } catch {
        existingPreview.innerHTML = '<p style="font-size:12px;color:var(--red,#dc2626)">Task not found.</p>';
    }
}

// ── Form submit ───────────────────────────────────────────────────────────────
form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const mode      = modeSelect?.value ?? 'teacher_new';
    const assignAll = assignAllToggle?.checked ?? false;
    const studentId = assignAll ? undefined : (studentSelect?.value || undefined);

    if (!assignAll && !studentId) {
        toast('Please select a student or enable "Assign to all students".', 'error');
        return;
    }

    // Build payload based on mode
    const payload = { taskSource: mode };

    if (studentId) payload.studentId = studentId;

    if (dueDateEl?.value)  payload.dueDate      = new Date(dueDateEl.value).toISOString();
    if (reminderEl?.value) payload.reminderHours = Number(reminderEl.value);

    if (mode === 'teacher_new') {
        const title = titleEl?.value.trim();
        const type  = taskTypeEl?.value;
        if (!title) { toast('Title is required.', 'error'); titleEl?.focus(); return; }
        if (!type)  { toast('Task type is required.', 'error'); taskTypeEl?.focus(); return; }
        payload.title          = title;
        payload.questionPrompt = promptEl?.value.trim() || undefined;
        payload.taskType       = type;
        payload.examType       = examTypeEl?.value || undefined;
    }

    if (mode === 'teacher_existing') {
        const tid = existingIdEl?.value.trim();
        if (!tid) { toast('Please enter a task ID.', 'error'); existingIdEl?.focus(); return; }
        payload.taskId = tid;
    }

    if (mode === 'teacher_topic') {
        const kw = topicEl?.value.trim();
        if (!kw) { toast('Please enter a topic keyword.', 'error'); topicEl?.focus(); return; }
        payload.topic = kw;
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    // Snapshot button label BEFORE we overwrite innerHTML
    const originalBtnHTML = submitBtn.innerHTML;

    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Assigning…';

    try {
        await teacherAPI.assign(payload);
        const who = assignAll ? 'all your students' : (preName ?? 'the student');
        toast(`Task assigned to ${who}! They will receive a notification.`, 'success');
        setTimeout(() => {
            window.location.href = '/pages/teacher/dashboard.html';
        }, 1200);
    } catch (err) {
        toast(err.message, 'error');
        submitBtn.disabled  = false;
        // ✅ FIX 2: restore innerHTML (not textContent) so the <span> is preserved
        submitBtn.innerHTML = originalBtnHTML;
    }
});

// ── Helper ────────────────────────────────────────────────────────────────────
const _esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');