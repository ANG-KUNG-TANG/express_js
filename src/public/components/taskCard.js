/**
 * taskCard.js — renders a single writing task card
 * Usage: taskCard(task) → returns an HTML string
 */

import { statusBadge } from './statusBadge.js';

export const taskCard = (task) => {
    const due = task.submittedAt
        ? `Submitted: ${new Date(task.submittedAt).toLocaleDateString()}`
        : `Created: ${new Date(task.createdAt).toLocaleDateString()}`;

    return `
        <div class="card task-card" data-id="${task._id || task.id}">
            <div class="card__header">
                <h3 class="card__title">${task.title}</h3>
                ${statusBadge(task.status)}
            </div>
            <div class="card__meta">
                <span class="tag tag--type">${task.taskType}</span>
                <span class="tag tag--exam">${task.examType}</span>
                ${task.wordCount > 0 ? `<span class="tag">${task.wordCount} words</span>` : ''}
                ${task.bandScore !== null && task.bandScore !== undefined
                    ? `<span class="tag tag--score">Band ${task.bandScore}</span>`
                    : ''}
            </div>
            <p class="card__date">${due}</p>
            <div class="card__actions">
                <a href="/pages/tasks/detail.html?id=${task._id || task.id}" class="btn btn--primary btn--sm">View</a>
            </div>
        </div>
    `;
};