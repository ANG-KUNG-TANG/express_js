import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { redisGet, redisSet, CacheKeys, TTL } from '../../core/services/redis.service.js';
import { toResponseDTO } from '../../infrastructure/mapper/user.mapper.js';

export const getUserByIdUc = async (id) => {
    const cacheKey = CacheKeys.userDetail(id);

    const cachedUser = await redisGet(cacheKey);
    if (cachedUser) return cachedUser;

    const userEntity = await userRepo.findUserById(id);
    const userDTO = toResponseDTO(userEntity);

    await redisSet(cacheKey, userDTO, TTL.USER_PROFILE);
    return userDTO;
};

export const getUserByEmailUc = async (email) => {
    const cacheKey = CacheKeys.userByEmail(email);

    const cachedUser = await redisGet(cacheKey);
    if (cachedUser) return cachedUser;

    const userEntity = await userRepo.findUserByEmail(email);
    const userDTO = toResponseDTO(userEntity);

    await redisSet(cacheKey, userDTO, TTL.USER_PROFILE);
    return userDTO;
};