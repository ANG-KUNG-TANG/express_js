import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GithubStrategy }  from 'passport-github2';
import { findOrCreateOAuthUser }        from '../app/auth_uc/oauth_user.uc.js';
import * as userRepo                    from '../infrastructure/repositories/user_repo.js';

// Without it, passport never injects req and the UC always receives null — meaning
// OAuth audit logs are recorded with no IP or userAgent.
const handleOauthCallBack = async (req, accessToken, refreshToken, profile, done) => {
    try {
        const handler = findOrCreateOAuthUser(userRepo);
        const user    = await handler(profile, req);   // req now flows through to audit service
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
                clientID:           process.env.GOOGLE_CLIENT_ID,
                clientSecret:       process.env.GOOGLE_CLIENT_SECRET,
                callbackURL:        process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
                scope:              ['profile', 'email'],
                passReqToCallback:  true,   
            },
            handleOauthCallBack
        )
    );

    // ── GitHub ──────────────────────────────────────────────────────────────
    passport.use(
        'github',
        new GithubStrategy(
            {
                clientID:           process.env.GITHUB_CLIENT_ID,
                clientSecret:       process.env.GITHUB_CLIENT_SECRET,
                callbackURL:        process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback',
                scope:              ['user:email'],
                passReqToCallback:  true,   
            },
            handleOauthCallBack
        )
    );

    return passport;
};