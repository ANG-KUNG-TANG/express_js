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

