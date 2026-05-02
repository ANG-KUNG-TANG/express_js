import { createVocabulary } from "../../domain/entities/vocab_entity";

describe("createVocabulary", () => {
  test("should return a frozen object with topic, word, and partOfSpeech", () => {
    const vocab = createVocabulary({
      topic: "Environment",
      word: "sustainability",
      partOfSpeech: "noun",
    });

    expect(vocab).toEqual({
      topic: "Environment",
      word: "sustainability",
      partOfSpeech: "noun",
    });
    expect(Object.isFrozen(vocab)).toBe(true);
  });

  test("should default partOfSpeech to null if not provided", () => {
    const vocab = createVocabulary({ topic: "Tech", word: "API" });
    expect(vocab.partOfSpeech).toBeNull();
  });

  test("should throw if topic is missing", () => {
    expect(() => createVocabulary({ word: "test" })).toThrow("Topic is required");
  });

  test("should throw if word is missing", () => {
    expect(() => createVocabulary({ topic: "test" })).toThrow("Word is required");
  });
});