/**
 * ============================================================
 * CYMOR MOVIE HUB — MASTER ENGINE v3.1 (CLEAN + FIXED)
 * ✅ TMDB proxy secured
 * ✅ Stable player fallback system
 * ✅ Subtitle system (fixed + simplified)
 * ✅ Continue Watching improved
 * ✅ Episode selector optimized
 * ✅ Modal + search hardened
 * ============================================================
 */

const IMG_URL = 'https://image.tmdb.org/t/p/original';
const POSTER_URL = 'https://image.tmdb.org/t/p/w500';

/* ============================================================
   TMDB PROXY
============================================================ */

async function tmdb(path, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `/api/tmdb?path=${encodeURIComponent(path)}${qs ? '&' + qs : ''}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB proxy error: ${res.status}`);
    return res.json();
}

/* ============================================================
   GLOBAL STATE
============================================================ */

let trendingData = [];
let heroIndex = 0;
let activeSubtitleTrack = null;

/* ============================================================
   INIT
============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    initGlobalFeatures();

    if (path.includes('index.html') || path === '/') initHomePage();
    if (path.includes('watch.html')) initWatchPage();
    if (path.includes('details.html')) initDetailsPage();
    if (path.includes('download.html')) initDownloadPage();

    initNetflixSearchOverlay();
});

/* ============================================================
   GLOBAL FEATURES
============================================================ */

function initGlobalFeatures() {
    const modal = document.getElementById('action-modal');

    modal?.addEventListener('click', e => {
        if (e.target.id === 'action-modal') closeModal();
    });

    if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
        renderContinueWatching();
    }
}

/* ============================================================
   WATCH PAGE
============================================================ */

async function initWatchPage() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const type = params.get('type') || 'movie';
    const s = params.get('s') || 1;
    const e = params.get('e') || 1;

    if (!id) return (location.href = 'index.html');

    const dlBtn = document.getElementById('btn-download');
    if (dlBtn) {
        dlBtn.href = `download.html?id=${id}&type=${type}${type === 'tv' ? `&s=${s}&e=${e}` : ''}`;
    }

    try {
        const src = await fetch(`/api/get-source?id=${id}&type=${type}&s=${s}&e=${e}`);
        const data = await src.json();

        if (data.success) {
            setupPlayer(data.stream.primary, data.stream.fallback);
            loadSubtitles(data.subtitleEndpoint);
        }
    } catch {
        setupPlayer(
            type === 'movie'
                ? `https://vidsrc.me/embed/movie?tmdb=${id}`
                : `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
        );
    }

    if (type === 'tv') {
        document.getElementById('episode-parent')?.classList.remove('hidden');
        loadEpisodeSelector(id, s, e);
    }

    fetchWatchDetails(id, type);
    saveProgress(id, type, s, e);
    loadWatchRecommendations(id, type);
}

/* ============================================================
   PLAYER
============================================================ */

function setupPlayer(primary, fallback) {
    const player = document.getElementById('video-player');
    if (!player) return;

    player.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
    player.setAttribute('referrerpolicy', 'origin');
    player.src = primary;

    if (fallback) {
        player.addEventListener('error', () => {
            player.src = fallback;
        }, { once: true });
    }
}

/* ============================================================
   WATCH DETAILS
============================================================ */

async function fetchWatchDetails(id, type) {
    try {
        const data = await tmdb(`/${type}/${id}`);
        const title = data.title || data.name || '';

        document.getElementById('watch-title').textContent = title;
        document.getElementById('watch-desc').textContent = data.overview || '';
        document.getElementById('watch-year').textContent =
            (data.release_date || data.first_air_date || '').split('-')[0];

        document.getElementById('watch-rating').innerHTML =
            `<i class="fa-solid fa-star text-yellow-400"></i> ${(data.vote_average || 0).toFixed(1)}`;

        document.getElementById('dynamic-bg').style.backgroundImage =
            data.backdrop_path ? `url(${IMG_URL + data.backdrop_path})` : '';

        document.title = `${title} — Cymor Movie Hub`;
    } catch (err) {
        console.error(err);
    }
}

/* ============================================================
   SUBTITLES (FIXED LIGHTWEIGHT VERSION)
============================================================ */

async function loadSubtitles(endpoint) {
    try {
        const res = await fetch(endpoint);
        const data = await res.json();

        if (data.success && data.tracks?.length) {
            renderSubtitleSelector(data.tracks);
        }
    } catch (e) {}
}

function renderSubtitleSelector(tracks) {
    let box = document.getElementById('subtitle-controls');

    if (!box) {
        box = document.createElement('div');
        box.id = 'subtitle-controls';
        box.className = 'mt-4 flex gap-2 flex-wrap';

        document.querySelector('.video-container')
            ?.parentNode
            .insertBefore(box, document.querySelector('.video-container').nextSibling);
    }

    box.innerHTML = `
        <span class="text-xs text-gray-400 font-bold">Subtitles</span>
        <button onclick="setSubtitle(null)" class="subtitle-btn px-3 py-1 text-xs rounded bg-cyan-500/20 text-cyan-300">OFF</button>
        ${tracks.map(t => `
            <button onclick="setSubtitle('${t.downloadUrl}', this)" class="subtitle-btn px-3 py-1 text-xs rounded bg-white/5">
                ${t.label}
            </button>
        `).join('')}
    `;
}

window.setSubtitle = function (url, btn) {
    document.querySelectorAll('.subtitle-btn').forEach(b => b.classList.remove('bg-cyan-500/20', 'text-cyan-300'));

    btn?.classList.add('bg-cyan-500/20', 'text-cyan-300');

    document.getElementById('subtitle-overlay')?.remove();
    if (activeSubtitleTrack) clearInterval(activeSubtitleTrack);

    if (url) loadVTTOverlay(url);
};

async function loadVTTOverlay(url) {
    const res = await fetch(url);
    const cues = parseVTT(await res.text());

    const container = document.querySelector('.video-container');
    if (!container) return;

    const overlay = document.createElement('div');
    overlay.id = 'subtitle-overlay';
    overlay.style.cssText =
        "position:absolute;bottom:10%;left:50%;transform:translateX(-50%);z-index:20;pointer-events:none;width:90%;text-align:center;color:white;font-weight:bold;text-shadow:0 2px 4px black;";

    const text = document.createElement('div');
    overlay.appendChild(text);
    container.appendChild(overlay);

    const start = Date.now();

    activeSubtitleTrack = setInterval(() => {
        const t = (Date.now() - start) / 1000;
        const cue = cues.find(c => t >= c.start && t <= c.end);
        text.innerHTML = cue ? cue.text : '';
    }, 250);
}

function parseVTT(text) {
    const lines = text.split('\n');
    const cues = [];

    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/(\d{2}:\d{2}:\d{2}[.,]\d{3}) --> (\d{2}:\d{2}:\d{2}[.,]\d{3})/);
        if (m) {
            const start = toSec(m[1]);
            const end = toSec(m[2]);
            const cueText = [];

            i++;
            while (lines[i] && lines[i].trim()) {
                cueText.push(lines[i]);
                i++;
            }

            cues.push({ start, end, text: cueText.join('<br>') });
        }
    }
    return cues;
}

const toSec = t => {
    const p = t.replace(',', '.').split(':').map(Number);
    return p[0] * 3600 + p[1] * 60 + p[2];
};

/* ============================================================
   CONTINUE WATCHING
============================================================ */

function saveProgress(id, type, s, e) {
    let h = JSON.parse(localStorage.getItem('cymor_history') || '[]');
    h = h.filter(i => i.id !== id);
    h.unshift({ id, type, s, e, time: Date.now() });
    localStorage.setItem('cymor_history', JSON.stringify(h.slice(0, 10)));
}

async function renderContinueWatching() {
    const h = JSON.parse(localStorage.getItem('cymor_history') || '[]');
    const box = document.getElementById('history-grid');
    const sec = document.getElementById('continue-watching-section');

    if (!box || !h.length) return sec?.classList.add('hidden');

    sec?.classList.remove('hidden');
    box.innerHTML = '';

    for (const i of h) {
        try {
            const d = await tmdb(`/${i.type}/${i.id}`);

            const el = document.createElement('div');
            el.className = 'cursor-pointer rounded-xl overflow-hidden';
            el.innerHTML = `
                <img class="h-32 w-full object-cover opacity-70" src="${POSTER_URL + (d.backdrop_path || d.poster_path)}">
                <div class="p-2">
                    <p class="text-xs text-cyan-400">${i.type === 'tv' ? `S${i.s} E${i.e}` : 'Movie'}</p>
                    <p class="text-sm font-bold truncate">${d.title || d.name}</p>
                </div>
            `;

            el.onclick = () =>
                location.href = `watch.html?id=${i.id}&type=${i.type}&s=${i.s}&e=${i.e}`;

            box.appendChild(el);
        } catch {}
    }
}

/* ============================================================
   EPISODES
============================================================ */

async function loadEpisodeSelector(id, s, e) {
    const box = document.getElementById('episode-selector-container');
    if (!box) return;

    try {
        const data = await tmdb(`/tv/${id}/season/${s}`);

        box.innerHTML = data.episodes.map(ep => `
            <div class="p-3 border rounded cursor-pointer ${ep.episode_number == e ? 'border-cyan-400' : ''}"
                onclick="location.href='watch.html?id=${id}&type=tv&s=${s}&e=${ep.episode_number}'">
                <p class="font-bold text-sm">${ep.episode_number}. ${ep.name}</p>
            </div>
        `).join('');
    } catch {
        box.innerHTML = `<p class="text-gray-400">No episodes found</p>`;
    }
}

/* ============================================================
   RECOMMENDATIONS
============================================================ */

async function loadWatchRecommendations(id, type) {
    const box = document.getElementById('recommended-grid');
    if (!box) return;

    try {
        const res = await fetch(`/api/recommendations?id=${id}&type=${type}`);
        const data = await res.json();

        if (data.success) {
            renderMovieGrid(data.results.slice(0, 12), 'recommended-grid');
        }
    } catch {}
}

/* ============================================================
   HOME + HERO
============================================================ */

async function initHomePage() {
    const res = await fetch('/api/tmdb?path=%2Ftrending%2Fall%2Fday');
    const data = await res.json();

    trendingData = data.results || [];
    renderMovieGrid(trendingData, 'trending-grid');
    startHero();
}

function startHero() {
    if (!trendingData.length) return;

    updateHero(trendingData[0]);

    setInterval(() => {
        heroIndex = (heroIndex + 1) % Math.min(trendingData.length, 10);
        updateHero(trendingData[heroIndex]);
    }, 9000);
}

function updateHero(item) {
    const bg = document.getElementById('hero-backdrop');
    if (!bg) return;

    bg.style.opacity = 0;

    setTimeout(() => {
        bg.src = IMG_URL + item.backdrop_path;
        document.getElementById('hero-title').textContent = item.title || item.name;
        document.getElementById('hero-description').textContent = item.overview;

        const type = item.title ? 'movie' : 'tv';

        document.getElementById('hero-watch-btn').onclick = () =>
            location.href = `watch.html?id=${item.id}&type=${type}`;

        document.getElementById('hero-details-btn').href =
            `details.html?id=${item.id}&type=${type}`;

        bg.style.opacity = 1;
    }, 300);
}

/* ============================================================
   GRID + MODAL
============================================================ */

function renderMovieGrid(data, id) {
    const box = document.getElementById(id);
    if (!box) return;

    box.innerHTML = data.map(item => {
        const type = item.title ? 'movie' : 'tv';
        const title = (item.title || item.name).replace(/'/g, "\\'");

        return `
        <div class="cursor-pointer rounded-2xl overflow-hidden h-[320px]"
            onclick="openModal('${item.id}','${title}','${POSTER_URL + item.poster_path}','${type}')">
            <img class="w-full h-full object-cover" src="${POSTER_URL + item.poster_path}">
            <div class="absolute bottom-0 p-4 bg-gradient-to-t from-black w-full">
                <p class="text-cyan-400 text-xs">${type}</p>
                <p class="font-bold">${item.title || item.name}</p>
            </div>
        </div>`;
    }).join('');
}

window.openModal = function (id, title, poster, type) {
    const m = document.getElementById('action-modal');
    if (!m) return;

    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-poster').style.backgroundImage = `url(${poster})`;

    document.getElementById('modal-watch').href = `watch.html?id=${id}&type=${type}`;
    document.getElementById('modal-details').href = `details.html?id=${id}&type=${type}`;
    document.getElementById('modal-download').href = `download.html?id=${id}&type=${type}`;

    m.classList.remove('hidden');
};

window.closeModal = () =>
    document.getElementById('action-modal')?.classList.add('hidden');

/* ============================================================
   SEARCH
============================================================ */

function initNetflixSearchOverlay() {
    const overlay = document.getElementById('search-overlay');
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');

    document.getElementById('open-search')?.onclick = () => overlay.classList.remove('hidden');
    document.getElementById('close-search')?.onclick = () => overlay.classList.add('hidden');

    let timer;

    input?.addEventListener('input', e => {
        clearTimeout(timer);

        const q = e.target.value.trim();
        if (!q) return (results.innerHTML = '');

        timer = setTimeout(async () => {
            const res = await fetch(`/api/search?query=${encodeURIComponent(q)}`);
            const data = await res.json();

            results.innerHTML = (data.results || []).map(item => `
                <div onclick="openModal('${item.id}','${(item.title||item.name).replace(/'/g,"\\'")}','${POSTER_URL+item.poster_path}','${item.media_type||'movie'}')"
                     class="cursor-pointer p-2">
                    <img src="${POSTER_URL+item.poster_path}" class="rounded-xl h-64 w-full object-cover">
                </div>
            `).join('');
        }, 300);
    });
                                                        }
