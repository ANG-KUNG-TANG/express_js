// /public/components/admin_sidebar.js
// THE single source of truth for the admin sidebar.
// Import and call initAdminSidebar() once per admin page.
//
// From pages/admin/*.js  → import from '../../../components/admin_sidebar.js'

import { getUser, logOut }          from '../js/core/auth.js';
import { apiFetch }                 from '../js/core/api.js';
import { initNotificationTopbar }   from './noti_topbar.js';

let _initialized = false;

export const initAdminSidebar = async () => {
    if (_initialized || document.querySelector('.admin-sidebar-root')) return;
    _initialized = true;

    const user = getUser();
    if (!user || user.role !== 'admin') {
        window.location.replace('/pages/auth/login.html');
        return;
    }

    const path = window.location.pathname;

    const navItems = [
        {
            section: 'Overview',
            items: [
                { icon: '⊞', label: 'Dashboard',    href: '/pages/admin/dashboard.html', match: '/admin/dashboard' },
            ]
        },
        {
            section: 'People',
            items: [
                { icon: '👥', label: 'Users',        href: '/pages/admin/users.html',      match: '/admin/users' },
            ]
        },
        {
            section: 'Content',
            items: [
                { icon: '✎',  label: 'Tasks',        href: '/pages/admin/tasks.html',       match: '/admin/tasks' },
                { icon: '⚑',  label: 'Moderation',   href: '/pages/admin/moderation.html',  match: '/admin/moderation', badge: 'mod' },
                { icon: '◈',  label: 'Review Queue', href: '/pages/admin/review.html',      match: '/admin/review', extraMatches: ['/admin/review_detail'] },
                { icon: '≡',  label: 'Audit Logs',   href: '/pages/admin/audit_logs.html',  match: '/admin/audit_logs' },
            ]
        },
        {
            section: 'Comms',
            items: [
                { icon: '🔔', label: 'Notifications', href: '/pages/admin/notifications.html', match: '/admin/notifications' },
            ]
        },
    ];

    // Active if path matches item.match OR any of item.extraMatches
    // (used for drill-down pages, e.g. review_detail stays under Review Queue)
    const isNavActive = (currentPath, item) =>
        currentPath.includes(item.match) ||
        (item.extraMatches ?? []).some(m => currentPath.includes(m));

    const renderNav = () => navItems.map(group => `
        <div class="asb-section-label">${group.section}</div>
        ${group.items.map(item => `
            <a class="asb-nav-item ${isNavActive(path, item) ? 'is-active' : ''}"
               href="${item.href}">
                <span class="asb-nav-icon">${item.icon}</span>
                <span class="asb-nav-label">${item.label}</span>
                ${item.badge ? `<span class="asb-nav-badge" id="asb-badge-${item.badge}" style="display:none">0</span>` : ''}
            </a>
        `).join('')}
    `).join('');

    const initials = (u) => {
        const name = u?.username || u?.name || u?.email || 'AD';
        return name.slice(0, 2).toUpperCase();
    };

    if (!document.querySelector('link[rel="icon"]')) {
        const link = document.createElement('link');
        link.rel  = 'icon'; link.type = 'image/svg+xml'; link.href = '/favicon.svg';
        document.head.appendChild(link);
    }

    const sidebar = document.createElement('aside');
    sidebar.className = 'admin-sidebar-root';
    sidebar.innerHTML = `
        <div class="asb-brand">
            <img src="/favicon.svg" alt="WriteSystem" width="36" height="36" style="border-radius:8px;flex-shrink:0;">
            <div class="asb-brand-text">
                <div class="asb-brand-name">WriteSystem</div>
                <div class="asb-brand-badge">Admin Panel</div>
            </div>
        </div>

        <nav class="asb-nav">
            ${renderNav()}
        </nav>

        <div class="asb-footer">
            <div class="asb-user-info">
                <div class="asb-avatar" id="asb-avatar">${initials(user)}</div>
                <div class="asb-user-text">
                    <div class="asb-user-name"  id="asb-name">${user?.username || user?.name || 'Admin'}</div>
                    <div class="asb-user-email" id="asb-email">${user?.email || ''}</div>
                </div>
            </div>
            <button class="asb-logout-btn" id="asb-logout">Sign out</button>
        </div>
    `;

    document.body.insertBefore(sidebar, document.body.firstChild);
    document.body.classList.add('has-admin-sidebar');

    document.getElementById('asb-logout').addEventListener('click', logOut);

    // Live flag count badge
    try {
        const res   = await apiFetch('/api/admin/flags?status=open&limit=1');
        const count = res?.total ?? res?.data?.total ?? 0;
        const badge = document.getElementById('asb-badge-mod');
        if (badge && count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-flex';
        }
    } catch { /* badge is optional */ }

    // ── Fixed top-right notification bell ─────────────────────────────────────
    await initNotificationTopbar();
};