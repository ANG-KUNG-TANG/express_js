/**
 * oauth_user.uc.js
 *
 * Normalizes a Google or GitHub profile into your User domain,
 * then finds an existing user by email or creates a new one.
 */

import crypto                          from 'crypto';
import { recordAudit, recordFailure }  from '../../core/services/audit.service.js';
import { AuditAction }                 from '../../domain/base/audit_enums.js';

export const findOrCreateOAuthUser = (userRepo) => async (profile, req = null) => {
    let normalized;
    try {
        normalized = normalizeProfile(profile);
    } catch (err) {
        // Profile normalization failed — no email returned by provider
        recordFailure(AuditAction.AUTH_OAUTH_FAILURE, null, {
            provider: profile?.provider ?? 'unknown',
            reason:   err.message,
        }, req);
        throw err;
    }

    const provider   = normalized.provider; // 'google' | 'github'
    const actionKey  = provider === 'google'
        ? AuditAction.AUTH_OAUTH_LOGIN_GOOGLE
        : AuditAction.AUTH_OAUTH_LOGIN_GITHUB;

    // Check if user already exists
    const existing = await userRepo.findByEmail(normalized.email);
    if (existing) {
        recordAudit(actionKey, existing.id ?? existing._id, {
            email:    normalized.email,
            provider,
            isNewUser: false,
        }, req);
        return existing;
    }

    // Create new OAuth user
    const created = await userRepo.create({
        name:      normalized.name,
        email:     normalized.email,
        // Random password — OAuth users never use it, but schema requires it
        password:  crypto.randomBytes(32).toString('hex'),
        role:      'user',
        avatarUrl: normalized.avatarUrl,
    });

    recordAudit(actionKey, created.id ?? created._id, {
        email:    normalized.email,
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