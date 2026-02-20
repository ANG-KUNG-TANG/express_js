/**
 * findOrCreateOAuthUser
 *
 * Normalizes a Google or GitHub profile into your User domain,
 * then finds an existing user by email or creates a new one.
 *
 * @param {object} userRepo  - your user repository (findByEmail, create)
 * @param {object} profile   - raw passport profile object
 * @returns {Promise<User>}
 */
export const findOrCreateOAuthUser = (userRepo) => async (profile) => {
  const normalized = normalizeProfile(profile);

  const existing = await userRepo.findByEmail(normalized.email);
  if (existing) return existing;

  return userRepo.create({
    name:         normalized.name,
    email:        normalized.email,
    provider:     normalized.provider,
    providerId:   normalized.providerId,
    avatarUrl:    normalized.avatarUrl,
    // OAuth users have no password — set a random unguessable value
    password:     null,
    role:         'user',
  });
};

// ---------------------------------------------------------------------------
// Profile normalizer
// ---------------------------------------------------------------------------

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