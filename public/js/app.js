// CYMOR FOOTBALL HUB - CLUB LOGO & LIVE DATA ENGINE
const CDN_PLAYER = "https://media.api-sports.io/football/players/";
const CDN_TEAM = "https://media.api-sports.io/football/teams/";

// 1. ALL 20 PREMIER LEAGUE CLUBS (Badge Rotation Data)
const EPL_CLUBS = [
    { id: 40, name: "Liverpool FC" }, { id: 42, name: "Arsenal" },
    { id: 50, name: "Manchester City" }, { id: 33, name: "Manchester United" },
    { id: 49, name: "Chelsea" }, { id: 47, name: "Tottenham" },
    { id: 66, name: "Aston Villa" }, { id: 34, name: "Newcastle" },
    { id: 48, name: "West Ham" }, { id: 51, name: "Brighton" },
    { id: 63, name: "Fulham" }, { id: 55, name: "Brentford" },
    { id: 52, name: "Crystal Palace" }, { id: 39, name: "Wolves" },
    { id: 45, name: "Everton" }, { id: 65, name: "Nottingham Forest" },
    { id: 35, name: "Bournemouth" }, { id: 62, name: "Leicester" },
    { id: 57, name: "Ipswich" }, { id: 64, name: "Southampton" }
];

let clubIndex = 0;

// 2. DYNAMIC HERO BADGE ROTATION
function updateHero() {
    const club = EPL_CLUBS[clubIndex];
    const heroSection = document.getElementById('hero');
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');

    if (!heroSection || !heroTitle) return;

    // Apply the club badge as a contained background on the right
    heroSection.style.backgroundImage = `linear-gradient(90deg, rgba(5,5,5,1) 30%, rgba(5,5,5,0.6) 100%), url('${CDN_TEAM}${club.id}.png')`;
    heroSection.style.backgroundSize = "contain";
    heroSection.style.backgroundRepeat = "no-repeat";
    heroSection.style.backgroundPosition = "right center";
    
    heroTitle.innerHTML = `<span style="color: #00ff85;">${club.name}</span>`;
    if (heroSubtitle) heroSubtitle.innerText = "Real-time tactical analysis and live scores.";

    clubIndex = (clubIndex + 1) % EPL_CLUBS.length;
}

// 3. LOAD LIVE PREMIER LEAGUE FIXTURES
async function fetchEPLFixtures() {
    const grid = document.getElementById('fixtures-container');
    if (!grid) return;
    
    try {
        const response = await fetch('/api/epl-fixtures');
        const matches = await response.json();

        if (!matches || matches.length === 0) {
            grid.innerHTML = `<div class="error">No matches scheduled today. Check back later!</div>`;
            return;
        }

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
                            <img src="${CDN_TEAM}${m.teams.home.id}.png" alt="${m.teams.home.name}" loading="lazy">
                            <p>${m.teams.home.name}</p>
                        </div>
                        <div class="vs-score">
                            ${isLive || status === 'FT' ? `<h2>${m.goals.home} - ${m.goals.away}</h2>` : '<h3>VS</h3>'}
                        </div>
                        <div class="team">
                            <img src="${CDN_TEAM}${m.teams.away.id}.png" alt="${m.teams.away.name}" loading="lazy">
                            <p>${m.teams.away.name}</p>
                        </div>
                    </div>
                    
                    ${status === 'NS' ? `<div class="tactical-preview">Tactical Reveal in 1hr</div>` : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        grid.innerHTML = `<div class="error">Unable to sync with EPL data servers.</div>`;
    }
}

// 4. TACTICAL MODAL (Lineups & H2H)
async function openTacticalHub(matchId, h2hKey) {
    const modal = document.getElementById('match-modal');
    const dataPanel = document.getElementById('modal-data');
    if (!modal || !dataPanel) return;

    modal.style.display = 'flex';
    dataPanel.innerHTML = '<div class="loader">Accessing Tactical Engine...</div>';

    try {
        const res = await fetch(`/api/match-details/${matchId}?h2h=${h2hKey}`);
        const data = await res.json();

        const lineup = data.lineups && data.lineups.length > 0 ? data.lineups[0] : null;
        
        dataPanel.innerHTML = `
            <h2 style="color: #00ff85;">Tactical Blueprint</h2>
            <div class="lineup-container">
                ${lineup ? `
                    <h4>Formation: ${lineup.formation}</h4>
                    <div class="pitch-preview">
                        <p>Manager: ${lineup.coach.name}</p>
                        <div class="starting-xi">
                            ${lineup.startXI.map(p => `
                                <div class="player-pill">
                                    <img src="${CDN_PLAYER}${p.player.id}.png" onerror="this.src='https://media.api-sports.io/football/players/notfound.png'">
                                    <span>${p.player.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : '<p>Lineups are hidden until 60 minutes before kickoff.</p>'}
            </div>
            <hr style="border: 0.5px solid #333; margin: 20px 0;">
            <h3>Past Meetings (H2H)</h3>
            <div class="h2h-list">
                ${data.h2h ? data.h2h.slice(0, 5).map(h => `
                    <div class="h2h-row">
                        <span>${h.teams.home.name}</span>
                        <strong>${h.goals.home} - ${h.goals.away}</strong>
                        <span>${h.teams.away.name}</span>
                    </div>
                `).join('') : '<p>No historical data found.</p>'}
            </div>
        `;
    } catch (err) {
        dataPanel.innerHTML = "<p>Data currently locked or unavailable.</p>";
    }
}

// 5. INITIALIZE HUB
document.addEventListener('DOMContentLoaded', () => {
    // Start Hero rotation (5 seconds per club)
    setInterval(updateHero, 5000);
    updateHero();
    
    // Load Premier League fixtures
    fetchEPLFixtures();

    // Close Modal Logic
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('match-modal').style.display = 'none';
        };
    }
});
