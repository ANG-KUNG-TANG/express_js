/* task.transfer.js
   Transfer task modal — extracted from detail.html inline script.
   Load as regular <script> after detail.js module. */

(function () {
  const getTaskId = () => new URLSearchParams(window.location.search).get('id');
  const getToken  = () => localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  const root      = document.getElementById('transfer-modal-root');
  if (!root) return;

  const buildModal = () => {
    root.innerHTML = `
      <div class="transfer-modal-backdrop" id="transferBackdrop">
        <div class="transfer-modal" role="dialog" aria-modal="true" aria-label="Transfer task">
          <h3>Transfer Task</h3>
          <p>Reassign this task to another user. This action is logged and cannot be undone.</p>
          <label for="transfer-user-id">Target User ID</label>
          <input type="text" id="transfer-user-id" placeholder="usr_xxxxxxxxxxxxxxxx" autocomplete="off" spellcheck="false"/>
          <p class="transfer-modal-hint">Find a user's ID from the Admin → Users panel.</p>
          <p class="transfer-error" id="transfer-err"></p>
          <div class="transfer-modal-actions">
            <button id="transfer-cancel-btn">Cancel</button>
            <button id="transfer-confirm-btn">Confirm Transfer</button>
          </div>
        </div>
      </div>`;

    document.getElementById('transferBackdrop').addEventListener('click', e => {
      if (e.target.id === 'transferBackdrop') closeModal();
    });
    document.getElementById('transfer-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('transfer-confirm-btn').addEventListener('click', doTransfer);
    document.getElementById('transfer-user-id').focus();
  };

  const closeModal = () => { root.innerHTML = ''; };

  const doTransfer = async () => {
    const taskId       = getTaskId();
    const targetUserId = document.getElementById('transfer-user-id')?.value?.trim();
    const errEl        = document.getElementById('transfer-err');
    const btn          = document.getElementById('transfer-confirm-btn');

    if (!targetUserId) { errEl.textContent = 'Please enter a target user ID.'; return; }
    if (!taskId)       { errEl.textContent = 'Could not determine task ID from URL.'; return; }

    btn.disabled = true; btn.textContent = 'Transferring…'; errEl.textContent = '';

    try {
      const res  = await fetch(`/api/tasks/${taskId}/transfer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ targetUserId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        errEl.textContent = json.message || `Error ${res.status}`;
        btn.disabled = false; btn.textContent = 'Confirm Transfer';
        return;
      }
      closeModal();
      window.location.href = '/pages/tasks/list.html';
    } catch {
      errEl.textContent = 'Network error.';
      btn.disabled = false; btn.textContent = 'Confirm Transfer';
    }
  };

  document.getElementById('transfer-task-btn')?.addEventListener('click', buildModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.innerHTML) closeModal(); });
})();