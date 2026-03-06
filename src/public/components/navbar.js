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

        <!-- Right: user chip + logout -->
        <div class="topnav-right">
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
};