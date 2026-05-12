const IMG = "https://image.tmdb.org/t/p/w500";
const ORIGINAL = "https://image.tmdb.org/t/p/original";
const hero = document.getElementById("hero");
const heroContent = document.getElementById("heroContent");

let trendingMovies = [];
let currentHeroIndex = 0;

async function fetchHomeData() {
  try {
    const res = await fetch('/api/trending');
    const data = await res.json();
    // Filter to ensure we have backdrop images for the hero
    trendingMovies = data.results.filter(m => m.backdrop_path); 

    updateHero();
    renderMovies(data.results, "trending");

    // Auto-rotate hero every 8 seconds
    setInterval(() => {
      currentHeroIndex = (currentHeroIndex + 1) % trendingMovies.length;
      updateHero();
    }, 8000);

    fetchSection('popular', 'popular');
    fetchSection('toprated', 'toprated');
  } catch (err) {
    console.error("Home load error:", err);
  }
}

function updateHero() {
  const movie = trendingMovies[currentHeroIndex];
  if (!movie) return;

  // Determine if it's a movie or tv show for the URL
  const type = movie.media_type || (movie.title ? 'movie' : 'tv');

  hero.style.backgroundImage = `url(${ORIGINAL + movie.backdrop_path})`;
  heroContent.innerHTML = `
    <h1>${movie.title || movie.name}</h1>
    <p>${movie.overview}</p>
    <div class="hero-btns">
      <button class="watch-btn" onclick="openContent(${movie.id}, '${type}')">
        <i class="fas fa-play"></i> Watch Now
      </button>
      <button class="info-btn" onclick="openContent(${movie.id}, '${type}')">
        <i class="fas fa-info-circle"></i> Details
      </button>
    </div>
  `;
}

async function fetchSection(endpoint, targetId) {
  const res = await fetch(`/api/${endpoint}`);
  const data = await res.json();
  renderMovies(data.results, targetId);
}

function renderMovies(movies, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;

  container.innerHTML = movies.map(movie => {
    // Detect type for each individual card
    const type = movie.media_type || (movie.title ? 'movie' : 'tv');
    return `
      <div class="movie-card" onclick="openContent(${movie.id}, '${type}')">
        <div class="rating-badge">★ ${movie.vote_average.toFixed(1)}</div>
        <img src="${movie.poster_path ? IMG + movie.poster_path : 'https://via.placeholder.com/500x750'}" alt="cover">
      </div>
    `;
  }).join("");
}

// THE FIX: This function now sends both ID and TYPE
function openContent(id, type) {
  window.location.href = `watch.html?id=${id}&type=${type}`;
}

fetchHomeData();
