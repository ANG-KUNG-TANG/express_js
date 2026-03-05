

import { requireAuth, getParam } from '../../core/router.js';
import { apiFetch }              from '../../core/api.js';
import { initNavbar }            from '../../../components/navbar.js';
import { toast }                 from '../../core/toast.js';
import { vocabCard }             from '../../../components/vocabCard.js';

requireAuth();
initNavbar();

const id = getParam('id');
if (!id) window.location.href = '/pages/tasks/list.html';

// ── DOM elements ─────────────────────────────────────────────────────────
const textareaEl     = document.getElementById('submission-textarea');
const wordCountEl    = document.getElementById('word-counter-display');
const targetEl       = document.getElementById('target-display');
const progressFill   = document.getElementById('progress-bar-fill');
const progressPct    = document.getElementById('progress-pct');
const timerEl        = document.getElementById('timer-display');
const submitBtn      = document.getElementById('submit-btn');
const promptEl       = document.getElementById('question-prompt');
const taskInfoEl     = document.getElementById('task-info');
const taskTitleEl    = document.getElementById('task-title-display');
const paperTitleEl   = document.getElementById('paper-title');
const autosaveDot    = document.getElementById('autosave-dot');
const autosaveLabel  = document.getElementById('autosave-label');
const targetDisplay2 = document.getElementById('target-display2');

// Vocabulary panel elements
const searchInput   = document.getElementById('vocab-search');
const searchBtn     = document.getElementById('vocab-search-btn');
const searchResults = document.getElementById('search-results');
const topicSelect   = document.getElementById('topic-select');
const browseResults = document.getElementById('browse-results');

// FIX #8: vocab panel elements added to the guard so missing IDs fail loudly
const REQUIRED_ELS = {
    'submission-textarea':  textareaEl,
    'word-counter-display': wordCountEl,
    'target-display':       targetEl,
    'target-display2':      targetDisplay2,
    'progress-bar-fill':    progressFill,
    'progress-pct':         progressPct,
    'timer-display':        timerEl,
    'submit-btn':           submitBtn,
    'question-prompt':      promptEl,
    'task-info':            taskInfoEl,
    'task-title-display':   taskTitleEl,
    'paper-title':          paperTitleEl,
    'autosave-dot':         autosaveDot,
    'autosave-label':       autosaveLabel,
    'vocab-search':         searchInput,
    'vocab-search-btn':     searchBtn,
    'search-results':       searchResults,
    'topic-select':         topicSelect,
    'browse-results':       browseResults,
};
const missingEls = Object.entries(REQUIRED_ELS)
    .filter(([, el]) => !el)
    .map(([elId]) => `#${elId}`);
if (missingEls.length) {
    throw new Error(`write.js: missing DOM element(s): ${missingEls.join(', ')} — check write.html`);
}

const DRAFT_KEY = `draft_${id}`;
let TARGET      = 250;
let lastSavedText = '';
let autoSaveTimer = null;

// ── Panel collapse toggles ────────────────────────────────────────────────
document.getElementById('toggle-left')?.addEventListener('click', () => {
    document.getElementById('left-panel').classList.toggle('collapsed');
});
document.getElementById('toggle-right')?.addEventListener('click', () => {
    document.getElementById('right-panel').classList.toggle('collapsed');
});

// ── Load task ─────────────────────────────────────────────────────────────
// Statuses that need a /start call before the editor opens
const PRE_WRITING_STATUSES = new Set(['ASSIGNED', 'DRAFT', 'PENDING', 'CREATED', 'NEW']);

const loadTask = async () => {
    try {
        const rawTask = await apiFetch(`/api/writing-tasks/${id}`);
        const task    = rawTask?.data || rawTask;
        if (!task || typeof task !== 'object') throw new Error('Task not found');

        console.debug('[write.js] task loaded, status =', task.status);

        // Fallback /start — only fires if create.js didn't already transition to WRITING
        if (PRE_WRITING_STATUSES.has(task.status)) {
            console.warn('[write.js] status is', task.status, '— calling /start');
            try {
                await apiFetch(`/api/writing-tasks/${id}/start`, { method: 'PATCH' });
                task.status = 'WRITING';
            } catch (startErr) {
                console.error('[write.js] /start failed:', startErr);
                toast(`Could not start task: ${startErr.message}`, 'error');
                // FIX #6: encode id in redirect URL
                window.location.href = `/pages/tasks/detail.html?id=${encodeURIComponent(id)}`;
                return;
            }
        }

        // Terminal statuses — editor is locked, redirect to detail
        if (task.status !== 'WRITING') {
            toast(`This task is ${task.status} and cannot be edited.`, 'error');
            // FIX #6: encode id in redirect URL
            window.location.href = `/pages/tasks/detail.html?id=${encodeURIComponent(id)}`;
            return;
        }

        // Populate UI
        promptEl.textContent     = task.questionPrompt || 'No prompt provided.';
        taskInfoEl.textContent   = `${task.taskType ?? ''} · ${task.examType ?? ''}`.replace(/^ · | · $/, '');
        taskTitleEl.textContent  = task.title || 'Untitled';
        paperTitleEl.textContent = task.title || 'Untitled Essay';
        document.title           = `Writing: ${task.title ?? 'Task'}`;

        TARGET = task.taskType === 'TASK_1' ? 150 : 250;
        targetEl.textContent       = TARGET;
        targetDisplay2.textContent = TARGET;

        // Draft restoration — prefer whichever source has more content (more recent)
        const serverText = task.submissionText?.trim() ?? '';
        const localText  = localStorage.getItem(DRAFT_KEY)?.trim() ?? '';

        if (serverText && serverText.length >= localText.length) {
            // FIX #7: use the same value for both textarea and lastSavedText
            // so auto-save doesn't see a false "changed" diff on first tick
            textareaEl.value = task.submissionText;
            lastSavedText    = task.submissionText;
            if (localText) localStorage.removeItem(DRAFT_KEY); // clean up stale local draft
        } else if (localText) {
            // Local draft is newer/longer (server save may have failed last session)
            textareaEl.value = localText;
            lastSavedText    = localText;
            toast('Draft restored from local backup', 'info');
        }

        updateWordCount();
        startTimer();
        startAutoSave();

    } catch (err) {
        console.error('[write.js] loadTask error:', err);
        toast(err.message, 'error');
        setTimeout(() => {
            // FIX #6: encode id in redirect URL
            window.location.href = `/pages/tasks/detail.html?id=${encodeURIComponent(id)}`;
        }, 1500);
    }
};

// ── Word count & progress ──────────────────────────────────────────────────
function countWords(text) {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function updateWordCount() {
    const count = countWords(textareaEl.value);
    const pct   = Math.min(100, Math.round((count / TARGET) * 100));

    wordCountEl.textContent = count;
    wordCountEl.className = 'stat-value' +
        (count >= TARGET ? ' good' : count >= TARGET * 0.7 ? '' : ' warn');

    progressFill.style.width = pct + '%';
    progressFill.classList.toggle('complete', count >= TARGET);
    progressPct.textContent = pct + '%';

    submitBtn.disabled = count < TARGET;
}

textareaEl.addEventListener('input', updateWordCount);

// ── Timer ──────────────────────────────────────────────────────────────────
let seconds       = 0;
let timerInterval = null;

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    seconds = 0;
    timerInterval = setInterval(() => {
        seconds++;
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
    }, 1000);
}

// ── Auto-save ──────────────────────────────────────────────────────────────
function setSaving(saving) {
    autosaveDot.className     = saving ? 'dot saving' : 'dot';
    autosaveLabel.textContent = saving ? 'Saving…' : 'Saved';
}

/**
 * Auto-save strategy:
 *  - Always write to localStorage immediately (survives browser crash)
 *  - Every 30s, also PATCH to server if text has changed
 *  - Server save failure is non-fatal; localStorage is the fallback
 */
function startAutoSave() {
    if (autoSaveTimer) clearInterval(autoSaveTimer);

    autoSaveTimer = setInterval(async () => {
        const text = textareaEl.value.trim();
        if (!text || text === lastSavedText) return;

        // Step 1: local backup immediately
        localStorage.setItem(DRAFT_KEY, textareaEl.value);

        // Step 2: server save
        setSaving(true);
        try {
            await apiFetch(`/api/writing-tasks/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ submissionText: text }),
            });
            lastSavedText = text;
        } catch (err) {
            // Server save failed — data is still safe in localStorage
            console.warn('[write.js] Server auto-save failed (local draft preserved):', err.message);
        } finally {
            setTimeout(() => setSaving(false), 600);
        }
    }, 30_000); // every 30 seconds
}

// ── Submit ─────────────────────────────────────────────────────────────────
submitBtn.addEventListener('click', async () => {
    const submissionText = textareaEl.value.trim();
    if (!submissionText) return;

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Submitting…';

    try {
        await apiFetch(`/api/writing-tasks/${id}/submit`, {
            method: 'PATCH',
            body: JSON.stringify({ submissionText }),
        });
        // Clean up draft data
        localStorage.removeItem(DRAFT_KEY);
        clearInterval(timerInterval);
        clearInterval(autoSaveTimer);
        toast('Submitted successfully! Redirecting…', 'success');
        // FIX #6: encode id in redirect URL
        window.location.href = `/pages/tasks/detail.html?id=${encodeURIComponent(id)}`;
    } catch (err) {
        toast(err.message, 'error');
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Submit Writing';
    }
});

// Clean up intervals on page unload
window.addEventListener('beforeunload', () => {
    clearInterval(timerInterval);
    clearInterval(autoSaveTimer);
    // Ensure last text is in localStorage before page closes
    const text = textareaEl.value;
    if (text.trim()) localStorage.setItem(DRAFT_KEY, text);
});

// ═══════════════════════════════════════════════════════════════════════════
// VOCABULARY (dictionary search + static browse)
// ═══════════════════════════════════════════════════════════════════════════

function esc(s) {
    return String(s || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function insertWord(word, cardEl) {
    textareaEl.focus();
    const start  = textareaEl.selectionStart;
    const end    = textareaEl.selectionEnd;
    const text   = textareaEl.value;
    const before = (start > 0 && text[start - 1] !== ' ') ? ' ' : '';
    const after  = (end < text.length && text[end] !== ' ') ? ' ' : '';
    textareaEl.value = text.slice(0, start) + before + word + after + text.slice(end);
    const newPos = start + before.length + word.length + after.length;
    textareaEl.setSelectionRange(newPos, newPos);
    updateWordCount();
    cardEl.classList.add('inserted');
    setTimeout(() => cardEl.classList.remove('inserted'), 600);
    toast(`"${word}" inserted`, 'success');
}

function skeletonHTML() {
    return `<div style="display:flex;flex-direction:column;gap:7px;">
        ${Array.from({ length: 4 }, () => '<div class="vocab-skeleton"></div>').join('')}
    </div>`;
}

function stateBox(icon, title, body) {
    return `<div class="vocab-empty">
        <div style="font-size:2rem;">${icon}</div>
        <h4 style="margin:0;">${esc(title)}</h4>
        <p>${esc(body)}</p>
    </div>`;
}

function renderVocabEntries(entries, container, isApiFormat = true) {
    if (!entries || entries.length === 0) {
        container.innerHTML = stateBox('📭', 'No results', 'Try a different word or topic.');
        return;
    }

    const fragment = document.createDocumentFragment();
    entries.forEach(entry => {
        let apiEntry;
        if (!isApiFormat) {
            // FIX #9: apply esc() to static browse data fields to be XSS-safe
            // if this data ever becomes dynamic
            apiEntry = {
                word: esc(entry.word),
                meanings: [{
                    partOfSpeech: esc(entry.pos),
                    definitions: [{
                        definition: esc(entry.definition),
                        example:    esc(entry.example || ''),
                    }],
                }],
            };
        } else {
            apiEntry = entry;
        }

        const cardHtml = vocabCard(apiEntry);
        const wrapper  = document.createElement('div');
        wrapper.innerHTML = cardHtml;
        const card = wrapper.firstElementChild;

        const insertBtn = document.createElement('button');
        insertBtn.className = 'vocab-insert';
        insertBtn.title = 'Insert into essay';
        insertBtn.innerHTML = '+';
        insertBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const wordEl = card.querySelector('.vocab-word');
            if (wordEl) insertWord(wordEl.innerText.trim(), card);
        });
        card.appendChild(insertBtn);
        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

// ── Search tab ─────────────────────────────────────────────────────────────
searchBtn.addEventListener('click', () => performSearch(searchInput.value.trim()));
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch(searchInput.value.trim());
});

async function performSearch(word) {
    if (!word) return;
    searchResults.innerHTML = skeletonHTML();
    try {
        const res   = await apiFetch(`/api/vocab/${encodeURIComponent(word)}`);
        const entry = res?.data || res;
        if (!entry) {
            searchResults.innerHTML = stateBox('📭', 'No results', `We couldn't find "${esc(word)}".`);
            return;
        }
        renderVocabEntries([entry], searchResults, true);
    } catch (err) {
        const isNotFound = err.status === 404 || err.message?.toLowerCase().includes('not found');
        searchResults.innerHTML = isNotFound
            ? stateBox('📭', 'No results', `We couldn't find "${esc(word)}".`)
            : stateBox('⚠️', 'Error', 'Failed to fetch definition.');
        if (!isNotFound) toast(err.message, 'error');
    }
}

// ── Browse tab (static topic data) ────────────────────────────────────────
const vocabByTopic = {
    environment: [
        { word: 'sustainable',    pos: 'adj',  definition: 'able to be maintained',          example: 'We need sustainable energy.' },
        { word: 'ecosystem',      pos: 'noun', definition: 'a biological community',          example: 'The forest ecosystem is delicate.' },
        { word: 'carbon footprint', pos: 'noun', definition: 'CO2 released by an activity',  example: 'Reduce your carbon footprint.' },
        { word: 'biodiversity',   pos: 'noun', definition: 'variety of life in an area',      example: 'Biodiversity is vital to ecosystems.' },
        { word: 'renewable',      pos: 'adj',  definition: 'naturally replenished',           example: 'Solar is a renewable resource.' },
    ],
    education: [
        { word: 'pedagogy',       pos: 'noun', definition: 'method and practice of teaching', example: 'Modern pedagogy emphasizes engagement.' },
        { word: 'curriculum',     pos: 'noun', definition: 'subjects comprising a course',    example: 'The curriculum is broad and rigorous.' },
        { word: 'literacy',       pos: 'noun', definition: 'ability to read and write',       example: 'Literacy rates are rising globally.' },
        { word: 'critical thinking', pos: 'noun', definition: 'objective analysis of facts', example: 'Critical thinking is a key skill.' },
        { word: 'vocational',     pos: 'adj',  definition: 'relating to an occupation',       example: 'Vocational training prepares students for work.' },
    ],
    technology: [
        { word: 'innovation',     pos: 'noun', definition: 'a new idea or product',           example: 'Innovation drives economic progress.' },
        { word: 'automation',     pos: 'noun', definition: 'use of automatic equipment',      example: 'Automation may replace many jobs.' },
        { word: 'disruptive',     pos: 'adj',  definition: 'causing radical change',          example: 'Disruptive technologies reshape markets.' },
        { word: 'algorithm',      pos: 'noun', definition: 'a step-by-step procedure',        example: 'Algorithms power search engines.' },
        { word: 'connectivity',   pos: 'noun', definition: 'state of being connected',        example: 'Internet connectivity is now essential.' },
    ],
    health: [
        { word: 'wellness',       pos: 'noun', definition: 'state of being in good health',   example: 'Wellness programs boost productivity.' },
        { word: 'preventive',     pos: 'adj',  definition: 'designed to prevent disease',     example: 'Preventive care reduces long-term costs.' },
        { word: 'holistic',       pos: 'adj',  definition: 'treating the whole person',       example: 'Holistic medicine considers mind and body.' },
        { word: 'sedentary',      pos: 'adj',  definition: 'involving little physical activity', example: 'A sedentary lifestyle causes health problems.' },
        { word: 'malnutrition',   pos: 'noun', definition: 'lack of proper nutrition',         example: 'Malnutrition affects millions worldwide.' },
    ],
};
vocabByTopic.all = [
    ...vocabByTopic.environment,
    ...vocabByTopic.education,
    ...vocabByTopic.technology,
    ...vocabByTopic.health,
];

function renderBrowse(topic) {
    const words = vocabByTopic[topic] || [];
    if (!words.length) {
        browseResults.innerHTML = stateBox('📚', 'No words', 'No vocabulary for this topic.');
        return;
    }
    renderVocabEntries(words, browseResults, false);
}

topicSelect.addEventListener('change', () => renderBrowse(topicSelect.value));
renderBrowse('all');

// ── Tab switching ──────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.getElementById('tab-search').style.display = target === 'search' ? 'flex' : 'none';
        document.getElementById('tab-browse').style.display = target === 'browse' ? 'flex' : 'none';
    });
});

// ── Start ──────────────────────────────────────────────────────────────────
loadTask();