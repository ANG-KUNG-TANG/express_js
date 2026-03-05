/**
 * newsCard.js — renders a single news article as a WorkFlow-styled card.
 * Usage: import { newsCard } from '../../components/newsCard.js';
 *        container.innerHTML = articles.map(a => newsCard(a)).join('');
 */

export const newsCard = (article) => {
    const date = article.pubDate
        ? new Date(article.pubDate).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
          })
        : '';

    const image = article.image_url
        ? `<img class="news-card__image" src="${article.image_url}" alt="" loading="lazy"
               onerror="this.style.display='none'">`
        : '';

    const categories = (article.category ?? [])
        .map(c => `<span class="tag tag--category">${c}</span>`)
        .join('');

    const description = article.description
        ? `<p class="card__excerpt">${article.description.slice(0, 160)}…</p>`
        : '';

    return `
        <article class="card news-card" style="margin-bottom:10px">
            ${image}
            <div class="card__body">
                <div class="card__meta">
                    ${categories}
                    ${date ? `<span class="card__date">${date}</span>` : ''}
                </div>
                <h3 class="card__title">
                    <a href="${article.link}" target="_blank" rel="noopener noreferrer">
                        ${article.title ?? ''}
                    </a>
                </h3>
                ${description}
                <div class="card__footer">
                    ${article.source_name
                        ? `<span class="news-card__source">${article.source_name}</span>`
                        : '<span></span>'}
                    <a href="${article.link}" target="_blank" rel="noopener noreferrer"
                       class="btn btn--ghost btn--sm">
                        Read →
                    </a>
                </div>
            </div>
        </article>`;
};