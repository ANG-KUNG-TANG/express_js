// Route: PATCH /api/admin/users/:studentId/link-teacher    body: { teacherId }
// Route: PATCH /api/admin/users/:studentId/unlink-teacher

import { findUserById, updateUser, sanitizeUser } from '../../infrastructure/repositories/user_repo.js';
import { NotificationService }                    from '../../core/services/notification.service.js';
import { redisDel, CacheKeys }                    from '../../core/services/redis.service.js';
import { UserRole }                               from '../../domain/base/user_enums.js';
import {
    NotFoundError,
    ValidationError,
    ForbiddenError,
} from '../../core/errors/base.errors.js';
import logger from '../../core/logger/logger.js';

// Helper — builds the student-list cache key the same way teacher_list_students.uc.js does.
const studentListKey = (teacherId) =>
    CacheKeys.teacherStudentList
        ? CacheKeys.teacherStudentList(String(teacherId))
        : `teacher:${teacherId}:students`;

export const adminLinkStudentToTeacherUC = async (adminId, studentId, teacherId) => {
    logger.debug('adminLinkStudentToTeacherUC', { studentId, teacherId });

    if (!teacherId) throw new ValidationError('teacherId is required in request body');
    
    // 1. Verify student exists and is not admin/teacher
    const student = await findUserById(studentId);
    if (!student) throw new NotFoundError('Student not found');

    const studentRole = student._role ?? student.role;
    if (studentRole === UserRole.ADMIN   || studentRole === 'admin') {
        throw new ForbiddenError('Cannot link an admin to a teacher');
    }
    if (studentRole === UserRole.TEACHER || studentRole === 'teacher') {
        throw new ForbiddenError('Target user is already a teacher — cannot be linked as a student');
    }

    // 2. Verify teacher exists and has teacher/admin role
    const teacher = await findUserById(teacherId);
    if (!teacher) throw new NotFoundError('Teacher not found');

    const teacherRole = teacher._role ?? teacher.role;
    if (teacherRole !== UserRole.TEACHER && teacherRole !== 'teacher' &&
        teacherRole !== UserRole.ADMIN   && teacherRole !== 'admin') {
        throw new ForbiddenError('Target user does not have the teacher role');
    }

    // 3. Persist the link
    const updated = await updateUser(studentId, { assignedTeacher: teacherId });
    logger.info('adminLinkStudentToTeacherUC: linked', { studentId, teacherId });

    // 4. Bust student-list cache for the NEW teacher so their dashboard
    //    shows the freshly linked student immediately.
    await redisDel(studentListKey(teacherId));

    // Also bust the OLD teacher's cache if the student was previously linked
    // to a different teacher — they should no longer see this student.
    const oldTeacherId = student._assignedTeacher ?? student.assignedTeacher;
    if (oldTeacherId && String(oldTeacherId) !== String(teacherId)) {
        await redisDel(studentListKey(oldTeacherId));
        logger.debug('adminLinkStudentToTeacherUC: busted old teacher cache', { oldTeacherId });
    }

    // 5. Notify student — fire-and-forget
    const teacherName = teacher._name ?? teacher.name ?? 'A teacher';
    NotificationService.send({
        recipientId: studentId,
        actorId:     adminId,
        type:        NotificationService.TYPES.TEACHER_LINKED,
        title:       'Teacher assigned',
        message:     `${teacherName} has been assigned as your teacher`,
        refId:       teacherId,
        refModel:    'User',
    });

    return sanitizeUser(updated);
};

export const adminUnlinkStudentFromTeacherUC = async (adminId, studentId) => {
    logger.debug('adminUnlinkStudentFromTeacherUC', { studentId });

    const student = await findUserById(studentId);
    if (!student) throw new NotFoundError('Student not found');

    // Capture teacher id BEFORE wiping it so we can bust their cache
    const oldTeacherId = student._assignedTeacher ?? student.assignedTeacher;

    const updated = await updateUser(studentId, { assignedTeacher: null });
    logger.info('adminUnlinkStudentFromTeacherUC: unlinked', { studentId });

    // Bust the teacher's student-list cache so they no longer see this student
    if (oldTeacherId) {
        await redisDel(studentListKey(oldTeacherId));
        logger.debug('adminUnlinkStudentFromTeacherUC: busted teacher cache', { oldTeacherId });
    }

    // Notify student their teacher link was removed — fire-and-forget
    NotificationService.send({
        recipientId: studentId,
        actorId:     adminId,
        type:        NotificationService.TYPES.TEACHER_LINKED,
        title:       'Teacher assignment removed',
        message:     'Your teacher assignment has been removed by an admin',
        refId:       studentId,
        refModel:    'User',
    });

    return sanitizeUser(updated);
};