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
            <div class="topnav-user">
                <div class="user-avatar" id="nav-avatar">${initial}</div>
                <div class="user-info">
                    <span class="user-name" id="nav-name">${user.name || 'User'}</span>
                    <span class="user-role" id="nav-role">${roleTxt}</span>
                </div>
            </div>
            <button id="logout-btn" class="btn-icon" title="Sign out">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
            </button>
        </div>
    `;

    document.body.prepend(nav);

    // Highlight active tab
    const path = window.location.pathname;
    nav.querySelectorAll('.topnav-tab').forEach(tab => {
        const tabPath = tab.dataset.path;
        if (tabPath && path.startsWith(tabPath)) {
            tab.classList.add('active');
        }
    });

    document.getElementById('logout-btn').addEventListener('click', logOut);
};