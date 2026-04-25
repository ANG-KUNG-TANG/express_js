import { createUserUsecase } from "../../app/user_uc/create_user.uc.js";
import { getUseByIdUc, getUserByEamilUc } from "../../app/user_uc/get_user.uc.js";
import { updateUserUseCase } from "../../app/user_uc/update_use.uc.js";
import { deleteUserUc } from "../../app/user_uc/delete_user.uc.js";
import { promoteUserToAdminUseCase } from "../../app/user_uc/promote_user.uc.js";
import { sendSuccess } from '../response_formatter.js';
import { HTTP_STATUS } from '../http_status.js';
import { sanitizeCreateInput, sanitizeUpdateInput } from "../input_sanitizers/user.input_sanitizer.js";
import { listAllUsersUseCase } from "../../app/user_uc/list_user.uc.js";
import logger from '../../core/logger/logger.js';
import { recordAudit } from '../../core/services/audit.service.js';
import { AuditAction } from '../../domain/base/audit_enums.js';

// FIX: removed stale imports for UserModel, sanitizeUser, and error classes that were only
// needed by the misplaced repo functions below — keeping them would hide future dead-import lint warnings.

// const REFRESH_COOKIE_OPTIONS = {
//     httpOnly: true,
//     secure:   process.env.NODE_ENV === 'production',
//     sameSite: 'strict',
//     maxAge:   7 * 24 * 60 * 60 * 1000,
// };

// ---------------------------------------------------------------------------
// Create user  (POST /users)
// ---------------------------------------------------------------------------

export const createUser = async (req, res) => {
    const input = sanitizeCreateInput(req.body);

    logger.debug('user.createUser called', { requestId: req.id, email: input.email });

    const user = await createUserUsecase(input);

    recordAudit(AuditAction.USER_CREATED, user.id ?? user._id, {
        email: user.email ?? user._email,
        role:  user.role  ?? user._role,
    }, req);

    return sendSuccess(res, user, HTTP_STATUS.CREATED);
};

// ---------------------------------------------------------------------------
// Get user by ID  (GET /users/:id)
// ---------------------------------------------------------------------------

export const getUserById = async (req, res) => {
    const { id } = req.params;

    logger.debug('user.getUserById called', { requestId: req.id, targetUserId: id });

    const user = await getUseByIdUc(id);

    return sendSuccess(res, user, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Get user by email  (GET /users/email/:email)
// ---------------------------------------------------------------------------

export const getUserByEamil = async (req, res) => {
    const { email } = req.params;

    logger.debug('user.getUserByEmail called', { requestId: req.id, email });

    const user = await getUserByEamilUc(email);

    return sendSuccess(res, user, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// List all users  (GET /users)
// ---------------------------------------------------------------------------

export const listUsers = async (req, res) => {
    logger.debug('user.listUsers called', { requestId: req.id });

    const users = await listAllUsersUseCase();

    logger.debug('user.listUsers: returned results', { requestId: req.id, count: users.length });

    return sendSuccess(res, users, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Update user  (PATCH /users/:id)
// ---------------------------------------------------------------------------

export const updateUser = async (req, res) => {
    const { id } = req.params;
    const updates = sanitizeUpdateInput(req.body);

    logger.debug('user.updateUser called', { requestId: req.id, targetUserId: id, fields: Object.keys(updates) });

    const user = await updateUserUseCase(id, updates);

    recordAudit(AuditAction.USER_UPDATED, req.user?.id ?? null, {
        targetUserId:  id,
        updatedFields: Object.keys(updates),
    }, req);

    return sendSuccess(res, user, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Delete user  (DELETE /users/:id)
// ---------------------------------------------------------------------------

// FIX: removed updateProfileInfo, updateAvatarUrl, updateCoverUrl, addAttachemet,
// getAttachments, and authenticateUser — these are repository-layer functions that
// were copy-pasted here by mistake. They referenced `mongoose` and `toDomain` without
// importing either (guaranteed ReferenceError at runtime), and authenticateUser used
// plain string equality for password comparison instead of hashed verification
// (security vulnerability). All correct implementations live in user_repo.js.

export const deleteUser = async (req, res) => {
    const { id } = req.params;

    logger.debug('user.deleteUser called', { requestId: req.id, targetUserId: id });

    const result = await deleteUserUc(id);

    recordAudit(AuditAction.USER_DELETED_GENERAL, req.user?.id ?? null, { targetUserId: id }, req);

    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Promote user to admin  (PATCH /users/:id/promote)
// ---------------------------------------------------------------------------

export const promoteUser = async (req, res) => {
    const { id } = req.params;

    logger.debug('user.promoteUser called', { requestId: req.id, targetUserId: id });

    const user = await promoteUserToAdminUseCase(id);

    recordAudit(AuditAction.USER_PROMOTED_TO_ADMIN, req.user?.id ?? null, { targetUserId: id }, req);

    return sendSuccess(res, user, HTTP_STATUS.OK);
};