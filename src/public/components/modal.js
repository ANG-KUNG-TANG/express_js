/**
 * modal.js — reusable modal component.
 *
 * Extracted from detail.js showModal/showPromptModal.
 * Used by: detail.js, list.js, admin/users.js, teacher/assign.js, anywhere
 * that needs confirm/form dialogs without window.confirm() or window.prompt().
 *
 * Usage:
 *   import { showModal, showPromptModal, showInputModal } from './modal.js';
 *
 *   // Confirm dialog
 *   showModal({
 *     title: 'Delete Task?',
 *     message: 'This cannot be undone.',
 *     confirmLabel: 'Delete',
 *     danger: true,
 *     onConfirm: async () => { ... }
 *   });
 *
 *   // Text input dialog — returns the entered value
 *   const reason = await showInputModal({
 *     title: 'Decline reason',
 *     message: 'Please explain why you are declining.',
 *     placeholder: 'Enter reason…',
 *     confirmLabel: 'Decline',
 *   });
 *   if (reason !== null) { ... }  // null means cancelled
 */

const MODAL_ID = 'app-modal';

// ── Shared overlay builder ────────────────────────────────────────────────────

const _buildOverlay = (innerHtml) => {
    document.getElementById(MODAL_ID)?.remove();

    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.style.cssText = [
        'position:fixed;inset:0;background:rgba(0,0,0,0.45);',
        'display:flex;align-items:center;justify-content:center;',
        'z-index:9999;animation:fadeIn .15s ease;',
    ].join('');

    modal.innerHTML = `
        <div style="
            background:var(--surface);border:1px solid var(--border);
            border-radius:var(--radius-lg);padding:28px 32px;
            max-width:420px;width:90%;box-shadow:var(--shadow-lg);
        ">${innerHtml}</div>`;

    document.body.appendChild(modal);

    // Click outside to close — caller can override by not passing closeOnOutside
    const close = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });

    return { modal, close };
};

// ── Confirm modal ─────────────────────────────────────────────────────────────

/**
 * @param {{
 *   title: string,
 *   message: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   danger?: boolean,
 *   onConfirm: () => Promise<void>
 * }} opts
 */
export const showModal = (opts) => {
    const {
        title,
        message,
        confirmLabel = 'Confirm',
        cancelLabel  = 'Cancel',
        danger       = false,
        onConfirm,
    } = opts;

    const { modal, close } = _buildOverlay(`
        <h3 style="margin:0 0 8px;font-size:1.1rem;">${_esc(title)}</h3>
        <p style="color:var(--text2);font-size:.9rem;margin:0 0 24px;line-height:1.5;">${_esc(message)}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="modal-cancel"  class="btn btn--ghost">${_esc(cancelLabel)}</button>
            <button id="modal-confirm" class="btn ${danger ? 'btn--danger' : 'btn--primary'}">${_esc(confirmLabel)}</button>
        </div>`);

    modal.querySelector('#modal-cancel').addEventListener('click', close);
    modal.querySelector('#modal-confirm').addEventListener('click', async () => {
        const btn = modal.querySelector('#modal-confirm');
        btn.disabled    = true;
        btn.textContent = 'Please wait…';
        await onConfirm();
        close();
    });
};

// ── Input (prompt) modal ──────────────────────────────────────────────────────

/**
 * Returns a Promise that resolves to the entered string, or null if cancelled.
 *
 * @param {{
 *   title: string,
 *   message: string,
 *   placeholder?: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   validate?: (value: string) => string|null  — return error string or null
 * }} opts
 * @returns {Promise<string|null>}
 */
export const showInputModal = (opts) => {
    const {
        title,
        message,
        placeholder  = '',
        confirmLabel = 'Confirm',
        cancelLabel  = 'Cancel',
        validate,
    } = opts;

    return new Promise((resolve) => {
        const { modal, close } = _buildOverlay(`
            <h3 style="margin:0 0 8px;font-size:1.1rem;">${_esc(title)}</h3>
            <p style="color:var(--text2);font-size:.85rem;margin:0 0 14px;">${_esc(message)}</p>
            <input id="modal-input" type="text" placeholder="${_esc(placeholder)}"
                style="width:100%;padding:9px 12px;border:1px solid var(--border);
                border-radius:var(--radius-sm);font-size:.9rem;
                background:var(--surface2);color:var(--text);margin-bottom:6px;"/>
            <p id="modal-input-err" style="font-size:.8rem;color:var(--red,#e05c5c);min-height:18px;margin:0 0 16px;"></p>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="modal-cancel"  class="btn btn--ghost">${_esc(cancelLabel)}</button>
                <button id="modal-confirm" class="btn btn--primary">${_esc(confirmLabel)}</button>
            </div>`);

        const input   = modal.querySelector('#modal-input');
        const errEl   = modal.querySelector('#modal-input-err');
        const confirm = modal.querySelector('#modal-confirm');
        const cancel  = modal.querySelector('#modal-cancel');

        input.focus();

        const cancel_ = () => { close(); resolve(null); };
        cancel.addEventListener('click', cancel_);
        modal.addEventListener('click', (e) => { if (e.target === modal) cancel_(); });

        const submit = async () => {
            const val = input.value.trim();
            if (validate) {
                const err = validate(val);
                if (err) { errEl.textContent = err; input.focus(); return; }
            } else if (!val) {
                errEl.textContent = 'This field is required.';
                input.focus();
                return;
            }
            confirm.disabled    = true;
            confirm.textContent = 'Please wait…';
            close();
            resolve(val);
        };

        confirm.addEventListener('click', submit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    });
};

// ── Transfer modal (alias with pre-set confirmLabel) ─────────────────────────
export const showTransferModal = (opts) =>
    showInputModal({ confirmLabel: 'Transfer', ...opts });

// ── Helper ────────────────────────────────────────────────────────────────────
const _esc = (str) => {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
};