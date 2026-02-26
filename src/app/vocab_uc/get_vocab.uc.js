import * as vocabRepo from '../../infrastructure/repositories/vocab_repo.js';

export const getVocabulayByTopicUsecase = async (topic) =>{
    return vocabRepo.findByTopic(topic);
}