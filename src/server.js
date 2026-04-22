import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import http from 'http';
import { startReminderJobs} from './core/job/task_remainder.job.js';
import { initPassport } from './config/passport.config.js';
import { connectDB, disconnectDB }    from './infrastructure/repositories/db.js';
import userRouter        from './interfaces/routes/user.router.js';
import profileRouter     from './interfaces/routes/profile.router.js';
import writingTaskRouter from './interfaces/routes/task.router.js';
import authRouter        from './interfaces/routes/auth.router.js';
import vocabRouter       from './interfaces/routes/vocab.router.js';
import newsRouter        from './interfaces/routes/news.router.js';
import adminRouter       from  './interfaces/routes/admin.router.js';
import auditLogRouter    from  './interfaces/routes/audit_logs.router.js';
import teacherRouter      from './interfaces/routes/teacher.router.js';
import { errorHandler }            from './middleware/error.handler.js';
import { sendFailure }             from './interfaces/response_formatter.js';
import { HTTP_STATUS }             from './interfaces/http_status.js';
import { requestLoggerMiddleware } from './middleware/request.logger.middleware.js';
import { errorLoggerMiddleware }   from './middleware/error.logger.middleware.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { notificationRouter } from './interfaces/routes/notification.router.js';
import { passwordResetRouter } from './interfaces/routes/password_reset.router.js';
import { authenticate } from './middleware/auth.middelware.js';
import { initSocket }                        from './core/services/socket.service.js';
import { connectRedis, disconnectRedis }     from './core/services/redis.service.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Static: serve uploaded files ──────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Passport ──────────────────────────────────────────────────────────────────
initPassport(app);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/writing-tasks', writingTaskRouter);
app.use('/api/news',          newsRouter);
app.use('/api/vocab',         vocabRouter);
app.use('/api/notifications', authenticate, notificationRouter);
app.use('/api/auth',          authRouter);
app.use('/api/auth',          passwordResetRouter);
app.use('/api/admin',         adminRouter);
app.use('/api/admin/audit-logs', auditLogRouter);
app.use('/api/teacher',       teacherRouter);
app.use('/api',               profileRouter);  // /api/users/me — must be before userRouter
app.use('/api',               userRouter);     // /api/users/:id

// ── Root → redirect to login ──────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.redirect('/pages/auth/login.html');
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
    return sendFailure(
        res,
        HTTP_STATUS.NOT_FOUND,
        'ROUTE_NOT_FOUND',
        `Cannot ${req.method} ${req.originalUrl}`
    );
});

// ── Error logging (must be after 404 handler) ─────────────────────────────────
app.use(errorLoggerMiddleware);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
    // 1. Connect Redis before jobs or requests can run
    await connectRedis();

    startReminderJobs();

    // Wrap Express in an http.Server so Socket.IO can share the same port
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server running at http://localhost:${PORT}/`);
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────────
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