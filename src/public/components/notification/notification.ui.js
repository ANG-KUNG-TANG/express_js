/**
 * notification_ui.js — bell icon + dropdown panel.
 *
 * Self-contained: all panel/card styles are inlined so it works regardless
 * of whether the host page loads a navbar or sidebar stylesheet.
 *
 * Required DOM (already injected by teacher_sidebar.js):
 *   <button id="noti-btn">…<span id="noti-badge">0</span></button>
 *   <div    id="noti-panel"></div>
 *
 * Usage — called internally by teacher_sidebar.js, no need to call manually.
 */

import { notificationAPI }       from '../../js/core/api.js';
import { getTypeConfig }         from './notification.types.js';
import { showNotificationToast } from './notification.toast.js';

let _page        = 1;
let _totalPages  = 1;
let _unreadCount = 0;
let _open        = false;

// ── Inline styles injected once ───────────────────────────────────────────────
// These make the panel fully visible even if the page stylesheet doesn't have
// .noti-panel, .noti-card, etc. rules — critical when moving from top-nav to sidebar.

const _injectStyles = () => {
    if (document.getElementById('noti-ui-styles')) return;
    const s = document.createElement('style');
    s.id = 'noti-ui-styles';
    s.textContent = `
        /* ── Panel ── */
        #noti-panel {
            display: flex;
            flex-direction: column;
            background: var(--surface1, #ffffff);
            border: 1px solid var(--border, rgba(0,0,0,.14));
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(0,0,0,.14);
            overflow: hidden;
            font-size: 13px;
            color: var(--text1, #111);
            z-index: 9999;
        }
        #noti-panel.hidden { display: none !important; }

        /* ── Header ── */
        .noti-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px 10px;
            border-bottom: 1px solid var(--border, rgba(0,0,0,.1));
            flex-shrink: 0;
        }
        .noti-title {
            font-weight: 600;
            font-size: 13px;
            color: var(--text1, #111);
        }
        .noti-mark-all {
            font-size: 11px;
            color: var(--text3, #888);
            background: none;
            border: none;
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .noti-mark-all:hover:not(:disabled) { background: var(--surface2, #f3f3f3); }
        .noti-mark-all:disabled { opacity: .4; cursor: default; }

        /* ── List ── */
        .noti-list {
            overflow-y: auto;
            max-height: 360px;
            flex: 1;
        }
        .noti-empty {
            text-align: center;
            color: var(--text3, #999);
            padding: 24px 16px;
            margin: 0;
            font-size: 13px;
        }

        /* ── Card ── */
        .noti-card {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px 14px;
            border-bottom: 1px solid var(--border, rgba(0,0,0,.07));
            cursor: pointer;
            transition: background .12s;
            position: relative;
        }
        .noti-card:last-child { border-bottom: none; }
        .noti-card:hover { background: var(--surface2, #f7f7f7); }
        .noti-card--unread { background: var(--surface-info, #eff6ff); }
        .noti-card--unread:hover { background: #e0eeff; }

        .noti-card__icon {
            font-size: 18px;
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
            color: var(--text1, #111);
            margin: 0 0 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .noti-card__msg {
            font-size: 12px;
            color: var(--text2, #555);
            margin: 0 0 4px;
            line-height: 1.4;
            /* allow 2 lines */
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .noti-card__time {
            font-size: 11px;
            color: var(--text3, #999);
        }
        .noti-card__delete {
            flex-shrink: 0;
            background: none;
            border: none;
            font-size: 12px;
            color: var(--text3, #aaa);
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 4px;
            opacity: 0;
            transition: opacity .15s;
        }
        .noti-card:hover .noti-card__delete { opacity: 1; }
        .noti-card__delete:hover { color: var(--red, #dc2626); background: #fee2e2; }

        /* ── Footer ── */
        .noti-footer { flex-shrink: 0; }
        .noti-load-more {
            width: 100%;
            padding: 10px;
            background: none;
            border: none;
            border-top: 1px solid var(--border, rgba(0,0,0,.1));
            font-size: 12px;
            color: var(--text3, #888);
            cursor: pointer;
        }
        .noti-load-more:hover { background: var(--surface2, #f3f3f3); }

        /* ── Badge ── */
        #noti-badge.hidden { display: none !important; }
    `;
    document.head.appendChild(s);
};

// ── Safe type config ──────────────────────────────────────────────────────────
// If getTypeConfig() throws or returns nothing, fall back gracefully.

const _safeTypeConfig = (type) => {
    try {
        const cfg = getTypeConfig(type);
        if (cfg && cfg.icon) return cfg;
    } catch {}
    // Fallback defaults by type prefix
    const defaults = {
        task:     { icon: '📋', color: '#3b82f6' },
        review:   { icon: '✏️',  color: '#f59e0b' },
        score:    { icon: '⭐',  color: '#10b981' },
        reminder: { icon: '⏰',  color: '#8b5cf6' },
    };
    const key = Object.keys(defaults).find(k => String(type ?? '').toLowerCase().includes(k));
    return defaults[key] ?? { icon: '🔔', color: '#6b7280' };
};

// ── Public init ───────────────────────────────────────────────────────────────

export const initNotifications = async () => {
    _injectStyles();

    const btn   = document.getElementById('noti-btn');
    const panel = document.getElementById('noti-panel');

    if (!btn || !panel) {
        console.warn('[notification_ui] #noti-btn or #noti-panel not found in DOM');
        return;
    }

    // ── Make sure the panel's parent doesn't clip it ──────────────────────────
    // The sidebar footer uses overflow:hidden in some themes — walk up and fix it.
    let el = panel.parentElement;
    while (el && el !== document.body) {
        const style = getComputedStyle(el);
        if (style.overflow === 'hidden' || style.overflowY === 'hidden') {
            el.style.overflow = 'visible';
        }
        el = el.parentElement;
    }

    await _loadPage(1);

    // ── Bell toggle ───────────────────────────────────────────────────────────
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        _open = !_open;
        panel.classList.toggle('hidden', !_open);
        btn.setAttribute('aria-expanded', String(_open));
    });

    // ── Close on outside click / Escape ───────────────────────────────────────
    document.addEventListener('click', (e) => {
        if (_open && !panel.contains(e.target) && e.target !== btn) {
            _closePanel();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') _closePanel();
    });

    // ── Real-time: new notification pushed via socket ─────────────────────────
    window.addEventListener('noti:new', (e) => {
        const noti = e.detail;
        if (!noti) return;
        _unreadCount++;
        _updateBadge();
        _prependCard(noti);
        try { showNotificationToast(noti); } catch {}
    });

    // ── Real-time: another tab marked one read ────────────────────────────────
    window.addEventListener('noti:markedRead', () => {
        if (_unreadCount > 0) { _unreadCount--; _updateBadge(); }
    });
};

const _closePanel = () => {
    if (!_open) return;
    _open = false;
    document.getElementById('noti-panel')?.classList.add('hidden');
    document.getElementById('noti-btn')?.setAttribute('aria-expanded', 'false');
};

// ── Load a page of notifications from the API ─────────────────────────────────

const _loadPage = async (page) => {
    try {
        const res  = await notificationAPI.getAll(page);
        if (!res) return;
        const data   = res.data ?? res;
        _page        = data.page        ?? 1;
        _totalPages  = data.totalPages  ?? 1;
        _unreadCount = data.unreadCount ?? 0;
        _updateBadge();
        _renderPanel(data.notifications ?? [], page === 1);
    } catch (err) {
        console.error('[notification_ui] _loadPage failed:', err.message);
    }
};

// ── Render panel contents ─────────────────────────────────────────────────────

const _renderPanel = (notifications, replace = true) => {
    const panel = document.getElementById('noti-panel');
    if (!panel) return;

    if (replace) {
        panel.innerHTML = `
            <div class="noti-header">
                <span class="noti-title">Notifications</span>
                <button class="noti-mark-all" id="noti-mark-all"
                        ${_unreadCount === 0 ? 'disabled' : ''}>
                    Mark all read
                </button>
            </div>
            <div id="noti-list" class="noti-list"></div>
            <div id="noti-footer" class="noti-footer"></div>`;
        document.getElementById('noti-mark-all')
            ?.addEventListener('click', _markAllRead);
    }

    const list = document.getElementById('noti-list');
    if (!list) return;

    if (replace && notifications.length === 0) {
        list.innerHTML = '<p class="noti-empty">You\'re all caught up!</p>';
        return;
    }

    notifications.forEach((n) => {
        if (!document.querySelector(`[data-noti-id="${n._id}"]`)) {
            list.insertAdjacentHTML('beforeend', _cardHTML(n));
        }
    });

    // Bind events on any newly added cards
    list.querySelectorAll('.noti-card:not([data-bound])').forEach(_bindCard);

    // Footer — "load more" button
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
    const cfg    = _safeTypeConfig(n.type);          // never throws
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

// ── Prepend a real-time card to the top of the list ──────────────────────────

const _prependCard = (noti) => {
    const list = document.getElementById('noti-list');
    if (!list) return;
    list.querySelector('.noti-empty')?.remove();
    list.insertAdjacentHTML('afterbegin', _cardHTML(noti));
    const card = list.querySelector(`[data-noti-id="${noti._id}"]`);
    if (card) _bindCard(card);
};

// ── Bind click + delete to a card element ────────────────────────────────────

const _bindCard = (card) => {
    card.dataset.bound = '1';
    card.addEventListener('click', () => _handleCardClick(card));
    card.querySelector('.noti-card__delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        _handleDelete(card);
    });
};

// ── Actions ───────────────────────────────────────────────────────────────────

const _handleCardClick = async (card) => {
    const id     = card.dataset.notiId;
    const isRead = card.dataset.read === 'true';

    if (!isRead) {
        try {
            await notificationAPI.markOneRead(id);
            card.classList.remove('noti-card--unread');
            card.dataset.read = 'true';
            if (_unreadCount > 0) { _unreadCount--; _updateBadge(); }
        } catch (err) {
            console.error('[notification_ui] markOneRead failed:', err.message);
        }
    }

    const ctaUrl = card.dataset.ctaUrl;
    if (ctaUrl) window.location.href = ctaUrl;
};

const _handleDelete = async (card) => {
    const id = card.dataset.notiId;
    try {
        await notificationAPI.delete(id);
        const wasUnread = card.dataset.read !== 'true';
        card.remove();
        if (wasUnread && _unreadCount > 0) { _unreadCount--; _updateBadge(); }

        // Show empty state if list is now empty
        const list = document.getElementById('noti-list');
        if (list && !list.querySelector('.noti-card')) {
            list.innerHTML = '<p class="noti-empty">You\'re all caught up!</p>';
        }
    } catch (err) {
        console.error('[notification_ui] delete failed:', err.message);
    }
};

const _markAllRead = async () => {
    try {
        await notificationAPI.markAllRead();
        document.querySelectorAll('.noti-card--unread').forEach((c) => {
            c.classList.remove('noti-card--unread');
            c.dataset.read = 'true';
        });
        _unreadCount = 0;
        _updateBadge();
        document.getElementById('noti-mark-all')?.setAttribute('disabled', '');
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