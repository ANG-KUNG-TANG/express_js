import { doubleCsrf } from 'csrf-csrf';

const {
    generateCsrfToken,
    doubleCsrfProtection: csrfMiddleware,
} = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET,

    // ✅ v4 REQUIRES this — tells the library how to uniquely identify a session
    // We use the user's IP + user-agent as the identifier for unauthenticated
    // requests (e.g. /csrf-token before login), and user ID once authenticated.
    getSessionIdentifier: (req) =>
        req.user?.id ?? req.ip + (req.headers['user-agent'] ?? ''),

    cookieName: process.env.NODE_ENV === 'production'
        ? '__Host-x-csrf-token'
        : 'x-csrf-token',

    cookieOptions: {
        httpOnly: false,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    },

    // v4 renamed getTokenFromRequest → getCsrfTokenFromRequest
    getCsrfTokenFromRequest: (req) =>
        req.headers['x-csrf-token'] ?? req.body?._csrf,

    size: 64,
});

export { generateCsrfToken, csrfMiddleware };