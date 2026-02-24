import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GithubStrategy }  from 'passport-github2';
import { findOrCreateOAuthUser }        from '../app/auth_uc/oauth_user.uc.js';
import * as userRepo                    from '../infrastructure/repositories/user_repo.js';

const handleOauthCallBack = async (accessToken, refreshToken, profile, done) => {
    try {
        const handler = findOrCreateOAuthUser(userRepo);
        const user    = await handler(profile);
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
};

export const initPassport = () => {
    // ── Google ──────────────────────────────────────────────────────────────
    passport.use(
        'google',
        new GoogleStrategy(
            {
                clientID:     process.env.GOOGLE_CLIENT_ID,      // FIX: was Google_CLIENT_ID (wrong case)
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
                scope: ['profile', 'email'],
            },
            handleOauthCallBack
        )
    );

    // ── GitHub ──────────────────────────────────────────────────────────────
    passport.use(
        'github',
        new GithubStrategy(
            {
                clientID:     process.env.GITHUB_CLIENT_ID,      // FIX: was GITBUB_CLIENT_ID (typo)
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL:  process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',  // FIX: was GITBUB_CALLBACK_URL + '/auth/github/cllback'
                scope: ['user:email'],
            },
            handleOauthCallBack
        )
    );

    return passport;
};