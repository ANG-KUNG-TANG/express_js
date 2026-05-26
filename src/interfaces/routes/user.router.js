import { Router }       from 'express';
import { authenticate } from '../../middleware/authenticate.middelware.js';
import { requireRole }  from '../../middleware/role.middleware.js';
import { asyncHandler } from '../async_handler.js';
import {
    createUser,
    getUserByEamil,
    getUserById,
    updateUser,
    deleteUser,
    promoteUser,
    listUsers,
} from '../table/user.controller.js';

const router = Router();

// All routes require a valid JWT
router.use(authenticate);

// ── User CRUD ─────────────────────────────────────────────────────────────────

// Admin-only: list all users, create a user manually, promote, delete
router.post  ('/users',               requireRole('admin'), asyncHandler(createUser));
router.get   ('/list_users',          requireRole('admin'), asyncHandler(listUsers));
router.patch ('/users/:id/promote',   requireRole('admin'), asyncHandler(promoteUser));
router.delete('/users/:id',           requireRole('admin'), asyncHandler(deleteUser));

// Any authenticated user can look up by email/id (you may tighten this further)
router.get('/users/email/:email',     asyncHandler(getUserByEamil));
router.get('/users/:id',              asyncHandler(getUserById));

// Users can update themselves; admins can update anyone (enforced in controller)
router.put  ('/users/:id',            asyncHandler(updateUser));   // frontend sends PUT
router.patch('/users/:id',            asyncHandler(updateUser));   // keep PATCH too

export default router;