// public/js/pages/login.js
import { authAPI } from '../api.js';
import { store }   from '../store.js';

// Guard: already logged in
store.rehydrate();
if (store.isLoggedIn()) {
    window.location.replace('/pages/dashboard.html');
}

// DOM refs
const form     = document.getElementById('login-form');
const errorEl  = document.getElementById('auth-error');
const btn      = document.getElementById('btn-login');
const pwInput  = document.getElementById('login-password');
const togglePw = document.querySelector('.toggle-pw');

function showError(msg) {
    errorEl.textContent = msg;
    errorEl.className   = 'alert alert-error';
    errorEl.classList.remove('hidden');
}
function clearError() {
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
    clearError();

    const email    = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) return showError('Please enter your email and password.');

    setLoading(true);
    try {
        // POST /api/auth/login
        // Backend returns: { success: true, data: { accessToken, refreshToken } }
        // refreshToken also set as httpOnly cookie by server
        const res = await authAPI.loginEmail(email, password);

        // Handle both { data: { accessToken } } and flat { accessToken }
        const payload     = res.data ?? res;
        const accessToken = payload.accessToken;

        if (!accessToken) throw new Error('No access token in response. Check your backend.');

        // We need the user object — backend login doesn't return it directly
        // so we decode from the JWT payload (base64 middle segment)
        let user = {};
        try {
            user = JSON.parse(atob(accessToken.split('.')[1]));
        } catch (_) {}

        store.setSession({ user, accessToken });
        window.location.replace('/pages/dashboard.html');

    } catch (err) {
        showError(err.message || 'Login failed. Check your credentials.');
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