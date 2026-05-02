import mongoose from 'mongoose';
// ❌ removed MongoMemoryServer import
import VocabModel from '../../infrastructure/models/vocab_model.js';
import { TopicEnum } from '../../domain/base/topics_enums.js';

beforeAll(async () => {
  await mongoose.connect(process.env.__MONGO_URI__ + 'vocab-model-test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await VocabModel.deleteMany({});
});

describe('Vocabulary Model', () => {
  const validVocab = {
    topic: TopicEnum.EDUCATION,
    word: 'pedagogy',
    partOfSpeech: 'noun',
  };

  test('should create and save a vocabulary entry successfully', async () => {
    const entry = new VocabModel(validVocab);
    const saved = await entry.save();
    expect(saved._id).toBeDefined();
    expect(saved.topic).toBe(validVocab.topic);
    expect(saved.word).toBe(validVocab.word);
    expect(saved.partOfSpeech).toBe(validVocab.partOfSpeech);
    expect(saved.createdAt).toBeDefined();
    expect(saved.updatedAt).toBeDefined();
  });

  test('should fail when topic is missing', async () => {
    const data = { ...validVocab, topic: undefined };
    const entry = new VocabModel(data);
    await expect(entry.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when word is missing', async () => {
    const data = { ...validVocab, word: undefined };
    const entry = new VocabModel(data);
    await expect(entry.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should reject invalid topic', async () => {
    const data = { ...validVocab, topic: 'INVALID_TOPIC' };
    const entry = new VocabModel(data);
    await expect(entry.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should allow missing partOfSpeech', async () => {
    const { partOfSpeech, ...data } = validVocab;
    const entry = new VocabModel(data);
    const saved = await entry.save();
    expect(saved.partOfSpeech).toBeUndefined();
  });

  test('should enforce unique combination of topic + word', async () => {
    await new VocabModel(validVocab).save();
    const duplicate = new VocabModel(validVocab);
    await expect(duplicate.save()).rejects.toThrow(mongoose.Error.DuplicateKeyError);
  });

  test('should allow same word in different topic', async () => {
    await new VocabModel(validVocab).save();
    const diff = new VocabModel({ ...validVocab, topic: TopicEnum.TECHNOLOGY });
    await expect(diff.save()).resolves.toBeDefined();
  });
});