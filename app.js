'use strict';

const SITE_CONFIG = {
    projects: [],
    starCacheKey: 'github-stars-cache-v1',
    starCacheTtlMs: 12 * 60 * 60 * 1000,
    starFetchTimeoutMs: 5000
};

function getProjectKey(owner, repo) {
    return `${owner}/${repo}`;
}

function normalizeStarCount(shieldsValue) {
    if (typeof shieldsValue !== 'string') return null;
    const value = shieldsValue.trim();
    if (!value) return null;

    const normalized = value.toLowerCase();
    const invalidValues = new Set([
        'invalid',
        'unknown',
        'n/a',
        'na',
        'none',
        'null',
        'undefined',
        '--',
        '-'
    ]);

    if (
        invalidValues.has(normalized) ||
        normalized.includes('unable to select') ||
        normalized.includes('error')
    ) {
        return null;
    }

    return value;
}

function collectProjectsFromDom() {
    const repoSet = new Set();
    const projectLinks = document.querySelectorAll('.project-grid .github-link');

    projectLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const match = href.match(/^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)/i);
        if (!match) return;
        repoSet.add(`${match[1]}/${match[2]}`);
    });

    return Array.from(repoSet).map(repoPath => {
        const [owner, repo] = repoPath.split('/');
        return { owner, repo };
    });
}

function readStarCache() {
    try {
        const raw = localStorage.getItem(SITE_CONFIG.starCacheKey);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (!parsed.timestamp || !parsed.data) return null;

        if (Date.now() - parsed.timestamp > SITE_CONFIG.starCacheTtlMs) {
            return null;
        }
        return parsed.data;
    } catch (error) {
        return null;
    }
}

function writeStarCache(data) {
    try {
        localStorage.setItem(
            SITE_CONFIG.starCacheKey,
            JSON.stringify({ timestamp: Date.now(), data })
        );
    } catch (error) {
        // localStorage 容量或隐私模式错误时静默降级
    }
}

async function fetchWithTimeout(url, timeoutMs) {
    if (typeof AbortController === 'undefined') {
        return fetch(url, { cache: 'default' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            cache: 'default',
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchStarCount(owner, repo) {
    try {
        const url = `https://img.shields.io/github/stars/${owner}/${repo}.json`;
        const response = await fetchWithTimeout(url, SITE_CONFIG.starFetchTimeoutMs);
        if (!response.ok) return null;

        const data = await response.json();
        return normalizeStarCount(data.value || data.message);
    } catch (error) {
        return null;
    }
}

function updateStarCount(owner, repo, starCount) {
    const links = document.querySelectorAll('.github-link');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || !href.includes(`${owner}/${repo}`)) return;

        const statNumber = link.querySelector('.stat-number');
        if (!statNumber || !starCount) return;

        statNumber.style.transition = 'opacity 0.3s ease';
        statNumber.style.opacity = '0';
        setTimeout(() => {
            statNumber.textContent = starCount;
            statNumber.style.opacity = '1';
        }, 300);
    });
}

function applyCachedStars() {
    const cachedStars = readStarCache();
    if (!cachedStars) return;

    SITE_CONFIG.projects.forEach(project => {
        const cacheKey = getProjectKey(project.owner, project.repo);
        const starCount = normalizeStarCount(cachedStars[cacheKey]);
        if (starCount) {
            updateStarCount(project.owner, project.repo, starCount);
        }
    });
}

async function loadAllStars() {
    applyCachedStars();

    const latestStars = {};
    await Promise.all(
        SITE_CONFIG.projects.map(async project => {
            const starCount = await fetchStarCount(project.owner, project.repo);
            if (!starCount) return;
            updateStarCount(project.owner, project.repo, starCount);
            latestStars[getProjectKey(project.owner, project.repo)] = starCount;
        })
    );

    if (Object.keys(latestStars).length > 0) {
        const cachedStars = readStarCache() || {};
        writeStarCache({ ...cachedStars, ...latestStars });
    }
}

function initProjectCardHoverGlow() {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach(card => {
        card.addEventListener('pointermove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });

        card.addEventListener('pointerleave', () => {
            card.style.removeProperty('--mouse-x');
            card.style.removeProperty('--mouse-y');
        });
    });
}

function updateActiveNav() {
    const sections = document.querySelectorAll('.content-section');
    const navLinks = document.querySelectorAll('.nav-link');
    const scrollPosition = window.scrollY + 100;
    let currentSection = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${currentSection}`);
    });
}

function toggleCollapsible(title) {
    const targetId = title.getAttribute('data-target');
    const targetList = document.getElementById(targetId);
    if (!targetList) return;

    const isCollapsed = title.classList.toggle('collapsed');
    targetList.classList.toggle('collapsed');
    title.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
}

function initCollapsibles() {
    const collapsibleTitles = document.querySelectorAll('.collapsible-title');
    collapsibleTitles.forEach(title => {
        const targetId = title.getAttribute('data-target');
        const targetList = document.getElementById(targetId);
        if (!targetList) return;

        const isCollapsed = title.classList.contains('collapsed');
        targetList.classList.toggle('collapsed', isCollapsed);
        title.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');

        title.addEventListener('click', () => toggleCollapsible(title));
        title.addEventListener('keydown', e => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            toggleCollapsible(title);
        });
    });
}

function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    if (!themeToggle || !sunIcon || !moonIcon) return;

    const html = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'dark';

    function applyTheme(theme) {
        const isLight = theme === 'light';
        if (isLight) {
            html.setAttribute('data-theme', 'light');
        } else {
            html.removeAttribute('data-theme');
        }
        sunIcon.style.display = isLight ? 'none' : 'block';
        moonIcon.style.display = isLight ? 'block' : 'none';
        localStorage.setItem('theme', theme);
    }

    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        themeToggle.classList.add('rotating');
        applyTheme(nextTheme);
        setTimeout(() => {
            themeToggle.classList.remove('rotating');
        }, 500);
    });

    themeToggle.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        themeToggle.click();
    });
}

function init() {
    SITE_CONFIG.projects = collectProjectsFromDom();
    void loadAllStars();
    initProjectCardHoverGlow();
    updateActiveNav();
    initCollapsibles();
    initThemeToggle();
    window.addEventListener('scroll', updateActiveNav);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
