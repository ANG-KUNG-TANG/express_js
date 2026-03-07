// components/notification.js
// Drop-in component: call initNotifications() after your navbar renders.
// Mirrors your existing component pattern (navbar.js, taskCard.js etc.)

import { apiFetch }   from '../js/core/api.js';
import { toast } from '../js/core/toast.js';

// ── Icons per notification type ────────────────────────────────────────────────
const TYPE_ICONS = {
    test_result: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v6a1 1 0 102 0V8z" clip-rule="evenodd"/></svg>`,
    exam_reminder: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>`,
    score_available: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
    practice_ready: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>`,
    password_changed: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>`,
    account_alert:   `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
};

// ── Relative time helper ───────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60_000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7)  return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString();
};

// ── State ──────────────────────────────────────────────────────────────────────
let panelOpen     = false;
let notifications = [];
let unreadCount   = 0;
let page          = 1;
let isLoading     = false;

// ── Build panel HTML ───────────────────────────────────────────────────────────
const buildPanel = () => `
  <div class="noti-panel" id="notiPanel" role="dialog" aria-label="Notifications">
    <div class="noti-panel-header">
      <span class="noti-panel-title">
        Notifications
        <span class="noti-count-chip" id="notiChip"></span>
      </span>
      <button class="noti-mark-all" id="notiMarkAll">Mark all read</button>
    </div>
    <div class="noti-list" id="notiList" role="list"></div>
    <div class="noti-panel-footer">
      <a href="#" class="noti-see-all" id="notiSeeAll">See all notifications</a>
    </div>
  </div>
`;

const buildItem = (n) => `
  <div class="noti-item ${n.isRead ? '' : 'unread'}" data-id="${n.id}" role="listitem">
    <div class="noti-item-icon type-${n.type}">
      ${TYPE_ICONS[n.type] || TYPE_ICONS.account_alert}
    </div>
    <div class="noti-item-body">
      <p class="noti-item-title">${n.title}</p>
      <p class="noti-item-msg">${n.message}</p>
      <span class="noti-item-time">${timeAgo(n.createdAt)}</span>
    </div>
  </div>
`;

const emptyState = () => `
  <div class="noti-empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
    </svg>
    <span>You're all caught up!</span>
  </div>
`;

const loadingState = () => `
  <div class="noti-loading"><div class="noti-loading-ring"></div></div>
`;

// ── Fetch from apiFetch ─────────────────────────────────────────────────────────────
const fetchNotifications = async (p = 1) => {
    isLoading = true;
    renderList(loadingState());
    try {
        const res = await apiFetch.get(`/notifications?page=${p}&limit=15`);
        const data = res.data ?? res;
        notifications = p === 1 ? data.notifications : [...notifications, ...data.notifications];
        unreadCount   = data.unreadCount ?? 0;
        page          = p;
        renderAll();
    } catch {
        renderList('<div class="noti-empty"><span>Failed to load. Try again.</span></div>');
    } finally {
        isLoading = false;
    }
};

// ── Render helpers ─────────────────────────────────────────────────────────────
const renderList = (html) => {
    const list = document.getElementById('notiList');
    if (list) list.innerHTML = html;
};

const renderAll = () => {
    const chip     = document.getElementById('notiChip');
    const markAll  = document.getElementById('notiMarkAll');
    const badge    = document.getElementById('notiBadge');

    if (chip)    chip.textContent    = unreadCount > 0 ? unreadCount : '';
    if (markAll) markAll.disabled    = unreadCount === 0;
    if (badge)   badge.textContent   = unreadCount > 99 ? '99+' : unreadCount;
    if (badge)   badge.classList.toggle('hidden', unreadCount === 0);

    renderList(
        notifications.length === 0
            ? emptyState()
            : notifications.map(buildItem).join('')
    );
    attachItemListeners();
};

const attachItemListeners = () => {
    document.querySelectorAll('.noti-item').forEach((el) => {
        el.addEventListener('click', () => markOneRead(el.dataset.id));
    });
};

// ── Mark read actions ──────────────────────────────────────────────────────────
const markOneRead = async (id) => {
    const item = notifications.find((n) => n.id === id);
    if (!item || item.isRead) return;

    try {
        await apiFetch.patch(`/notifications/${id}/read`);
        item.isRead = true;
        unreadCount = Math.max(0, unreadCount - 1);
        renderAll();
    } catch {
        toast.error('Could not mark as read.');
    }
};

const markAllRead = async () => {
    const markAllBtn = document.getElementById('notiMarkAll');
    if (markAllBtn) markAllBtn.disabled = true;
    try {
        await apiFetch.patch('/notifications/read', { ids: 'all' });
        notifications.forEach((n) => { n.isRead = true; });
        unreadCount = 0;
        renderAll();
        toast.success('All notifications marked as read.');
    } catch {
        toast.error('Could not mark all as read.');
        if (markAllBtn) markAllBtn.disabled = false;
    }
};

// ── Open / close panel ─────────────────────────────────────────────────────────
const openPanel = () => {
    const wrapper = document.getElementById('notiWrapper');
    if (!wrapper) return;
    wrapper.insertAdjacentHTML('beforeend', buildPanel());
    fetchNotifications(1);
    panelOpen = true;

    // wire panel buttons
    document.getElementById('notiMarkAll')?.addEventListener('click', markAllRead);

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', outsideClick);
        document.addEventListener('keydown', escapeKey);
    }, 0);
};

const closePanel = () => {
    const panel = document.getElementById('notiPanel');
    if (!panel) return;
    panel.classList.add('closing');
    panel.addEventListener('animationend', () => panel.remove(), { once: true });
    panelOpen = false;
    document.removeEventListener('click', outsideClick);
    document.removeEventListener('keydown', escapeKey);
};

const outsideClick = (e) => {
    if (!document.getElementById('notiWrapper')?.contains(e.target)) closePanel();
};
const escapeKey = (e) => {
    if (e.key === 'Escape') closePanel();
};

// ── Poll for new notifications (every 60s when tab is active) ─────────────────
const startPolling = () => {
    setInterval(() => {
        if (!document.hidden) fetchUnreadCount();
    }, 60_000);
};

const fetchUnreadCount = async () => {
    try {
        const res = await apiFetch.get('/notifications?page=1&limit=1');
        const count = (res.data ?? res).unreadCount ?? 0;
        const badge = document.getElementById('notiBadge');
        if (badge) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.toggle('hidden', count === 0);
        }
        unreadCount = count;
    } catch { /* silent */ }
};

// ── Public init — call this in navbar.js after rendering the nav ───────────────
export const initNotifications = () => {
    const wrapper = document.getElementById('notiWrapper');
    if (!wrapper) {
        console.warn('[notifications] No #notiWrapper found in DOM.');
        return;
    }

    // Build the trigger button
    wrapper.innerHTML = `
      <button class="noti-trigger" id="notiBell" aria-label="Notifications" aria-haspopup="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
        </svg>
        <span class="noti-badge hidden" id="notiBadge"></span>
      </button>
    `;

    document.getElementById('notiBell').addEventListener('click', (e) => {
        e.stopPropagation();
        panelOpen ? closePanel() : openPanel();
    });

    // Initial unread count fetch
    fetchUnreadCount();
    startPolling();
};