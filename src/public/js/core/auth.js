/**
 * auth.js — session helpers + login/register page logic
 * Usage: import { getUser, isAdmin, logOut, saveSession } from './auth.js';
 */

import { apiFetch } from './api.js';

// ── Session helpers ───────────────────────────────────────────────────────────
export const getUser    = () => JSON.parse(localStorage.getItem('user') || 'null');
export const getToken   = () => localStorage.getItem('token');
export const isAdmin    = () => getUser()?.role === 'ADMIN';
export const isLoggedIn = () => !!getToken();

export const saveSession = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
};

export const logOut = async () => {
    try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {
        // ignore — clear session regardless
    } finally {
        localStorage.clear();
        window.location.href = '/pages/auth/login.html';
    }
};

// ── Login page handler ────────────────────────────────────────────────────────
export const initLoginPage = () => {
    const form   = document.getElementById('login-form');
    const alertEl = document.getElementById('login-alert');
    const btn    = document.getElementById('btn-submit');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors(['err-email', 'err-password']);
        alertEl.style.display = 'none';

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        let valid = true;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showFieldError('err-email', 'Please enter a valid email address.'); valid = false;
        }
        if (!password) {
            showFieldError('err-password', 'Password is required.'); valid = false;
        }
        if (!valid) return;

        setLoading(btn, true, 'Signing in…');
        try {
            const data = await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            saveSession(data.token, data.user);
            window.location.href = '/pages/dashboard.html';
        } catch (err) {
            showAlert(alertEl, err.message || 'Invalid email or password.');
            setLoading(btn, false, 'Sign In');
        }
    });
};

// ── Register page handler ─────────────────────────────────────────────────────
export const initRegisterPage = () => {
    const form    = document.getElementById('register-form');
    const alertEl = document.getElementById('reg-alert');
    const btn     = document.getElementById('btn-submit');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors(['err-name', 'err-email', 'err-password', 'err-confirm']);
        alertEl.style.display = 'none';

        const name     = document.getElementById('name').value.trim();
        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirm  = document.getElementById('confirm-password').value;

        let valid = true;
        if (!name || name.length < 3) {
            showFieldError('err-name', 'Name must be at least 3 characters.'); valid = false;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showFieldError('err-email', 'Please enter a valid email address.'); valid = false;
        }
        if (!password || password.length < 8) {
            showFieldError('err-password', 'Password must be at least 8 characters.'); valid = false;
        }
        if (password !== confirm) {
            showFieldError('err-confirm', 'Passwords do not match.'); valid = false;
        }
        if (!valid) return;

        setLoading(btn, true, 'Creating account…');
        try {
            const data = await apiFetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password }),
            });
            saveSession(data.token, data.user);
            window.location.href = '/pages/dashboard.html';
        } catch (err) {
            showAlert(alertEl, err.message || 'Registration failed. Please try again.');
            setLoading(btn, false, 'Create Account');
        }
    });
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function showFieldError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
}

function clearErrors(ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
}

function showAlert(el, msg) {
    el.textContent = msg;
    el.style.display = 'block';
}

function setLoading(btn, loading, label) {
    btn.disabled = loading;
    btn.innerHTML = loading
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> ${label}`
        : label;
}