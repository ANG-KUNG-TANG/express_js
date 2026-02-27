import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { initPassport } from './config/passport.config.js';
import { connectDB }    from './infrastructure/repositories/db.js';
import userRouter         from './interfaces/table/user.router.js';
import writingTaskRouter  from './interfaces/table/task.router.js';
import authRouter         from './interfaces/table/auth.router.js';
import vocabRouter        from './interfaces/table/vocab.router.js';
import newsRouter         from './interfaces/table/news.router.js';
import { errorHandler }              from './middleware/error.handler.js';
import { sendFailure }               from './interfaces/response_formatter.js';
import { HTTP_STATUS }               from './interfaces/http_status.js';
import { requestLoggerMiddleware }   from './middleware/request.logger.middleware.js';
import { errorLoggerMiddleware }     from './middleware/error.logger.middleware.js';
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
app.use(express.static(path.join(__dirname, 'public')));
app.use(requestLoggerMiddleware);

// ── Passport (must be called before any routes that need OAuth) ───────────────
initPassport(app);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/writing-tasks', writingTaskRouter);
app.use('/api/news',          newsRouter);
app.use('/api',               userRouter);
app.use('/auth',              authRouter);
app.use('/vocab',             vocabRouter);

// ── Root ──────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/login.html'));
});

app.use(errorLoggerMiddleware);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
    return sendFailure(
        res,
        HTTP_STATUS.NOT_FOUND,
        'ROUTE_NOT_FOUND',
        `Cannot ${req.method} ${req.originalUrl}`
    );
});

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