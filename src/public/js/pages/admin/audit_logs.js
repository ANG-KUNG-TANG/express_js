/**
 * js/pages/admin/audit_logs.js
 *
 * Real-time audit log dashboard.
 *
 * Primary:  Socket.IO — server pushes 'audit:new' instantly after every action.
 * Fallback: Polling every 30s — activates automatically if the socket drops.
 */

import { getUser }               from '../../core/auth.js';
import { apiFetch }              from '../../core/api.js';
import { initSocket }            from '../../core/socket.js';
import { initAdminSidebar}  from '../../../components/admin_sidebar.js';

initAdminSidebar();

// ── Auth guard ────────────────────────────────────────────────────────────────
// Sidebar is injected by admin_nav.js (loaded via <script type="module"> in HTML).
const _user = getUser();
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

// ── State ─────────────────────────────────────────────────────────────────────
let currentPage  = 1;
let searchQuery  = '';
let pollTimer    = null;
const LIMIT      = 20;
const POLL_MS    = 30_000;
const renderedIds = new Set();

// ── Helpers ───────────────────────────────────────────────────────────────────
const esc = s =>
    String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const fmtTs = d => d
    ? new Date(d).toLocaleString('en-GB', {
        day:'2-digit', month:'short', year:'numeric',
        hour:'2-digit', minute:'2-digit', second:'2-digit',
    })
    : '—';

const outcomeBadge = o => o === 'failure'
    ? `<span class="badge badge--danger">FAILURE</span>`
    : `<span class="badge badge--success">SUCCESS</span>`;

const actionLabel = a =>
    `<span style="font-family:var(--font-mono,monospace);font-size:.72rem;background:var(--surface2);padding:2px 6px;border-radius:4px;white-space:nowrap">${esc(a)}</span>`;

// ── Live indicator ────────────────────────────────────────────────────────────
const setLiveIndicator = (live) => {
    const el = document.getElementById('live-indicator');
    if (!el) return;
    el.textContent = live ? '● LIVE' : '○ POLLING';
    el.style.color = live ? 'var(--green)' : 'var(--text3)';
    el.title       = live ? 'Real-time via WebSocket' : 'Socket disconnected — polling every 30s';
};

// ── Action dropdown ───────────────────────────────────────────────────────────
const loadActionOptions = async () => {
    const select = document.getElementById('filter-action');
    if (!select) return;
    try {
        const res     = await apiFetch('/api/admin/audit-logs/actions');
        const actions = res?.data ?? res ?? [];
        if (!Array.isArray(actions) || !actions.length) return;
        const groups = {};
        for (const { key, value, category } of actions) {
            if (!groups[category]) groups[category] = [];
            groups[category].push({ key, value });
        }
        const opts = Object.entries(groups)
            .map(([cat, items]) => {
                const label   = cat.charAt(0).toUpperCase() + cat.slice(1);
                const options = items
                    .map(({ key, value }) =>
                        `<option value="${esc(value)}">${esc(key.toLowerCase().replace(/_/g, ' '))}</option>`)
                    .join('');
                return `<optgroup label="${esc(label)}">${options}</optgroup>`;
            }).join('');
        select.innerHTML = `<option value="">All actions</option>${opts}`;
    } catch { /* non-fatal */ }
};

// ── Filters ───────────────────────────────────────────────────────────────────
const getFilters = () => {
    const params  = { page: currentPage, limit: LIMIT };
    const action  = document.getElementById('filter-action')?.value;
    const outcome = document.getElementById('filter-outcome')?.value;
    const from    = document.getElementById('filter-from')?.value;
    const to      = document.getElementById('filter-to')?.value;
    if (action)  params.action  = action;
    if (outcome) params.outcome = outcome;
    if (from)    params.from    = from;
    if (to)      params.to      = to;
    if (searchQuery) {
        if (/^[a-f\d]{24}$/i.test(searchQuery)) params.requesterId = searchQuery;
        else if (searchQuery.includes('@'))       params.email       = searchQuery;
        else                                      params.action      = params.action || searchQuery;
    }
    return params;
};

// ── Pagination ────────────────────────────────────────────────────────────────
const renderPagination = (pages) => {
    const el = document.getElementById('pagination');
    if (!el) return;
    if (pages <= 1) { el.innerHTML = ''; return; }

    const makeBtn = (label, page, disabled = false) => {
        const btn = document.createElement('button');
        btn.className   = `btn btn--ghost btn--sm${page === currentPage ? ' btn--active' : ''}`;
        btn.textContent = label;
        btn.disabled    = disabled;
        btn.addEventListener('click', () => { currentPage = page; loadLogs(); });
        return btn;
    };

    el.innerHTML = '';
    el.appendChild(makeBtn('←', currentPage - 1, currentPage === 1));
    for (let i = 1; i <= pages; i++) {
        if (pages > 7 && Math.abs(i - currentPage) > 2 && i !== 1 && i !== pages) {
            if (i === 2 || i === pages - 1) {
                const d = document.createElement('span');
                d.textContent   = '…';
                d.style.cssText = 'padding:0 4px;color:var(--text3)';
                el.appendChild(d);
            }
            continue;
        }
        el.appendChild(makeBtn(String(i), i));
    }
    el.appendChild(makeBtn('→', currentPage + 1, currentPage === pages));
};

// ── Full page load ────────────────────────────────────────────────────────────
const loadLogs = async () => {
    const el = document.getElementById('logs-list');
    if (!el) return;
    el.innerHTML = '<p class="loading" style="text-align:center;padding:32px">Loading…</p>';
    try {
        const qs     = new URLSearchParams(getFilters()).toString();
        const res    = await apiFetch(`/api/admin/audit-logs?${qs}`);
        const result = res?.data ?? res ?? {};
        const logs   = result.logs  ?? result.data ?? (Array.isArray(result) ? result : []);
        const total  = result.total ?? logs.length;
        const pages  = (result.pages ?? Math.ceil(total / LIMIT)) || 1;

        const countEl = document.getElementById('log-count');
        if (countEl) countEl.textContent = `${total.toLocaleString()} entr${total === 1 ? 'y' : 'ies'}`;

        renderedIds.clear();
        logs.forEach(l => { if (l.id) renderedIds.add(l.id); });

        renderLogs(logs);
        renderPagination(pages);
    } catch (err) {
        el.innerHTML = `<p style="text-align:center;padding:32px;color:var(--red)">Failed to load: ${esc(err.message)}</p>`;
        toast(err.message, 'error');
    }
};

// ── Render ────────────────────────────────────────────────────────────────────
const renderDetails = (details = {}) => {
    if (!details || !Object.keys(details).length) return '—';
    const { requesterId, ...rest } = details; // eslint-disable-line no-unused-vars
    return Object.entries(rest)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `<span style="display:block"><b>${esc(k)}:</b> ${esc(String(v))}</span>`)
        .join('') || '—';
};

const renderActor = (log) => {
    const display = log.actorLabel ?? log.requesterId ?? null;
    if (!display) return '<span style="color:var(--text3)">—</span>';
    return `<span class="col-mono" style="font-size:.72rem" title="${esc(log.requesterId ?? '')}">${esc(display)}</span>`;
};

const buildRow = (l, flash = false) => `
    <tr id="row-${esc(l.id)}" ${flash ? 'class="row--flash"' : ''}>
        <td class="col-mono" style="font-size:.72rem;white-space:nowrap">${fmtTs(l.createdAt)}</td>
        <td>${actionLabel(l.action)}</td>
        <td>${outcomeBadge(l.outcome)}</td>
        <td>${renderActor(l)}</td>
        <td style="font-size:.75rem;color:var(--text2);max-width:220px">${renderDetails(l.details)}</td>
        <td class="col-mono" style="font-size:.72rem;color:var(--text3)">${esc(l.request?.ip ?? '—')}</td>
    </tr>`;

const renderLogs = (logs) => {
    const el = document.getElementById('logs-list');
    if (!logs.length) {
        el.innerHTML = '<p style="text-align:center;padding:32px;color:var(--text3)">No log entries found.</p>';
        return;
    }
    el.innerHTML = `
        <div style="overflow-x:auto">
        <table class="data-table">
            <thead><tr>
                <th>Timestamp</th><th>Action</th><th>Outcome</th>
                <th>Actor</th><th>Details</th><th>IP</th>
            </tr></thead>
            <tbody id="logs-tbody">
                ${logs.map(l => buildRow(l)).join('')}
            </tbody>
        </table>
        </div>`;
};

// ── Prepend a new row ─────────────────────────────────────────────────────────
const prependRow = (log) => {
    const hasFilters = !!(
        document.getElementById('filter-action')?.value  ||
        document.getElementById('filter-outcome')?.value ||
        document.getElementById('filter-from')?.value    ||
        document.getElementById('filter-to')?.value      ||
        searchQuery
    );
    if (currentPage !== 1 || hasFilters) return;
    if (!log.id || renderedIds.has(log.id)) return;

    renderedIds.add(log.id);

    const tbody = document.getElementById('logs-tbody');
    if (!tbody) { loadLogs(); return; }

    tbody.insertAdjacentHTML('afterbegin', buildRow(log, true));
    setTimeout(() => document.getElementById(`row-${esc(log.id)}`)?.classList.remove('row--flash'), 1500);

    const countEl = document.getElementById('log-count');
    if (countEl) {
        const current = parseInt(countEl.textContent.replace(/[^0-9]/g, ''), 10) || 0;
        const next    = current + 1;
        countEl.textContent = `${next.toLocaleString()} entr${next === 1 ? 'y' : 'ies'}`;
    }
};

// ── Polling fallback ──────────────────────────────────────────────────────────
const pollForNewLogs = async () => {
    try {
        const res    = await apiFetch('/api/admin/audit-logs?page=1&limit=5');
        const result = res?.data ?? res ?? {};
        const logs   = result.logs ?? result.data ?? (Array.isArray(result) ? result : []);
        if (!logs.length) return;
        const newEntries = logs.filter(l => l.id && !renderedIds.has(l.id));
        for (const entry of newEntries.reverse()) prependRow(entry);
    } catch { /* swallow — polling errors are non-fatal */ }
};

const startPolling = () => { if (!pollTimer) pollTimer = setInterval(pollForNewLogs, POLL_MS); };
const stopPolling  = () => { clearInterval(pollTimer); pollTimer = null; };

// ── Socket ────────────────────────────────────────────────────────────────────
const setupSocket = () => {
    const socket = initSocket();
    if (!socket) { setLiveIndicator(false); startPolling(); return; }

    if (socket.connected) { setLiveIndicator(true); stopPolling(); }

    socket.on('connect',    () => { setLiveIndicator(true);  stopPolling(); });
    socket.on('disconnect', () => { setLiveIndicator(false); startPolling(); });
    socket.io.on('reconnect', () => { setLiveIndicator(true); stopPolling(); loadLogs(); });

    // Real-time push from server
    socket.on('audit:new', (log) => prependRow(log));

    if (!socket.connected) { setLiveIndicator(false); startPolling(); }
};

// ── Filter events ─────────────────────────────────────────────────────────────
document.getElementById('apply-filter-btn')?.addEventListener('click', () => { currentPage = 1; loadLogs(); });
document.getElementById('clear-filter-btn')?.addEventListener('click', () => {
    ['filter-action','filter-outcome','filter-from','filter-to'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    searchQuery = '';
    const si = document.querySelector('.adm-search input');
    if (si) si.value = '';
    currentPage = 1;
    loadLogs();
});

let searchTimer = null;
const searchInput = document.querySelector('.adm-search input');
if (searchInput) {
    searchInput.id          = 'topbar-search';
    searchInput.placeholder = 'Search by email, user ID, or action…';
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { searchQuery = e.target.value.trim(); currentPage = 1; loadLogs(); }, 400);
    });
    searchInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        clearTimeout(searchTimer);
        searchQuery = e.target.value.trim(); currentPage = 1; loadLogs();
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadActionOptions();
loadLogs();
setupSocket();