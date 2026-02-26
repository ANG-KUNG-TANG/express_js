export const createVocabulary = ({ topic, word, partOfSpeech }) => {
  if (!topic) throw new Error("Topic is required");
  if (!word) throw new Error("Word is required");

  return Object.freeze({
    topic,
    word,
    partOfSpeech: partOfSpeech || null,
    createdAt: new Date(),
  });
};