export const NotificationType = Object.freeze({
    // ── Existing types (unchanged) ────────────────────────────────────────────
    TEST_RESULT:      'test_result',
    EXAM_REMINDER:    'exam_reminder',
    SCORE_AVAILABLE:  'score_available',
    PRACTICE_READY:   'practice_ready',
    PASSWORD_CHANGED: 'password_changed',
    ACCOUNT_ALERT:    'account_alert',

    // ── Assignment types ──────────────────────────────────────────────────────
    
    // passed into sendNotificationUseCase({ type: NotificationType.TASK_ASSIGNED })
    TASK_ASSIGNED:    'task_assigned',    // → student:  teacher assigned a task
    TASK_ACCEPTED:    'task_accepted',    // → teacher:  student accepted         [ADDED]
    TASK_DECLINED:    'task_declined',    // → teacher:  student declined
    TASK_REVIEWED:    'task_reviewed',    // → student:  teacher left feedback     [ADDED]
    TASK_REMINDER:    'task_reminder',    // → student:  due in 24h (cron)
    TASK_UNSTARTED:   'task_unstarted',   // → student:  not started after X days (cron)
    TASK_SUBMITTED:   'task_submitted',   // → teacher:  student submitted
    TASK_SCORED:      'task_scored',      // → student:  teacher scored it
    ROLE_CHANGED:     'role_changed',     // → user:     role updated by admin    [ADDED — used in notification.service TYPES]
    TEACHER_LINKED:   'teacher_linked',   // → student:  admin linked a teacher   [ADDED — used in notification.service TYPES]
});