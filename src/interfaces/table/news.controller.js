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
//
// Scrapes the full article text from the original source URL using
// @postlight/parser (same engine as Firefox Reader Mode).
//
// Body: { url: "https://..." }
// Returns: { title, content, author, date_published, lead_image_url, url }
//
// Why POST + body instead of GET + query param:
//   URLs can be very long and contain special characters — body is safer.
// ---------------------------------------------------------------------------
export const fetchArticleContentController = async (req, res) => {
    const { url } = req.body;
    const userId  = getUserId(req);

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ success: false, message: 'url is required' });
    }

    // Basic URL validation — prevent SSRF to internal network
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return res.status(400).json({ success: false, message: 'Invalid URL' });
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ success: false, message: 'Only http/https URLs allowed' });
    }

    // Block requests to private/internal IPs
    const hostname = parsed.hostname.toLowerCase();
    const blocked  = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (blocked.includes(hostname) || hostname.startsWith('192.168.') ||
        hostname.startsWith('10.')  || hostname.startsWith('172.')) {
        return res.status(400).json({ success: false, message: 'URL not allowed' });
    }

    logger.debug('news.fetchArticleContent called', { requestId: req.id, userId, url });

    // Dynamically import @postlight/parser (ESM-friendly)
    const { default: Parser } = await import('@postlight/parser');

    const result = await Parser.parse(url, {
        contentType: 'text',   // returns clean plain text (no HTML tags)
    });

    if (!result || !result.content) {
        return res.status(422).json({
            success: false,
            message: 'Could not extract content from this article.',
        });
    }

    return sendSuccess(res, {
        title:           result.title           || '',
        content:         result.content         || '',
        author:          result.author          || '',
        date_published:  result.date_published  || '',
        lead_image_url:  result.lead_image_url  || '',
        url:             result.url             || url,
    }, HTTP_STATUS.OK);
};