import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { initPassport } from './config/passport.config.js';
import { connectDB }    from './infrastructure/repositories/db.js';
import userRouter        from './interfaces/routes/user.router.js';
import writingTaskRouter from './interfaces/routes/task.router.js';
import authRouter        from './interfaces/routes/auth.router.js';
import vocabRouter       from './interfaces/routes/vocab.router.js';
import newsRouter        from './interfaces/routes/news.router.js';
import { errorHandler }            from './middleware/error.handler.js';
import { sendFailure }             from './interfaces/response_formatter.js';
import { HTTP_STATUS }             from './interfaces/http_status.js';
import { requestLoggerMiddleware } from './middleware/request.logger.middleware.js';
import { errorLoggerMiddleware }   from './middleware/error.logger.middleware.js';
import { fileURLToPath } from 'url';
import path from 'path';

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


// ── Passport ──────────────────────────────────────────────────────────────────
initPassport(app);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/writing-tasks', writingTaskRouter);
app.use('/api/news',          newsRouter);
app.use('/api/vocab',         vocabRouter);
app.use('/api/auth',          authRouter);
app.use('/api',               userRouter);

// ── Root → redirect to login ──────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.redirect('/public/pages/auth/login.html');
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

connectDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server running at http://localhost:${PORT}/`);
    });
}).catch(err => {
    console.error('❌ Failed to connect to DB:', err);
    process.exit(1);
});