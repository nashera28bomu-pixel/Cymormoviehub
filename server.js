const express = require("express");
const axios = require("axios");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
require("dotenv").config();

const app = express();
// Increased TTL slightly for better performance on Render free tier
const cache = new NodeCache({ stdTTL: 900 }); 

// Middleware
app.use(express.json());
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false, // Allows iframes from vidsrc
}));
app.use(cors());

// Rate Limiting to prevent API abuse
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.use(express.static("public"));

const TMDB = "https://api.themoviedb.org/3";
const KEY = process.env.TMDB_API_KEY;

/**
 * Helper function to fetch data from TMDB with Caching
 */
async function fetchTMDB(endpoint) {
  if (cache.has(endpoint)) {
    return cache.get(endpoint);
  }

  const res = await axios.get(`${TMDB}${endpoint}`, {
    params: { api_key: KEY }
  });

  cache.set(endpoint, res.data);
  return res.data;
}

// --- API ROUTES ---

// Updated Trending: Changes daily for a fresh first recommendation
app.get("/api/trending", async (req, res) => {
  try {
    const data = await fetchTMDB("/trending/all/day");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/popular", async (req, res) => {
  try {
    const data = await fetchTMDB("/movie/popular");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/toprated", async (req, res) => {
  try {
    const data = await fetchTMDB("/movie/top_rated");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New Credits Endpoint: Get characters and actors
app.get("/api/credits/:id", async (req, res) => {
  try {
    const data = await fetchTMDB(`/movie/${req.params.id}/credits`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q;
    const resData = await axios.get(`${TMDB}/search/multi`, {
      params: { api_key: KEY, query: q }
    });
    res.json(resData.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/trailer/:id", async (req, res) => {
  try {
    const response = await fetchTMDB(`/movie/${req.params.id}/videos`);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/recommend/:id", async (req, res) => {
  try {
    const response = await fetchTMDB(`/movie/${req.params.id}/recommendations`);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cymor Movie Hub Running on port ${PORT}`);
});
