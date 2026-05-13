/**
 * CYMOR MOVIE HUB - SCRIPT.JS
 * Core logic for Trending Hero, Dynamic Rows, and Navigation
 */

// 1. GLOBAL NAVIGATION - Attached to window for HTML onclick access
window.openContent = function(id, type) {
    if (!id) return;
    
    // TMDB sometimes returns 'all' or undefined; fallback to 'movie'
    let contentType = type;
    if (!type || type === 'all') {
        contentType = 'movie'; 
    }
    
    console.log(`Navigating to ${contentType}: ${id}`);
    window.location.href = `watch.html?id=${id}&type=${contentType}`;
};

// 2. CONFIGURATION & CONSTANTS
const IMG = "https://image.tmdb.org/t/p/w500";
const ORIGINAL = "https://image.tmdb.org/t/p/original";
const HERO_EL = document.getElementById("hero");
const HERO_CONTENT_EL = document.getElementById("heroContent");

let trendingMovies = [];
let currentHeroIndex = 0;
let heroInterval;

// 3. CORE DATA FETCHING
async function initHome() {
    try {
        // Fetch trending items for the Hero Slider and Trending Row
        const res = await fetch('/api/trending');
        if (!res.ok) throw new Error("Failed to fetch trending data");
        
        const data = await res.json();
        
        // Filter for items with backdrops to ensure the Hero looks good
        trendingMovies = data.results.filter(m => m.backdrop_path); 

        // Initial render
        updateHero();
        renderMovies(data.results, "trending");

        // Set up the auto-sliding Hero
        startHeroSlider();

        // Fetch additional categorized rows
        fetchSection('popular', 'popular');
        fetchSection('toprated', 'toprated');
        
    } catch (err) {
        console.error("Cymor Hub Load Error:", err);
    }
}

// 4. HERO SECTION LOGIC
function updateHero() {
    const movie = trendingMovies[currentHeroIndex];
    if (!movie || !HERO_EL || !HERO_CONTENT_EL) return;

    // Detect media type: trending API usually provides media_type, others don't
    const type = movie.media_type || (movie.title ? 'movie' : 'tv');
    const title = movie.title || movie.name || "Untitled Production";
    const overview = movie.overview || "No description available for this title.";

    // Smooth transition via background image
    HERO_EL.style.backgroundImage = `url(${ORIGINAL + movie.backdrop_path})`;
    
    HERO_CONTENT_EL.innerHTML = `
        <h1 class="animate-fade-in">${title}</h1>
        <p class="animate-fade-in">${overview}</p>
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

function startHeroSlider() {
    if (heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        currentHeroIndex = (currentHeroIndex + 1) % trendingMovies.length;
        updateHero();
    }, 8000); // 8 seconds per slide
}

// 5. GRID RENDERING LOGIC
function renderMovies(movies, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;

    if (!movies || movies.length === 0) {
        container.innerHTML = `<p class="muted">No content found in this section.</p>`;
        return;
    }

    container.innerHTML = movies.map(movie => {
        const type = movie.media_type || (movie.title ? 'movie' : 'tv');
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
        const poster = movie.poster_path ? (IMG + movie.poster_path) : 'https://via.placeholder.com/500x750?text=No+Cover';
        
        return `
            <div class="movie-card" onclick="openContent(${movie.id}, '${type}')">
                <div class="rating-badge">★ ${rating}</div>
                <img src="${poster}" alt="${movie.title || movie.name}" loading="lazy">
            </div>
        `;
    }).join("");
}

async function fetchSection(endpoint, targetId) {
    try {
        const res = await fetch(`/api/${endpoint}`);
        if (!res.ok) return;
        const data = await res.json();
        renderMovies(data.results, targetId);
    } catch (err) {
        console.warn(`Section ${endpoint} failed to load:`, err);
    }
}

// 6. SEARCH FUNCTIONALITY (Optional helper if search input exists)
const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && searchInput.value.trim() !== "") {
            // You can redirect to a search results page or filter current view
            console.log("Searching for:", searchInput.value);
            // Example: window.location.href = `movies.html?search=${searchInput.value}`;
        }
    });
}

// 7. INITIALIZE
document.addEventListener("DOMContentLoaded", initHome);
