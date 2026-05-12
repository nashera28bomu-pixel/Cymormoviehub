const params = new URLSearchParams(window.location.search);
const contentId = params.get('id');
const isTV = params.get('type') === 'tv';

async function loadDetails() {
    const response = await fetch(`/api/details/${contentId}?type=${isTV ? 'tv' : 'movie'}`);
    const data = await response.json();

    document.getElementById('movieTitle').innerText = data.title || data.name;
    document.getElementById('movieOverview').innerText = data.overview;
    
    // Set Player (Using a common embed provider for preview/stream)
    const typePath = isTV ? 'tv' : 'movie';
    document.getElementById('videoPlayer').src = `https://vidsrc.to/embed/${typePath}/${contentId}`;

    // Handle Cast
    const castList = document.getElementById('castList');
    castList.innerHTML = data.credits.cast.slice(0, 10).map(person => `
        <div class="cast-card">
            <img src="https://image.tmdb.org/t/p/w200${person.profile_path}" onerror="this.src='https://via.placeholder.com/200x300'">
            <p>${person.name}</p>
        </div>
    `).join('');

    // Handle Episodes if Series
    if (isTV) {
        document.getElementById('episodeTab').style.display = 'block';
        loadEpisodes(contentId, 1); // Default Season 1
    }

    loadSimilar(contentId, isTV ? 'tv' : 'movie');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
    
    event.currentTarget.classList.add('active');
    document.getElementById(`${tabName}Pane`).classList.add('active');
}

async function loadEpisodes(id, seasonNum) {
    const res = await fetch(`/api/tv/${id}/season/${seasonNum}`);
    const data = await res.json();
    const grid = document.getElementById('episodeGrid');
    grid.innerHTML = data.episodes.map(ep => `
        <div class="ep-box" onclick="playEpisode(${seasonNum}, ${ep.episode_number})">
            ${ep.episode_number}
        </div>
    `).join('');
}

function playEpisode(s, e) {
    document.getElementById('videoPlayer').src = `https://vidsrc.to/embed/tv/${contentId}/${s}/${e}`;
}

loadDetails();
