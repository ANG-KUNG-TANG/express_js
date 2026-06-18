import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import { startReminderJobs }               from './core/job/task_remainder.job.js';
import { emailService }                    from './core/services/email.service.js';
import { initPassport }                    from './config/passport.config.js';
import { connectDB, disconnectDB }         from './infrastructure/repositories/db.js';
import userRouter                          from './interfaces/routes/user.router.js';
import profileRouter                       from './interfaces/routes/profile.router.js';
import writingTaskRouter                   from './interfaces/routes/task.router.js';
import authRouter                          from './interfaces/routes/auth.router.js';
import vocabRouter                         from './interfaces/routes/vocab.router.js';
import newsRouter                          from './interfaces/routes/news.router.js';
import adminRouter                         from './interfaces/routes/admin.router.js';
import auditLogRouter                      from './interfaces/routes/audit_logs.router.js';
import teacherRouter                       from './interfaces/routes/teacher.router.js';
import { errorHandler }                    from './middleware/error.handler.js';
import { sendFailure }                     from './interfaces/response_formatter.js';
import { HTTP_STATUS }                     from './interfaces/http_status.js';
import { requestLoggerMiddleware }         from './middleware/request.logger.middleware.js';
import { errorLoggerMiddleware }           from './middleware/error.logger.middleware.js';
import { fileURLToPath }                   from 'url';
import path                                from 'path';
import fs                                  from 'fs';
import { notificationRouter }              from './interfaces/routes/notification.router.js';
import { passwordResetRouter }             from './interfaces/routes/password_reset.router.js';
import { initSocket }                      from './core/services/socket.service.js';
import { connectRedis, disconnectRedis }   from './core/services/redis.service.js';
import cookieParser                        from 'cookie-parser';
import passport                            from 'passport';
import { apiLimiter }                      from './middleware/rate_limit.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// Render sits in front of this app as a reverse proxy. Without this, req.ip
// resolves to Render's internal proxy address (same for every request) instead
// of the real client IP — which breaks anything keyed on IP, like rate limiting.
// `1` trusts exactly one hop (Render's proxy) rather than the full forwarded
// chain, so a client can't spoof their own IP via X-Forwarded-For.
app.set('trust proxy', 1);

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000'];

// ── Static (before CORS so same-origin asset requests are never blocked) ────
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// app.use('/uploads', express.static(uploadsDir));
// app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', express.static(uploadsDir));

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials:    true,
    methods:        ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'script-src': [
                `'self'`,
                `'unsafe-inline'`,
                'https://cdn.socket.io',
                'https://cdnjs.cloudflare.com',
            ],
            'script-src-elem': [
                `'self'`,
                `'unsafe-inline'`,
                'https://cdn.socket.io',
                'https://cdnjs.cloudflare.com',
            ],
            'connect-src': [
                `'self'`,
                'ws://localhost:3000',
                'wss://localhost:3000',
                'wss://express-js-2kxb.onrender.com',
                'https://express-js-2kxb.onrender.com',
                'https://writing-test-app.vercel.app',
                'https://cdn.socket.io',
                'https://cdnjs.cloudflare.com',
            ],
            'img-src': [`'self'`, 'data:', 'https:']
        },
    },
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);

// Rate limiter + CSRF come after static so assets are never throttled
app.use(apiLimiter);

// ── Passport ──────────────────────────────────────────────────────────────────
initPassport();
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/writing-tasks',    writingTaskRouter);
app.use('/api/news',             newsRouter);
app.use('/api/vocab',            vocabRouter);
app.use('/api/notifications',    notificationRouter);
app.use('/api/auth',             authRouter);
app.use('/api/auth',             passwordResetRouter);
app.use('/api/admin',            adminRouter);
app.use('/api/admin/audit-logs', auditLogRouter);
app.use('/api/teacher',          teacherRouter);
app.use('/api',                  profileRouter);
app.use('/api',                  userRouter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({
        status:    'ok',
        uptime:    process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// ── Root ──────────────────────────────────────────────────────────────────────
// app.get('/', (req, res) => {
//     res.redirect('/pages/auth/login.html');
// });

app.get('/', (req, res) => {
    res.json({status: "API running"})
})

// browsers request this automatically on every page load.
//         Without this handler the request fell through to the JSON 404 catch-all,
//         returning { "error": "ROUTE_NOT_FOUND" } instead of a silent 204.
//         Placed before the 404 handler so it is matched first.
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    return sendFailure(res, HTTP_STATUS.NOT_FOUND, 'ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`);
});

// ── Error logging + handler ───────────────────────────────────────────────────
app.use(errorLoggerMiddleware);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
    await connectRedis();
    emailService.verifyConnection().catch(err => {
        console.error(" SMTP connection failed: ", err.message)
    })
    startReminderJobs();

    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server running at http://localhost:${PORT}/`);
    });

    const shutdown = async (signal) => {
        console.log(`\n[server] ${signal} received — shutting down gracefully`);
        httpServer.close(async () => {
            await disconnectRedis();
            await disconnectDB();
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

}).catch(err => {
    console.error('❌ Failed to connect to DB:', err);
    process.exit(1);
});