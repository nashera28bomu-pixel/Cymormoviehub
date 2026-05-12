async function loadMovieDetails() {
    const id = new URLSearchParams(window.location.search).get("id");
    
    // Fetch Details and Credits
    const [detailRes, creditRes] = await Promise.all([
        fetch(`/api/popular`), // In a real app, use a specific /movie/:id endpoint
        fetch(`/api/credits/${id}`)
    ]);
    
    const castData = await creditRes.json();
    
    // Set Video Player (Vidsrc usually handles multiple qualities/subs automatically)
    document.getElementById("player").src = `https://vidsrc.to/embed/movie/${id}`;

    // Render Download Tab
    const downloadHTML = `
        <div class="download-grid">
            <button class="download-btn">📥 1080p (High)</button>
            <button class="download-btn">📥 720p (Standard)</button>
            <button class="download-btn">📥 480p (Data Saver)</button>
            <button class="download-btn">📥 360p (Mobile)</button>
        </div>
        <p style="margin-top:10px; color:var(--muted)">Subtitles available: English, French, Arabic, Spanish</p>
    `;
    
    // Render Cast Tab
    const castHTML = castData.cast.slice(0, 10).map(c => `
        <div class="cast-item">
            <strong>${c.name}</strong> as ${c.character}
        </div>
    `).join("");

    // Set default tab
    document.getElementById("tab-content").innerHTML = downloadHTML;
}
loadMovieDetails();
