import { Router } from 'express';
import { asyncHandler } from '../async_handler.js';
import { authenticate } from '../../middleware/auth.middelware.js';
import { getPersonalisedFeedController,
    searchNewsController,
    getNewsByCategoryController,
    getCategoriesController,
    updateInterestsController,
 } from '../table/news.controller.js';
const router = Router();

router.use(authenticate);

// Static routes first
router.get('/feed',              asyncHandler(getPersonalisedFeedController));
router.get('/search',            asyncHandler(searchNewsController));
router.get('/categories',        asyncHandler(getCategoriesController));
router.patch('/interests',       asyncHandler(updateInterestsController));

// Dynamic routes last
router.get('/category/:category', asyncHandler(getNewsByCategoryController));

export default router;