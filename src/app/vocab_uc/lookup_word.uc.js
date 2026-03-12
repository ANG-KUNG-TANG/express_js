import axios from "axios";
import { VocabularyRuleViolationError, VocabularyNotFoundError } from "../../core/errors/vocab.errors.js";
import { validateRequired } from "../validators/vocab_validator.js";

/**
 * Looks up a single word from the free Dictionary API.
 * Returns the first entry (matches dictionaryapi.dev response shape).
 * Used by write.js vocab panel — GET /api/vocab/:word
 */
export const lookupWordUseCase = async (word) => {
  validateRequired(word, "word");

  let response;

  try {
    response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
  } catch (error) {
    if (error.response?.status === 404) {
      throw new VocabularyNotFoundError(word);
    }

    throw new VocabularyRuleViolationError(
      "Failed to fetch from dictionary service",
      { originalError: error.message }
    );
  }

  return response.data[0]; // first entry — write.js expects res.data = single entry
};