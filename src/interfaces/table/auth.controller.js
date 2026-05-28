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
import { verifyEmailUc }                           from '../../app/user_uc/verify_email.uc.js'; // Added missing use case import
import * as authService                            from '../../core/services/auth.service.js';
import { passwordResetTokenRepo as tokenRepo }     from '../../infrastructure/repositories/password_reset_token_repo.js';
import * as userRepo                               from '../../infrastructure/repositories/user_repo.js';
import { emailService }                            from '../../core/services/email.service.js';
import { BadRequestError }                         from '../../core/errors/base.errors.js';
import { EMAIL_VERIFY_TTL_MS }                     from '../../domain/base/token_ttl.js';

/**
 * Higher-Order Function to pass asynchronous runtime errors down 
 * safely into your global Express error-handling middleware.
 */
const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ===========================================================================
// Login (POST /auth/login)
// ===========================================================================
export const loginUser = catchAsync(async (req, res) => {
    const input = sanitizeAuthInput(req.body);
    logger.debug('auth.loginUser called', { requestId: req.id, email: input.email });

    const user = await authenticateUserUseCase(input, req);
    const { accessToken } = await authService.createSession(res, user, req);

    return sendSuccess(res, {
        token: accessToken,
        user: {
            id:    user.id,
            email: user.email,
            role:  user.role,
            name:  user.name,
        },
    }, HTTP_STATUS.OK);
});

// ===========================================================================
// Register (POST /auth/register)
// ===========================================================================
export const registerUser = catchAsync(async (req, res) => {
    const input = sanitizeCreateInput(req.body);
    logger.debug('auth.registerUser called', { requestId: req.id, email: input.email });

    const user = await createUserUsecase(input);
    const { accessToken } = await authService.createSession(res, user, req);

    recordAudit(AuditAction.USER_CREATED, user.id, {
        email: user.email,
        role:  user.role,
    }, req);

    return sendSuccess(res, {
        token:   accessToken,
        message: 'Account created. Please check your email to verify your address before logging in.',
    }, HTTP_STATUS.CREATED);
});

// ===========================================================================
// Verify Email (GET /auth/verify-email?token=...)
// ===========================================================================
export const verifyEmail = catchAsync(async (req, res) => {
    const { token } = req.query;
    if (!token) throw new BadRequestError('Verification token is required.');

    logger.debug('auth.verifyEmail initiating verification worker', { requestId: req.id });

    // FIX: Completely offloaded db/cache manipulation down into your optimized Redis verify usecase
    await verifyEmailUc(token);

    return sendSuccess(res, { message: 'Email verified. You can now log in.' }, HTTP_STATUS.OK);
});

// ===========================================================================
// Resend Verification (POST /auth/resend-verification)
// ===========================================================================
export const resendVerification = catchAsync(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new BadRequestError('Email is required.');

    const SAFE_RESPONSE = {
        message: 'If that email is registered and unverified, a new link has been sent.',
    };

    let user = null;
    try {
        user = await userRepo.findByEmail(email.toLowerCase());
    } catch {
        // Enforce strong security alignment: never leak if an account exists or not
        return sendSuccess(res, SAFE_RESPONSE, HTTP_STATUS.OK);
    }

    if (!user || user.isVerified) {
        return sendSuccess(res, SAFE_RESPONSE, HTTP_STATUS.OK);
    }

    await tokenRepo.deleteByUserId(user.id);

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);

    const tokenEntity = new PasswordResetToken({
        id:        new UniqueId().generator(),
        userId:    user.id,
        tokenHash,
        expiresAt,
        used:      false,
    });

    await tokenRepo.create(tokenEntity);

    emailService.sendVerificationEmail({
        toEmail:  user.email,
        userName: user.name,
        rawToken,
    }).catch((err) => {
        logger.error('auth.resendVerification: email send failed', { err: err.message });
    });

    return sendSuccess(res, SAFE_RESPONSE, HTTP_STATUS.OK);
});

// ===========================================================================
// OAuth Initiators (Passed synchronously down to passport engines)
// ===========================================================================
export const googleAuth = (req, res, next) =>
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);

export const githubAuth = (req, res, next) =>
    passport.authenticate('github', { scope: ['user:email'], session: false })(req, res, next);

// ===========================================================================
// OAuth Callbacks
// ===========================================================================
const oauthCallback = (provider) => [
    (req, res, next) =>
        passport.authenticate(provider, {
            session:         false,
            failureRedirect: '/pages/auth/auth_fail.html?message=Authentication+failed',
        })(req, res, next),

    catchAsync(async (req, res) => {
        const user = req.user;

        if (!user.isVerified) {
            logger.debug(`auth.oauthCallback: new ${provider} user, awaiting verification`, {
                requestId: req.id,
                userId:    user.id,
            });
            return res.redirect('/pages/auth/auth_success.html?pending=verify');
        }

        const { accessToken } = await authService.createSession(res, user, req);

        logger.debug(`auth.oauthCallback: ${provider} login successful`, {
            requestId: req.id,
            userId:    user.id,
            provider,
        });

        const safeUser = {
            id:    user.id,
            email: user.email,
            role:  user.role,
            name:  user.name,
        };

        const userBase64 = Buffer.from(JSON.stringify(safeUser)).toString('base64');
        return res.redirect(`/pages/auth/auth_success.html?token=${accessToken}&user=${userBase64}`);
    }),
];

export const googleCallback = oauthCallback('google');
export const githubCallback = oauthCallback('github');

// ===========================================================================
// Refresh Tokens (POST /auth/refresh)
// ===========================================================================
export const refreshTokens = catchAsync(async (req, res) => {
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
                logger.error('auth.refreshTokens: unexpected error', { requestId: req.id, error: err.message });
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error' });
        }
    }
});

// ===========================================================================
// Logout (POST /auth/logout)
// ===========================================================================
export const logout = catchAsync(async (req, res) => {
    await authService.revokeSession(req, res);
    return sendSuccess(res, { message: 'Logged out successfully' }, HTTP_STATUS.OK);
});

// ===========================================================================
// Failure Fallback
// ===========================================================================
export const authFailure = (req, res) => {
    logger.warn('auth.authFailure: OAuth authentication failed', { requestId: req.id });
    return res.redirect('/pages/auth/auth_fail.html?message=OAuth+authentication+failed');
};