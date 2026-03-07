// js/pages/auth/reset_password.js
// Reads ?token= from URL, validates with backend, then handles reset

import { apiFetch   }   from '../../core/apijs';
import { toast } from '../../core/toast.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const stepValidating = document.getElementById('stepValidating');
const stepInvalid    = document.getElementById('stepInvalid');
const stepForm       = document.getElementById('stepForm');
const stepDone       = document.getElementById('stepDone');

const resetForm      = document.getElementById('resetForm');
const passwordInput  = document.getElementById('password');
const confirmInput   = document.getElementById('confirmPassword');
const passwordError  = document.getElementById('passwordError');
const confirmError   = document.getElementById('confirmError');
const resetBtn       = document.getElementById('resetBtn');
const btnText        = resetBtn.querySelector('.btn-text');
const btnSpinner     = resetBtn.querySelector('.btn-spinner');
const strengthFill   = document.getElementById('strengthFill');
const strengthLabel  = document.getElementById('strengthLabel');

const token = new URLSearchParams(window.location.search).get('token');

// ── Step helpers ───────────────────────────────────────────────────────────────
const showOnly = (...show) => {
    [stepValidating, stepInvalid, stepForm, stepDone].forEach((el) =>
        el.classList.add('hidden')
    );
    show.forEach((el) => el.classList.remove('hidden'));
};

// ── Token validation on load ───────────────────────────────────────────────────
const validateToken = async () => {
    if (!token) return showOnly(stepInvalid);
    try {
        await apiFetch .get(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`);
        showOnly(stepForm);
    } catch {
        showOnly(stepInvalid);
    }
};

validateToken();

// ── Password strength meter ────────────────────────────────────────────────────
const getStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8)                  score++;
    if (/[A-Z]/.test(pw))               score++;
    if (/[0-9]/.test(pw))               score++;
    if (/[^A-Za-z0-9]/.test(pw))        score++;
    return score;
};

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

passwordInput.addEventListener('input', () => {
    const score = getStrength(passwordInput.value);
    strengthFill.className = `strength-fill${score ? ` s${score}` : ''}`;
    strengthLabel.textContent = STRENGTH_LABELS[score] || '';
    clearFieldError(passwordError, passwordInput);
});

// ── Validation ─────────────────────────────────────────────────────────────────
const validatePassword = (pw) => {
    if (!pw) return 'Password is required.';
    if (pw.length < 8) return 'Must be at least 8 characters.';
    if (!/[A-Z]/.test(pw)) return 'Must include an uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'Must include a lowercase letter.';
    if (!/[0-9]/.test(pw)) return 'Must include a number.';
    return null;
};

const showFieldError = (el, input, msg) => {
    el.textContent = msg;
    input.classList.add('is-error');
};
const clearFieldError = (el, input) => {
    el.textContent = '';
    input.classList.remove('is-error');
};

// ── Show / hide password toggles ───────────────────────────────────────────────
document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input    = document.getElementById(targetId);
        input.type = input.type === 'password' ? 'text' : 'password';
    });
});

// ── Loading state ──────────────────────────────────────────────────────────────
const setLoading = (on) => {
    resetBtn.disabled = on;
    btnText.classList.toggle('hidden', on);
    btnSpinner.classList.toggle('hidden', !on);
};

// ── Submit ─────────────────────────────────────────────────────────────────────
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = passwordInput.value;
    const confirm  = confirmInput.value;

    let hasError = false;

    const pwErr = validatePassword(password);
    if (pwErr) {
        showFieldError(passwordError, passwordInput, pwErr);
        hasError = true;
    }

    if (password !== confirm) {
        showFieldError(confirmError, confirmInput, 'Passwords do not match.');
        hasError = true;
    } else {
        clearFieldError(confirmError, confirmInput);
    }

    if (hasError) return;

    setLoading(true);
    try {
        await apiFetch .post('/auth/reset-password', { token, password, confirmPassword: confirm });
        showOnly(stepDone);
    } catch (err) {
        toast.error(err.message || 'Reset failed. The link may have expired.');
        // Link may be expired — send user to request a new one
        setTimeout(() => showOnly(stepInvalid), 2500);
    } finally {
        setLoading(false);
    }
});

confirmInput.addEventListener('input', () => clearFieldError(confirmError, confirmInput));