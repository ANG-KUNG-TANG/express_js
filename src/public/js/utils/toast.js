/**
 * toast.js — lightweight toast notifications (WorkFlow theme)
 * Usage: import { toast } from './toast.js';
 *        toast('Saved!', 'success');
 */

export const toast = (message, type = 'success', duration = 3000) => {
    // type: 'success' | 'error' | 'warning' | 'info'
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.className   = `toast toast--${type}`;
    el.textContent = message;
    container.appendChild(el);

    requestAnimationFrame(() => el.classList.add('toast--show'));

    const remove = () => el.isConnected && el.remove();

    setTimeout(() => {
        el.classList.remove('toast--show');
        el.addEventListener('transitionend', remove, { once: true });
        setTimeout(remove, 500); // fallback
    }, duration);
};