import crypto                                     from 'crypto';
import * as userRepo                              from '../../infrastructure/repositories/user_repo.js';
import { passwordResetTokenRepo as tokenRepo }    from '../../infrastructure/repositories/password_reset_token_repo.js';
import { PasswordResetToken }                     from '../../domain/entities/password_reset_token_entity.js';
import { emailService }                           from '../../core/services/email.service.js';
import { User }                                   from '../../domain/entities/user_entity.js';
import { UserRole }                               from '../../domain/base/user_enums.js';
import { hashPassword }                           from '../validators/password_hash.js';
import {
    validateRequired,
    validateStringLength,
    validateEmail,
    validatePassword,
    validateRole,
} from '../validators/user_validator.js';
import { ConflictError }                          from '../../core/errors/base.errors.js';
import { EMAIL_VERIFY_TTL_MS }                    from '../../domain/base/token_ttl.js';
import { UniqueId }                               from '../../domain/base/id_generator.js';

const NAME_MIN     = 3;
const NAME_MAX     = 100;
const PASSWORD_MIN = 8;

export const validateCreateInput = ({ name, email, password, role, provider }) => {
    validateRequired(name, 'name');
    validateStringLength(name, 'name', NAME_MIN, NAME_MAX);
    validateRequired(email, 'email');
    validateEmail(email);

    // Only enforce password rules for local accounts
    if (!provider || provider === 'local') {
        validateRequired(password, 'password');
        validatePassword(password, PASSWORD_MIN);
    }

    if (role !== undefined) validateRole(role);
};

export const createUserUsecase = async ({ name, email, password, role, provider }) => {
    validateCreateInput({ name, email, password, role, provider });

    const normalizedEmail = email.toLowerCase();

    // Check for existing account — swallow not-found, rethrow anything else
    let existing = null;
    try {
        existing = await userRepo.findByEmail(normalizedEmail);
    } catch (err) {
        if (err.name !== 'UserEmailNotFoundError') throw err;
    }
    if (existing) {
        throw new ConflictError('An account with this email already exists.');
    }

    const isLocal  = !provider || provider === 'local';
    const hashedPw = isLocal ? await hashPassword(password) : null;

    const user = new User({
        name:       name.trim(),
        email:      normalizedEmail,
        password:   hashedPw,
        role:       role ?? UserRole.USER,
        provider:   provider ?? 'local',
        isVerified: false,
        isActive:   true,
    });

    const created = await userRepo.createUser(user);

    // ── Email verification token ─────────────────────────────────────────────
    // Store only the SHA-256 hash in the DB; send the raw token in the email
    // link. This way a DB leak never lets an attacker verify someone's email.
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);

    const tokenEntity = new PasswordResetToken({
        id:        new UniqueId().generator(),
        userId:    created.id ?? created._id,
        tokenHash,
        expiresAt,
        used:      false,
    });

    await tokenRepo.create(tokenEntity);

    // ── Fire-and-forget verification email ───────────────────────────────────
    emailService.sendVerificationEmail({
        toEmail:  normalizedEmail,
        userName: name.trim(),
        rawToken,
    }).catch((err) => {
        console.error('[createUserUsecase] failed to send verification email:', err.message);
    });

    return created;
};