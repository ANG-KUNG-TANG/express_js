/**
 * profile.js — ESM module
 * Path: /js/pages/profile/profile.js
 *
 * Responsibilities:
 *  1. On load   → GET  /api/users/me          → populate fields + images + files
 *  2. Save info → PATCH /api/users/me
 *  3. Avatar    → POST  /api/users/me/avatar
 *  4. Cover     → POST  /api/users/me/cover
 *  5. Password  → PATCH /api/auth/password
 *  6. Files     → POST  /api/users/me/files  /  DELETE /api/users/me/files/:fileId
 *  7. Delete    → DELETE /api/users/me
 */

// ─────────────────────────────────────────────
// Core helpers
// ─────────────────────────────────────────────

const token      = () => localStorage.getItem('token') ?? '';
const authHdr    = () => ({ Authorization: `Bearer ${token()}` });
const BASE       = '/api/users/me';

async function apiFetch(url, options = {}) {
  const res  = await fetch(url, {
    ...options,
    headers: { ...authHdr(), ...options.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json.data;
}

// ─────────────────────────────────────────────
// Tiny DOM helpers
// ─────────────────────────────────────────────

const $       = id => document.getElementById(id);
const getVal  = id => $(id)?.value ?? '';
const setVal  = (id, v) => { const el = $(id); if (el) el.value = v; };
const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fmtDate = d => {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
       + ' · ' + dt.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
};

// ─────────────────────────────────────────────
// Toast (delegates to profile.html's __showToast if present)
// ─────────────────────────────────────────────

let _toastTimer;
function showToast(msg, type = 'success') {
  if (typeof window.__showToast === 'function') { window.__showToast(msg, type); return; }
  clearTimeout(_toastTimer);
  const t  = $('toast');
  const ic = $('toast-icon');
  if (!t) return;
  $('toast-msg').textContent = msg;
  t.className = `toast toast--${type}`;
  if (ic) {
    ic.innerHTML = type === 'success'
      ? '<polyline points="20 6 9 17 4 12"/>'
      : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
  }
  requestAnimationFrame(() => t.classList.add('show'));
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

function showInline(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

// ─────────────────────────────────────────────
// Role badge helper (admin / teacher / student)
// ─────────────────────────────────────────────

function applyRoleBadge(role) {
  const rb = $('profile-role-badge');
  if (!rb) return;
  rb.className = 'badge'; // reset
  switch ((role || '').toUpperCase()) {
    case 'ADMIN':
      rb.textContent = 'Admin';
      rb.classList.add('badge--admin');
      break;
    case 'TEACHER':
      rb.textContent = 'Teacher';
      rb.classList.add('badge--teacher');
      break;
    default:
      rb.textContent = 'Student';
  }
}

// ─────────────────────────────────────────────
// Populate hero + fields from a user object
// ─────────────────────────────────────────────

function populateUI(user) {
  if (!user) return;

  const name  = user.name  || '';
  const email = user.email || '';
  const role  = user.role  || 'user';

  // Hero
  const parts    = name.trim().split(' ');
  const initials = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
  setText('profile-initials',     initials);
  setText('profile-display-name',  name  || '—');
  setText('profile-display-email', email || '—');
  applyRoleBadge(role);

  // Personal info fields
  const [first, ...rest] = name.split(' ');
  setVal('field-first', first || '');
  setVal('field-last',  rest.join(' '));
  setVal('field-email', email);

  // Extra fields (topped up from API)
  if (user.bio)        setVal('field-bio',       user.bio);
  if (user.targetBand) setVal('field-target',    user.targetBand);
  if (user.examDate)   setVal('field-exam-date', user.examDate?.slice(0, 10));

  // Account metadata
  setVal('field-uid',          user.id || user._id || '—');
  setVal('field-role-display', (role).toUpperCase());
  setVal('field-created',      fmtDate(user.createdAt));
  setVal('field-updated',      fmtDate(user.updatedAt));

  // Stats
  if (user.stats) {
    const map = {
      'ps-assigned' : 'assigned',
      'ps-submitted': 'submitted',
      'ps-scored'   : 'scored',
      'ps-avg'      : 'avgBand',
    };
    Object.entries(map).forEach(([elId, key]) => {
      const v = user.stats[key];
      if (v != null) setText(elId, elId === 'ps-avg' ? Number(v).toFixed(1) : v);
    });
  }
}

// ─────────────────────────────────────────────
// Load profile from API
// ─────────────────────────────────────────────

async function loadProfile() {
  // 1. Populate immediately from localStorage (no flicker)
  try {
    const cached = JSON.parse(localStorage.getItem('user') || '{}');
    populateUI(cached);
  } catch { /* cached value malformed — skip pre-populate */ }

  // 2. Top up from API
  try {
    const user = await apiFetch(BASE);

    // Merge into localStorage
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...stored, ...user }));

    populateUI(user);

    // Avatar
    if (user.avatarUrl) {
      const avatar = $('profile-avatar');
      if (avatar) avatar.innerHTML = `<img src="${user.avatarUrl}" alt="Avatar"/>`;
    }

    // Cover
    if (user.coverUrl) {
      const coverArea = $('cover-area');
      if (coverArea) {
        let img = coverArea.querySelector('img.cover-img');
        if (!img) {
          img = document.createElement('img');
          img.className = 'cover-img';
          img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
          coverArea.insertBefore(img, coverArea.querySelector('.profile-cover__hint'));
        }
        img.src = user.coverUrl;
        const canvas = $('cover-canvas');
        if (canvas) canvas.style.display = 'none';
      }
    }

    // Attachments
    if (Array.isArray(user.attachments)) renderServerFiles(user.attachments);

  } catch (err) {
    console.error('profile.loadProfile:', err.message);
  }
}

// ─────────────────────────────────────────────
// Save personal info — PATCH /api/users/me
// ─────────────────────────────────────────────

async function saveInfo() {
  const first     = getVal('field-first').trim();
  const last      = getVal('field-last').trim();
  const email     = getVal('field-email').trim();
  const name      = (first + ' ' + last).trim();
  const bio       = getVal('field-bio');
  const targetBand = getVal('field-target');
  const examDate  = getVal('field-exam-date');

  if (name.length < 3)      { showToast('Name must be at least 3 characters', 'error'); return; }
  if (name.length > 100)    { showToast('Name must be under 100 characters',  'error'); return; }
  if (!emailRe.test(email)) { showToast('Please enter a valid email address',  'error'); return; }

  try {
    const user = await apiFetch(BASE, {
      method : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ name, email, bio, targetBand, examDate }),
    });

    // Sync localStorage + re-populate hero
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    const merged = { ...stored, ...user };
    localStorage.setItem('user', JSON.stringify(merged));
    populateUI(merged);
    setVal('field-updated', fmtDate(new Date()));

    showInline('info-feedback');
    showToast('Profile saved');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────
// Change password — PATCH /api/auth/password
// ─────────────────────────────────────────────

async function savePassword() {
  const curr = getVal('field-pw-current');
  const nw   = getVal('field-pw-new');
  const conf = getVal('field-pw-confirm');

  if (!curr)         { showToast('Enter your current password',             'error'); return; }
  if (nw.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
  if (nw !== conf)   { showToast('Passwords do not match',                  'error'); return; }

  try {
    await apiFetch('/api/auth/password', {
      method : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ currentPassword: curr, newPassword: nw }),
    });
    ['field-pw-current','field-pw-new','field-pw-confirm'].forEach(id => setVal(id, ''));
    checkPwStrength('');
    showInline('pw-feedback');
    showToast('Password updated successfully');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────
// Avatar upload — POST /api/users/me/avatar
// ─────────────────────────────────────────────

async function uploadAvatar(file) {
  const fd = new FormData();
  fd.append('file', file);
  try {
    const data = await apiFetch(`${BASE}/avatar`, { method: 'POST', body: fd });
    if (data?.avatarUrl) {
      $('profile-avatar').innerHTML = `<img src="${data.avatarUrl}" alt="Avatar"/>`;
    }
    showToast('Profile picture updated');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────
// Cover upload — POST /api/users/me/cover
// ─────────────────────────────────────────────

async function uploadCover(file) {
  const fd = new FormData();
  fd.append('file', file);
  try {
    await apiFetch(`${BASE}/cover`, { method: 'POST', body: fd });
    showToast('Cover photo updated');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────
// File attachments
// ─────────────────────────────────────────────

function fileCategory(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['doc','docx','txt'].includes(ext)) return 'doc';
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return 'img';
  if (['xls','xlsx','csv'].includes(ext)) return 'xls';
  if (['ppt','pptx'].includes(ext)) return 'ppt';
  return 'misc';
}

function fmtSize(b) {
  return b < 1024 ? b+'B' : b < 1048576 ? (b/1024).toFixed(1)+'KB' : (b/1048576).toFixed(1)+'MB';
}

function renderServerFiles(attachments) {
  const list  = $('file-list');
  const label = $('file-count-label');
  if (!list) return;

  list.innerHTML = '';

  attachments.forEach(a => {
    const ext = (a.originalName.split('.').pop() || '?').toUpperCase();
    const cat = fileCategory(a.originalName);
    const el  = document.createElement('div');
    el.className    = 'file-item';
    el.dataset.fileId = a._id;
    el.innerHTML = `
      <div class="file-type ${cat}">${ext}</div>
      <div class="file-meta">
        <div class="file-meta__name">${a.originalName}</div>
        <div class="file-meta__size">${fmtSize(a.size)}</div>
      </div>
      <a href="${a.url}" target="_blank" class="file-remove" title="Download" style="color:var(--accent)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </a>
      <button class="file-remove js-delete-file" data-id="${a._id}" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>`;
    list.appendChild(el);
  });

  if (label) label.textContent = `${attachments.length} file${attachments.length !== 1 ? 's' : ''}`;

  // Wire delete buttons
  list.querySelectorAll('.js-delete-file').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fileId = btn.dataset.id;
      try {
        await apiFetch(`${BASE}/files/${fileId}`, { method: 'DELETE' });
        btn.closest('.file-item').remove();
        const remaining = list.querySelectorAll('.file-item').length;
        if (label) label.textContent = `${remaining} file${remaining !== 1 ? 's' : ''}`;
        showToast('File removed');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// Local (pre-upload) file rendering
const _localFiles = [];

function renderLocalFiles() {
  const list  = $('file-list');
  const label = $('file-count-label');
  if (!list) return;
  const n = _localFiles.length;
  if (label) label.textContent = `${n} file${n !== 1 ? 's' : ''}`;
  list.innerHTML = '';
  _localFiles.forEach((f, i) => {
    const cat = fileCategory(f.name);
    const ext = (f.name.split('.').pop() || '?').toUpperCase();
    const el  = document.createElement('div');
    el.className = 'file-item';
    el.innerHTML = `
      <div class="file-type ${cat}">${ext}</div>
      <div class="file-meta">
        <div class="file-meta__name">${f.name}</div>
        <div class="file-meta__size">${fmtSize(f.size)}</div>
      </div>
      <button class="file-remove js-remove-local" data-i="${i}" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>`;
    list.appendChild(el);
  });
  list.querySelectorAll('.js-remove-local').forEach(btn => {
    btn.addEventListener('click', () => {
      _localFiles.splice(Number(btn.dataset.i), 1);
      renderLocalFiles();
      showToast('File removed');
    });
  });
}

async function handleFileUpload(files) {
  const valid = [];
  files.forEach(f => {
    if (f.size > 10 * 1024 * 1024) { showToast(`${f.name} exceeds 10 MB`, 'error'); return; }
    if (_localFiles.find(x => x.name === f.name && x.size === f.size)) return;
    valid.push(f);
  });
  if (!valid.length) return;

  try {
    const fd = new FormData();
    valid.forEach(f => fd.append('files', f));
    const data = await apiFetch(`${BASE}/files`, { method: 'POST', body: fd });
    if (Array.isArray(data?.attachments)) {
      renderServerFiles(data.attachments);
    } else {
      valid.forEach(f => _localFiles.push(f));
      renderLocalFiles();
    }
    showToast(`${valid.length} file${valid.length > 1 ? 's' : ''} uploaded`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────
// Password strength meter
// ─────────────────────────────────────────────

function checkPwStrength(pw) {
  const lvls = ['s-weak','s-fair','s-strong','s-great'];
  const lbls = ['Weak',  'Fair',  'Strong',  'Great!'];
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  s = pw.length ? Math.max(1, s) : 0;
  ['pb1','pb2','pb3','pb4'].forEach((id, i) => {
    const el = $(id);
    if (el) el.className = 'pw-bar' + (i < s ? ' ' + lvls[s - 1] : '');
  });
  const h = $('pw-hint');
  if (h) {
    h.textContent = pw.length ? lbls[s - 1] : '';
    h.className   = 'pw-hint' + (pw.length ? ' ' + lvls[s - 1] : '');
  }
}

// ─────────────────────────────────────────────
// Default cover canvas
// ─────────────────────────────────────────────

function drawDefaultCover() {
  const c = $('cover-canvas');
  if (!c) return;
  c.width  = c.closest('.profile-cover')?.offsetWidth || 760;
  c.height = 120;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, c.width, 0);
  g.addColorStop(0,    '#3d5af1');
  g.addColorStop(0.55, '#7c3aed');
  g.addColorStop(1,    '#0ea5e9');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= c.width;  x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
  for (let y = 0; y <= c.height; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }
}

// ─────────────────────────────────────────────
// Sign out
// ─────────────────────────────────────────────

async function signOut() {
  try {
    const { logOut } = await import('/js/core/auth.js');
    logOut();
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.replace('/pages/auth/login.html');
  }
}

// ─────────────────────────────────────────────
// Delete account
// ─────────────────────────────────────────────

async function deleteAccount() {
  if (!confirm('Are you absolutely sure?\n\nThis will permanently delete your account and all data. This cannot be undone.')) return;
  try {
    await apiFetch(BASE, { method: 'DELETE' });
    showToast('Account deleted — signing out…', 'error');
    setTimeout(signOut, 1800);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────
// Cancel / snapshot for personal info
// ─────────────────────────────────────────────

let _infoSnap = null;
function takeSnap() {
  _infoSnap = {
    first    : getVal('field-first'),
    last     : getVal('field-last'),
    email    : getVal('field-email'),
    target   : getVal('field-target'),
    examDate : getVal('field-exam-date'),
    bio      : getVal('field-bio'),
  };
}
function restoreSnap() {
  if (!_infoSnap) return;
  setVal('field-first',    _infoSnap.first);
  setVal('field-last',     _infoSnap.last);
  setVal('field-email',    _infoSnap.email);
  setVal('field-target',   _infoSnap.target);
  setVal('field-exam-date',_infoSnap.examDate);
  setVal('field-bio',      _infoSnap.bio);
}

// ─────────────────────────────────────────────
// Boot — wire everything up on DOMContentLoaded
// ─────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {

  drawDefaultCover();
  loadProfile();
  takeSnap();

  // ── Cover ──
  $('cover-area')?.addEventListener('click', () => $('cover-file-input')?.click());
  $('cover-file-input')?.addEventListener('change', async function () {
    const file = this.files[0]; if (!file) return;
    // Preview immediately
    const reader = new FileReader();
    reader.onload = e => {
      const area = $('cover-area');
      let img = area.querySelector('img.cover-img');
      if (!img) {
        img = document.createElement('img'); img.className = 'cover-img';
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
        area.insertBefore(img, area.querySelector('.profile-cover__hint'));
      }
      img.src = e.target.result;
      $('cover-canvas').style.display = 'none';
    };
    reader.readAsDataURL(file);
    // Upload to server
    await uploadCover(file);
  });

  // ── Avatar ──
  $('avatar-file-input')?.addEventListener('change', async function () {
    const file = this.files[0]; if (!file) return;
    // Preview immediately
    const reader = new FileReader();
    reader.onload = e => { $('profile-avatar').innerHTML = `<img src="${e.target.result}" alt="Avatar"/>`; };
    reader.readAsDataURL(file);
    // Upload to server
    await uploadAvatar(file);
  });

  // ── Personal info ──
  $('save-info-btn')?.addEventListener('click', async () => {
    await saveInfo();
    takeSnap();
  });
  $('cancel-info-btn')?.addEventListener('click', restoreSnap);

  // ── Password ──
  $('field-pw-new')?.addEventListener('input', function () { checkPwStrength(this.value); });
  $('clear-pw-btn')?.addEventListener('click', () => {
    ['field-pw-current','field-pw-new','field-pw-confirm'].forEach(id => setVal(id, ''));
    checkPwStrength('');
  });
  $('save-pw-btn')?.addEventListener('click', savePassword);

  // ── File dropzone ──
  $('browse-files-btn')?.addEventListener('click', () => $('file-input')?.click());
  $('file-input')?.addEventListener('change', async function () {
    await handleFileUpload([...(this.files || [])]);
    this.value = '';
  });
  const dz = $('dropzone');
  if (dz) {
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', ()  => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', async e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      await handleFileUpload([...e.dataTransfer.files]);
    });
  }

  // ── Account actions ──
  $('signout-btn')?.addEventListener('click', signOut);
  $('delete-account-btn')?.addEventListener('click', deleteAccount);
});