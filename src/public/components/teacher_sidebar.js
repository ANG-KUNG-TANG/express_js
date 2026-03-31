// /public/components/teacher_sidebar.js
// THE single source of truth for the teacher sidebar.
// Import and call initTeacherSidebar() once per teacher page.

import { getUser, logOut }         from '../js/core/auth.js';
import { apiFetch }                from '../js/core/api.js';
import { initSocket }              from '../js/core/socket.js';
import { initNotificationTopbar }  from './noti_topbar.js';

let _initialized = false;

export const initTeacherSidebar = async () => {
    if (_initialized || document.querySelector('.teacher-sidebar-root')) return;
    _initialized = true;

    const user = getUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
        window.location.replace('/pages/auth/login.html');
        return;
    }

    const path = window.location.pathname;

    // ── Nav structure ─────────────────────────────────────────────────────────
    const navItems = [
        {
            section: 'Overview',
            items: [
                { icon: '⊞', label: 'Dashboard',    href: '/pages/teacher/dashboard.html',          match: '/teacher/dashboard' },
            ]
        },
        {
            section: 'Students',
            items: [
                { icon: '👥', label: 'My Students',  href: '/pages/teacher/dashboard.html#students', match: '/teacher/student' },
                { icon: '✎',  label: 'Assign Task',  href: '/pages/teacher/assign.html',             match: '/teacher/assign'   },
            ]
        },
        {
            section: 'Review',
            items: [
                { icon: '◈',  label: 'Review Queue', href: '/pages/teacher/review.html',             match: '/teacher/review', badge: 'queue' },
            ]
        },
    ];

    const renderNav = () => navItems.map(group => `
        <div class="asb-section-label">${group.section}</div>
        ${group.items.map(item => `
            <a class="asb-nav-item ${path.includes(item.match) ? 'is-active' : ''}"
               href="${item.href}">
                <span class="asb-nav-icon">${item.icon}</span>
                <span class="asb-nav-label">${item.label}</span>
                ${item.badge
                    ? `<span class="asb-nav-badge" id="tsb-badge-${item.badge}" style="display:none">0</span>`
                    : ''}
            </a>
        `).join('')}
    `).join('');

    const initials = (u) => {
        const name = u?.username || u?.name || u?.email || 'TC';
        return name.slice(0, 2).toUpperCase();
    };

    // ── Sidebar HTML (bell removed — now a fixed topbar via initNotificationTopbar) ──
    const sidebar = document.createElement('aside');
    sidebar.className = 'teacher-sidebar-root admin-sidebar-root';
    sidebar.innerHTML = `
        <div class="asb-brand">
            <div class="asb-brand-icon" style="background:linear-gradient(135deg,#3a7d5a,#c8a84b)">W</div>
            <div class="asb-brand-text">
                <div class="asb-brand-name">WriteSystem</div>
                <div class="asb-brand-badge" style="color:var(--sage,#3a7d5a)">Teacher Panel</div>
            </div>
        </div>

        <nav class="asb-nav">
            ${renderNav()}
        </nav>

        <div class="asb-footer">
            <div class="asb-user-info">
                <div class="asb-avatar"
                     style="background:linear-gradient(135deg,#3a7d5a,#c8a84b)"
                     id="tsb-avatar">${initials(user)}</div>
                <div class="asb-user-text">
                    <div class="asb-user-name"  id="tsb-name">${user?.username || user?.name || 'Teacher'}</div>
                    <div class="asb-user-email" id="tsb-email">${user?.email || ''}</div>
                </div>
            </div>
            <button class="asb-logout-btn" id="tsb-logout">Sign out</button>
        </div>
    `;

    document.body.insertBefore(sidebar, document.body.firstChild);
    document.body.classList.add('has-admin-sidebar');

    document.getElementById('tsb-logout').addEventListener('click', logOut);

    // ── Review queue badge ────────────────────────────────────────────────────
    try {
        const res   = await apiFetch('/api/teacher/writing-tasks?status=SUBMITTED&limit=1');
        const count = res?.total ?? res?.data?.total ?? (Array.isArray(res?.data) ? res.data.length : 0);
        const badge = document.getElementById('tsb-badge-queue');
        if (badge && count > 0) {
            badge.textContent   = count;
            badge.style.display = 'inline-flex';
        }
    } catch { /* badge is cosmetic — never crash sidebar */ }

    // ── Socket (must run BEFORE initNotificationTopbar) ───────────────────────
    try { initSocket(); } catch { /* graceful */ }

    // ── Fixed top-right notification bell ─────────────────────────────────────
    await initNotificationTopbar();
};