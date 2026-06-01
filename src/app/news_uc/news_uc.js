import * as newsService from '../../infrastructure/repositories/news_repo.js';
import { NewsCategory } from '../../domain/base/new_enums.js';
import * as userRepo from '../../infrastructure/repositories/user_repo.js';

// ---------------------------------------------------------------------------
// Get personalised news feed for the logged-in user
// ---------------------------------------------------------------------------

export const getPersonalisedNews = async (userId, options = {}) => {
    const user = await userRepo.findUserById(userId);
    const interests = user?.interests || [];
    return await newsService.getPersonalisedFeed(interests, options);
};

// ---------------------------------------------------------------------------
// Search news by keyword
// ---------------------------------------------------------------------------

export const searchNews = async (query, options = {}) => {
    return await newsService.searchNews(query, options);
};

// ---------------------------------------------------------------------------
// Browse news by a specific category
// ---------------------------------------------------------------------------

export const getNewsByCategory = async (category, options = {}) => {
    return await newsService.getNewsByCategory(category, options);
};

// ---------------------------------------------------------------------------
// Update user interests
// ---------------------------------------------------------------------------

export const updateUserInterests = async (userId, interests) => {
    if (!Array.isArray(interests)) {
        throw new Error('interests must be an array');
    }

    const validInterests = interests.filter(i => Object.values(NewsCategory).includes(i));

    if (validInterests.length === 0 && interests.length > 0) {
        throw new Error('No valid interest categories provided');
    }

    if (validInterests.length > 5) {
        throw new Error('You can select up to 5 interest categories');
    }

    return await userRepo.updateUser(userId, { interests: validInterests });
};

// ---------------------------------------------------------------------------
// Get available news categories (for frontend dropdowns)
// ---------------------------------------------------------------------------

export const getAvailableCategories = () => {
    return Object.values(NewsCategory);
};

// ---------------------------------------------------------------------------
// Scrape full article content from a source URL.
//
// Uses @postlight/parser (Firefox Reader Mode engine) to extract clean
// plain text from any article page.
//
// SSRF guard: validates protocol and blocks private/internal hostnames
// before making any outbound request.
//
// @param  {string} url - publicly accessible article URL
// @returns {{ title, content, author, date_published, lead_image_url, url }}
// @throws  Error with .statusCode for known failures (bad URL, blocked host,
//          unextractable content) so the controller can respond correctly.
// ---------------------------------------------------------------------------

export const fetchArticleContent = async (url) => {
    // ── Input validation ──────────────────────────────────────────────────
    if (!url || typeof url !== 'string') {
        const err = new Error('url is required');
        err.statusCode = 400;
        throw err;
    }

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        const err = new Error('Invalid URL');
        err.statusCode = 400;
        throw err;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        const err = new Error('Only http/https URLs allowed');
        err.statusCode = 400;
        throw err;
    }

    // ── SSRF guard — block private/internal hostnames ─────────────────────
    const hostname = parsed.hostname.toLowerCase();
    const blocked  = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (
        blocked.includes(hostname)         ||
        hostname.startsWith('192.168.')    ||
        hostname.startsWith('10.')         ||
        hostname.startsWith('172.')
    ) {
        const err = new Error('URL not allowed');
        err.statusCode = 400;
        throw err;
    }

    // ── Parse ─────────────────────────────────────────────────────────────
    // Dynamic import keeps ESM compatibility and avoids loading the heavy
    // parser module on every cold start — only paid for when actually used.
    const { extract} = await import('@extractus/article-extractor');

    const result = await extract(url);

    if (!result?.content) {
        const err = new Error('Could not extract content from this article.');
        err.statusCode = 422;
        throw err;
    }

    return {
        title:          result.title          || '',
        content:        result.content        || '',
        author:         result.author         || '',
        date_published: result.published      || '',
        lead_image_url: result.image          || '',
        url:            result.url            || url,
    };
};