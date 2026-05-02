// src/tests/repo/vocab_repo.test.js
import mongoose from 'mongoose';
import VocabularyModel from '../../infrastructure/models/vocab_model.js';
import * as vocabRepo from '../../infrastructure/repositories/vocab_repo.js';
import { TopicEnum } from '../../domain/base/topics_enums.js';

describe('Vocab Repository', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.__MONGO_URI__ + 'vocab-repo-test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await VocabularyModel.deleteMany({});
  });

  // Use real enum values — raw strings like 'ielts-writing' fail the model's enum validator
  const TOPIC_A = TopicEnum.EDUCATION;
  const TOPIC_B = TopicEnum.TECHNOLOGY;

  const baseEntry = {
    word:         'eloquent',
    topic:        TOPIC_A,
    definition:   'well-spoken and persuasive',
    partOfSpeech: 'adjective',
    example:      'Her eloquent speech moved the audience.',
  };

  // ── create ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('should persist a new vocabulary entry', async () => {
      const doc = await vocabRepo.create(baseEntry);
      expect(doc).toBeDefined();
      expect(doc.word).toBe(baseEntry.word);
      expect(doc.topic).toBe(baseEntry.topic);
    });

    it('should throw DuplicateVocabularyError for same word + topic', async () => {
      await vocabRepo.create(baseEntry);
      // FIX: .toThrow(string) checks whether the error MESSAGE contains that string —
      // it does NOT check the class name. The actual thrown message is
      // 'Word "eloquent" already exists in topic "EDUCATION"'.
      // Matching 'already exists in topic' is a stable substring of that message.
      await expect(vocabRepo.create(baseEntry)).rejects.toThrow('already exists in topic');
    });

    it('should allow the same word under a different topic', async () => {
      await vocabRepo.create(baseEntry);
      const other = await vocabRepo.create({ ...baseEntry, topic: TOPIC_B });
      expect(other.topic).toBe(TOPIC_B);
    });
  });

  // ── findByTopic ────────────────────────────────────────────────────────────
  describe('findByTopic', () => {
    beforeEach(async () => {
      await vocabRepo.create(baseEntry);
      await vocabRepo.create({ ...baseEntry, word: 'verbose',  topic: TOPIC_A });
      await vocabRepo.create({ ...baseEntry, word: 'succinct', topic: TOPIC_B });
    });

    it('should return all entries for a given topic', async () => {
      const items = await vocabRepo.findByTopic(TOPIC_A);
      expect(items).toHaveLength(2);
      expect(items.every(i => i.topic === TOPIC_A)).toBe(true);
    });

    it('should return an empty array for an unknown topic', async () => {
      const items = await vocabRepo.findByTopic('nonexistent-topic');
      expect(items).toEqual([]);
    });
  });

  // ── findByWordAndTopic ─────────────────────────────────────────────────────
  describe('findByWordAndTopic', () => {
    beforeEach(async () => {
      await vocabRepo.create(baseEntry);
    });

    it('should find an existing word + topic combination', async () => {
      const found = await vocabRepo.findByWordAndTopic(baseEntry.word, TOPIC_A);
      expect(found).toBeDefined();
      expect(found.word).toBe(baseEntry.word);
    });

    it('should return null for an unknown word', async () => {
      const found = await vocabRepo.findByWordAndTopic('unknownword', TOPIC_A);
      expect(found).toBeNull();
    });

    it('should return null when topic does not match', async () => {
      const found = await vocabRepo.findByWordAndTopic(baseEntry.word, TOPIC_B);
      expect(found).toBeNull();
    });
  });
});