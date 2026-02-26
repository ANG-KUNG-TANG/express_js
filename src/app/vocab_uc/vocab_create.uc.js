import { createVocabulary } from "../../domain/entities/vocab_entity.js";
import * as vocabRepo from "../../infrastructure/repositories/vocab_repo.js";
import { TopicEnum } from "../../domain/base/topics_enums.js";
import {InvalidTopicError} from "../../core/errors/vocab.errors.js"


// Simple validation helpers
const validateRequired = (value, field) => {
  if (!value) throw new Error(`${field} is required`); 
};

const validateTopic = (topic) => {
  if (!Object.values(TopicEnum).includes(topic)) {
    throw new InvalidTopicError(topic);
  }
};

export const createVocabularyUseCase = async ({ topic, word, partOfSpeech }) => {
  validateRequired(topic, 'topic');
  validateRequired(word, 'word');
  validateTopic(topic);

  const vocabEntity = createVocabulary({ topic, word, partOfSpeech });
  return await vocabRepo.create(vocabEntity);
};