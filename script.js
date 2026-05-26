/**
 * ============================================
 * CYMOR MOVIE HUB — MASTER ENGINE
 * Anti-Redirect | Continue Watching | Series Logic
 * ============================================
 */

const API_KEY = "2d1c54be44c1c27b0d5eaf172050f257";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";
const POSTER_URL = "https://image.tmdb.org/t/p/w500";

let trendingData = [];
let heroIndex = 0;

/* ============================================
   INITIALIZATION
============================================ */

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    initGlobalFeatures();

    if (path.includes("index.html") || path === "/") initHomePage();
    if (path.includes("watch.html")) initWatchPage();
    if (path.includes("details.html")) initDetailsPage();

    initNetflixSearchOverlay();
});

/* ============================================
   GLOBAL & ANTI-AD SECURITY
============================================ */

function initGlobalFeatures() {
    // 🚫 BLOCK MODAL BACKDROP REDIRECTS
    const modal = document.getElementById("action-modal");
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target.id === "action-modal") closeModal();
        });
    }

    // 🔄 RENDER CONTINUE WATCHING ON HOME
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
        renderContinueWatching();
    }
}

/* ============================================
   WATCH PAGE (STRICT NO-REDIRECT & SERIES)
============================================ */

async function initWatchPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const type = params.get("type") || "movie";
    const s = params.get("s") || 1;
    const e = params.get('e') || 1;

    if (!id) return;

    const player = document.getElementById("video-player");
    if (player) {
        // 🔥 STRICT SANDBOX: This prevents the iframe from opening new tabs (Ads)
        player.setAttribute("sandbox", "allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation");
        
        player.src = type === "movie" 
            ? `https://vidsrc.to/embed/movie/${id}` 
            : `https://vidsrc.to/embed/tv/${id}/${s}/${e}`;
    }

    // Update UI details
    fetchWatchDetails(id, type);
    
    // Save to Continue Watching
    saveProgress(id, type, s, e);

    // If TV show, load episode selector
    if (type === "tv") loadEpisodeSelector(id, s, e);
}

async function fetchWatchDetails(id, type) {
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}`);
        const data = await res.json();
        
        document.getElementById('watch-title').innerText = data.title || data.name;
        document.getElementById('watch-desc').innerText = data.overview;
        document.getElementById('watch-year').innerText = (data.release_date || data.first_air_date || "").split('-')[0];
        document.getElementById('watch-rating').innerHTML = `<i class="fa-solid fa-star text-cyan-400"></i> ${data.vote_average.toFixed(1)}`;
    } catch (err) {
        console.error("Details fetch error:", err);
    }
}

/* ============================================
   CONTINUE WATCHING LOGIC
============================================ */

function saveProgress(id, type, s, e) {
    let history = JSON.parse(localStorage.getItem('cymor_history') || '[]');
    // Remove if already exists to move to top
    history = history.filter(item => item.id !== id);
    
    history.unshift({
        id, type, s, e,
        timestamp: Date.now()
    });

    // Keep only last 10
    localStorage.setItem('cymor_history', JSON.stringify(history.slice(0, 10)));
}

async function renderContinueWatching() {
    const history = JSON.parse(localStorage.getItem('cymor_history') || '[]');
    const container = document.getElementById('history-grid');
    const section = document.getElementById('continue-watching-section');

    if (!container || history.length === 0) {
        if(section) section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    container.innerHTML = '';

    for (const item of history) {
        try {
            const res = await fetch(`${BASE_URL}/${item.type}/${item.id}?api_key=${API_KEY}`);
            const data = await res.json();

            const card = document.createElement('div');
            card.className = "min-w-[240px] relative rounded-xl overflow-hidden cursor-pointer group glass";
            card.innerHTML = `
                <img src="${POSTER_URL + data.backdrop_path}" class="w-full h-32 object-cover opacity-60">
                <div class="absolute inset-0 p-4 flex flex-col justify-end">
                    <p class="text-xs text-cyan-400 font-black uppercase">${item.type === 'tv' ? `S${item.s} E${item.e}` : 'Movie'}</p>
                    <p class="font-bold truncate text-sm">${data.title || data.name}</p>
                </div>
            `;
            card.onclick = () => {
                window.location.href = `watch.html?id=${item.id}&type=${item.type}&s=${item.s}&e=${item.e}`;
            };
            container.appendChild(card);
        } catch (e) {}
    }
}

/* ============================================
   TV SERIES: EPISODE SELECTOR
============================================ */

async function loadEpisodeSelector(id, currentS, currentE) {
    const container = document.getElementById('episode-selector-container');
    if (!container) return;

    try {
        const res = await fetch(`${BASE_URL}/tv/${id}/season/${currentS}?api_key=${API_KEY}`);
        const data = await res.json();

        let html = `<h4 class="font-black mb-4 uppercase text-sm tracking-widest text-gray-400">Season ${currentS} Episodes</h4>`;
        html += `<div class="grid grid-cols-1 gap-2">`;
        
        data.episodes.forEach(ep => {
            const isActive = ep.episode_number == currentE ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 hover:bg-white/5';
            html += `
                <div class="p-4 rounded-xl border ${isActive} cursor-pointer transition flex justify-between items-center" 
                     onclick="window.location.href='watch.html?id=${id}&type=tv&s=${currentS}&e=${ep.episode_number}'">
                    <span class="text-sm font-bold">${ep.episode_number}. ${ep.name}</span>
                    <i class="fa-solid fa-play text-xs opacity-50"></i>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    } catch (err) {
        console.error("Episode fetch error:", err);
    }
}

/* ============================================
   HOME PAGE & HERO
============================================ */

async function initHomePage() {
    try {
        const trendingRes = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`);
        const trending = await trendingRes.json();
        trendingData = trending.results.filter(i => i.backdrop_path && i.poster_path);
        
        renderMovieGrid(trendingData, "trending-grid");
        startHeroRotation();
    } catch (err) {
        console.error(err);
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
    const bg = document.getElementById("hero-backdrop");
    const title = document.getElementById("hero-title");
    const desc = document.getElementById("hero-description");
    if (!bg) return;

    bg.style.opacity = "0";
    setTimeout(() => {
        bg.src = IMG_URL + item.backdrop_path;
        title.innerText = item.title || item.name;
        desc.innerText = item.overview;
        const type = item.media_type || (item.title ? "movie" : "tv");

        document.getElementById("hero-watch-btn").onclick = () => 
            window.location.href = `watch.html?id=${item.id}&type=${type}`;
        
        document.getElementById("hero-details-btn").href = `details.html?id=${item.id}&type=${type}`;
        bg.style.opacity = "1";
    }, 400);
}

/* ============================================
   MODAL & GRID UTILS
============================================ */

function renderMovieGrid(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    data.forEach(item => {
        const type = item.media_type || (item.title ? "movie" : "tv");
        const title = item.title || item.name;
        const card = document.createElement("div");
        card.className = "movie-card relative rounded-[2rem] overflow-hidden cursor-pointer group shadow-2xl";
        card.innerHTML = `
            <img src="${POSTER_URL + item.poster_path}" class="w-full h-[320px] object-cover group-hover:scale-110 transition duration-500">
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
    const modal = document.getElementById("action-modal");
    if (!modal) return;

    document.getElementById("modal-title").innerText = title;
    document.getElementById("modal-poster").style.backgroundImage = `url(${poster})`;

    document.getElementById("modal-watch").onclick = () => {
        window.location.href = `watch.html?id=${id}&type=${type}`;
    };
    document.getElementById("modal-details").href = `details.html?id=${id}&type=${type}`;
    document.getElementById("modal-download").href = `download.html?id=${id}&type=${type}`;

    modal.classList.remove("hidden");
};

window.closeModal = () => document.getElementById("action-modal").classList.add("hidden");

/* ============================================
   NETFLIX SEARCH OVERLAY
============================================ */

function initNetflixSearchOverlay() {
    const overlay = document.getElementById("search-overlay");
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");
    const openBtn = document.getElementById("open-search");
    const closeBtn = document.getElementById("close-search");

    if (!overlay || !input) return;

    openBtn?.addEventListener("click", () => { overlay.classList.remove("hidden"); input.focus(); });
    closeBtn?.addEventListener("click", () => { overlay.classList.add("hidden"); input.value = ""; results.innerHTML = ""; });

    let timer;
    input.addEventListener("input", (e) => {
        clearTimeout(timer);
        const query = e.target.value.trim();
        if (!query) { results.innerHTML = ""; return; }

        timer = setTimeout(async () => {
            const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
            const data = await res.json();
            results.innerHTML = data.results.filter(i => i.poster_path).map(item => {
                const type = item.media_type || (item.title ? "movie" : "tv");
                return `
                <div class="cursor-pointer hover:scale-105 transition p-2" onclick="openModal('${item.id}','${item.title || item.name}','${POSTER_URL + item.poster_path}','${type}')">
                    <img src="${POSTER_URL + item.poster_path}" class="rounded-xl w-full h-[260px] object-cover shadow-lg"/>
                    <p class="text-white mt-2 text-xs font-black uppercase tracking-tighter">${item.title || item.name}</p>
                </div>`;
            }).join("");
        }, 300);
    });
}
