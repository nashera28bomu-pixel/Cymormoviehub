// 1. GLOBAL NAVIGATION - Must be at the top
window.openContent = function(id, type) {
    if(!id) return;
    // Ensure we are sending a clean string for type
    const contentType = type || 'movie';
    window.location.href = `watch.html?id=${id}&type=${contentType}`;
};

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
        trendingMovies = data.results.filter(m => m.backdrop_path); 

        updateHero();
        renderMovies(data.results, "trending");

        setInterval(() => {
            currentHeroIndex = (currentHeroIndex + 1) % trendingMovies.length;
            updateHero();
        }, 8000);

        fetchSection('popular', 'popular');
        fetchSection('toprated', 'toprated');
    } catch (err) {
        console.error("Load error:", err);
    }
}

function updateHero() {
    const movie = trendingMovies[currentHeroIndex];
    if (!movie) return;

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

function renderMovies(movies, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;

    container.innerHTML = movies.map(movie => {
        const type = movie.media_type || (movie.title ? 'movie' : 'tv');
        return `
            <div class="movie-card" onclick="openContent(${movie.id}, '${type}')">
                <div class="rating-badge">★ ${movie.vote_average.toFixed(1)}</div>
                <img src="${movie.poster_path ? IMG + movie.poster_path : 'https://via.placeholder.com/500x750'}" alt="cover">
            </div>
        `;
    }).join("");
}

async function fetchSection(endpoint, targetId) {
    const res = await fetch(`/api/${endpoint}`);
    const data = await res.json();
    renderMovies(data.results, targetId);
}

// Initialize
fetchHomeData();
