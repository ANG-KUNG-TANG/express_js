// js/pages/auth/forgot_password.js
// Mirrors login.js / register.js: import apiFetch.js, manipulate DOM, show toast

import { apiFetch }   from '../../core/api.js';
import { toast } from '../../core/toast.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const forgotForm  = document.getElementById('forgotForm');
const emailInput  = document.getElementById('email');
const emailError  = document.getElementById('emailError');
const submitBtn   = document.getElementById('submitBtn');
const btnText     = submitBtn.querySelector('.btn-text');
const btnSpinner  = submitBtn.querySelector('.btn-spinner');

const stepRequest = document.getElementById('stepRequest');
const stepSuccess = document.getElementById('stepSuccess');
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
    el.previousElementSibling?.querySelector('input')?.classList.add('is-error');
};

const clearError = (el) => {
    el.textContent = '';
    el.previousElementSibling?.querySelector('input')?.classList.remove('is-error');
};

const showStep = (hideEl, showEl) => {
    hideEl.classList.add('hidden');
    showEl.classList.remove('hidden');
};

// ── Validation ─────────────────────────────────────────────────────────────────
const validateEmail = (value) => {
    if (!value.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
    return null;
};

// ── Submit ─────────────────────────────────────────────────────────────────────
const handleSubmit = async (email) => {
    setLoading(true);
    try {
        await apiFetch.post('/auth/forgot-password', { email });

        lastEmail = email;
        sentEmail.textContent = email;
        showStep(stepRequest, stepSuccess);
    } catch (err) {
        // Even on 404-style backend errors the response message is always generic
        toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
        setLoading(false);
    }
};

// ── Form listener ──────────────────────────────────────────────────────────────
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

// ── Resend ─────────────────────────────────────────────────────────────────────
resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending…';
    try {
        await apiFetch.post('/auth/forgot-password', { email: lastEmail });
        toast.success('Reset link resent!');
    } catch {
        toast.error('Could not resend. Try again shortly.');
    } finally {
        setTimeout(() => {
            resendBtn.disabled   = false;
            resendBtn.textContent = 'Resend email';
        }, 30_000); // 30s cooldown
    }
});