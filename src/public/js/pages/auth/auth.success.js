/* auth_success.js — OAuth redirect handler */

const params  = new URLSearchParams(window.location.search);
const token   = params.get('token');
const userB64 = params.get('user');

async function finish(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  window.location.replace('/pages/dashboard.html');
}

function showError(msg) {
  document.querySelector('.spinner').style.display = 'none';
  document.getElementById('error-msg').textContent = msg;
  setTimeout(() => window.location.replace('/pages/auth/login.html'), 3000);
}

if (token && userB64) {
  try {
    const user = JSON.parse(atob(userB64));
    finish(token, user);
  } catch {
    showError('Failed to parse auth data. Please try again.');
  }
} else if (token) {
  try {
    const res  = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch user');
    finish(token, data.data || data.user || data);
  } catch (err) {
    showError(err.message);
  }
} else {
  try {
    const res  = await fetch('/api/auth/session', { credentials: 'include' });
    const data = await res.json();
    if (res.ok && data?.data?.token) {
      finish(data.data.token, data.data.user);
    } else {
      showError('No session found. Please sign in again.');
    }
  } catch {
    showError('Authentication failed. Please try again.');
  }
}