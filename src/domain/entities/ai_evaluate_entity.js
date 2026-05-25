// src/domain/entities/ai_evaluate_entity.js

export class AiEvaluation {
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
        this._validate({ bandScore, taskAchievement, coherenceCohesion, lexicalResource, grammaticalRange });

        this._bandScore         = bandScore;
        this._taskAchievement   = taskAchievement;    // { score, feedback }
        this._coherenceCohesion = coherenceCohesion;  // { score, feedback }
        this._lexicalResource   = lexicalResource;    // { score, feedback }
        this._grammaticalRange  = grammaticalRange;   // { score, feedback }
        this._overallFeedback   = overallFeedback;
        this._improvements      = Array.isArray(improvements) ? improvements : [];
        this._evaluatedAt       = evaluatedAt instanceof Date ? evaluatedAt : new Date(evaluatedAt);
    }

    // ── validation ────────────────────────────────────────────────────────────
    _validate({ bandScore, taskAchievement, coherenceCohesion, lexicalResource, grammaticalRange }) {
        if (bandScore === undefined || bandScore === null) {
            throw new Error('AiEvaluation: bandScore is required');
        }
        if (Number(bandScore) < 0 || Number(bandScore) > 9) {
            throw new Error(`AiEvaluation: bandScore must be 0–9, got ${bandScore}`);
        }
        for (const [key, val] of Object.entries({ taskAchievement, coherenceCohesion, lexicalResource, grammaticalRange })) {
            if (!val || isNaN(Number(val.score)) || typeof val.feedback !== 'string') {
                throw new Error(`AiEvaluation: ${key} must have { score: number, feedback: string }`);
            }
            val.score = Number(val.score); // ← coerce "7" → 7
        }
    }

    // ── getters ───────────────────────────────────────────────────────────────
    get bandScore()         { return this._bandScore; }
    get taskAchievement()   { return this._taskAchievement; }
    get coherenceCohesion() { return this._coherenceCohesion; }
    get lexicalResource()   { return this._lexicalResource; }
    get grammaticalRange()  { return this._grammaticalRange; }
    get overallFeedback()   { return this._overallFeedback; }
    get improvements()      { return this._improvements; }
    get evaluatedAt()       { return this._evaluatedAt; }

    // ── serialisation ─────────────────────────────────────────────────────────
    toJSON() {
        return {
            bandScore:         this._bandScore,
            taskAchievement:   this._taskAchievement,
            coherenceCohesion: this._coherenceCohesion,
            lexicalResource:   this._lexicalResource,
            grammaticalRange:  this._grammaticalRange,
            overallFeedback:   this._overallFeedback,
            improvements:      this._improvements,
            evaluatedAt:       this._evaluatedAt,
        };
    }
}