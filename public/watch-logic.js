const params = new URLSearchParams(window.location.search);
const contentId = params.get('id');
const isTV = params.get('type') === 'tv';

/**
 * Main function to fetch and display content details
 */
async function loadDetails() {
    if (!contentId) {
        console.error("No content ID found in URL");
        return;
    }

    try {
        const response = await fetch(`/api/details/${contentId}?type=${isTV ? 'tv' : 'movie'}`);
        const data = await response.json();

        // Update UI Text
        document.getElementById('movieTitle').innerText = data.title || data.name || "Unknown Title";
        document.getElementById('movieOverview').innerText = data.overview || "No description available.";
        
        // Set Player Source
        const typePath = isTV ? 'tv' : 'movie';
        document.getElementById('videoPlayer').src = `https://vidsrc.to/embed/${typePath}/${contentId}`;

        // Handle Cast Section
        const castList = document.getElementById('castList');
        if (data.credits && data.credits.cast) {
            castList.innerHTML = data.credits.cast.slice(0, 10).map(person => `
                <div class="cast-card">
                    <img src="${person.profile_path ? 'https://image.tmdb.org/t/p/w200' + person.profile_path : 'https://via.placeholder.com/200x300'}" 
                         alt="${person.name}" 
                         onerror="this.src='https://via.placeholder.com/200x300'">
                    <p>${person.name}</p>
                </div>
            `).join('');
        }

        // Handle Episodes Tab for TV Series
        if (isTV) {
            const episodeTab = document.getElementById('episodeTab');
            if (episodeTab) {
                episodeTab.style.display = 'block';
                loadEpisodes(contentId, 1); // Load Season 1 by default
            }
        }

        // Load "You May Also Like" Section
        renderSimilar(data.recommendations?.results || data.similar?.results || []);

    } catch (error) {
        console.error("Error loading details:", error);
    }
}

/**
 * Switches between Info, Episodes, and Cast tabs
 */
function switchTab(tabName) {
    // Remove active class from all tabs and panes
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
    
    // Add active class to selected elements
    const clickedTab = event.currentTarget;
    const targetPane = document.getElementById(`${tabName}Pane`);
    
    if (clickedTab && targetPane) {
        clickedTab.classList.add('active');
        targetPane.classList.add('active');
    }
}

/**
 * Fetches episodes for a specific season
 */
async function loadEpisodes(id, seasonNum) {
    try {
        const res = await fetch(`/api/tv/${id}/season/${seasonNum}`);
        const data = await res.json();
        const grid = document.getElementById('episodeGrid');
        
        if (data.episodes) {
            grid.innerHTML = data.episodes.map(ep => `
                <div class="ep-box" onclick="playEpisode(${seasonNum}, ${ep.episode_number})">
                    ${ep.episode_number}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error("Error loading episodes:", error);
    }
}

/**
 * Updates the video player to a specific episode
 */
function playEpisode(s, e) {
    document.getElementById('videoPlayer').src = `https://vidsrc.to/embed/tv/${contentId}/${s}/${e}`;
    // Scroll player into view for better UX
    document.querySelector('.video-wrapper').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Renders the recommendations row
 */
function renderSimilar(movies) {
    const container = document.getElementById('similarMovies');
    if (!container) return;

    if (movies.length === 0) {
        container.innerHTML = "<p style='padding: 20px;'>No recommendations found.</p>";
        return;
    }

    container.innerHTML = movies.slice(0, 12).map(movie => `
        <div class="movie-card" onclick="location.href='watch.html?id=${movie.id}&type=${movie.title ? 'movie' : 'tv'}'">
            <div class="rating-badge">★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</div>
            <img src="${movie.poster_path ? 'https://image.tmdb.org/t/p/w500' + movie.poster_path : 'https://via.placeholder.com/500x750'}" alt="cover">
        </div>
    `).join("");
}

// Initial Kickoff
loadDetails();
