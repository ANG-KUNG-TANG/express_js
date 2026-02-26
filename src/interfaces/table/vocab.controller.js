import { createVocabularyUseCase } from "../../app/vocab_uc/vocab_create.uc.js";
import { getVocabulayByTopicUsecase } from "../../app/vocab_uc/get_vocab.uc.js";
import { fetchVocabUseCase } from "../../app/vocab_uc/fetch_api.uc.js";
import {sendSuccess} from '../response_formatter.js';
import { HTTP_STATUS } from "../http_status.js";
import { sanitizeCreateInput, sanitizeUpdateInput } from "./vocab.input_sanitizer.js";


export const createVocabulary = async(req, res) =>{
    const input = sanitizeCreateInput(req.body);
    const result = await createVocabularyUseCase(input);
    return sendSuccess(res, result, HTTP_STATUS.CREATED)
};

export const getVocabularyByTopic = async (req, res) =>{
    const {topic} = req.params;
    const result = await getVocabulayByTopicUsecase(topic);
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

export const fetchAndSaveExternal = async (req, res) =>{
    const {topic} = req.params;
    const result = await fetchVocabUseCase(topic);
    return sendSuccess(
        res,
        {
            message: `Fetch and save ${result.length} new words for topic: ${topic}`,
            data: result,
       },
       HTTP_STATUS.CREATED
    )
}