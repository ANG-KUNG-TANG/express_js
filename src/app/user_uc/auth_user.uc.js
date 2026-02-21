import { InvalidCredentialsError } from '../../core/errors/user.errors.js';
import { verifyPassword } from '../validators/password_hash.js';  
import { validateRequired, validateEmail } from '../validators/user_validator.js';
import { findUserByEmail, findUserByEmailWithPassword, sanitizeUser } from '../../infrastructure/repositories/user_repo.js';

const validateAuthInput = ({ email, password }) => {
    validateRequired(email, 'email');
    validateEmail(email);
    validateRequired(password, 'password');
};

export const authenticateUserUseCase = async ({ email, password }) => {
    validateAuthInput({ email, password });

    const user = await findUserByEmailWithPassword(email.toLowerCase());

    console.log("User found :", user);
    if (!user || !verifyPassword(password, user._password)) {
        throw new InvalidCredentialsError();
    }

    return sanitizeUser(user);
};