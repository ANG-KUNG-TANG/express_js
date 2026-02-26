import axios from "axios";
import { createVocabulary } from "../../domain/entities/vocab_entity.js";
import * as vocabRepo from "../../infrastructure/repositories/vocab_repo.js";
import { TopicEnum } from "../../domain/base/topics_enums.js";
import { InvalidTopicError, VocabularyRuleViolationError } from "../../core/errors/vocab.errors.js";

const validateRequired = (value, field) => {
  if (!value) throw new Error(`${field} is required`);
};

const validateTopic = (topic) => {
  if (!Object.values(TopicEnum).includes(topic)) {
    throw new InvalidTopicError(topic);
  }
};

export const fetchVocabUseCase = async (topic) => {
  validateRequired(topic, 'topic');
  validateTopic(topic);

  // Call external API
  const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(topic)}&md=p&max=50`;
  let response;
  try {
    response = await axios.get(url);
  } catch (error) {
    throw new VocabularyRuleViolationError(
      "Failed to fetch from external vocabulary service",
      { originalError: error.message }
    );
  }

  const words = response.data;

  // Transform to entity format
  const vocabEntities = words.map((item) => {
    const posTag = item.tags?.find((tag) => ["n", "v", "adj", "adv"].includes(tag));
    const partOfSpeech = posTag || null;
    return createVocabulary({ topic, word: item.word, partOfSpeech });
  });

  // Save each, skipping duplicates
  const saved = [];
  for (const entity of vocabEntities) {
    try {
      const created = await vocabRepo.create(entity);
      saved.push(created);
    } catch (error) {
      if (error.name === "DuplicateVocabularyError") {
        continue; 
      }
      throw error;
    }
  }

  return saved;
};