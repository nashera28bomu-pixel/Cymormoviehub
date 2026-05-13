const axios = require("axios");

const BASE = "https://api.sportmonks.com/v3/football";
const EPL_LEAGUE_ID = process.env.EPL_LEAGUE_ID || 8;

/* =========================
   FORMAT MATCH
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
   FETCH ONE DAY
========================= */

async function fetchDay(date) {
  const response = await axios.get(
    `${BASE}/fixtures/date/${date}`,
    {
      params: {
        api_token: process.env.SPORTMONKS_API_KEY,
        filters: `league_id:${EPL_LEAGUE_ID}`,
        include: "participants;scores;league"
      }
    }
  );

  return response.data?.data || [];
}

/* =========================
   MAIN CONTROLLER (TODAY + TOMORROW)
========================= */

exports.getFixtures = async (req, res) => {
  try {
    const today =
      req.query.date ||
      new Date(Date.now() + 3 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const tomorrow = tomorrowDate.toISOString().split("T")[0];

    // 🔥 FETCH BOTH DAYS
    const [todayData, tomorrowData] = await Promise.all([
      fetchDay(today),
      fetchDay(tomorrow)
    ]);

    let allMatches = [...todayData, ...tomorrowData];

    // 🧠 DOUBLE SAFETY EPL FILTER
    allMatches = allMatches.filter(
      m => m.league?.id == EPL_LEAGUE_ID
    );

    const fixtures = allMatches.map(formatFixture);

    const live = fixtures.filter(f => f.live);
    const upcoming = fixtures.filter(f => !f.live);

    res.json({
      success: true,
      league: "Premier League",
      today,
      tomorrow,
      liveCount: live.length,
      total: fixtures.length,
      data: {
        live,
        upcoming,
        all: fixtures
      }
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
