/**
 * navbar.js — injects the top navigation bar, fully role-aware.
 *
 * FIXED: removed the duplicate inline notification system that was conflicting
 * with notification_ui.js. The bell HTML is still injected here, but all
 * notification logic (fetch, mark read, panel, badge) is handled by
 * initNotifications() from notification_ui.js.
 *
 * Call order on every page:
 *   1. initNavbar()        ← injects HTML including bell placeholder
 *   2. initNotifications() ← wires up bell, panel, socket listener
 *   3. initSocket()        ← connects socket (dispatches 'noti:new' events)
 *
 * Roles:
 *   Student  → Dashboard, My Tasks, Vocabulary, News
 *   Teacher  → Dashboard, My Students, News
 *   Admin    → Dashboard, Admin Panel, Users, Tasks
 */

import { getUser, isAdmin} from '../js/core/auth.js';
import { initNotifications }        from './notification/notification.ui.js';

export const initNavbar = async () => {
    const user = getUser();
    if (!user) return;

    const initial  = user.name?.[0]?.toUpperCase() || 'U';
    const role     = user.role ?? user._role ?? 'student';
    const isTeacher = role === 'teacher';
    const isAdminU  = isAdmin();
    const roleTxt   = isAdminU ? 'Admin' : isTeacher ? 'Teacher' : 'Student';

    // ── Role-aware nav tabs ───────────────────────────────────────────────────
    const studentTabs = `
        <a href="/pages/dashboard.html"    class="topnav-tab" data-path="/pages/dashboard">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
        </a>
        <a href="/pages/tasks/list.html"   class="topnav-tab" data-path="/pages/tasks">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            My Tasks
        </a>
        <a href="/pages/vocab/browse.html" class="topnav-tab" data-path="/pages/vocab">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Vocabulary
        </a>
        <a href="/pages/news/feed.html"    class="topnav-tab" data-path="/pages/news">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>
            News
        </a>`;

    const teacherTabs = `
        <a href="/pages/dashboard.html"         class="topnav-tab" data-path="/pages/dashboard">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
        </a>
        <a href="/pages/teacher/dashboard.html" class="topnav-tab" data-path="/pages/teacher">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            My Students
        </a>
        <a href="/pages/teacher/assign.html"    class="topnav-tab" data-path="/pages/teacher/assign">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            Assign Task
        </a>
        <a href="/pages/news/feed.html"         class="topnav-tab" data-path="/pages/news">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>
            News
        </a>`;

    const adminTabs = `
        <a href="/pages/dashboard.html"       class="topnav-tab" data-path="/pages/dashboard">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
        </a>
        <a href="/pages/admin/dashboard.html" class="topnav-tab" data-path="/pages/admin">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>
            Admin Panel
        </a>
        <a href="/pages/admin/users.html"     class="topnav-tab" data-path="/pages/admin/users">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Users
        </a>
        <a href="/pages/admin/tasks.html"     class="topnav-tab" data-path="/pages/admin/tasks">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Tasks
        </a>`;

    const tabs = isAdminU ? adminTabs : isTeacher ? teacherTabs : studentTabs;

    // ── Profile dropdown ──────────────────────────────────────────────────────
    const roleMenuItems = isAdminU ? `
        <li><a href="/pages/admin/dashboard.html" class="profile-menu-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            Admin Panel
        </a></li>
        <li><a href="/pages/admin/users.html" class="profile-menu-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Manage Users
        </a></li>` : isTeacher ? `
        <li><a href="/pages/teacher/dashboard.html" class="profile-menu-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Teacher Panel
        </a></li>
        <li><a href="/pages/teacher/assign.html" class="profile-menu-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            Assign Task
        </a></li>` : `
        <li><a href="/pages/tasks/list.html" class="profile-menu-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            My Tasks
        </a></li>`;

    // ── Build and inject HTML ─────────────────────────────────────────────────
    const navEl = document.createElement('nav');
    navEl.className = 'topnav';
    navEl.setAttribute('role', 'navigation');
    navEl.innerHTML = `
        <div class="topnav-left">
            <a href="/pages/dashboard.html" class="topnav-brand">
                <span class="brand-mark">W</span>
                WritingSystem
            </a>
            <div class="topnav-tabs">${tabs}</div>
        </div>

        <div class="topnav-right">
            <!-- Bell — wired by initNotifications() below -->
            <div id="notiWrapper" style="position:relative;">
                <button id="noti-btn" class="noti-bell" aria-label="Notifications" aria-expanded="false">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    <span id="noti-badge" class="noti-badge hidden" aria-live="polite">0</span>
                </button>
                <div id="noti-panel" class="noti-panel hidden" role="dialog" aria-label="Notifications panel"></div>
            </div>

            <!-- Profile dropdown -->
            <div class="topnav-user" id="profileTrigger" tabindex="0" role="button" aria-haspopup="true" aria-expanded="false">
                <div class="user-avatar">${initial}</div>
                <div class="user-info">
                    <span class="user-name">${_esc(user.name || 'User')}</span>
                    <span class="user-role">${roleTxt}</span>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>

            <div class="profile-menu hidden" id="profileMenu" role="menu">
                <div class="profile-menu-header">
                    <div class="pm-avatar">${initial}</div>
                    <div>
                        <p class="pm-name">${_esc(user.name || 'User')}</p>
                        <p class="pm-email">${_esc(user.email || '')}</p>
                        <span class="pm-role-badge">${roleTxt}</span>
                    </div>
                </div>
                <ul class="profile-menu-list" role="none">
                    <li><a href="/pages/profile.html" class="profile-menu-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        My Profile
                    </a></li>
                    ${roleMenuItems}
                    <li class="profile-menu-divider"></li>
                    <li><button class="profile-menu-item profile-menu-item--danger" id="logoutBtn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                    </button></li>
                </ul>
            </div>
        </div>`;

    // Prepend to body (before page content)
    document.body.prepend(navEl);
    document.body.style.paddingTop = '56px';

    // ── Active tab highlight ──────────────────────────────────────────────────
    const path = window.location.pathname;
    navEl.querySelectorAll('.topnav-tab').forEach((tab) => {
        if (path.startsWith(tab.dataset.path ?? '___')) {
            tab.classList.add('active');
        }
    });

    // ── Profile dropdown toggle ───────────────────────────────────────────────
    const trigger = document.getElementById('profileTrigger');
    const menu    = document.getElementById('profileMenu');

    trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !menu.classList.contains('hidden');
        menu.classList.toggle('hidden', isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', () => {
        menu?.classList.add('hidden');
        trigger?.setAttribute('aria-expanded', 'false');
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        const { logOut } = await import('../js/core/auth.js');
        logOut();
    });

    // ── Wire up notifications ─────────────────────────────────────────────────
    // initNotifications() handles bell click, panel render, badge, socket events.
    // This replaces the old inline notification system that was duplicated here.
    await initNotifications();
};

const _esc = (str) => {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
};