const IMG = "https://image.tmdb.org/t/p/w500";
const ORIGINAL = "https://image.tmdb.org/t/p/original";
let trendingMovies = [];
let currentHeroIndex = 0;

async function init() {
    const res = await fetch('/api/trending');
    const data = await res.json();
    trendingMovies = data.results;
    
    // Start Rotating Hero
    rotateHero();
    setInterval(rotateHero, 8000); // Changes every 8 seconds

    renderMovies(trendingMovies, "trending");
    fetchOtherSections();
}

function rotateHero() {
    if (trendingMovies.length === 0) return;
    const movie = trendingMovies[currentHeroIndex];
    setHero(movie);
    currentHeroIndex = (currentHeroIndex + 1) % trendingMovies.length;
}

function renderMovies(movies, targetId) {
    const container = document.getElementById(targetId);
    container.innerHTML = movies.map(movie => {
        // Fix broken images
        const poster = movie.poster_path ? IMG + movie.poster_path : 'https://via.placeholder.com/500x750?text=No+Image';
        return `
            <div class="movie-card" onclick="openMovie(${movie.id})">
                <div class="rating-badge">★ ${movie.vote_average.toFixed(1)}</div>
                <img src="${poster}" loading="lazy">
                <div class="movie-info-mini">
                    <p>${movie.title || movie.name}</p>
                </div>
            </div>
        `;
    }).join("");
}

// ... existing openMovie function ...
init();
