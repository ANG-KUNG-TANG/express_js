// interfaces/table/auth.controller.js

import passport                                    from 'passport';
import crypto                                      from 'crypto';
import { UniqueId }                                from '../../domain/base/id_generator.js';
import { PasswordResetToken }                      from '../../domain/entities/password_reset_token_entity.js';
import { sanitizeAuthInput, sanitizeCreateInput }  from '../input_sanitizers/user.input_sanitizer.js';
import { sendSuccess }                             from '../response_formatter.js';
import { HTTP_STATUS }                             from '../http_status.js';
import logger                                      from '../../core/logger/logger.js';
import { recordAudit }                             from '../../core/services/audit.service.js';
import { AuditAction }                             from '../../domain/base/audit_enums.js';
import { authenticateUserUseCase }                 from '../../app/user_uc/auth_user.uc.js';
import { createUserUsecase }                       from '../../app/user_uc/create_user.uc.js';
import * as authService                            from '../../core/services/auth.service.js';
import { passwordResetTokenRepo as tokenRepo }     from '../../infrastructure/repositories/password_reset_token_repo.js';
import * as userRepo                               from '../../infrastructure/repositories/user_repo.js';
import { emailService }                            from '../../core/services/email.service.js';
import { BadRequestError }                         from '../../core/errors/base.errors.js';
import { EMAIL_VERIFY_TTL_MS }                     from '../../domain/base/token_ttl.js';

// ---------------------------------------------------------------------------
// Login  (POST /auth/login)
// ---------------------------------------------------------------------------
export const loginUser = async (req, res) => {
    const input = sanitizeAuthInput(req.body);
    logger.debug('auth.loginUser called', { requestId: req.id, email: input.email });

    const user = await authenticateUserUseCase(input, req);
    const { accessToken } = await authService.createSession(res, user, req);

    return sendSuccess(res, {
        token: accessToken,
        user: {
            id:    user.id    ?? user._id,
            email: user.email ?? user._email,
            role:  user.role  ?? user._role,
            name:  user.name  ?? user._name,
        },
    }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Register  (POST /auth/register)
// ---------------------------------------------------------------------------
export const registerUser = async (req, res) => {
    const input = sanitizeCreateInput(req.body);
    logger.debug('auth.registerUser called', { requestId: req.id, email: input.email });

    const user = await createUserUsecase(input);
    const { accessToken } = await authService.createSession(res, user);

    recordAudit(AuditAction.USER_CREATED, user.id ?? user._id, {
        email: user.email ?? user._email,
        role:  user.role  ?? user._role,
    }, req);

    return sendSuccess(res, {
        token:   accessToken,
        message: 'Account created. Please check your email to verify your address before logging in.',
    }, HTTP_STATUS.CREATED);
};

// ---------------------------------------------------------------------------
// Verify email  (GET /auth/verify-email?token=...)
// ---------------------------------------------------------------------------
export const verifyEmail = async (req, res) => {
    const { token } = req.query;
    if (!token) throw new BadRequestError('Verification token is required.');

    // findByToken hashes the raw token internally before querying —
    // we never store or compare raw tokens directly
    const record = await tokenRepo.findByToken(token);
    if (!record) throw new BadRequestError('This verification link is invalid or has already been used.');

    // assertValid() throws PasswordResetTokenExpiredError if past expiresAt
    // or PasswordResetTokenAlreadyUsedError if already used
    record.assertValid();

    await userRepo.updateUser(record.userId, { isVerified: true });
    await tokenRepo.deleteById(record.id);

    logger.debug('auth.verifyEmail: email verified', { requestId: req.id, userId: record.userId });

    return sendSuccess(res, { message: 'Email verified. You can now log in.' }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Resend verification  (POST /auth/resend-verification)
// ---------------------------------------------------------------------------
export const resendVerification = async (req, res) => {
    const { email } = req.body;
    if (!email) throw new BadRequestError('Email is required.');

    const SAFE_RESPONSE = {
        message: 'If that email is registered and unverified, a new link has been sent.',
    };

    // Always return 200 — never reveal whether the email exists
    let user = null;
    try {
        user = await userRepo.findByEmail(email.toLowerCase());
    } catch {
        return sendSuccess(res, SAFE_RESPONSE, HTTP_STATUS.OK);
    }

    if (!user || user.isVerified) {
        return sendSuccess(res, SAFE_RESPONSE, HTTP_STATUS.OK);
    }

    // Delete all existing verification tokens for this user before issuing a new one
    await tokenRepo.deleteByUserId(user.id ?? user._id);

    // Hash before storing — raw token goes in the email link only
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);

    const tokenEntity = new PasswordResetToken({
        id:        new UniqueId().generator(),
        userId:    user.id ?? user._id,
        tokenHash,
        expiresAt,
        used:      false,
    });

    await tokenRepo.create(tokenEntity);

    emailService.sendVerificationEmail({
        toEmail:  user.email ?? user._email,
        userName: user.name  ?? user._name,
        rawToken,
    }).catch((err) => {
        logger.error('auth.resendVerification: email send failed', { err: err.message });
    });

    return sendSuccess(res, SAFE_RESPONSE, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// OAuth initiators
// ---------------------------------------------------------------------------
export const googleAuth = (req, res, next) =>
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);

export const githubAuth = (req, res, next) =>
    passport.authenticate('github', { scope: ['user:email'], session: false })(req, res, next);

// ---------------------------------------------------------------------------
// OAuth callbacks  (GET /auth/google/callback  |  GET /auth/github/callback)
// ---------------------------------------------------------------------------
const oauthCallback = (provider) => [
    (req, res, next) =>
        passport.authenticate(provider, {
            session:         false,
            failureRedirect: '/pages/auth/auth_fail.html?message=Authentication+failed',
        })(req, res, next),

    async (req, res) => {
        const user = req.user;

        if (!user.isVerified) {
            logger.debug(`auth.oauthCallback: new ${provider} user, awaiting verification`, {
                requestId: req.id,
                userId:    user.id ?? user._id,
            });
            return res.redirect('/pages/auth/auth_success.html?pending=verify');
        }

        const { accessToken } = await authService.createSession(res, user, req);

        logger.debug(`auth.oauthCallback: ${provider} login successful`, {
            requestId: req.id,
            userId:    user.id ?? user._id,
            provider,
        });

        const safeUser = {
            id:    user.id    ?? user._id,
            email: user.email ?? user._email,
            role:  user.role  ?? user._role,
            name:  user.name  ?? user._name,
        };

        const userBase64 = Buffer.from(JSON.stringify(safeUser)).toString('base64');
        return res.redirect(`/pages/auth/auth_success.html?token=${accessToken}&user=${userBase64}`);
    },
];

export const googleCallback = oauthCallback('google');
export const githubCallback = oauthCallback('github');

// ---------------------------------------------------------------------------
// Refresh  (POST /auth/refresh)
// ---------------------------------------------------------------------------
export const refreshTokens = async (req, res) => {
    try {
        const { accessToken } = await authService.rotateSession(req, res);
        return sendSuccess(res, { accessToken }, HTTP_STATUS.OK);
    } catch (err) {
        switch (err.message) {
            case 'NO_TOKEN':
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'No refresh token provided' });
            case 'INVALID_OR_EXPIRED':
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'Invalid or expired refresh token' });
            case 'REUSE_DETECTED':
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'Refresh token reuse detected' });
            default:
                logger.error('auth.refreshTokens: unexpected error', { requestId: req.id, error: err });
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error' });
        }
    }
};

// ---------------------------------------------------------------------------
// Logout  (POST /auth/logout)
// ---------------------------------------------------------------------------
export const logout = async (req, res) => {
    await authService.revokeSession(req, res);
    return sendSuccess(res, { message: 'Logged out successfully' }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Failure fallback  (GET /auth/failure)
// ---------------------------------------------------------------------------
export const authFailure = (req, res) => {
    logger.warn('auth.authFailure: OAuth authentication failed', { requestId: req.id });
    return res.redirect('/pages/auth/auth_fail.html?message=OAuth+authentication+failed');
};