/**
 * =========================================
 * CYMOR MOVIE HUB - SCRIPT.JS
 * Netflix Style Frontend Logic
 * =========================================
 */

/* =========================================
   GLOBAL NAVIGATION
========================================= */

window.openContent = function(id, type = "movie") {

    if (!id) return;

    window.location.href =
        `/watch.html?id=${id}&type=${type}`;

};

/* =========================================
   CONFIG
========================================= */

const IMG =
    "https://image.tmdb.org/t/p/w500";

const ORIGINAL =
    "https://image.tmdb.org/t/p/original";

const HERO_EL =
    document.getElementById("hero");

const HERO_CONTENT_EL =
    document.getElementById("heroContent");

let trendingMovies = [];

let currentHeroIndex = 0;

let heroInterval;

/* =========================================
   HOME INITIALIZATION
========================================= */

async function initHome() {

    try {

        // FETCH TRENDING

        const res =
            await fetch("/api/trending");

        if (!res.ok) {
            throw new Error(
                "Failed to fetch trending movies"
            );
        }

        const data = await res.json();

        // FILTER ONLY GOOD HERO ITEMS

        trendingMovies =
            data.results.filter(
                movie => movie.backdrop_path
            );

        // HERO

        updateHero();

        // TRENDING ROW

        renderMovies(
            data.results,
            "trending"
        );

        // START HERO AUTO SLIDER

        startHeroSlider();

        // OTHER SECTIONS

        fetchSection(
            "popular",
            "popular"
        );

        fetchSection(
            "toprated",
            "toprated"
        );

    } catch (error) {

        console.error(
            "CYMOR LOAD ERROR:",
            error
        );

    }

}

/* =========================================
   HERO SECTION
========================================= */

function updateHero() {

    const movie =
        trendingMovies[currentHeroIndex];

    if (
        !movie ||
        !HERO_EL ||
        !HERO_CONTENT_EL
    ) return;

    // DETECT TYPE

    const type =
        movie.media_type ||
        (movie.title ? "movie" : "tv");

    // TITLE

    const title =
        movie.title ||
        movie.name ||
        "Untitled";

    // OVERVIEW

    const overview =
        movie.overview ||
        "No description available.";

    // BACKGROUND

    HERO_EL.style.backgroundImage =
        `url(${ORIGINAL + movie.backdrop_path})`;

    // HERO HTML

    HERO_CONTENT_EL.innerHTML = `

        <h1 class="animate-fade-in">
            ${title}
        </h1>

        <p class="animate-fade-in">
            ${overview}
        </p>

        <div class="hero-btns">

            <button class="watch-btn"
            onclick="openContent(${movie.id}, '${type}')">

                <i class="fas fa-play"></i>
                Watch Now

            </button>

            <button class="info-btn"
            onclick="openContent(${movie.id}, '${type}')">

                <i class="fas fa-info-circle"></i>
                Details

            </button>

        </div>

    `;

}

/* =========================================
   HERO AUTO SLIDER
========================================= */

function startHeroSlider() {

    if (heroInterval) {
        clearInterval(heroInterval);
    }

    heroInterval = setInterval(() => {

        currentHeroIndex++;

        if (
            currentHeroIndex >=
            trendingMovies.length
        ) {

            currentHeroIndex = 0;

        }

        updateHero();

    }, 8000);

}

/* =========================================
   RENDER MOVIE ROWS
========================================= */

function renderMovies(movies, targetId) {

    const container =
        document.getElementById(targetId);

    if (!container) return;

    // EMPTY STATE

    if (
        !movies ||
        movies.length === 0
    ) {

        container.innerHTML = `

            <p class="muted">
                No content found.
            </p>

        `;

        return;
    }

    // RENDER MOVIES

    container.innerHTML =
        movies.map(movie => {

            const type =
                movie.media_type ||
                (movie.title ? "movie" : "tv");

            const rating =
                movie.vote_average
                ? movie.vote_average.toFixed(1)
                : "N/A";

            const poster =
                movie.poster_path
                ? IMG + movie.poster_path
                : "https://via.placeholder.com/500x750?text=No+Cover";

            return `

                <div class="movie-card"
                onclick="openContent(${movie.id}, '${type}')">

                    <div class="rating-badge">
                        ★ ${rating}
                    </div>

                    <img
                        src="${poster}"

                        alt="${movie.title || movie.name}"

                        loading="lazy"
                    >

                </div>

            `;

        }).join("");

}

/* =========================================
   FETCH EXTRA SECTIONS
========================================= */

async function fetchSection(
    endpoint,
    targetId
) {

    try {

        const res =
            await fetch(`/api/${endpoint}`);

        if (!res.ok) {
            throw new Error(
                `Failed to load ${endpoint}`
            );
        }

        const data =
            await res.json();

        renderMovies(
            data.results,
            targetId
        );

    } catch (error) {

        console.warn(
            `${endpoint} failed:`,
            error
        );

    }

}

/* =========================================
   SEARCH
========================================= */

const searchInput =
    document.getElementById(
        "searchInput"
    );

if (searchInput) {

    searchInput.addEventListener(
        "keypress",

        async (e) => {

            if (
                e.key === "Enter" &&
                searchInput.value.trim() !== ""
            ) {

                try {

                    const query =
                        searchInput.value.trim();

                    const res =
                        await fetch(
                            `/api/search?q=${encodeURIComponent(query)}`
                        );

                    const data =
                        await res.json();

                    renderMovies(
                        data.results,
                        "trending"
                    );

                    // SCROLL TO RESULTS

                    window.scrollTo({
                        top: 500,
                        behavior: "smooth"
                    });

                } catch (error) {

                    console.log(
                        "Search failed:",
                        error
                    );

                }

            }

        }

    );

}

/* =========================================
   INITIALIZE APP
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initHome
);
