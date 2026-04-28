// src/domain/base/audit_enums.js

export const AuditAction = Object.freeze({
    // ── Admin ───────────────────────────────────────────────
    USER_PROMOTED:              'admin.user.promoted',
    USER_ASSIGNED_TEACHER:      'admin.user.assigned_teacher',
    USER_LINKED_TO_TEACHER:     'admin.user.linked_to_teacher',
    USER_UNLINKED_FROM_TEACHER: 'admin.user.unlinked_from_teacher',
    USER_DELETED:               'admin.user.deleted',

    TASK_REVIEWED:              'admin.task.reviewed',
    TASK_SCORED:                'admin.task.scored',
    TASKS_TRANSFERRED:          'admin.tasks.transferred',

    CONTENT_FLAGGED:            'admin.content.flagged',
    CONTENT_FLAG_RESOLVED:      'admin.content.flag_resolved',
    CONTENT_DELETED:            'admin.content.deleted',

    NOTIFICATION_SENT:          'admin.notification.sent',
    DASHBOARD_VIEWED:           'admin.dashboard.viewed',

    // ── Auth ────────────────────────────────────────────────
    AUTH_LOGIN:                 'auth.login',
    AUTH_OAUTH_LOGIN_GOOGLE:    'auth.oauth.login.google',
    AUTH_OAUTH_LOGIN_GITHUB:    'auth.oauth.login.github',
    AUTH_OAUTH_FAILURE:         'auth.oauth.failure',
    AUTH_TOKEN_REFRESHED:       'auth.token.refreshed',
    AUTH_TOKEN_REFRESH_FAILED:  'auth.token.refresh_failed',
    AUTH_TOKEN_REUSE_DETECTED:  'auth.token.reuse_detected',
    AUTH_LOGOUT:                'auth.logout',
    AUTH_PASSWORD_RESET_REQUEST:'auth.password_reset.requested',
    AUTH_PASSWORD_RESET_DONE:   'auth.password_reset.completed',

    // ── News ────────────────────────────────────────────────
    NEWS_INTERESTS_UPDATED:     'news.interestsUpdated',

    // ── Profile ─────────────────────────────────────────────
    PROFILE_UPDATED:            'profile.updated',
    PROFILE_AVATAR_UPDATED:     'profile.avatar_updated',
    PROFILE_COVER_UPDATED:      'profile.cover_updated',
    PROFILE_FILES_UPLOADED:     'profile.files_uploaded',
    PROFILE_FILE_DELETED:       'profile.file_deleted',

    // ── Tasks (student) ─────────────────────────────────────
    TASK_CREATED:               'writingTask.created',
    TASK_UPDATED:               'writingTask.updated',
    TASK_DELETED:               'writingTask.deleted',
    TASK_STARTED:               'writingTask.started',
    TASK_SUBMITTED:             'writingTask.submitted',
    TASK_REVIEWED_USER:         'writingTask.reviewed',
    TASK_SCORED_USER:           'writingTask.scored',
    TASK_TRANSFERRED:           'writingTask.transferred',
    TASK_ASSIGNMENT_RESPONDED:  'writingTask.assignmentResponded',

    // ── Teacher ─────────────────────────────────────────────
    TEACHER_TASK_ASSIGNED:      'teacher.task.assigned',   // ← ADDED: distinct from reviewed
    TEACHER_TASK_REVIEWED:      'teacher.task.reviewed',

    // ── User ────────────────────────────────────────────────
    USER_CREATED:               'user.created',
    USER_UPDATED:               'user.updated',
    USER_DELETED_GENERAL:       'user.deleted',
    USER_PROMOTED_TO_ADMIN:     'user.promoted_to_admin',
    USER_SUSPENDED:               'USER_SUSPENDED',
    USER_REACTIVATED:             'USER_REACTIVATED',
    USER_DEMOTED:                 'USER_DEMOTED',
    USER_PASSWORD_RESET_FORCED:   'USER_PASSWORD_RESET_FORCED',
    USERS_BULK_DELETED:           'USERS_BULK_DELETED',
    USERS_BULK_SUSPENDED:         'USERS_BULK_SUSPENDED',
    USERS_BULK_TEACHER_ASSIGNED:  'USERS_BULK_TEACHER_ASSIGNED',

    // ── Vocab ───────────────────────────────────────────────
    VOCAB_CREATED:              'vocab.created',
    VOCAB_FETCHED:              'vocab.fetched',
    VOCAB_EXTERNAL_FETCHED:     'vocab.external.fetched',
    VOCAB_LOOKUP:               'vocab.lookup',
});

/**
 * Fast O(1) lookup set — built once at module load.
 * Use isKnownAction() to validate caller-supplied strings before persisting.
 */
export const VALID_ACTIONS = new Set(Object.values(AuditAction));

/** Returns true if `action` is a registered AuditAction value. */
export const isKnownAction = (action) => VALID_ACTIONS.has(action);