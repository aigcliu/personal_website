'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');

const REPO_DIR = __dirname;
const TEMPLATE_PATH = path.join(REPO_DIR, 'index.template.html');
const DATA_PATH = path.join(REPO_DIR, 'content-data.json');
const OUTPUT_PATH = path.join(REPO_DIR, 'index.html');
const STAR_FETCH_TIMEOUT_MS = 5000;
const NEWS_RECENT_MONTHS = 6;
const NEWS_MIN_VISIBLE = 3;
const MONTH_INDEX = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

const GITHUB_ICON_PATH =
    'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';

function formatStarCount(stars) {
    if (!Number.isFinite(stars) || stars < 0) return null;
    if (stars >= 1000000) {
        return `${(stars / 1000000).toFixed(1).replace(/\.0$/, '')}m`;
    }
    if (stars >= 1000) {
        return `${(stars / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return String(stars);
}

function fetchRepoStars(owner, repo) {
    return new Promise(resolve => {
        const request = https.request(
            {
                hostname: 'api.github.com',
                path: `/repos/${owner}/${repo}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'personal-website-build',
                    Accept: 'application/vnd.github+json'
                }
            },
            response => {
                let raw = '';
                response.setEncoding('utf8');
                response.on('data', chunk => {
                    raw += chunk;
                });
                response.on('end', () => {
                    if (response.statusCode !== 200) {
                        resolve(null);
                        return;
                    }
                    try {
                        const parsed = JSON.parse(raw);
                        if (typeof parsed.stargazers_count === 'number') {
                            resolve(parsed.stargazers_count);
                            return;
                        }
                    } catch (error) {
                        // 解析失败时静默回退，保留原始星标
                    }
                    resolve(null);
                });
            }
        );

        request.setTimeout(STAR_FETCH_TIMEOUT_MS, () => {
            request.destroy();
            resolve(null);
        });

        request.on('error', () => {
            resolve(null);
        });
        request.end();
    });
}

async function refreshProjectStars(projects) {
    const refreshedProjects = await Promise.all(
        projects.map(async project => {
            if (!project.owner || !project.repo) return project;
            const starCount = await fetchRepoStars(project.owner, project.repo);
            const formatted = formatStarCount(starCount);
            if (!formatted) return project;
            return {
                ...project,
                stars: formatted
            };
        })
    );

    const refreshedCount = refreshedProjects.filter((project, index) => {
        const before = projects[index] ? projects[index].stars : null;
        return project.stars !== before;
    }).length;

    return { refreshedProjects, refreshedCount };
}

function parseNewsMonth(dateText) {
    const match = /([A-Za-z]{3})[a-z]*\s+(\d{4})/.exec(dateText || '');
    if (!match) return null;
    const month = MONTH_INDEX[match[1]];
    if (month === undefined) return null;
    return { year: Number(match[2]), month };
}

function newsAgeInMonths(newsMonth, now) {
    return (now.getFullYear() - newsMonth.year) * 12 + (now.getMonth() - newsMonth.month);
}

function renderNewsItems(news) {
    // 构建时先按当天划分近半年动态，其余折叠。app.js 会在页面打开时按访问日期重新划分，
    // 避免静态页面长期不重新构建导致过期条目仍然展开显示。
    const now = new Date();
    const recentNews = [];
    const olderNews = [];

    news.forEach(item => {
        const newsMonth = parseNewsMonth(item.date);
        if (newsMonth && newsAgeInMonths(newsMonth, now) > NEWS_RECENT_MONTHS) {
            olderNews.push(item);
        } else {
            recentNews.push(item); // 日期格式未知时默认按最新处理
        }
    });

    // 保证 News 区域不会因为长期没有更新而变成空列表
    while (recentNews.length < NEWS_MIN_VISIBLE && olderNews.length > 0) {
        recentNews.push(olderNews.shift());
    }

    const renderItem = item => {
        const newsMonth = parseNewsMonth(item.date);
        const dateAttr = newsMonth
            ? ` data-news-date="${newsMonth.year}-${String(newsMonth.month + 1).padStart(2, '0')}"`
            : '';
        return `                        <li class="news-item"${dateAttr}>
                            <span class="news-date">${item.date || ''}</span>
                            <span class="news-text">${item.textHtml || ''}</span>
                        </li>`;
    };

    return `${recentNews.map(renderItem).join('\n')}
                        <li class="news-more-container"${olderNews.length > 0 ? '' : ' hidden'}>
                            <button class="news-more-btn" id="newsMoreBtn" aria-expanded="false">
                                <span class="btn-text">Show more news</span>
                                <span class="btn-icon">▼</span>
                            </button>
                            <ul class="news-more-list collapsed" id="newsMoreList">
${olderNews.map(renderItem).join('\n')}
                            </ul>
                        </li>`;
}

function renderProjectCards(projects) {
    return projects
        .map(project => {
            const statusHtml = project.status
                ? `\n                                <span class="project-status ${project.statusClass || ''}">${project.status}</span>`
                : '';
            const repoUrl = `https://github.com/${project.owner}/${project.repo}`;
            return `                        <div class="project-card">
                        <div class="project-header">
                            <h3 class="project-title">
                                ${project.name || ''}${statusHtml}
                            </h3>
                            <div class="project-stats">
                                <a href="${repoUrl}" target="_blank" rel="noopener noreferrer" class="github-link">
                                    <svg class="github-logo" viewBox="0 0 16 16" width="20" height="20" fill="currentColor">
                                        <path d="${GITHUB_ICON_PATH}"></path>
                                    </svg>
                                    <span class="stat-number">${project.stars || '--'}</span>
                                </a>
                            </div>
                        </div>
                        <p class="project-description">
                            ${project.description || ''}
                        </p>
                        </div>`;
        })
        .join('\n\n');
}

function renderPublicationCategory(category) {
    const titleId = `${category.id}-title`;
    const itemsHtml = category.items
        .map(
            item => `                        <div class="publication">
                            <h3 class="publication-title">
                                <span class="publication-number">${item.number}</span> <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="publication-title-link">${item.title}</a>
                                <span class="publication-venue-inline">${item.venue}</span>
                            </h3>
                            <p class="publication-authors">
                                ${item.authorsHtml}
                            </p>
                        </div>`
        )
        .join('\n\n');

    return `                    <div class="publication-category">
                        <h3 id="${titleId}" class="publication-category-title collapsible-title collapsed" data-target="${category.id}" role="button" aria-expanded="false" aria-controls="${category.id}" tabindex="0">
                            ${category.name} <span class="collapse-icon" aria-hidden="true">▼</span>
                        </h3>

                        <div class="publication-list collapsed" id="${category.id}" role="region" aria-labelledby="${titleId}">
${itemsHtml}
                        </div>
                    </div>`;
}

function renderPublicationsSection(publications) {
    const categoriesHtml = publications.map(renderPublicationCategory).join('\n\n');
    return `            <!-- 学术论文 -->
            <section id="publications" class="content-section" aria-labelledby="publications-title">
                <h2 id="publications-title" class="section-title">Publications</h2>
                <div class="section-content">

${categoriesHtml}

                </div>
            </section>`;
}

async function build() {
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const contentData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

    const shouldRefreshStars = !process.argv.includes('--no-refresh-stars');
    const shouldWriteStars = process.argv.includes('--write-stars');
    if (shouldRefreshStars) {
        const { refreshedProjects, refreshedCount } = await refreshProjectStars(
            contentData.projects || []
        );
        contentData.projects = refreshedProjects;
        console.log(`[stars] refreshed=${refreshedCount}/${refreshedProjects.length}`);

        if (shouldWriteStars) {
            fs.writeFileSync(DATA_PATH, `${JSON.stringify(contentData, null, 2)}\n`);
            console.log('[stars] content-data.json updated');
        }
    }

    const newsItems = renderNewsItems(contentData.news || []);
    const projectCards = renderProjectCards(contentData.projects || []);
    const publicationsSection = renderPublicationsSection(contentData.publications || []);

    const rendered = template
        .replace('{{NEWS_ITEMS}}', newsItems)
        .replace('{{PROJECT_CARDS}}', projectCards)
        .replace('{{PUBLICATIONS_SECTION}}', publicationsSection);

    fs.writeFileSync(OUTPUT_PATH, rendered);

    const pubCount = (contentData.publications || []).reduce(
        (sum, category) => sum + (category.items || []).length,
        0
    );
    console.log(
        `Build complete: news=${(contentData.news || []).length}, projects=${
            (contentData.projects || []).length
        }, publications=${pubCount}`
    );
}

build().catch(error => {
    console.error(`Build failed: ${error && error.message ? error.message : String(error)}`);
    process.exit(1);
});
