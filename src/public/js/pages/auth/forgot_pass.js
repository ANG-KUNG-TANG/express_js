// js/pages/auth/forgot_password.js

import { apiFetch } from '../../core/api.js';
import { toast }    from '../../core/toast.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const forgotForm  = document.getElementById('forgotForm');
const emailInput  = document.getElementById('email');
const emailError  = document.getElementById('emailError');
const submitBtn   = document.getElementById('submitBtn');

// FIX #1: HTML uses id="btnText" and id="btnRing", not .btn-text / .btn-spinner
const btnText     = document.getElementById('btnText');
const btnSpinner  = document.getElementById('btnRing');

const stepRequest = document.getElementById('stepRequest');
// FIX #2: HTML uses id="stepSent", not id="stepSuccess"
const stepSuccess = document.getElementById('stepSent');
const sentEmail   = document.getElementById('sentEmail');
const resendBtn   = document.getElementById('resendBtn');

let lastEmail = '';

// ── Helpers ───────────────────────────────────────────────────────────────────
const setLoading = (on) => {
    submitBtn.disabled = on;
    btnText.classList.toggle('hidden', on);
    btnSpinner.classList.toggle('hidden', !on);
};

const showError = (el, msg) => {
    el.textContent = msg;
};

const clearError = (el) => {
    el.textContent = '';
};

const showStep = (hideEl, showEl) => {
    hideEl.classList.add('hidden');
    showEl.classList.remove('hidden');
};

// ── Validation ────────────────────────────────────────────────────────────────
const validateEmail = (value) => {
    if (!value.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
    return null;
};

// ── Submit ────────────────────────────────────────────────────────────────────
const handleSubmit = async (email) => {
    setLoading(true);
    try {
        // FIX #3: apiFetch is a plain function, not an object — use apiFetch(url, options)
        // FIX #4: correct endpoint path with /api prefix to match password_reset.router.js
        await apiFetch('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });

        lastEmail = email;
        sentEmail.textContent = email;
        showStep(stepRequest, stepSuccess);
    } catch (err) {
        // FIX #5: toast is a plain function, not toast.error()
        toast(err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
        setLoading(false);
    }
};

// ── Form listener ─────────────────────────────────────────────────────────────
forgotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const err   = validateEmail(email);

    if (err) {
        showError(emailError, err);
        emailInput.classList.add('is-error');
        return;
    }
    clearError(emailError);
    emailInput.classList.remove('is-error');

    handleSubmit(email);
});

emailInput.addEventListener('input', () => clearError(emailError));

// ── Resend ────────────────────────────────────────────────────────────────────
resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending…';
    try {
        // FIX #3 + #4: same fix — apiFetch as function with /api prefix
        await apiFetch('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email: lastEmail }),
        });
        // FIX #5: toast is a plain function
        toast('Reset link resent!', 'success');
    } catch {
        toast('Could not resend. Try again shortly.', 'error');
    } finally {
        setTimeout(() => {
            resendBtn.disabled    = false;
            resendBtn.textContent = 'Resend email';
        }, 30_000); // 30s cooldown
    }
});