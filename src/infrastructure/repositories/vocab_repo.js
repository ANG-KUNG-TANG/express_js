/**
 * vocab_repo.js  (updated — with logger)
 * ─────────────────────────────────────────────────────────────
 * DB-layer logs: every query and write is traced at debug level
 * so you can see exactly what hits MongoDB in the combined log.
 * ─────────────────────────────────────────────────────────────
 */

import VocabularyModel from "../../domain/models/vocab_model.js";
import {
  DuplicateVocabularyError,
  VocabularyNotFoundError,
} from "../../core/errors/vocab.errors.js";
import logger from "../../core/logger/logger.js";

/**
 * Find all vocabulary entries for a given topic.
 */
export async function findByTopic(topic) {
  logger.debug("vocabRepo.findByTopic", { topic });

  const items = await VocabularyModel.find({ topic }).lean();

  if (!items.length) {
    logger.warn("vocabRepo.findByTopic: no entries found", { topic });
    throw new VocabularyNotFoundError(topic);
  }

  logger.debug("vocabRepo.findByTopic: found items", { topic, count: items.length });
  return items;
}

/**
 * Find a single vocabulary entry by word and topic.
 */
export async function findByWordAndTopic(word, topic) {
  logger.debug("vocabRepo.findByWordAndTopic", { word, topic });
  return VocabularyModel.findOne({ word, topic }).lean();
}

/**
 * Create a new vocabulary entry.
 */
export async function create(data) {
  logger.debug("vocabRepo.create", { word: data.word, topic: data.topic });

  try {
    const doc = new VocabularyModel(data);
    await doc.save();
    logger.debug("vocabRepo.create: saved", { id: doc._id, word: doc.word });
    return doc.toObject();
  } catch (error) {
    if (error.code === 11000) {
      logger.warn("vocabRepo.create: duplicate entry skipped", {
        word: data.word,
        topic: data.topic,
      });
      throw new DuplicateVocabularyError(data.word, data.topic);
    }
    logger.error("vocabRepo.create: unexpected DB error", {
      error: error.message,
      word: data.word,
      topic: data.topic,
    });
    throw error;
  }
}