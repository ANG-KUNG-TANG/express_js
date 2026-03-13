import { requireGuest } from '../../core/router.js';
import { saveSession }  from '../../core/auth.js';
import { apiFetch }     from '../../core/api.js';

requireGuest();

const form      = document.getElementById('login-form');
const emailEl   = document.getElementById('email');
const passEl    = document.getElementById('password');
const alertEl   = document.getElementById('login-alert');
const submitBtn = document.getElementById('btn-submit');

form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous error
    if (alertEl) { alertEl.textContent = ''; alertEl.style.display = 'none'; }

    const email    = emailEl.value.trim();
    const password = passEl.value;

    // Basic client-side validation
    if (!email || !password) {
        showAlert('Please enter your email and password.');
        return;
    }

    setLoading(true);

    try {
        const res = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        const token = res?.token || res?.data?.token;
        const user  = res?.user  || res?.data?.user;

        if (!token || !user) {
            throw new Error('Invalid response from server. Please try again.');
        }

        saveSession(token, user);
        window.location.href = '/pages/dashboard.html';

    } catch (err) {
        showAlert(err.message || 'Login failed. Please check your credentials.');
        setLoading(false);
    }
});

// OAuth — kept with optional chaining; new HTML uses <a href> so these are no-ops there
document.getElementById('google-btn')?.addEventListener('click', () => {
    window.location.href = '/api/auth/google';
});
document.getElementById('github-btn')?.addEventListener('click', () => {
    window.location.href = '/api/auth/github';
});

function showAlert(msg) {
    if (!alertEl) return;
    alertEl.textContent = msg;
    alertEl.style.display = 'block';
}

function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.innerHTML = loading
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Signing in…`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
             <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
             <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
           </svg> Sign In`;
}