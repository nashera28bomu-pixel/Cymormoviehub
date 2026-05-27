/**
 * ============================================================
 * CYMOR MOVIE HUB — MASTER ENGINE v5.0
 * ✅ Stable Multi-Server Streaming
 * ✅ Auto Fallback Switching
 * ✅ Mobile Optimized
 * ✅ Netflix Style Hero
 * ✅ Subtitle Support
 * ✅ Render Free Tier Optimized
 * ============================================================
 */

const IMG_URL = 'https://image.tmdb.org/t/p/original';
const POSTER_URL = 'https://image.tmdb.org/t/p/w500';

let trendingData = [];
let heroIndex = 0;

/* ============================================================
   TMDB FETCHER
============================================================ */

async function tmdb(path, params = {}) {

    const qs = new URLSearchParams(params).toString();

    const url =
        `/api/tmdb?path=${encodeURIComponent(path)}` +
        `${qs ? '&' + qs : ''}`;

    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`TMDB Proxy Error: ${res.status}`);
    }

    return res.json();
}

/* ============================================================
   APP INITIALIZER
============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    const path = window.location.pathname;

    initGlobalFeatures();

    if (path.includes('watch.html')) {
        initWatchPage();
    }

    else if (path.includes('details.html')) {
        initDetailsPage();
    }

    else if (path.includes('download.html')) {
        initDownloadPage();
    }

    else {
        initHomePage();
    }

    initNetflixSearchOverlay();
});

/* ============================================================
   GLOBAL FEATURES
============================================================ */

function initGlobalFeatures() {

    const modal = document.getElementById('action-modal');

    if (modal) {

        modal.addEventListener('click', e => {

            if (e.target.id === 'action-modal') {
                closeModal();
            }
        });
    }
}

/* ============================================================
   WATCH PAGE
============================================================ */

async function initWatchPage() {

    const params = new URLSearchParams(
        window.location.search
    );

    const id = params.get('id');

    const type =
        params.get('type') || 'movie';

    const s =
        params.get('s') || 1;

    const e =
        params.get('e') || 1;

    if (!id) {
        window.location.href = 'index.html';
        return;
    }

    setupDownloadButton(id, type, s, e);

    await loadStream(id, type, s, e);

    if (type === 'tv') {

        document
            .getElementById('episode-parent')
            ?.classList.remove('hidden');

        loadEpisodeSelector(id, s, e);
    }

    fetchWatchDetails(id, type);

    loadWatchRecommendations(id, type);

    saveProgress(id, type, s, e);
}

/* ============================================================
   DOWNLOAD BUTTON
============================================================ */

function setupDownloadButton(id, type, s, e) {

    const btn =
        document.getElementById('btn-download');

    if (!btn) return;

    btn.href =
        `download.html?id=${id}&type=${type}` +
        `${type === 'tv'
            ? `&s=${s}&e=${e}`
            : ''
        }`;
}

/* ============================================================
   LOAD STREAM
============================================================ */

async function loadStream(id, type, s, e) {

    try {

        const res = await fetch(
            `/api/get-source?id=${id}&type=${type}&s=${s}&e=${e}`
        );

        const data = await res.json();

        if (!data.success) {
            throw new Error('No stream available');
        }

        setupPlayer(data.stream);

        if (data.subtitleEndpoint) {
            loadSubtitles(data.subtitleEndpoint);
        }

    } catch (err) {

        console.error('STREAM ERROR:', err);

        showPlayerError(
            'Streaming source unavailable.'
        );
    }
}

/* ============================================================
   PLAYER ENGINE
============================================================ */

function setupPlayer(streams) {

    const iframe =
        document.getElementById('video-player');

    if (!iframe) return;

    const servers = [
        streams.primary,
        streams.fallback,
        streams.backup
    ].filter(Boolean);

    let current = 0;

    function loadServer(index) {

        iframe.src = servers[index];

        updateServerIndicator(index);

        console.log(
            `Loaded server ${index + 1}`
        );
    }

    iframe.onload = () => {

        console.log(
            'Player loaded successfully'
        );
    };

    iframe.onerror = () => {

        current++;

        if (current < servers.length) {

            console.log(
                'Switching to fallback server'
            );

            loadServer(current);

        } else {

            showPlayerError(
                'All streaming servers failed.'
            );
        }
    };

    loadServer(current);
}

/* ============================================================
   PLAYER ERROR UI
============================================================ */

function showPlayerError(message) {

    const wrapper =
        document.getElementById('player-wrapper');

    if (!wrapper) return;

    wrapper.innerHTML = `
        <div class="w-full h-full flex items-center justify-center rounded-2xl bg-black text-white text-center p-8">
            <div>
                <i class="fa-solid fa-circle-exclamation text-4xl text-red-500 mb-4"></i>
                <p class="font-bold text-lg">${message}</p>
            </div>
        </div>
    `;
}

/* ============================================================
   SERVER INDICATOR
============================================================ */

function updateServerIndicator(index) {

    const primary =
        document.getElementById('server-primary');

    const fallback =
        document.getElementById('server-fallback');

    if (primary) {
        primary.classList.remove(
            'bg-cyan-500/20',
            'text-cyan-400'
        );
    }

    if (fallback) {
        fallback.classList.remove(
            'bg-cyan-500/20',
            'text-cyan-400'
        );
    }

    if (index === 0 && primary) {

        primary.classList.add(
            'bg-cyan-500/20',
            'text-cyan-400'
        );
    }

    else if (fallback) {

        fallback.classList.add(
            'bg-cyan-500/20',
            'text-cyan-400'
        );
    }
}

/* ============================================================
   SUBTITLE SYSTEM
============================================================ */

async function loadSubtitles(endpoint) {

    const container =
        document.getElementById(
            'subtitle-controls'
        );

    try {

        const res = await fetch(endpoint);

        const data = await res.json();

        if (
            data.success &&
            data.tracks?.length
        ) {

            renderSubtitleTracks(
                data.tracks
            );

        } else {

            if (container) {

                container.innerHTML = `
                    <span class="text-xs opacity-40">
                        No subtitles available
                    </span>
                `;
            }
        }

    } catch (err) {

        console.warn(
            'Subtitle fetch failed'
        );
    }
}

function renderSubtitleTracks(tracks) {

    const container =
        document.getElementById(
            'subtitle-controls'
        );

    if (!container) return;

    container.innerHTML = tracks
        .slice(0, 8)
        .map(track => `
            <button
                class="glass px-3 py-1 rounded-xl text-xs hover:bg-cyan-500/20 transition"
                onclick="alert('Enable subtitles inside player settings')"
            >
                ${track.label}
            </button>
        `)
        .join('');
}

/* ============================================================
   WATCH DETAILS
============================================================ */

async function fetchWatchDetails(id, type) {

    try {

        const data = await tmdb(
            `/${type}/${id}`
        );

        const title =
            data.title || data.name;

        const year =
            (
                data.release_date ||
                data.first_air_date ||
                ''
            ).split('-')[0];

        const rating =
            (data.vote_average || 0)
            .toFixed(1);

        document.title =
            `${title} — Cymor Hub`;

        const titleEl =
            document.getElementById(
                'watch-title'
            );

        const descEl =
            document.getElementById(
                'watch-desc'
            );

        const yearEl =
            document.getElementById(
                'watch-year'
            );

        const ratingEl =
            document.getElementById(
                'watch-rating'
            );

        if (titleEl) {
            titleEl.innerText = title;
        }

        if (descEl) {
            descEl.innerText =
                data.overview ||
                'No description available.';
        }

        if (yearEl) {
            yearEl.innerText = year;
        }

        if (ratingEl) {
            ratingEl.innerHTML =
                `<i class="fa-solid fa-star text-yellow-500"></i> ${rating}`;
        }

        const bg =
            document.getElementById(
                'dynamic-bg'
            );

        if (
            bg &&
            data.backdrop_path
        ) {
            bg.style.backgroundImage =
                `url(${IMG_URL + data.backdrop_path})`;
        }

    } catch (err) {

        console.warn(
            'Failed to load details'
        );
    }
}

/* ============================================================
   EPISODES
============================================================ */

async function loadEpisodeSelector(
    id,
    currentS,
    currentE
) {

    const container =
        document.getElementById(
            'episode-selector-container'
        );

    if (!container) return;

    try {

        const data = await tmdb(
            `/tv/${id}/season/${currentS}`
        );

        container.innerHTML =
            data.episodes.map(ep => `
                <div
                    class="p-4 rounded-2xl border cursor-pointer transition hover:bg-white/5
                    ${ep.episode_number == currentE
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-white/5'
                    }"
                    onclick="window.location.href='watch.html?id=${id}&type=tv&s=${currentS}&e=${ep.episode_number}'"
                >
                    <p class="text-xs opacity-40 mb-1">
                        Episode ${ep.episode_number}
                    </p>

                    <p class="font-bold text-sm truncate">
                        ${ep.name}
                    </p>
                </div>
            `).join('');

    } catch {

        container.innerHTML = `
            <p class="opacity-50 text-xs">
                Episodes unavailable.
            </p>
        `;
    }
}

/* ============================================================
   RECOMMENDATIONS
============================================================ */

async function loadWatchRecommendations(
    id,
    type
) {

    const container =
        document.getElementById(
            'recommended-grid'
        );

    if (!container) return;

    try {

        const data = await tmdb(
            `/${type}/${id}/recommendations`
        );

        const results =
            data.results.slice(0, 6);

        renderMovieGrid(
            results,
            'recommended-grid'
        );

    } catch {}
}

/* ============================================================
   HISTORY
============================================================ */

function saveProgress(id, type, s, e) {

    let history = JSON.parse(
        localStorage.getItem(
            'cymor_history'
        ) || '[]'
    );

    history = history.filter(
        item => item.id !== id
    );

    history.unshift({
        id,
        type,
        s,
        e,
        ts: Date.now()
    });

    localStorage.setItem(
        'cymor_history',
        JSON.stringify(history.slice(0, 20))
    );
}

/* ============================================================
   HOME PAGE
============================================================ */

async function initHomePage() {

    try {

        const data = await tmdb(
            '/trending/all/day'
        );

        trendingData =
            (data.results || [])
            .filter(
                item =>
                    item.poster_path &&
                    item.backdrop_path
            )
            .slice(0, 12);

        renderMovieGrid(
            trendingData,
            'trending-grid'
        );

        startHeroRotation();

    } catch {

        console.warn(
            'Failed to load homepage'
        );
    }
}

/* ============================================================
   HERO ROTATION
============================================================ */

function startHeroRotation() {

    if (!trendingData.length) return;

    const update = index => {

        const item =
            trendingData[index];

        const bg =
            document.getElementById(
                'hero-backdrop'
            );

        if (!bg) return;

        bg.style.opacity = 0;

        setTimeout(() => {

            bg.src =
                IMG_URL +
                item.backdrop_path;

            document.getElementById(
                'hero-title'
            ).innerText =
                item.title || item.name;

            document.getElementById(
                'hero-description'
            ).innerText =
                item.overview;

            const type =
                item.media_type ||
                (item.title
                    ? 'movie'
                    : 'tv');

            document.getElementById(
                'hero-watch-btn'
            ).href =
                `watch.html?id=${item.id}&type=${type}`;

            bg.style.opacity = 1;

        }, 400);
    };

    update(0);

    setInterval(() => {

        heroIndex =
            (heroIndex + 1) %
            trendingData.length;

        update(heroIndex);

    }, 8000);
}

/* ============================================================
   MOVIE GRID
============================================================ */

function renderMovieGrid(
    data,
    containerId
) {

    const container =
        document.getElementById(
            containerId
        );

    if (!container) return;

    container.innerHTML =
        data.map(item => {

            const type =
                item.media_type ||
                (item.title
                    ? 'movie'
                    : 'tv');

            return `
                <div
                    class="movie-card relative rounded-[2rem] overflow-hidden cursor-pointer h-80 group shadow-xl"
                    onclick="window.location.href='details.html?id=${item.id}&type=${type}'"
                >

                    <img
                        src="${POSTER_URL + item.poster_path}"
                        class="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                    >

                    <div class="absolute bottom-0 p-6 bg-gradient-to-t from-black via-black/60 to-transparent w-full">

                        <p class="text-cyan-400 font-black text-[10px] uppercase tracking-widest">
                            ${type}
                        </p>

                        <p class="text-white font-bold truncate">
                            ${item.title || item.name}
                        </p>

                    </div>
                </div>
            `;

        }).join('');
}

/* ============================================================
   SEARCH
============================================================ */

function initNetflixSearchOverlay() {

    const overlay =
        document.getElementById(
            'search-overlay'
        );

    const input =
        document.getElementById(
            'search-input'
        );

    const results =
        document.getElementById(
            'search-results'
        );

    document
        .getElementById('open-search')
        ?.addEventListener('click', () => {

            overlay?.classList.remove(
                'hidden'
            );

            input?.focus();
        });

    document
        .getElementById('close-search')
        ?.addEventListener('click', () => {

            overlay?.classList.add(
                'hidden'
            );
        });

    let timeout;

    input?.addEventListener(
        'input',
        e => {

            clearTimeout(timeout);

            const query =
                e.target.value.trim();

            if (!query) return;

            timeout = setTimeout(
                async () => {

                    try {

                        const res =
                            await fetch(
                                `/api/search?query=${encodeURIComponent(query)}`
                            );

                        const data =
                            await res.json();

                        renderMovieGrid(
                            data.results.slice(0, 12),
                            'search-results'
                        );

                    } catch {}

                },
                400
            );
        }
    );
}
