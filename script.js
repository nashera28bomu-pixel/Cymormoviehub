/**
 * ============================================================
 * CYMOR MOVIE HUB — MASTER ENGINE v3.1 (OPTIMIZED)
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
let activeSubtitleTrack = null;

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
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        renderContinueWatching();
    }
}

/* ============================================================
   WATCH PAGE LOGIC
============================================================ */

async function initWatchPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id'), type = params.get('type') || 'movie';
    const s = params.get('s') || 1, e = params.get('e') || 1;

    if (!id) { window.location.href = 'index.html'; return; }

    // Download button link update
    const dlBtn = document.getElementById('btn-download');
    if (dlBtn) dlBtn.href = `download.html?id=${id}&type=${type}${type === 'tv' ? `&s=${s}&e=${e}` : ''}`;

    try {
        const src = await fetch(`/api/get-source?id=${id}&type=${type}&s=${s}&e=${e}`);
        const sourceData = await src.json();
        if (sourceData.success) {
            setupPlayer(sourceData.stream.primary, sourceData.stream.fallback);
            loadSubtitles(sourceData.subtitleEndpoint);
        } else throw 'No source';
    } catch (err) {
        const embed = type === 'movie' 
            ? `https://vidsrc.me/embed/movie?tmdb=${id}` 
            : `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`;
        setupPlayer(embed);
    }

    if (type === 'tv') {
        document.getElementById('episode-parent')?.classList.remove('hidden');
        loadEpisodeSelector(id, s, e);
    }

    fetchWatchDetails(id, type);
    saveProgress(id, type, s, e);
    loadWatchRecommendations(id, type);
}

function setupPlayer(primaryUrl, fallbackUrl) {
    const player = document.getElementById('video-player');
    if (!player) return;
    player.setAttribute('referrerpolicy', 'origin');
    player.src = primaryUrl;
    if (fallbackUrl) {
        player.addEventListener('error', () => { player.src = fallbackUrl; }, { once: true });
    }
}

async function fetchWatchDetails(id, type) {
    try {
        const data = await tmdb(`/${type}/${id}`);
        const title = data.title || data.name || '';
        document.getElementById('watch-title').innerText = title;
        document.getElementById('watch-desc').innerText  = data.overview || '';
        document.getElementById('watch-year').innerText  = (data.release_date || data.first_air_date || '').split('-')[0];
        document.getElementById('watch-rating').innerHTML = `<i class="fa-solid fa-star text-yellow-400"></i> ${(data.vote_average || 0).toFixed(1)}`;
        
        const bg = document.getElementById('dynamic-bg');
        if (bg && data.backdrop_path) bg.style.backgroundImage = `url(${IMG_URL + data.backdrop_path})`;
        document.title = `${title} — Watch on Cymor`;
    } catch (err) { console.error("Metadata Error:", err); }
}

/* ============================================================
   SUBTITLE ENGINE (VTT OVERLAY)
============================================================ */

async function loadSubtitles(endpoint) {
    if (!endpoint) return;
    try {
        const res = await fetch(endpoint);
        const data = await res.json();
        if (data.success && data.tracks?.length) renderSubtitleSelector(data.tracks);
    } catch (err) { console.warn("Subtitle track error"); }
}

function renderSubtitleSelector(tracks) {
    let container = document.getElementById('subtitle-controls');
    if (!container) {
        container = document.createElement('div');
        container.id = 'subtitle-controls';
        container.className = 'mt-4 flex flex-wrap items-center gap-3 p-4 glass rounded-xl';
        document.querySelector('.video-container')?.after(container);
    }
    
    container.innerHTML = `
        <span class="text-xs uppercase font-black text-gray-400">Subtitles:</span>
        <button onclick="setSubtitle(null)" class="sub-btn text-xs px-4 py-1 rounded-full bg-cyan-500 text-black font-bold">OFF</button>
        ${tracks.map(t => `<button onclick="setSubtitle('${t.downloadUrl}', this)" class="sub-btn text-xs px-4 py-1 rounded-full bg-white/5 hover:bg-white/10 transition font-bold">${t.label}</button>`).join('')}
    `;
}

window.setSubtitle = function(url, btn) {
    document.querySelectorAll('.sub-btn').forEach(b => b.className = 'sub-btn text-xs px-4 py-1 rounded-full bg-white/5 font-bold');
    if (btn) btn.className = 'sub-btn text-xs px-4 py-1 rounded-full bg-cyan-500 text-black font-bold';
    
    const existing = document.getElementById('subtitle-overlay');
    if (existing) existing.remove();
    if (activeSubtitleTrack) clearInterval(activeSubtitleTrack);
    if (url) loadVTTOverlay(url);
};

async function loadVTTOverlay(vttUrl) {
    try {
        const res = await fetch(vttUrl);
        const text = await res.text();
        const cues = parseVTT(text);
        const videoContainer = document.querySelector('.video-container');
        if (!videoContainer || !cues.length) return;

        const overlay = document.createElement('div');
        overlay.id = 'subtitle-overlay';
        overlay.style.cssText = "position:absolute;bottom:12%;left:50%;transform:translateX(-50%);z-index:100;pointer-events:none;text-align:center;width:80%;";
        
        const textEl = document.createElement('div');
        textEl.style.cssText = "display:inline-block;background:rgba(0,0,0,0.75);color:white;font-size:1.25rem;padding:0.4em 0.8em;border-radius:8px;backdrop-filter:blur(4px);";
        
        overlay.appendChild(textEl);
        videoContainer.appendChild(overlay);

        const startTime = Date.now();
        activeSubtitleTrack = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const cue = cues.find(c => elapsed >= c.start && elapsed <= c.end);
            textEl.innerHTML = cue ? cue.text : '';
            textEl.style.display = cue ? 'inline-block' : 'none';
        }, 200);
    } catch (e) { console.error("VTT Sync Error"); }
}

function parseVTT(text) {
    const cues = [];
    const blocks = text.split('\n\n');
    blocks.forEach(block => {
        const lines = block.split('\n');
        const timeMatch = lines[0].match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[.,]\d{3})/);
        if (timeMatch) {
            cues.push({
                start: parseTime(timeMatch[1]),
                end: parseTime(timeMatch[2]),
                text: lines.slice(1).join('<br>')
            });
        } else if (lines.length > 1) {
            const secondaryMatch = lines[1].match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[.,]\d{3})/);
            if (secondaryMatch) {
                cues.push({ start: parseTime(secondaryMatch[1]), end: parseTime(secondaryMatch[2]), text: lines.slice(2).join('<br>') });
            }
        }
    });
    return cues;
}

function parseTime(ts) {
    const parts = ts.replace(',', '.').split(':').map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/* ============================================================
   TV & DETAILS PAGES
============================================================ */

async function loadEpisodeSelector(id, currentS, currentE) {
    const container = document.getElementById('episode-selector-container');
    if (!container) return;
    try {
        const data = await tmdb(`/tv/${id}/season/${currentS}`);
        container.innerHTML = `<div class="grid gap-2">${data.episodes.map(ep => `
            <div class="p-4 rounded-xl border ${ep.episode_number == currentE ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-white/5'} cursor-pointer hover:bg-white/5 transition" 
                 onclick="window.location.href='watch.html?id=${id}&type=tv&s=${currentS}&e=${ep.episode_number}'">
                <p class="text-sm font-bold">${ep.episode_number}. ${ep.name}</p>
            </div>`).join('')}</div>`;
    } catch (err) { container.innerHTML = 'Error loading episodes.'; }
}

async function initDetailsPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id'), type = params.get('type') || 'movie';
    if (!id) return;

    document.getElementById('btn-watch').href = `watch.html?id=${id}&type=${type}`;
    document.getElementById('btn-download').href = `download.html?id=${id}&type=${type}`;

    try {
        const data = await tmdb(`/${type}/${id}`);
        setEl('detail-title', data.title || data.name);
        setEl('detail-overview', data.overview);
        
        const poster = document.getElementById('detail-poster');
        if (poster && data.poster_path) poster.style.backgroundImage = `url(${POSTER_URL + data.poster_path})`;
        
        const bg = document.getElementById('dynamic-bg');
        if (bg && data.backdrop_path) bg.style.backgroundImage = `url(${IMG_URL + data.backdrop_path})`;

        if (type === 'tv' && data.seasons) renderSeasons(id, data.seasons);
        loadCast(id, type);
        loadRelated(id, type);
    } catch (e) { console.error(e); }
}

function renderSeasons(id, seasons) {
    const sl = document.getElementById('seasons-list');
    if (!sl) return;
    document.getElementById('seasons-container')?.classList.remove('hidden');
    sl.innerHTML = seasons.filter(s => s.season_number > 0).map(s => `
        <a href="watch.html?id=${id}&type=tv&s=${s.season_number}&e=1" class="shrink-0 glass rounded-2xl w-36 block hover:scale-105 transition">
            <img src="${s.poster_path ? POSTER_URL + s.poster_path : 'https://placehold.co/500x750'}" class="w-full h-48 object-cover rounded-t-2xl">
            <p class="p-3 font-bold text-xs text-center">Season ${s.season_number}</p>
        </a>`).join('');
}

/* ============================================================
   HISTORY & HOME
============================================================ */

function saveProgress(id, type, s, e) {
    let history = JSON.parse(localStorage.getItem('cymor_history') || '[]');
    history = history.filter(i => i.id !== id);
    history.unshift({ id, type, s, e, ts: Date.now() });
    localStorage.setItem('cymor_history', JSON.stringify(history.slice(0, 10)));
}

async function renderContinueWatching() {
    const history = JSON.parse(localStorage.getItem('cymor_history') || '[]');
    const container = document.getElementById('history-grid');
    if (!container || !history.length) return;

    document.getElementById('continue-watching-section')?.classList.remove('hidden');
    for (const item of history) {
        try {
            const data = await tmdb(`/${item.type}/${item.id}`);
            const card = document.createElement('div');
            card.className = 'min-w-[240px] relative rounded-xl overflow-hidden cursor-pointer glass group';
            card.innerHTML = `
                <img src="${POSTER_URL + (data.backdrop_path || data.poster_path)}" class="w-full h-32 object-cover opacity-50 group-hover:opacity-80 transition">
                <div class="absolute inset-0 p-4 flex flex-col justify-end">
                    <p class="text-[10px] text-cyan-400 font-black uppercase">${item.type === 'tv' ? `S${item.s} E${item.e}` : 'Movie'}</p>
                    <p class="font-bold truncate text-sm">${data.title || data.name}</p>
                </div>`;
            card.onclick = () => window.location.href = `watch.html?id=${item.id}&type=${item.type}&s=${item.s}&e=${item.e}`;
            container.appendChild(card);
        } catch (e) {}
    }
}

async function initHomePage() {
    try {
        const res = await fetch('/api/tmdb?path=%2Ftrending%2Fall%2Fday');
        const data = await res.json();
        trendingData = (data.results || []).filter(i => i.backdrop_path);
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

/* ============================================================
   UTILITIES
============================================================ */

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
            <div class="absolute bottom-0 p-6 bg-gradient-to-t from-black via-black/40 to-transparent w-full">
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

function setEl(id, val) { 
    const el = document.getElementById(id); 
    if (el) { el.innerHTML = val; el.classList.remove('skeleton', 'hidden'); }
}

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
