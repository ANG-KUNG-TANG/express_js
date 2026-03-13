import { Router } from "express";
import { asyncHandler } from "../async_handler.js";
import {
  createVocabulary,
  getVocabularyByTopic,
  fetchAndSaveExternal,
  lookupWord,
} from "../table/vocab.controller.js";

const router = Router();

router.post('/',                asyncHandler(createVocabulary));       // POST /vocab
router.get('/topic/:topic',     asyncHandler(getVocabularyByTopic));   // GET  /vocab/topic/:topic
router.post('/fetch/:topic',    asyncHandler(fetchAndSaveExternal));   // POST /vocab/fetch/:topic
router.get('/:word',            asyncHandler(lookupWord));             // GET  /vocab/:word

export default router;