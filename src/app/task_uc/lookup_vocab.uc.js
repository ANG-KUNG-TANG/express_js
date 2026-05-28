import * as taskService from '../../core/services/task_service.js';
import { TaskValidationError } from '../../core/errors/task.errors.js';
import logger from '../../core/logger/logger.js';

export const lookupVocabUseCase = async ({ word }) => {
    // ── 1. Input Guard (Business Rule) ───────────────────────────────────────
    if (!word || typeof word !== 'string' || !word.trim()) {
        throw new TaskValidationError('word param is required');
    }

    const sanitised = word.trim().toLowerCase();

    if (sanitised.length > 50) {
        throw new TaskValidationError('word param must be 50 characters or fewer');
    }

    if (!/^[a-z]+(-[a-z]+)*$/.test(sanitised)) {
        throw new TaskValidationError('word param must contain only letters and hyphens');
    }

    logger.debug('lookupVocabUseCase: start', { word: sanitised });

    // ── 2. Delegate to Service ───────────────────────────────────────────────
    // This removes the API dependency from your Database Repository
    return await taskService.lookupVocab(sanitised);
};