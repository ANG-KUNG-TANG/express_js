/**
 * navbar.js — injects the WorkFlow-themed top navigation bar.
 * Usage: import { initNavbar } from '../components/navbar.js';
 *        initNavbar();
 */

import { getUser, isAdmin, logOut } from '../js/core/auth.js';

export const initNavbar = () => {
    const user = getUser();
    if (!user) return;

    const initial = user.name?.[0]?.toUpperCase() || 'U';
    const roleTxt = isAdmin() ? 'Admin' : 'Student';

    const nav = document.createElement('header');
    nav.className = 'topnav';
    nav.innerHTML = `
        <!-- Brand -->
        <div class="topnav-left">
            <a href="/pages/dashboard.html" class="topnav-brand">
                <span class="brand-mark">I</span>
                <span class="brand-name">IELTS Platform</span>
            </a>

            <!-- Nav tabs -->
            <nav class="topnav-tabs">
                <a href="/pages/dashboard.html"   class="topnav-tab" data-path="/pages/dashboard">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    Dashboard
                </a>
                <a href="/pages/tasks/list.html" class="topnav-tab" data-path="/pages/tasks">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    My Tasks
                </a>
                <a href="/pages/vocab/browse.html" class="topnav-tab" data-path="/pages/vocab">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    Vocabulary
                </a>
                <a href="/pages/news/feed.html" class="topnav-tab" data-path="/pages/news">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>
                    News
                </a>
                ${isAdmin() ? `
                <a href="/pages/admin/dashboard.html" class="topnav-tab" data-path="/pages/admin">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>
                    Admin
                </a>` : ''}
            </nav>
        </div>

        <!-- Right: notifications + user chip + logout -->
        <div class="topnav-right">
            <!-- Notification bell -->
            <div class="noti-wrapper" id="notiWrapper" style="position:relative">
                <button class="noti-bell" id="notiBell" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <span class="noti-badge" id="notiBadge" style="display:none"></span>
                </button>
            </div>

            <!-- Profile trigger button -->
            <div class="topnav-user" id="profile-trigger" role="button" aria-haspopup="true" aria-expanded="false" tabindex="0" title="View profile">
                <div class="user-avatar" id="nav-avatar">${initial}</div>
                <div class="user-info">
                    <span class="user-name" id="nav-name">${user.name || 'User'}</span>
                    <span class="user-role" id="nav-role">${roleTxt}</span>
                </div>
                <svg class="profile-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </div>

            <!-- Profile dropdown panel -->
            <div class="profile-dropdown" id="profile-dropdown" role="menu" aria-hidden="true">
                <!-- Header band -->
                <div class="profile-dropdown-header">
                    <div class="profile-dropdown-avatar">${initial}</div>
                    <div class="profile-dropdown-identity">
                        <span class="profile-dropdown-name">${user.name || 'User'}</span>
                        <span class="profile-dropdown-email">${user.email || ''}</span>
                        <span class="profile-dropdown-badge ${isAdmin() ? 'badge-admin' : 'badge-student'}">${roleTxt}</span>
                    </div>
                </div>

                <!-- Stats row -->
                <div class="profile-dropdown-stats">
                    <div class="profile-stat">
                        <span class="profile-stat-value" id="stat-tasks">—</span>
                        <span class="profile-stat-label">Tasks</span>
                    </div>
                    <div class="profile-stat-divider"></div>
                    <div class="profile-stat">
                        <span class="profile-stat-value" id="stat-vocab">—</span>
                        <span class="profile-stat-label">Words</span>
                    </div>
                    <div class="profile-stat-divider"></div>
                    <div class="profile-stat">
                        <span class="profile-stat-value" id="stat-streak">—</span>
                        <span class="profile-stat-label">Streak</span>
                    </div>
                </div>

                <!-- Menu items -->
                <ul class="profile-dropdown-menu" role="none">
                    <li role="none">
                        <a href="/pages/auth/profile.html" class="profile-menu-item" role="menuitem">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            My Profile
                        </a>
                    </li>
                    <li role="none">
                        <a href="/pages/settings.html" class="profile-menu-item" role="menuitem">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>
                            Settings
                        </a>
                    </li>
                    <li role="none">
                        <a href="/pages/progress.html" class="profile-menu-item" role="menuitem">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                            My Progress
                        </a>
                    </li>
                    ${isAdmin() ? `
                    <li role="none">
                        <a href="/pages/admin/dashboard.html" class="profile-menu-item" role="menuitem">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                            Admin Panel
                        </a>
                    </li>` : ''}
                </ul>

                <div class="profile-dropdown-footer">
                    <button id="logout-btn" class="profile-logout-btn" role="menuitem">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sign out
                    </button>
                </div>
            </div>
        </div>

        <!-- Backdrop for closing dropdown -->
        <div class="profile-backdrop" id="profile-backdrop"></div>
    `;

    document.body.prepend(nav);

    // Inject required styles if not already present
    if (!document.getElementById('topnav-profile-styles')) {
        const style = document.createElement('style');
        style.id = 'topnav-profile-styles';
        style.textContent = `
            .topnav-user {
                cursor: pointer;
                user-select: none;
                position: relative;
            }
            .topnav-user:hover .user-avatar {
                filter: brightness(1.12);
            }
            .profile-chevron {
                margin-left: 2px;
                opacity: 0.55;
                transition: transform 0.2s ease, opacity 0.2s;
                flex-shrink: 0;
            }
            .topnav-user[aria-expanded="true"] .profile-chevron {
                transform: rotate(180deg);
                opacity: 0.9;
            }
            .profile-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                right: 12px;
                width: 280px;
                background: #fff;
                border: 1px solid rgba(0,0,0,0.09);
                border-radius: 14px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06);
                z-index: 999;
                overflow: hidden;
                opacity: 0;
                transform: translateY(-6px) scale(0.98);
                pointer-events: none;
                transition: opacity 0.18s ease, transform 0.18s ease;
                transform-origin: top right;
            }
            .profile-dropdown.open {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: all;
            }
            .profile-dropdown-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 18px 18px 14px;
                background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
                border-bottom: 1px solid rgba(0,0,0,0.06);
            }
            .profile-dropdown-avatar {
                width: 46px;
                height: 46px;
                border-radius: 50%;
                background: linear-gradient(135deg, #4f6ef7, #8b5cf6);
                color: #fff;
                font-size: 18px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 2px 8px rgba(79,110,247,0.35);
                letter-spacing: -0.5px;
            }
            .profile-dropdown-identity {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
            }
            .profile-dropdown-name {
                font-size: 14px;
                font-weight: 700;
                color: #1a1a2e;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .profile-dropdown-email {
                font-size: 11.5px;
                color: #666;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .profile-dropdown-badge {
                display: inline-block;
                font-size: 10px;
                font-weight: 600;
                padding: 1px 7px;
                border-radius: 20px;
                letter-spacing: 0.4px;
                width: fit-content;
                margin-top: 2px;
            }
            .badge-admin { background: #fef3cd; color: #92600a; border: 1px solid #f5d78e; }
            .badge-student { background: #e0eaff; color: #3451c7; border: 1px solid #c7d7f9; }
            .profile-dropdown-stats {
                display: flex;
                align-items: center;
                padding: 12px 18px;
                border-bottom: 1px solid rgba(0,0,0,0.06);
            }
            .profile-stat {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1px;
            }
            .profile-stat-value {
                font-size: 16px;
                font-weight: 700;
                color: #1a1a2e;
                line-height: 1;
            }
            .profile-stat-label {
                font-size: 10.5px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .profile-stat-divider {
                width: 1px;
                height: 28px;
                background: rgba(0,0,0,0.08);
            }
            .profile-dropdown-menu {
                list-style: none;
                margin: 0;
                padding: 6px 0;
            }
            .profile-menu-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 9px 18px;
                font-size: 13px;
                color: #333;
                text-decoration: none;
                transition: background 0.12s, color 0.12s;
            }
            .profile-menu-item:hover {
                background: #f0f4ff;
                color: #4f6ef7;
            }
            .profile-menu-item svg { opacity: 0.6; flex-shrink: 0; transition: opacity 0.12s; }
            .profile-menu-item:hover svg { opacity: 1; }
            .profile-dropdown-footer {
                padding: 6px 8px 8px;
                border-top: 1px solid rgba(0,0,0,0.06);
            }
            .profile-logout-btn {
                width: 100%;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 9px 10px;
                font-size: 13px;
                color: #d0321e;
                background: none;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.12s;
                text-align: left;
            }
            .profile-logout-btn:hover { background: #fff0ee; }
            .profile-logout-btn svg { opacity: 0.75; }
            .profile-backdrop {
                display: none;
                position: fixed;
                inset: 0;
                z-index: 998;
            }
            .profile-backdrop.open { display: block; }
        `;
        document.head.appendChild(style);
    }

    // Highlight active tab
    const path = window.location.pathname;
    nav.querySelectorAll('.topnav-tab').forEach(tab => {
        const tabPath = tab.dataset.path;
        if (tabPath && path.startsWith(tabPath)) {
            tab.classList.add('active');
        }
    });

    // ── Profile dropdown logic ──
    const trigger  = document.getElementById('profile-trigger');
    const dropdown = document.getElementById('profile-dropdown');
    const backdrop = document.getElementById('profile-backdrop');

    const openProfile  = () => {
        dropdown.classList.add('open');
        backdrop.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        dropdown.setAttribute('aria-hidden', 'false');
    };
    const closeProfile = () => {
        dropdown.classList.remove('open');
        backdrop.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        dropdown.setAttribute('aria-hidden', 'true');
    };
    const toggleProfile = () => dropdown.classList.contains('open') ? closeProfile() : openProfile();

    trigger.addEventListener('click', toggleProfile);
    trigger.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleProfile(); }
        if (e.key === 'Escape') closeProfile();
    });
    backdrop.addEventListener('click', closeProfile);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProfile(); });

    // Populate stats from user.stats if available
    if (user.stats) {
        const sv = v => v != null ? v : '—';
        const taskEl   = document.getElementById('stat-tasks');
        const vocabEl  = document.getElementById('stat-vocab');
        const streakEl = document.getElementById('stat-streak');
        if (taskEl)   taskEl.textContent   = sv(user.stats.tasks);
        if (vocabEl)  vocabEl.textContent  = sv(user.stats.vocab);
        if (streakEl) streakEl.textContent = user.stats.streak != null ? `${user.stats.streak}d` : '—';
    }

    document.getElementById('logout-btn').addEventListener('click', () => {
        closeProfile();
        logOut();
    });

    // ── Notification bell ────────────────────────────────────────────────────
    _initNotificationBell();
};

// ── Notification system (self-contained, no extra imports needed) ─────────────
function _initNotificationBell() {
    const TYPE_ICONS = {
        test_result:      '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v6a1 1 0 102 0V8z" clip-rule="evenodd"/></svg>',
        exam_reminder:    '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
        score_available:  '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
        practice_ready:   '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>',
        password_changed: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>',
        account_alert:    '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
    };
    const TYPE_COLORS = {
        test_result: '#eff6ff:#2563eb', exam_reminder: '#fff7ed:#ea580c',
        score_available: '#f0fdf4:#16a34a', practice_ready: '#fdf4ff:#9333ea',
        password_changed: '#f0f9ff:#0284c7', account_alert: '#fff1f2:#e11d48',
    };
    const timeAgo = (d) => {
        const m = Math.floor((Date.now() - new Date(d)) / 60000);
        if (m < 1) return 'Just now'; if (m < 60) return m + 'm ago';
        const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
        const dy = Math.floor(h / 24); if (dy < 7) return dy + 'd ago';
        return new Date(d).toLocaleDateString();
    };

    let notis = [], unread = 0, open = false;

    const bell   = document.getElementById('notiBell');
    const badge  = document.getElementById('notiBadge');
    if (!bell) return;

    const updateBadge = () => {
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.style.display = unread > 0 ? '' : 'none';
    };

    // ── Inject bell + panel styles once ──
    if (!document.getElementById('noti-styles')) {
        const s = document.createElement('style');
        s.id = 'noti-styles';
        s.textContent = `
            .noti-bell{position:relative;display:inline-flex;align-items:center;justify-content:center;
                width:34px;height:34px;border:none;background:transparent;border-radius:9px;cursor:pointer;
                color:#64748b;transition:background .14s,color .14s;vertical-align:middle;}
            .noti-bell:hover{background:#f1f5f9;color:#4f6ef7;}
            .noti-badge{position:absolute;top:3px;right:3px;min-width:16px;height:16px;padding:0 4px;
                background:#e11d48;color:#fff;font-size:10px;font-weight:700;border-radius:99px;
                display:flex;align-items:center;justify-content:center;
                border:2px solid var(--surface-nav,#fff);line-height:1;pointer-events:none;}
            .noti-panel{position:absolute;top:calc(100% + 10px);right:0;width:340px;max-height:480px;
                background:#fff;border-radius:14px;
                box-shadow:0 4px 6px -1px rgb(0 0 0/.07),0 20px 40px -8px rgb(0 0 0/.16);
                border:1px solid #f1f5f9;display:flex;flex-direction:column;overflow:hidden;z-index:1000;
                transform-origin:top right;animation:notiIn .2s cubic-bezier(.16,1,.3,1) both;}
            @keyframes notiIn{from{opacity:0;transform:scale(.95) translateY(-8px)}to{opacity:1;transform:scale(1) translateY(0)}}
            .noti-panel.noti-closing{animation:notiOut .14s ease-in forwards;}
            @keyframes notiOut{to{opacity:0;transform:scale(.95) translateY(-8px)}}
            .noti-panel-head{display:flex;align-items:center;justify-content:space-between;
                padding:14px 16px 10px;border-bottom:1px solid #f1f5f9;flex-shrink:0;}
            .noti-panel-title{font-size:13.5px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:7px;}
            .noti-chip{font-size:10.5px;font-weight:700;background:#eff2ff;color:#4f6ef7;
                padding:1px 7px;border-radius:99px;}
            .noti-markall{font-size:11.5px;color:#4f6ef7;background:none;border:none;cursor:pointer;
                font-weight:500;padding:3px 7px;border-radius:6px;transition:background .13s;}
            .noti-markall:hover{background:#eff2ff;} .noti-markall:disabled{opacity:.4;cursor:default;}
            .noti-list{overflow-y:auto;flex:1;padding:5px 0;scrollbar-width:thin;scrollbar-color:#e2e8f0 transparent;}
            .noti-list::-webkit-scrollbar{width:4px;}
            .noti-list::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:99px;}
            .noti-item{display:flex;gap:11px;padding:11px 16px;cursor:pointer;transition:background .11s;position:relative;}
            .noti-item:hover{background:#f8fafc;}
            .noti-item.unread{background:#fafbff;}
            .noti-item.unread::before{content:'';position:absolute;left:5px;top:50%;transform:translateY(-50%);
                width:5px;height:5px;background:#4f6ef7;border-radius:50%;}
            .noti-ico{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;
                justify-content:center;flex-shrink:0;}
            .noti-ico svg{width:16px;height:16px;}
            .noti-body{flex:1;min-width:0;}
            .noti-t{font-size:12.5px;font-weight:600;color:#0f172a;margin:0 0 2px;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
            .noti-m{font-size:11.5px;color:#64748b;margin:0;line-height:1.4;
                display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
            .noti-time{font-size:10.5px;color:#94a3b8;margin-top:3px;display:block;}
            .noti-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;
                gap:9px;padding:36px 20px;color:#94a3b8;font-size:13px;}
            .noti-empty svg{width:36px;height:36px;opacity:.35;}
            .noti-loading-ring{width:26px;height:26px;border:2.5px solid #e2e8f0;
                border-top-color:#4f6ef7;border-radius:50%;animation:notiSpin .7s linear infinite;}
            @keyframes notiSpin{to{transform:rotate(360deg)}}
            .noti-footer{border-top:1px solid #f1f5f9;padding:9px 16px;flex-shrink:0;}
            .noti-see-all{display:block;text-align:center;font-size:12px;font-weight:600;
                color:#4f6ef7;text-decoration:none;padding:7px;border-radius:7px;transition:background .13s;}
            .noti-see-all:hover{background:#eff2ff;}
            @media(max-width:400px){.noti-panel{width:calc(100vw - 20px);right:-4px;}}
        `;
        document.head.appendChild(s);
    }

    // ── Build panel ──
    const buildPanel = () => {
        const p = document.createElement('div');
        p.className = 'noti-panel'; p.id = 'notiPanel';
        p.innerHTML = `
            <div class="noti-panel-head">
                <span class="noti-panel-title">Notifications <span class="noti-chip" id="notiChip"></span></span>
                <button class="noti-markall" id="notiMarkAll">Mark all read</button>
            </div>
            <div class="noti-list" id="notiList"></div>
            <div class="noti-footer"><a class="noti-see-all" href="#">See all</a></div>
        `;
        return p;
    };

    const iconFor = (type) => {
        const [bg, color] = (TYPE_COLORS[type] || '#f1f5f9:#64748b').split(':');
        return `<div class="noti-ico" style="background:${bg};color:${color}">${TYPE_ICONS[type] || TYPE_ICONS.account_alert}</div>`;
    };

    const renderList = () => {
        const list = document.getElementById('notiList');
        const chip = document.getElementById('notiChip');
        const ma   = document.getElementById('notiMarkAll');
        if (!list) return;
        if (chip) chip.textContent = unread > 0 ? unread : '';
        if (ma)   ma.disabled = unread === 0;
        if (notis.length === 0) {
            list.innerHTML = `<div class="noti-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
                </svg>You're all caught up!</div>`;
            return;
        }
        list.innerHTML = notis.map(n => `
            <div class="noti-item ${n.isRead ? '' : 'unread'}" data-id="${n.id}">
                ${iconFor(n.type)}
                <div class="noti-body">
                    <p class="noti-t">${n.title}</p>
                    <p class="noti-m">${n.message}</p>
                    <span class="noti-time">${timeAgo(n.createdAt)}</span>
                </div>
            </div>`).join('');
        list.querySelectorAll('.noti-item').forEach(el =>
            el.addEventListener('click', () => markOne(el.dataset.id))
        );
    };

    // ── API helpers ──
    const apiBase = window.__API_BASE__ || '/api';
    const authHeader = () => {
        const t = localStorage.getItem('token') || sessionStorage.getItem('token');
        return t ? { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    };

    const fetchNotis = async () => {
        const list = document.getElementById('notiList');
        if (list) list.innerHTML = '<div class="noti-empty"><div class="noti-loading-ring"></div></div>';
        try {
            const r = await fetch(apiBase + '/notifications?page=1&limit=15', { headers: authHeader() });
            if (!r.ok) return;
            const json = await r.json();
            const d = json.data ?? json;
            notis  = d.notifications || [];
            unread = d.unreadCount   || 0;
            updateBadge();
            renderList();
        } catch { /* silent */ }
    };

    const markOne = async (id) => {
        const n = notis.find(x => x.id === id);
        if (!n || n.isRead) return;
        try {
            await fetch(apiBase + '/notifications/' + id + '/read', { method: 'PATCH', headers: authHeader() });
            n.isRead = true; unread = Math.max(0, unread - 1);
            updateBadge(); renderList();
        } catch { /* silent */ }
    };

    const markAll = async () => {
        try {
            await fetch(apiBase + '/notifications/read', {
                method: 'PATCH', headers: authHeader(),
                body: JSON.stringify({ ids: 'all' })
            });
            notis.forEach(n => n.isRead = true); unread = 0;
            updateBadge(); renderList();
        } catch { /* silent */ }
    };

    const fetchCount = async () => {
        try {
            const r = await fetch(apiBase + '/notifications?page=1&limit=1', { headers: authHeader() });
            if (!r.ok) return;
            const json = await r.json();
            unread = (json.data ?? json).unreadCount || 0;
            updateBadge();
        } catch { /* silent */ }
    };

    // ── Open / close ──
    const closePanel = () => {
        const p = document.getElementById('notiPanel');
        if (!p) return;
        p.classList.add('noti-closing');
        p.addEventListener('animationend', () => p.remove(), { once: true });
        open = false;
        bell.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', outsideClick);
        document.removeEventListener('keydown', escKey);
    };
    const openPanel = () => {
        const wrapper = document.getElementById('notiWrapper');
        if (!wrapper) return;
        const panel = buildPanel();
        wrapper.appendChild(panel);
        fetchNotis();
        open = true;
        bell.setAttribute('aria-expanded', 'true');
        document.getElementById('notiMarkAll')?.addEventListener('click', markAll);
        setTimeout(() => {
            document.addEventListener('click', outsideClick);
            document.addEventListener('keydown', escKey);
        }, 0);
    };
    const outsideClick = (e) => {
        if (!document.getElementById('notiWrapper')?.contains(e.target)) closePanel();
    };
    const escKey = (e) => { if (e.key === 'Escape') closePanel(); };

    bell.addEventListener('click', (e) => {
        e.stopPropagation();
        open ? closePanel() : openPanel();
    });

    // Initial count + poll every 60s
    fetchCount();
    setInterval(() => { if (!document.hidden) fetchCount(); }, 60000);
}