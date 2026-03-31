/**
 * notification_toast.js — real-time pop-up toast for socket notifications.
 *
 * Triggered by notification_ui.js when 'noti:new' fires.
 * Separate from toast.js (which handles generic UI feedback toasts).
 *
 * Usage:
 *   import { showNotificationToast } from './notification_toast.js';
 *   showNotificationToast(notification);
 */

import { getTypeConfig } from './notification.types.js';

export const showNotificationToast = (noti) => {
    const cfg = getTypeConfig(noti.type);

    const el = document.createElement('div');
    el.className = 'noti-toast';
    el.setAttribute('role', 'alert');
    el.innerHTML = `
        <span class="noti-toast__icon" style="color:${cfg.color}">${cfg.icon}</span>
        <div class="noti-toast__body">
            <strong class="noti-toast__title">${_esc(noti.title)}</strong>
            <p class="noti-toast__msg">${_esc(noti.message)}</p>
        </div>
        <button class="noti-toast__close" aria-label="Dismiss">✕</button>
    `;

    // Click toast body → navigate to CTA if available
    if (noti.metadata?.ctaUrl) {
        el.style.cursor = 'pointer';
        el.querySelector('.noti-toast__body').addEventListener('click', () => {
            window.location.href = noti.metadata.ctaUrl;
        });
    }

    el.querySelector('.noti-toast__close').addEventListener('click', (e) => {
        e.stopPropagation();
        _dismiss(el);
    });

    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('noti-toast--visible'));

    // Auto-dismiss after 5s
    setTimeout(() => _dismiss(el), 5000);
};

const _dismiss = (el) => {
    el.classList.remove('noti-toast--visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
};

const _esc = (str) => {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
};