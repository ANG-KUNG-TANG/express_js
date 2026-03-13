import { createVocabularyUseCase } from "../../app/vocab_uc/vocab_create.uc.js";
import { getVocabularyByTopicUseCase } from "../../app/vocab_uc/get_vocab.uc.js";
import { fetchVocabUseCase } from "../../app/vocab_uc/fetch_api.uc.js";
import { lookupWordUseCase } from "../../app/vocab_uc/lookup_word.uc.js";
import { sendSuccess } from "../response_formatter.js";
import { HTTP_STATUS } from "../http_status.js";
import { sanitizeCreateInput } from "../input_sanitizers/vocab.input_sanitizer.js";
import auditLogger from "../../core/logger/audit.logger.js";
import logger from "../../core/logger/logger.js";

export const createVocabulary = async (req, res) => {
  const input = sanitizeCreateInput(req.body);

  logger.debug("vocab.createVocabulary called", { requestId: req.id, input });

  const result = await createVocabularyUseCase(input);

  auditLogger.log("vocab.created", {
    word: result.word,
    topic: result.topic,
    partOfSpeech: result.partOfSpeech,
    id: result._id,
  }, req);

  return sendSuccess(res, result, HTTP_STATUS.CREATED);
};

export const getVocabularyByTopic = async (req, res) => {
  const { topic } = req.params;

  logger.debug("vocab.getVocabularyByTopic called", { requestId: req.id, topic });

  const result = await getVocabularyByTopicUseCase(topic);

  auditLogger.log("vocab.fetched", {
    topic,
    resultCount: result.length,
  }, req);

  return sendSuccess(res, result, HTTP_STATUS.OK);
};

export const fetchAndSaveExternal = async (req, res) => {
  const { topic } = req.params;

  logger.debug("vocab.fetchAndSaveExternal called", { requestId: req.id, topic });

  const result = await fetchVocabUseCase(topic);

  auditLogger.log("vocab.external.fetched", {
    topic,
    savedCount: result.length,
  }, req);

  return sendSuccess(
    res,
    {
      message: `Fetched and saved ${result.length} new words for topic: ${topic}`,
      data: result,
    },
    HTTP_STATUS.CREATED
  );
};

export const lookupWord = async (req, res) => {
  const { word } = req.params;

  logger.debug("vocab.lookupWord called", { requestId: req.id, word });

  const result = await lookupWordUseCase(word);

  auditLogger.log("vocab.lookup", { word }, req);

  return sendSuccess(res, result, HTTP_STATUS.OK);
};