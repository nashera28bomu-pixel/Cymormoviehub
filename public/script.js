/**
 * =========================================
 * CYMOR MOVIE HUB - SCRIPT.JS (PRO UPGRADE)
 * Netflix-level frontend logic
 * =========================================
 */

/* =========================================
   GLOBAL NAVIGATION
========================================= */

window.openContent = function (id, type = "movie") {
  if (!id) return;
  window.location.href = `/watch.html?id=${id}&type=${type}`;
};

/* =========================================
   CONFIG
========================================= */

const IMG = "https://image.tmdb.org/t/p/w500";
const ORIGINAL = "https://image.tmdb.org/t/p/original";

const HERO_EL = document.getElementById("hero");
const HERO_CONTENT_EL = document.getElementById("heroContent");

let trendingMovies = [];
let currentHeroIndex = 0;
let heroInterval = null;
let isHomeLoaded = false;

/* =========================================
   SAFE FETCH WRAPPER
========================================= */

async function safeFetch(url, label = "API") {
  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`${label} failed (${res.status})`);
    }

    return await res.json();

  } catch (err) {
    console.error(`❌ ${label} error:`, err);
    return null;
  }
}

/* =========================================
   HOME INIT
========================================= */

async function initHome() {
  if (isHomeLoaded) return;
  isHomeLoaded = true;

  const data = await safeFetch("/api/trending", "Trending");

  if (!data || !data.results) return;

  trendingMovies = data.results.filter(m => m.backdrop_path);

  if (trendingMovies.length === 0) {
    console.warn("No hero movies found");
    return;
  }

  updateHero();
  startHeroSlider();

  renderMovies(data.results, "trending");

  fetchSection("popular", "popular");
  fetchSection("toprated", "toprated");
}

/* =========================================
   HERO UPDATE
========================================= */

function updateHero() {
  if (!trendingMovies.length) return;

  const movie = trendingMovies[currentHeroIndex];
  if (!movie || !HERO_EL || !HERO_CONTENT_EL) return;

  const type = movie.media_type || (movie.title ? "movie" : "tv");

  const title = movie.title || movie.name || "Untitled";
  const overview = movie.overview || "No description available.";

  HERO_EL.style.backgroundImage =
    `url(${ORIGINAL + movie.backdrop_path})`;

  HERO_CONTENT_EL.innerHTML = `
    <h1 class="animate-fade-in">${title}</h1>

    <p class="animate-fade-in">
      ${overview.length > 180 ? overview.slice(0, 180) + "..." : overview}
    </p>

    <div class="hero-btns">
      <button class="watch-btn"
        onclick="openContent(${movie.id}, '${type}')">
        <i class="fas fa-play"></i> Watch Now
      </button>

      <button class="info-btn"
        onclick="openContent(${movie.id}, '${type}')">
        <i class="fas fa-info-circle"></i> Details
      </button>
    </div>
  `;
}

/* =========================================
   HERO SLIDER (SAFE LOOP)
========================================= */

function startHeroSlider() {
  if (heroInterval) clearInterval(heroInterval);

  heroInterval = setInterval(() => {
    if (!trendingMovies.length) return;

    currentHeroIndex =
      (currentHeroIndex + 1) % trendingMovies.length;

    updateHero();
  }, 8000);
}

/* =========================================
   MOVIE RENDERER (OPTIMIZED)
========================================= */

function renderMovies(movies, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;

  if (!movies || movies.length === 0) {
    container.innerHTML = `<p class="muted">No content found.</p>`;
    return;
  }

  const html = movies.map(movie => {
    const type = movie.media_type || (movie.title ? "movie" : "tv");

    const rating = movie.vote_average
      ? movie.vote_average.toFixed(1)
      : "N/A";

    const poster = movie.poster_path
      ? IMG + movie.poster_path
      : "https://via.placeholder.com/500x750?text=No+Cover";

    const name = movie.title || movie.name || "Untitled";

    return `
      <div class="movie-card"
        onclick="openContent(${movie.id}, '${type}')">

        <div class="rating-badge">★ ${rating}</div>

        <img src="${poster}" alt="${name}" loading="lazy" />

      </div>
    `;
  }).join("");

  container.innerHTML = html;
}

/* =========================================
   FETCH SECTIONS
========================================= */

async function fetchSection(endpoint, targetId) {
  const data = await safeFetch(`/api/${endpoint}`, endpoint);

  if (!data || !data.results) return;

  renderMovies(data.results, targetId);
}

/* =========================================
   SEARCH SYSTEM
========================================= */

const searchInput = document.getElementById("searchInput");

if (searchInput) {
  searchInput.addEventListener("keypress", async (e) => {
    if (e.key !== "Enter") return;

    const query = searchInput.value.trim();
    if (!query) return;

    const data = await safeFetch(
      `/api/search?q=${encodeURIComponent(query)}`,
      "Search"
    );

    if (!data || !data.results) return;

    renderMovies(data.results, "trending");

    window.scrollTo({
      top: 500,
      behavior: "smooth"
    });
  });
}

/* =========================================
   INIT APP
========================================= */

document.addEventListener("DOMContentLoaded", initHome);
