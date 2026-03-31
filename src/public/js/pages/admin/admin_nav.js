/**
 * /js/core/adminNav.js
 *
 * Drop <script type="module" src="/js/core/adminNav.js"></script> in every admin page.
 *
 * What this does:
 *  - Auth guard: redirects to login if not admin
 *  - Injects fixed left sidebar (brand, nav links, bell, user footer)
 *  - Wires up bell + notification panel via initNotifications()
 *  - Fetches open flag count badge for Moderation link
 *  - Handles logout
 *
 * navbar.js is NOT used on admin pages. Students/Teachers use navbar.js instead.
 */
import { apiFetch } from '../../core/api.js';
import { initNotifications } from '../../../components/notification/notification.ui.js';
// ── Auth guard ───────────────────────────────────────────────────────────────
const token = localStorage.getItem('token');
const user  = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

if (!token || !user || user.role !== 'admin') {
  window.location.replace('/pages/auth/login.html');
}

// ── Active page detection ────────────────────────────────────────────────────
const PAGE_MAP = {
  'dashboard.html':     'dashboard',
  'users.html':         'users',
  'tasks.html':         'tasks',
  'moderation.html':    'moderation',
  'review.html':        'review',
  'audit_logs.html':    'audit_logs',
  'notifications.html': 'notifications',
};

const currentPage = PAGE_MAP[location.pathname.split('/').pop()] ?? '';
const _active = (key) => currentPage === key ? 'active' : '';

// ── Sidebar markup ───────────────────────────────────────────────────────────
const sidebar = document.createElement('aside');
sidebar.className = 'sidebar';
sidebar.innerHTML = `
  <div class="sidebar-brand">
    <div class="brand-icon">A</div>
    <div>
      <div class="brand-name">WriteSystem</div>
      <div class="brand-badge">Admin</div>
    </div>
  </div>

  <nav class="sidebar-nav">
    <div class="nav-section-label">Overview</div>
    <a class="nav-item ${_active('dashboard')}" href="/pages/admin/dashboard.html">
      <span class="nav-icon">⊞</span> Dashboard
    </a>

    <div class="nav-section-label">People</div>
    <a class="nav-item ${_active('users')}" href="/pages/admin/users.html">
      <span class="nav-icon">◉</span> Users
    </a>

    <div class="nav-section-label">Content</div>
    <a class="nav-item ${_active('tasks')}" href="/pages/admin/tasks.html">
      <span class="nav-icon">✎</span> Tasks
    </a>
    <a class="nav-item ${_active('moderation')}" href="/pages/admin/moderation.html">
      <span class="nav-icon">⚑</span> Moderation
      <span class="nav-badge" id="nav-flag-count" style="display:none"></span>
    </a>
    <a class="nav-item ${_active('review')}" href="/pages/admin/review.html">
      <span class="nav-icon">◈</span> Review
    </a>
    <a class="nav-item ${_active('audit_logs')}" href="/pages/admin/audit_logs.html">
      <span class="nav-icon">≡</span> Audit Logs
    </a>

    <div class="nav-section-label">Comms</div>
    <a class="nav-item ${_active('notifications')}" href="/pages/admin/notifications.html">
      <span class="nav-icon">◬</span> Notifications
    </a>
  </nav>

  <div class="sidebar-footer">

    <!-- ── Bell notification button ── -->
    <div class="sb-noti-wrapper" style="position:relative;">
      <button
        id="noti-btn"
        class="noti-bell sb-noti-bell"
        aria-label="Notifications"
        aria-expanded="false"
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span id="noti-badge" class="noti-badge hidden" aria-live="polite">0</span>
      </button>

      <!--
        noti-panel opens UPWARD from the footer so it doesn't get clipped.
        CSS: .sb-noti-panel { bottom: calc(100% + 8px); left: 0; }
        See note below on required CSS additions.
      -->
      <div
        id="noti-panel"
        class="noti-panel sb-noti-panel hidden"
        role="dialog"
        aria-label="Notifications panel"
      ></div>
    </div>

    <!-- ── Admin user info ── -->
    <div class="admin-info">
      <div class="admin-avatar" id="sb-avatar"></div>
      <div>
        <div class="admin-name"  id="sb-name"></div>
        <div class="admin-role"  id="sb-email"></div>
      </div>
    </div>

    <button class="logout-btn" id="sb-logout">Sign out</button>
  </div>
`;

// Inject as first child of body
document.body.insertBefore(sidebar, document.body.firstChild);

// ── Populate user info ───────────────────────────────────────────────────────
const _initials = (u) => {
  const name = u?.username || u?.name || u?.email || 'A';
  return name.slice(0, 2).toUpperCase();
};

document.getElementById('sb-avatar').textContent = _initials(user);
document.getElementById('sb-name').textContent   = user?.username || user?.name || 'Admin';
document.getElementById('sb-email').textContent  = user?.email || '';

// ── Open flag count badge ────────────────────────────────────────────────────
apiFetch('/api/admin/flags?status=open&limit=1')
  .then(r => {
    const count = r?.total ?? r?.data?.total ?? 0;
    const badge = document.getElementById('nav-flag-count');
    if (badge && count > 0) {
      badge.textContent = count;
      badge.style.display = '';
    }
  })
  .catch(() => {});

// ── Logout ───────────────────────────────────────────────────────────────────
document.getElementById('sb-logout').addEventListener('click', async () => {
  try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch {}
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.replace('/pages/auth/login.html');
});

// ── Notifications ────────────────────────────────────────────────────────────
// initNotifications() wires up #noti-btn, #noti-panel, #noti-badge.
// These elements are now in the sidebar DOM above, so this call works correctly.
await initNotifications();