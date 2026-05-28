import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import redisClient from '../../infrastructure/cache/redis_client.js';

const CACHE_TTL = 3600; // 1 hour

export const getTaskById = async (id) => {
    // 1. Check Cache
    const cached = await redisClient.get(`task:${id}`);
    if (cached) return JSON.parse(cached);

    // 2. Fetch from Repo
    const task = await taskRepo.findTaskByID(id);

    // 3. Populate Cache
    await redisClient.set(`task:${id}`, JSON.stringify(task.toJSON()), 'EX', CACHE_TTL);
    return task;
};

export const updateTaskDetails = async (id, title, description) => {
    const updated = await taskRepo.updateTask(id, (t) => t.updateDetails(title, description));
    
    // Invalidate cache immediately after the repo completes the mutation
    await redisClient.del(`task:${id}`);
    
    return updated;
};

export const submitTask = async (taskId, text) => {
    // 1. Perform the mutation using the Repo's callback pattern
    const updated = await taskRepo.submitTask(taskId, text);
    
    // 2. Clear cache
    await redisClient.del(`task:${taskId}`);
    
    return updated;
};

export const saveAiEvaluation = async (taskId, evaluation) => {
    // 1. Call Repo
    const updated = await taskRepo.saveAiEvaluation(taskId, evaluation);
    
    // 2. Invalidate Cache so the next fetch includes the new AI result
    await redisClient.del(`task:${taskId}`);
    
    return updated;
};

export const findTasks = async (options) => {
    // Services for lists typically do not cache in Redis because
    // filters vary wildly (pagination, status, user).
    // Just delegate straight to the repo.
    return await taskRepo.findTasks({}, options);
};

export const lookupVocab = async (word) => {
    // Move your API fetch logic here
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const response = await fetch(url);
    
    // ... rest of your API fetch, error handling, and formatting logic ...
    
    return formattedData;
};

export const acceptAssignment = async (taskId) => {
    const updated = await taskRepo.acceptAssignment(taskId);
    await redisClient.del(`task:${taskId}`); // Invalidate
    return updated;
};

export const declineAssignment = async (taskId, reason) => {
    const updated = await taskRepo.declineAssignment(taskId, reason);
    await redisClient.del(`task:${taskId}`); // Invalidate
    return updated;
};

export const reviewTask = async (taskId, feedback) => {
    // 1. Call Repo
    const updated = await taskRepo.reviewTask(taskId, feedback);
    
    // 2. Invalidate Cache
    await redisClient.del(`task:${taskId}`);
    
    return updated;
};

export const scoreTask = async (taskId, bandScore) => {
    // 1. Call Repo
    const updated = await taskRepo.scoreTask(taskId, bandScore);
    
    // 2. Invalidate Cache
    await redisClient.del(`task:${taskId}`);
    
    return updated;
};

export const searchTasksByTitle = async (searchTerm, options) => {
    // Search results are dynamic based on user input, so we typically 
    // do not cache these in Redis unless you have a very limited set of searches.
    return await taskRepo.searchTasksByTitle(searchTerm, options);
};

export const updateTask = async (id, mutateFn) => {
    // 1. Perform the database update using the repository's callback pattern
    const updated = await taskRepo.updateTask(id, mutateFn);
    
    // 2. Invalidate Redis Cache
    await redisClient.del(`task:${id}`);
    
    return updated;
};

export const transferTasks = async (fromUserId, toUserId, session) => {
    const result = await taskRepo.transferTasks(fromUserId, toUserId, session);
    
    // Note: If you have a list-cache for users, invalidate those keys here.
    // Since we are not caching lists in Redis yet, this is sufficient.
    return result;
};

export const transferSingleTask = async (taskId, fromUserId, toUserId, session) => {
    const updated = await taskRepo.transferSingleTask(taskId, fromUserId, toUserId, session);
    
    // Invalidate the specific task cache
    await redisClient.del(`task:${taskId}`);
    
    return updated;
};

