// src/domain/entities/ai_evaluate_entity.js

export class AiEvaluation {
    #bandScore;
    #taskAchievement;
    #coherenceCohesion;
    #lexicalResource;
    #grammaticalRange;
    #overallFeedback;
    #improvements;
    #evaluatedAt;

    constructor({
        bandScore,
        taskAchievement,
        coherenceCohesion,
        lexicalResource,
        grammaticalRange,
        overallFeedback,
        improvements,
        evaluatedAt = new Date(),
    }) {
        // Coerce & validate scores before assigning — no mutation of caller's object
        const coerced = AiEvaluation.#coerceCriteria({ taskAchievement, coherenceCohesion, lexicalResource, grammaticalRange });
        AiEvaluation.#validate(bandScore, coerced);

        this.#bandScore         = Number(bandScore);
        this.#taskAchievement   = Object.freeze({ ...coerced.taskAchievement });
        this.#coherenceCohesion = Object.freeze({ ...coerced.coherenceCohesion });
        this.#lexicalResource   = Object.freeze({ ...coerced.lexicalResource });
        this.#grammaticalRange  = Object.freeze({ ...coerced.grammaticalRange });
        this.#overallFeedback   = overallFeedback ?? null;
        this.#improvements      = Object.freeze(Array.isArray(improvements) ? [...improvements] : []);
        this.#evaluatedAt       = evaluatedAt instanceof Date ? evaluatedAt : new Date(evaluatedAt);
    }

    // ── private static helpers ────────────────────────────────────────────────

    /** Returns NEW objects with score coerced to number — never mutates caller's data */
    static #coerceCriteria(criteria) {
        return Object.fromEntries(
            Object.entries(criteria).map(([key, val]) => [
                key,
                val ? { ...val, score: Number(val.score) } : val,
            ])
        );
    }

    static #validate(bandScore, criteria) {
        if (bandScore === undefined || bandScore === null) {
            throw new Error('AiEvaluation: bandScore is required');
        }
        if (Number(bandScore) < 0 || Number(bandScore) > 9) {
            throw new Error(`AiEvaluation: bandScore must be 0–9, got ${bandScore}`);
        }
        for (const [key, val] of Object.entries(criteria)) {
            if (!val || isNaN(val.score) || typeof val.feedback !== 'string') {
                throw new Error(`AiEvaluation: ${key} must have { score: number, feedback: string }`);
            }
        }
    }

    // ── getters ───────────────────────────────────────────────────────────────

    get bandScore()         { return this.#bandScore; }
    get taskAchievement()   { return this.#taskAchievement; }
    get coherenceCohesion() { return this.#coherenceCohesion; }
    get lexicalResource()   { return this.#lexicalResource; }
    get grammaticalRange()  { return this.#grammaticalRange; }
    get overallFeedback()   { return this.#overallFeedback; }
    get improvements()      { return this.#improvements; }
    get evaluatedAt()       { return new Date(this.#evaluatedAt); } // defensive copy

    // ── serialisation ─────────────────────────────────────────────────────────

    toJSON() {
        return {
            bandScore:         this.#bandScore,
            taskAchievement:   { ...this.#taskAchievement },
            coherenceCohesion: { ...this.#coherenceCohesion },
            lexicalResource:   { ...this.#lexicalResource },
            grammaticalRange:  { ...this.#grammaticalRange },
            overallFeedback:   this.#overallFeedback,
            improvements:      [...this.#improvements],
            evaluatedAt:       this.#evaluatedAt,
        };
    }
}