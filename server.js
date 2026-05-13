const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 30 }); // Shorter cache (30s) for live score accuracy

const API_BASE = "https://v3.football.api-sports.io";
const HEADERS = {
    'x-rapidapi-key': process.env.FOOTBALL_API_KEY,
    'x-rapidapi-host': process.env.FOOTBALL_API_HOST
};

// 1. Fetch Premier League Fixtures (Live & Today's Schedule - EAT Sync)
router.get('/epl-fixtures', async (req, res) => {
    const cachedData = myCache.get("epl_fixtures_live");
    if (cachedData) return res.json(cachedData);

    try {
        // Today's date in Nairobi/EAT timezone to ensure we don't miss late-night or early-morning games
        const todayEAT = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });

        const response = await axios.get(`${API_BASE}/fixtures`, {
            headers: HEADERS,
            params: { 
                league: '39', 
                season: '2025', 
                date: todayEAT,
                timezone: 'Africa/Nairobi' // CRITICAL: This ensures "Live" status matches Kenya time
            }
        });

        // Filter and Sort: Prioritize Live games
        const matches = response.data.response || [];
        const sortedMatches = matches.sort((a, b) => {
            const statusA = a.fixture.status.short;
            const statusB = b.fixture.status.short;
            const liveStatuses = ['1H', 'HT', '2H', 'ET', 'P', 'BT'];
            
            // Push Live matches to the top
            if (liveStatuses.includes(statusA) && !liveStatuses.includes(statusB)) return -1;
            if (!liveStatuses.includes(statusA) && liveStatuses.includes(statusB)) return 1;
            
            // Otherwise sort by kickoff time
            return new Date(a.fixture.date) - new Date(b.fixture.date);
        });

        myCache.set("epl_fixtures_live", sortedMatches);
        res.json(sortedMatches);
    } catch (err) {
        console.error("EPL_FETCH_ERROR:", err.message);
        res.status(500).json({ error: "Failed to load EPL fixtures" });
    }
});

// 2. Fetch Deep Match Details (Lineups, H2H, and Live Stats)
router.get('/match-details/:id', async (req, res) => {
    const matchId = req.params.id;
    const h2hQuery = req.query.h2h;

    try {
        // Parallel requests for tactical depth
        const [lineupsRes, h2hRes, statsRes, eventsRes] = await Promise.all([
            axios.get(`${API_BASE}/fixtures/lineups?fixture=${matchId}`, { headers: HEADERS }),
            axios.get(`${API_BASE}/fixtures/headtohead?h2h=${h2hQuery}`, { headers: HEADERS }),
            axios.get(`${API_BASE}/fixtures/statistics?fixture=${matchId}`, { headers: HEADERS }),
            axios.get(`${API_BASE}/fixtures/events?fixture=${matchId}`, { headers: HEADERS })
        ]);

        res.json({
            lineups: lineupsRes.data.response,
            h2h: h2hRes.data.response,
            stats: statsRes.data.response,
            events: eventsRes.data.response
        });
    } catch (err) {
        console.error("DETAILS_FETCH_ERROR:", err.message);
        res.status(500).json({ error: "Tactical data currently unavailable" });
    }
});

module.exports = router;
