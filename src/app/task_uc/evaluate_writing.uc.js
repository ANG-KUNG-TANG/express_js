import { GoogleGenAI } from '@google/genai';
import { AiEvaluation } from '../../domain/entities/ai_evaluate_entity.js';
import * as taskService from '../../core/services/task_service.js'; // Use Service
import { WritingStatus } from '../../domain/base/task_enums.js';
import { AppError }      from '../../core/errors/base.errors.js';
import logger            from '../../core/logger/logger.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const AI_ALLOWED_STATUSES = [WritingStatus.SUBMITTED, WritingStatus.REVIEWED, WritingStatus.SCORED];

// ── Helpers (Keep private to module) ──────────────────────────────────────────

function buildPrompt(task) {
    return `Evaluate this IELTS ${task.taskType} writing submission.
=== WRITING PROMPT ===
${task.questionPrompt}
=== STUDENT RESPONSE ===
${task.submissionText}
... (rest of prompt) ...`;
}

// ── Use Case ──────────────────────────────────────────────────────────────────

export async function evaluateWritingUC(taskId, userId) {
    logger.debug('evaluateWritingUC: start', { taskId, userId });

    // 1. Fetch via Service (Handles Redis Cache + Repo)
    const task = await taskService.getTaskById(taskId);

    // 2. Ownership (Using public getters)
    taskService.ensureTaskOwnership(task, userId);

    // 3. Status guard (Use task.status, NOT task._status)
    if (!AI_ALLOWED_STATUSES.includes(task.status)) {
        throw new AppError(`AI evaluation is only available after submission. Status: ${task.status}`, 400);
    }

    // 4. Submission content guard (Use task.submissionText)
    if (!task.submissionText || task.submissionText.trim().length < 50) {
        throw new AppError('Task submission is too short.', 400);
    }

    // 5. Cache check (Use task.aiEvaluation public getter)
    if (task.aiEvaluation) {
        logger.debug('evaluateWritingUC: returning cached result', { taskId });
        return task;
    }

    // 6. Call Gemini
    const rawResponse = await callGemini(buildPrompt(task));
    const evaluation = new AiEvaluation(rawResponse);

    // 7. Persist via Service (Service handles Repo + Cache Invalidation)
    return await taskService.saveAiEvaluation(taskId, evaluation);
}