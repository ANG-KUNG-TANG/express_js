// src/app/task_uc/evaluate_writing.uc.js

import { GoogleGenAI }  from '@google/genai';
import { AiEvaluation } from '../../domain/entities/ai_evaluate_entity.js';
import {
    findTaskByID,
    saveAiEvaluation,
    ensureTaskOwnership,
} from '../../infrastructure/repositories/task_repo.js';
import { WritingStatus } from '../../domain/base/task_enums.js';
import { AppError }      from '../../core/errors/base.errors.js';
import logger            from '../../core/logger/logger.js';

// ── Gemini client (singleton) ─────────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are a certified IELTS examiner with 10 years of marking experience.
Evaluate student writing strictly according to the official IELTS band descriptors.
Return ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON object.`;

// ── Statuses where AI check is allowed ───────────────────────────────────────
// Student must have finished writing and submitted first.
// AI check is blocked while the task is still ASSIGNED or in WRITING.
const AI_ALLOWED_STATUSES = [
    WritingStatus.SUBMITTED,
    WritingStatus.REVIEWED,
    WritingStatus.SCORED,
];

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(task) {
    return `Evaluate this IELTS ${task._taskType} writing submission.

=== WRITING PROMPT ===
${task._questionPrompt}

=== STUDENT RESPONSE ===
${task._submissionText}

Return ONLY this JSON (no other text):
{
  "bandScore": <number 0–9, increments of 0.5>,
  "taskAchievement":   { "score": <0–9>, "feedback": "<2–3 specific sentences>" },
  "coherenceCohesion": { "score": <0–9>, "feedback": "<2–3 specific sentences>" },
  "lexicalResource":   { "score": <0–9>, "feedback": "<2–3 specific sentences>" },
  "grammaticalRange":  { "score": <0–9>, "feedback": "<2–3 specific sentences>" },
  "overallFeedback": "<3–4 sentence summary>",
  "improvements": [
    "<specific actionable tip 1>",
    "<specific actionable tip 2>",
    "<specific actionable tip 3>"
  ]
}`;
}

// ── Gemini call ───────────────────────────────────────────────────────────────

async function callGemini(prompt) {
    const response = await ai.models.generateContent({
        model:    'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature:       0.3,
            maxOutputTokens:   1024,
        },
    });

    const raw = response.text.replace(/```json|```/g, '').trim();

    try {
        return JSON.parse(raw);
    } catch {
        logger.error('evaluateWritingUC: Gemini returned invalid JSON', { raw });
        throw new AppError('AI returned an invalid response. Please try again.', 502);
    }
}

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Run an AI evaluation for a submitted writing task.
 *
 * Rules:
 *  - Task must be SUBMITTED, REVIEWED, or SCORED (not ASSIGNED / WRITING)
 *  - Task must belong to the requesting user
 *  - Returns cached aiEvaluation if already evaluated (no extra Gemini call)
 *  - Teacher's bandScore and feedback are never touched
 *
 * @param {string} taskId  - MongoDB _id of the WritingTask
 * @param {string} userId  - Requesting student's _id
 * @returns {Promise<WritingTask>} Updated task entity with aiEvaluation populated
 */
export async function evaluateWritingUC(taskId, userId) {
    logger.debug('evaluateWritingUC: start', { taskId, userId });

    // ── 1. Fetch ──────────────────────────────────────────────────────────────
    const task = await findTaskByID(taskId);

    // ── 2. Ownership ──────────────────────────────────────────────────────────
    ensureTaskOwnership(task, userId);

    // ── 3. Status guard — block while still in writing area ───────────────────
    // ASSIGNED = task not started yet
    // WRITING  = student is actively writing — cannot check yet
    if (!AI_ALLOWED_STATUSES.includes(task._status)) {
        throw new AppError(
            `AI evaluation is only available after you submit your writing. ` +
            `Current status: ${task._status}. ` +
            `Please finish writing and submit first.`,
            400
        );
    }

    // ── 4. Submission content guard ───────────────────────────────────────────
    if (!task._submissionText || task._submissionText.trim().length < 50) {
        throw new AppError(
            'Task must have a submitted response of at least 50 characters before AI evaluation.',
            400
        );
    }

    // ── 5. Cache — return existing evaluation without calling Gemini ──────────
    if (task._aiEvaluation) {
        logger.debug('evaluateWritingUC: returning cached result', { taskId });
        return task;
    }

    // ── 6. Call Gemini ────────────────────────────────────────────────────────
    logger.debug('evaluateWritingUC: calling Gemini', { taskType: task._taskType });
    let parsed;
    try {
        parsed = await callGemini(buildPrompt(task));
    } catch (err) {
        if (err instanceof AppError) throw err;
        logger.error('evaluateWritingUC: Gemini call failed', { error: err.message });
        throw new AppError(`AI service unavailable: ${err.message}`, 502);
    }

    // ── 7. Build entity (validates shape + types) ─────────────────────────────
    const evaluation = new AiEvaluation({
        bandScore:         parsed.bandScore,
        taskAchievement:   parsed.taskAchievement,
        coherenceCohesion: parsed.coherenceCohesion,
        lexicalResource:   parsed.lexicalResource,
        grammaticalRange:  parsed.grammaticalRange,
        overallFeedback:   parsed.overallFeedback,
        improvements:      parsed.improvements,
    });

    // ── 8. Attach to entity ───────────────────────────────────────────────────
    task.aiEvaluate(evaluation);

    // ── 9. Persist ────────────────────────────────────────────────────────────
    const updated = await saveAiEvaluation(taskId, evaluation);
    logger.debug('evaluateWritingUC: done', { taskId, bandScore: evaluation.bandScore });

    return updated;
}