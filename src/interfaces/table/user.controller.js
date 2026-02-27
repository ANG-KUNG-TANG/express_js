import { createUserUsecase } from "../../app/user_uc/create_user.uc.js";
import { authenticateUserUseCase } from "../../app/user_uc/auth_User.uc.js";
import { getUseByIdUc, getUserByEamilUc } from "../../app/user_uc/get_user.uc.js";
import { updateUserUseCase } from "../../app/user_uc/update_use.uc.js";
import { deleteUserUc } from "../../app/user_uc/delete_user.uc.js";
import { promoteUserToAdminUseCase } from "../../app/user_uc/promote_user.uc.js";
import { sendSuccess } from '../response_formatter.js';
import { HTTP_STATUS } from '../http_status.js';
import { sanitizeCreateInput, sanitizeUpdateInput, sanitizeAuthInput } from "./user.input_sanitizer.js";
import { generateTokenPair, verifyRefreshToken } from '../../core/services/jwt.service.js';
import { saveRefreshToken } from '../../core/services/token_store.service.js';
import { listAllUsersUseCase } from "../../app/user_uc/list_user.uc.js";
import logger from '../../core/logger/logger.js';
import auditLogger from '../../core/logger/audit.logger.js';

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
};

// ---------------------------------------------------------------------------
// Create user  (POST /users)
// ---------------------------------------------------------------------------

export const createUser = async (req, res) => {
    const input = sanitizeCreateInput(req.body);

    logger.debug('user.createUser called', { requestId: req.id, email: input.email });

    const user = await createUserUsecase(input);

    auditLogger.log('user.created', {
        userId: user.id ?? user._id,
        email: user.email ?? user._email,
        role: user.role ?? user._role,
    }, req);

    return sendSuccess(res, user, HTTP_STATUS.CREATED);
};

// ---------------------------------------------------------------------------
// Login  (POST /users/login)
// ---------------------------------------------------------------------------

export const loginUser = async (req, res) => {
    const input = sanitizeAuthInput(req.body);

    logger.debug('user.loginUser called', { requestId: req.id, email: input.email });

    const user = await authenticateUserUseCase(input);

    const payload = {
        id:    user.id    ?? user._id,
        email: user.email ?? user._email,
        role:  user.role  ?? user._role,
    };

    const { accessToken, refreshToken } = generateTokenPair(payload);
    const decoded = verifyRefreshToken(refreshToken);
    saveRefreshToken(decoded.jti, payload.id);

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    auditLogger.log('user.login', {
        userId: payload.id,
        email: payload.email,
        role: payload.role,
    }, req);

    return sendSuccess(res, { accessToken, refreshToken }, HTTP_STATUS.OK);
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

    auditLogger.log('user.updated', {
        targetUserId: id,
        updatedFields: Object.keys(updates),
        requesterId: req.user?.id ?? null,
    }, req);

    return sendSuccess(res, user, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Delete user  (DELETE /users/:id)
// ---------------------------------------------------------------------------

export const deleteUser = async (req, res) => {
    const { id } = req.params;

    logger.debug('user.deleteUser called', { requestId: req.id, targetUserId: id });

    const result = await deleteUserUc(id);

    auditLogger.log('user.deleted', {
        targetUserId: id,
        requesterId: req.user?.id ?? null,
    }, req);

    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Promote user to admin  (PATCH /users/:id/promote)
// ---------------------------------------------------------------------------

export const promoteUser = async (req, res) => {
    const { id } = req.params;

    logger.debug('user.promoteUser called', { requestId: req.id, targetUserId: id });

    const user = await promoteUserToAdminUseCase(id);

    auditLogger.log('user.promoted_to_admin', {
        targetUserId: id,
        requesterId: req.user?.id ?? null,
    }, req);

    return sendSuccess(res, user, HTTP_STATUS.OK);
};