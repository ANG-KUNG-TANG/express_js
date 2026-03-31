/**
 * /js/pages/admin/notifications.js
 *
 * Admin: send a notification to all / teachers / students / one user.
 *
 * NOTE: The sidebar is injected by admin_nav.js which is loaded via
 *   <script type="module" src="/js/core/adminNav.js"></script>
 * in the HTML. Do NOT import or call initAdminSidebar() here — that old
 * import no longer exists. admin_nav.js handles sidebar + notifications bell.
 */

import { apiFetch } from '../../core/api.js';
import { getUser, logOut } from '../../core/auth.js';
import { initAdminSidebar} from '../../../components/admin_sidebar.js'


initAdminSidebar()

// ── Auth guard (belt-and-suspenders; admin_nav.js already guards) ─────────────
const _user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
if (!_user || _user.role !== 'admin') window.location.replace('/pages/auth/login.html');

// ── Toast ─────────────────────────────────────────────────────────────────────
const toast = (msg, type = 'success') => {
    const t    = document.getElementById('toast');
    const icon = document.querySelector('#toast .t-icon');
    const text = document.getElementById('toast-msg');
    if (!t) return;
    if (text) text.textContent = msg;
    if (icon) {
        icon.textContent = type === 'error' ? '✕' : '✓';
        icon.style.color = type === 'error' ? 'var(--red)' : 'var(--green)';
    }
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
};

// ── Toggle individual target row ──────────────────────────────────────────────
document.getElementById('noti-audience')?.addEventListener('change', function () {
    const row = document.getElementById('individual-row');
    if (row) row.style.display = this.value === 'individual' ? 'flex' : 'none';
});

// ── Send notification ─────────────────────────────────────────────────────────
const send = async () => {
    const audience     = document.getElementById('noti-audience')?.value ?? 'all';
    const type         = document.getElementById('noti-type')?.value     ?? 'account_alert';
    const title        = document.getElementById('noti-title')?.value.trim()   ?? '';
    const message      = document.getElementById('noti-message')?.value.trim() ?? '';
    const ctaText      = document.getElementById('noti-cta-text')?.value.trim() || null;
    const ctaUrl       = document.getElementById('noti-cta-url')?.value.trim()  || null;
    const targetUserId = document.getElementById('noti-target-id')?.value.trim() || null;
    const statusEl     = document.getElementById('send-status');

    if (!title)   { toast('Title is required.', 'error'); return; }
    if (!message) { toast('Message is required.', 'error'); return; }
    if (audience === 'individual' && !targetUserId) {
        toast('Target user ID is required for individual audience.', 'error'); return;
    }

    const btn = document.getElementById('send-btn');
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = 'Sending…';

    try {
        const payload = { audience, type, title, message };
        if (ctaText) payload.ctaText = ctaText;
        if (ctaUrl)  payload.ctaUrl  = ctaUrl;
        if (audience === 'individual' && targetUserId) payload.targetUserId = targetUserId;

        const res    = await apiFetch('/api/admin/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = res?.data ?? res ?? {};
        const sent   = result.sent   ?? result.count ?? 0;
        const failed = result.failed ?? 0;

        toast(`Sent to ${sent} recipient${sent !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}.`);
        if (statusEl) statusEl.textContent = `Last send: ${sent} sent${failed > 0 ? `, ${failed} failed` : ''}`;

        // Clear form fields
        ['noti-title', 'noti-message', 'noti-cta-text', 'noti-cta-url', 'noti-target-id']
            .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    } catch (err) {
        toast(err.message, 'error');
        if (statusEl) statusEl.textContent = '';
    } finally {
        if (btn) btn.disabled = false;
    }
};

document.getElementById('send-btn')?.addEventListener('click', send);