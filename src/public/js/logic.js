// ============================================================
//  TaskFlow — logic.js
//  Uses api.js (taskAPI) — no duplicate fetch logic
// ============================================================

import { taskAPI } from './api.js';

// ── Token — matches what your login page saves as 'token' ────
const getToken = () => localStorage.getItem('accessToken');

// ── Auth guard ───────────────────────────────────────────────
function checkAuth() {
  if (!getToken()) {
    console.warn('No token found — redirecting to login');
    window.location.href = 'login.html';
  }
}

// ── Modal open / close ───────────────────────────────────────
function openModal() {
  clearModalError();
  document.getElementById('task-title').value       = '';
  document.getElementById('task-description').value = '';
  document.getElementById('task-priority').value    = 'MEDIUM';
  document.getElementById('task-due-date').value    = '';
  document.getElementById('modal').style.display    = 'flex';
  document.getElementById('task-title').focus();
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  clearModalError();
}

document.getElementById('modal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

// ── Error banner inside modal ────────────────────────────────
function showModalError(msg) {
  let banner = document.getElementById('modal-error');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'modal-error';
    banner.style.cssText = `
      background: rgba(255,45,120,.12);
      border: 1px solid rgba(255,45,120,.4);
      color: #ff6b9d;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
      font-family: var(--font-mono, monospace);
    `;
    const modal = document.querySelector('.modal');
    modal.insertBefore(banner, modal.querySelector('.field'));
  }
  banner.textContent = msg;
  banner.style.display = 'block';
}

function clearModalError() {
  const banner = document.getElementById('modal-error');
  if (banner) banner.style.display = 'none';
}

// ── Create Task ──────────────────────────────────────────────
async function createTask() {
  clearModalError();

  const title       = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const priority    = document.getElementById('task-priority').value.toUpperCase();
  const dueDateRaw  = document.getElementById('task-due-date').value;

  // Client-side validation
  if (!title) {
    showModalError('Title is required.');
    document.getElementById('task-title').focus();
    return;
  }
  if (title.length < 3) {
    showModalError('Title must be at least 3 characters.');
    document.getElementById('task-title').focus();
    return;
  }
  if (title.length > 100) {
    showModalError('Title cannot exceed 100 characters.');
    return;
  }

  // Build payload
  const payload = { title, description };
  if (priority)   payload.priority = priority;
  if (dueDateRaw) payload.dueDate  = new Date(dueDateRaw + 'T00:00:00').toISOString();

  // Loading state
  const btn = document.getElementById('btn-create-task');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'CREATING…';

  try {
    // ✅ taskAPI.create() from api.js handles token, URL, headers correctly
    const data = await taskAPI.create(payload, getToken());
    closeModal();
    addTaskCardToBoard(data.data ?? data);

  } catch (err) {
    console.error('createTask error:', err);
    if (err.status === 401) {
      showModalError('Session expired — please log in again.');
      setTimeout(() => window.location.href = 'login.html', 1500);
    } else {
      showModalError(err.message || 'Something went wrong.');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ── Add new card to Kanban board ─────────────────────────────
function addTaskCardToBoard(task) {
  const colMap    = { PENDING: 0, IN_PROGRESS: 1, COMPLETED: 2 };
  const colIndex  = colMap[task.status] ?? 0;
  const colBodies = document.querySelectorAll('.col-body');
  const colBody   = colBodies[colIndex];
  if (!colBody) return;

  const priority  = (task.priority || 'MEDIUM').toLowerCase();
  const dueText   = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    : '';
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  const card = document.createElement('div');
  card.className = `task-card ${priority}`;
  card.innerHTML = `
    <div class="card-title">${escapeHtml(task.title)}</div>
    <div class="card-tags"><span class="tag tag-${priority}">${task.priority || 'MEDIUM'}</span></div>
    <div class="card-footer">
      <span class="due-date ${isOverdue ? 'overdue' : ''}">
        ${isOverdue ? '⚠ ' : ''}${dueText ? 'Due ' + dueText : ''}
      </span>
      <div class="card-avatar">ME</div>
    </div>
  `;

  const addBtn = colBody.querySelector('.add-card-btn');
  colBody.insertBefore(card, addBtn);

  const countBadge = colBody.closest('.column').querySelector('.col-count');
  if (countBadge) {
    const current = parseInt(countBadge.textContent, 10) || 0;
    countBadge.textContent = String(current + 1).padStart(2, '0');
  }
}

// ── XSS helper ───────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Expose functions to HTML onclick attributes ───────────────
window.openModal  = openModal;
window.closeModal = closeModal;
window.createTask = createTask;

// ── Auth check on page load ───────────────────────────────────
document.addEventListener('DOMContentLoaded', checkAuth);