import * as userService from '../../core/services/user_service.js';
import { UserNotFoundError, UserValidationError } from '../../core/errors/user.errors.js';

const MAX_BULK = 200;

export const adminBulkAssignTeacherUC = async (requesterId, { studentIds, teacherId } = {}) => {
    // 1. Input Validation
    if (!teacherId) throw new UserValidationError('teacherId is required');
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new UserValidationError('studentIds must be a non-empty array');
    }
    if (studentIds.length > MAX_BULK) {
        throw new UserValidationError(`Limit exceeded: max ${MAX_BULK}`);
    }

    // 2. Business Logic: Verify Teacher
    const teacher = await userService.findUserById(teacherId);
    if (teacher.role !== 'teacher') {
        throw new UserValidationError(`User ${teacherId} is not a teacher`);
    }

    // 3. Sanitization
    const safeIds = studentIds.filter(id => id !== requesterId);
    if (safeIds.length === 0) throw new UserValidationError('No valid student IDs provided');

    // 4. Delegate to Service (Handles Repo + Audit)
    return await userService.bulkAssignTeacher(safeIds, teacherId, requesterId);
};