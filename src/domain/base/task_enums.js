export const WritingStatus = Object.freeze({
    ASSIGNED:  'ASSIGNED',
    WRITING:   'WRITING',
    SUBMITTED: 'SUBMITTED',
    REVIEWED:  'REVIEWED',
    SCORED:    'SCORED',
});

export const TaskType = Object.freeze({
    TASK_1: 'TASK_1',
    TASK_2: 'TASK_2',
});

export const ExamType = Object.freeze({
    ACADEMIC: 'ACADEMIC',
    GENERAL:  'GENERAL',
});

// ─── Task Source ────────────────────────────────────────────────────────────
export const TaskSource = Object.freeze({
  SELF: 'self',
  TEACHER_NEW: 'teacher_new',           // teacher wrote brand-new task
  TEACHER_EXISTING: 'teacher_existing', // teacher cloned from pool
  TEACHER_TOPIC: 'teacher_topic',       // teacher picked topic/type, student writes
});

// ─── Assignment Status ───────────────────────────────────────────────────────
export const AssignmentStatus = Object.freeze({
  PENDING_ACCEPTANCE: 'pending_acceptance',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
});

// ─── Notification Types (add these to your existing noti enums) ───────────────
export const AssignmentNotiType = Object.freeze({
  TASK_ASSIGNED: 'TASK_ASSIGNED',       // student: teacher assigned a task
  TASK_DECLINED: 'TASK_DECLINED',       // teacher: student declined
  TASK_REMINDER: 'TASK_REMINDER',       // student: due in 24h
  TASK_UNSTARTED: 'TASK_UNSTARTED',     // student: still not started after X days
  TASK_SUBMITTED: 'TASK_SUBMITTED',     // teacher: student submitted
  TASK_SCORED: 'TASK_SCORED',           // student: teacher scored it
});