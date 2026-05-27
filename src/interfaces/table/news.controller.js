import { 
    getPersonalisedNews,
    searchNews,
    getNewsByCategory,
    updateUserInterests,
    getAvailableCategories,
    fetchArticleContent,
 } from '../../app/news_uc/news_uc.js';
import { sendSuccess } from '../response_formatter.js';
import { HTTP_STATUS } from '../http_status.js';
import logger from '../../core/logger/logger.js';
import auditLogger from '../../core/logger/audit.logger.js';

const getUserId = (req) => req.user?.id ?? req.user?._id;

// ---------------------------------------------------------------------------
// GET /news/feed
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
// ---------------------------------------------------------------------------
export const getNewsByCategoryController = async (req, res) => {
    const { category } = req.params;
    const { q, page, country, timeframe } = req.query;
    const userId = getUserId(req);
    logger.debug('news.getByCategory called', { requestId: req.id, userId, category });
    const result = await getNewsByCategory(category, { q, page, country, timeframe });
    return sendSuccess(res, {
        category,
        totalResults: result.totalResults,
        nextPage:     result.nextPage || null,
        articles:     result.results,
    }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// GET /news/categories
// ---------------------------------------------------------------------------
export const getCategoriesController = async (req, res) => {
    const categories = getAvailableCategories();
    return sendSuccess(res, { categories }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// PATCH /news/interests
// ---------------------------------------------------------------------------
export const updateInterestsController = async (req, res) => {
    const userId        = getUserId(req);
    const { interests } = req.body;
    logger.debug('news.updateInterests called', { requestId: req.id, userId, interests });
    const updatedUser = await updateUserInterests(userId, interests);
    auditLogger.log('news.interestsUpdated', { userId, interests: updatedUser.interests }, req);
    return sendSuccess(res, { interests: updatedUser.interests }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// POST /news/fetch-content
// Body: { url: "https://..." }
// Returns: { title, content, author, date_published, lead_image_url, url }
// ---------------------------------------------------------------------------
export const fetchArticleContentController = async (req, res) => {
    const { url } = req.body;
    const userId  = getUserId(req);

    logger.debug('news.fetchArticleContent called', { requestId: req.id, userId, url });

    const data = await fetchArticleContent(url);

    return sendSuccess(res, data, HTTP_STATUS.OK);
};