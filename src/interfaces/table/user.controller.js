import { createUserUsecase } from "../../app/user_uc/create_user.uc.js";
import { getUserByIdUc, getUserByEmailUc } from "../../app/user_uc/get_user.uc.js";
import { updateUserUseCase } from "../../app/user_uc/update_user.uc.js";
import { deleteUserUc } from "../../app/user_uc/delete_user.uc.js";
import { promoteUserToAdminUseCase } from "../../app/user_uc/promote_user.uc.js";
import { listAllUsersUseCase } from "../../app/user_uc/list_user.uc.js";
import { sendSuccess } from '../response_formatter.js';
import { HTTP_STATUS } from '../http_status.js';
import { sanitizeCreateInput, sanitizeUpdateInput } from "../input_sanitizers/user.input_sanitizer.js";
import logger from '../../core/logger/logger.js';
import { recordAudit } from '../../core/services/audit.service.js';
import { AuditAction } from '../../domain/base/audit_enums.js';

/**
 * Higher-Order Function to catch async unhandled promise rejections.
 * Bypasses the need for repetitive try/catch blocks across every method,
 * safely piping errors downward into your global error middleware.
 */
const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ===========================================================================
// Create User (POST /users)
// ===========================================================================
export const createUser = catchAsync(async (req, res) => {
    const input = sanitizeCreateInput(req.body);

    logger.debug('user.createUser called', { requestId: req.id, email: input.email });

    const user = await createUserUsecase(input);

    recordAudit(AuditAction.USER_CREATED, user.id, {
        email: user.email,
        role:  user.role,
    }, req);

    return sendSuccess(res, user, HTTP_STATUS.CREATED);
});

// ===========================================================================
// Get User By ID (GET /users/:id)
// ===========================================================================
export const getUserById = catchAsync(async (req, res) => {
    const { id } = req.params;

    logger.debug('user.getUserById called', { requestId: req.id, targetUserId: id });

    // Hits your lightning-fast Redis Cache-Aside pattern
    const user = await getUserByIdUc(id);

    return sendSuccess(res, user, HTTP_STATUS.OK);
});

// ===========================================================================
// Get User By Email (GET /users/email/:email)
// ===========================================================================
export const getUserByEamil = catchAsync(async (req, res) => {
    const { email } = req.params;

    logger.debug('user.getUserByEmail called', { requestId: req.id, email });

    const user = await getUserByEmailUc(email);

    return sendSuccess(res, user, HTTP_STATUS.OK);
});

// ===========================================================================
// List All Users (GET /users)
// ===========================================================================
export const listUsers = catchAsync(async (req, res) => {
    logger.debug('user.listUsers called', { requestId: req.id });

    const users = await listAllUsersUseCase();

    logger.debug('user.listUsers: returned results', { requestId: req.id, count: users.length });

    return sendSuccess(res, users, HTTP_STATUS.OK);
});

// ===========================================================================
// Update User (PATCH /users/:id)
// ===========================================================================
export const updateUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const updates = sanitizeUpdateInput(req.body);

    logger.debug('user.updateUser called', { requestId: req.id, targetUserId: id, fields: Object.keys(updates) });

    // Mutates database and auto-invalidates associated Redis cache layers
    const user = await updateUserUseCase(id, updates);

    recordAudit(AuditAction.USER_UPDATED, req.user?.id ?? null, {
        targetUserId:  id,
        updatedFields: Object.keys(updates),
    }, req);

    return sendSuccess(res, user, HTTP_STATUS.OK);
});

// ===========================================================================
// Delete User (DELETE /users/:id)
// ===========================================================================
export const deleteUser = catchAsync(async (req, res) => {
    const { id } = req.params;

    logger.debug('user.deleteUser called', { requestId: req.id, targetUserId: id });

    const result = await deleteUserUc(id);

    recordAudit(AuditAction.USER_DELETED_GENERAL, req.user?.id ?? null, { targetUserId: id }, req);

    return sendSuccess(res, result, HTTP_STATUS.OK);
});

// ===========================================================================
// Promote User To Admin (PATCH /users/:id/promote)
// ===========================================================================
export const promoteUser = catchAsync(async (req, res) => {
    const { id } = req.params;

    logger.debug('user.promoteUser called', { requestId: req.id, targetUserId: id });

    const user = await promoteUserToAdminUseCase(id);

    recordAudit(AuditAction.USER_PROMOTED_TO_ADMIN, req.user?.id ?? null, { targetUserId: id }, req);

    return sendSuccess(res, user, HTTP_STATUS.OK);
});