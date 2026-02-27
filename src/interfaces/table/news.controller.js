import { 
    getPersonalisedNews,
    searchNews,
    getNewsByCategory,
    updateUserInterests,
    getAvailableCategories
 } from '../../app/news_uc/news_uc.js';
import { sendSuccess } from '../response_formatter.js';
import { HTTP_STATUS } from '../http_status.js';
import logger from '../../core/logger/logger.js';
import auditLogger from '../../core/logger/audit.logger.js';

const getUserId = (req) => req.user?.id ?? req.user?._id;

// ---------------------------------------------------------------------------
// GET /news/feed
// Returns personalised news based on the user's saved interests.
// Falls back to top news if no interests are set.
// ---------------------------------------------------------------------------

export const getPersonalisedFeedController = async (req, res) => {
    const userId = getUserId(req);
    const { q, page, country } = req.query;

    logger.debug('news.getPersonalisedFeed called', { requestId: req.id, userId });

    const result = await getPersonalisedNews(userId, { q, page, country });

    return sendSuccess(res, {
        totalResults: result.totalResults,
        nextPage:     result.nextPage || null,
        articles:     result.results,
    }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// GET /news/search?q=keyword
// Search news by keyword, optionally filtered by category.
// ---------------------------------------------------------------------------

export const searchNewsController = async (req, res) => {
    const { q, category, page, country, timeframe } = req.query;
    const userId = getUserId(req);

    logger.debug('news.search called', { requestId: req.id, userId, query: q });

    const result = await searchNews(q, { category, page, country, timeframe });

    return sendSuccess(res, {
        totalResults: result.totalResults,
        nextPage:     result.nextPage || null,
        articles:     result.results,
    }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// GET /news/category/:category
// Browse news by a specific category.
// ---------------------------------------------------------------------------

export const getNewsByCategoryController = async (req, res) => {
    const { category } = req.params;
    const { q, page, country } = req.query;
    const userId = getUserId(req);

    logger.debug('news.getByCategory called', { requestId: req.id, userId, category });

    const result = await getNewsByCategory(category, { q, page, country });

    return sendSuccess(res, {
        category,
        totalResults: result.totalResults,
        nextPage:     result.nextPage || null,
        articles:     result.results,
    }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// GET /news/categories
// Returns the list of all valid categories (for frontend dropdowns).
// ---------------------------------------------------------------------------

export const getCategoriesController = async (req, res) => {
    const categories = getAvailableCategories();
    return sendSuccess(res, { categories }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// PATCH /news/interests
// Update the logged-in user's news interest categories.
// Body: { interests: ['technology', 'health', 'science'] }
// ---------------------------------------------------------------------------

export const updateInterestsController = async (req, res) => {
    const userId    = getUserId(req);
    const { interests } = req.body;

    logger.debug('news.updateInterests called', { requestId: req.id, userId, interests });

    const updatedUser = await updateUserInterests(userId, interests);

    auditLogger.log('news.interestsUpdated', {
        userId,
        interests: updatedUser.interests,
    }, req);

    return sendSuccess(res, {
        interests: updatedUser.interests,
    }, HTTP_STATUS.OK);
};