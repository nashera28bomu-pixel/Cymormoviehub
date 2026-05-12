const express = require("express");
const axios = require("axios");
const cache = require("../utils/cache");

const router = express.Router();

const BASE = "https://api.themoviedb.org/3";
const KEY = process.env.TMDB_API_KEY;

router.get("/trending", async (req, res) => {
  try {
    const cacheKey = "trending_movies";

    if (cache.has(cacheKey)) {
      return res.json(cache.get(cacheKey));
    }

    const response = await axios.get(
      `${BASE}/trending/movie/week?api_key=${KEY}`
    );

    cache.set(cacheKey, response.data);

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/popular", async (req, res) => {
  try {
    const response = await axios.get(
      `${BASE}/movie/popular?api_key=${KEY}`
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/top-rated", async (req, res) => {
  try {
    const response = await axios.get(
      `${BASE}/movie/top_rated?api_key=${KEY}`
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = req.query.q;

    const response = await axios.get(
      `${BASE}/search/movie?api_key=${KEY}&query=${q}`
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
