// js/teacher/teacher_dashboard_stats.js
// Drop this import into your existing teacher dashboard page:
//   import { initDashboardStats } from './teacher_dashboard_stats.js';
//   initDashboardStats();

import { teacherAPI } from '../../core/api.js';

// ── Animated counter ──────────────────────────────────────────────────────────
const animateCount = (el, target, duration = 900) => {
    const start     = performance.now();
    const from      = 0;
    const easeOut   = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        el.textContent = Math.round(from + (target - from) * easeOut(progress));
        if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
};

// ── Render ────────────────────────────────────────────────────────────────────
const render = ({ studentCount, pendingReview, activeAssignments, reviewedThisMonth }) => {
    const container = document.getElementById('teacher-stats-grid');
    if (!container) return;

    const cards = [
        {
            id:    'stat-students',
            value:  studentCount,
            label: 'My Students',
            icon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>`,
            accent: 'var(--teacher-color)',
        },
        {
            id:    'stat-pending',
            value:  pendingReview,
            label: 'Pending Review',
            icon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>`,
            accent: '#e0a030',
            urgent: pendingReview > 0,
        },
        {
            id:    'stat-active',
            value:  activeAssignments,
            label: 'Active Assignments',
            icon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>`,
            accent: '#4a9eca',
        },
        {
            id:    'stat-reviewed',
            value:  reviewedThisMonth,
            label: 'Reviewed This Month',
            icon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>`,
            accent: '#5cba7d',
        },
    ];

    container.innerHTML = cards.map(c => `
        <div class="ts-card ${c.urgent ? 'ts-card--urgent' : ''}" style="--card-accent: ${c.accent}">
            <div class="ts-card__icon">${c.icon}</div>
            <div class="ts-card__body">
                <span class="ts-card__value" id="${c.id}">0</span>
                <span class="ts-card__label">${c.label}</span>
            </div>
            ${c.urgent ? '<span class="ts-card__badge">Action needed</span>' : ''}
        </div>
    `).join('');

    // Animate each counter after paint
    requestAnimationFrame(() => {
        cards.forEach(c => {
            const el = document.getElementById(c.id);
            if (el) animateCount(el, c.value);
        });
    });
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const renderSkeleton = () => {
    const container = document.getElementById('teacher-stats-grid');
    if (!container) return;
    container.innerHTML = Array(4).fill(`
        <div class="ts-card ts-card--skeleton">
            <div class="ts-skeleton ts-skeleton--icon"></div>
            <div class="ts-card__body">
                <div class="ts-skeleton ts-skeleton--value"></div>
                <div class="ts-skeleton ts-skeleton--label"></div>
            </div>
        </div>
    `).join('');
};

// ── Init ──────────────────────────────────────────────────────────────────────
export const initDashboardStats = async () => {
    injectStyles();
    renderSkeleton();

    try {
        const res   = await teacherAPI.dashboardStats();
        const stats = res?.data ?? res ?? {};
        render({
            studentCount:      stats.studentCount      ?? 0,
            pendingReview:     stats.pendingReview     ?? 0,
            activeAssignments: stats.activeAssignments ?? 0,
            reviewedThisMonth: stats.reviewedThisMonth ?? 0,
        });
    } catch (err) {
        const container = document.getElementById('teacher-stats-grid');
        if (container) {
            container.innerHTML = `
                <p class="ts-error">Could not load dashboard stats. ${err.message}</p>
            `;
        }
    }
};

// ── Styles (scoped) ───────────────────────────────────────────────────────────
const injectStyles = () => {
    if (document.getElementById('teacher-stats-styles')) return;
    const style = document.createElement('style');
    style.id = 'teacher-stats-styles';
    style.textContent = `
        :root {
            --teacher-color: #2d7a55;
        }

        #teacher-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.25rem;
            margin-bottom: 2rem;
        }

        .ts-card {
            position: relative;
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1.25rem 1.5rem;
            background: var(--adm-card-bg, #1a2236);
            border: 1px solid rgba(255,255,255,0.07);
            border-left: 3px solid var(--card-accent, var(--teacher-color));
            border-radius: 10px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            overflow: hidden;
        }

        .ts-card::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at top left, color-mix(in srgb, var(--card-accent) 8%, transparent), transparent 70%);
            pointer-events: none;
        }

        .ts-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 24px rgba(0,0,0,0.3);
        }

        .ts-card--urgent {
            border-left-color: #e0a030;
            animation: ts-pulse 2.5s ease-in-out infinite;
        }

        @keyframes ts-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(224,160,48,0); }
            50%       { box-shadow: 0 0 0 6px rgba(224,160,48,0.12); }
        }

        .ts-card__icon {
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--card-accent, var(--teacher-color));
            opacity: 0.9;
        }

        .ts-card__icon svg {
            width: 22px;
            height: 22px;
        }

        .ts-card__body {
            display: flex;
            flex-direction: column;
            gap: 0.15rem;
        }

        .ts-card__value {
            font-size: 2rem;
            font-weight: 700;
            line-height: 1;
            color: var(--adm-text-primary, #e8e8e8);
            font-variant-numeric: tabular-nums;
        }

        .ts-card__label {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--adm-text-muted, #8a9bb0);
        }

        .ts-card__badge {
            position: absolute;
            top: 0.6rem;
            right: 0.75rem;
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #e0a030;
            background: rgba(224,160,48,0.12);
            padding: 0.15rem 0.5rem;
            border-radius: 99px;
        }

        /* Skeleton */
        .ts-card--skeleton { pointer-events: none; }

        .ts-skeleton {
            background: linear-gradient(90deg,
                rgba(255,255,255,0.04) 25%,
                rgba(255,255,255,0.09) 50%,
                rgba(255,255,255,0.04) 75%
            );
            background-size: 200% 100%;
            animation: ts-shimmer 1.4s infinite;
            border-radius: 6px;
        }

        @keyframes ts-shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        .ts-skeleton--icon  { width: 40px; height: 40px; border-radius: 8px; }
        .ts-skeleton--value { width: 56px; height: 28px; margin-bottom: 6px; }
        .ts-skeleton--label { width: 100px; height: 12px; }

        .ts-error {
            grid-column: 1 / -1;
            color: var(--adm-text-muted, #8a9bb0);
            font-size: 0.85rem;
            padding: 1rem;
        }
    `;
    document.head.appendChild(style);
};