/**
 * components/pagination.js
 *
 * Reusable paginator component. Returns an HTML string and wires
 * up click events on a container element.
 *
 * Usage — render:
 *   import { renderPagination } from '../../components/pagination.js';
 *
 *   renderPagination({
 *       containerId: 'pagination',   // id of the <div> to inject into
 *       page:        2,              // current page (1-based)
 *       totalPages:  8,
 *       onChange:    (newPage) => loadTasks({ page: newPage }),
 *   });
 *
 * Usage — HTML:
 *   <div id="pagination"></div>
 *
 * Renders nothing if totalPages <= 1.
 * Shows at most 5 page buttons with ellipsis for large ranges.
 */

/**
 * @param {{
 *   containerId : string,
 *   page        : number,
 *   totalPages  : number,
 *   onChange    : (page: number) => void,
 * }} opts
 */
export const renderPagination = ({ containerId, page, totalPages, onChange }) => {
    const el = document.getElementById(containerId);
    if (!el) return;

    // Nothing to paginate
    if (totalPages <= 1) {
        el.innerHTML = '';
        return;
    }

    const pages = _pageRange(page, totalPages);

    el.innerHTML = `
        <nav class="pagination" aria-label="Pagination">
            <button class="pagination__btn pagination__prev"
                    ${page <= 1 ? 'disabled' : ''}
                    aria-label="Previous page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
            </button>

            ${pages.map(p =>
                p === '...'
                    ? `<span class="pagination__ellipsis">…</span>`
                    : `<button class="pagination__btn pagination__page ${p === page ? 'pagination__page--active' : ''}"
                               data-page="${p}" aria-label="Page ${p}"
                               ${p === page ? 'aria-current="page"' : ''}>
                           ${p}
                       </button>`
            ).join('')}

            <button class="pagination__btn pagination__next"
                    ${page >= totalPages ? 'disabled' : ''}
                    aria-label="Next page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </button>
        </nav>`;

    // Wire events
    el.querySelector('.pagination__prev')?.addEventListener('click', () => {
        if (page > 1) onChange(page - 1);
    });

    el.querySelector('.pagination__next')?.addEventListener('click', () => {
        if (page < totalPages) onChange(page + 1);
    });

    el.querySelectorAll('.pagination__page').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = Number(btn.dataset.page);
            if (p !== page) onChange(p);
        });
    });
};

// ── Page range builder ────────────────────────────────────────────────────────
// Returns an array like [1, '...', 4, 5, 6, '...', 12]
// Always shows first, last, current, and one neighbour each side.
const _pageRange = (current, total) => {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set([1, total, current]);
    if (current > 1)     pages.add(current - 1);
    if (current < total) pages.add(current + 1);

    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];

    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
        result.push(sorted[i]);
    }

    return result;
};

// ── CSS (injected once) ───────────────────────────────────────────────────────
// Self-contained so the component works without a separate CSS import.
const _injectStyles = () => {
    if (document.getElementById('pagination-styles')) return;
    const style = document.createElement('style');
    style.id = 'pagination-styles';
    style.textContent = `
        .pagination {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 16px 0 4px;
        }
        .pagination__btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 32px;
            height: 32px;
            padding: 0 6px;
            border-radius: var(--r-sm, 6px);
            border: 1px solid var(--border, #e2e5ec);
            background: var(--surface, #fff);
            color: var(--text2, #5a6178);
            font-size: .8rem;
            font-weight: 600;
            cursor: pointer;
            font-family: var(--font-b, sans-serif);
            transition: all .12s ease;
            line-height: 1;
        }
        .pagination__btn:hover:not(:disabled) {
            background: var(--surface3, #eef0f4);
            color: var(--text, #1a1d2e);
            border-color: var(--border, #e2e5ec);
        }
        .pagination__btn:disabled {
            opacity: .35;
            cursor: not-allowed;
        }
        .pagination__page--active {
            background: var(--accent, #2563eb);
            color: #fff;
            border-color: var(--accent, #2563eb);
        }
        .pagination__page--active:hover:not(:disabled) {
            background: var(--accent-h, #1d4ed8);
            border-color: var(--accent-h, #1d4ed8);
        }
        .pagination__ellipsis {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 28px;
            height: 32px;
            color: var(--text3, #9299b0);
            font-size: .8rem;
            user-select: none;
        }
    `;
    document.head.appendChild(style);
};
_injectStyles();