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

// ── All TMDB calls go through our server so the key stays safe ──
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

/* ============================================================
   GLOBAL FEATURES
============================================================ */

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

    // ── Fix download button with correct params ──────────────
    const dlBtn = document.getElementById('btn-download');
    if (dlBtn) {
        dlBtn.href = `download.html?id=${id}&type=${type}${type === 'tv' ? `&s=${s}&e=${e}` : ''}`;
    }

    // ── Load stream source from server ───────────────────────
    try {
        const src = await fetch(`/api/get-source?id=${id}&type=${type}&s=${s}&e=${e}`);
        const sourceData = await src.json();

        if (sourceData.success) {
            setupPlayer(sourceData.stream.primary, sourceData.stream.fallback);
            loadSubtitles(sourceData.subtitleEndpoint);
        }
    } catch (err) {
        console.error('Source fetch error:', err);
        // Fallback: set iframe directly
        setupPlayer(
            type === 'movie'
                ? `https://vidsrc.me/embed/movie?tmdb=${id}`
                : `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
        );
    }

    // ── Show/hide episode sidebar ─────────────────────────────
    if (type === 'tv') {
        const ep = document.getElementById('episode-parent');
        if (ep) ep.classList.remove('hidden');
        loadEpisodeSelector(id, s, e);
    }

    // ── Fetch metadata ────────────────────────────────────────
    fetchWatchDetails(id, type);

    // ── Save progress ─────────────────────────────────────────
    saveProgress(id, type, s, e);

    // ── Load recommendations ──────────────────────────────────
    loadWatchRecommendations(id, type);
}

function setupPlayer(primaryUrl, fallbackUrl) {
    const player = document.getElementById('video-player');
    if (!player) return;

    // Correct sandbox — allows fullscreen, blocks new-tab redirects
    player.setAttribute(
        'sandbox',
        'allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-presentation'
    );
    player.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
    player.src = primaryUrl;

    // If the iframe errors (e.g. X-Frame-Options), switch to fallback
    if (fallbackUrl) {
        player.addEventListener('error', () => {
            console.warn('Primary stream failed, switching to fallback');
            player.src = fallbackUrl;
        }, { once: true });
    }

    // Also update the blurred background
    // (backdrop is set later by fetchWatchDetails)
}

async function fetchWatchDetails(id, type) {
    try {
        const data = await tmdb(`/${type}/${id}`);

        const title = data.title || data.name || '';
        document.getElementById('watch-title').innerText = title;
        document.getElementById('watch-desc').innerText  = data.overview || '';
        document.getElementById('watch-year').innerText  = (data.release_date || data.first_air_date || '').split('-')[0];
        document.getElementById('watch-rating').innerHTML =
            `<i class="fa-solid fa-star text-yellow-400"></i> ${(data.vote_average || 0).toFixed(1)}`;

        // Dynamic blurred background
        const bg = document.getElementById('dynamic-bg');
        if (bg && data.backdrop_path) {
            bg.style.backgroundImage = `url(${IMG_URL + data.backdrop_path})`;
        }

        document.title = `${title} — Cymor Movie Hub`;

    } catch (err) {
        console.error('Details fetch error:', err);
    }
}

/* ============================================================
   SUBTITLE SYSTEM
   Fetches available tracks and injects a selector UI
============================================================ */

async function loadSubtitles(endpoint) {
    try {
        const res  = await fetch(endpoint);
        const data = await res.json();

        if (!data.success || !data.tracks?.length) return;

        renderSubtitleSelector(data.tracks);

    } catch (err) {
        console.warn('Subtitle load failed:', err);
    }
}

function renderSubtitleSelector(tracks) {
    // Find or create the subtitle controls container
    let container = document.getElementById('subtitle-controls');
    if (!container) {
        container = document.createElement('div');
        container.id = 'subtitle-controls';
        container.className = 'mt-4 flex flex-wrap items-center gap-3';

        // Insert below the video container
        const videoSection = document.querySelector('.video-container');
        if (videoSection) {
            videoSection.parentNode.insertBefore(container, videoSection.nextSibling);
        } else {
            document.body.appendChild(container);
        }
    }

    container.innerHTML = `
        <span class="text-xs uppercase tracking-widest font-black text-gray-400 flex items-center gap-2">
            <i class="fa-solid fa-closed-captioning text-cyan-400"></i> Subtitles
        </span>
        <button onclick="setSubtitle(null)"
            class="subtitle-btn active-sub text-xs px-3 py-1 rounded-full border border-white/10 bg-cyan-500/20 text-cyan-400 font-bold transition hover:bg-cyan-500/30"
            data-id="off">
            OFF
        </button>
        ${tracks.map(t => `
            <button onclick="setSubtitle('${t.downloadUrl}', this)"
                class="subtitle-btn text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 font-bold transition"
                data-id="${t.id}">
                ${t.label}
            </button>
        `).join('')}
    `;
}

// Active subtitle track element
let activeSubtitleTrack = null;

window.setSubtitle = function(url, btn) {
    // Update button highlights
    document.querySelectorAll('.subtitle-btn').forEach(b => {
        b.classList.remove('bg-cyan-500/20', 'text-cyan-400');
        b.classList.add('bg-white/5');
    });
    if (btn) {
        btn.classList.add('bg-cyan-500/20', 'text-cyan-400');
        btn.classList.remove('bg-white/5');
    }

    // Remove existing subtitle overlay
    const existing = document.getElementById('subtitle-overlay');
    if (existing) existing.remove();
    if (activeSubtitleTrack) {
        clearInterval(activeSubtitleTrack);
        activeSubtitleTrack = null;
    }

    if (!url) return; // "OFF" selected

    // Since we can't inject <track> into a cross-origin iframe,
    // we load the VTT and render subtitles in an overlay div
    loadVTTOverlay(url);
};

async function loadVTTOverlay(vttUrl) {
    try {
        const res  = await fetch(vttUrl);
        const text = await res.text();
        const cues = parseVTT(text);

        if (!cues.length) return;

        // Create overlay positioned over the player iframe
        const videoContainer = document.querySelector('.video-container');
        if (!videoContainer) return;

        const overlay = document.createElement('div');
        overlay.id = 'subtitle-overlay';
        overlay.style.cssText = `
            position: absolute;
            bottom: 8%;
            left: 50%;
            transform: translateX(-50%);
            z-index: 20;
            pointer-events: none;
            text-align: center;
            width: 90%;
        `;

        const textEl = document.createElement('div');
        textEl.style.cssText = `
            display: inline-block;
            background: rgba(0,0,0,0.8);
            color: white;
            font-size: 1.2rem;
            font-weight: 600;
            padding: 0.3em 0.8em;
            border-radius: 6px;
            max-width: 100%;
            line-height: 1.5;
            text-shadow: 1px 1px 3px black;
        `;
        overlay.appendChild(textEl);

        // Make video-container relative if not already
        videoContainer.style.position = 'relative';
        videoContainer.appendChild(overlay);

        // Sync cues to iframe's currentTime is impossible cross-origin.
        // Instead we use wall-clock time offset from when the user hit play.
        const startTime = Date.now();

        activeSubtitleTrack = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const cue = cues.find(c => elapsed >= c.start && elapsed <= c.end);
            textEl.innerHTML = cue ? cue.text : '';
        }, 250);

    } catch (err) {
        console.warn('VTT overlay error:', err);
    }
}

function parseVTT(text) {
    const cues  = [];
    const lines = text.split('\n');
    let i = 0;

    while (i < lines.length) {
        const line = lines[i].trim();
        const timeMatch = line.match(
            /^(\d{2}:\d{2}:\d{2}[.,]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[.,]\d{3})/
        );

        if (timeMatch) {
            const start  = parseTime(timeMatch[1]);
            const end    = parseTime(timeMatch[2]);
            const textLines = [];
            i++;
            while (i < lines.length && lines[i].trim() !== '') {
                textLines.push(lines[i].trim());
                i++;
            }
            if (textLines.length) {
                cues.push({ start, end, text: textLines.join('<br>') });
            }
        } else {
            i++;
        }
    }

    return cues;
}

function parseTime(ts) {
    const clean = ts.replace(',', '.');
    const parts = clean.split(':').map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/* ============================================================
   RECOMMENDATIONS ON WATCH PAGE
============================================================ */

async function loadWatchRecommendations(id, type) {
    const container = document.getElementById('recommended-grid');
    if (!container) return;

    try {
        const res  = await fetch(`/api/recommendations?id=${id}&type=${type}`);
        const data = await res.json();

        if (!data.success || !data.results?.length) {
            container.innerHTML = '<p class="text-gray-500 col-span-full text-center">No recommendations found.</p>';
            return;
        }

        renderMovieGrid(data.results.filter(i => i.poster_path).slice(0, 12), 'recommended-grid');

    } catch (err) {
        console.error('Recommendations error:', err);
    }
}

/* ============================================================
   CONTINUE WATCHING
============================================================ */

function saveProgress(id, type, s, e) {
    let history = JSON.parse(localStorage.getItem('cymor_history') || '[]');
    history = history.filter(item => item.id !== id);
    history.unshift({ id, type, s, e, timestamp: Date.now() });
    localStorage.setItem('cymor_history', JSON.stringify(history.slice(0, 10)));
}

async function renderContinueWatching() {
    const history   = JSON.parse(localStorage.getItem('cymor_history') || '[]');
    const container = document.getElementById('history-grid');
    const section   = document.getElementById('continue-watching-section');

    if (!container || !history.length) {
        if (section) section.classList.add('hidden');
        return;
    }

    section?.classList.remove('hidden');
    container.innerHTML = '';

    for (const item of history) {
        try {
            const data = await tmdb(`/${item.type}/${item.id}`);
            const card = document.createElement('div');
            card.className = 'min-w-[240px] relative rounded-xl overflow-hidden cursor-pointer group glass';
            card.innerHTML = `
                <img src="${POSTER_URL + (data.backdrop_path || data.poster_path)}"
                     class="w-full h-32 object-cover opacity-60"
                     loading="lazy">
                <div class="absolute inset-0 p-4 flex flex-col justify-end">
                    <p class="text-xs text-cyan-400 font-black uppercase">
                        ${item.type === 'tv' ? `S${item.s} E${item.e}` : 'Movie'}
                    </p>
                    <p class="font-bold truncate text-sm">${data.title || data.name}</p>
                </div>
            `;
            card.onclick = () => {
                window.location.href = `watch.html?id=${item.id}&type=${item.type}&s=${item.s}&e=${item.e}`;
            };
            container.appendChild(card);
        } catch (_) {}
    }
}

/* ============================================================
   TV SERIES: EPISODE SELECTOR
============================================================ */

async function loadEpisodeSelector(id, currentS, currentE) {
    const container  = document.getElementById('episode-selector-container');
    const seasonLabel = document.getElementById('season-label');
    if (!container) return;

    try {
        const data = await tmdb(`/tv/${id}/season/${currentS}`);
        if (seasonLabel) seasonLabel.innerText = `Season ${currentS}`;

        let html = `<div class="grid grid-cols-1 gap-2">`;

        (data.episodes || []).forEach(ep => {
            const isActive = ep.episode_number == currentE
                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                : 'border-white/5 hover:bg-white/5 text-white';
            html += `
                <div class="p-4 rounded-xl border ${isActive} cursor-pointer transition flex justify-between items-center"
                     onclick="window.location.href='watch.html?id=${id}&type=tv&s=${currentS}&e=${ep.episode_number}'">
                    <div>
                        <p class="text-sm font-bold">${ep.episode_number}. ${ep.name}</p>
                        ${ep.air_date ? `<p class="text-xs opacity-40 mt-0.5">${ep.air_date}</p>` : ''}
                    </div>
                    <i class="fa-solid fa-play text-xs opacity-50 ml-3 shrink-0"></i>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

    } catch (err) {
        console.error('Episode fetch error:', err);
        container.innerHTML = '<p class="text-gray-500 text-sm p-4">Could not load episodes.</p>';
    }
}

/* ============================================================
   DETAILS PAGE
============================================================ */

async function initDetailsPage() {
    const params = new URLSearchParams(window.location.search);
    const id     = params.get('id');
    const type   = params.get('type') || 'movie';

    if (!id) { window.location.href = 'index.html'; return; }

    // Wire up action buttons with correct params
    const btnWatch = document.getElementById('btn-watch');
    const btnDL    = document.getElementById('btn-download');
    if (btnWatch) btnWatch.href = `watch.html?id=${id}&type=${type}`;
    if (btnDL)    btnDL.href   = `download.html?id=${id}&type=${type}`;

    try {
        // Main details
        const data = await tmdb(`/${type}/${id}`);

        const title     = data.title || data.name || '';
        const year      = (data.release_date || data.first_air_date || '').split('-')[0];
        const rating    = (data.vote_average || 0).toFixed(1);
        const runtime   = data.runtime
            ? `${data.runtime} min`
            : data.episode_run_time?.[0]
                ? `~${data.episode_run_time[0]} min/ep`
                : '';

        // Title & meta
        setEl('detail-title',    title);
        setEl('detail-rating',   rating);
        setEl('detail-runtime',  `<i class="fa-regular fa-clock mr-1"></i>${runtime}`);
        setEl('detail-date',     `<i class="fa-regular fa-calendar mr-1"></i>${year}`);
        setEl('detail-overview', data.overview || '');
        setEl('detail-type',     type === 'tv' ? 'TV SERIES' : 'MOVIE');
        setEl('detail-status',   data.status || '');

        document.title = `${title} — Cymor Movie Hub`;

        // Genres
        const gl = document.getElementById('genres-list');
        if (gl && data.genres) {
            gl.innerHTML = data.genres.map(g =>
                `<span class="genre-pill px-4 py-2 rounded-full text-xs font-bold">${g.name}</span>`
            ).join('');
        }

        // Backdrop & poster
        if (data.backdrop_path) {
            const bgEl = document.getElementById('dynamic-bg');
            const heroEl = document.getElementById('hero-backdrop');
            if (bgEl)   bgEl.style.backgroundImage   = `url(${IMG_URL + data.backdrop_path})`;
            if (heroEl) heroEl.style.backgroundImage = `url(${IMG_URL + data.backdrop_path})`;
        }

        const poster = document.getElementById('detail-poster');
        if (poster && data.poster_path) {
            poster.style.backgroundImage = `url(${POSTER_URL + data.poster_path})`;
            poster.classList.remove('skeleton');
        }

        // TV seasons
        if (type === 'tv' && data.seasons) {
            renderSeasons(id, data.seasons);
        }

    } catch (err) {
        console.error('Details page error:', err);
    }

    // Cast
    loadCast(id, type);

    // Related
    loadRelated(id, type);
}

function setEl(id, html) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML  = html;
    el.classList.remove('hidden');
    // Hide corresponding skeleton if it exists
    const sk = document.getElementById(id.replace('detail-', '') + '-skeleton') ||
               document.getElementById(id + '-skeleton');
    if (sk) sk.classList.add('hidden');
}

function renderSeasons(id, seasons) {
    const sc = document.getElementById('seasons-container');
    const sl = document.getElementById('seasons-list');
    if (!sc || !sl) return;

    sc.classList.remove('hidden');
    sl.innerHTML = seasons
        .filter(s => s.season_number > 0)
        .map(s => `
            <a href="watch.html?id=${id}&type=tv&s=${s.season_number}&e=1"
               class="shrink-0 glass rounded-2xl overflow-hidden w-36 cursor-pointer hover:scale-105 transition block">
                ${s.poster_path
                    ? `<img src="${POSTER_URL + s.poster_path}" class="w-full h-48 object-cover">`
                    : `<div class="w-full h-48 bg-white/5 flex items-center justify-center text-4xl">🎬</div>`}
                <div class="p-3">
                    <p class="font-black text-xs uppercase text-cyan-400">Season ${s.season_number}</p>
                    <p class="text-xs text-gray-400 mt-1">${s.episode_count} eps</p>
                </div>
            </a>
        `).join('');
}

async function loadCast(id, type) {
    const container = document.getElementById('cast-list');
    if (!container) return;

    try {
        const data = await tmdb(`/${type}/${id}/credits`);
        const cast = (data.cast || []).slice(0, 12);

        container.innerHTML = cast.map(p => `
            <div class="w-28 shrink-0 text-center">
                <img src="${p.profile_path ? POSTER_URL + p.profile_path : 'https://placehold.co/112x112/131a26/555?text=?'}"
                     class="w-28 h-28 rounded-full object-cover mx-auto mb-2 border-2 border-white/10"
                     loading="lazy">
                <p class="text-xs font-bold truncate">${p.name}</p>
                <p class="text-[10px] text-gray-400 truncate">${p.character || ''}</p>
            </div>
        `).join('') || '<p class="text-gray-500 text-sm">No cast info available.</p>';

    } catch (err) {
        console.error('Cast error:', err);
    }
}

async function loadRelated(id, type) {
    const container = document.getElementById('related-grid');
    if (!container) return;

    try {
        const res  = await fetch(`/api/recommendations?id=${id}&type=${type}`);
        const data = await res.json();

        if (!data.success || !data.results?.length) {
            container.innerHTML = '<p class="text-gray-500 col-span-full text-sm">No related titles found.</p>';
            return;
        }

        container.innerHTML = data.results
            .filter(i => i.poster_path)
            .slice(0, 12)
            .map(item => {
                const t = item.media_type || (item.title ? 'movie' : 'tv');
                return `
                    <div class="movie-card relative rounded-[2rem] overflow-hidden cursor-pointer h-80"
                         onclick="window.location.href='details.html?id=${item.id}&type=${t}'">
                        <img src="${POSTER_URL + item.poster_path}"
                             class="w-full h-full object-cover"
                             loading="lazy">
                        <div class="movie-overlay absolute inset-0 flex flex-col justify-end p-4">
                            <p class="text-cyan-400 text-[10px] font-black uppercase tracking-widest">${t}</p>
                            <p class="font-bold text-sm leading-tight">${item.title || item.name}</p>
                        </div>
                    </div>
                `;
            }).join('');

    } catch (err) {
        console.error('Related load error:', err);
    }
}

/* ============================================================
   DOWNLOAD PAGE
============================================================ */

async function initDownloadPage() {
    const params = new URLSearchParams(window.location.search);
    const id     = params.get('id');
    const type   = params.get('type') || 'movie';
    const s      = params.get('s') || 1;
    const e      = params.get('e') || 1;

    if (!id) { window.location.href = 'index.html'; return; }

    // Fetch movie metadata and populate the page
    try {
        const data = await tmdb(`/${type}/${id}`);
        const title = data.title || data.name || '';

        // Show poster
        const posterEl = document.getElementById('movie-poster');
        const skelEl   = document.getElementById('poster-skeleton');
        if (posterEl && data.poster_path) {
            posterEl.src = POSTER_URL + data.poster_path;
            posterEl.classList.remove('hidden');
            if (skelEl) skelEl.classList.add('hidden');
        }

        // Show name
        showHide('title-skeleton',   'movie-name',     title);
        showHide('meta-skeleton',    'movie-meta',     null);
        showHide('overview-skeleton','movie-overview',  data.overview || '');

        setEl('movie-year',    (data.release_date || data.first_air_date || '').split('-')[0]);
        setEl('movie-rating',  `<i class="fa-solid fa-star text-yellow-400 mr-1"></i>${(data.vote_average||0).toFixed(1)}`);
        setEl('movie-runtime', data.runtime ? `${data.runtime} min` : '');

        // Backdrop
        const bg = document.getElementById('dynamic-bg');
        if (bg && data.backdrop_path) {
            bg.style.backgroundImage = `url(${IMG_URL + data.backdrop_path})`;
        }

        document.title = `Download ${title} — Cymor Movie Hub`;

        // Store for startDownload()
        window._dlId   = id;
        window._dlType = type;
        window._dlS    = s;
        window._dlE    = e;

    } catch (err) {
        console.error('Download page init error:', err);
    }

    // Load related
    loadRelatedDownloads(id, type);
}

function showHide(skeletonId, targetId, content) {
    const sk = document.getElementById(skeletonId);
    const tg = document.getElementById(targetId);
    if (sk) sk.classList.add('hidden');
    if (tg) {
        tg.classList.remove('hidden');
        if (content !== null) tg.innerHTML = content;
    }
}

async function loadRelatedDownloads(id, type) {
    const container = document.getElementById('related-downloads');
    if (!container) return;

    try {
        const res  = await fetch(`/api/recommendations?id=${id}&type=${type}`);
        const data = await res.json();

        if (!data.success || !data.results?.length) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = data.results
            .filter(i => i.poster_path)
            .slice(0, 6)
            .map(item => {
                const t = item.media_type || (item.title ? 'movie' : 'tv');
                return `
                    <div class="cursor-pointer group relative rounded-[2rem] overflow-hidden h-72 hover:scale-105 transition"
                         onclick="window.location.href='download.html?id=${item.id}&type=${t}'">
                        <img src="${POSTER_URL + item.poster_path}"
                             class="w-full h-full object-cover"
                             loading="lazy">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                            <p class="font-bold text-xs truncate">${item.title || item.name}</p>
                        </div>
                    </div>
                `;
            }).join('');

    } catch (err) {
        console.error('Related downloads error:', err);
    }
}

/* ============================================================
   DOWNLOAD TRIGGER
   Called by the quality buttons in download.html
============================================================ */

window.startDownload = async function(quality) {
    const id   = window._dlId;
    const type = window._dlType || 'movie';
    const s    = window._dlS || 1;
    const e    = window._dlE || 1;

    if (!id) return;

    const modal = document.getElementById('progress-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }

    try {
        const res  = await fetch(`/api/download?id=${id}&type=${type}&quality=${quality.replace('p','')}&s=${s}&e=${e}`);
        const data = await res.json();

        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }

        if (data.success && data.primaryUrl) {
            // Open the download page in a new tab
            window.open(data.primaryUrl, '_blank');
        } else {
            alert('Download source unavailable. Try again.');
        }

    } catch (err) {
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
        console.error('Download error:', err);
        alert('Download request failed. Check your connection.');
    }
};

/* ============================================================
   HOME PAGE & HERO
============================================================ */

async function initHomePage() {
    try {
        const res  = await fetch('/api/tmdb?path=%2Ftrending%2Fall%2Fday');
        const data = await res.json();
        trendingData = (data.results || []).filter(i => i.backdrop_path && i.poster_path);

        renderMovieGrid(trendingData, 'trending-grid');
        startHeroRotation();
    } catch (err) {
        console.error('Home init error:', err);
    }
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
    const bg    = document.getElementById('hero-backdrop');
    const title = document.getElementById('hero-title');
    const desc  = document.getElementById('hero-description');
    if (!bg) return;

    bg.style.opacity = '0';
    setTimeout(() => {
        bg.src = IMG_URL + item.backdrop_path;
        if (title) title.innerText = item.title || item.name;
        if (desc)  desc.innerText  = item.overview;

        const type = item.media_type || (item.title ? 'movie' : 'tv');

        const watchBtn = document.getElementById('hero-watch-btn');
        if (watchBtn) watchBtn.onclick = () => {
            window.location.href = `watch.html?id=${item.id}&type=${type}`;
        };

        const detailsBtn = document.getElementById('hero-details-btn');
        if (detailsBtn) detailsBtn.href = `details.html?id=${item.id}&type=${type}`;

        bg.style.opacity = '1';
    }, 400);
}

/* ============================================================
   MODAL & GRID UTILS
============================================================ */

function renderMovieGrid(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    data.forEach(item => {
        const type  = item.media_type || (item.title ? 'movie' : 'tv');
        const title = item.title || item.name;
        const card  = document.createElement('div');
        card.className = 'movie-card relative rounded-[2rem] overflow-hidden cursor-pointer group shadow-2xl';
        card.innerHTML = `
            <img src="${POSTER_URL + item.poster_path}"
                 class="w-full h-[320px] object-cover group-hover:scale-110 transition duration-500"
                 loading="lazy">
            <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-80"></div>
            <div class="absolute bottom-0 p-6">
                <p class="text-white font-black uppercase text-xs tracking-widest mb-1 text-cyan-400">${type}</p>
                <p class="text-white font-bold leading-tight">${title}</p>
            </div>
        `;
        card.onclick = () => openModal(item.id, title, POSTER_URL + item.poster_path, type);
        container.appendChild(card);
    });
}

window.openModal = function(id, title, poster, type) {
    const modal = document.getElementById('action-modal');
    if (!modal) return;

    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-poster').style.backgroundImage = `url(${poster})`;

    document.getElementById('modal-watch').onclick = () => {
        window.location.href = `watch.html?id=${id}&type=${type}`;
    };
    document.getElementById('modal-details').href  = `details.html?id=${id}&type=${type}`;
    document.getElementById('modal-download').href = `download.html?id=${id}&type=${type}`;

    modal.classList.remove('hidden');
};

window.closeModal = () => document.getElementById('action-modal')?.classList.add('hidden');

/* ============================================================
   NETFLIX SEARCH OVERLAY
   Uses server-side search proxy so no API key in frontend
============================================================ */

function initNetflixSearchOverlay() {
    const overlay  = document.getElementById('search-overlay');
    const input    = document.getElementById('search-input');
    const results  = document.getElementById('search-results');
    const openBtn  = document.getElementById('open-search');
    const closeBtn = document.getElementById('close-search');

    if (!overlay || !input) return;

    openBtn?.addEventListener('click', () => { overlay.classList.remove('hidden'); input.focus(); });
    closeBtn?.addEventListener('click', () => { overlay.classList.add('hidden'); input.value = ''; results.innerHTML = ''; });

    let timer;
    input.addEventListener('input', e => {
        clearTimeout(timer);
        const query = e.target.value.trim();
        if (!query) { results.innerHTML = ''; return; }

        timer = setTimeout(async () => {
            try {
                const res  = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
                const data = await res.json();

                results.innerHTML = (data.results || [])
                    .filter(i => i.poster_path)
                    .slice(0, 12)
                    .map(item => {
                        const type = item.media_type || (item.title ? 'movie' : 'tv');
                        return `
                            <div class="cursor-pointer hover:scale-105 transition p-2"
                                 onclick="openModal('${item.id}','${(item.title || item.name).replace(/'/g,'\\'')}','${POSTER_URL + item.poster_path}','${type}')">
                                <img src="${POSTER_URL + item.poster_path}"
                                     class="rounded-xl w-full h-[260px] object-cover shadow-lg">
                                <p class="text-white mt-2 text-xs font-black uppercase tracking-tighter">
                                    ${item.title || item.name}
                                </p>
                            </div>
                        `;
                    }).join('');

            } catch (err) {
                console.error('Search error:', err);
            }
        }, 300);
    });
}
