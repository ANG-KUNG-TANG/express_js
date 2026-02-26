import {
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError
} from "./http.errors.js";

export class InvalidTopicError extends ValidationError {
  constructor(topic) {
    super(`Invalid topic: ${topic}`, { topic });
    this.name = "InvalidTopicError";
  }
}

export class VocabularyNotFoundError extends NotFoundError {
  constructor(topic) {
    super(`No vocabulary found for topic: ${topic}`, { topic });
    this.name = "VocabularyNotFoundError";
  }
}

export class DuplicateVocabularyError extends ConflictError {
  constructor(word, topic) {
    super(`Word "${word}" already exists in topic "${topic}"`);
    this.name = "DuplicateVocabularyError";
  }
}

export class VocabularyRuleViolationError extends BusinessRuleError {
  constructor(message, details) {
    super(message, details);
    this.name = "VocabularyRuleViolationError";
  }
}