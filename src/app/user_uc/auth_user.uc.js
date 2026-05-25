import { InvalidCredentialsError, EmailNotVerifiedError, AccountSuspendedError } from '../../core/errors/user.errors.js';
import { verifyPassword }              from '../validators/password_hash.js';
import { validateRequired, validateEmail } from '../validators/user_validator.js';
import { findUserByEmailWithPassword } from '../../infrastructure/repositories/user_repo.js';
import { sanitizeUser }                from '../../infrastructure/mapper/user.mapper.js';
import { recordAudit, recordFailure }  from '../../core/services/audit.service.js';
import { AuditAction }                 from '../../domain/base/audit_enums.js';

const validateAuthInput = ({ email, password }) => {
    validateRequired(email, 'email');
    validateEmail(email);
    validateRequired(password, 'password');
};

// req is passed in from the controller so the audit log captures IP + userAgent
export const authenticateUserUseCase = async ({ email, password }, req = null) => {
    validateAuthInput({ email, password });

    const normalizedEmail = email.toLowerCase();

    // Catch UserEmailNotFoundError and convert to InvalidCredentialsError to
    // prevent email enumeration — caller can't tell if the email doesn't exist
    // or the password was wrong.
    let user;
    try {
        user = await findUserByEmailWithPassword(normalizedEmail);
    } catch {
        recordFailure(AuditAction.AUTH_LOGIN, null, {
            email:  normalizedEmail,
            reason: 'email not found',
        }, req);
        throw new InvalidCredentialsError();
    }

    // 1. Credential check
    const passwordValid = await verifyPassword(password, user._password ?? user.password);
    if (!passwordValid) {
        recordFailure(AuditAction.AUTH_LOGIN, user._id ?? user.id, {
            email:  normalizedEmail,
            reason: 'invalid password',
        }, req);
        throw new InvalidCredentialsError();
    }

    // 2. Email verified check — admins are exempt
    const isAdmin = (user.role ?? user._role) === 'admin';
    if (!isAdmin && !user.isVerified) {
        recordFailure(AuditAction.AUTH_LOGIN, user._id ?? user.id, {
            email:  normalizedEmail,
            reason: 'email not verified',
        }, req);
        throw new EmailNotVerifiedError();
    }

    // 3. Account active check
    if (!user.isActive) {
        recordFailure(AuditAction.AUTH_LOGIN, user._id ?? user.id, {
            email:  normalizedEmail,
            reason: 'account suspended',
        }, req);
        throw new AccountSuspendedError();
    }

    const sanitized = sanitizeUser(user);

    recordAudit(AuditAction.AUTH_LOGIN, sanitized.id ?? sanitized._id, {
        email: sanitized.email ?? sanitized._email,
        role:  sanitized.role  ?? sanitized._role,
    }, req);

    return sanitized;
};