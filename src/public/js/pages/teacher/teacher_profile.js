// js/teacher/teacher_profile.js
// Handles GET /api/teacher/profile (display) and
//         PATCH /api/teacher/profile (inline edit form).

import { teacherAPI }     from '../../core/api.js';
import { initNavbar }     from '../../components/navbar.js';
import { initTeacherNav } from '../../components/teacher_nav.js';
import { toast }          from '../../components/toast.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
initNavbar();
initTeacherNav();
loadProfile();

// ── State ─────────────────────────────────────────────────────────────────────
let _original = {};   // snapshot at load time — used for reset

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function loadProfile() {
    try {
        const res     = await teacherAPI.getProfile();
        const profile = res?.data ?? res;
        _original = { ...profile };
        renderProfile(profile);
    } catch (err) {
        toast(err.message || 'Could not load your profile.', 'error');
        document.getElementById('tp-root').innerHTML = `
            <p style="color:var(--adm-text-muted);padding:2rem;">
                Failed to load profile: ${err.message}
            </p>
        `;
    }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderProfile(p) {
    const name   = p.name  ?? p._name  ?? '';
    const email  = p.email ?? p._email ?? '';
    const bio    = p.bio   ?? p._bio   ?? '';
    const role   = p.role  ?? 'teacher';
    const avatar = p.avatarUrl ?? p._avatarUrl;

    const initials   = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
    const avatarHtml = avatar
        ? `<img src="${avatar}" alt="${name}" />`
        : initials;

    document.getElementById('tp-root').innerHTML = `
        <div class="tp-grid">

            <!-- ── Left: profile card ── -->
            <div class="tp-profile-card">
                <div class="tp-cover"></div>
                <div class="tp-avatar-wrap">
                    <div class="tp-avatar" id="tp-avatar-display">${avatarHtml}</div>
                </div>
                <div class="tp-profile-info">
                    <h2 class="tp-profile-name" id="tp-display-name">${name || '—'}</h2>
                    <p class="tp-profile-email" id="tp-display-email">${email}</p>
                    <span class="tp-role-badge">${role}</span>
                    <p class="tp-bio-preview" id="tp-display-bio">${bio || '<em style="opacity:0.4;">No bio yet.</em>'}</p>
                </div>
            </div>

            <!-- ── Right: edit form ── -->
            <div class="tp-form-card">
                <h3 class="tp-form-title">Edit Profile</h3>

                <form id="tp-form" novalidate>

                    <div class="tp-field" id="field-name">
                        <label class="tp-label" for="tp-name">Display Name</label>
                        <input
                            id="tp-name"
                            class="tp-input"
                            type="text"
                            value="${escHtml(name)}"
                            placeholder="Your full name"
                            autocomplete="name"
                        />
                        <span class="tp-field-error" id="err-name"></span>
                    </div>

                    <div class="tp-field" id="field-email">
                        <label class="tp-label" for="tp-email">Email Address</label>
                        <input
                            id="tp-email"
                            class="tp-input"
                            type="email"
                            value="${escHtml(email)}"
                            placeholder="you@example.com"
                            autocomplete="email"
                        />
                        <span class="tp-field-hint">Changing email affects your login credentials.</span>
                        <span class="tp-field-error" id="err-email"></span>
                    </div>

                    <div class="tp-field" id="field-bio">
                        <label class="tp-label" for="tp-bio">Bio</label>
                        <textarea
                            id="tp-bio"
                            class="tp-textarea"
                            placeholder="Tell students a little about yourself…"
                        >${escHtml(bio)}</textarea>
                        <span class="tp-field-error" id="err-bio"></span>
                    </div>

                    <div class="tp-actions">
                        <button type="submit" class="tp-btn-save" id="tp-save-btn">Save Changes</button>
                        <button type="button" class="tp-btn-reset" id="tp-reset-btn">Reset</button>
                        <span class="tp-save-status" id="tp-save-status">✓ Saved</span>
                    </div>

                </form>
            </div>
        </div>
    `;

    attachFormHandlers();
}

// ── Form logic ────────────────────────────────────────────────────────────────
function attachFormHandlers() {
    const form     = document.getElementById('tp-form');
    const saveBtn  = document.getElementById('tp-save-btn');
    const resetBtn = document.getElementById('tp-reset-btn');

    // Live-update the left card preview as the user types
    document.getElementById('tp-name').addEventListener('input', (e) => {
        document.getElementById('tp-display-name').textContent = e.target.value || '—';
        updateAvatarInitials(e.target.value);
    });
    document.getElementById('tp-bio').addEventListener('input', (e) => {
        const el = document.getElementById('tp-display-bio');
        el.innerHTML = e.target.value || '<em style="opacity:0.4;">No bio yet.</em>';
    });

    // Reset to server values
    resetBtn.addEventListener('click', () => {
        document.getElementById('tp-name').value  = _original.name  ?? _original._name  ?? '';
        document.getElementById('tp-email').value = _original.email ?? _original._email ?? '';
        document.getElementById('tp-bio').value   = _original.bio   ?? _original._bio   ?? '';
        clearErrors();
        refreshPreview();
    });

    // Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const payload = buildPayload();
        if (!payload) {
            toast('Nothing has changed.', 'info');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';

        try {
            const res     = await teacherAPI.updateProfile(payload);
            const updated = res?.data ?? res;

            // Persist new snapshot
            _original = { ..._original, ...updated };

            showSavedStatus();
            toast('Profile updated.', 'success');
        } catch (err) {
            toast(err.message || 'Update failed.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    });
}

// ── Validation ────────────────────────────────────────────────────────────────
function validate() {
    clearErrors();
    let valid = true;

    const name  = document.getElementById('tp-name').value.trim();
    const email = document.getElementById('tp-email').value.trim();

    if (name && name.length < 2) {
        setError('name', 'Name must be at least 2 characters.');
        valid = false;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('email', 'Please enter a valid email address.');
        valid = false;
    }

    return valid;
}

function setError(field, msg) {
    document.getElementById(`field-${field}`).classList.add('tp-field--error');
    document.getElementById(`err-${field}`).textContent = msg;
}

function clearErrors() {
    ['name', 'email', 'bio'].forEach(f => {
        document.getElementById(`field-${f}`)?.classList.remove('tp-field--error');
        const errEl = document.getElementById(`err-${f}`);
        if (errEl) errEl.textContent = '';
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Only send fields that actually changed
function buildPayload() {
    const payload = {};
    const name  = document.getElementById('tp-name').value.trim();
    const email = document.getElementById('tp-email').value.trim().toLowerCase();
    const bio   = document.getElementById('tp-bio').value.trim();

    const origName  = (_original.name  ?? _original._name  ?? '').trim();
    const origEmail = (_original.email ?? _original._email ?? '').trim().toLowerCase();
    const origBio   = (_original.bio   ?? _original._bio   ?? '').trim();

    if (name  !== origName)  payload.name  = name;
    if (email !== origEmail) payload.email = email;
    if (bio   !== origBio)   payload.bio   = bio;

    return Object.keys(payload).length ? payload : null;
}

function refreshPreview() {
    document.getElementById('tp-display-name').textContent =
        document.getElementById('tp-name').value || '—';
    document.getElementById('tp-display-bio').innerHTML =
        document.getElementById('tp-bio').value
            ? document.getElementById('tp-bio').value
            : '<em style="opacity:0.4;">No bio yet.</em>';
    updateAvatarInitials(document.getElementById('tp-name').value);
}

function updateAvatarInitials(name) {
    const avatar = document.getElementById('tp-avatar-display');
    if (!avatar || avatar.querySelector('img')) return;     // has a real photo
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
    avatar.textContent = initials;
}

function showSavedStatus() {
    const el = document.getElementById('tp-save-status');
    el.classList.add('tp-save-status--visible');
    setTimeout(() => el.classList.remove('tp-save-status--visible'), 2500);
}

function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}