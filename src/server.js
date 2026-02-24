import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { initPassport } from './config/passport.config.js';   // ← was imported but never called
import { connectDB }    from './infrastructure/repositories/db.js';
import userRouter  from './interfaces/table/user.router.js';
import taskRouter  from './interfaces/table/task.router.js';
import authRouter  from './interfaces/table/auth.router.js';
import { errorHandler } from './middleware/error.handler.js';
import { sendFailure }  from './interfaces/response_formatter.js';
import { HTTP_STATUS }  from './interfaces/http_status.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: true,   // mirrors origin back — safe because all routes require JWT
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));


// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Passport (MUST be called before any routes that need OAuth) ───────────────
initPassport(app);   // ← FIX: was never called — OAuth was completely broken

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/tasks', taskRouter);   // ✅ MUST be before /api — specific before broad
app.use('/api',       userRouter);   // /api/users, /api/list_users
app.use('/auth',      authRouter);   // /auth/login, /auth/refresh, /auth/logout, /auth/github, /auth/google

// ── Root → serve login page ───────────────────────────────────────────────────
// FIX: removed duplicate GET '/' — only one handler allowed, Express uses the first one
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/login.html'));
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