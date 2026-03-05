import * as vocabRepo from "../../infrastructure/repositories/vocab_repo.js";
import { validateRequired, validateTopic } from "../validators/vocab_validator.js";

export const getVocabularyByTopicUseCase = async (topic) => {
  validateRequired(topic, "topic");
  validateTopic(topic);

  return await vocabRepo.findByTopic(topic);
};