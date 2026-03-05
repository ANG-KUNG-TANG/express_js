/**
 * statusBadge.js — returns a coloured badge HTML string for WritingStatus.
 * Mapped to WorkFlow badge class names.
 *
 * Usage: import { statusBadge } from '../../components/statusBadge.js';
 *        el.innerHTML = statusBadge('SUBMITTED');
 */

const STATUS_CONFIG = {
    ASSIGNED:  { label: 'Assigned',  cls: 'badge--assigned'  },
    WRITING:   { label: 'Writing',   cls: 'badge--writing'   },
    SUBMITTED: { label: 'Submitted', cls: 'badge--submitted' },
    REVIEWED:  { label: 'Reviewed',  cls: 'badge--reviewed'  },
    SCORED:    { label: 'Scored',    cls: 'badge--scored'    },
};

export const statusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] ?? { label: status ?? '—', cls: 'badge--default' };
    return `<span class="badge ${cfg.cls}">${cfg.label}</span>`;
};