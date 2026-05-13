const params = new URLSearchParams(window.location.search);

const id = params.get("id");
const type = params.get("type") || "movie";

const IMG = "https://image.tmdb.org/t/p/w500";

/* =========================================
   DOM CACHE (PERFORMANCE BOOST)
========================================= */

const titleEl = document.getElementById("movieTitle");
const overviewEl = document.getElementById("movieOverview");
const playerEl = document.getElementById("videoPlayer");
const castContainer = document.getElementById("castList");
const relatedContainer = document.getElementById("similarMovies");
const episodeContainer = document.getElementById("episodeGrid");
const episodeTab = document.getElementById("episodeTab");

/* =========================================
   SAFE FETCH WRAPPER
========================================= */

async function safeFetch(url, label = "API") {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${label} failed`);
    return await res.json();
  } catch (err) {
    console.error(`❌ ${label} error:`, err);
    return null;
  }
}

/* =========================================
   LOAD MOVIE / TV DATA
========================================= */

async function loadMovie() {
  if (!id) return;

  const data = await safeFetch(
    `/api/details/${id}?type=${type}`,
    "Details"
  );

  if (!data) return;

  /* TITLE */
  if (titleEl) {
    titleEl.textContent =
      data.title || data.name || "Unknown Title";
  }

  /* OVERVIEW */
  if (overviewEl) {
    overviewEl.textContent =
      data.overview || "No overview available.";
  }

  /* PLAYER */
  if (playerEl) {
    playerEl.src =
      `https://vidsrc.to/embed/${type}/${id}`;
  }

  /* CAST */
  renderCast(data.credits?.cast || []);

  /* RELATED */
  renderRelated(
    data.recommendations?.results ||
    data.similar?.results ||
    []
  );

  /* TV SUPPORT */
  if (type === "tv" && episodeTab) {
    episodeTab.style.display = "block";
    loadEpisodes(id, 1);
  }
}

/* =========================================
   CAST RENDER
========================================= */

function renderCast(cast = []) {
  if (!castContainer) return;

  const list = cast.slice(0, 12);

  castContainer.innerHTML = list.map(person => {
    const img = person.profile_path
      ? IMG + person.profile_path
      : "https://via.placeholder.com/300x450?text=No+Image";

    return `
      <div class="cast-card">
        <img src="${img}" loading="lazy" />
        <p>${person.name || "Unknown"}</p>
      </div>
    `;
  }).join("");
}

/* =========================================
   RELATED CONTENT
========================================= */

function renderRelated(movies = []) {
  if (!relatedContainer) return;

  const list = movies.slice(0, 12);

  relatedContainer.innerHTML = list.map(movie => {
    const poster = movie.poster_path
      ? IMG + movie.poster_path
      : "https://via.placeholder.com/500x750?text=No+Poster";

    const mediaType = movie.media_type || (movie.title ? "movie" : "tv");

    return `
      <div class="movie-card"
        onclick="openMovie(${movie.id}, '${mediaType}')">

        <div class="rating-badge">
          ★ ${movie.vote_average?.toFixed(1) || "N/A"}
        </div>

        <img src="${poster}" loading="lazy" />
      </div>
    `;
  }).join("");
}

/* =========================================
   OPEN MOVIE
========================================= */

function openMovie(movieId, mediaType = "movie") {
  if (!movieId) return;

  window.location.href =
    `watch.html?id=${movieId}&type=${mediaType}`;
}

/* =========================================
   EPISODES
========================================= */

async function loadEpisodes(movieId, season) {
  const data = await safeFetch(
    `/api/tv/${movieId}/season/${season}`,
    "Episodes"
  );

  if (!data || !episodeContainer) return;

  const episodes = data.episodes || [];

  episodeContainer.innerHTML = episodes.map(ep => `
    <div class="ep-box"
      onclick="playEpisode(${season}, ${ep.episode_number})">

      EP ${ep.episode_number}

    </div>
  `).join("");
}

/* =========================================
   PLAY EPISODE
========================================= */

function playEpisode(season, episode) {
  if (!playerEl) return;

  playerEl.src =
    `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`;
}

/* =========================================
   TAB SYSTEM (UPGRADED 10/10)
========================================= */

function initTabs() {
  const tabs = document.querySelectorAll(".tab");

  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      if (!target) return;

      // remove active states
      document.querySelectorAll(".tab")
        .forEach(t => t.classList.remove("active"));

      document.querySelectorAll(".pane")
        .forEach(p => p.classList.remove("active"));

      // activate current tab
      tab.classList.add("active");

      const pane = document.getElementById(target);
      if (pane) pane.classList.add("active");
    });
  });
}

/* =========================================
   SCROLL TO DOWNLOADS
========================================= */

function scrollToDownloads() {
  const el = document.getElementById("downloads");
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth" });
}

/* =========================================
   INIT APP
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  loadMovie();
});
