import crypto from 'crypto';
import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { redisGet, redisDel, CacheKeys } from '../../core/services/redis.service.js';
import { validateRequired } from '../../domain/validators/user_validator.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

/**
 * verifyEmailUc — Consumes a temporary token from Redis to verify a user account.
 */
export const verifyEmailUc = async (rawToken) => {
    // 1. Guard input boundary
    validateRequired(rawToken, 'token');

    // 2. Hash the raw token exactly how it was saved during signup
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const cacheKey = `token:verify:${tokenHash}`;

    // 3. Fetch the associated userId from Redis (O(1) complexity)
    const userId = await redisGet(cacheKey);
    if (!userId) {
        throw new UserValidationError('Verification token is invalid or has expired.');
    }

    // 4. Update user state atomically via the repository's functional engine
    const updatedUser = await userRepo.verifyUser(userId);

    // 5. Instantly clean up the consumed token and clear cached profile
    await redisDel(cacheKey, CacheKeys.userDetail(userId));

    return { verified: true, userId };
};