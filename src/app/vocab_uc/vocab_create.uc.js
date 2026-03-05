import { createVocabulary } from "../../domain/entities/vocab_entity.js";
import * as vocabRepo from "../../infrastructure/repositories/vocab_repo.js";
import { validateRequired, validateTopic } from "../validators/vocab_validator.js";

export const createVocabularyUseCase = async ({ topic, word, partOfSpeech }) => {
  validateRequired(topic, "topic");
  validateRequired(word, "word");
  validateTopic(topic);

  const vocabEntity = createVocabulary({ topic, word, partOfSpeech });

  return await vocabRepo.create(vocabEntity);
};