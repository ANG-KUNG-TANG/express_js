import 'dotenv/config';
import express from 'express';
import { connectDB } from './infrastructure/repositories/db.js';
import userRouter from './interfaces/table/user.router.js';
import { errorHandler } from './interfaces/error_handler.js';
import { sendFailure } from './interfaces/response_formatter.js';
import { HTTP_STATUS } from './interfaces/http_status.js';
import { getUserByEamil } from './interfaces/table/user.controller.js';

const app = express();
app.use(express.json());

app.use('/api', userRouter);

app.get('/', (req, res) => {
    return res.json({
        success: true,
        message: 'Server is running',
        version: '1.0.0',
        endpoints: {
            auth: {
                login: 'POST /api/auth/login',
            },
            users:{
                create: 'POST /api/users',
                getById: 'GET /api/users/:id',
                getUserByEamil: 'GET /api/users/email/:email',
                update: 'PUT /api/users/:id',
                delete: 'DELETE /api/users/:id',
                promote: 'PATCH /api/users/:id/promote'
            }
        
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