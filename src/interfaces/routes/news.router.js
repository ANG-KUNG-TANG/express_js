import { Router } from 'express';
import { asyncHandler } from '../async_handler.js';
import { authenticate } from '../../middleware/auth.middelware.js';
import {
    getPersonalisedFeedController,
    searchNewsController,
    getNewsByCategoryController,
    getCategoriesController,
    updateInterestsController,
} from '../table/news.controller.js';

const router = Router();

router.use(authenticate);

// ── Static routes first ───────────────────────────────────────────────────────
router.get('/feed',              asyncHandler(getPersonalisedFeedController));  // personalised feed
router.get('/search',            asyncHandler(searchNewsController));           // search by keyword
router.get('/categories',        asyncHandler(getCategoriesController));        // list all categories
router.patch('/interests',       asyncHandler(updateInterestsController));      // update user interests

// ── Dynamic routes last ───────────────────────────────────────────────────────
router.get('/category/:category', asyncHandler(getNewsByCategoryController));  // browse by category

export default router;