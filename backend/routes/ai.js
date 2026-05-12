const express = require("express");
const axios = require("axios");

const router = express.Router();

router.get("/recommendations/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${id}/recommendations?api_key=${process.env.TMDB_API_KEY}`
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
