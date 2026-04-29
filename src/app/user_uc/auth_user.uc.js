import { InvalidCredentialsError }                        from '../../core/errors/user.errors.js';
import { verifyPassword }                                  from '../validators/password_hash.js';
import { validateRequired, validateEmail }                 from '../validators/user_validator.js';
import { findUserByEmailWithPassword}                      from '../../infrastructure/repositories/user_repo.js'
import { sanitizeUser } from '../../infrastructure/mapper/user.mapper.js';
import { recordAudit, recordFailure }                      from '../../core/services/audit.service.js';
import { AuditAction }                                     from '../../domain/base/audit_enums.js';

const validateAuthInput = ({ email, password }) => {
    validateRequired(email, 'email');
    validateEmail(email);
    validateRequired(password, 'password');
};

// req is passed in from the controller so the audit log captures IP + userAgent
export const authenticateUserUseCase = async ({ email, password }, req = null) => {
    validateAuthInput({ email, password });

    const user = await findUserByEmailWithPassword(email.toLowerCase());

    if (user && user.provider && user.provider !== 'local') {
        // FIX: was `recodFailure` (typo) — caused a ReferenceError crash before throw
        recordFailure(AuditAction.AUTH_LOGIN, user._id, {
            email:  email.toLowerCase(),
            reason: 'oauth user tried password login'
        }, req);

        throw new InvalidCredentialsError("User OAuth login");
    }
    
    if (!user || !verifyPassword(password, user._password)) {
        recordFailure(AuditAction.AUTH_LOGIN, null, {
            email:  email.toLowerCase(),
            reason: 'invalid credentials'
        }, req);
        throw new InvalidCredentialsError();
    }

    const sanitized = sanitizeUser(user);

    recordAudit(AuditAction.AUTH_LOGIN, sanitized.id ?? sanitized._id, {
        email: sanitized.email ?? sanitized._email,
        role:  sanitized.role  ?? sanitized._role,
    }, req);

    return sanitized;
};