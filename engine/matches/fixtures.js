const footballApi = require("../api/footballApi");

/**
 * Normalize fixture data into UI-friendly format
 */
function formatFixture(match) {
  const home = match.participants?.find(p => p.meta?.location === "home");
  const away = match.participants?.find(p => p.meta?.location === "away");

  return {
    id: match.id,
    league: match.league?.name || "Unknown League",
    time: match.starting_at,
    status: match.state_id,

    // LIVE LOGIC (basic now, upgraded later)
    live: match.state_id === 2 || match.state_id === 3,

    home: {
      name: home?.name || "Home",
      logo: home?.image_path || ""
    },

    away: {
      name: away?.name || "Away",
      logo: away?.image_path || ""
    },

    score: match.scores || []
  };
}

/**
 * GET FIXTURES CONTROLLER
 * - Uses footballApi engine
 * - Handles empty responses safely
 * - Normalizes data for frontend
 */
exports.getFixtures = async (req, res) => {
  try {

    const query =
      "/fixtures?include=participants;scores;league&live=all";

    const data = await footballApi(query);

    // ⚠️ IMPORTANT FIX: different APIs return different structures
    const rawFixtures =
      data?.data ||
      data?.response ||
      [];

    if (!Array.isArray(rawFixtures)) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    const fixtures = rawFixtures.map(formatFixture);

    res.json({
      success: true,
      count: fixtures.length,
      data: fixtures
    });

  } catch (err) {
    console.log("❌ FIXTURES ERROR:", err.message);

    res.status(500).json({
      success: false,
      error: err.message,
      data: []
    });
  }
};
