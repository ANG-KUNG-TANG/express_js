import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { redisGet, redisSet, CacheKeys, TTL } from '../../core/services/redis.service.js';
import { validateRequired } from '../../domain/validators/user_validator.js';
import { toResponseDTO } from '../../infrastructure/mappers/user_mapper.js';

/**
 * getUserByIdUc — High-performance cached user profile retrieval.
 */
export const getUserByIdUc = async (id) => {
    validateRequired(id, 'id');

    const cacheKey = CacheKeys.userDetail(id);

    // 1. Attempt Cache Hit
    const cachedUser = await redisGet(cacheKey);
    if (cachedUser) {
        return cachedUser; // Fast memory return (returns safe pre-serialized DTO object)
    }

    // 2. Cache Miss — Query MongoDB safely
    const userEntity = await userRepo.findUserById(id);

    // 3. Transform entity to an isolated, password-free DTO representation
    const userDTO = toResponseDTO(userEntity);

    // 4. Populate Redis cache asynchronously so subsequent requests are lightning fast
    await redisSet(cacheKey, userDTO, TTL.USER_PROFILE);

    return userDTO;
};