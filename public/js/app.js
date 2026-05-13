// CYMOR FOOTBALL HUB - ELITE CDN EDITION
// Standard API-Football CDN Base URLs
const CDN_PLAYER = "https://media.api-sports.io/football/players/";
const CDN_TEAM = "https://media.api-sports.io/football/teams/";

// Hero Section Rotation Data (Using real Player IDs from API-Football)
const HERO_PLAYERS = [
    { id: "644", name: "Erling Haaland", club: "Manchester City", bgId: "50" }, // 50 is Man City Team ID
    { id: "306", name: "Mohamed Salah", club: "Liverpool", bgId: "40" },       // 40 is Liverpool Team ID
    { id: "1468", name: "Bukayo Saka", club: "Arsenal", bgId: "42" }          // 42 is Arsenal Team ID
];

let heroIndex = 0;

// 1. DYNAMIC HERO ROTATION
function updateHero() {
    const hero = HERO_PLAYERS[heroIndex];
    const heroSection = document.getElementById('hero');
    const heroTitle = document.getElementById('hero-title');

    // Using the CDN for the background and player portrait overlay
    heroSection.style.backgroundImage = `linear-gradient(90deg, rgba(5,5,5,1) 30%, rgba(5,5,5,0.4) 100%), url('${CDN_TEAM}${hero.bgId}.png')`;
    
    heroTitle.innerHTML = `
        <span style="font-size: 1rem; color: #00ff85;">FEATURED STAR</span><br>
        ${hero.name}
    `;

    heroIndex = (heroIndex + 1) % HERO_PLAYERS.length;
}

// 2. LOAD PREMIER LEAGUE FIXTURES
async function fetchEPLFixtures() {
    const grid = document.getElementById('fixtures-container');
    
    try {
        const response = await fetch('/api/epl-fixtures');
        const matches = await response.json();

        grid.innerHTML = matches.map(m => {
            const status = m.fixture.status.short;
            const isLive = ['1H', '2H', 'HT'].includes(status);
            
            return `
                <div class="match-card glass" onclick="openTacticalHub(${m.fixture.id}, '${m.teams.home.id}-${m.teams.away.id}')">
                    <div class="card-meta">
                        <span class="${isLive ? 'live-badge' : 'time-badge'}">${status}</span>
                        <span>${new Date(m.fixture.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    <div class="card-teams">
                        <div class="team">
                            <img src="${CDN_TEAM}${m.teams.home.id}.png" alt="home" loading="lazy">
                            <p>${m.teams.home.name}</p>
                        </div>
                        <div class="vs-score">
                            ${isLive || status === 'FT' ? `<h2>${m.goals.home} - ${m.goals.away}</h2>` : '<h3>VS</h3>'}
                        </div>
                        <div class="team">
                            <img src="${CDN_TEAM}${m.teams.away.id}.png" alt="away" loading="lazy">
                            <p>${m.teams.away.name}</p>
                        </div>
                    </div>
                    
                    ${status === 'NS' ? `<div class="tactical-preview">Tactical Reveal in 1hr</div>` : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        grid.innerHTML = `<div class="error">Failed to sync with EPL Servers. Check connection.</div>`;
    }
}

// 3. TACTICAL MODAL (LINEUPS & H2H)
async function openTacticalHub(matchId, h2hKey) {
    const modal = document.getElementById('match-modal');
    const dataPanel = document.getElementById('modal-data');
    modal.style.display = 'flex';
    dataPanel.innerHTML = '<div class="loader">Accessing Tactical Engine...</div>';

    try {
        const res = await fetch(`/api/match-details/${matchId}?h2h=${h2hKey}`);
        const data = await res.json();

        const lineup = data.lineups[0];
        
        dataPanel.innerHTML = `
            <h2 style="color: #00ff85;">Tactical Blueprint</h2>
            <div class="lineup-container">
                ${lineup ? `
                    <h4>Formation: ${lineup.formation}</h4>
                    <div class="pitch-preview">
                        <p>Manager: ${lineup.coach.name}</p>
                        <div class="starting-xi">
                            ${lineup.startXI.slice(0, 5).map(p => `
                                <div class="player-pill">
                                    <img src="${CDN_PLAYER}${p.player.id}.png" onerror="this.src='/assets/default-player.png'">
                                    <span>${p.player.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : '<p>Lineups are hidden until 60 minutes before kickoff.</p>'}
            </div>
            <hr style="border: 0.5px solid #333; margin: 20px 0;">
            <h3>Past Meetings</h3>
            <div class="h2h-list">
                ${data.h2h.map(h => `
                    <div class="h2h-row">
                        <span>${h.teams.home.name}</span>
                        <strong>${h.goals.home} - ${h.goals.away}</strong>
                        <span>${h.teams.away.name}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        dataPanel.innerHTML = "<p>Data currently locked.</p>";
    }
}

// INITIALIZE HUB
document.addEventListener('DOMContentLoaded', () => {
    // Start Hero rotation
    setInterval(updateHero, 7000);
    updateHero();
    
    // Load matches
    fetchEPLFixtures();

    // Close Modal Logic
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('match-modal').style.display = 'none';
    };
});
