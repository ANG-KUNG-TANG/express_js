import crypto                                     from 'crypto';
import * as userRepo                              from '../../infrastructure/repositories/user_repo.js';
import { emailService }                           from '../../core/services/email.service.js';
import { User }                                   from '../../domain/entities/user_entity.js';
import { hashPassword }                           from '../../domain/validators/password_hash.js';
import { validatePasswordStrength }               from '../../domain/validators/user_validator.js';
import { ConflictError }                          from '../../core/errors/base.errors.js';
import { EMAIL_VERIFY_TTL_MS }                    from '../../domain/base/token_ttl.js';
import { redisSet }                               from '../../core/services/redis.service.js';

const PASSWORD_MIN = 8;

export const createUserUsecase = async ({ name, email, password, role, provider }) => {
    const normalizedEmail = email?.toLowerCase().trim();
    const isLocal = !provider || provider === 'local';

    // 1. Check for existing account — swallow not-found, rethrow anything else
    let existing = null;
    try {
        existing = await userRepo.findByEmail(normalizedEmail);
    } catch (err) {
        if (err.name !== 'UserEmailNotFoundError') throw err;
    }
    if (existing) {
        throw new ConflictError('An account with this email already exists.');
    }

    // 2. Handle Password Validation and Crypto Hashing safely in the Use Case
    let hashedPassword = null;
    if (isLocal) {
        // Enforce plain text strength limits BEFORE hashing it
        validatePasswordStrength(password, PASSWORD_MIN);
        hashedPassword = await hashPassword(password);
    }

    // 3. Delegate ALL validation and entity orchestration to the proper Static Factory
    let userEntity;
    if (isLocal) {
        userEntity = User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role
        });
    } else {
        userEntity = User.createOAuth({
            name,
            email: normalizedEmail,
            provider,
            providerId: null,
            role
        });
    }

    // 4. Save entity to database via your repository bridge
    const created = await userRepo.createUser(userEntity);

    // ── Email verification token (Redis only — matched by verify_email_uc.js) ──
    if (isLocal) {
        const rawToken  = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const ttlSeconds = Math.floor(EMAIL_VERIFY_TTL_MS / 1000);

        // Store hash → userId so verify UC can look it up in O(1)
        await redisSet(`token:verify:${tokenHash}`, created.id, ttlSeconds);

        // ── Fire-and-forget verification email ───────────────────────────────
        emailService.sendVerificationEmail({
            toEmail:  normalizedEmail,
            userName: created.name,
            rawToken,
        }).catch((err) => {
            console.error('[createUserUsecase] failed to send verification email:', err.message);
        });
    }

    return created;
};