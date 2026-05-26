/**
 * ============================================================
 * CYMOR MOVIE HUB — MASTER ENGINE v3.0
 * ✅ TMDB key server-side only (via /api/tmdb proxy)
 * ✅ Subtitle loading with track switching
 * ✅ Working recommendations on watch page
 * ✅ Correct param passing on all buttons/links
 * ✅ Continue Watching logic
 * ✅ Series episode selector
 * ============================================================
 */

const IMG_URL    = 'https://image.tmdb.org/t/p/original';
const POSTER_URL = 'https://image.tmdb.org/t/p/w500';

async function tmdb(path, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `/api/tmdb?path=${encodeURIComponent(path)}${qs ? '&' + qs : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB proxy error: ${res.status}`);
    return res.json();
}

let trendingData = [];
let heroIndex    = 0;

/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const p = window.location.pathname;
    initGlobalFeatures();
    if (p.includes('index.html') || p === '/') initHomePage();
    if (p.includes('watch.html'))               initWatchPage();
    if (p.includes('details.html'))             initDetailsPage();
    if (p.includes('download.html'))            initDownloadPage();
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
   WATCH PAGE
============================================================ */

async function initWatchPage() {
    const params  = new URLSearchParams(window.location.search);
    const id      = params.get('id');
    const type    = params.get('type') || 'movie';
    const s       = params.get('s')    || 1;
    const e       = params.get('e')    || 1;

    if (!id) { window.location.href = 'index.html'; return; }

    const dlBtn = document.getElementById('btn-download');
    if (dlBtn) {
        dlBtn.href = `download.html?id=${id}&type=${type}${type === 'tv' ? `&s=${s}&e=${e}` : ''}`;
    }

    try {
        const src = await fetch(`/api/get-source?id=${id}&type=${type}&s=${s}&e=${e}`);
        const sourceData = await src.json();
        if (sourceData.success) {
            setupPlayer(sourceData.stream.primary, sourceData.stream.fallback);
            loadSubtitles(sourceData.subtitleEndpoint);
        }
    } catch (err) {
        setupPlayer(
            type === 'movie'
                ? `https://vidsrc.me/embed/movie?tmdb=${id}`
                : `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
        );
    }

    if (type === 'tv') {
        const ep = document.getElementById('episode-parent');
        if (ep) ep.classList.remove('hidden');
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
    player.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
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
        document.title = `${title} — Cymor Movie Hub`;
    } catch (err) { console.error(err); }
}

/* ============================================================
   SUBTITLE SYSTEM
============================================================ */

async function loadSubtitles(endpoint) {
    try {
        const res  = await fetch(endpoint);
        const data = await res.json();
        if (data.success && data.tracks?.length) renderSubtitleSelector(data.tracks);
    } catch (err) { console.warn(err); }
}

function renderSubtitleSelector(tracks) {
    let container = document.getElementById('subtitle-controls') || document.createElement('div');
    if (!container.id) {
        container.id = 'subtitle-controls';
        container.className = 'mt-4 flex flex-wrap items-center gap-3';
        const videoSection = document.querySelector('.video-container');
        videoSection ? videoSection.parentNode.insertBefore(container, videoSection.nextSibling) : document.body.appendChild(container);
    }
    container.innerHTML = `<span class="text-xs uppercase font-black text-gray-400">Subtitles</span>
        <button onclick="setSubtitle(null)" class="subtitle-btn text-xs px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-bold">OFF</button>
        ${tracks.map(t => `<button onclick="setSubtitle('${t.downloadUrl}', this)" class="subtitle-btn text-xs px-3 py-1 rounded-full bg-white/5 font-bold">${t.label}</button>`).join('')}`;
}

let activeSubtitleTrack = null;
window.setSubtitle = function(url, btn) {
    document.querySelectorAll('.subtitle-btn').forEach(b => { b.classList.remove('bg-cyan-500/20', 'text-cyan-400'); b.classList.add('bg-white/5'); });
    if (btn) btn.classList.add('bg-cyan-500/20', 'text-cyan-400');
    const existing = document.getElementById('subtitle-overlay');
    if (existing) existing.remove();
    if (activeSubtitleTrack) clearInterval(activeSubtitleTrack);
    if (url) loadVTTOverlay(url);
};

async function loadVTTOverlay(vttUrl) {
    try {
        const res = await fetch(vttUrl);
        const cues = parseVTT(await res.text());
        const videoContainer = document.querySelector('.video-container');
        if (!videoContainer || !cues.length) return;
        const overlay = document.createElement('div');
        overlay.id = 'subtitle-overlay';
        overlay.style.cssText = "position:absolute;bottom:8%;left:50%;transform:translateX(-50%);z-index:20;pointer-events:none;text-align:center;width:90%;";
        const textEl = document.createElement('div');
        textEl.style.cssText = "display:inline-block;background:rgba(0,0,0,0.8);color:white;font-size:1.2rem;padding:0.3em 0.8em;border-radius:6px;";
        overlay.appendChild(textEl);
        videoContainer.appendChild(overlay);
        const startTime = Date.now();
        activeSubtitleTrack = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const cue = cues.find(c => elapsed >= c.start && elapsed <= c.end);
            textEl.innerHTML = cue ? cue.text : '';
        }, 250);
    } catch (err) { console.warn(err); }
}

function parseVTT(text) {
    const cues = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const timeMatch = lines[i].match(/^(\d{2}:\d{2}:\d{2}[.,]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[.,]\d{3})/);
        if (timeMatch) {
            const start = parseTime(timeMatch[1]), end = parseTime(timeMatch[2]), textLines = [];
            i++; while (i < lines.length && lines[i].trim() !== '') { textLines.push(lines[i].trim()); i++; }
            cues.push({ start, end, text: textLines.join('<br>') });
        }
    }
    return cues;
}
function parseTime(ts) { const p = ts.replace(',', '.').split(':').map(Number); return p[0] * 3600 + p[1] * 60 + p[2]; }

/* ============================================================
   RECOMMENDATIONS & HISTORY
============================================================ */

async function loadWatchRecommendations(id, type) {
    const container = document.getElementById('recommended-grid');
    if (!container) return;
    try {
        const res = await fetch(`/api/recommendations?id=${id}&type=${type}`);
        const data = await res.json();
        if (data.success) renderMovieGrid(data.results.filter(i => i.poster_path).slice(0, 12), 'recommended-grid');
    } catch (err) { console.error(err); }
}

function saveProgress(id, type, s, e) {
    let history = JSON.parse(localStorage.getItem('cymor_history') || '[]');
    history = history.filter(item => item.id !== id);
    history.unshift({ id, type, s, e, timestamp: Date.now() });
    localStorage.setItem('cymor_history', JSON.stringify(history.slice(0, 10)));
}

async function renderContinueWatching() {
    const history = JSON.parse(localStorage.getItem('cymor_history') || '[]');
    const container = document.getElementById('history-grid');
    const section = document.getElementById('continue-watching-section');
    if (!container || !history.length) { if(section) section.classList.add('hidden'); return; }
    section?.classList.remove('hidden'); container.innerHTML = '';
    for (const item of history) {
        try {
            const data = await tmdb(`/${item.type}/${item.id}`);
            const card = document.createElement('div');
            card.className = 'min-w-[240px] relative rounded-xl overflow-hidden cursor-pointer glass';
            card.innerHTML = `<img src="${POSTER_URL + (data.backdrop_path || data.poster_path)}" class="w-full h-32 object-cover opacity-60"><div class="absolute inset-0 p-4 flex flex-col justify-end"><p class="text-xs text-cyan-400 font-black uppercase">${item.type === 'tv' ? `S${item.s} E${item.e}` : 'Movie'}</p><p class="font-bold truncate text-sm">${data.title || data.name}</p></div>`;
            card.onclick = () => window.location.href = `watch.html?id=${item.id}&type=${item.type}&s=${item.s}&e=${item.e}`;
            container.appendChild(card);
        } catch (_) {}
    }
}

/* ============================================================
   TV & DETAILS
============================================================ */

async function loadEpisodeSelector(id, currentS, currentE) {
    const container = document.getElementById('episode-selector-container');
    if (!container) return;
    try {
        const data = await tmdb(`/tv/${id}/season/${currentS}`);
        container.innerHTML = `<div class="grid grid-cols-1 gap-2">${(data.episodes || []).map(ep => `
            <div class="p-4 rounded-xl border ${ep.episode_number == currentE ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-white/5 text-white'} cursor-pointer" onclick="window.location.href='watch.html?id=${id}&type=tv&s=${currentS}&e=${ep.episode_number}'">
                <p class="text-sm font-bold">${ep.episode_number}. ${ep.name}</p>
            </div>`).join('')}</div>`;
    } catch (err) { container.innerHTML = '<p class="p-4">Error loading episodes.</p>'; }
}

async function initDetailsPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id'), type = params.get('type') || 'movie';
    if (!id) return;
    const btnW = document.getElementById('btn-watch'), btnD = document.getElementById('btn-download');
    if (btnW) btnW.href = `watch.html?id=${id}&type=${type}`;
    if (btnD) btnD.href = `download.html?id=${id}&type=${type}`;
    try {
        const data = await tmdb(`/${type}/${id}`);
        setEl('detail-title', data.title || data.name);
        setEl('detail-overview', data.overview || '');
        const bg = document.getElementById('dynamic-bg');
        if (bg && data.backdrop_path) bg.style.backgroundImage = `url(${IMG_URL + data.backdrop_path})`;
        const poster = document.getElementById('detail-poster');
        if (poster && data.poster_path) { poster.style.backgroundImage = `url(${POSTER_URL + data.poster_path})`; poster.classList.remove('skeleton'); }
        if (type === 'tv' && data.seasons) renderSeasons(id, data.seasons);
    } catch (err) { console.error(err); }
    loadCast(id, type); loadRelated(id, type);
}

function setEl(id, html) {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = html; el.classList.remove('hidden', 'skeleton');
    const sk = document.getElementById(id + '-skeleton'); if (sk) sk.classList.add('hidden');
}

function renderSeasons(id, seasons) {
    const sl = document.getElementById('seasons-list'); if (!sl) return;
    document.getElementById('seasons-container')?.classList.remove('hidden');
    sl.innerHTML = seasons.filter(s => s.season_number > 0).map(s => `
        <a href="watch.html?id=${id}&type=tv&s=${s.season_number}&e=1" class="shrink-0 glass rounded-2xl w-36 block">
            <img src="${POSTER_URL + s.poster_path}" class="w-full h-48 object-cover rounded-t-2xl">
            <p class="p-3 font-black text-xs text-cyan-400">Season ${s.season_number}</p>
        </a>`).join('');
}

async function loadCast(id, type) {
    const container = document.getElementById('cast-list'); if (!container) return;
    try {
        const data = await tmdb(`/${type}/${id}/credits`);
        container.innerHTML = (data.cast || []).slice(0, 12).map(p => `<div class="w-28 shrink-0 text-center"><img src="${p.profile_path ? POSTER_URL + p.profile_path : 'https://placehold.co/112'}" class="w-28 h-28 rounded-full object-cover mb-2"><p class="text-xs font-bold truncate">${p.name}</p></div>`).join('');
    } catch (err) {}
}

async function loadRelated(id, type) {
    const container = document.getElementById('related-grid'); if (!container) return;
    try {
        const res = await fetch(`/api/recommendations?id=${id}&type=${type}`);
        const data = await res.json();
        if (data.success) container.innerHTML = data.results.slice(0, 12).map(item => `<div class="movie-card relative rounded-[2rem] overflow-hidden h-80" onclick="window.location.href='details.html?id=${item.id}&type=${type}'"><img src="${POSTER_URL + item.poster_path}" class="w-full h-full object-cover"></div>`).join('');
    } catch (err) {}
}

/* ============================================================
   DOWNLOAD PAGE
============================================================ */

async function initDownloadPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id'), type = params.get('type') || 'movie';
    if (!id) return;
    try {
        const data = await tmdb(`/${type}/${id}`);
        const posterEl = document.getElementById('movie-poster');
        if (posterEl && data.poster_path) { posterEl.src = POSTER_URL + data.poster_path; posterEl.classList.remove('hidden'); document.getElementById('poster-skeleton')?.classList.add('hidden'); }
        setEl('movie-name', data.title || data.name);
        setEl('movie-overview', data.overview);
        window._dlId = id; window._dlType = type;
    } catch (err) {}
    loadRelatedDownloads(id, type);
}

async function loadRelatedDownloads(id, type) {
    const container = document.getElementById('related-downloads'); if (!container) return;
    try {
        const res = await fetch(`/api/recommendations?id=${id}&type=${type}`);
        const data = await res.json();
        if (data.success) container.innerHTML = data.results.slice(0, 6).map(item => `<div class="cursor-pointer rounded-[2rem] overflow-hidden h-72" onclick="window.location.href='download.html?id=${item.id}&type=${type}'"><img src="${POSTER_URL + item.poster_path}" class="w-full h-full object-cover"></div>`).join('');
    } catch (err) {}
}

window.startDownload = async function(quality) {
    const modal = document.getElementById('progress-modal');
    modal?.classList.remove('hidden');
    try {
        const res = await fetch(`/api/download?id=${window._dlId}&type=${window._dlType}&quality=${quality.replace('p','')}`);
        const data = await res.json();
        modal?.classList.add('hidden');
        if (data.success) window.open(data.primaryUrl, '_blank');
    } catch (err) { modal?.classList.add('hidden'); alert('Failed to fetch download link.'); }
};

/* ============================================================
   HOME PAGE & HERO
============================================================ */

async function initHomePage() {
    try {
        const res = await fetch('/api/tmdb?path=%2Ftrending%2Fall%2Fday');
        const data = await res.json();
        trendingData = (data.results || []).filter(i => i.backdrop_path && i.poster_path);
        renderMovieGrid(trendingData, 'trending-grid');
        startHeroRotation();
    } catch (err) { console.error(err); }
}

function startHeroRotation() {
    if (!trendingData.length) return;
    updateHeroUI(trendingData[0]);
    setInterval(() => {
        heroIndex = (heroIndex + 1) % Math.min(trendingData.length, 10);
        updateHeroUI(trendingData[heroIndex]);
    }, 10000);
}

function updateHeroUI(item) {
    const bg = document.getElementById('hero-backdrop'), title = document.getElementById('hero-title'), desc = document.getElementById('hero-description');
    if (!bg || !item) return;
    bg.style.opacity = '0';
    setTimeout(() => {
        bg.src = IMG_URL + item.backdrop_path;
        if (title) { title.innerText = item.title || item.name; title.classList.remove('skeleton'); }
        if (desc) { desc.innerText = item.overview; desc.classList.remove('skeleton'); }
        const type = item.media_type || (item.title ? 'movie' : 'tv');
        const wBtn = document.getElementById('hero-watch-btn'), dBtn = document.getElementById('hero-details-btn');
        if (wBtn) { wBtn.href = `watch.html?id=${item.id}&type=${type}`; wBtn.onclick = null; }
        if (dBtn) dBtn.href = `details.html?id=${item.id}&type=${type}`;
        bg.style.opacity = '1';
    }, 400);
}

function renderMovieGrid(data, containerId) {
    const container = document.getElementById(containerId); if (!container) return;
    container.innerHTML = data.map(item => {
        const type = item.media_type || (item.title ? 'movie' : 'tv');
        const title = (item.title || item.name).replace(/'/g, "\\'");
        return `<div class="movie-card relative rounded-[2rem] overflow-hidden cursor-pointer h-[320px]" onclick="openModal('${item.id}', '${title}', '${POSTER_URL + item.poster_path}', '${type}')">
            <img src="${POSTER_URL + item.poster_path}" class="w-full h-full object-cover">
            <div class="absolute bottom-0 p-6 bg-gradient-to-t from-black w-full">
                <p class="text-cyan-400 font-black text-xs uppercase">${type}</p>
                <p class="text-white font-bold truncate">${item.title || item.name}</p>
            </div>
        </div>`;
    }).join('');
}

window.openModal = function(id, title, poster, type) {
    const modal = document.getElementById('action-modal'); if (!modal) return;
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-poster').style.backgroundImage = `url(${poster})`;
    document.getElementById('modal-watch').href = `watch.html?id=${id}&type=${type}`;
    document.getElementById('modal-details').href = `details.html?id=${id}&type=${type}`;
    document.getElementById('modal-download').href = `download.html?id=${id}&type=${type}`;
    modal.classList.remove('hidden'); modal.classList.add('flex');
};

window.closeModal = () => document.getElementById('action-modal')?.classList.add('hidden');

function initNetflixSearchOverlay() {
    const overlay = document.getElementById('search-overlay'), input = document.getElementById('search-input'), results = document.getElementById('search-results');
    document.getElementById('open-search')?.addEventListener('click', () => { overlay.classList.remove('hidden'); input.focus(); });
    document.getElementById('close-search')?.addEventListener('click', () => overlay.classList.add('hidden'));
    let timer;
    input?.addEventListener('input', e => {
        clearTimeout(timer);
        if (!e.target.value.trim()) return;
        timer = setTimeout(async () => {
            const res = await fetch(`/api/search?query=${encodeURIComponent(e.target.value)}`);
            const data = await res.json();
            results.innerHTML = (data.results || []).map(item => `<div class="p-2 cursor-pointer" onclick="openModal('${item.id}','${(item.title||item.name).replace(/'/g,"\\'")}','${POSTER_URL+item.poster_path}','${item.media_type||'movie'}')"><img src="${POSTER_URL+item.poster_path}" class="rounded-xl w-full h-64 object-cover"></div>`).join('');
        }, 300);
    });
}
