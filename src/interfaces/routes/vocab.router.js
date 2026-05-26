import { Router }       from 'express';
import { authenticate } from '../../middleware/authenticate.middelware.js';
import { requireRole }  from '../../middleware/role.middleware.js';
import { asyncHandler } from '../async_handler.js';
import {
    createVocabulary,
    getVocabularyByTopic,
    fetchAndSaveExternal,
    lookupWord,
} from '../table/vocab.controller.js';

const router = Router();

// All vocab routes require a valid JWT
router.use(authenticate);

// ── Read routes — any authenticated user ──────────────────────────────────────
router.get('/topic/:topic',  asyncHandler(getVocabularyByTopic));  // GET  /vocab/topic/:topic
router.get('/:word',         asyncHandler(lookupWord));            // GET  /vocab/:word

// ── Write routes — admin only ─────────────────────────────────────────────────
router.post('/',             requireRole('admin'), asyncHandler(createVocabulary));      // POST /vocab
router.post('/fetch/:topic', requireRole('admin'), asyncHandler(fetchAndSaveExternal)); // POST /vocab/fetch/:topic

export default router;