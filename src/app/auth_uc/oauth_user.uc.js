/**
 * oauth_user.uc.js
 *
 * Normalizes a Google or GitHub profile into your User domain,
 * then finds an existing user by email or creates a new one.
 */

import crypto                          from 'crypto';
import { User }                        from '../../domain/entities/user_entity.js';
import { UserRole }                    from '../../domain/base/user_enums.js';
import { recordAudit, recordFailure }  from '../../core/services/audit.service.js';
import { AuditAction }                 from '../../domain/base/audit_enums.js';
import { EMAIL_VERIFY_TTL_MS }         from '../../domain/base/token_ttl.js';
import { emailService }                from '../../core/services/email.service.js';
import * as tokenRepo                  from '../../infrastructure/repositories/password_reset_token_repo.js';

export const findOrCreateOAuthUser = (userRepo) => async (profile, req = null) => {
    let normalized;
    try {
        normalized = normalizeProfile(profile);
    } catch (err) {
        recordFailure(AuditAction.AUTH_OAUTH_FAILURE, null, {
            provider: profile?.provider ?? 'unknown',
            reason:   err.message,
        }, req);
        throw err;
    }

    const provider  = normalized.provider; // 'google' | 'github'
    const actionKey = provider === 'google'
        ? AuditAction.AUTH_OAUTH_LOGIN_GOOGLE
        : AuditAction.AUTH_OAUTH_LOGIN_GITHUB;

    // ── Returning user ────────────────────────────────────────────────────────
    // findByEmail throws UserEmailNotFoundError when not found (does not return null),
    // so we catch that specific error and treat it as "no existing user".
    let existing = null;
    try {
        existing = await userRepo.findByEmail(normalized.email);
    } catch (err) {
        if (err.name !== 'UserEmailNotFoundError') throw err;
    }
    if (existing) {
        recordAudit(actionKey, existing.id ?? existing._id, {
            email:     normalized.email,
            provider,
            isNewUser: false,
        }, req);
        return existing;
    }

    // ── New OAuth user ────────────────────────────────────────────────────────
    // NOTE: password is a random hex string — OAuth users never use it, but
    //       the schema requires a value when provider is not yet saved.
    const userEntity = new User({
        name:       normalized.name,
        email:      normalized.email.toLowerCase(),
        password:   crypto.randomBytes(32).toString('hex'),
        role:       UserRole.USER,
        provider:   normalized.provider,
        providerId: normalized.providerId,
        avatarUrl:  normalized.avatarUrl ?? null,
        isVerified: false,
        isActive:   true,
    });

    const created = await userRepo.create(userEntity);
    const userId  = created.id ?? created._id;

    // Send verification email
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
    await tokenRepo.create({
        userId,
        token: rawToken,
        type:  'email_verification',
        expiresAt,
    });

    // Fire-and-forget
    emailService.sendVerificationEmail({
        toEmail:  normalized.email,
        userName: normalized.name,
        rawToken,
    }).catch((err) => {
        console.error('[oauthUser] Failed to send verification email:', err.message);
    });

    recordAudit(actionKey, userId, {
        email:     normalized.email,
        provider,
        isNewUser: true,
    }, req);

    return created;
};

// ── Profile normalizer ────────────────────────────────────────────────────────

const normalizeProfile = (profile) => {
    const provider = profile.provider; // 'google' | 'github'

    const email =
        profile.emails?.[0]?.value ||
        profile._json?.email       ||
        null;

    if (!email) {
        throw new Error(`OAuth profile from ${provider} did not return an email address`);
    }

    return {
        provider,
        providerId: profile.id,
        name:       profile.displayName || profile.username || 'Unknown',
        email,
        avatarUrl:  profile.photos?.[0]?.value || null,
    };
};