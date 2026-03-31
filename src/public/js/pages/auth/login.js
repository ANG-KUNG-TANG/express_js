// public/js/pages/auth/login.js
// Single, authoritative login handler.
// Handles: already-logged-in redirect, form submit, OAuth buttons.

import { saveSession } from '../../core/auth.js';
import { apiFetch }    from '../../core/api.js';

/* ── All roles land on the single main dashboard ────────────────────────── */
// dashboard.js reads the role and shows the correct panel automatically.
function destForRole(role) {
    switch (role) {
        case 'admin':   return '/pages/admin/dashboard.html';
        case 'teacher': return '/pages/teacher/dashboard.html';
        default:        return '/pages/dashboard.html';   
    }
}

/* ── Already logged in? Skip straight to the right dashboard ────────────── */
const existingToken = localStorage.getItem('token');
if (existingToken) {
    try {
        const stored = localStorage.getItem('user');
        const user   = stored ? JSON.parse(stored) : null;
        window.location.replace(destForRole(user?.role));
    } catch {
        window.location.replace('/pages/dashboard.html');
    }
}

/* ── DOM refs ────────────────────────────────────────────────────────────── */
const form     = document.getElementById('login-form');
const emailEl  = document.getElementById('email');
const passEl   = document.getElementById('password');
const alertEl  = document.getElementById('login-alert');
const subBtn   = document.getElementById('subbtn');

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function showAlert(msg) {
    if (!alertEl) return;
    alertEl.textContent    = msg;
    alertEl.style.display  = 'flex';
}

function clearAlert() {
    if (!alertEl) return;
    alertEl.textContent   = '';
    alertEl.style.display = 'none';
}

function setLoading(on) {
    if (!subBtn) return;
    subBtn.disabled = on;
    subBtn.classList.toggle('loading', on);
    if (!on) {
        const lbl = subBtn.querySelector('.blbl');
        if (lbl) lbl.textContent = 'Sign In';
    }
}

function setFieldError(fgId, errId, msg) {
    document.getElementById(fgId)?.classList.add('has-err');
    const errEl = document.getElementById(errId);
    if (errEl) errEl.textContent = msg;
    document.querySelector(`#${fgId} input`)?.classList.add('err');
}

function clearFieldErrors() {
    document.querySelectorAll('.fg').forEach(f => f.classList.remove('has-err'));
    document.querySelectorAll('.fg input').forEach(i => i.classList.remove('err'));
}

/* ── Inline validation on change ─────────────────────────────────────────── */
emailEl?.addEventListener('input', function () {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value)) {
        document.getElementById('fg-email')?.classList.remove('has-err');
        this.classList.remove('err');
    }
});

passEl?.addEventListener('input', function () {
    if (this.value) {
        document.getElementById('fg-password')?.classList.remove('has-err');
        this.classList.remove('err');
    }
});

/* ── Form submit ─────────────────────────────────────────────────────────── */
form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    clearFieldErrors();

    const email    = emailEl.value.trim();
    const password = passEl.value;

    // Client-side validation
    let valid = true;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError('fg-email', 'err-email', 'Please enter a valid email address.');
        valid = false;
    }
    if (!password) {
        setFieldError('fg-password', 'err-password', 'Password is required.');
        valid = false;
    }
    if (!valid) return;

    setLoading(true);

    try {
        const res = await apiFetch('/api/auth/login', {
            method: 'POST',
            body:   JSON.stringify({ email, password }),
        });

        const token = res?.token ?? res?.data?.token;
        const user  = res?.user  ?? res?.data?.user;

        if (!token || !user) {
            throw new Error('Invalid response from server. Please try again.');
        }

        // Persist session
        saveSession(token, user);

        // Show success tick briefly, then redirect to role-appropriate dashboard
        const lbl = subBtn?.querySelector('.blbl');
        if (lbl) lbl.textContent = '✓ Signed in!';

        setTimeout(() => {
            window.location.href = destForRole(user.role);
        }, 500);

    } catch (err) {
        showAlert(err.message || 'Login failed. Please check your credentials.');
        setLoading(false);
    }
});

/* ── OAuth ───────────────────────────────────────────────────────────────── */
document.getElementById('google-btn')?.addEventListener('click', () => {
    window.location.href = '/api/auth/google';
});
document.getElementById('github-btn')?.addEventListener('click', () => {
    window.location.href = '/api/auth/github';
});