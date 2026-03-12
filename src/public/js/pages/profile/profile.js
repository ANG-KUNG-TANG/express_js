/**
 * profile.js  — ESM module loaded by profile.html
 *
 * Responsibilities:
 *  1. On load  → GET /api/users/me  → populate fields + images + files
 *  2. Save info → PATCH /api/users/me
 *  3. Avatar   → POST /api/users/me/avatar
 *  4. Cover    → POST /api/users/me/cover
 *  5. Files    → POST /api/users/me/files  /  DELETE /api/users/me/files/:fileId
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const token = () => localStorage.getItem('token') ?? '';

const authHeaders = () => ({
    Authorization: `Bearer ${token()}`,
});

const BASE = '/api/users/me';

async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: { ...authHeaders(), ...options.headers },
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        const msg = json?.error?.message ?? `Request failed (${res.status})`;
        throw new Error(msg);
    }
    return json.data;
}

// ---------------------------------------------------------------------------
// Load profile from API on page load
// ---------------------------------------------------------------------------

async function loadProfile() {
    try {
        const user = await apiFetch(BASE);

        // Update localStorage so the inline script in profile.html also sees fresh data
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, ...user }));

        // Avatar
        if (user.avatarUrl) {
            const avatar = document.getElementById('profile-avatar');
            if (avatar) avatar.innerHTML = `<img src="${user.avatarUrl}" alt="Avatar"/>`;
        }

        // Cover
        if (user.coverUrl) {
            const coverArea = document.getElementById('cover-area');
            if (coverArea) {
                let img = coverArea.querySelector('img.cover-img');
                if (!img) {
                    img = document.createElement('img');
                    img.className = 'cover-img';
                    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
                    coverArea.insertBefore(img, coverArea.querySelector('.profile-cover__hint'));
                }
                img.src = user.coverUrl;
                const canvas = document.getElementById('cover-canvas');
                if (canvas) canvas.style.display = 'none';
            }
        }

        // Extra fields the inline script doesn't fill
        if (user.bio)        setVal('field-bio',       user.bio);
        if (user.targetBand) setVal('field-target',    user.targetBand);
        if (user.examDate)   setVal('field-exam-date', user.examDate?.slice(0, 10));

        // Stats if present
        if (user.stats) {
            const map = { 'ps-assigned':'assigned', 'ps-submitted':'submitted',
                          'ps-scored':'scored', 'ps-avg':'avgBand' };
            Object.entries(map).forEach(([elId, key]) => {
                const v = user.stats[key];
                if (v != null) setText(elId, elId === 'ps-avg' ? Number(v).toFixed(1) : v);
            });
        }

        // Attachments
        if (Array.isArray(user.attachments)) {
            renderServerFiles(user.attachments);
        }

    } catch (err) {
        console.error('profile.loadProfile:', err.message);
    }
}

// ---------------------------------------------------------------------------
// Save personal info  (PATCH /api/users/me)
// ---------------------------------------------------------------------------

export async function saveProfileInfo({ name, email, bio, targetBand, examDate }) {
    return await apiFetch(BASE, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, bio, targetBand, examDate }),
    });
}

// ---------------------------------------------------------------------------
// Avatar upload  (POST /api/users/me/avatar)
// ---------------------------------------------------------------------------

export async function uploadAvatar(file) {
    const fd = new FormData();
    fd.append('file', file);
    return await apiFetch(`${BASE}/avatar`, { method: 'POST', body: fd });
}

// ---------------------------------------------------------------------------
// Cover upload  (POST /api/users/me/cover)
// ---------------------------------------------------------------------------

export async function uploadCover(file) {
    const fd = new FormData();
    fd.append('file', file);
    return await apiFetch(`${BASE}/cover`, { method: 'POST', body: fd });
}

// ---------------------------------------------------------------------------
// File attachments
// ---------------------------------------------------------------------------

export async function uploadFiles(files) {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    return await apiFetch(`${BASE}/files`, { method: 'POST', body: fd });
}

export async function deleteFile(fileId) {
    return await apiFetch(`${BASE}/files/${fileId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Render server-persisted attachments into the file list
// ---------------------------------------------------------------------------

function renderServerFiles(attachments) {
    const list = document.getElementById('file-list');
    const label = document.getElementById('file-count-label');
    if (!list) return;

    list.innerHTML = '';

    attachments.forEach(a => {
        const ext = (a.originalName.split('.').pop() || '?').toUpperCase();
        const cat = fileCategory(a.originalName);
        const el  = document.createElement('div');
        el.className = 'file-item';
        el.dataset.fileId = a._id;
        el.innerHTML = `
            <div class="file-type ${cat}">${ext}</div>
            <div class="file-meta">
                <div class="file-meta__name">${a.originalName}</div>
                <div class="file-meta__size">${fmtSize(a.size)}</div>
            </div>
            <a href="${a.url}" target="_blank" class="file-remove" title="Download" style="color:var(--accent)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
            </a>
            <button class="file-remove js-delete-file" data-id="${a._id}" title="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>`;
        list.appendChild(el);
    });

    if (label) label.textContent = `${attachments.length} file${attachments.length !== 1 ? 's' : ''}`;

    // Wire delete buttons
    list.querySelectorAll('.js-delete-file').forEach(btn => {
        btn.addEventListener('click', async () => {
            const fileId = btn.dataset.id;
            try {
                await deleteFile(fileId);
                btn.closest('.file-item').remove();
                showToast('File removed');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    });
}

// ---------------------------------------------------------------------------
// Hook into profile.html's existing save button
// ---------------------------------------------------------------------------

function hookSaveButton() {
    const btn = document.getElementById('save-info-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const name      = getVal('field-first').trim() + ' ' + getVal('field-last').trim();
        const email     = getVal('field-email').trim();
        const bio       = getVal('field-bio');
        const targetBand = getVal('field-target');
        const examDate  = getVal('field-exam-date');

        try {
            const user = await saveProfileInfo({ name: name.trim(), email, bio, targetBand, examDate });
            // Sync localStorage
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...stored, ...user }));
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// ---------------------------------------------------------------------------
// Hook into avatar / cover file inputs
// ---------------------------------------------------------------------------

function hookImageUploads() {
    // Avatar
    document.getElementById('avatar-file-input')?.addEventListener('change', async function () {
        const file = this.files[0]; if (!file) return;
        try {
            await uploadAvatar(file);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Cover
    document.getElementById('cover-file-input')?.addEventListener('change', async function () {
        const file = this.files[0]; if (!file) return;
        try {
            await uploadCover(file);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// ---------------------------------------------------------------------------
// Hook into file dropzone — upload to server instead of just local array
// ---------------------------------------------------------------------------

function hookFileUpload() {
    const fileInput = document.getElementById('file-input');
    if (!fileInput) return;

    fileInput.addEventListener('change', async function () {
        const files = [...(this.files || [])];
        this.value = '';
        if (!files.length) return;
        try {
            const data = await uploadFiles(files);
            renderServerFiles(data.attachments);
            showToast(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// ---------------------------------------------------------------------------
// Tiny DOM helpers (mirrors profile.html's $ helper)
// ---------------------------------------------------------------------------

const getVal = (id) => document.getElementById(id)?.value ?? '';
const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

function fileCategory(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['doc','docx','txt'].includes(ext)) return 'doc';
    if (['png','jpg','jpeg','gif','webp'].includes(ext)) return 'img';
    if (['xls','xlsx','csv'].includes(ext)) return 'xls';
    if (['ppt','pptx'].includes(ext)) return 'ppt';
    return 'misc';
}

function fmtSize(b) {
    return b < 1024 ? b+'B' : b < 1048576 ? (b/1024).toFixed(1)+'KB' : (b/1048576).toFixed(1)+'MB';
}

function showToast(msg, type = 'success') {
    // Calls the showToast already defined in profile.html's inline script
    if (typeof window.__showToast === 'function') { window.__showToast(msg, type); return; }
    const t = document.getElementById('toast');
    const m = document.getElementById('toast-msg');
    if (!t || !m) return;
    m.textContent = msg;
    t.className = `toast toast--${type} show`;
    setTimeout(() => t.classList.remove('show'), 3200);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

window.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    hookSaveButton();
    hookImageUploads();
    hookFileUpload();
});