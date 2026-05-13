const axios = require("axios");

const BASE = "https://api.sportmonks.com/v3/football";

const EPL_LEAGUE_ID = process.env.EPL_LEAGUE_ID || 8;

/* =========================
   FORMAT FIXTURE (CLEAN UI MODEL)
========================= */

function formatFixture(match) {
  const home = match.participants?.find(p => p.meta?.location === "home");
  const away = match.participants?.find(p => p.meta?.location === "away");

  return {
    id: match.id,

    league: match.league?.name || "Premier League",

    time: match.starting_at,

    status: match.state_id,

    live: [2, 3].includes(match.state_id),

    minute: match.time?.minute || null,

    home: {
      name: home?.name,
      logo: home?.image_path
    },

    away: {
      name: away?.name,
      logo: away?.image_path
    },

    score: match.scores || []
  };
}

/* =========================
   EPL FIXTURES ONLY (RELIABLE)
========================= */

exports.getFixtures = async (req, res) => {
  try {
    const date =
      req.query.date ||
      new Date(Date.now() + 3 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const response = await axios.get(
      `${BASE}/fixtures/date/${date}`,
      {
        params: {
          api_token: process.env.SPORTMONKS_API_KEY,

          // 🔥 FORCE EPL ONLY
          filters: `league_id:${EPL_LEAGUE_ID}`,

          include: "participants;scores;league;state"
        }
      }
    );

    let fixtures = response.data?.data || [];

    // 🧠 SAFETY FILTER (double guarantee EPL only)
    fixtures = fixtures.filter(
      f => f.league?.id == EPL_LEAGUE_ID
    );

    const mapped = fixtures.map(formatFixture);

    res.json({
      success: true,
      league: "Premier League",
      count: mapped.length,
      data: mapped
    });

  } catch (err) {
    console.log(
      "FIXTURES ERROR:",
      err.response?.data || err.message
    );

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
