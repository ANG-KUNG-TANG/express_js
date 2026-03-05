/**
 * toast.js — lightweight toast notifications (WorkFlow theme)
 * Usage: import { toast } from './toast.js';
 *        toast('Saved!', 'success');
 */

export const toast = (message, type = 'success') => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    container.appendChild(el);

    // Animate in
    requestAnimationFrame(() => el.classList.add('toast--show'));

    // Animate out + remove
    setTimeout(() => {
        el.classList.remove('toast--show');
        el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, 3000);
};