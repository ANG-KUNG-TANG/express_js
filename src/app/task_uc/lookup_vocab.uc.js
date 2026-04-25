import { lookupVocab } from '../../infrastructure/repositories/task_repo.js';
import {
    TaskValidationError,
} from '../../core/errors/task.errors.js';
import logger from '../../core/logger/logger.js';

// ---------------------------------------------------------------------------
// Use Case: Look Up Vocabulary Word
// Route:    GET /api/vocab/:word
// ---------------------------------------------------------------------------

/**
 * Retrieves dictionary information for a given English word.
 *
 * Responsibilities:
 *  1. Sanitise / validate the word param before hitting the repo.
 *  2. Delegate the actual lookup to the repository layer.
 *  3. Return a clean, controller-ready payload.
 *  4. Let domain errors bubble up unchanged so the controller can map them
 *     to the correct HTTP status codes.
 *
 * @param {object}  deps
 * @param {string}  deps.word   - The raw word string from the route param.
 *
 * @returns {Promise<{
 *   word:       string,
 *   phonetic:   string | null,
 *   audio:      string | null,
 *   meanings:   Array<{
 *     partOfSpeech: string,
 *     definitions:  Array<{
 *       definition: string,
 *       example:    string | null,
 *       synonyms:   string[],
 *       antonyms:   string[],
 *     }>,
 *     synonyms: string[],
 *     antonyms: string[],
 *   }>,
 *   sourceUrls: string[],
 * }>}
 *
 * @throws {TaskValidationError}  word is missing or blank
 * @throws {TaskNotFoundError}    no dictionary entry exists for the word
 */
export const lookupVocabUseCase = async ({ word }) => {
    // ── 1. Input guard ───────────────────────────────────────────────────────
    if (!word || typeof word !== 'string' || !word.trim()) {
        throw new TaskValidationError('word param is required and must be a non-empty string');
    }

    const sanitised = word.trim().toLowerCase();

    // Guard against unusually long inputs (dictionary words are never > 50 chars)
    if (sanitised.length > 50) {
        throw new TaskValidationError('word param must be 50 characters or fewer');
    }

    // Only allow plain alphabetic words (optionally hyphenated, e.g. "well-known")
    if (!/^[a-z]+(-[a-z]+)*$/.test(sanitised)) {
        throw new TaskValidationError('word param must contain only letters and hyphens');
    }

    logger.debug('lookupVocabUseCase: start', { word: sanitised });

    // ── 2. Delegate to repo ──────────────────────────────────────────────────
    const result = await lookupVocab(sanitised);

    // ── 3. Return controller-ready payload ───────────────────────────────────
    logger.debug('lookupVocabUseCase: success', { word: result.word });

    return result;
};