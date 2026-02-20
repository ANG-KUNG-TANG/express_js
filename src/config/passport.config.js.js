import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GithubStrategy } from 'passport-github2';
import { findOrCreateOAuthUser } from '../app/auth_uc/oauth_user.uc.js';
import * as userRepo from '../infrastructure/repositories/user_repo.js';


const handleOauthCallBack = async (accessToken, refreshToken, profile, done) =>{
    try{
        const handler = findOrCreateOAuthUser(userRepo);
        const user = await handler(profile);
        return done(null, user);
    } catch (err){
        return done(err, null);
    }
};

export const initPassport = () =>{
    'google',
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.Google_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
                scope: ['profile', 'email'],
            },
            handleOauthCallBack
        )
    );
    passport.use(
        'github',
        new GithubStrategy(
            {
                clientID: process.env.GITBUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: process.env.GITBUB_CALLBACK_URL || '/auth/github/cllback',
                scope: ['user:email'],
            },
            handleOauthCallBack
        )
    );
    return passport;
};
