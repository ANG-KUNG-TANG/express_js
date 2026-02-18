import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { User } from '../../domain/entities/user_entity.js';
import { UserRole } from '../../domain/base/user_enums.js';
import { hashPassword } from '../validators/password_hash.js';
import {
    validateRequired,
    validateStringLength,
    validateEmail,
    validatePassword,
    validateRole
} from '../validators/user_validator.js';

const NAME_MIN = 3;
const NAME_MAX = 100;
const PASSWORD_MIN = 8;

export const validateCreateInput = ({name, email, password, role}) =>{
    validateRequired(name, 'name');
    validateStringLength(name, 'name', NAME_MIN, NAME_MAX);
    validateRequired(email, 'email');
    validateEmail(email);
    validateRequired(password, 'password');
    validatePassword(password, PASSWORD_MIN);
    if (role !== undefined) validateRole(role);
}

export const createUserUsecase = async ({name, email, password, role}) =>{
    validateCreateInput({name, email, password, role});
    const user = new User({
        name: name.trim(),
        email: email.toLowerCase(),
        password : hashPassword(password),
        role: role ?? UserRole.USER,
    })
    return await userRepo.createUser(user);
}