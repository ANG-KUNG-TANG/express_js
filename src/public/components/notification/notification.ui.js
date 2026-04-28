/**
 * notification_ui.js — bell icon + panel embedded inside the admin sidebar.
 *
 * Layout: injected as a collapsible section between .asb-nav and .asb-footer.
 * No floating dropdown — the panel slides open inside the sidebar itself.
 *
 * Required: admin_sidebar.js must have already run (so .admin-sidebar-root exists).
 *
 * Usage — called by admin_sidebar.js → initNotificationTopbar():
 *   import { initNotifications } from './notification_ui.js';
 *   await initNotifications();
 */

import { notificationAPI }       from '../../js/core/api.js';
import { getTypeConfig }         from './notification.types.js';
import { showNotificationToast } from './notification.toast.js';

let _page        = 1;
let _totalPages  = 1;
let _unreadCount = 0;
let _open        = false;

// ── Inject styles ─────────────────────────────────────────────────────────────
const _injectStyles = () => {
    if (document.getElementById('noti-ui-styles')) return;
    const s = document.createElement('style');
    s.id = 'noti-ui-styles';
    s.textContent = `
        /* ── Sidebar noti section wrapper ── */
        .asb-noti-section {
            border-top: 1px solid var(--border, rgba(255,255,255,.07));
            flex-shrink: 0;
        }

        /* ── Bell trigger row ── */
        .asb-noti-trigger {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 16px;
            cursor: pointer;
            user-select: none;
            transition: background .12s;
            gap: 8px;
        }
        .asb-noti-trigger:hover {
            background: var(--surface2, rgba(255,255,255,.05));
        }
        .asb-noti-trigger-left {
            display: flex;
            align-items: center;
            gap: 9px;
            flex: 1;
            min-width: 0;
        }
        .asb-noti-icon {
            font-size: 15px;
            flex-shrink: 0;
            opacity: .85;
        }
        .asb-noti-label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text1, #e8e3d9);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .asb-noti-trigger-right {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
        }

        /* ── Badge on the trigger ── */
        #noti-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            border-radius: 99px;
            font-size: 10px;
            font-weight: 700;
            background: var(--red, #dc2626);
            color: #fff;
            line-height: 1;
        }
        #noti-badge.hidden { display: none !important; }

        /* ── Chevron ── */
        .asb-noti-chevron {
            font-size: 10px;
            color: var(--text3, #6b7160);
            transition: transform .2s;
        }
        .asb-noti-section.is-open .asb-noti-chevron {
            transform: rotate(180deg);
        }

        /* ── Collapsible panel ── */
        .asb-noti-panel {
            overflow: hidden;
            max-height: 0;
            transition: max-height .25s ease;
            background: var(--surface0, #0f1a14);
            border-top: 1px solid var(--border, rgba(255,255,255,.06));
        }
        .asb-noti-section.is-open .asb-noti-panel {
            max-height: 420px;
        }

        /* ── Panel inner ── */
        .noti-inner {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        /* ── Panel header ── */
        .noti-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 9px 14px 8px;
            border-bottom: 1px solid var(--border, rgba(255,255,255,.06));
            flex-shrink: 0;
        }
        .noti-title {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: .06em;
            text-transform: uppercase;
            color: var(--text3, #6b7160);
        }
        .noti-mark-all {
            font-size: 11px;
            color: var(--amber, #c8a84b);
            background: none;
            border: none;
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 500;
        }
        .noti-mark-all:hover:not(:disabled) {
            background: rgba(200,168,75,.1);
        }
        .noti-mark-all:disabled { opacity: .35; cursor: default; }

        /* ── List ── */
        .noti-list {
            overflow-y: auto;
            flex: 1;
            max-height: 310px;
            scrollbar-width: thin;
            scrollbar-color: var(--border, rgba(255,255,255,.1)) transparent;
        }
        .noti-list::-webkit-scrollbar { width: 4px; }
        .noti-list::-webkit-scrollbar-thumb {
            background: var(--border, rgba(255,255,255,.12));
            border-radius: 4px;
        }

        .noti-empty {
            text-align: center;
            color: var(--text3, #6b7160);
            padding: 20px 14px;
            font-size: 12px;
            margin: 0;
        }

        /* ── Card ── */
        .noti-card {
            display: flex;
            align-items: flex-start;
            gap: 9px;
            padding: 9px 14px;
            border-bottom: 1px solid var(--border, rgba(255,255,255,.05));
            cursor: pointer;
            transition: background .12s;
            position: relative;
        }
        .noti-card:last-child { border-bottom: none; }
        .noti-card:hover {
            background: var(--surface2, rgba(255,255,255,.04));
        }
        .noti-card--unread {
            background: rgba(200,168,75,.07);
            border-left: 2px solid var(--amber, #c8a84b);
        }
        .noti-card--unread:hover {
            background: rgba(200,168,75,.11);
        }

        .noti-card__icon {
            font-size: 16px;
            flex-shrink: 0;
            margin-top: 1px;
        }
        .noti-card__body {
            flex: 1;
            min-width: 0;
        }
        .noti-card__title {
            font-weight: 600;
            font-size: 12px;
            color: var(--text1, #e8e3d9);
            margin: 0 0 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .noti-card__msg {
            font-size: 11.5px;
            color: var(--text2, #9e9a8e);
            margin: 0 0 3px;
            line-height: 1.45;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .noti-card__time {
            font-size: 10.5px;
            color: var(--text3, #6b7160);
        }

        /* ── Delete ── */
        .noti-card__delete {
            flex-shrink: 0;
            background: none;
            border: none;
            font-size: 11px;
            color: var(--text3, #6b7160);
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 4px;
            opacity: 0;
            transition: opacity .15s;
            align-self: center;
        }
        .noti-card:hover .noti-card__delete { opacity: 1; }
        .noti-card__delete:hover {
            color: var(--red, #dc2626);
            background: rgba(220,38,38,.12);
        }

        /* ── Footer load more ── */
        .noti-footer { flex-shrink: 0; }
        .noti-load-more {
            width: 100%;
            padding: 8px;
            background: none;
            border: none;
            border-top: 1px solid var(--border, rgba(255,255,255,.06));
            font-size: 11px;
            color: var(--text3, #6b7160);
            cursor: pointer;
            transition: background .12s, color .12s;
        }
        .noti-load-more:hover {
            background: var(--surface2, rgba(255,255,255,.04));
            color: var(--text1, #e8e3d9);
        }

        /* ── Toast popup ── */
        .noti-toast-popup {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 10000;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 16px;
            border-radius: 10px;
            background: var(--surface1, #1a2a1f);
            border: 1px solid var(--border, rgba(255,255,255,.1));
            box-shadow: 0 8px 32px rgba(0,0,0,.4);
            max-width: 320px;
            animation: notiSlideIn .25s ease;
            cursor: pointer;
        }
        .noti-toast-popup__icon { font-size: 20px; flex-shrink: 0; }
        .noti-toast-popup__body { flex: 1; min-width: 0; }
        .noti-toast-popup__title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text1, #e8e3d9);
            margin: 0 0 2px;
        }
        .noti-toast-popup__msg {
            font-size: 12px;
            color: var(--text2, #9e9a8e);
            margin: 0;
            line-height: 1.4;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .noti-toast-popup__close {
            background: none;
            border: none;
            color: var(--text3, #6b7160);
            cursor: pointer;
            font-size: 12px;
            padding: 0;
            flex-shrink: 0;
            align-self: flex-start;
        }
        .noti-toast-popup__close:hover { color: var(--text1, #e8e3d9); }

        @keyframes notiSlideIn {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(s);
};

// ── Safe type config ──────────────────────────────────────────────────────────
const _safeTypeConfig = (type) => {
    try {
        const cfg = getTypeConfig(type);
        if (cfg && cfg.icon) return cfg;
    } catch { /* fall through */ }
    const defaults = {
        task:     { icon: '📋', color: '#c8a84b' },
        review:   { icon: '✏️',  color: '#c8a84b' },
        score:    { icon: '⭐',  color: '#5db87a' },
        reminder: { icon: '⏰',  color: '#8b5cf6' },
    };
    const key = Object.keys(defaults).find(k => String(type ?? '').toLowerCase().includes(k));
    return defaults[key] ?? { icon: '🔔', color: '#c8a84b' };
};

// ── Inject the section into the sidebar ──────────────────────────────────────
const _injectSidebarSection = () => {
    if (document.getElementById('asb-noti-section')) return;

    const sidebar = document.querySelector('.admin-sidebar-root');
    if (!sidebar) {
        console.warn('[notification_ui] .admin-sidebar-root not found — sidebar not yet rendered?');
        return false;
    }

    const footer = sidebar.querySelector('.asb-footer');

    const section = document.createElement('div');
    section.className = 'asb-noti-section';
    section.id = 'asb-noti-section';
    section.innerHTML = `
        <div class="asb-noti-trigger" id="noti-btn" role="button"
             aria-expanded="false" aria-controls="asb-noti-panel" tabindex="0">
            <div class="asb-noti-trigger-left">
                <span class="asb-noti-icon">🔔</span>
                <span class="asb-noti-label">Notifications</span>
            </div>
            <div class="asb-noti-trigger-right">
                <span id="noti-badge" class="hidden">0</span>
                <span class="asb-noti-chevron">▾</span>
            </div>
        </div>
        <div class="asb-noti-panel" id="noti-panel" role="region" aria-label="Notifications">
            <div class="noti-inner">
                <div class="noti-header">
                    <span class="noti-title">Notifications</span>
                    <button class="noti-mark-all" id="noti-mark-all" disabled>Mark all read</button>
                </div>
                <div id="noti-list" class="noti-list">
                    <p class="noti-empty">Loading…</p>
                </div>
                <div id="noti-footer" class="noti-footer"></div>
            </div>
        </div>`;

    // Insert before footer, or append if footer not found
    if (footer) {
        sidebar.insertBefore(section, footer);
    } else {
        sidebar.appendChild(section);
    }

    return true;
};

// ── Public init ───────────────────────────────────────────────────────────────
export const initNotifications = async () => {
    _injectStyles();

    const injected = _injectSidebarSection();
    if (!injected) return;

    const btn     = document.getElementById('noti-btn');
    const section = document.getElementById('asb-noti-section');

    await _loadPage(1);

    // ── Toggle open/close ─────────────────────────────────────────────────────
    btn?.addEventListener('click', () => {
        _open = !_open;
        section.classList.toggle('is-open', _open);
        btn.setAttribute('aria-expanded', String(_open));
    });

    btn?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            btn.click();
        }
    });

    // ── Mark all read ─────────────────────────────────────────────────────────
    document.getElementById('noti-mark-all')
        ?.addEventListener('click', _markAllRead);

    // ── Real-time: new notification ───────────────────────────────────────────
    window.addEventListener('noti:new', (e) => {
        const noti = e.detail;
        if (!noti) return;
        _unreadCount++;
        _updateBadge();
        _prependCard(noti);
        _showToast(noti);
    });

    // ── Real-time: marked read in another tab ─────────────────────────────────
    window.addEventListener('noti:markedRead', () => {
        if (_unreadCount > 0) { _unreadCount--; _updateBadge(); }
    });
};

// ── Load a page of notifications ──────────────────────────────────────────────
const _loadPage = async (page) => {
    try {
        const res        = await notificationAPI.getAll(page);
        if (!res) return;
        const data       = res.data ?? res;
        _page            = data.page        ?? 1;
        _totalPages      = data.totalPages  ?? 1;
        _unreadCount     = data.unreadCount ?? 0;
        _updateBadge();
        _renderList(data.notifications ?? [], page === 1);
    } catch (err) {
        console.error('[notification_ui] _loadPage failed:', err.message);
        const list = document.getElementById('noti-list');
        if (list) list.innerHTML = '<p class="noti-empty">Failed to load.</p>';
    }
};

// ── Render the list ───────────────────────────────────────────────────────────
const _renderList = (notifications, replace = true) => {
    const list = document.getElementById('noti-list');
    if (!list) return;

    if (replace) {
        if (notifications.length === 0) {
            list.innerHTML = '<p class="noti-empty">You\'re all caught up! 🎉</p>';
        } else {
            list.innerHTML = '';
        }
    }

    notifications.forEach((n) => {
        if (!list.querySelector(`[data-noti-id="${n._id}"]`)) {
            list.insertAdjacentHTML('beforeend', _cardHTML(n));
        }
    });

    list.querySelectorAll('.noti-card:not([data-bound])').forEach(_bindCard);

    // Update mark-all button state
    const markAllBtn = document.getElementById('noti-mark-all');
    if (markAllBtn) markAllBtn.disabled = _unreadCount === 0;

    // Footer — load more
    const footer = document.getElementById('noti-footer');
    if (footer) {
        footer.innerHTML = _page < _totalPages
            ? '<button class="noti-load-more" id="noti-load-more">Load more</button>'
            : '';
        document.getElementById('noti-load-more')
            ?.addEventListener('click', () => _loadPage(_page + 1));
    }
};

// ── Card HTML ─────────────────────────────────────────────────────────────────
const _cardHTML = (n) => {
    const cfg    = _safeTypeConfig(n.type);
    const unread = !n.isRead ? 'noti-card--unread' : '';
    const time   = _relativeTime(n.createdAt);
    const cta    = n.ctaUrl ? `data-cta-url="${_esc(n.ctaUrl)}"` : '';
    return `
        <div class="noti-card ${unread}" data-noti-id="${n._id}" data-read="${n.isRead}" ${cta}>
            <span class="noti-card__icon" style="color:${cfg.color}">${cfg.icon}</span>
            <div class="noti-card__body">
                <p class="noti-card__title">${_esc(n.title ?? 'Notification')}</p>
                <p class="noti-card__msg">${_esc(n.message ?? '')}</p>
                <span class="noti-card__time">${time}</span>
            </div>
            <button class="noti-card__delete" aria-label="Delete" title="Delete">✕</button>
        </div>`;
};

// ── Prepend real-time card ────────────────────────────────────────────────────
const _prependCard = (noti) => {
    const list = document.getElementById('noti-list');
    if (!list) return;
    list.querySelector('.noti-empty')?.remove();
    list.insertAdjacentHTML('afterbegin', _cardHTML(noti));
    const card = list.querySelector(`[data-noti-id="${noti._id}"]`);
    if (card) _bindCard(card);
};

// ── Bind card events ──────────────────────────────────────────────────────────
const _bindCard = (card) => {
    card.dataset.bound = '1';
    card.addEventListener('click', () => _handleCardClick(card));
    card.querySelector('.noti-card__delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        _handleDelete(card);
    });
};

// ── Card click → mark read + navigate ────────────────────────────────────────
const _handleCardClick = async (card) => {
    const id     = card.dataset.notiId;
    const isRead = card.dataset.read === 'true';
    if (!isRead) {
        try {
            await notificationAPI.markOneRead(id);
            card.classList.remove('noti-card--unread');
            card.dataset.read = 'true';
            if (_unreadCount > 0) { _unreadCount--; _updateBadge(); }
            const markAllBtn = document.getElementById('noti-mark-all');
            if (markAllBtn) markAllBtn.disabled = _unreadCount === 0;
        } catch (err) {
            console.error('[notification_ui] markOneRead failed:', err.message);
        }
    }
    const ctaUrl = card.dataset.ctaUrl;
    if (ctaUrl) window.location.href = ctaUrl;
};

// ── Delete card ───────────────────────────────────────────────────────────────
const _handleDelete = async (card) => {
    const id = card.dataset.notiId;
    try {
        await notificationAPI.delete(id);
        const wasUnread = card.dataset.read !== 'true';
        card.remove();
        if (wasUnread && _unreadCount > 0) { _unreadCount--; _updateBadge(); }
        const list = document.getElementById('noti-list');
        if (list && !list.querySelector('.noti-card')) {
            list.innerHTML = '<p class="noti-empty">You\'re all caught up! 🎉</p>';
        }
        const markAllBtn = document.getElementById('noti-mark-all');
        if (markAllBtn) markAllBtn.disabled = _unreadCount === 0;
    } catch (err) {
        console.error('[notification_ui] delete failed:', err.message);
    }
};

// ── Mark all read ─────────────────────────────────────────────────────────────
const _markAllRead = async () => {
    try {
        await notificationAPI.markAllRead();
        document.querySelectorAll('.noti-card--unread').forEach((c) => {
            c.classList.remove('noti-card--unread');
            c.dataset.read = 'true';
        });
        _unreadCount = 0;
        _updateBadge();
        const markAllBtn = document.getElementById('noti-mark-all');
        if (markAllBtn) markAllBtn.disabled = true;
    } catch (err) {
        console.error('[notification_ui] markAllRead failed:', err.message);
    }
};

// ── Badge ─────────────────────────────────────────────────────────────────────
const _updateBadge = () => {
    const badge = document.getElementById('noti-badge');
    if (!badge) return;
    if (_unreadCount > 0) {
        badge.textContent = _unreadCount > 99 ? '99+' : String(_unreadCount);
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
};

// ── In-app toast (bottom-right popup for real-time notifications) ─────────────
const _showToast = (noti) => {
    try {
        // Try the dedicated toast module first
        showNotificationToast(noti);
        return;
    } catch { /* fall through to built-in */ }

    const cfg = _safeTypeConfig(noti.type);
    const el  = document.createElement('div');
    el.className = 'noti-toast-popup';
    el.innerHTML = `
        <span class="noti-toast-popup__icon" style="color:${cfg.color}">${cfg.icon}</span>
        <div class="noti-toast-popup__body">
            <p class="noti-toast-popup__title">${_esc(noti.title ?? 'New notification')}</p>
            <p class="noti-toast-popup__msg">${_esc(noti.message ?? '')}</p>
        </div>
        <button class="noti-toast-popup__close" aria-label="Dismiss">✕</button>`;

    el.addEventListener('click', (e) => {
        if (!e.target.closest('.noti-toast-popup__close') && noti.ctaUrl) {
            window.location.href = noti.ctaUrl;
        }
        el.remove();
    });

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const _relativeTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const _esc = (str) => {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
};