/**
 * ============================================================
 * CYMOR MOVIE HUB — MASTER ENGINE v4.0 (ELITE)
 * ✅ Consumet Scraper Integration
 * ✅ Auto-Failover to vidsrc.to
 * ✅ Ad-Block Sandbox Handshake
 * ============================================================
 */

const IMG_URL    = 'https://image.tmdb.org/t/p/original';
const POSTER_URL = 'https://image.tmdb.org/t/p/w500';

// ── Shared TMDB Fetcher ──
async function tmdb(path, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `/api/tmdb?path=${encodeURIComponent(path)}${qs ? '&' + qs : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB Proxy: ${res.status}`);
    return res.json();
}

let trendingData = [];
let heroIndex    = 0;

document.addEventListener('DOMContentLoaded', () => {
    const p = window.location.pathname;
    initGlobalFeatures();

    if (p.includes('index.html') || p === '/') initHomePage();
    else if (p.includes('watch.html'))        initWatchPage();
    else if (p.includes('details.html'))      initDetailsPage();
    else if (p.includes('download.html'))     initDownloadPage();

    initNetflixSearchOverlay();
});

function initGlobalFeatures() {
    const modal = document.getElementById('action-modal');
    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target.id === 'action-modal') closeModal();
        });
    }
}

/* ============================================================
   WATCH PAGE LOGIC (v4.0 SCRAPER INTEGRATION)
============================================================ */

async function initWatchPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id'), type = params.get('type') || 'movie';
    const s = params.get('s') || 1, e = params.get('e') || 1;

    if (!id) { window.location.href = 'index.html'; return; }

    // Update Download Link
    const dlBtn = document.getElementById('btn-download');
    if (dlBtn) dlBtn.href = `download.html?id=${id}&type=${type}${type === 'tv' ? `&s=${s}&e=${e}` : ''}`;

    try {
        // Fetch source from Elite Scraper Endpoint
        const res = await fetch(`/api/get-source?id=${id}&type=${type}&s=${s}&e=${e}`);
        const data = await res.json();
        
        if (data.success) {
            // Priority: primary (vidsrc.to) is the cleanest embed in 2026
            window.setupPlayer(data.stream.primary, data.stream.fallback);
            loadSubtitles(data.subtitleEndpoint);
        }
    } catch (err) {
        console.error("Source fetch failed. Reverting to basic embed.");
        const fallback = `https://vidsrc.to/embed/${type}/${id}${type === 'tv' ? `/${s}/${e}` : ''}`;
        window.setupPlayer(fallback);
    }

    if (type === 'tv') {
        document.getElementById('episode-parent')?.classList.remove('hidden');
        loadEpisodeSelector(id, s, e);
    }

    fetchWatchDetails(id, type);
    saveProgress(id, type, s, e);
    loadWatchRecommendations(id, type);
}

window.setupPlayer = function(primary, fallback) {
    const player = document.getElementById('video-player');
    if (!player) return;

    // Set primary
    player.src = primary;
    window._streamUrls = { primary, fallback };

    // Error handling for auto-switch
    player.onerror = () => {
        if (fallback && player.src !== fallback) {
            player.src = fallback;
            console.log("Switched to fallback server.");
        }
    };
};

/* ============================================================
   SUBTITLE SYSTEM (v4.0 STEALTH BYPASS)
============================================================ */

async function loadSubtitles(endpoint) {
    const container = document.getElementById('subtitle-controls');
    const status = document.getElementById('subtitle-status');
    
    try {
        const res = await fetch(endpoint);
        const data = await res.json();
        
        if (data.success && data.tracks.length > 0) {
            if (status) status.classList.remove('hidden');
            renderSubtitleTracks(data.tracks);
        } else {
            if (container) container.innerHTML = '<span class="text-[10px] opacity-40 uppercase">No extra tracks found</span>';
        }
    } catch (e) {
        console.warn("Subtitle proxy unreachable.");
    }
}

function renderSubtitleTracks(tracks) {
    const container = document.getElementById('subtitle-controls');
    if (!container) return;

    container.innerHTML = tracks.slice(0, 8).map(t => `
        <button class="glass px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-cyan-500/20 hover:text-cyan-400 transition" 
                onclick="alert('Subtitles are enabled in player menu (CC)')">
            <i class="fa-solid fa-language mr-1"></i> ${t.label}
        </button>
    `).join('');
}

/* ============================================================
   TV & HOME PAGE LOGIC (UNCHANGED BUT CLEANED)
============================================================ */

async function loadEpisodeSelector(id, currentS, currentE) {
    const container = document.getElementById('episode-selector-container');
    const label = document.getElementById('season-label');
    if (!container) return;

    try {
        const data = await tmdb(`/tv/${id}/season/${currentS}`);
        if (label) label.innerText = `Season ${currentS}`;
        
        container.innerHTML = data.episodes.map(ep => `
            <div class="p-4 rounded-xl border ${ep.episode_number == currentE ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-white/5'} cursor-pointer hover:bg-white/5 transition" 
                 onclick="window.location.href='watch.html?id=${id}&type=tv&s=${currentS}&e=${ep.episode_number}'">
                <p class="text-xs font-black uppercase tracking-widest opacity-40 mb-1">Episode ${ep.episode_number}</p>
                <p class="text-sm font-bold truncate">${ep.name}</p>
            </div>`).join('');
    } catch (err) { 
        container.innerHTML = '<p class="text-xs opacity-50 p-4">Episodes unavailable.</p>'; 
    }
}

async function fetchWatchDetails(id, type) {
    try {
        const data = await tmdb(`/${type}/${id}`);
        const title = data.title || data.name;
        document.getElementById('watch-title').innerText = title;
        document.getElementById('watch-desc').innerText  = data.overview || 'No description available.';
        document.getElementById('watch-year').innerText  = (data.release_date || data.first_air_date || '').split('-')[0];
        document.getElementById('watch-rating').innerHTML = `<i class="fa-solid fa-star text-yellow-500"></i> ${(data.vote_average || 0).toFixed(1)}`;
        
        const bg = document.getElementById('dynamic-bg');
        if (bg && data.backdrop_path) bg.style.backgroundImage = `url(${IMG_URL + data.backdrop_path})`;
        document.title = `${title} — Cymor Hub`;
    } catch (e) {}
}

async function loadWatchRecommendations(id, type) {
    const container = document.getElementById('recommended-grid');
    if (!container) return;
    try {
        const data = await tmdb(`/${type}/${id}/recommendations`);
        const results = data.results.slice(0, 6);
        container.innerHTML = results.map(item => `
            <div class="group cursor-pointer" onclick="window.location.href='watch.html?id=${item.id}&type=${type}'">
                <div class="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3">
                    <img src="${POSTER_URL + item.poster_path}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition"></div>
                </div>
                <p class="text-xs font-bold truncate">${item.title || item.name}</p>
            </div>
        `).join('');
    } catch (e) {}
}

function saveProgress(id, type, s, e) {
    let history = JSON.parse(localStorage.getItem('cymor_history') || '[]');
    history = history.filter(i => i.id !== id);
    history.unshift({ id, type, s, e, ts: Date.now() });
    localStorage.setItem('cymor_history', JSON.stringify(history.slice(0, 10)));
}

async function initHomePage() {
    try {
        const res = await fetch('/api/tmdb?path=%2Ftrending%2Fall%2Fday');
        const data = await res.json();
        trendingData = (data.results || []).filter(i => i.backdrop_path).slice(0, 12);
        renderMovieGrid(trendingData, 'trending-grid');
        startHeroRotation();
    } catch (e) {}
}

function startHeroRotation() {
    if (!trendingData.length) return;
    const update = (idx) => {
        const item = trendingData[idx];
        const bg = document.getElementById('hero-backdrop');
        if (!bg) return;
        bg.style.opacity = 0;
        setTimeout(() => {
            bg.src = IMG_URL + item.backdrop_path;
            document.getElementById('hero-title').innerText = item.title || item.name;
            document.getElementById('hero-description').innerText = item.overview;
            const type = item.media_type || (item.title ? 'movie' : 'tv');
            document.getElementById('hero-watch-btn').href = `watch.html?id=${item.id}&type=${type}`;
            document.getElementById('hero-details-btn').href = `details.html?id=${item.id}&type=${type}`;
            bg.style.opacity = 1;
        }, 400);
    };
    update(0);
    setInterval(() => { heroIndex = (heroIndex + 1) % 10; update(heroIndex); }, 8000);
}

function renderMovieGrid(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = data.map(item => {
        const type = item.media_type || (item.title ? 'movie' : 'tv');
        const title = (item.title || item.name).replace(/'/g, "\\'");
        return `
        <div class="movie-card relative rounded-[2rem] overflow-hidden cursor-pointer h-80 group shadow-xl" 
             onclick="openModal('${item.id}', '${title}', '${POSTER_URL + item.poster_path}', '${type}')">
            <img src="${POSTER_URL + item.poster_path}" class="w-full h-full object-cover group-hover:scale-110 transition duration-700">
            <div class="absolute bottom-0 p-6 bg-gradient-to-t from-black via-black/60 to-transparent w-full">
                <p class="text-cyan-400 font-black text-[10px] uppercase tracking-widest">${type}</p>
                <p class="text-white font-bold truncate">${item.title || item.name}</p>
            </div>
        </div>`;
    }).join('');
}

window.openModal = function(id, title, poster, type) {
    const modal = document.getElementById('action-modal');
    if (!modal) return;
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-poster').style.backgroundImage = `url(${poster})`;
    document.getElementById('modal-watch').href = `watch.html?id=${id}&type=${type}`;
    document.getElementById('modal-details').href = `details.html?id=${id}&type=${type}`;
    document.getElementById('modal-download').href = `download.html?id=${id}&type=${type}`;
    modal.classList.replace('hidden', 'flex');
};

window.closeModal = () => document.getElementById('action-modal')?.classList.replace('flex', 'hidden');

function initNetflixSearchOverlay() {
    const overlay = document.getElementById('search-overlay'), input = document.getElementById('search-input'), results = document.getElementById('search-results');
    document.getElementById('open-search')?.addEventListener('click', () => { overlay.classList.remove('hidden'); input.focus(); });
    document.getElementById('close-search')?.addEventListener('click', () => overlay.classList.add('hidden'));

    let timeout;
    input?.addEventListener('input', e => {
        clearTimeout(timeout);
        const query = e.target.value.trim();
        if (!query) return;
        timeout = setTimeout(async () => {
            const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            results.innerHTML = (data.results || []).slice(0, 12).map(item => `
                <div class="p-2 cursor-pointer hover:scale-105 transition" onclick="openModal('${item.id}','${(item.title||item.name).replace(/'/g,"\\'")}','${POSTER_URL+item.poster_path}','${item.media_type||'movie'}')">
                    <img src="${POSTER_URL+item.poster_path}" class="rounded-2xl w-full h-64 object-cover shadow-2xl">
                </div>`).join('');
        }, 400);
    });
}
