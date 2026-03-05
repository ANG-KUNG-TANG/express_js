/**
 * vocabCard.js — renders a single vocabulary word card.
 *
 * Accepts the normalised shape from /api/vocab/:word (and write.js):
 *   {
 *     word: string,
 *     meanings: [{
 *       partOfSpeech: string,
 *       definitions: [{ definition: string, example: string }]
 *     }]
 *   }
 *
 * Usage: vocabCard(entry) → returns an HTML string
 * The root element has class "vocab-card" and contains ".vocab-word"
 * so write.js insert-button logic can find it via querySelector('.vocab-word').
 */

export const vocabCard = (entry) => {
    if (!entry) return '';

    const word     = entry.word ?? '';
    const meanings = entry.meanings ?? [];

    // Take the first meaning + first definition for the card preview
    const firstMeaning = meanings[0] ?? {};
    const pos          = firstMeaning.partOfSpeech ?? '';
    const firstDef     = firstMeaning.definitions?.[0] ?? {};
    const definition   = firstDef.definition ?? '';
    const example      = firstDef.example    ?? '';

    return `
        <div class="vocab-card">
            <div class="vocab-word">${word}</div>
            ${pos        ? `<span class="vocab-pos">${pos}</span>` : ''}
            ${definition ? `<div class="vocab-def">${definition}</div>` : ''}
            ${example    ? `<div class="vocab-example">"${example}"</div>` : ''}
        </div>
    `;
};