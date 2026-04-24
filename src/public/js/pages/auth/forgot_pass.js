// public/js/pages/auth/forgot_pass.js

const form       = document.getElementById('forgotForm');
const submitBtn  = document.getElementById('submitBtn');
const btnText    = document.getElementById('btnText');
const btnRing    = document.getElementById('btnRing');
const emailErr   = document.getElementById('emailError');
const stepReq    = document.getElementById('stepRequest');
const stepSent   = document.getElementById('stepSent');
const sentEmail  = document.getElementById('sentEmail');
const resendBtn  = document.getElementById('resendBtn');
const timerWrap  = document.getElementById('timerWrap');
const timerCount = document.getElementById('timerCount');

let lastEmail   = '';
let countdownId = null;

const setLoading = (on) => {
    submitBtn.disabled = on;
    btnText.classList.toggle('hidden', on);
    btnRing.classList.toggle('hidden', !on);
};

const showError = (msg) => {
    emailErr.textContent = msg;
    document.getElementById('email').classList.add('is-error');
};
const clearError = () => {
    emailErr.textContent = '';
    document.getElementById('email').classList.remove('is-error');
};

const startCooldown = (seconds = 60) => {
    resendBtn.disabled = true;
    timerWrap.classList.remove('hidden');
    timerCount.textContent = seconds;
    countdownId = setInterval(() => {
        seconds--;
        timerCount.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(countdownId);
            resendBtn.disabled = false;
            timerWrap.classList.add('hidden');
        }
    }, 1000);
};

const submitRequest = async (email) => {
    clearError();
    setLoading(true);
    try {
        await fetch('/api/auth/forgot-password', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email }),
        });
        sentEmail.textContent = email;
        stepReq.classList.add('hidden');
        stepSent.classList.remove('hidden');
        startCooldown(60);
    } catch {
        showError('Something went wrong. Please try again.');
    } finally {
        setLoading(false);
    }
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) { showError('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Please enter a valid email address.'); return;
    }
    lastEmail = email;
    await submitRequest(email);
});

resendBtn.addEventListener('click', async () => {
    if (!lastEmail) return;
    await submitRequest(lastEmail);
});