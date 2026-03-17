/**
 * oauth_user.uc.js
 *
 * Normalizes a Google or GitHub profile into your User domain,
 * then finds an existing user by email or creates a new one.
 *
 * Fix: your user_model requires password (minlength: 8).
 * OAuth users get a random unguessable 32-char hex string — they
 * can never log in with it since they always use OAuth.
 */

import crypto from 'crypto';

export const findOrCreateOAuthUser = (userRepo) => async (profile) => {
    const normalized = normalizeProfile(profile);

    // Check if user already exists
    const existing = await userRepo.findByEmail(normalized.email);
    if (existing) return existing;

    // Create new OAuth user
    return userRepo.create({
        name:      normalized.name,
        email:     normalized.email,
        // Random password — OAuth users never use it, but schema requires it
        password:  crypto.randomBytes(32).toString('hex'),
        role:      'user',
        avatarUrl: normalized.avatarUrl,
        // Store provider info in bio or a future provider field if needed
    });
};

// ── Profile normalizer ────────────────────────────────────────────────────────

const normalizeProfile = (profile) => {
    const provider = profile.provider; // 'google' | 'github'

    const email =
        profile.emails?.[0]?.value ||
        profile._json?.email ||
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