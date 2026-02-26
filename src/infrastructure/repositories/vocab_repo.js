import VocabularyModel from "../../domain/models/vocab_model.js";
import {
  DuplicateVocabularyError,
  VocabularyNotFoundError,
} from "../../core/errors/vocab.errors.js";

/**
 * Find all vocabulary entries for a given topic.
 * @param {string} topic
 * @returns {Promise<Array>}
 * @throws {VocabularyNotFoundError} if no documents found
 */
export async function findByTopic(topic) {
  const items = await VocabularyModel.find({ topic }).lean();
  if (!items.length) {
    throw new VocabularyNotFoundError(topic);
  }
  return items;
}

/**
 * Find a single vocabulary entry by word and topic.
 * @param {string} word
 * @param {string} topic
 * @returns {Promise<Object|null>}
 */
export async function findByWordAndTopic(word, topic) {
  return VocabularyModel.findOne({ word, topic }).lean();
}

/**
 * Create a new vocabulary entry with duplicate-key error handling.
 * @param {Object} data - vocabulary data (topic, word, partOfSpeech)
 * @returns {Promise<Object>} plain object representation
 * @throws {DuplicateVocabularyError} if topic+word combination already exists
 */
export async function create(data) {
  try {
    const doc = new VocabularyModel(data);
    await doc.save();
    return doc.toObject();
  } catch (error) {
    // MongoDB duplicate key error code
    if (error.code === 11000) {
      throw new DuplicateVocabularyError(data.word, data.topic);
    }
    throw error;
  }
}

// Optional additional functions can be added here as needed
// export async function update(id, data) { ... }
// export async function remove(id) { ... }