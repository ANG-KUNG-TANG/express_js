import axios from "axios";
import { createVocabulary } from "../../domain/entities/vocab_entity.js";
import * as vocabRepo from "../../infrastructure/repositories/vocab_repo.js";
import { validateRequired, validateTopic } from "../validators/vocab_validator.js";
import {
  VocabularyRuleViolationError,
} from "../../core/errors/vocab.errors.js";

export const fetchVocabUseCase = async (topic) => {
  validateRequired(topic, "topic");
  validateTopic(topic);

  let response;

  try {
    response = await axios.get("https://api.datamuse.com/words", {
      params: {
        ml: topic,
        md: "p",
        max: 50,
      },
    });
  } catch (error) {
    throw new VocabularyRuleViolationError(
      "Failed to fetch from external vocabulary service",
      { originalError: error.message }
    );
  }

  const words = response.data;

  const vocabEntities = words.map((item) => {
    const posTag = item.tags?.find((tag) =>
      ["n", "v", "adj", "adv"].includes(tag)
    );

    return createVocabulary({
      topic,
      word: item.word,
      partOfSpeech: posTag || null,
    });
  });

  // Parallel insertion with duplicate tolerance
  const results = await Promise.allSettled(
    vocabEntities.map((entity) => vocabRepo.create(entity))
  );

  const saved = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  return saved;
};