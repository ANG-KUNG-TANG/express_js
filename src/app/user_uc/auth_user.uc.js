import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { InvalidCredentialsError, EmailNotVerifiedError, AccountSuspendedError } from '../../core/errors/user.errors.js';
import { validateRequired, validateEmail } from '../../domain/validators/user_validator.js';
import { toResponseDTO } from '../../infrastructure/mapper/user.mapper.js';
import { recordAudit, recordFailure } from '../../core/services/audit.service.js';
import { AuditAction } from '../../domain/base/audit_enums.js';
import { UserRole } from '../../domain/base/user_enums.js';

const validateAuthInput = ({ email, password }) => {
    validateRequired(email, 'email');
    validateEmail(email);
    validateRequired(password, 'password');
};

/**
 * authenticateUserUseCase — Orchestrates user sign-in validation and account guard status checks.
 */
export const authenticateUserUseCase = async ({ email, password }, req = null) => {
    // 1. Guard input boundary conditions
    validateAuthInput({ email, password });
    const normalizedEmail = email.toLowerCase().trim();

    let userEntity;
    try {
        // Leverages your existing repo-layer verification strategy.
        // Catches any internal lookup or crypto failures and standardizes them.
        userEntity = await userRepo.authenticateUser(normalizedEmail, password);
    } catch (err) {
        // Defends against account enumeration attacks
        recordFailure(AuditAction.AUTH_LOGIN, null, {
            email: normalizedEmail,
            reason: 'invalid credentials context',
        }, req);
        throw new InvalidCredentialsError();
    }

    // 2. State-Based Business Rule Guards (Checked safely via clean Entity properties)
    
    // Exception: Admins are exempt from email verification checks
    const isAdmin = userEntity.role === UserRole.ADMIN;
    if (!isAdmin && !userEntity.isVerified) {
        recordFailure(AuditAction.AUTH_LOGIN, userEntity.id, {
            email: normalizedEmail,
            reason: 'email not verified',
        }, req);
        throw new EmailNotVerifiedError();
    }

    // Check account freeze status
    if (!userEntity.isActive) {
        recordFailure(AuditAction.AUTH_LOGIN, userEntity.id, {
            email: normalizedEmail,
            reason: 'account suspended',
        }, req);
        throw new AccountSuspendedError();
    }

    // 3. Document login timestamp to DB asynchronously (Non-blocking)
    userRepo.updateLastLogin(userEntity.id).catch((err) => 
        console.error(`[authUseCase] Failed to log login time for user ${userEntity.id}:`, err.message)
    );

    // 4. Map to clear, predictable presentation DTO contract
    const userDTO = toResponseDTO(userEntity);

    // 5. Commit audit and return sanitized object
    recordAudit(AuditAction.AUTH_LOGIN, userDTO.id, {
        email: userDTO.email,
        role:  userDTO.role,
    }, req);

    return userDTO;
};