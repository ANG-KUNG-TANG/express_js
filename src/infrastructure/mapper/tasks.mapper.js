// src/infrastructure/mapper/tasks_mapper.js
//
// What this file used to do:
//   toDomain      — lean doc  → WritingTask entity   (now lives in task_repo.js)
//   toPersistence — entity    → plain object          (now lives in task_repo.js)
//   toResponseDTO — entity    → API response shape    (kept here — still needed)
//
// toDomain and toPersistence were moved into task_repo.js (inline mapping pattern).
// This file is now the single place that defines the public API response shape.
// Import it in controllers or use-case presenters — never in the repo.

/**
 * toResponseDTO(entity)
 *
 * Transforms a WritingTask domain entity into a decoupled, trimmed response
 * object for API clients.  Only exposes fields the client needs — internal
 * state (raw text, AI internals, notification timestamps) is omitted unless
 * specifically included here.
 *
 * Add / remove fields here to change the API surface without touching the entity
 * or the repository.
 */
export function toResponseDTO(entity) {
    if (!entity) return null;

    const json = entity.toJSON();

    return {
        id:               json.id,
        title:            json.title,
        description:      json.description,
        status:           json.status,
        taskType:         json.taskType,
        examType:         json.examType,
        questionPrompt:   json.questionPrompt,
        submissionText:   json.submissionText,
        wordCount:        json.wordCount,
        bandScore:        json.bandScore,
        feedback:         json.feedback,
        submittedAt:      json.submittedAt,
        reviewedAt:       json.reviewedAt,
        createdAt:        json.createdAt,
        dueDate:          json.dueDate,
        source:           json.source,
        assignmentStatus: json.assignmentStatus,
        declineReason:    json.declineReason,
        // Computed flags — convenience for the client
        isAssigned:       entity.isAssigned(),
        isSelfCreated:    entity.isSelfCreated(),
        isAccepted:       entity.isAccepted(),
        // Nested AI result
        aiEvaluation:     json.aiEvaluation ?? null,
    };
}

/** Map an array of entities to response DTOs. */
export const toResponseDTOList = (entities) => entities.map(toResponseDTO).filter(Boolean);