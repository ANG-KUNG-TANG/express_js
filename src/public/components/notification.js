// components/notification.js
// Drop-in component: call initNotifications() after your navbar renders.
// Usage: import { initNotifications } from '../components/notification.js';

import { apiFetch } from '../js/core/api.js';
import { toast }    from '../js/core/toast.js';

// ── Icons per notification type ───────────────────────────────────────────────
const TYPE_ICONS = {
    // ── assignment flow (teacher → student) ──
    task_assigned: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>`,
    task_accepted: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
    task_declined: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
    task_submitted: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>`,
    task_reminder: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>`,
    // ── result / score flow ──
    test_result:   `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v6a1 1 0 102 0V8z" clip-rule="evenodd"/></svg>`,
    score_available:`<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
    // ── misc ──
    exam_reminder:  `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>`,
    practice_ready: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>`,
    password_changed:`<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>`,
    account_alert:  `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
};

// ── Relative time helper ──────────────────────────────────────────────────────
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

// ── State ─────────────────────────────────────────────────────────────────────
let panelOpen     = false;
let notifications = [];
let unreadCount   = 0;
let isLoading     = false;

// ── Build panel HTML ──────────────────────────────────────────────────────────
const buildPanel = () => `
  <div class="noti-panel" id="notiPanel" role="dialog" aria-label="Notifications">
    <div class="noti-panel-header">
      <span class="noti-panel-title">
        Notifications
        <span class="noti-count-chip" id="notiChip"></span>
      </span>
      <button class="noti-mark-all" id="notiMarkAll" ${unreadCount === 0 ? 'disabled' : ''}>
        Mark all read
      </button>
    </div>
    <div class="noti-list" id="notiList" role="list"></div>
    <div class="noti-panel-footer">
      <a href="#" class="noti-see-all" id="notiSeeAll">See all notifications</a>
    </div>
  </div>
`;

// Resolve a navigation URL from a notification's type + metadata
const resolveUrl = (n) => {
    const meta   = n.metadata ?? n.data ?? {};
    const taskId = meta.taskId;

    switch (n.type) {
        case 'task_assigned':
            // Student: go to task detail to Accept / Decline
            return taskId ? `/pages/tasks/detail.html?id=${taskId}` : null;
        case 'task_accepted':
        case 'task_declined':
        case 'task_submitted':
            // Teacher: go to review page
            return taskId ? `/pages/teacher/review.html?id=${taskId}&mode=review` : null;
        case 'task_scored':
        case 'score_available':
        case 'test_result':
            // Student: go to task detail to see score + feedback
            return taskId ? `/pages/tasks/detail.html?id=${taskId}` : null;
        case 'task_reminder':
        case 'task_unstarted':
            return taskId ? `/pages/tasks/detail.html?id=${taskId}` : null;
        default:
            return null;
    }
};

const buildItem = (n) => {
    const url        = resolveUrl(n);
    const isActionable = !!url;
    const tag        = isActionable ? 'a' : 'div';
    const href       = isActionable ? `href="${url}"` : '';
    const cursor     = isActionable ? 'cursor:pointer' : '';

    return `
  <${tag} class="noti-item ${n.isRead ? '' : 'unread'} ${isActionable ? 'noti-item--link' : ''}"
      data-id="${n._id ?? n.id}" role="listitem"
      ${href} style="${cursor}">
    <div class="noti-item-icon type-${n.type}">
      ${TYPE_ICONS[n.type] ?? TYPE_ICONS.account_alert}
    </div>
    <div class="noti-item-body">
      <p class="noti-item-title">${n.title}</p>
      <p class="noti-item-msg">${n.message}</p>
      <span class="noti-item-time">${timeAgo(n.createdAt)}</span>
      ${isActionable && n.type === 'task_assigned' && !n.isRead
          ? `<span class="noti-action-hint">Tap to accept or decline →</span>`
          : ''}
    </div>
    ${!n.isRead ? '<span class="noti-unread-dot"></span>' : ''}
  </${tag}>
`};

const emptyState  = () => `
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

// ── Fetch ─────────────────────────────────────────────────────────────────────
const fetchNotifications = async (p = 1) => {
    if (isLoading) return;
    isLoading = true;
    renderList(loadingState());
    try {
        // apiFetch is a plain function — no .get() method
        const res  = await apiFetch(`/api/notifications?page=${p}&limit=15`);
        const data = res?.data ?? res;

        notifications = p === 1
            ? (data.notifications ?? [])
            : [...notifications, ...(data.notifications ?? [])];

        unreadCount = data.unreadCount ?? 0;
        renderAll();
    } catch {
        renderList('<div class="noti-empty"><span>Failed to load. Try again.</span></div>');
    } finally {
        isLoading = false;
    }
};

const fetchUnreadCount = async () => {
    try {
        const res   = await apiFetch('/api/notifications?page=1&limit=1');
        const count = (res?.data ?? res).unreadCount ?? 0;
        updateBadge(count);
        unreadCount = count;
    } catch { /* silent */ }
};

// ── Render helpers ────────────────────────────────────────────────────────────
const renderList = (html) => {
    const list = document.getElementById('notiList');
    if (list) list.innerHTML = html;
};

const updateBadge = (count) => {
    const badge = document.getElementById('notiBadge');
    if (!badge) return;
    badge.textContent = count > 99 ? '99+' : count || '';
    badge.classList.toggle('hidden', count === 0);
};

const renderAll = () => {
    const chip    = document.getElementById('notiChip');
    const markAll = document.getElementById('notiMarkAll');

    if (chip)    chip.textContent = unreadCount > 0 ? unreadCount : '';
    if (markAll) markAll.disabled = unreadCount === 0;
    updateBadge(unreadCount);

    renderList(
        notifications.length === 0
            ? emptyState()
            : notifications.map(buildItem).join('')
    );
    attachItemListeners();
};

const attachItemListeners = () => {
    document.querySelectorAll('.noti-item').forEach((el) => {
        el.addEventListener('click', () => {
            // Always mark as read on click
            markOneRead(el.dataset.id);
            // Close the panel — navigation (if any) is handled by the <a> href
            closePanel();
        }, { once: true });
    });
};

// ── Mark read ─────────────────────────────────────────────────────────────────
const markOneRead = async (id) => {
    const item = notifications.find((n) => (n._id ?? n.id) === id);
    if (!item || item.isRead) return;
    try {
        await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
        item.isRead  = true;
        unreadCount  = Math.max(0, unreadCount - 1);
        renderAll();
    } catch {
        toast('Could not mark as read.', 'error');
    }
};

const markAllRead = async () => {
    const markAllBtn = document.getElementById('notiMarkAll');
    if (markAllBtn) markAllBtn.disabled = true;
    try {
        await apiFetch('/api/notifications/read', {
            method: 'PATCH',
            body: JSON.stringify({ ids: 'all' }),
        });
        notifications.forEach((n) => { n.isRead = true; });
        unreadCount = 0;
        renderAll();
        toast('All notifications marked as read.', 'success');
    } catch {
        toast('Could not mark all as read.', 'error');
        if (markAllBtn) markAllBtn.disabled = false;
    }
};

// ── Panel open / close ────────────────────────────────────────────────────────
const openPanel = () => {
    const wrapper = document.getElementById('notiWrapper');
    if (!wrapper) return;
    wrapper.insertAdjacentHTML('beforeend', buildPanel());
    fetchNotifications(1);
    panelOpen = true;

    document.getElementById('notiMarkAll')?.addEventListener('click', markAllRead);

    // close on outside click or Escape (deferred one tick to avoid self-close)
    setTimeout(() => {
        document.addEventListener('click',   outsideClick);
        document.addEventListener('keydown', escapeKey);
    }, 0);
};

const closePanel = () => {
    const panel = document.getElementById('notiPanel');
    if (!panel) return;
    panel.classList.add('closing');
    panel.addEventListener('animationend', () => panel.remove(), { once: true });
    panelOpen = false;
    document.removeEventListener('click',   outsideClick);
    document.removeEventListener('keydown', escapeKey);
};

const outsideClick = (e) => {
    if (!document.getElementById('notiWrapper')?.contains(e.target)) closePanel();
};
const escapeKey = (e) => {
    if (e.key === 'Escape') closePanel();
};

// ── Poll for new count every 60 s (only when tab is active) ──────────────────
const startPolling = () => {
    setInterval(() => {
        if (!document.hidden) fetchUnreadCount();
    }, 60_000);
};

// ── Real-time Socket.IO connection ────────────────────────────────────────────
// Loads socket.io-client from CDN and connects to the same origin.
// When the server emits 'notification:new', the bell updates instantly
// without waiting for the 60s poll.
const connectSocket = () => {
    // Only connect once
    if (window.__notiSocket) return;

    // Load socket.io-client from CDN then connect
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/socket.io-client@4/dist/socket.io.min.js';
    script.onload = () => {
        const rawToken = localStorage.getItem('token');
        if (!rawToken) return;

        // Strip any existing "Bearer " prefix to avoid sending "Bearer Bearer <jwt>"
        const cleanToken = rawToken.replace(/^Bearer\s+/i, '');

        const socket = window.io({
            auth: { token: `Bearer ${cleanToken}` },
        });

        window.__notiSocket = socket;

        socket.on('connect', () => {
            console.log('[notifications] Socket connected');
        });

        // Server pushes this event when a new notification is created
        socket.on('notification:new', (noti) => {
            // Bump the unread count immediately
            unreadCount += 1;
            updateBadge(unreadCount);

            // If the panel is open, prepend the new notification
            if (panelOpen) {
                notifications.unshift(noti);
                renderAll();
            }
        });

        socket.on('disconnect', () => {
            console.log('[notifications] Socket disconnected');
        });

        socket.on('connect_error', (err) => {
            // Silent — fall back to polling
            console.warn('[notifications] Socket error:', err.message);
        });
    };
    script.onerror = () => {
        console.warn('[notifications] Could not load socket.io-client — using polling only');
    };
    document.head.appendChild(script);
};

// ── Extra styles injected once ───────────────────────────────────────────────
const injectNotiStyles = () => {
    if (document.getElementById('noti-extra-styles')) return;
    const s = document.createElement('style');
    s.id = 'noti-extra-styles';
    s.textContent = `
        .noti-item--link { text-decoration: none; color: inherit; display: flex; }
        .noti-item--link:hover { background: var(--surface2, #f8f8f8); }
        .noti-action-hint {
            display: inline-block;
            margin-top: 4px;
            font-size: 11px;
            font-weight: 600;
            color: var(--indigo, #4f6ef7);
            letter-spacing: .02em;
        }
    `;
    document.head.appendChild(s);
};

// ── Public init — call after navbar renders ───────────────────────────────────
export const initNotifications = () => {
    const wrapper = document.getElementById('notiWrapper');
    if (!wrapper) {
        console.warn('[notifications] No #notiWrapper found in DOM.');
        return;
    }

    wrapper.innerHTML = `
      <button class="noti-trigger" id="notiBell"
              aria-label="Notifications" aria-haspopup="true">
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

    injectNotiStyles();
    fetchUnreadCount();
    startPolling();
    connectSocket();
};