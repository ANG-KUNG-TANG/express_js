import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { UserValidationError } from '../../core/errors/user.errors.js';
import { hashPassword } from '../../domain/validators/password_hash.js';  
import { validateRequired, validatePasswordStrength } from '../../domain/validators/user_validator.js';
import { redisDel, CacheKeys } from '../../core/services/redis.service.js';
import { toResponseDTO } from '../../infrastructure/mapper/user.mapper.js';

const PASSWORD_MIN = 8;
const ALLOWED_FIELDS = ['name', 'email', 'password', 'role'];

const sanitizeUpdates = (updates) => {
    if (!updates || typeof updates !== 'object') return {};
    return Object.fromEntries(
        Object.entries(updates).filter(([key]) => ALLOWED_FIELDS.includes(key))
    );
};

/**
 * updateUserUseCase — Updates user properties in DB and cleanly clears matching Redis caches.
 */
export const updateUserUseCase = async (id, updates) => {
    validateRequired(id, 'id');
    const sanitized = sanitizeUpdates(updates);

    if (Object.keys(sanitized).length === 0) {
        throw new UserValidationError('No valid fields provided to update');
    }

    if (sanitized.password !== undefined) {
        validatePasswordStrength(sanitized.password, PASSWORD_MIN);
        sanitized.password = await hashPassword(sanitized.password);
    }

    // Execute functional DB mutation state switch
    const updatedEntity = await userRepo.updateUser(id, (user) => {
        if (sanitized.name     !== undefined) user.updateProfile({ name: sanitized.name });
        if (sanitized.email    !== undefined) user.updateEmail(sanitized.email);
        if (sanitized.password !== undefined) user.changePassword(sanitized.password);
        if (sanitized.role     !== undefined) {
            if (sanitized.role === 'ADMIN') user.promoteToAdmin();
            else user.demoteToUser();
        }
    });

    // ⚡ CACHE INVALIDATION ⚡
    // Always wipe by id. If email changed, also wipe the new email key
    // (old email key will naturally expire; we don't have it without a pre-fetch).
    const keysToDelete = [CacheKeys.userDetail(id)];
    if (sanitized.email !== undefined) {
        keysToDelete.push(CacheKeys.userByEmail(sanitized.email));
    }
    await redisDel(...keysToDelete);

    return toResponseDTO(updatedEntity);
};