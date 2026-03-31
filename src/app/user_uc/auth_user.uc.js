import { InvalidCredentialsError }                        from '../../core/errors/user.errors.js';
import { verifyPassword }                                  from '../validators/password_hash.js';
import { validateRequired, validateEmail }                 from '../validators/user_validator.js';
import { findUserByEmailWithPassword, sanitizeUser }       from '../../infrastructure/repositories/user_repo.js';
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

    if (!user || !verifyPassword(password, user._password)) {
        // Record failed login — no userId available, store email in details
        recordFailure(AuditAction.AUTH_LOGIN, null, { email: email.toLowerCase(), reason: 'invalid credentials' }, req);
        throw new InvalidCredentialsError();
    }

    const sanitized = sanitizeUser(user);

    // Record successful login
    recordAudit(AuditAction.AUTH_LOGIN, sanitized.id ?? sanitized._id, {
        email: sanitized.email ?? sanitized._email,
        role:  sanitized.role  ?? sanitized._role,
    }, req);

    return sanitized;
};