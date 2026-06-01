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

    // 1. Fetch current domain details before write to catch key associations (like old email string)
    const oldUserEntity = await userRepo.findUserById(id);
    const oldEmailKey = CacheKeys.userByEmail(oldUserEntity.email);

    // 2. Execute functional DB mutation state switch
    const updatedEntity = await userRepo.updateUser(id, (user) => {
        if (sanitized.name !== undefined)     user.updateProfile({ name: sanitized.name });
        if (sanitized.password !== undefined) user.changePassword(sanitized.password);
        if (sanitized.email !== undefined)    user.updateProfile({ name: user.name, email: sanitized.email });
        
        if (sanitized.role !== undefined) {
            if (sanitized.role === 'ADMIN') user.promoteToAdmin();
            else user.demoteToUser();
        }
    });

    // 3. ⚡ CACHE INVALIDATION ⚡
    // Wipe old keys out of Redis completely. The next read use case will trigger a fresh cache populate.
    const primaryProfileKey = CacheKeys.userDetail(id);
    const newEmailKey = CacheKeys.userByEmail(updatedEntity.email);

    await redisDel(primaryProfileKey, oldEmailKey, newEmailKey);

    return toResponseDTO(updatedEntity);
};