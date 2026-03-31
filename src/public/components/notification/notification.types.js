/**
 * notification_types.js — maps backend NotificationType values → icon, label, color.
 *
 * This is the single source of truth for notification display config.
 * Both notification_ui.js and notification_toast.js import from here.
 * Keys are lowercase strings matching the backend noti_enums.js exactly.
 */

export const NOTI_TYPES_CONFIG = {
    task_assigned:  { icon: '📋', label: 'New task',         color: '#378ADD' },
    task_accepted:  { icon: '✅', label: 'Task accepted',    color: '#1D9E75' },
    task_declined:  { icon: '❌', label: 'Task declined',    color: '#E24B4A' },
    task_submitted: { icon: '📤', label: 'Task submitted',   color: '#534AB7' },
    task_reviewed:  { icon: '💬', label: 'Feedback given',   color: '#BA7517' },
    task_scored:    { icon: '🏆', label: 'Task scored',      color: '#1D9E75' },
    task_reminder:  { icon: '⏰', label: 'Reminder',         color: '#BA7517' },
    task_unstarted: { icon: '⏳', label: 'Not started',      color: '#BA7517' },
    role_changed:   { icon: '⭐', label: 'Role updated',     color: '#534AB7' },
    teacher_linked: { icon: '🔗', label: 'Teacher assigned', color: '#378ADD' },
    test_result:    { icon: '📊', label: 'Test result',      color: '#1D9E75' },
    exam_reminder:  { icon: '📅', label: 'Exam reminder',    color: '#E24B4A' },
};

/** Returns config for a type, or a safe default if unrecognised. */
export const getTypeConfig = (type) =>
    NOTI_TYPES_CONFIG[type] ?? { icon: '🔔', label: 'Notification', color: '#64748b' };