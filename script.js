/**
 * ============================================
 * CYMOR MOVIE HUB — CORE ENGINE
 * Elite TMDB Frontend System
 * Built For Movies + TV Shows
 * No Ads • Pure Streaming UI
 * ============================================
 */

const API_KEY = "2d1c54be44c1c27b0d5eaf172050f257";
const BASE_URL = "https://api.themoviedb.org/3";

const IMG_URL = "https://image.tmdb.org/t/p/original";
const POSTER_URL = "https://image.tmdb.org/t/p/w500";

let trendingData = [];
let heroIndex = 0;

/* ============================================
   APP INITIALIZATION
============================================ */

document.addEventListener("DOMContentLoaded", () => {

    const path = window.location.pathname;

    initGlobalFeatures();

    if (path.includes("index.html") || path === "/") {
        initHomePage();
    }

    if (path.includes("watch.html")) {
        initWatchPage();
    }

    if (path.includes("details.html")) {
        initDetailsPage();
    }

});

/* ============================================
   GLOBAL FEATURES
============================================ */

function initGlobalFeatures() {

    // SEARCH
    const searchInput = document.getElementById("movie-search");

    if (searchInput) {

        searchInput.addEventListener("keyup", async (e) => {

            if (e.key === "Enter") {
                performSearch(e.target.value);
            }

        });

    }

    // CLOSE MODAL OUTSIDE CLICK
    const modal = document.getElementById("action-modal");

    if (modal) {

        modal.addEventListener("click", (e) => {

            if (e.target.id === "action-modal") {
                closeModal();
            }

        });

    }

}

/* ============================================
   HOME PAGE
============================================ */

async function initHomePage() {

    try {

        // TRENDING
        const trendingRes =
            await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`);

        const trending =
            await trendingRes.json();

        trendingData =
            trending.results.filter(item => item.poster_path);

        renderMovieGrid(trendingData, "trending-grid");

        // HERO ROTATION
        startHeroRotation();

    } catch (error) {

        console.error("Home Init Error:", error);

    }

}

function startHeroRotation() {

    if (!trendingData.length) return;

    const rotate = () => {

        updateHeroUI(trendingData[heroIndex]);

        heroIndex =
            (heroIndex + 1) % Math.min(trendingData.length, 10);

    };

    rotate();

    setInterval(rotate, 12000);

}

function updateHeroUI(item) {

    const heroBg =
        document.getElementById("hero-backdrop");

    const heroTitle =
        document.getElementById("hero-title");

    const heroDesc =
        document.getElementById("hero-description");

    if (!heroBg) return;

    heroBg.style.opacity = "0";

    setTimeout(() => {

        heroBg.src =
            IMG_URL + item.backdrop_path;

        heroTitle.innerText =
            item.title || item.name;

        heroDesc.innerText =
            item.overview || "No description available.";

        heroBg.style.opacity = "1";

        const type =
            item.media_type || (item.title ? "movie" : "tv");

        document.getElementById("hero-watch-btn").href =
            `watch.html?id=${item.id}&type=${type}`;

        document.getElementById("hero-details-btn").href =
            `details.html?id=${item.id}&type=${type}`;

    }, 400);

}

/* ============================================
   MOVIE GRID
============================================ */

function renderMovieGrid(data, containerId) {

    const container =
        document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = "";

    data.forEach(item => {

        if (!item.poster_path) return;

        const type =
            item.media_type || (item.title ? "movie" : "tv");

        const title =
            item.title || item.name;

        const year =
            (item.release_date || item.first_air_date || "")
            .split("-")[0];

        const card =
            document.createElement("div");

        card.className =
            "movie-card relative rounded-[2rem] overflow-hidden cursor-pointer group";

        card.innerHTML = `

            <div class="relative overflow-hidden">

                <img
                    src="${POSTER_URL + item.poster_path}"
                    class="w-full h-[320px] object-cover transition duration-500 group-hover:scale-110"
                >

                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-90"></div>

                <div class="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">

                    <i class="fa-solid fa-star text-yellow-400"></i>
                    ${item.vote_average?.toFixed(1) || "N/A"}

                </div>

                <div class="absolute bottom-0 left-0 right-0 p-4">

                    <p class="font-black line-clamp-1 text-sm uppercase tracking-wide">

                        ${title}

                    </p>

                    <div class="flex items-center justify-between mt-2">

                        <span class="text-xs text-gray-300">

                            ${year || "2026"}

                        </span>

                        <span class="text-xs uppercase text-cyan-400 font-bold">

                            ${type}

                        </span>

                    </div>

                </div>

            </div>

        `;

        card.onclick = () =>
            openModal(
                item.id,
                title,
                POSTER_URL + item.poster_path,
                type
            );

        container.appendChild(card);

    });

}

/* ============================================
   SEARCH SYSTEM
============================================ */

async function performSearch(query) {

    if (!query.trim()) return;

    const container =
        document.getElementById("trending-grid");

    if (!container) return;

    container.innerHTML = `
        <div class="col-span-full text-center py-20">
            <div class="animate-spin w-14 h-14 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-6"></div>
            <p class="text-gray-400 font-bold tracking-widest uppercase">
                Searching...
            </p>
        </div>
    `;

    try {

        const res =
            await fetch(
                `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
            );

        const data =
            await res.json();

        renderMovieGrid(
            data.results.filter(item => item.poster_path),
            "trending-grid"
        );

    } catch (error) {

        console.error("Search Error:", error);

    }

}

/* ============================================
   MODAL SYSTEM
============================================ */

window.openModal = function(id, title, poster, type) {

    const modal =
        document.getElementById("action-modal");

    if (!modal) return;

    document.getElementById("modal-title").innerText =
        title;

    const posterEl =
        document.getElementById("modal-poster");

    posterEl.style.backgroundImage =
        `url(${poster})`;

    posterEl.style.backgroundSize =
        "cover";

    posterEl.style.backgroundPosition =
        "center";

    document.getElementById("modal-watch").href =
        `watch.html?id=${id}&type=${type}`;

    document.getElementById("modal-details").href =
        `details.html?id=${id}&type=${type}`;

    document.getElementById("modal-download").href =
        `download.html?id=${id}&type=${type}`;

    modal.classList.remove("hidden");

};

window.closeModal = function() {

    const modal =
        document.getElementById("action-modal");

    if (modal) {
        modal.classList.add("hidden");
    }

};

/* ============================================
   WATCH PAGE
============================================ */

async function initWatchPage() {

    const params =
        new URLSearchParams(window.location.search);

    const id =
        params.get("id");

    const type =
        params.get("type") || "movie";

    const season =
        params.get("s") || 1;

    const episode =
        params.get("e") || 1;

    if (!id) {
        window.location.href = "index.html";
        return;
    }

    // VIDEO PLAYER
    const player =
        document.getElementById("video-player");

    if (player) {

        if (type === "movie") {

            player.src =
                `https://vidsrc.to/embed/movie/${id}`;

        } else {

            player.src =
                `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`;

        }

    }

    // FETCH DETAILS
    try {

        const res =
            await fetch(
                `${BASE_URL}/${type}/${id}?api_key=${API_KEY}&append_to_response=recommendations`
            );

        const data =
            await res.json();

        updateWatchUI(data, type);

        renderMovieGrid(
            data.recommendations.results.slice(0, 12),
            "recommended-grid"
        );

        saveProgress(
            id,
            type,
            season,
            episode
        );

    } catch (error) {

        console.error("Watch Page Error:", error);

    }

}

function updateWatchUI(data, type) {

    const title =
        data.title || data.name;

    document.getElementById("watch-title").innerText =
        title;

    document.getElementById("watch-desc").innerText =
        data.overview || "No description available.";

    document.getElementById("watch-rating").innerHTML =
        `<i class="fa-solid fa-star"></i> ${data.vote_average?.toFixed(1)}`;

    document.getElementById("watch-year").innerText =
        (data.release_date || data.first_air_date || "")
        .split("-")[0];

    document.getElementById("btn-download").href =
        `download.html?id=${data.id}&type=${type}`;

}

/* ============================================
   CONTINUE WATCHING
============================================ */

function saveProgress(id, type, season, episode) {

    let history =
        JSON.parse(localStorage.getItem("cymor_history") || "[]");

    history =
        history.filter(item => item.id !== id);

    history.unshift({
        id,
        type,
        season,
        episode,
        updated: Date.now()
    });

    localStorage.setItem(
        "cymor_history",
        JSON.stringify(history.slice(0, 20))
    );

}

/* ============================================
   DETAILS PAGE
============================================ */

async function initDetailsPage() {

    const params =
        new URLSearchParams(window.location.search);

    const id =
        params.get("id");

    const type =
        params.get("type") || "movie";

    if (!id) {
        window.location.href = "index.html";
        return;
    }

    try {

        const res =
            await fetch(
                `${BASE_URL}/${type}/${id}?api_key=${API_KEY}&append_to_response=credits,recommendations`
            );

        const data =
            await res.json();

        populateDetailsPage(data, type);

    } catch (error) {

        console.error("Details Error:", error);

    }

}

function populateDetailsPage(data, type) {

    // TITLE
    document.getElementById("detail-title").innerText =
        data.title || data.name;

    // POSTER
    const poster =
        POSTER_URL + data.poster_path;

    const backdrop =
        IMG_URL + data.backdrop_path;

    document.getElementById("detail-poster").style.backgroundImage =
        `url(${poster})`;

    document.getElementById("detail-poster").style.backgroundSize =
        "cover";

    document.getElementById("detail-poster").style.backgroundPosition =
        "center";

    document.getElementById("dynamic-bg").style.backgroundImage =
        `url(${backdrop})`;

    document.getElementById("hero-backdrop").style.backgroundImage =
        `url(${backdrop})`;

    // META
    document.getElementById("detail-rating").innerText =
        data.vote_average?.toFixed(1);

    document.getElementById("detail-runtime").innerHTML =
        `<i class="fa-regular fa-clock mr-1"></i> ${
            data.runtime || "45"
        } min`;

    document.getElementById("detail-date").innerHTML =
        `<i class="fa-regular fa-calendar mr-1"></i> ${
            data.release_date || data.first_air_date || "2026"
        }`;

    document.getElementById("detail-overview").innerText =
        data.overview || "No overview available.";

    document.getElementById("detail-status").innerText =
        data.status || "Released";

    document.getElementById("detail-type").innerText =
        type.toUpperCase();

    // BUTTONS
    document.getElementById("btn-watch").href =
        `watch.html?id=${data.id}&type=${type}`;

    document.getElementById("btn-download").href =
        `download.html?id=${data.id}&type=${type}`;

    // GENRES
    const genresList =
        document.getElementById("genres-list");

    if (genresList && data.genres) {

        genresList.innerHTML =
            data.genres.map(genre => `
                <div class="genre-pill px-4 py-2 rounded-full text-sm font-semibold">
                    ${genre.name}
                </div>
            `).join("");

    }

    // CAST
    renderCast(data.credits.cast);

    // RELATED
    renderMovieGrid(
        data.recommendations.results.slice(0, 12),
        "related-grid"
    );

    // TV SEASONS
    if (type === "tv") {

        renderSeasons(data.seasons, data.id);

    }

}

/* ============================================
   CAST SYSTEM
============================================ */

function renderCast(cast) {

    const container =
        document.getElementById("cast-list");

    if (!container || !cast) return;

    container.innerHTML = "";

    cast.slice(0, 15).forEach(actor => {

        const image =
            actor.profile_path
            ? POSTER_URL + actor.profile_path
            : "https://placehold.co/200x300?text=No+Image";

        container.innerHTML += `

            <div class="w-28 shrink-0 text-center">

                <img
                    src="${image}"
                    class="w-28 h-28 rounded-full object-cover border border-white/10 mb-3"
                >

                <p class="font-bold text-sm line-clamp-1">
                    ${actor.name}
                </p>

                <p class="text-xs text-gray-400 line-clamp-1 mt-1">
                    ${actor.character || ""}
                </p>

            </div>

        `;

    });

}

/* ============================================
   SEASONS SYSTEM
============================================ */

function renderSeasons(seasons, showId) {

    const container =
        document.getElementById("seasons-container");

    const list =
        document.getElementById("seasons-list");

    if (!container || !list || !seasons) return;

    container.classList.remove("hidden");

    list.innerHTML = "";

    seasons.forEach(season => {

        list.innerHTML += `

            <a
                href="watch.html?id=${showId}&type=tv&s=${season.season_number}&e=1"
                class="glass min-w-[220px] rounded-[1.5rem] overflow-hidden hover:border-cyan-400 border border-transparent transition"
            >

                <div class="p-5">

                    <p class="font-black text-lg mb-2">
                        ${season.name}
                    </p>

                    <p class="text-sm text-gray-400 mb-3">
                        ${season.episode_count} Episodes
                    </p>

                    <p class="text-xs text-cyan-400 uppercase font-bold tracking-widest">
                        Watch Season
                    </p>

                </div>

            </a>

        `;

    });

}
