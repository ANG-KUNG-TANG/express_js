// public/js/pages/register.js
import { userAPI, authAPI } from '../api.js';
import { store }            from '../store.js';

store.rehydrate();
if (store.isLoggedIn()) {
    window.location.replace('/pages/dashboard.html');
}

const form     = document.getElementById('register-form');
const errorEl  = document.getElementById('auth-error');
const successEl= document.getElementById('auth-success');
const btn      = document.getElementById('btn-register');
const pwInput  = document.getElementById('reg-password');
const togglePw = document.querySelector('.toggle-pw');

function showError(msg) {
    errorEl.textContent = msg;
    errorEl.className   = 'alert alert-error';
    errorEl.classList.remove('hidden');
    successEl.classList.add('hidden');
}
function showSuccess(msg) {
    successEl.textContent = msg;
    successEl.className   = 'alert alert-success';
    successEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
}
function setLoading(on) {
    btn.disabled = on;
    btn.querySelector('.btn-label').classList.toggle('hidden', on);
    btn.querySelector('.btn-loader').classList.toggle('hidden', !on);
}

togglePw.addEventListener('click', () => {
    const show   = pwInput.type === 'password';
    pwInput.type = show ? 'text' : 'password';
    togglePw.style.opacity = show ? '0.5' : '1';
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = form.name.value.trim();
    const email    = form.email.value.trim();
    const password = form.password.value;

    if (!name)               return showError('Please enter your name.');
    if (!email)              return showError('Please enter your email.');
    if (password.length < 8) return showError('Password must be at least 8 characters.');

    setLoading(true);
    try {
        // Step 1: POST /api/users — create account
        await userAPI.create({ name, email, password });
        showSuccess('Account created! Signing you in…');

        // Step 2: POST /api/auth/login — auto login
        const res         = await authAPI.loginEmail(email, password);
        const payload     = res.data ?? res;
        const accessToken = payload.accessToken;

        if (!accessToken) throw new Error('Registered but login failed. Please sign in manually.');

        let user = {};
        try { user = JSON.parse(atob(accessToken.split('.')[1])); } catch (_) {}

        store.setSession({ user, accessToken });
        window.location.replace('/pages/dashboard.html');

    } catch (err) {
        showError(err.message || 'Registration failed. Please try again.');
    } finally {
        setLoading(false);
    }
});

document.getElementById('btn-github-login').addEventListener('click', () => {
    window.location.href = '/auth/github';
});
document.getElementById('btn-google-login').addEventListener('click', () => {
    window.location.href = '/auth/google';
});