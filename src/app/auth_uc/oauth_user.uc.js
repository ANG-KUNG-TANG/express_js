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
    // FIX 1: provider and providerId were missing — schema requires provider to
    //         satisfy the conditional password `required` check, and providerId
    //         is needed for future provider-scoped lookups.
    // FIX 2: now constructs through the User entity so domain rules are applied
    //         consistently (same as createUserUsecase for local accounts).
    // NOTE:   password is a random hex string — OAuth users never use it, but
    //         the schema requires a value when provider is not yet saved.
    const userEntity = new User({
        name:       normalized.name,
        email:      normalized.email.toLowerCase(),
        password:   crypto.randomBytes(32).toString('hex'),
        role:       UserRole.USER,
        provider:   normalized.provider,
        providerId: normalized.providerId,
        avatarUrl:  normalized.avatarUrl ?? null,
    });

    const created = await userRepo.create(userEntity);

    recordAudit(actionKey, created.id ?? created._id, {
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