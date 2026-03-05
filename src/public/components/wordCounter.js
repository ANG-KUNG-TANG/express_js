/**
 * wordCounter.js — live word count tracker for write.html
 * Usage: initWordCounter(textareaEl, taskType, displayEl, progressEl, submitBtn)
 */

const MIN_WORDS = {
    TASK_1: 150,
    TASK_2: 250,
};

export const countWords = (text) => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
};

export const initWordCounter = (textareaEl, taskType, displayEl, progressEl, submitBtn) => {
    const minimum = MIN_WORDS[taskType] || 250;

    const update = () => {
        const count = countWords(textareaEl.value);
        const percent = Math.min((count / minimum) * 100, 100);
        const reached = count >= minimum;

        // Update display text
        displayEl.textContent = `${count} / ${minimum} words`;
        displayEl.className = `word-counter ${reached ? 'word-counter--ok' : 'word-counter--warn'}`;

        // Update progress bar
        if (progressEl) {
            progressEl.style.width = `${percent}%`;
            progressEl.className = `progress-bar__fill ${reached ? 'progress-bar__fill--ok' : ''}`;
        }

        // Enable / disable submit
        if (submitBtn) {
            submitBtn.disabled = !reached;
        }
    };

    textareaEl.addEventListener('input', update);
    update(); // run once on init
};