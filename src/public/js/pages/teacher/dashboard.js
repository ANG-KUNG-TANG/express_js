// js/pages/teacher/dashboard.js
import { requireRole }  from '../../core/router.js';
import { apiFetch }     from '../../core/api.js';
import { initNavbar }   from '../../../components/navbar.js';
import { statusBadge }  from '../../../components/statusBadge.js';
import { toast }        from '../../core/toast.js';

requireRole('teacher', 'admin');
initNavbar();

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (d) =>
    d ? new Date(d).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    }) : '—';

const fmtDate = (d) =>
    d ? new Date(d).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
    }) : '—';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const setStat = (cardId, value) => {
    const el = document.querySelector(`#${cardId} .stat-card__value`);
    if (el) el.textContent = value ?? '—';
};

// ═════════════════════════════════════════════════════════════════════════════
// STATS
// ═════════════════════════════════════════════════════════════════════════════
const loadStats = async () => {
    try {
        const [submittedRes, reviewedRes, scoredRes] = await Promise.all([
            apiFetch('/api/teacher/writing-tasks?status=SUBMITTED'),
            apiFetch('/api/teacher/writing-tasks?status=REVIEWED'),
            apiFetch('/api/teacher/writing-tasks?status=SCORED'),
        ]);
        setStat('stat-submitted', (submittedRes?.data ?? []).length);
        setStat('stat-reviewed',  (reviewedRes?.data  ?? []).length);
        setStat('stat-scored',    (scoredRes?.data    ?? []).length);
    } catch (err) {
        toast(err.message, 'error');
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// PENDING REVIEW QUEUE
// ═════════════════════════════════════════════════════════════════════════════
const loadPendingQueue = async () => {
    const el = document.getElementById('pending-list');
    el.innerHTML = '<p class="loading">Loading…</p>';
    try {
        const { data: tasks } = await apiFetch('/api/teacher/writing-tasks?status=SUBMITTED');
        const sorted = (tasks ?? []).sort(
            (a, b) => new Date(a.submittedAt ?? a.createdAt) - new Date(b.submittedAt ?? b.createdAt)
        );

        if (!sorted.length) {
            el.innerHTML = '<p class="empty-state">🎉 No tasks awaiting review.</p>';
            return;
        }

        el.innerHTML = sorted.map((t) => {
            const tid     = t._id ?? t.id;
            const student = t.assignedTo?.name ?? t.assignedTo?.email ?? 'Unknown student';
            return `
            <div class="queue-row">
                <div class="queue-row__info">
                    <span class="queue-row__title">${esc(t.title ?? t._title ?? 'Untitled')}</span>
                    <span class="queue-row__meta">
                        ${esc(student)} ·
                        ${esc(t.taskType ?? t._taskType ?? '—')} ·
                        Submitted ${fmtTime(t.submittedAt ?? t._submittedAt ?? t.createdAt)}
                    </span>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0">
                    <a href="/pages/teacher/review.html?id=${tid}&mode=view"
                       class="btn btn--ghost btn--sm">View</a>
                    <a href="/pages/teacher/review.html?id=${tid}&mode=review"
                       class="btn btn--warning btn--sm">Review</a>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        el.innerHTML = '<p class="error-state">Failed to load queue.</p>';
        toast(err.message, 'error');
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// ALL TASKS TABLE  (search + filter)
// ═════════════════════════════════════════════════════════════════════════════
let taskTimer = null;

const loadAllTasks = async () => {
    const el     = document.getElementById('tasks-list');
    const q      = document.getElementById('task-search')?.value.trim() ?? '';
    const status = document.getElementById('task-status-filter')?.value ?? '';
    el.innerHTML = '<p class="loading">Loading…</p>';

    try {
        let url;
        if (q) {
            url = `/api/teacher/writing-tasks/search?q=${encodeURIComponent(q)}`;
            if (status) url += `&status=${encodeURIComponent(status)}`;
        } else {
            const params = new URLSearchParams();
            params.set('status', status || 'SUBMITTED,REVIEWED,SCORED');
            url = `/api/teacher/writing-tasks?${params}`;
        }

        const { data: tasks } = await apiFetch(url);

        if (!(tasks ?? []).length) {
            el.innerHTML = '<p class="empty-state">No tasks found.</p>';
            return;
        }

        el.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Title</th><th>Student</th><th>Type</th>
                    <th>Status</th><th>Due</th><th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map((t) => {
                    const tid     = t._id ?? t.id;
                    const st      = t.status ?? t._status;
                    const student = t.assignedTo?.name ?? t.assignedTo?.email ?? '—';
                    const reviewBtn = st === 'SUBMITTED'
                        ? `<a href="/pages/teacher/review.html?id=${tid}&mode=review"
                               class="btn btn--warning btn--xs">Review</a>`
                        : '';
                    return `<tr>
                        <td class="col-title" title="${esc(t.title ?? t._title ?? '')}">${esc(t.title ?? t._title ?? '—')}</td>
                        <td>${esc(student)}</td>
                        <td>${esc(t.taskType ?? t._taskType ?? '—')}</td>
                        <td>${statusBadge(st)}</td>
                        <td class="col-mono">${fmtTime(t.dueDate ?? t._dueDate)}</td>
                        <td class="actions-cell" style="display:flex;gap:6px;align-items:center">
                            <a href="/pages/teacher/review.html?id=${tid}&mode=view"
                               class="btn btn--ghost btn--xs">View</a>
                            ${reviewBtn}
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    } catch (err) {
        el.innerHTML = '<p class="error-state">Failed to load tasks.</p>';
        toast(err.message, 'error');
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// STUDENTS LIST  — each card has an "Assign Task" button
// ═════════════════════════════════════════════════════════════════════════════
const loadStudents = async () => {
    const el = document.getElementById('students-list');
    if (!el) return;
    el.innerHTML = '<p class="loading">Loading…</p>';

    try {
        const res      = await apiFetch('/api/teacher/students?stats=true');
        const students = res?.data ?? res ?? [];

        if (!students.length) {
            el.innerHTML = `
            <div class="empty-state" style="padding:40px 0;text-align:center;color:var(--text3)">
                <div style="font-size:2rem;margin-bottom:10px">👩‍🎓</div>
                <p>No students assigned to you yet.</p>
            </div>`;
            return;
        }

        el.innerHTML = students.map((s) => {
            const sid      = s._id ?? s.id;
            const name     = s.name  ?? s.email ?? 'Unknown';
            const avatar   = name.charAt(0).toUpperCase();
            const total    = s.taskStats?.total    ?? 0;
            const pending  = s.taskStats?.pending  ?? 0;
            const reviewed = s.taskStats?.reviewed ?? 0;

            return `
            <div class="student-card">
                <div class="student-card__avatar">${esc(avatar)}</div>
                <div class="student-card__info">
                    <span class="student-card__name">${esc(name)}</span>
                    <span class="student-card__email">${esc(s.email ?? '')}</span>
                </div>
                <div class="student-card__stats">
                    <span class="stat-pill">${total} tasks</span>
                    <span class="stat-pill stat-pill--warning">${pending} pending</span>
                    <span class="stat-pill stat-pill--success">${reviewed} reviewed</span>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
                    <button class="btn btn--primary btn--sm"
                            onclick="openAssignModal('${sid}', '${esc(name)}')">
                        + Assign Task
                    </button>
                    <a href="/pages/teacher/dashboard.html?student=${sid}"
                       class="btn btn--ghost btn--sm">View tasks →</a>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        el.innerHTML = '<p class="error-state">Failed to load students.</p>';
        toast(err.message, 'error');
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// ASSIGN TASK MODAL
// Opens when teacher clicks "+ Assign Task" on a student card.
// On success → POST /api/teacher/assign → backend creates task + sends
// notification to student via createNotificationUC → Socket.IO push.
// ═════════════════════════════════════════════════════════════════════════════
window.openAssignModal = (studentId, studentName) => {
    document.getElementById('assign-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'assign-modal';
    modal.innerHTML = `
    <div class="am-backdrop" id="am-backdrop"></div>
    <div class="am-box" role="dialog" aria-modal="true" aria-labelledby="am-title">

        <!-- Header -->
        <div class="am-header">
            <div>
                <h2 class="am-title" id="am-title">Assign Task</h2>
                <p class="am-sub">to <strong>${esc(studentName)}</strong></p>
            </div>
            <button class="am-close" id="am-close" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6"  y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>

        <!-- Body -->
        <div class="am-body">

            <!-- Title -->
            <div class="am-field">
                <label class="am-label" for="am-title-input">
                    Task Title <span class="am-req">*</span>
                </label>
                <input id="am-title-input" class="input" type="text"
                       placeholder="e.g. Opinion Essay — Technology and Society" />
            </div>

            <!-- Task type + Exam type -->
            <div class="am-row">
                <div class="am-field">
                    <label class="am-label" for="am-tasktype">Task Type</label>
                    <select id="am-tasktype" class="select">
                        <option value="TASK_1">Task 1</option>
                        <option value="TASK_2" selected>Task 2</option>
                    </select>
                </div>
                <div class="am-field">
                    <label class="am-label" for="am-examtype">Exam Type</label>
                    <select id="am-examtype" class="select">
                        <option value="ACADEMIC" selected>Academic</option>
                        <option value="GENERAL">General Training</option>
                    </select>
                </div>
            </div>

            <!-- Question prompt -->
            <div class="am-field">
                <label class="am-label" for="am-prompt">
                    Question Prompt <span class="am-req">*</span>
                </label>
                <textarea id="am-prompt" class="textarea am-textarea"
                    placeholder="Write the full question the student should respond to…"></textarea>
            </div>

            <!-- Due date -->
            <div class="am-field">
                <label class="am-label" for="am-due">Due Date <span class="am-optional">(optional)</span></label>
                <input id="am-due" class="input" type="datetime-local" />
            </div>

            <!-- Notification preview -->
            <div class="am-noti-preview" id="am-noti-preview">
                <div class="am-noti-preview__icon">🔔</div>
                <div class="am-noti-preview__body">
                    <p class="am-noti-preview__title">Notification that will be sent</p>
                    <p class="am-noti-preview__msg" id="am-noti-msg">
                        Fill in the title above to preview the notification.
                    </p>
                </div>
            </div>

        </div>

        <!-- Footer -->
        <div class="am-footer">
            <button id="am-cancel" class="btn btn--ghost">Cancel</button>
            <button id="am-submit" class="btn btn--primary">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Assign &amp; Notify Student
            </button>
        </div>
    </div>

    <style>
        /* ── Modal shell ── */
        #assign-modal{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}
        .am-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px)}
        .am-box{
            position:relative;z-index:1;
            background:var(--surface1,#fff);
            border:1px solid var(--border,#e5e7eb);
            border-radius:16px;
            width:100%;max-width:540px;
            box-shadow:0 24px 80px rgba(0,0,0,.22);
            animation:amIn .2s cubic-bezier(.16,1,.3,1);
            display:flex;flex-direction:column;
            max-height:calc(100vh - 40px);
        }
        @keyframes amIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}

        /* ── Header ── */
        .am-header{
            display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
            padding:20px 20px 16px;
            border-bottom:1px solid var(--border,#e5e7eb);
            flex-shrink:0;
        }
        .am-title{font-size:17px;font-weight:700;margin:0;color:var(--text1,#111)}
        .am-sub{font-size:13px;color:var(--text3,#9ca3af);margin:2px 0 0}
        .am-close{
            background:none;border:none;cursor:pointer;
            color:var(--text3,#9ca3af);padding:4px;border-radius:7px;
            display:flex;align-items:center;justify-content:center;
            flex-shrink:0;transition:background .12s,color .12s;
        }
        .am-close:hover{background:var(--surface2,#f3f4f6);color:var(--text1,#111)}

        /* ── Body ── */
        .am-body{padding:20px;display:flex;flex-direction:column;gap:16px;overflow-y:auto}
        .am-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .am-field{display:flex;flex-direction:column;gap:5px}
        .am-label{font-size:12px;font-weight:600;color:var(--text2,#6b7280);letter-spacing:.03em}
        .am-req{color:var(--red,#dc2626)}
        .am-optional{font-weight:400;color:var(--text3,#9ca3af)}
        .am-textarea{min-height:110px;resize:vertical}

        /* ── Notification preview pill ── */
        .am-noti-preview{
            display:flex;align-items:flex-start;gap:10px;
            padding:12px 14px;
            background:rgba(79,110,247,.06);
            border:1px solid rgba(79,110,247,.18);
            border-radius:10px;
        }
        .am-noti-preview__icon{font-size:18px;flex-shrink:0;margin-top:1px}
        .am-noti-preview__title{
            font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
            color:var(--indigo,#4f6ef7);margin:0 0 3px
        }
        .am-noti-preview__msg{font-size:12.5px;color:var(--text2,#6b7280);margin:0;line-height:1.5}

        /* ── Footer ── */
        .am-footer{
            display:flex;justify-content:flex-end;align-items:center;gap:10px;
            padding:14px 20px;
            border-top:1px solid var(--border,#e5e7eb);
            flex-shrink:0;
        }
        .am-footer .btn--primary{display:flex;align-items:center;gap:7px}

        /* ── Inputs (if base.css not already covering .input / .select / .textarea) ── */
        .input,.select,.textarea{
            width:100%;padding:9px 12px;
            border:1px solid var(--border,#d1d5db);
            border-radius:8px;
            font-size:14px;color:var(--text1,#111);
            background:var(--surface1,#fff);
            box-sizing:border-box;
            transition:border-color .15s,box-shadow .15s;
        }
        .input:focus,.select:focus,.textarea:focus{
            outline:none;
            border-color:var(--indigo,#4f6ef7);
            box-shadow:0 0 0 3px rgba(79,110,247,.12);
        }
        .select{cursor:pointer}
        .textarea{font-family:inherit;line-height:1.6}
    </style>
    `;

    document.body.appendChild(modal);

    // ── Live notification preview ─────────────────────────────────────────────
    const titleInput = document.getElementById('am-title-input');
    const dueInput   = document.getElementById('am-due');
    const notiMsg    = document.getElementById('am-noti-msg');

    const updatePreview = () => {
        const t   = titleInput.value.trim();
        const due = dueInput.value;
        if (!t) {
            notiMsg.textContent = 'Fill in the title above to preview the notification.';
            return;
        }
        const dueTxt = due
            ? ` Due: ${fmtDate(due)}.`
            : '';
        notiMsg.textContent = `Your teacher assigned you "${t}".${dueTxt}`;
    };

    titleInput.addEventListener('input', updatePreview);
    dueInput.addEventListener('change', updatePreview);

    // ── Close handlers ────────────────────────────────────────────────────────
    const close = () => {
        const box = document.getElementById('assign-modal');
        if (box) {
            box.querySelector('.am-box').style.animation = 'amOut .15s ease forwards';
            setTimeout(() => box.remove(), 140);
        }
    };

    // Add out-animation keyframes once
    if (!document.getElementById('am-out-style')) {
        const s = document.createElement('style');
        s.id = 'am-out-style';
        s.textContent = '@keyframes amOut{to{opacity:0;transform:translateY(10px) scale(.97)}}';
        document.head.appendChild(s);
    }

    document.getElementById('am-close').addEventListener('click', close);
    document.getElementById('am-cancel').addEventListener('click', close);
    document.getElementById('am-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });

    // ── Submit ────────────────────────────────────────────────────────────────
    document.getElementById('am-submit').addEventListener('click', async () => {
        const title          = titleInput.value.trim();
        const questionPrompt = document.getElementById('am-prompt').value.trim();
        const taskType       = document.getElementById('am-tasktype').value;
        const examType       = document.getElementById('am-examtype').value;
        const dueDate        = dueInput.value;

        if (!title)          { toast('Please enter a task title.',       'error'); return; }
        if (!questionPrompt) { toast('Please enter the question prompt.', 'error'); return; }

        const submitBtn = document.getElementById('am-submit');
        submitBtn.disabled    = true;
        submitBtn.innerHTML   = '<span class="spinner"></span> Assigning…';

        try {
            await apiFetch('/api/teacher/assign', {
                method: 'POST',
                body: JSON.stringify({
                    studentId:     studentId,
                    source:        'teacher_new',
                    taskType,
                    examType,
                    title,
                    questionPrompt,
                    dueDate: dueDate || undefined,
                }),
            });

            // Success feedback
            close();
            toast(`✅ Task assigned to ${studentName}. They'll receive a notification now.`, 'success');

            // Refresh all dashboard sections
            Promise.all([loadStats(), loadPendingQueue(), loadAllTasks(), loadStudents()]);

        } catch (err) {
            toast(err.message, 'error');
            submitBtn.disabled  = false;
            submitBtn.innerHTML = `
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Assign &amp; Notify Student`;
        }
    });

    // Focus the title input for immediate typing
    setTimeout(() => titleInput.focus(), 80);
};

// ═════════════════════════════════════════════════════════════════════════════
// SEARCH / FILTER LISTENERS
// ═════════════════════════════════════════════════════════════════════════════
document.getElementById('task-search')?.addEventListener('input', () => {
    clearTimeout(taskTimer);
    taskTimer = setTimeout(loadAllTasks, 400);
});
document.getElementById('task-status-filter')?.addEventListener('change', loadAllTasks);

// ═════════════════════════════════════════════════════════════════════════════
// BOOT
// ═════════════════════════════════════════════════════════════════════════════
Promise.all([loadStats(), loadPendingQueue(), loadAllTasks(), loadStudents()]);