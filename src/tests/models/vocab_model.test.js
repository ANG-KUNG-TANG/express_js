import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import VocabModel from '../../infrastructure/models/vocab_model.js';  // Adjust path if needed
import { TopicEnum } from '../../domain/base/topics_enums.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
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
    const duplicate = new VocabModel(validVocab); // same topic and word
    await expect(duplicate.save()).rejects.toThrow(mongoose.Error.DuplicateKeyError);
  });

  test('should allow same word in different topic', async () => {
    await new VocabModel(validVocab).save();
    const diff = new VocabModel({ ...validVocab, topic: TopicEnum.TECHNOLOGY });
    await expect(diff.save()).resolves.toBeDefined();
  });
});