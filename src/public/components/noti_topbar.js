/**
 * notification.topbar.js
 *
 * Injects a fixed top-right notification bell that works on EVERY admin and
 * teacher page. Import and call initNotificationTopbar() once — it is
 * idempotent (safe to call multiple times).
 *
 * Usage (add to admin_sidebar.js AND teacher_sidebar.js, replacing the
 * inline bell markup + initNotifications() call in each):
 *
 *   import { initNotificationTopbar } from './notification.topbar.js';
 *   await initNotificationTopbar();
 *
 * The component:
 *  - Injects #noti-topbar-btn and #noti-topbar-panel into <body>
 *  - Calls initNotifications() which targets those two IDs
 *  - Is completely self-contained — no CSS file needed
 */

import { initNotifications } from './notification/notification.ui.js';

let _injected = false;

export const initNotificationTopbar = async () => {
    if (_injected || document.getElementById('noti-topbar-btn')) return;
    _injected = true;

    _injectStyles();
    _injectDOM();

    // notification_ui.js looks for #noti-btn and #noti-panel — we alias them
    // via IDs so the existing module works without any changes.
    await initNotifications();
};

// ── DOM injection ─────────────────────────────────────────────────────────────

const _injectDOM = () => {
    const wrapper = document.createElement('div');
    wrapper.id = 'noti-topbar-root';
    wrapper.innerHTML = `
        <button
            id="noti-btn"
            class="ntb-bell"
            aria-label="Notifications"
            aria-expanded="false"
            title="Notifications"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round"
                 stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span id="noti-badge" class="ntb-badge hidden" aria-live="polite">0</span>
        </button>

        <div
            id="noti-panel"
            class="noti-panel hidden"
            role="dialog"
            aria-label="Notifications panel"
        ></div>
    `;
    document.body.appendChild(wrapper);
};

// ── Styles ────────────────────────────────────────────────────────────────────

const _injectStyles = () => {
    if (document.getElementById('noti-topbar-styles')) return;
    const s = document.createElement('style');
    s.id = 'noti-topbar-styles';
    s.textContent = `
        /* ── Wrapper: fixed top-right ── */
        #noti-topbar-root {
            position: fixed;
            top: 14px;
            right: 20px;
            z-index: 10000;
            display: flex;
            align-items: center;
        }

        /* ── Bell button ── */
        .ntb-bell {
            position: relative;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: 1px solid var(--border, rgba(0,0,0,.14));
            background: var(--surface1, #ffffff);
            color: var(--text1, #111);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background .15s, box-shadow .15s;
            box-shadow: 0 2px 8px rgba(0,0,0,.10);
        }
        .ntb-bell:hover {
            background: var(--surface2, #f3f3f3);
            box-shadow: 0 4px 14px rgba(0,0,0,.14);
        }
        .ntb-bell:focus-visible {
            outline: 2px solid var(--primary, #5b6ef5);
            outline-offset: 2px;
        }

        /* ── Badge ── */
        .ntb-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            min-width: 17px;
            height: 17px;
            padding: 0 4px;
            border-radius: 10px;
            background: #ef4444;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            line-height: 17px;
            text-align: center;
            pointer-events: none;
            border: 2px solid var(--surface1, #fff);
        }
        .ntb-badge.hidden { display: none !important; }

        /* ── Panel: drops DOWN from the bell ── */
        #noti-panel {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            width: 340px;
            max-height: 480px;
            /* overflow handled by notification_ui.js inner .noti-list */
        }

        /* Ensure the panel is positioned relative to the wrapper */
        #noti-topbar-root {
            position: fixed;
        }
    `;
    document.head.appendChild(s);
};