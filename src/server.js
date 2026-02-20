import 'dotenv/config';
import express from 'express';
import { initPassport } from './config/passport.config.js.js';
import { connectDB } from './infrastructure/repositories/db.js';
import userRouter from './interfaces/table/user.router.js';
import taskRouter from './interfaces/table/task.router.js';
import authRouter from './interfaces/table/auth.router.js'
import {errorHandler} from './middleware/error.handler.js';
import { sendFailure } from './interfaces/response_formatter.js';
import { HTTP_STATUS } from './interfaces/http_status.js';




const app = express();
app.use(express.json());

app.use('/api', userRouter);
app.use('/api/tasks', taskRouter);
app.use('/auth', authRouter);


app.get('/', (req, res) => {
    return res.json({
        success: true,
        message: 'Server is running',
        version: '1.0.0',
        endpoints: {
            auth: {
                loginEmail: 'POST /api/auth/login',
                loginGitHub: 'GET /auth/google',
                googleCallback: 'GET /auth/google/callback',
                githubCallback: 'GET /auth/github/callback',
                refresh: 'POST /auth/refresh',
                logout: 'POST /auth/logout'
            },
            users:{
                create: 'POST /api/users',
                getById: 'GET /api/users/:id',
                getByEmail: 'GET /api/users/email/:email',
                update: 'PUT /api/users/:id',
                delete: 'DELETE /api/users/:id',
                promote: 'PATCH /api/users/:id/promote'
            },
            tasks: {
                create:   'POST /api/tasks',
                getById:  'GET /api/tasks/:id',
                listAll:  'GET /api/tasks',
                search:   'GET /api/tasks/search?q=',
                update:   'PATCH /api/tasks/:id',
                delete:   'DELETE /api/tasks/:id',
                start:    'PATCH /api/tasks/:id/start',
                complete: 'PATCH /api/tasks/:id/complete',
                transfer: 'POST /api/tasks/transfer',
            },
        },
    });
});

app.use((req, res) => {
    return sendFailure(
        res,
        HTTP_STATUS.NOT_FOUND,
        'ROUTE_NOT_FOUND',
        `Cannot ${req.method} ${req.originalUrl}`
    );
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    app.listen(PORT, '127.0.0.1', () => {
        console.log(`Server running at http://127.0.0.1:${PORT}/`);
    });
});