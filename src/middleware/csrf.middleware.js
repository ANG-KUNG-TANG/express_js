import { doubleCsrf } from 'csrf-csrf';

const {
    generateCsrfToken,
    doubleCsrfProtection: csrfMiddleware,
} = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET,

    getSessionIdentifier: (req) =>
        req.user?.id ?? req.ip + (req.headers['user-agent'] ?? ''),

    cookieName: process.env.NODE_ENV === 'production'
        ? '__Host-x-csrf-token'
        : 'x-csrf-token',

    cookieOptions: {
        httpOnly: false,
        sameSite: 'none',   // cross-origin: vercel → render
        secure:   true,     // required when sameSite is 'none'
        path:     '/',
    },

    getCsrfTokenFromRequest: (req) =>
        req.headers['x-csrf-token'] ?? req.body?._csrf,

    size: 64,
});

export { generateCsrfToken, csrfMiddleware };