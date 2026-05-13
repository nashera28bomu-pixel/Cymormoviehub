const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 60 }); // Cache for 60 seconds to save API credits

const API_BASE = "https://v3.football.api-sports.io";
const HEADERS = {
    'x-rapidapi-key': process.env.FOOTBALL_API_KEY,
    'x-rapidapi-host': process.env.FOOTBALL_API_HOST
};

// 1. Fetch Premier League Fixtures (Live and Upcoming)
router.get('/epl-fixtures', async (req, res) => {
    const cachedData = myCache.get("epl_fixtures");
    if (cachedData) return res.json(cachedData);

    try {
        const response = await axios.get(`${API_BASE}/fixtures`, {
            headers: HEADERS,
            params: { league: '39', season: '2025', next: '15' }
        });
        myCache.set("epl_fixtures", response.data.response);
        res.json(response.data.response);
    } catch (err) {
        res.status(500).json({ error: "Failed to load EPL fixtures" });
    }
});

// 2. Fetch Deep Match Details (Lineups, H2H, and Live Stats)
router.get('/match-details/:id', async (req, res) => {
    const matchId = req.params.id;
    const h2hQuery = req.query.h2h; // Format: "teamAId-teamBId"

    try {
        const [lineups, h2h, stats, events] = await Promise.all([
            axios.get(`${API_BASE}/fixtures/lineups?fixture=${matchId}`, { headers: HEADERS }),
            axios.get(`${API_BASE}/fixtures/headtohead?h2h=${h2hQuery}`, { headers: HEADERS }),
            axios.get(`${API_BASE}/fixtures/statistics?fixture=${matchId}`, { headers: HEADERS }),
            axios.get(`${API_BASE}/fixtures/events?fixture=${matchId}`, { headers: HEADERS })
        ]);

        res.json({
            lineups: lineups.data.response,
            h2h: h2h.data.response,
            stats: stats.data.response,
            events: events.data.response
        });
    } catch (err) {
        res.status(500).json({ error: "Tactical data currently unavailable" });
    }
});

module.exports = router;
