import { TopicEnum } from "../../domain/base/topics_enums.js";
import { InvalidTopicError } from "../../core/errors/vocab.errors.js";

export const validateRequired = (value, field) => {
  if (!value) throw new Error(`${field} is required`);
};

export const validateTopic = (topic) => {
  if (!Object.values(TopicEnum).includes(topic)) {
    throw new InvalidTopicError(topic);
  }
};