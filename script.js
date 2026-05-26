/**
 * ============================================
 * CYMOR MOVIE HUB — ULTIMATE NETFLIX ENGINE
 * No Redirect Streaming System
 * Instant Search + Safe Playback Flow
 * ============================================
 */

const API_KEY = "2d1c54be44c1c27b0d5eaf172050f257";
const BASE_URL = "https://api.themoviedb.org/3";

const IMG_URL = "https://image.tmdb.org/t/p/original";
const POSTER_URL = "https://image.tmdb.org/t/p/w500";

let trendingData = [];
let heroIndex = 0;

/* ============================================
   INIT
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
   GLOBAL FEATURES (NO REDIRECT SAFETY LAYER)
============================================ */

function initGlobalFeatures() {

    // 🚫 BLOCK ANY OLD SEARCH INPUT BEHAVIOR
    const oldSearch = document.getElementById("movie-search");
    if (oldSearch) {
        oldSearch.addEventListener("keydown", (e) => {
            e.preventDefault(); // prevent Enter redirects
        });
    }

    // MODAL BACKDROP CLOSE
    const modal = document.getElementById("action-modal");
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target.id === "action-modal") closeModal();
        });
    }

    // 🚫 HARD BLOCK any accidental anchor redirects in watch flow
    document.addEventListener("click", (e) => {
        const a = e.target.closest("a");

        if (a && a.href && a.href.includes("watch.html")) {
            // allow modal navigation only
            const isModalButton =
                a.id === "btn-watch" ||
                a.id === "hero-watch-btn" ||
                a.id === "modal-watch";

            if (!isModalButton) {
                e.preventDefault();
            }
        }
    });
}

/* ============================================
   NETFLIX SEARCH OVERLAY
============================================ */

function initNetflixSearchOverlay() {

    const overlay = document.getElementById("search-overlay");
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");

    const openBtn = document.getElementById("open-search");
    const closeBtn = document.getElementById("close-search");

    if (!overlay || !input || !results) return;

    let debounceTimer;

    openBtn?.addEventListener("click", () => {
        overlay.classList.remove("hidden");
        input.focus();
    });

    closeBtn?.addEventListener("click", () => {
        overlay.classList.add("hidden");
        input.value = "";
        results.innerHTML = "";
    });

    // 🔥 LIVE NETFLIX SEARCH (WORD-BY-WORD)
    input.addEventListener("input", (e) => {

        clearTimeout(debounceTimer);

        const query = e.target.value.trim();

        if (!query) {
            results.innerHTML = "";
            return;
        }

        debounceTimer = setTimeout(async () => {

            try {
                const res = await fetch(
                    `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
                );

                const data = await res.json();

                renderSearchResults(
                    data.results.filter(i => i.poster_path),
                    results
                );

            } catch (err) {
                console.error("Search error:", err);
            }

        }, 250);
    });
}

function renderSearchResults(items, container) {

    container.innerHTML = items.map(item => {
        const type = item.media_type || (item.title ? "movie" : "tv");
        const title = item.title || item.name;

        return `
        <div class="cursor-pointer hover:scale-105 transition"
             onclick="openModal('${item.id}','${title}','${POSTER_URL + item.poster_path}','${type}')">

            <img src="${POSTER_URL + item.poster_path}"
                 class="rounded-xl w-full h-[260px] object-cover"/>

            <p class="text-white mt-2 text-sm font-bold">
                ${title}
            </p>
        </div>
        `;
    }).join("");
}

/* ============================================
   HOME PAGE
============================================ */

async function initHomePage() {

    try {
        const trendingRes =
            await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`);

        const trending = await trendingRes.json();

        trendingData = trending.results.filter(i => i.poster_path);

        renderMovieGrid(trendingData, "trending-grid");

        startHeroRotation();

    } catch (err) {
        console.error(err);
    }
}

function startHeroRotation() {

    if (!trendingData.length) return;

    setInterval(() => {
        updateHeroUI(trendingData[heroIndex]);
        heroIndex = (heroIndex + 1) % Math.min(trendingData.length, 10);
    }, 12000);
}

/* ============================================
   HERO UI
============================================ */

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
            openModal(item.id, title.innerText, IMG_URL + item.poster_path, type);

        document.getElementById("hero-details-btn").href =
            `details.html?id=${item.id}&type=${type}`;

        bg.style.opacity = "1";

    }, 300);
}

/* ============================================
   GRID RENDER
============================================ */

function renderMovieGrid(data, containerId) {

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    data.forEach(item => {

        const type = item.media_type || (item.title ? "movie" : "tv");
        const title = item.title || item.name;

        const card = document.createElement("div");

        card.className =
            "movie-card relative rounded-[2rem] overflow-hidden cursor-pointer group";

        card.innerHTML = `
        <img src="${POSTER_URL + item.poster_path}"
             class="w-full h-[320px] object-cover group-hover:scale-110 transition">

        <div class="absolute bottom-0 p-4 text-white font-bold">
            ${title}
        </div>
        `;

        card.onclick = () =>
            openModal(item.id, title, POSTER_URL + item.poster_path, type);

        container.appendChild(card);
    });
}

/* ============================================
   MODAL
============================================ */

window.openModal = function(id, title, poster, type) {

    const modal = document.getElementById("action-modal");
    if (!modal) return;

    document.getElementById("modal-title").innerText = title;

    const posterEl = document.getElementById("modal-poster");
    posterEl.style.backgroundImage = `url(${poster})`;

    // 🚫 SAFE: NO DIRECT NAV REDIRECT PLAY FLOW
    document.getElementById("modal-watch").onclick = () => {
        window.location.href = `watch.html?id=${id}&type=${type}`;
    };

    document.getElementById("modal-details").href =
        `details.html?id=${id}&type=${type}`;

    document.getElementById("modal-download").href =
        `download.html?id=${id}&type=${type}`;

    modal.classList.remove("hidden");
};

window.closeModal = function() {
    document.getElementById("action-modal")?.classList.add("hidden");
};

/* ============================================
   WATCH PAGE (NO AUTO REDIRECT CHAOS)
============================================ */

async function initWatchPage() {

    const params = new URLSearchParams(window.location.search);

    const id = params.get("id");
    const type = params.get("type") || "movie";

    const season = params.get("s") || 1;
    const episode = params.get("e") || 1;

    if (!id) return;

    const player = document.getElementById("video-player");

    if (player) {

        player.src =
            type === "movie"
                ? `https://vidsrc.to/embed/movie/${id}`
                : `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`;
    }
}

/* ============================================
   DETAILS PAGE
============================================ */

async function initDetailsPage() {

    const params = new URLSearchParams(window.location.search);

    const id = params.get("id");
    const type = params.get("type") || "movie";

    if (!id) return;

    const res = await fetch(
        `${BASE_URL}/${type}/${id}?api_key=${API_KEY}&append_to_response=credits,recommendations`
    );

    const data = await res.json();

    document.getElementById("detail-title").innerText = data.title || data.name;

    document.getElementById("btn-watch").onclick = () =>
        openModal(data.id, data.title || data.name, POSTER_URL + data.poster_path, type);
}
