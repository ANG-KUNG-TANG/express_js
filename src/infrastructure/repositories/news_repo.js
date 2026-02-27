import { NewsCategory } from '../../domain/base/new_enums.js';
import logger from '../../core/logger/logger.js';

const NEWSDATA_BASE = 'https://newsdata.io/api/1';
const API_KEY = process.env.NEWSDATA_API_KEY;

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

const newsFetch = async (endpoint, params = {}) => {
    if (!API_KEY) throw new Error('NEWSDATA_API_KEY is not set in environment');

    const url = new URL(`${NEWSDATA_BASE}/${endpoint}`);
    url.searchParams.set('apikey', API_KEY);
    url.searchParams.set('language', 'en'); // default to English

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    }

    logger.debug('newsService.fetch', { url: url.toString().replace(API_KEY, '[REDACTED]') });

    const res = await fetch(url.toString());
    const data = await res.json();

    if (!res.ok || data.status !== 'success') {
        const message = data?.results?.message || data?.message || 'NewsData API error';
        logger.error('newsService.fetch: error', { status: res.status, message });
        throw new Error(message);
    }

    return data;
};

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/**
 * Fetch latest news filtered by one or more categories.
 * Used for the personalised feed based on user interests.
 *
 * @param {string[]} categories - array of NewsCategory values
 * @param {object}   options    - { q, page, timeframe, country }
 */
export const getNewsByCategories = async (categories = [], options = {}) => {
    const { q, page, timeframe, country } = options;

    // newsdata.io accepts comma-separated categories (max 5 on free plan)
    const validCategories = categories
        .filter(c => Object.values(NewsCategory).includes(c))
        .slice(0, 5)
        .join(',');

    const params = {
        ...(validCategories && { category: validCategories }),
        ...(q             && { q }),
        ...(page          && { page }),
        ...(timeframe     && { timeframe }),
        ...(country       && { country }),
    };

    logger.debug('newsService.getNewsByCategories', { categories: validCategories });
    return await newsFetch('latest', params);
};

/**
 * Fetch personalised news feed for a user based on their saved interests.
 * Falls back to top news if user has no interests set.
 *
 * @param {string[]} interests - user.interests array from DB
 * @param {object}   options   - { q, page, country }
 */
export const getPersonalisedFeed = async (interests = [], options = {}) => {
    if (!interests || interests.length === 0) {
        logger.debug('newsService.getPersonalisedFeed: no interests, falling back to top');
        return await newsFetch('latest', { category: 'top', ...options });
    }
    return await getNewsByCategories(interests, options);
};

/**
 * Search news by keyword across all categories.
 *
 * @param {string} query   - search term
 * @param {object} options - { category, page, country, timeframe }
 */
export const searchNews = async (query, options = {}) => {
    if (!query || typeof query !== 'string' || !query.trim()) {
        throw new Error('Search query is required');
    }
    const { category, page, country, timeframe } = options;
    const params = {
        q: query.trim(),
        ...(category  && { category }),
        ...(page      && { page }),
        ...(country   && { country }),
        ...(timeframe && { timeframe }),
    };
    logger.debug('newsService.searchNews', { query });
    return await newsFetch('latest', params);
};

/**
 * Fetch news by a single specific category.
 *
 * @param {string} category - one of NewsCategory values
 * @param {object} options  - { q, page, country }
 */
export const getNewsByCategory = async (category, options = {}) => {
    if (!Object.values(NewsCategory).includes(category)) {
        throw new Error(`Invalid category: ${category}`);
    }
    logger.debug('newsService.getNewsByCategory', { category });
    return await newsFetch('latest', { category, ...options });
};