// public/js/pages/auth/reset_password.js

const stepValidating = document.getElementById('stepValidating');
const stepInvalid    = document.getElementById('stepInvalid');
const stepForm       = document.getElementById('stepForm');
const stepDone       = document.getElementById('stepDone');

const show = (el) => {
    [stepValidating, stepInvalid, stepForm, stepDone].forEach(s => s.classList.add('hidden'));
    el.classList.remove('hidden');
};

// ── Read token from URL ───────────────────────────────────────────────────────
const params   = new URLSearchParams(window.location.search);
const rawToken = params.get('token');

if (!rawToken) {
    show(stepInvalid);
} else {
    // Validate token on load
    fetch(`/api/auth/reset-password/validate?token=${encodeURIComponent(rawToken)}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) show(stepForm);
            else              show(stepInvalid);
        })
        .catch(() => show(stepInvalid));
}

// ── Password strength ─────────────────────────────────────────────────────────
const pwInput     = document.getElementById('password');
const strengthBar = document.getElementById('strengthBar');
const strengthLbl = document.getElementById('strengthLbl');
const reqs = {
    len:   document.getElementById('req-len'),
    upper: document.getElementById('req-upper'),
    lower: document.getElementById('req-lower'),
    num:   document.getElementById('req-num'),
};

const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

pwInput?.addEventListener('input', () => {
    const pw = pwInput.value;
    const checks = {
        len:   pw.length >= 8,
        upper: /[A-Z]/.test(pw),
        lower: /[a-z]/.test(pw),
        num:   /\d/.test(pw),
    };
    Object.entries(checks).forEach(([k, ok]) => {
        reqs[k].classList.toggle('met', ok);
    });
    const score = Object.values(checks).filter(Boolean).length;
    strengthBar.style.width   = `${score * 25}%`;
    strengthBar.style.background = colors[score] || '#e5e7eb';
    strengthLbl.textContent   = score ? labels[score] : '';
});

// ── Toggle password visibility ────────────────────────────────────────────────
document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.for);
        input.type = input.type === 'password' ? 'text' : 'password';
    });
});

// ── Submit reset form ─────────────────────────────────────────────────────────
const resetForm    = document.getElementById('resetForm');
const resetBtn     = document.getElementById('resetBtn');
const resetBtnText = document.getElementById('resetBtnText');
const resetBtnRing = document.getElementById('resetBtnRing');
const errPassword  = document.getElementById('errPassword');
const errConfirm   = document.getElementById('errConfirm');

const setLoading = (on) => {
    resetBtn.disabled = on;
    resetBtnText.classList.toggle('hidden', on);
    resetBtnRing.classList.toggle('hidden', !on);
};

resetForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errPassword.textContent = '';
    errConfirm.textContent  = '';

    const password        = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password.length < 8) {
        errPassword.textContent = 'Password must be at least 8 characters.';
        return;
    }
    if (password !== confirmPassword) {
        errConfirm.textContent = 'Passwords do not match.';
        return;
    }

    setLoading(true);
    try {
        const res  = await fetch('/api/auth/reset-password', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ token: rawToken, password }),
        });
        const data = await res.json();
        if (data.success) {
            show(stepDone);
        } else {
            errPassword.textContent = data.error?.message || 'Reset failed. Please try again.';
        }
    } catch {
        errPassword.textContent = 'Something went wrong. Please try again.';
    } finally {
        setLoading(false);
    }
});