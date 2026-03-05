/**
 * tasks/create.js — create a new writing task
 */

import { requireAuth }  from '../../core/router.js';
import { apiFetch }     from '../../core/api.js';
import { initNavbar } from '../../../components/navbar.js';
import { toast }        from '../../core/toast.js';

requireAuth();
initNavbar();

const form      = document.getElementById('create-task-form');
const typeEl    = document.getElementById('taskType');
const hintEl    = document.getElementById('wc-hint-text');
const submitBtn = document.getElementById('submit-btn');

const HINTS = {
    TASK_1: 'Task 1 requires a minimum of 150 words.',
    TASK_2: 'Task 2 requires a minimum of 250 words.',
};

typeEl.addEventListener('change', () => {
    const hint = HINTS[typeEl.value];
    if (hint) {
        hintEl.textContent = hint;
        document.getElementById('wc-hint').classList.add('show');
    } else {
        document.getElementById('wc-hint').classList.remove('show');
    }
});

// ---------------------------------------------------------------------------
// Safe helper — avoids crashing if an optional field doesn't exist in the HTML
// ---------------------------------------------------------------------------
function fieldValue(id) {
    return document.getElementById(id)?.value?.trim() ?? '';
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------
const log = {
    info:  (...a) => console.log   ('%c[create.js]', 'color:#6366f1;font-weight:700', ...a),
    ok:    (...a) => console.log   ('%c[create.js]', 'color:#22c55e;font-weight:700', ...a),
    warn:  (...a) => console.warn  ('%c[create.js]', 'color:#f59e0b;font-weight:700', ...a),
    error: (...a) => console.error ('%c[create.js]', 'color:#ef4444;font-weight:700', ...a),
};

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    log.info('── form submitted ──────────────────────────');

    const titleVal    = fieldValue('title');
    const taskTypeVal = fieldValue('taskType');
    log.info('field values', { title: titleVal, taskType: taskTypeVal });

    if (!titleVal) {
        log.warn('STOP — title is empty');
        toast('Title is required.', 'error');
        document.getElementById('title')?.focus();
        return;
    }
    if (!taskTypeVal) {
        log.warn('STOP — taskType is empty');
        toast('Task type is required.', 'error');
        document.getElementById('taskType')?.focus();
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating…';

    const body = {
        title:          titleVal,
        description:    fieldValue('description'),
        taskType:       taskTypeVal,
        examType:       fieldValue('examType'),
        questionPrompt: fieldValue('questionPrompt'),
        personalNotes:  fieldValue('personalNotes'),
    };
    log.info('POST /api/writing-tasks payload', body);

    try {
        const res = await apiFetch('/api/writing-tasks', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        log.ok('POST response raw', res);

        const createdTask = res?.data || res;
        const id = createdTask?._id;
        log.info('parsed createdTask', createdTask);
        log.info('extracted id', id);

        if (!id || String(id).toLowerCase() === 'undefined') {
            log.error('STOP — server returned invalid id', { id, res });
            toast('Task created but server returned invalid id — check console.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create & Start Writing';
            return;
        }

        // ── Call /start to transition ASSIGNED → WRITING before opening editor ──
        log.info('PATCH /start for id', id);
        try {
            const startRes = await apiFetch(`/api/writing-tasks/${encodeURIComponent(id)}/start`, {
                method: 'PATCH',
            });
            log.ok('PATCH /start response', startRes);
        } catch (startErr) {
            log.warn('PATCH /start failed (non-fatal, write.js will retry)', startErr.message);
        }

        log.ok('redirecting → write.html', id);
        toast('Task created!');
        window.location.href = `/pages/tasks/write.html?id=${encodeURIComponent(id)}`;
    } catch (err) {
        log.error('POST /api/writing-tasks failed', err);
        toast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create & Start Writing';
    }
});